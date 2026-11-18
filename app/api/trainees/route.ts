import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { getTraineesData } from '@/lib/data-fetcher';
import { authorizeAuthenticatedRequest, authorizeTrainerOrAdminRequest } from '@/lib/auth/access';
import { isTrainerMatch } from '@/lib/analytics-utils';

export const dynamic = 'force-dynamic';

const { url, key } = getSupabaseServerConfig();
const supabase = createClient(url, key);
const training = supabase.schema('trainingHub_system');

type Input = Record<string, any>;
const clean = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

function splitName(value: unknown) {
  const parts = clean(value).split(' ').filter(Boolean);
  return {
    first_name: parts.shift() || '',
    last_name: parts.length > 1 ? parts.pop()! : (parts.pop() || ''),
    middle_name: parts.join(' ') || null,
  };
}

function normalizeStatus(value: unknown) {
  const status = clean(value).toUpperCase();
  if (['ONGOING', 'ENDORSED', 'EOC', 'AWOL', 'LATERAL', 'FAILED', 'DROPPED', 'RESIGNED', 'TERMINATED', 'COMPLETED', 'CANCELLED', 'UNKNOWN'].includes(status)) return status;
  if (['LOSS', 'ATTRITION', 'FALLOUT'].includes(status)) return 'DROPPED';
  return 'ONGOING';
}

async function resolveAccount(input: Input) {
  const accountName = clean(input.accountName || input.account);
  if (!accountName || accountName.toUpperCase() === 'GENERAL') return { id: null as number | null, label: null as string | null };
  const id = Number(input.accountId ?? input.account_id);
  if (Number.isInteger(id) && id > 0) {
    const { data, error } = await supabase.from('accounts').select('account_id, account_name').eq('account_id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Account ${id} was not found.`);
    return { id: Number(data.account_id), label: null };
  }
  const { data, error } = await supabase.from('accounts').select('account_id, account_name').ilike('account_name', accountName).maybeSingle();
  if (error) throw error;
  if (data) return { id: Number(data.account_id), label: null };
  return { id: null, label: accountName };
}

async function resolveTrainer(name: unknown) {
  const trainerName = clean(name);
  if (!trainerName || trainerName.toLowerCase() === 'unassigned') return null;
  const { data, error } = await supabase.from('employees').select('id, employee_name').ilike('employee_name', trainerName).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Trainer "${trainerName}" was not found.`);
  return { id: Number(data.id), name: String(data.employee_name) };
}

async function resolveBatch(input: Input, account: { id: number | null; label: string | null }, track: string) {
  const cohort = clean(input.batchName || input.batch || input.wave) || 'General';
    const { data: batches, error: lookupError } = await training.from('training_batches_api')
    .select('batch_id, account_id, track_code, cohort_code, display_name, account_label')
    .eq('track_code', track);
  if (lookupError) throw lookupError;
  const existing = (batches || []).find((batch: any) =>
    clean(batch.cohort_code).toLowerCase() === cohort.toLowerCase()
    && (batch.account_id == null ? account.id == null : Number(batch.account_id) === account.id)
    && clean(batch.account_label).toLowerCase() === clean(account.label).toLowerCase());
  if (existing) return Number(existing.batch_id);

  const { data, error } = await training.from('training_batches_api').insert({
    account_id: account.id,
    account_label: account.label,
    track_code: track,
    cohort_code: cohort,
    display_name: cohort,
    status: 'ACTIVE',
  }).select('batch_id').single();
  if (error) throw error;
  return Number(data.batch_id);
}

async function saveTrainee(input: Input, enrollmentId?: number) {
  const fullName = clean(input.name);
  if (!fullName) throw new Error('Trainee name is required.');
  const parts = splitName(fullName);
  const account = await resolveAccount(input);
  const trainer = await resolveTrainer(input.assignedTrainer || input.assigned_trainer);
  if (!trainer) throw new Error(`Select an assigned trainer for ${fullName}.`);
  const track = String(input.trainingType || input.training_track || 'INHOUSE').toUpperCase() === 'PST' ? 'PST' : 'INHOUSE';
  const batchId = await resolveBatch(input, account, track);
  const status = normalizeStatus(input.status);
  const reportingMonth = clean(input.month) || null;
  const reportingQuarter = clean(input.quarter) || null;

  if (enrollmentId) {
    const { data: enrollment, error: lookupError } = await training.from('trainee_enrollments_api')
      .select('enrollment_id, trainee_id').eq('enrollment_id', enrollmentId).is('archived_at', null).maybeSingle();
    if (lookupError) throw lookupError;
    if (!enrollment) throw new Error('Trainee enrollment was not found.');
    const { error: profileError } = await training.from('trainee_profiles_api').update({ ...parts, status }).eq('trainee_id', enrollment.trainee_id);
    if (profileError) throw profileError;
    const { error: enrollmentError } = await training.from('trainee_enrollments_api').update({
      batch_id: batchId,
      account_id: account.id,
      external_account_name: account.label,
      status,
      reporting_month: reportingMonth,
      reporting_quarter: reportingQuarter,
      endorsed_on: status === 'ENDORSED' ? new Date().toISOString().slice(0, 10) : null,
    }).eq('enrollment_id', enrollmentId);
    if (enrollmentError) throw enrollmentError;
    const now = new Date().toISOString();
    const { error: endError } = await training.from('trainer_assignments_api').update({ ended_at: now }).eq('enrollment_id', enrollmentId).is('ended_at', null);
    if (endError) throw endError;
    const { error: assignError } = await training.from('trainer_assignments_api').insert({ enrollment_id: enrollmentId, trainer_employee_id: trainer.id });
    if (assignError) throw assignError;
    return { id: enrollmentId, name: fullName };
  }

  const { data: profile, error: profileError } = await training.from('trainee_profiles_api').insert({ ...parts, status }).select('trainee_id').single();
  if (profileError) throw profileError;
  const { data: enrollment, error: enrollmentError } = await training.from('trainee_enrollments_api').insert({
    trainee_id: profile.trainee_id,
    batch_id: batchId,
    account_id: account.id,
    external_account_name: account.label,
    status,
    reporting_month: reportingMonth,
    reporting_quarter: reportingQuarter,
    started_on: input.startDate || input.start_date || null,
    endorsed_on: status === 'ENDORSED' ? new Date().toISOString().slice(0, 10) : null,
  }).select('enrollment_id').single();
  if (enrollmentError) {
    await training.from('trainee_profiles_api').delete().eq('trainee_id', profile.trainee_id);
    throw enrollmentError;
  }
  const { error: assignmentError } = await training.from('trainer_assignments_api').insert({ enrollment_id: enrollment.enrollment_id, trainer_employee_id: trainer.id });
  if (assignmentError) throw assignmentError;
  return { id: Number(enrollment.enrollment_id), name: fullName };
}

export async function GET() {
  const auth = await authorizeAuthenticatedRequest();
  if (!auth.ok) return auth.response;
  try {
    const trainees = await getTraineesData();
    return NextResponse.json({ success: true, data: trainees, trainees });
  } catch (error: any) {
    console.error('Fetch trainees failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unable to load trainees.', data: [], trainees: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const allowed = await authorizeTrainerOrAdminRequest();
  if (!allowed.ok) return allowed.response;
  try {
    const body = await req.json();
    const inputs: Input[] = body.isBulk && Array.isArray(body.trainees) ? body.trainees : [body];
    if (!inputs.length || inputs.some((item) => !clean(item.name))) return NextResponse.json({ error: 'Trainee name is required.' }, { status: 400 });
    const inserted = [];
    for (const item of inputs) {
      if (allowed.actor.role === 'TRAINER' && !isTrainerMatch(item.assignedTrainer || item.assigned_trainer, allowed.actor.name)) {
        return NextResponse.json({ error: 'Trainers may only assign trainees to themselves.' }, { status: 403 });
      }
      inserted.push(await saveTrainee(item));
    }
    await logActivity({ title: 'Trainee added', description: `${inserted.length} trainee record(s) added`, iconType: 'user', author: '', actionUrl: '/trainees' });
    revalidatePath('/trainees');
    revalidatePath('/');
    return NextResponse.json({ success: true, data: body.isBulk ? inserted : inserted[0] });
  } catch (error: any) {
    console.error('Add trainee failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to add trainee.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const allowed = await authorizeTrainerOrAdminRequest();
  if (!allowed.ok) return allowed.response;
  try {
    const body = await req.json();
    const enrollmentId = Number(body.id);
    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) return NextResponse.json({ error: 'A valid trainee ID is required.' }, { status: 400 });
    if (allowed.actor.role === 'TRAINER') {
      const roster = await getTraineesData() as any[];
      const current = roster.find((row) => Number(row.id) === enrollmentId);
      if (!current || !isTrainerMatch(current.assignedTrainer, allowed.actor.name)) return NextResponse.json({ error: 'Trainers may only update their assigned trainees.' }, { status: 403 });
      if (!isTrainerMatch(body.assignedTrainer || body.assigned_trainer, allowed.actor.name)) return NextResponse.json({ error: 'Trainers may only assign trainees to themselves.' }, { status: 403 });
    }
    const result = await saveTrainee(body, enrollmentId);
    if (String(body.status).toUpperCase() === 'ENDORSED') {
      const { data: enrollment, error } = await training.from('trainee_enrollments_api').select('trainee_id, account_id').eq('enrollment_id', enrollmentId).single();
      if (error) throw error;
      const { data: profile, error: profileError } = await training.from('trainee_profiles_api').select('first_name, middle_name, last_name').eq('trainee_id', enrollment.trainee_id).single();
      if (profileError) throw profileError;
      const employeeName = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ').trim();
      const { data: activeStatus, error: statusError } = await supabase.from('statuses').select('status_id').ilike('status_name', 'Active').maybeSingle();
      if (statusError) throw statusError;
      if (activeStatus) {
        const { data: employee, error: employeeError } = await supabase.from('employees').select('id').ilike('employee_name', employeeName).maybeSingle();
        if (employeeError) throw employeeError;
        if (!employee) {
        const { error: insertError } = await supabase.from('employees').insert({ employee_name: employeeName, first_name: profile.first_name, middle_name: profile.middle_name, last_name: profile.last_name, status_id: activeStatus.status_id });
          if (insertError) throw insertError;
        } else {
          const { error: updateError } = await supabase.from('employees').update({ status_id: activeStatus.status_id }).eq('id', employee.id);
          if (updateError) throw updateError;
        }
      }
    }
    await logActivity({ title: 'Trainee updated', description: `${result.name} record updated`, iconType: 'user', author: '', actionUrl: '/trainees' });
    revalidatePath('/trainees');
    revalidatePath('/employees');
    revalidatePath('/');
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Update trainee failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to update trainee.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const allowed = await authorizeTrainerOrAdminRequest();
  if (!allowed.ok) return allowed.response;
  try {
    const params = new URL(req.url).searchParams;
    const enrollmentId = Number(params.get('id'));
    let query = training.from('trainee_enrollments_api').update({ archived_at: new Date().toISOString() }).is('archived_at', null);
    if (Number.isInteger(enrollmentId) && enrollmentId > 0) query = query.eq('enrollment_id', enrollmentId);
    else {
      const name = clean(params.get('name')).toLowerCase();
      const batch = clean(params.get('batch')).toLowerCase();
      if (!name) return NextResponse.json({ error: 'Trainee ID or name is required.' }, { status: 400 });
      const roster = await getTraineesData() as any[];
      const matches = roster.filter((row: any) => row.name.toLowerCase() === name && row.batchName.toLowerCase() === batch && row.trainingType === (params.get('type') === 'PST' ? 'PST' : 'INHOUSE'));
      if (matches.length !== 1) return NextResponse.json({ error: matches.length ? 'More than one matching trainee was found; pass an ID.' : 'Trainee not found.' }, { status: matches.length ? 409 : 404 });
      if (allowed.actor.role === 'TRAINER' && !isTrainerMatch(matches[0].assignedTrainer, allowed.actor.name)) return NextResponse.json({ error: 'Trainers may only archive their assigned trainees.' }, { status: 403 });
      query = query.eq('enrollment_id', Number(matches[0].id));
    }
    const { data, error } = await query.select('enrollment_id').single();
    if (error) throw error;
    await logActivity({ title: 'Trainee archived', description: `Enrollment ${data.enrollment_id} archived`, iconType: 'user', author: '', actionUrl: '/trainees' });
    revalidatePath('/trainees');
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Archive trainee failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to archive trainee.' }, { status: 500 });
  }
}
