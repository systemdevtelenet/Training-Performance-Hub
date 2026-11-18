import type { SupabaseClient } from '@supabase/supabase-js';
import { isTraineeLossStatus } from '@/lib/analytics-utils';

export type TrainingTraineeRecord = {
  id: number;
  enrollmentId: number;
  traineeId: number;
  name: string;
  firstname: string;
  middlename: string | null;
  lastname: string;
  status: string;
  month: string;
  quarter: string;
  p: number;
  a: number;
  isEndorsed: boolean;
  isLoss: boolean;
  assignedTrainer: string;
  assigned_trainer: string;
  assignedTrainerAvatar: string;
  batchName: string;
  batch: string;
  batch_id: number;
  accountName: string;
  account: string;
  account_id: number | null;
  trainingType: 'INHOUSE' | 'PST';
  training_track: string;
  start_date: string | null;
  endorsed_date: string | null;
  [key: string]: any;
};

type Row = Record<string, any>;
export type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function readAllRows<T>(readPage: (from: number, to: number) => PromiseLike<PageResult<T>>) {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await readPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function monthAndQuarter(dateValue?: string | null) {
  if (!dateValue) return { month: 'Unspecified', quarter: 'Unspecified' };
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { month: 'Unspecified', quarter: 'Unspecified' };
  return {
    month: new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(date),
    quarter: `Q${Math.ceil((date.getUTCMonth() + 1) / 3)}`,
  };
}

function attendanceCode(row: Row) {
  const raw = String(row.attendance_code || row.status || '').trim().toUpperCase();
  if (['P', 'PRESENT'].includes(raw)) return 'P';
  if (['A', 'ABSENT'].includes(raw)) return 'A';
  if (['L', 'LATE'].includes(raw)) return 'L';
  if (['U', 'UNDERTIME'].includes(raw)) return 'U';
  return raw;
}

/**
 * Reads the normalized training schema and returns the stable roster shape the
 * existing dashboard, search, trainer, and trainee screens consume.
 */
export async function getTrainingTraineeRecords(db: SupabaseClient): Promise<TrainingTraineeRecord[]> {
  const training = db.schema('trainingHub_system');
  const [profiles, enrollments, batches, accounts, assignments, attendance, sessions] = await Promise.all([
    readAllRows<Row>((from, to) => training.from('trainee_profiles_api')
      .select('trainee_id, first_name, middle_name, last_name, suffix, status')
      .order('trainee_id', { ascending: true }).range(from, to)),
    readAllRows<Row>((from, to) => training.from('trainee_enrollments_api')
      .select('enrollment_id, trainee_id, batch_id, status, enrolled_at, started_on, endorsed_on, completed_on, reporting_month, reporting_quarter, account_id, external_account_name, archived_at')
      .order('enrollment_id', { ascending: true }).range(from, to)),
    readAllRows<Row>((from, to) => training.from('training_batches_api')
      .select('batch_id, account_id, track_code, cohort_code, starts_on, ends_on, status, display_name, account_label')
      .order('batch_id', { ascending: true }).range(from, to)),
    readAllRows<Row>((from, to) => db.from('accounts')
      .select('account_id, account_name, account_code')
      .order('account_id', { ascending: true }).range(from, to)),
    readAllRows<Row>((from, to) => training.from('trainer_assignments_api')
      .select('enrollment_id, trainer_employee_id, external_trainer_name, assigned_at, ended_at')
      .order('assigned_at', { ascending: false }).range(from, to)),
    readAllRows<Row>((from, to) => training.from('trainee_attendance_api')
      .select('attendance_id, enrollment_id, session_id, status, attendance_code')
      .order('attendance_id', { ascending: true }).range(from, to)),
    readAllRows<Row>((from, to) => training.from('training_sessions_api')
      .select('session_id, session_number, training_day, session_date')
      .order('session_id', { ascending: true }).range(from, to)),
  ]);

  const profileById = new Map<number, Row>(profiles.map((row) => [Number(row.trainee_id), row]));
  const batchById = new Map<number, Row>(batches.map((row) => [Number(row.batch_id), row]));
  const accountById = new Map<number, Row>(accounts.map((row) => [Number(row.account_id), row]));
  const sessionById = new Map<number, Row>(sessions.map((row) => [Number(row.session_id), row]));

  const activeAssignments = new Map<number, Row>();
  for (const assignment of assignments) {
    const enrollmentId = Number(assignment.enrollment_id);
    if (assignment.ended_at == null && enrollmentId && !activeAssignments.has(enrollmentId)) {
      activeAssignments.set(enrollmentId, assignment);
    }
  }

  const employeeIds = Array.from(new Set(activeAssignments.values()
    .map((row) => Number(row.trainer_employee_id))
    .filter((id) => Number.isInteger(id) && id > 0)));
  const employees: Row[] = [];
  for (let index = 0; index < employeeIds.length; index += 500) {
    const ids = employeeIds.slice(index, index + 500);
    const { data, error } = await db.from('employees')
      .select('id, employee_name, avatar_url')
      .in('id', ids);
    if (error) throw new Error(error.message);
    employees.push(...(data || []));
  }
  const employeeById = new Map<number, Row>(employees.map((row) => [Number(row.id), row]));

  const attendanceByEnrollment = new Map<number, { p: number; a: number; days: Record<string, string> }>();
  for (const row of attendance) {
    const enrollmentId = Number(row.enrollment_id);
    if (!enrollmentId) continue;
    const record = attendanceByEnrollment.get(enrollmentId) || { p: 0, a: 0, days: {} };
    const code = attendanceCode(row);
    if (code === 'P') record.p += 1;
    if (code === 'A') record.a += 1;
    const session = sessionById.get(Number(row.session_id));
    const day = Number(session?.training_day || session?.session_number);
    if (Number.isInteger(day) && day > 0 && day <= 100) record.days[`att_status_day_${day}`] = code;
    attendanceByEnrollment.set(enrollmentId, record);
  }

  return enrollments.filter((row) => row.archived_at == null).map((enrollment) => {
    const enrollmentId = Number(enrollment.enrollment_id);
    const traineeId = Number(enrollment.trainee_id);
    const profile = profileById.get(traineeId) || {};
    const batch = batchById.get(Number(enrollment.batch_id)) || {};
    const assignment = activeAssignments.get(enrollmentId);
    const employee = assignment ? employeeById.get(Number(assignment.trainer_employee_id)) : undefined;
    const accountId = enrollment.account_id ?? batch.account_id ?? null;
    const account = accountId == null ? undefined : accountById.get(Number(accountId));
    const accountName = String(enrollment.external_account_name || account?.account_name || batch.account_label || account?.account_code || 'General').trim();
    const batchName = String(batch.display_name || batch.cohort_code || 'Unassigned Batch').trim();
    const fullName = [profile.first_name, profile.middle_name, profile.last_name, profile.suffix]
      .filter((part) => String(part || '').trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Unknown';
    const track = String(batch.track_code || 'UNCLASSIFIED').toUpperCase();
    const trainingType: 'INHOUSE' | 'PST' = /PST|PRODUCT/.test(track)
      ? 'PST'
      : /IN.?HOUSE|NHO|MESH/.test(track) || ['ALPHA', 'BRAVO'].includes(accountName.toUpperCase())
        ? 'INHOUSE'
        : 'PST';
    const effectiveStatus = String(enrollment.status || profile.status || 'UNKNOWN').toUpperCase();
    const dates = monthAndQuarter(String(enrollment.started_on || batch.starts_on || ''));
    const attendanceRecord = attendanceByEnrollment.get(enrollmentId) || { p: 0, a: 0, days: {} };
    const trainerName = String(assignment?.external_trainer_name || employee?.employee_name || 'Unassigned');

    return {
      ...attendanceRecord.days,
      id: enrollmentId,
      enrollmentId,
      traineeId,
      name: fullName,
      firstname: String(profile.first_name || ''),
      middlename: profile.middle_name == null ? null : String(profile.middle_name),
      lastname: String(profile.last_name || ''),
      status: effectiveStatus,
      month: String(enrollment.reporting_month || dates.month),
      quarter: String(enrollment.reporting_quarter || dates.quarter),
      p: attendanceRecord.p,
      a: attendanceRecord.a,
      isEndorsed: effectiveStatus === 'ENDORSED' || Boolean(enrollment.endorsed_on),
      isLoss: isTraineeLossStatus(effectiveStatus),
      assignedTrainer: trainerName,
      assigned_trainer: trainerName,
      assignedTrainerAvatar: String(employee?.avatar_url || ''),
      batchName,
      batch: String(batch.cohort_code || batch.display_name || ''),
      batch_id: Number(enrollment.batch_id),
      accountName,
      account: accountName,
      account_id: accountId == null ? null : Number(accountId),
      trainingType,
      training_track: track,
      start_date: enrollment.started_on || batch.starts_on || null,
      endorsed_date: enrollment.endorsed_on || null,
    };
  });
}
