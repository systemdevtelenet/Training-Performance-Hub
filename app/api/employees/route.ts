import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/actions/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Fetch all employees with status and assigned accounts
export async function GET() {
  try {
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .order('id', { ascending: false });

    if (empErr) {
      console.error('Error fetching employees:', empErr);
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }

    const { data: statuses } = await supabase.from('statuses').select('*');
    const { data: accounts } = await supabase.from('accounts').select('*');
    const { data: assignments } = await supabase.from('employee_assignments').select('*');

    // Create lookup maps
    const statusMap = new Map<number, string>();
    (statuses || []).forEach(s => statusMap.set(s.status_id, s.status_name));

    const accountMap = new Map<number, string>();
    (accounts || []).forEach(a => accountMap.set(a.account_id, a.account_name || a.account_code));

    // Group assigned accounts by employee_id
    const empAccountsMap = new Map<number, string[]>();
    (assignments || []).forEach(asg => {
      const accName = accountMap.get(asg.account_id);
      if (accName && asg.employee_id) {
        const existing = empAccountsMap.get(asg.employee_id) || [];
        if (!existing.includes(accName)) {
          existing.push(accName);
          empAccountsMap.set(asg.employee_id, existing);
        }
      }
    });

    const enrichedEmployees = (employees || []).map(emp => {
      const assignedAccs = empAccountsMap.get(emp.id) || [];
      const statusName = statusMap.get(emp.status_id) || (emp.status_id === 1 ? 'Active' : emp.status_id === 2 ? 'Inactive' : 'Active');
      return {
        ...emp,
        status_name: statusName,
        assigned_accounts: assignedAccs.length > 0 ? assignedAccs.join(', ') : 'Unassigned',
        account_ids: (assignments || []).filter(a => a.employee_id === emp.id).map(a => a.account_id)
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedEmployees,
      accounts: accounts || [],
      statuses: statuses || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new employee
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employee_code, employee_name, employee_email, status_id, hire_date, vici_link, account_id } = body;

    if (!employee_name) {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 });
    }

    const payload: any = {
      employee_code: employee_code || Math.floor(1000 + Math.random() * 9000).toString(),
      employee_name,
      employee_email: employee_email || null,
      status_id: status_id ? Number(status_id) : 1,
      hire_date: hire_date || null,
      vici_link: vici_link || null,
      role_id: 1
    };

    const { data: newEmp, error: insertErr } = await supabase
      .from('employees')
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      console.error('Error inserting employee:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Insert account assignment if account_id is provided
    if (account_id && newEmp?.id) {
      await supabase.from('employee_assignments').insert([{
        employee_id: newEmp.id,
        account_id: Number(account_id),
        role_id: 1
      }]);
    }

    await logActivity({
      title: 'Employee Profile Created',
      description: `Created new employee record for ${employee_name} (${employee_code || 'No Code'}).`,
      iconType: 'user',
      author: 'Authorized Admin'
    });

    return NextResponse.json({ success: true, data: newEmp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update employee
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, employee_code, employee_name, employee_email, status_id, hire_date, vici_link, account_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const payload: any = {};
    if (employee_code !== undefined) payload.employee_code = employee_code;
    if (employee_name !== undefined) payload.employee_name = employee_name;
    if (employee_email !== undefined) payload.employee_email = employee_email;
    if (status_id !== undefined) payload.status_id = Number(status_id);
    if (hire_date !== undefined) payload.hire_date = hire_date || null;
    if (vici_link !== undefined) payload.vici_link = vici_link || null;

    const { data: updatedEmp, error: updateErr } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('Error updating employee:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Update account assignment if account_id is provided
    if (account_id !== undefined) {
      await supabase.from('employee_assignments').delete().eq('employee_id', id);
      if (account_id) {
        await supabase.from('employee_assignments').insert([{
          employee_id: id,
          account_id: Number(account_id),
          role_id: 1
        }]);
      }
    }

    await logActivity({
      title: 'Employee Profile Updated',
      description: `Updated employee record for ${employee_name || `ID #${id}`}.`,
      iconType: 'user',
      author: 'Authorized Admin'
    });

    return NextResponse.json({ success: true, data: updatedEmp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove employee
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Delete assignments first
    await supabase.from('employee_assignments').delete().eq('employee_id', Number(id));

    // Delete employee record
    const { error: deleteErr } = await supabase.from('employees').delete().eq('id', Number(id));

    if (deleteErr) {
      console.error('Error deleting employee:', deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    await logActivity({
      title: 'Employee Removed',
      description: `Deleted employee profile #${id} from system.`,
      iconType: 'alert',
      author: 'Authorized Admin'
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
