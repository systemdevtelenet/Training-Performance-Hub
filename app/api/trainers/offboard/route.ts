import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { isTrainerMatch } from '@/lib/analytics-utils';
import { getTrainingPositionLabel, isTrainerEmployee } from '@/lib/trainer-position';
import { authorizeAdminRequest, authorizeManagementReadRequest } from '@/lib/auth/access';
import { getTraineesData, getTrainersData } from '@/lib/data-fetcher';

const { url: supabaseUrl, key: supabaseKey } = getSupabaseServerConfig();
const supabase = createClient(supabaseUrl, supabaseKey);

const LOSS_STATUSES = ['RESIGNED', 'TERMINATED', 'FAILED', 'AWOL', 'ACCOUNT REMOVED', 'LOSS', 'ATTRITION'];

// GET: Fetch list of trainers with their active trainee count and pending handovers
export async function GET() {
  const auth = await authorizeManagementReadRequest();
  if (!auth.ok) return auth.response;
  const trainers = await getTrainersData();
  return Response.json({ success: true, activeTrainers: trainers.filter((row: any) => !LOSS_STATUSES.some((status) => String(row.status || '').toUpperCase().includes(status))).map((row: any) => ({ id: row.employeeId, name: row.name, email: row.email, activeTrainees: row.batches?.reduce((sum: number, batch: any) => sum + Number(batch.headcount || 0), 0) || 0 })) });
}

// POST: Execute trainer resignation and active batch/trainee handover
export async function POST(req: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const trainerName = String(body.trainerName || '').trim();
    const { data: trainer, error: trainerError } = await supabase.from('employees').select('id, employee_name').ilike('employee_name', trainerName).maybeSingle();
    if (trainerError) throw trainerError;
    if (!trainer) return NextResponse.json({ error: 'Trainer not found.' }, { status: 404 });
    let replacement: any = null;
    if (body.reassignActiveTrainees) {
      const replacementName = String(body.replacementTrainer || '').trim();
      if (!replacementName) return NextResponse.json({ error: 'Choose a replacement trainer for active trainees.' }, { status: 400 });
      const { data, error } = await supabase.from('employees').select('id, employee_name').ilike('employee_name', replacementName).maybeSingle();
      if (error) throw error;
      if (!data || Number(data.id) === Number(trainer.id)) return NextResponse.json({ error: 'Replacement trainer is invalid.' }, { status: 400 });
      replacement = data;
    }
    const roster = await getTraineesData() as any[];
    const assigned = roster.filter((row) => isTrainerMatch(row.assignedTrainer, trainer.employee_name) && !LOSS_STATUSES.some((status) => String(row.status || '').toUpperCase().includes(status)));
    if (replacement) {
      const training = supabase.schema('trainingHub_system');
      const now = new Date().toISOString();
      for (const row of assigned) {
        const { error: endError } = await training.from('trainer_assignments_api').update({ ended_at: now }).eq('enrollment_id', row.id).is('ended_at', null);
        if (endError) throw endError;
        const { error: assignError } = await training.from('trainer_assignments_api').insert({ enrollment_id: row.id, trainer_employee_id: replacement.id });
        if (assignError) throw assignError;
      }
    }
    const requestedStatus = String(body.reasonCategory || '').toLowerCase().includes('resign') ? 'Resigned' : 'Inactive';
    const { data: targetStatus, error: statusError } = await supabase.from('statuses').select('status_id').ilike('status_name', requestedStatus).maybeSingle();
    if (statusError) throw statusError;
    if (!targetStatus) return NextResponse.json({ error: `${requestedStatus} status is not configured.` }, { status: 409 });
    const { error: updateError } = await supabase.from('employees').update({ status_id: targetStatus.status_id }).eq('id', trainer.id);
    if (updateError) throw updateError;
    await logActivity({ title: 'Trainer offboarded', description: `Offboarded ${trainer.employee_name}; ${assigned.length} active trainee(s) reassigned.`, iconType: 'trainer', author: auth.actor.name, actionUrl: '/trainers' });
    revalidatePath('/trainers');
    revalidatePath('/employees');
    revalidatePath('/trainees');
    revalidatePath('/');
    return NextResponse.json({ success: true, reassignedCount: replacement ? assigned.length : 0 });
  } catch (error: any) {
    console.error('Trainer offboarding failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to offboard trainer.' }, { status: 400 });
  }
}
