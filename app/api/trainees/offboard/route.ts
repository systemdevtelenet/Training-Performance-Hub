import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { authorizeAdminRequest, authorizeManagementReadRequest, authorizeTrainerOrAdminRequest } from '@/lib/auth/access';
import { getTraineesData } from '@/lib/data-fetcher';
import { isTrainerMatch } from '@/lib/analytics-utils';

const { url, key } = getSupabaseServerConfig();
const supabase = createClient(url, key, { auth: { persistSession: false } });
const training = supabase.schema('trainingHub_system');
const requestTable = training.from('trainee_offboarding_requests_api');
const allowedStatuses = ['RESIGNED', 'TERMINATED', 'FAILED', 'AWOL', 'ACCOUNT REMOVED'];

async function getActorEmployeeId(email: string) {
  const { data, error } = await supabase.from('employees').select('id').ilike('employee_email', email).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('The signed-in user is not linked to an employee record.');
  return Number(data.id);
}

export async function GET() {
  const auth = await authorizeManagementReadRequest();
  if (!auth.ok) return auth.response;
  try {
    const { data: requests, error } = await requestTable.select('*').eq('approval_status', 'PENDING').order('requested_at', { ascending: false });
    if (error) throw error;
    const [roster, employeesResult] = await Promise.all([
      getTraineesData() as Promise<any[]>,
      supabase.from('employees').select('id, employee_name'),
    ]);
    if (employeesResult.error) throw employeesResult.error;
    const rosterById = new Map(roster.map((row) => [Number(row.id), row]));
    const employeeById = new Map((employeesResult.data || []).map((row: any) => [Number(row.id), row.employee_name]));
    const rows = (requests || []).flatMap((request: any) => {
      const trainee = rosterById.get(Number(request.enrollment_id));
      if (!trainee) return [];
      return [{
        id: request.request_id,
        enrollmentId: request.enrollment_id,
        sourceKey: `${trainee.trainingType}-${trainee.id}`,
        traineeName: trainee.name,
        trainingType: trainee.trainingType,
        batchName: trainee.batchName,
        accountName: trainee.accountName,
        assignedTrainer: trainee.assignedTrainer,
        status: request.separation_type,
        departureDate: request.effective_date,
        reasonCategory: request.reason_category,
        remarks: request.remarks,
        requestedBy: employeeById.get(Number(request.requested_by_employee_id)) || 'Staff',
        requestedAt: request.requested_at,
      }];
    });
    return NextResponse.json({ success: true, requests: rows });
  } catch (error: any) {
    console.error('Fetch trainee offboarding requests failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to load offboarding requests.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeTrainerOrAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const status = String(body.status || '').trim().toUpperCase();
    const departureDate = String(body.departureDate || '').trim();
    if (!allowedStatuses.includes(status)) return NextResponse.json({ error: 'Choose a valid separation status.' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) return NextResponse.json({ error: 'A valid departure date is required.' }, { status: 400 });
    const roster = await getTraineesData() as any[];
    const name = String(body.traineeName || '').trim().toLowerCase();
    const batch = String(body.batchName || '').trim().toLowerCase();
    const candidates = roster.filter((row) => row.name.toLowerCase() === name && row.batchName.toLowerCase() === batch && row.trainingType === body.trainingType);
    if (candidates.length !== 1) return NextResponse.json({ error: candidates.length ? 'More than one matching enrollment was found.' : 'Trainee enrollment not found.' }, { status: candidates.length ? 409 : 404 });
    const trainee = candidates[0];
    if (auth.actor.role === 'TRAINER' && !isTrainerMatch(trainee.assignedTrainer, auth.actor.name)) {
      return NextResponse.json({ error: 'Trainers may only request offboarding for their assigned trainees.' }, { status: 403 });
    }
    const requestedBy = await getActorEmployeeId(auth.actor.email);
    const clearance = body.clearanceChecked || {};
    if (auth.actor.role === 'TRAINER') {
      const { error } = await requestTable.insert({
        enrollment_id: trainee.id,
        separation_type: status,
        effective_date: departureDate,
        reason_category: String(body.reasonCategory || 'General').trim(),
        remarks: String(body.remarks || '').trim(),
        assets_returned: Boolean(clearance.assetsReturned),
        access_revoked: Boolean(clearance.accessRevoked),
        evaluations_logged: Boolean(clearance.evaluationsLogged),
        requested_by_employee_id: requestedBy,
      });
      if (error) throw error;
      await logActivity({ title: 'Trainee offboarding requested', description: `Offboarding requested for ${trainee.name}.`, iconType: 'user', author: auth.actor.name, actionUrl: '/trainees' });
      return NextResponse.json({ success: true, pendingApproval: true });
    }

    const { error: enrollmentError } = await training.from('trainee_enrollments_api').update({ status }).eq('enrollment_id', trainee.id);
    if (enrollmentError) throw enrollmentError;
    const { error: profileError } = await training.from('trainee_profiles_api').update({ status }).eq('trainee_id', trainee.traineeId);
    if (profileError) throw profileError;
    await logActivity({ title: 'Trainee offboarded', description: `Offboarded ${trainee.name} as ${status}.`, iconType: 'user', author: auth.actor.name, actionUrl: '/trainees' });
    revalidatePath('/trainees');
    revalidatePath('/');
    return NextResponse.json({ success: true, pendingApproval: false });
  } catch (error: any) {
    console.error('Submit trainee offboarding failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to submit offboarding.' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const requestId = Number(body.requestData?.id || body.id);
    const action = String(body.action || '').toLowerCase();
    if (!Number.isInteger(requestId) || requestId <= 0 || !['approve', 'decline'].includes(action)) return NextResponse.json({ error: 'A valid request and action are required.' }, { status: 400 });
    const { data: request, error: lookupError } = await requestTable.select('*').eq('request_id', requestId).eq('approval_status', 'PENDING').maybeSingle();
    if (lookupError) throw lookupError;
    if (!request) return NextResponse.json({ error: 'Pending offboarding request not found.' }, { status: 404 });
    const reviewerId = await getActorEmployeeId(auth.actor.email);
    const now = new Date().toISOString();
    if (action === 'approve') {
      const { data: enrollment, error: enrollmentLookupError } = await training.from('trainee_enrollments_api').select('trainee_id').eq('enrollment_id', request.enrollment_id).single();
      if (enrollmentLookupError) throw enrollmentLookupError;
      const { error: enrollmentError } = await training.from('trainee_enrollments_api').update({ status: request.separation_type }).eq('enrollment_id', request.enrollment_id);
      if (enrollmentError) throw enrollmentError;
      const { error: profileError } = await training.from('trainee_profiles_api').update({ status: request.separation_type }).eq('trainee_id', enrollment.trainee_id);
      if (profileError) throw profileError;
    }
    const { error } = await requestTable.update({
      approval_status: action === 'approve' ? 'APPROVED' : 'DECLINED',
      reviewed_by_employee_id: reviewerId,
      reviewed_at: now,
      review_notes: String(body.reviewNotes || '').trim(),
      processed_at: action === 'approve' ? now : null,
      updated_at: now,
    }).eq('request_id', requestId);
    if (error) throw error;
    await logActivity({ title: action === 'approve' ? 'Trainee offboarding approved' : 'Trainee offboarding declined', description: `${action === 'approve' ? 'Approved' : 'Declined'} offboarding request for ${String(body.traineeName || body.requestData?.traineeName || 'trainee')}.`, iconType: 'user', author: auth.actor.name, actionUrl: '/trainees' });
    revalidatePath('/trainees');
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Review trainee offboarding failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to process offboarding request.' }, { status: 400 });
  }
}
