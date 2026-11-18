import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { authorizeAuthenticatedRequest, authorizeTrainerOrAdminRequest } from '@/lib/auth/access';
import { getTraineesData } from '@/lib/data-fetcher';
import { isTrainerMatch } from '@/lib/analytics-utils';

export const dynamic = 'force-dynamic';
const { url, key } = getSupabaseServerConfig();
const supabase = createClient(url, key, { auth: { persistSession: false } });
const training = supabase.schema('trainingHub_system');

type AttendanceInput = { date?: string; traineeName?: string; batchName?: string; accountName?: string; trainingType?: string; attCode?: string; status?: string; notes?: string };
const recordKey = (date: string, name: string) => `${date}___${name.trim().toLowerCase()}`;
const validDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

function dbStatus(code: string) {
  const value = code.trim().toUpperCase();
  if (['P', 'PRESENT', 'L', 'LATE', 'U', 'UNDERTIME'].includes(value)) return 'PRESENT';
  if (['A', 'ABSENT'].includes(value)) return 'ABSENT';
  if (['SUS', 'SUSPENDED'].includes(value)) return 'SUSPENDED';
  if (['HOL', 'HOLIDAY'].includes(value)) return 'HOLIDAY';
  if (['RD', 'REST_DAY'].includes(value)) return 'REST_DAY';
  if (['E', 'EXCUSED'].includes(value)) return 'EXCUSED';
  return 'NOT_SCHEDULED';
}

function apiCode(status: string, code: string | null) {
  const explicit = String(code || '').trim().toUpperCase();
  if (['P', 'A', 'L', 'U'].includes(explicit)) return explicit;
  return status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'SUSPENDED' ? 'SUS' : status === 'HOLIDAY' ? 'HOL' : status === 'REST_DAY' ? 'RD' : '';
}

export async function GET(req: Request) {
  const auth = await authorizeAuthenticatedRequest();
  if (!auth.ok) return auth.response;
  const date = new URL(req.url).searchParams.get('date') || '';
  if (!validDate(date)) return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required.' }, { status: 400 });
  try {
    const [roster, sessionsResult] = await Promise.all([
      getTraineesData(),
      training.from('training_sessions_api').select('session_id, batch_id').eq('session_date', date),
    ]);
    if (sessionsResult.error) throw sessionsResult.error;
    const sessionIds = (sessionsResult.data || []).map((row: any) => Number(row.session_id));
    const entries: any[] = [];
    if (sessionIds.length) {
      const { data, error } = await training.from('trainee_attendance_api')
        .select('attendance_id, enrollment_id, session_id, status, attendance_code, notes, updated_at')
        .in('session_id', sessionIds);
      if (error) throw error;
      entries.push(...(data || []));
    }
    const sessionById = new Map((sessionsResult.data || []).map((row: any) => [Number(row.session_id), Number(row.batch_id)]));
    const rosterByEnrollment = new Map((roster as any[]).map((row) => [Number(row.id), row]));
    const map: Record<string, any> = {};
    for (const row of entries) {
      const trainee = rosterByEnrollment.get(Number(row.enrollment_id));
      if (!trainee) continue;
      map[recordKey(date, trainee.name)] = {
        date, traineeName: trainee.name, batchName: trainee.batchName, accountName: trainee.accountName,
        trainerName: trainee.assignedTrainer, trainingType: trainee.trainingType, status: trainee.status,
        attCode: apiCode(row.status, row.attendance_code), notes: row.notes || '', updatedAt: row.updated_at,
        batchId: sessionById.get(Number(row.session_id)),
      };
    }
    return NextResponse.json({ map, records: Object.values(map), trainees: roster, attendance: Object.values(map) });
  } catch (error: any) {
    console.error('Daily attendance load failed:', error);
    return NextResponse.json({ error: 'Unable to load attendance records.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeTrainerOrAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const items: AttendanceInput[] = Array.isArray(body.records) ? body.records : [];
    if (!items.length) return NextResponse.json({ error: 'At least one attendance record is required.' }, { status: 400 });
    const roster = await getTraineesData() as any[];
    const sessionsByBatchDate = new Map<string, number>();
    for (const item of items) {
      const date = item.date || body.date;
      if (!validDate(date)) throw new Error('Each attendance record needs a valid date (YYYY-MM-DD).');
      const name = String(item.traineeName || '').trim().toLowerCase();
      const batch = String(item.batchName || '').trim().toLowerCase();
      const account = String(item.accountName || '').trim().toLowerCase();
      const candidates = roster.filter((row) => row.name.trim().toLowerCase() === name
        && row.batchName.trim().toLowerCase() === batch
        && row.accountName.trim().toLowerCase() === account
        && row.trainingType === (String(item.trainingType || '').toUpperCase() === 'PST' ? 'PST' : 'INHOUSE'));
      if (candidates.length !== 1) throw new Error(candidates.length ? `Attendance target is ambiguous for ${item.traineeName}.` : `Trainee ${item.traineeName || ''} was not found.`);
      const trainee = candidates[0];
      if (auth.actor.role === 'TRAINER' && !isTrainerMatch(trainee.assignedTrainer, auth.actor.name)) {
        return NextResponse.json({ error: 'Trainers may only update attendance for their assigned trainees.' }, { status: 403 });
      }
      const traineeStatus = String(item.status || '').trim().toUpperCase();
      const supportedStatuses = ['ONGOING', 'ENDORSED', 'EOC', 'AWOL', 'LATERAL', 'FAILED', 'DROPPED', 'RESIGNED', 'TERMINATED', 'COMPLETED', 'CANCELLED', 'UNKNOWN'];
      if (body.actionType === 'status' && supportedStatuses.includes(traineeStatus)) {
        const { error: enrollmentUpdateError } = await training.from('trainee_enrollments_api').update({ status: traineeStatus }).eq('enrollment_id', trainee.id);
        if (enrollmentUpdateError) throw enrollmentUpdateError;
        const { error: profileUpdateError } = await training.from('trainee_profiles_api').update({ status: traineeStatus }).eq('trainee_id', trainee.traineeId);
        if (profileUpdateError) throw profileUpdateError;
      }
      const sessionKey = `${trainee.batch_id || trainee.batchName}::${date}`;
      let sessionId = sessionsByBatchDate.get(sessionKey);
      if (!sessionId) {
        const { data: existingSession, error: sessionError } = await training.from('training_sessions_api')
          .select('session_id, session_number').eq('batch_id', trainee.batch_id).eq('session_date', date).maybeSingle();
        if (sessionError) throw sessionError;
        if (existingSession) sessionId = Number(existingSession.session_id);
        else {
          const { data: sessions, error: allSessionsError } = await training.from('training_sessions_api').select('session_number').eq('batch_id', trainee.batch_id);
          if (allSessionsError) throw allSessionsError;
          const nextNumber = Math.max(0, ...(sessions || []).map((s: any) => Number(s.session_number) || 0)) + 1;
          const { data: created, error: createError } = await training.from('training_sessions_api').insert({ batch_id: trainee.batch_id, session_number: nextNumber, training_day: nextNumber, session_date: date }).select('session_id').single();
          if (createError) throw createError;
          sessionId = Number(created.session_id);
        }
        sessionsByBatchDate.set(sessionKey, sessionId);
      }
      const attendanceCode = String(item.attCode || '').trim().toUpperCase();
      const payload = { status: dbStatus(attendanceCode), attendance_code: ['P', 'A', 'L', 'U'].includes(attendanceCode) ? attendanceCode : null, notes: item.notes || null };
      const { data: existing, error: lookupError } = await training.from('trainee_attendance_api')
        .select('attendance_id').eq('enrollment_id', trainee.id).eq('session_id', sessionId).maybeSingle();
      if (lookupError) throw lookupError;
      const result = existing
        ? await training.from('trainee_attendance_api').update(payload).eq('attendance_id', existing.attendance_id)
        : await training.from('trainee_attendance_api').insert({ enrollment_id: trainee.id, session_id: sessionId, ...payload });
      if (result.error) throw result.error;
      if (body.actionType === 'status' && item.status && !supportedStatuses.includes(item.status.toUpperCase())) {
        throw new Error(`Unsupported trainee status: ${item.status}`);
      }
    }
    revalidatePath('/');
    revalidatePath('/attendance');
    return NextResponse.json({ success: true, saved: items.length });
  } catch (error: any) {
    console.error('Daily attendance save failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to save attendance.' }, { status: 400 });
  }
}
