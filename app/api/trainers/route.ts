import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { isTrainerEmployee } from '@/lib/trainer-position';
import { authorizeAdminRequest, authorizeManagementReadRequest } from '@/lib/auth/access';

const { url: supabaseUrl, key: supabaseKey } = getSupabaseServerConfig();
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Fetch trainers and available accounts for form options
export async function GET() {
  const auth = await authorizeManagementReadRequest();
  if (!auth.ok) return auth.response;
  try {
    const [employeesResult, rolesResult, positionsResult, accountsResult] = await Promise.all([
      supabase.from('employees').select('id, employee_code, employee_name, status_id, role_id, position_id'),
      supabase.from('roles').select('role_id, role_name'),
      supabase.from('positions').select('position_id, position_name, position_code'),
      supabase.from('accounts').select('account_id, account_name').order('account_name'),
    ]);
    const error = employeesResult.error || rolesResult.error || positionsResult.error || accountsResult.error;
    if (error) throw error;

    const rolesById = new Map((rolesResult.data || []).map((row: any) => [Number(row.role_id), row.role_name]));
    const positionsById = new Map((positionsResult.data || []).map((row: any) => [Number(row.position_id), row]));
    const trainers = (employeesResult.data || [])
      .filter((employee: any) => isTrainerEmployee(
        positionsById.get(Number(employee.position_id)),
        rolesById.get(Number(employee.role_id)),
      ))
      .map((employee: any) => String(employee.employee_name || '').trim())
      .filter(Boolean);

    return NextResponse.json({
      trainers: Array.from(new Set(trainers)).sort((a, b) => a.localeCompare(b)),
      accounts: (accountsResult.data || []).map((account: any) => account.account_name).filter(Boolean),
    });
  } catch (error: any) {
    console.error('Failed to load trainer dropdown:', error);
    return NextResponse.json({ error: error.message || 'Unable to load trainers.' }, { status: 500 });
  }
}

// POST: Add new trainer profile
export async function POST(req: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const employeeCode = String(body.employee_num || '').trim();
    if (!name || !/^\d+$/.test(employeeCode)) return NextResponse.json({ error: 'Trainer name and numeric employee ID are required.' }, { status: 400 });
    const [statusResult, positionsResult, rolesResult] = await Promise.all([
      supabase.from('statuses').select('status_id').ilike('status_name', 'Active').maybeSingle(),
      supabase.from('positions').select('position_id, position_name, position_code'),
      supabase.from('roles').select('role_id, role_name'),
    ]);
    const lookupError = statusResult.error || positionsResult.error || rolesResult.error;
    if (lookupError) throw lookupError;
    const position = (positionsResult.data || []).find((row: any) => String(row.position_name || '').toLowerCase() === String(body.position || '').toLowerCase() || String(row.position_code || '').toLowerCase() === String(body.position || '').toLowerCase());
    if (!position) return NextResponse.json({ error: `Position "${body.position}" was not found.` }, { status: 400 });
    const role = (rolesResult.data || []).find((row: any) => /trainer|agent/i.test(String(row.role_name || '')));
    const { data: employee, error } = await supabase.from('employees').insert({
      employee_name: name,
      employee_code: employeeCode,
      employee_email: String(body.email || '').trim() || null,
      hire_date: body.startDate || null,
      avatar_url: String(body.profilePic || '').trim() || null,
      status_id: statusResult.data?.status_id || 1,
      position_id: position.position_id,
      role_id: role?.role_id || 1,
    }).select('id').single();
    if (error) throw error;
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    for (const accountName of accounts) {
      const { data: account, error: accountError } = await supabase.from('accounts').select('account_id').ilike('account_name', String(accountName)).maybeSingle();
      if (accountError) throw accountError;
      if (account) {
        const { error: assignmentError } = await supabase.from('employee_assignments').insert({ employee_id: employee.id, account_id: account.account_id });
        if (assignmentError) throw assignmentError;
      }
    }
    if (String(body.assignedTask || '').trim()) {
      const { error: taskError } = await supabase.schema('trainingHub_system').from('primary_tasks_api').upsert({ employee_id: employee.id, task_name: String(body.assignedTask).trim() });
      if (taskError) throw taskError;
    }
    await logActivity({ title: 'Trainer added', description: `Added trainer ${name}`, iconType: 'trainer', author: auth.actor.name, actionUrl: '/trainers' });
    revalidatePath('/trainers');
    revalidatePath('/employees');
    revalidatePath('/');
    return NextResponse.json({ success: true, id: employee.id });
  } catch (error: any) {
    console.error('Add trainer failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to add trainer.' }, { status: 400 });
  }
}
