import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Fetch trainers and available accounts for form options
export async function GET() {
  try {
    const { data: trainerRows, error: trainerError } = await supabase
      .from('trainers')
      .select('*');
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('id, employee_code, employee_name, employee_email, status_id, hire_date, avatar_url');
    const { data: statuses } = await supabase.from('statuses').select('status_id, status_name');
    const { data: assignments } = await supabase.from('employee_assignments').select('employee_id, account_id');

    if (trainerError || employeeError) {
      const message = trainerError?.message || employeeError?.message || 'Unable to fetch trainers.';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }

    const { data: accountsData } = await supabase
      .from('accounts')
      .select('account_id, account_name, account_code');

    const { data: inhouseData } = await supabase.from('inhouse').select('account, acount');
    const { data: pstData } = await supabase.from('product_spec_training').select('account');

    // Aggregate unique accounts from all sources
    const accountsSet = new Set<string>();
    (accountsData || []).forEach((a: any) => {
      const name = (a.account_name || a.account_code || '').trim();
      if (name) accountsSet.add(name);
    });
    (inhouseData || []).forEach((i: any) => {
      const name = (i.account || i.acount || '').trim();
      if (name) accountsSet.add(name);
    });
    (pstData || []).forEach((p: any) => {
      const name = (p.account || '').trim();
      if (name) accountsSet.add(name);
    });

    const employeeByCode = new Map(
      (employees || []).map((employee: any) => [String(employee.employee_code || '').trim().toLowerCase(), employee]),
    );
    const statusById = new Map(
      (statuses || []).map((item: any) => [Number(item.status_id), String(item.status_name || '')]),
    );
    const accountById = new Map(
      (accountsData || []).map((account: any) => [Number(account.account_id), account.account_name || account.account_code]),
    );
    const accountsByEmployeeId = new Map<string, string[]>();
    (assignments || []).forEach((assignment: any) => {
      const employeeId = String(assignment.employee_id || '');
      const accountName = accountById.get(Number(assignment.account_id));
      if (!employeeId || !accountName) return;
      const current = accountsByEmployeeId.get(employeeId) || [];
      if (!current.includes(accountName)) current.push(accountName);
      accountsByEmployeeId.set(employeeId, current);
    });

    const trainerDirectory = (trainerRows || []).flatMap((trainer: any) => {
      const employee = employeeByCode.get(String(trainer.employee_num || '').trim().toLowerCase());
      if (!employee) return [];
      return [{
        id: employee.id,
        name: employee.employee_name,
        employee_num: employee.employee_code,
        email: employee.employee_email,
        gmail_account: employee.employee_email,
        thunderbird_account: employee.employee_email,
        position: trainer.position || 'Trainer',
        status: (statusById.get(Number(employee.status_id)) || 'Active').toUpperCase(),
        start_date: employee.hire_date,
        profile_pic: employee.avatar_url,
        accounts: (accountsByEmployeeId.get(String(employee.id)) || []).join(', '),
      }];
    }).sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));

    return NextResponse.json({
      success: true,
      trainers: trainerDirectory,
      accounts: Array.from(accountsSet).sort()
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Add new trainer profile
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      employee_num,
      position = 'Trainer',
      email,
      startDate,
      accounts = [],
      status = 'ACTIVE',
      profilePic,
      assignedTask,
      adminName = 'Super Admin'
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Trainer name is required.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanPosition = position.trim() || 'Trainer';
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanCode = employee_num ? employee_num.trim().replace(/\D/g, '') : String(Math.floor(1000 + Math.random() * 9000));
    const today = new Date().toISOString().split('T')[0];
    const cleanStartDate = startDate || today;
    const accountsString = Array.isArray(accounts) ? accounts.join(', ') : (accounts || '');

    // Employees owns trainer identity and status. The trainers table only marks
    // trainer membership and stores training-specific metadata.
    const { data: statusRows } = await supabase.from('statuses').select('status_id, status_name');
    const requestedStatus = String(status || 'ACTIVE').trim().toUpperCase();
    const statusRow = (statusRows || []).find((item: any) => String(item.status_name || '').trim().toUpperCase() === requestedStatus);
    const isHead = cleanPosition.toUpperCase().includes('HEAD');
    const roleId = isHead ? 5 : 10;
    const empPayload = {
      employee_code: cleanCode,
      employee_name: cleanName,
      employee_email: cleanEmail,
      status_id: Number(statusRow?.status_id || 1),
      hire_date: cleanStartDate,
      role_id: roleId,
      avatar_url: profilePic || null,
    };

    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, employee_code')
      .eq('employee_code', cleanCode)
      .maybeSingle();

    let employee: any = existingEmployee;
    if (existingEmployee) {
      const { data, error } = await supabase
        .from('employees')
        .update(empPayload)
        .eq('id', existingEmployee.id)
        .select('id, employee_code')
        .single();
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      employee = data;
    } else {
      const { data, error } = await supabase
        .from('employees')
        .insert([empPayload])
        .select('id, employee_code')
        .single();
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      employee = data;
    }

    const { data: existingTrainer } = await supabase
      .from('trainers')
      .select('trainer_id')
      .eq('employee_num', cleanCode)
      .maybeSingle();

    const trainerPayload = {
      employee_num: cleanCode,
      position: cleanPosition,
      status: requestedStatus,
      start_date: cleanStartDate,
      profile_pic: profilePic || null,
      assigned_task: String(assignedTask || '').trim() || null,
    };
    const trainerWrite = existingTrainer
      ? await supabase.from('trainers').update(trainerPayload).eq('trainer_id', existingTrainer.trainer_id).select().single()
      : await supabase.from('trainers').insert([trainerPayload]).select().single();

    if (trainerWrite.error) {
      return NextResponse.json({ success: false, error: trainerWrite.error.message }, { status: 500 });
    }

      const cleanAssignedTask = String(assignedTask || '').trim();
      if (employee?.id && cleanAssignedTask && cleanAssignedTask.toLowerCase() !== 'task') {
        const { error: primaryTaskError } = await supabase
          .from('primary_tasks')
          .upsert([{
            employee_id: employee.id,
            task_name: cleanAssignedTask,
            updated_at: new Date().toISOString()
          }], { onConflict: 'employee_id' });

        if (primaryTaskError) {
          console.warn('Could not save primary task:', primaryTaskError.message);
        }
      }
    // Synchronize access for the Head of Training when email is provided.
    if (cleanEmail) {
      try {
        const isHead = cleanPosition.toUpperCase().includes('HEAD');
        if (isHead) {
          await supabase.from('user_roles').upsert([{ email: cleanEmail, role: 'HOT_ADMIN' }], { onConflict: 'email' });
        }
      } catch (roleErr) {
        console.warn('Could not sync user_roles:', roleErr);
      }
    }

    // Audit Logging
    await logActivity({
      title: 'Trainer Added to Hub',
      description: `Admin ${adminName} onboarded new trainer ${cleanName} (${cleanPosition}) assigned to ${accountsString || 'General Accounts'}.`,
      iconType: 'user',
      author: adminName
    });

    // Revalidate cache
    try {
      revalidateTag('trainers');
      revalidateTag('employees');
      revalidatePath('/trainers');
      revalidatePath('/employees');
      revalidatePath('/');
    } catch (e) {
      // safe ignore in static contexts
    }

    return NextResponse.json({
      success: true,
      message: `Trainer ${cleanName} has been successfully added.`,
      trainer: {
        ...trainerWrite.data,
        id: employee.id,
        name: cleanName,
        email: cleanEmail,
        status: requestedStatus,
      }
    });
  } catch (err: any) {
    console.error('Error in POST /api/trainers:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
