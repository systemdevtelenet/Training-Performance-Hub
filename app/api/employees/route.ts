import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
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
    const { data: roles } = await supabase.from('roles').select('*');
    const { data: assignments } = await supabase.from('employee_assignments').select('*');
    const { data: trainersProfile } = await supabase.from('trainers_profile').select('*');
    const { data: inhouseData } = await supabase.from('inhouse').select('*');
    const { data: pstData } = await supabase.from('product_spec_training').select('*');

    // Create lookup maps
    const statusMap = new Map<number, string>();
    (statuses || []).forEach(s => statusMap.set(s.status_id, s.status_name));

    const roleMap = new Map<number, string>();
    (roles || []).forEach(r => roleMap.set(r.role_id, r.role_name));

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

    const processedCodes = new Set<string>();
    const processedEmails = new Set<string>();
    const processedNames = new Set<string>();
    const resultList: any[] = [];

    // 1. Prioritize Trainers from trainers_profile as PRIMARY employees at top
    (trainersProfile || []).forEach((t, idx) => {
      const code = String(t.employee_num || '').trim();
      const email = (t.gmail_account && t.gmail_account !== 'mail' ? t.gmail_account : t.thunderbird_account && t.thunderbird_account !== 'mail' ? t.thunderbird_account : null);
      const name = t.name || `Trainer ${idx + 1}`;
      const pos = (t.position || 'Trainer').trim();

      const matchingEmp = (employees || []).find(e => 
        (code && String(e.employee_code || '').trim().toLowerCase() === code.toLowerCase()) ||
        (email && (e.employee_email || '').trim().toLowerCase() === email.toLowerCase()) ||
        (name && (e.employee_name || '').trim().toLowerCase() === name.toLowerCase())
      );

      if (code) processedCodes.add(code.toLowerCase());
      if (email) processedEmails.add(email.toLowerCase());
      processedNames.add(name.toLowerCase());

      const isResigned = (t.status || '').toUpperCase() === 'RESIGNED';
      const isInactive = (t.status || '').toUpperCase() === 'INACTIVE';
      const statusId = isResigned ? 3 : isInactive ? 2 : 1;
      const statusName = isResigned ? 'Resigned' : isInactive ? 'Inactive' : 'Active';

      const roleTitle = pos.toUpperCase().includes('HEAD') 
        ? 'Head of Training' 
        : pos.toUpperCase().includes('COORDINATOR') 
        ? 'Training Coordinator' 
        : pos.toUpperCase().includes('CORP') 
        ? 'Corporate Trainer' 
        : 'Trainer';

      resultList.push({
        id: matchingEmp ? matchingEmp.id : -(1000 + idx),
        employee_code: code || matchingEmp?.employee_code || 'N/A',
        employee_name: name,
        employee_email: email || matchingEmp?.employee_email || null,
        status_id: statusId,
        status_name: statusName,
        role_id: matchingEmp?.role_id || 10,
        role_name: roleTitle,
        category: 'TRAINER',
        hire_date: t.start_date || matchingEmp?.hire_date || null,
        vici_link: matchingEmp?.vici_link || null,
        avatar_url: t.profile_pic && t.profile_pic !== 'None ' ? t.profile_pic : matchingEmp?.avatar_url || null,
        assigned_accounts: t.accounts || (matchingEmp ? (empAccountsMap.get(matchingEmp.id) || []).join(', ') : 'Unassigned') || 'Unassigned',
        is_primary_trainer: true
      });
    });

    // 2. Add remaining employees from employees table (Admins, QA, TLs, Agents)
    (employees || []).forEach(emp => {
      const code = String(emp.employee_code || '').trim().toLowerCase();
      const email = (emp.employee_email || '').trim().toLowerCase();
      const name = (emp.employee_name || '').trim().toLowerCase();

      if ((code && processedCodes.has(code)) || (email && processedEmails.has(email)) || (name && processedNames.has(name))) {
        return; // Already merged with trainers
      }

      const assignedAccs = empAccountsMap.get(emp.id) || [];
      const statusName = statusMap.get(emp.status_id) || (emp.status_id === 1 ? 'Active' : emp.status_id === 2 ? 'Inactive' : 'Active');
      const roleName = roleMap.get(emp.role_id) || 'Agent';

      let category = 'AGENT';
      const rUpper = roleName.toUpperCase();
      const nUpper = (emp.employee_name || '').toUpperCase();

      if (rUpper.includes('SUPERVISOR') || rUpper.includes('ADMIN') || nUpper.startsWith('HOT ') || nUpper.startsWith('ADMIN ')) {
        category = 'ADMIN';
      } else if (rUpper.includes('QA') || rUpper.includes('QUALITY') || nUpper.startsWith('QA ') || nUpper.startsWith('QAS ')) {
        category = 'QA';
      } else if (rUpper.includes('TL') || rUpper.includes('LEADER') || rUpper.includes('MANAGER') || nUpper.startsWith('TL ')) {
        category = 'TL';
      } else {
        category = 'AGENT';
      }

      resultList.push({
        ...emp,
        status_name: statusName,
        role_id: emp.role_id || 1,
        role_name: roleName,
        category,
        assigned_accounts: assignedAccs.length > 0 ? assignedAccs.join(', ') : 'Unassigned',
        account_ids: (assignments || []).filter(a => a.employee_id === emp.id).map(a => a.account_id),
        is_primary_trainer: false
      });
    });

    // 3. Add active Trainees from inhouse and PST
    const traineeNames = new Set<string>();
    let traineeIndex = 0;
    (inhouseData || []).concat(pstData || []).forEach(t => {
      const tName = (t.name || '').trim();
      if (!tName || traineeNames.has(tName.toLowerCase())) return;
      traineeNames.add(tName.toLowerCase());

      const isLoss = ['LOSS', 'ATTRITION', 'EOC', 'AWOL', 'FAILED', 'RESIGNED', 'TERMINATED', 'RED'].some(k => (t.status || '').toUpperCase().includes(k));
      const statusName = isLoss ? 'Resigned' : (t.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active' : (t.status || 'Active');

      resultList.push({
        id: -(5000 + traineeIndex++),
        employee_code: 'TRAINEE',
        employee_name: tName,
        employee_email: null,
        status_id: isLoss ? 3 : 1,
        status_name: statusName,
        role_id: 11,
        role_name: 'Trainee',
        category: 'TRAINEE',
        hire_date: null,
        vici_link: null,
        assigned_accounts: t.account || t.acount || 'Training Roster',
        is_primary_trainer: false
      });
    });

    return NextResponse.json({
      success: true,
      data: resultList,
      accounts: accounts || [],
      statuses: statuses || [],
      roles: roles || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new employee
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employee_code, employee_name, employee_email, status_id, role_id, hire_date, vici_link, account_id } = body;

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
      role_id: role_id ? Number(role_id) : 1
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
        role_id: Number(payload.role_id) || 1
      }]);
    }

    // If QA Supervisor (9) or Admin (5), ensure user_roles table is synchronized
    if (employee_email) {
      const cleanEmail = employee_email.trim().toLowerCase();
      try {
        if (Number(payload.role_id) === 9) {
          await supabase.from('user_roles').upsert([{ email: cleanEmail, role: 'QAS_ADMIN' }], { onConflict: 'email' });
        } else if (Number(payload.role_id) === 5) {
          await supabase.from('user_roles').upsert([{ email: cleanEmail, role: 'SUPER_ADMIN' }], { onConflict: 'email' });
        }
      } catch (e) {
        console.warn('Could not sync user_roles in POST:', e);
      }
    }

    await logActivity({
      title: 'Employee Profile Created',
      description: `Created new employee record for ${employee_name} (${employee_code || 'No Code'}).`,
      iconType: 'user',
      author: 'Authorized Admin'
    });

    try {
      revalidateTag('employees');
      revalidatePath('/employees');
    } catch (e) {
      // Ignore in non-edge/static contexts
    }

    return NextResponse.json({ success: true, data: newEmp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update employee
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, employee_code, employee_name, employee_email, status_id, role_id, hire_date, vici_link, account_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const payload: any = {};
    if (employee_code !== undefined) payload.employee_code = employee_code;
    if (employee_name !== undefined) payload.employee_name = employee_name;
    if (employee_email !== undefined) payload.employee_email = employee_email;
    if (status_id !== undefined) payload.status_id = Number(status_id);
    if (role_id !== undefined) payload.role_id = Number(role_id);
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
          role_id: Number(payload.role_id || updatedEmp?.role_id) || 1
        }]);
      }
    }

    // Synchronize user_roles if role_id is specified
    const targetEmail = employee_email || updatedEmp?.employee_email;
    if (targetEmail && payload.role_id !== undefined) {
      const cleanEmail = targetEmail.trim().toLowerCase();
      try {
        if (Number(payload.role_id) === 9) {
          await supabase.from('user_roles').upsert([{ email: cleanEmail, role: 'QAS_ADMIN' }], { onConflict: 'email' });
        } else if (Number(payload.role_id) === 5) {
          await supabase.from('user_roles').upsert([{ email: cleanEmail, role: 'SUPER_ADMIN' }], { onConflict: 'email' });
        } else {
          // If reverted from admin to regular role, remove or set to EMPLOYEE in user_roles
          const { data: existingRole } = await supabase.from('user_roles').select('role').eq('email', cleanEmail).maybeSingle();
          if (existingRole?.role === 'QAS_ADMIN' || existingRole?.role === 'SUPER_ADMIN') {
            await supabase.from('user_roles').delete().eq('email', cleanEmail);
          }
        }
      } catch (e) {
        console.warn('Could not sync user_roles in PUT:', e);
      }
    }

    await logActivity({
      title: 'Employee Profile Updated',
      description: `Updated employee record for ${employee_name || `ID #${id}`}.`,
      iconType: 'user',
      author: 'Authorized Admin'
    });

    try {
      revalidateTag('employees');
      revalidatePath('/employees');
    } catch (e) {
      // Ignore in non-edge/static contexts
    }

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
      title: 'Employee Profile Removed',
      description: `Deleted employee profile #${id} from directory.`,
      iconType: 'user',
      author: 'Authorized Admin'
    });

    try {
      revalidateTag('employees');
      revalidatePath('/employees');
    } catch (e) {
      // Ignore in non-edge/static contexts
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
