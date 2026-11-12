import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { getTraineesData } from '@/lib/data-fetcher';
import { authorizeAdminRequest, authorizeAuthenticatedRequest, authorizeTrainerOrAdminRequest } from '@/lib/auth/access';
import { scopeTraineeRecords } from '@/lib/trainee-scope';
import { isTrainerMatch } from '@/lib/analytics-utils';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Retrieve fresh trainee records across Inhouse and PST with trainer assignments
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

// POST: Add new trainee (supports both single & bulk entries)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const allowed = await authorizeTrainerOrAdminRequest();
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    //
    const inputs = body.isBulk && Array.isArray(body.trainees) ? body.trainees : [body];
    if (!inputs.length || inputs.some((t: any) => !String(t.name || '').trim())) {
      return NextResponse.json({ error: 'Trainee name is required.' }, { status: 400 });
    }

    const inserted: any[] = [];
    for (const trainee of inputs) {
      const fullName = String(trainee.name).trim().replace(/\s+/g, ' ');
      const nameParts = fullName.split(' ');
      const firstname = nameParts.shift() || '';
      const lastname = nameParts.length > 1 ? nameParts.pop()! : '';
      const middlename = nameParts.join(' ') || null;
      const isGeneralAccount = String(trainee.accountName || '').trim().toUpperCase() === 'GENERAL';
      const accountId = trainee.accountId == null || trainee.accountId === '' ? null : Number(trainee.accountId);
      let account: { account_id: number } | null = null;
      if (!isGeneralAccount) {
        if (!Number.isInteger(accountId) || Number(accountId) <= 0) {
          throw new Error(`Choose a valid account for ${fullName}.`);
        }
        const { data, error: accountError } = await supabase
          .from('accounts')
          .select('account_id')
          .eq('account_id', accountId)
          .maybeSingle();
        if (accountError) throw accountError;
        if (!data) throw new Error(`Account ID ${accountId} was not found in public.accounts.`);
        account = data;
      }

      const trainerName = String(trainee.assignedTrainer || '').trim();
      if (!trainerName || trainerName.toLowerCase() === 'unassigned') {
        throw new Error(`Select an assigned trainer for ${fullName}.`);
      }
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, employee_name')
        .ilike('employee_name', trainerName)
        .maybeSingle();
      if (employeeError) throw employeeError;
      if (!employee) throw new Error(`Trainer "${trainerName}" was not found in public.employees.`);

      const payload = {
        account_id: account?.account_id ?? null,
        firstname,
        middlename,
        lastname,
        batch_wave: trainee.batchName || trainee.batch || '',
        status: trainee.status || 'ONGOING',
        training_track: trainee.trainingType || 'INHOUSE',
      };
      const { data, error } = await supabase
        .schema('trainingHub_system')
        .from('trainees')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      const { error: assignmentError } = await supabase
        .schema('trainingHub_system')
        .from('trainer_assignment')
        .insert({
          employee_id: employee.id,
          trainer_account_id: account?.account_id ?? null,
          trainees_id: data.id,
        });
      if (assignmentError) {
        await supabase.schema('trainingHub_system').from('trainees').delete().eq('id', data.id);
        throw assignmentError;
      }
      inserted.push({ ...data, name: fullName, assignedTrainer: trainerName });
    }

    revalidatePath('/trainees');
    return NextResponse.json({ success: true, data: body.isBulk ? inserted : inserted[0] });
  } catch (error: any) {
    console.error('Add trainee failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to add trainee.' }, { status: 500 });
  }
}

// PUT: Endorse a trainee and add them to the official employee roster.
export async function PUT(req: Request) {
  const auth = await authorizeTrainerOrAdminRequest();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const traineeId = Number(body.id);
    if (!Number.isInteger(traineeId) || traineeId <= 0) {
      return NextResponse.json({ error: 'A valid trainee ID is required.' }, { status: 400 });
    }

    const hub = supabase.schema('trainingHub_system');
    const { data: trainee, error: traineeError } = await hub
      .from('trainees')
      .select('id, account_id, firstname, middlename, lastname, status')
      .eq('id', traineeId)
      .maybeSingle();
    if (traineeError) throw traineeError;
    if (!trainee) return NextResponse.json({ error: 'Trainee not found.' }, { status: 404 });

    const fullName = [trainee.firstname, trainee.middlename, trainee.lastname].filter(Boolean).join(' ').trim();
    if (!fullName) throw new Error('Trainee name is missing.');

    const { data: activeStatus, error: statusError } = await supabase
      .from('statuses')
      .select('status_id')
      .ilike('status_name', 'Active')
      .maybeSingle();
    if (statusError) throw statusError;
    if (!activeStatus) throw new Error('Active employee status was not found in public.statuses.');

    let employee: { id: number } | null = null;
    const { data: existingEmployee, error: existingError } = await supabase
      .from('employees')
      .select('id, status_id')
      .ilike('employee_name', fullName)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existingEmployee) {
      const { error: activateError } = await supabase
        .from('employees')
        .update({ status_id: activeStatus.status_id })
        .eq('id', existingEmployee.id);
      if (activateError) throw activateError;
      employee = existingEmployee;
    } else {
      const { data: createdEmployee, error: createError } = await supabase
        .from('employees')
        .insert({
          employee_name: fullName,
          first_name: trainee.firstname,
          middle_name: trainee.middlename,
          last_name: trainee.lastname,
          status_id: activeStatus.status_id,
        })
        .select('id')
        .single();
      if (createError) throw createError;
      employee = createdEmployee;
    }

    if (trainee.account_id != null) {
      const { data: existingAssignment, error: assignmentLookupError } = await supabase
        .from('employee_assignments')
        .select('assignment_id')
        .eq('employee_id', employee.id)
        .eq('account_id', trainee.account_id)
        .maybeSingle();
      if (assignmentLookupError) throw assignmentLookupError;
      if (!existingAssignment) {
        const { error: assignmentError } = await supabase.from('employee_assignments').insert({
          employee_id: employee.id,
          account_id: trainee.account_id,
        });
        if (assignmentError) throw assignmentError;
      }
    }

    const now = new Date().toISOString();
    const { data: updatedTrainee, error: updateError } = await hub
      .from('trainees')
      .update({ status: 'ENDORSED', endorsed_date: now })
      .eq('id', traineeId)
      .select()
      .single();
    if (updateError) throw updateError;

    revalidatePath('/trainees');
    revalidatePath('/employees');
    return NextResponse.json({ success: true, data: updatedTrainee, employeeId: employee.id });
  } catch (error: any) {
    console.error('Endorse trainee failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to endorse trainee.' }, { status: 500 });
  }
}

// DELETE: Remove trainee
export async function DELETE(req: Request) {
  return Response.json({ error: "Data storage is temporarily disabled while the schema is being replaced." }, { status: 503 });
}