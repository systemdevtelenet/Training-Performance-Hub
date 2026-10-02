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
    const { data: trainersProfile, error: tpErr } = await supabase
      .from('trainers_profile')
      .select('*')
      .order('name', { ascending: true });

    if (tpErr) {
      console.error('Error fetching trainers_profile:', tpErr);
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

    return NextResponse.json({
      success: true,
      trainers: trainersProfile || [],
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

    // 1. Insert into trainers_profile table
    const trainerProfilePayload = {
      name: cleanName,
      position: cleanPosition,
      status: status.toUpperCase(),
      start_date: cleanStartDate,
      employee_num: cleanCode,
      accounts: accountsString,
      gmail_account: cleanEmail,
      thunderbird_account: cleanEmail,
      profile_pic: profilePic || null,
      assigned_task: assignedTask || `${cleanPosition} Duties`
    };

    const { data: newTrainerProfile, error: tpInsertErr } = await supabase
      .from('trainers_profile')
      .insert([trainerProfilePayload])
      .select()
      .maybeSingle();

    if (tpInsertErr) {
      console.error('Error inserting into trainers_profile:', tpInsertErr);
      return NextResponse.json({ success: false, error: tpInsertErr.message }, { status: 500 });
    }

    // 2. Also insert or sync into employees table
    try {
      const isHead = cleanPosition.toUpperCase().includes('HEAD');
      const roleId = isHead ? 5 : 10; // 5 for Admin/HOT, 10 for Trainer
      const empPayload = {
        employee_code: cleanCode,
        employee_name: cleanName,
        employee_email: cleanEmail,
        status_id: 1, // Active
        hire_date: cleanStartDate,
        role_id: roleId
      };

      await supabase.from('employees').insert([empPayload]);
    } catch (empErr) {
      console.warn('Could not insert to employees table (optional sync):', empErr);
    }

    // 3. Insert into trainers table (if present in schema)
    try {
      await supabase.from('trainers').insert([{
        employee_num: cleanCode,
        position: cleanPosition,
        status: status.toUpperCase(),
        start_date: cleanStartDate,
        profile_pic: profilePic || null,
        assigned_task: assignedTask || `${cleanPosition} Duties`
      }]);
    } catch (trErr) {
      console.warn('Could not insert into trainers table (optional sync):', trErr);
    }

    // 4. Synchronize user_roles if email is provided
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

    // 5. Audit Logging
    await logActivity({
      title: 'Trainer Added to Hub',
      description: `Admin ${adminName} onboarded new trainer ${cleanName} (${cleanPosition}) assigned to ${accountsString || 'General Accounts'}.`,
      iconType: 'user',
      author: adminName
    });

    // 6. Revalidate cache
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
      trainer: newTrainerProfile
    });
  } catch (err: any) {
    console.error('Error in POST /api/trainers:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
