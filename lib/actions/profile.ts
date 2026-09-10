'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export interface UserProfileResponse {
  success: boolean;
  role: string;
  userName: string;
  email: string;
  avatarUrl: string | null;
  assignedTrainer: string | null;
  userMeta: {
    employeeId: string;
    startDate: string;
    accounts: string;
    primaryTask: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    mobileNo: string;
    homeAddress: string;
    systemRole: string;
  };
}

export async function fetchUserProfile(userEmail: string): Promise<UserProfileResponse> {
  try {
    if (!userEmail) throw new Error('No user email provided');

    // 1. Fetch role from user_roles
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();

    // 2. Fetch trainer profile if exists
    const { data: trainerData } = await supabaseAdmin
      .from('trainers_profile')
      .select('*')
      .or(`gmail_account.eq."${userEmail}",thunderbird_account.eq."${userEmail}"`)
      .maybeSingle();

    // 3. Fetch trainer main row
    const empNum = trainerData?.employee_num || trainerData?.employeeNo;
    let trainerRow: any = null;
    if (empNum) {
      const { data } = await supabaseAdmin
        .from('trainers')
        .select('*')
        .eq('employee_num', empNum)
        .maybeSingle();
      trainerRow = data;
    }

    // 4. Fetch employee details if exists
    const { data: empData } = await supabaseAdmin
      .from('employees')
      .select('*')
      .or(`employee_email.eq."${userEmail}"${empNum ? `,employee_code.eq."${empNum}"` : ''}`)
      .maybeSingle();

    // Determine actual full name (prefer real name from trainers_profile, else employees table, else N/A)
    let rawName = trainerData?.name || empData?.employee_name || null;

    // Determine effective role dynamically from user_roles or trainer/employee profile position
    let effRole = 'EMPLOYEE';
    if (roleData?.role) {
      effRole = roleData.role;
    } else if (trainerData) {
      const pos = (trainerData.position || '').toUpperCase();
      if (pos.includes('HOT') || pos.includes('HEAD OF TRAINING')) {
        effRole = 'HOT_ADMIN';
      } else if (pos.includes('QAS')) {
        effRole = 'QAS_ADMIN';
      } else {
        effRole = 'TRAINER';
      }
    } else if (empData) {
      const pos = (empData.position || '').toUpperCase();
      if (pos.includes('ADMIN')) {
        effRole = 'SUPER_ADMIN';
      } else {
        effRole = 'EMPLOYEE';
      }
    }

    // Dynamic position title
    const resolvedPosition = trainerData?.position || trainerData?.assigned_task || trainerRow?.pos || empData?.position || (effRole === 'HOT_ADMIN' ? 'Head of Training' : effRole === 'SUPER_ADMIN' ? 'Super Admin' : effRole === 'VIEW_ADMIN' ? 'Executive Admin (View Only)' : effRole === 'TRAINER' ? 'Trainer' : effRole === 'EMPLOYEE' ? 'Employee' : 'N/A');

    // Parse Name Parts
    let fName = empData?.first_name || 'N/A';
    let mName = empData?.middle_name || 'N/A';
    let lName = empData?.last_name || 'N/A';
    let sName = empData?.suffix || 'N/A';

    if (fName === 'N/A' && rawName) {
      const parts = rawName.trim().split(/\s+/);
      if (parts.length === 1) {
        fName = parts[0];
      } else if (parts.length > 1) {
        fName = parts.slice(0, -1).join(' ');
        lName = parts[parts.length - 1];
      }
    }

    const roleFormatted = effRole === 'HOT_ADMIN' ? 'Admin' : effRole === 'SUPER_ADMIN' ? 'Super Admin' : effRole === 'VIEW_ADMIN' ? 'Executive Admin' : effRole === 'TRAINER' ? 'Trainer' : effRole === 'EMPLOYEE' ? 'Employee' : 'N/A';

    // 5. If trainee, find assigned trainer
    let assignedTrainer: string | null = null;
    if (rawName) {
      const { data: ih } = await supabaseAdmin
        .from('inhouse')
        .select('assignedTrainer, trainer')
        .ilike('name', `%${rawName}%`)
        .limit(1)
        .maybeSingle();

      assignedTrainer = ih?.assignedTrainer || ih?.trainer || null;
    }

    const avatarUrl = trainerData?.profile_pic || empData?.avatar_url || null;

    return {
      success: true,
      role: effRole,
      userName: rawName || 'N/A',
      email: userEmail,
      avatarUrl,
      assignedTrainer,
      userMeta: {
        employeeId: String(trainerData?.employee_num || trainerRow?.employee_num || empData?.employee_code || 'N/A'),
        startDate: String(trainerData?.start_date || trainerRow?.start_date || empData?.hire_date || 'N/A'),
        accounts: String(trainerData?.accounts || (Array.isArray(trainerRow?.accounts) ? trainerRow.accounts.join(', ') : trainerRow?.accounts) || 'N/A'),
        primaryTask: resolvedPosition,
        firstName: fName,
        middleName: mName,
        lastName: lName,
        suffix: sName,
        mobileNo: empData?.phone || empData?.mobile || empData?.contact_number || trainerData?.phone || trainerData?.mobile || 'N/A',
        homeAddress: empData?.address || empData?.home_address || trainerData?.address || 'N/A',
        systemRole: roleFormatted
      }
    };
  } catch (error: any) {
    console.error('fetchUserProfile error:', error);
    return {
      success: false,
      role: 'GUEST',
      userName: 'N/A',
      email: userEmail,
      avatarUrl: null,
      assignedTrainer: null,
      userMeta: {
        employeeId: 'N/A',
        startDate: 'N/A',
        accounts: 'N/A',
        primaryTask: 'N/A',
        firstName: 'N/A',
        middleName: 'N/A',
        lastName: 'N/A',
        suffix: 'N/A',
        mobileNo: 'N/A',
        homeAddress: 'N/A',
        systemRole: 'N/A'
      }
    };
  }
}
