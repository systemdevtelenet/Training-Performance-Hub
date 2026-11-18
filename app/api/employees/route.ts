import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { getEmployeesData } from '@/lib/data-fetcher';
import { authorizeAdminRequest, authorizeManagementReadRequest } from '@/lib/auth/access';

export const dynamic = 'force-dynamic';
const { url, key } = getSupabaseServerConfig();
const supabase = createClient(url, key, { auth: { persistSession: false } });

function employeePayload(body: any) {
  return {
    employee_code: String(body.employee_code || '').trim() || null,
    employee_name: String(body.employee_name || '').trim(),
    employee_email: String(body.employee_email || '').trim() || null,
    status_id: Number(body.status_id) || 1,
    role_id: Number(body.role_id) || 1,
    position_id: body.position_id ? Number(body.position_id) : null,
    hire_date: body.hire_date || null,
    vici_link: String(body.vici_link || '').trim() || null,
  };
}

async function replaceEmployeeAccount(employeeId: number, accountId: unknown) {
  const { error: deleteError } = await supabase.from('employee_assignments').delete().eq('employee_id', employeeId);
  if (deleteError) throw deleteError;
  const id = Number(accountId);
  if (Number.isInteger(id) && id > 0) {
    const { error } = await supabase.from('employee_assignments').insert({ employee_id: employeeId, account_id: id });
    if (error) throw error;
  }
}

export async function GET() {
  const auth = await authorizeManagementReadRequest();
  if (!auth.ok) return auth.response;
  const result = await getEmployeesData();
  return NextResponse.json({ success: true, data: result.employees, ...result });
}

export async function POST(req: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const payload = employeePayload(body);
    if (!payload.employee_name) return NextResponse.json({ error: 'Employee name is required.' }, { status: 400 });
    const { data, error } = await supabase.from('employees').insert(payload).select('id').single();
    if (error) throw error;
    if (body.account_id) await replaceEmployeeAccount(Number(data.id), body.account_id);
    await logActivity({ title: 'Employee profile added', description: `Added employee ${payload.employee_name}`, iconType: 'user', author: auth.actor.name, actionUrl: '/employees' });
    revalidatePath('/employees');
    revalidatePath('/trainers');
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Create employee failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to create employee.' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'A valid employee ID is required.' }, { status: 400 });
    const payload = employeePayload(body);
    if (!payload.employee_name) return NextResponse.json({ error: 'Employee name is required.' }, { status: 400 });
    const { data, error } = await supabase.from('employees').update(payload).eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    await replaceEmployeeAccount(id, body.account_id);
    await logActivity({ title: 'Employee profile updated', description: `Updated employee ${payload.employee_name}`, iconType: 'user', author: auth.actor.name, actionUrl: '/employees' });
    revalidatePath('/employees');
    revalidatePath('/trainers');
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Update employee failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to update employee.' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'A valid employee ID is required.' }, { status: 400 });
  const { data: inactiveStatus, error: statusError } = await supabase.from('statuses').select('status_id').ilike('status_name', 'Inactive').maybeSingle();
  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 400 });
  if (!inactiveStatus) return NextResponse.json({ error: 'Inactive status is not configured.' }, { status: 409 });
  const { data, error } = await supabase.from('employees').update({ status_id: inactiveStatus.status_id }).eq('id', id).select('employee_name').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
  await logActivity({ title: 'Employee deactivated', description: `Deactivated employee ${data.employee_name || id}`, iconType: 'user', author: auth.actor.name, actionUrl: '/employees' });
  revalidatePath('/employees');
  revalidatePath('/trainers');
  return NextResponse.json({ success: true });
}
