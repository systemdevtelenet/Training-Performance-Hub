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
    const cleanEmail = userEmail.trim().toLowerCase();

    // 1. Fetch role from user_roles
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .ilike('email', cleanEmail)
      .maybeSingle();

    // 2. Fetch trainer profile if exists (case-insensitive)
    const { data: trainerData } = await supabaseAdmin
      .from('trainers_profile')
      .select('*')
      .or(`gmail_account.ilike.${cleanEmail},thunderbird_account.ilike.${cleanEmail}`)
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
      .or(`employee_email.ilike.${cleanEmail}${empNum ? `,employee_code.eq."${empNum}"` : ''}`)
      .maybeSingle();

    // 5. Fetch auth user metadata from Supabase Auth
    let authUserMeta: any = null;
    try {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const matchedAuth = authList?.users?.find(u => u.email?.toLowerCase().trim() === cleanEmail);
      if (matchedAuth?.user_metadata) {
        authUserMeta = matchedAuth.user_metadata;
      }
    } catch (e) {
      console.warn('Could not inspect auth metadata:', e);
    }

    // Determine actual full name dynamically from database or auth metadata
    let rawName: string | null = null;
    if (trainerData?.name && trainerData.name.trim() !== 'N/A') {
      rawName = trainerData.name.trim();
    } else if (empData?.employee_name && empData.employee_name.trim() !== 'N/A') {
      rawName = empData.employee_name.trim();
    } else if (authUserMeta?.name && authUserMeta.name.trim() !== 'N/A') {
      rawName = authUserMeta.name.trim();
    } else if (authUserMeta?.full_name && authUserMeta.full_name.trim() !== 'N/A') {
      rawName = authUserMeta.full_name.trim();
    } else {
      // Generic fallback: format name from email handle without hardcoding
      const handle = cleanEmail.split('@')[0];
      rawName = handle.split(/[\._]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }

    // 5. Fetch trainees tables if user is in trainee records
    let traineeRow: any = null;
    try {
      const { data: ih } = await supabaseAdmin
        .from('inhouse')
        .select('*')
        .or(`email.ilike.${cleanEmail},name.ilike.%${cleanEmail.split('@')[0]}%`)
        .maybeSingle();
      if (ih) traineeRow = ih;
      else {
        const { data: pst } = await supabaseAdmin
          .from('product_spec_training')
          .select('*')
          .or(`email.ilike.${cleanEmail},name.ilike.%${cleanEmail.split('@')[0]}%`)
          .maybeSingle();
        if (pst) traineeRow = pst;
      }
    } catch (e) {
      // ignore
    }

    const cleanName = (trainerData?.name || empData?.employee_name || rawName || '').toLowerCase();
    const pos = (
      trainerData?.position || 
      trainerData?.assigned_task || 
      trainerRow?.pos || 
      empData?.position || 
      empData?.role_name || 
      ''
    ).toUpperCase();
    const roleId = Number(empData?.role_id || 0);

    // Determine effective role dynamically:
    let effRole = 'UNAUTHORIZED';

    // 1. Explicit role assigned by admin in user_roles
    if (roleData?.role) {
      effRole = roleData.role;
    }
    // 2. Head of Training (Ray and Nissi or HOT designation)
    else if (
      cleanEmail.includes('nreguero') || 
      cleanEmail.includes('nissi') || 
      cleanEmail.includes('ray') || 
      cleanName.includes('nissi') || 
      cleanName.includes('ray') || 
      pos.includes('HOT') || 
      pos.includes('HEAD OF TRAINING')
    ) {
      effRole = 'HOT_ADMIN';
    }
    // 3. QA Team (QA Supervisor, QA Coach, QAC, Quality Assurance, QA staff)
    else if (
      roleId === 9 || 
      pos.includes('QA') || 
      pos.includes('QAS') || 
      pos.includes('QAC') || 
      pos.includes('QUALITY') || 
      cleanEmail.includes('qac') || 
      cleanEmail.includes('qas') ||
      cleanEmail.includes('qa.') ||
      cleanEmail.includes('.qa') ||
      cleanEmail.includes('qa_') ||
      cleanEmail.startsWith('qa') ||
      cleanName.includes('qac') ||
      cleanName.includes('qas') ||
      cleanName.includes('qa ') ||
      cleanName.startsWith('qa') ||
      cleanName.includes('quality assurance')
    ) {
      effRole = 'QAS_ADMIN';
    }
    // 4. Admins
    else if (roleId === 5 || pos.includes('ADMIN') || pos.includes('SUPER ADMIN') || authUserMeta?.role === 'SUPER_ADMIN') {
      effRole = 'SUPER_ADMIN';
    }
    // 5. Trainers (in trainers_profile, trainers table, or position as trainer)
    else if (
      trainerData || 
      trainerRow || 
      pos.includes('TRAINER') || 
      pos.includes('TRAINING SPECIALIST') || 
      pos.includes('INSTRUCTOR') ||
      empData?.category === 'TRAINERS' ||
      empData?.is_primary_trainer
    ) {
      effRole = 'TRAINER';
    }
    // 6. Trainees
    else if (traineeRow || pos.includes('TRAINEE')) {
      effRole = 'TRAINEE';
    }
    // 7. Regular employees without authorized roles
    else {
      effRole = 'UNAUTHORIZED';
    }

    // Dynamic position title from database or role title
    const resolvedPosition = (
      (trainerData?.position && trainerData.position !== 'N/A') ? trainerData.position :
      (trainerData?.assigned_task && trainerData.assigned_task !== 'N/A') ? trainerData.assigned_task :
      (trainerRow?.pos && trainerRow.pos !== 'N/A') ? trainerRow.pos :
      (empData?.position && empData.position !== 'N/A') ? empData.position :
      (authUserMeta?.position && authUserMeta.position !== 'N/A') ? authUserMeta.position :
      (effRole === 'HOT_ADMIN' ? 'Head of Training' :
       effRole === 'SUPER_ADMIN' ? 'Super Admin' :
       effRole === 'QAS_ADMIN' ? 'QA Supervisor' :
       effRole === 'VIEW_ADMIN' ? 'Executive Admin (View Only)' :
       effRole === 'TRAINER' ? 'Trainer' :
       effRole === 'TRAINEE' ? 'Trainee' :
       effRole === 'UNAUTHORIZED' ? 'Unauthorized Employee' : 'Employee')
    );

    // Parse Name Parts
    let fName = empData?.first_name || 'N/A';
    let mName = empData?.middle_name || 'N/A';
    let lName = empData?.last_name || 'N/A';
    let sName = empData?.suffix || 'N/A';

    if ((fName === 'N/A' || !fName) && rawName) {
      const parts = rawName.trim().split(/\s+/);
      if (parts.length === 1) {
        fName = parts[0];
      } else if (parts.length > 1) {
        fName = parts.slice(0, -1).join(' ');
        lName = parts[parts.length - 1];
      }
    }

    const roleFormatted = (
      effRole === 'HOT_ADMIN' ? 'Head of Training' :
      effRole === 'SUPER_ADMIN' ? 'Super Admin' :
      effRole === 'QAS_ADMIN' ? 'QA Supervisor' :
      effRole === 'VIEW_ADMIN' ? 'Executive Admin' :
      effRole === 'TRAINER' ? 'Trainer' :
      effRole === 'TRAINEE' ? 'Trainee' :
      effRole === 'UNAUTHORIZED' ? 'Unauthorized' : 'Employee'
    );

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
      userName: rawName || 'User',
      email: cleanEmail,
      avatarUrl,
      assignedTrainer,
      userMeta: {
        employeeId: String(trainerData?.employee_num || trainerRow?.employee_num || empData?.employee_code || (cleanEmail.includes('ralasagas') ? '1008' : 'N/A')),
        startDate: String(trainerData?.start_date || trainerRow?.start_date || empData?.hire_date || 'N/A'),
        accounts: String(trainerData?.accounts || (Array.isArray(trainerRow?.accounts) ? trainerRow.accounts.join(', ') : trainerRow?.accounts) || 'Quality Assurance'),
        primaryTask: resolvedPosition,
        firstName: fName || 'User',
        middleName: mName || 'N/A',
        lastName: lName || '',
        suffix: sName || 'N/A',
        mobileNo: empData?.phone || empData?.mobile || empData?.contact_number || trainerData?.phone || trainerData?.mobile || 'N/A',
        homeAddress: empData?.address || empData?.home_address || trainerData?.address || 'N/A',
        systemRole: roleFormatted
      }
    };
  } catch (error: any) {
    console.error('fetchUserProfile error:', error);
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const handle = cleanEmail ? cleanEmail.split('@')[0] : 'User';
    const fallbackName = handle.split(/[\._]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    return {
      success: false,
      role: 'GUEST',
      userName: fallbackName || 'User',
      email: cleanEmail,
      avatarUrl: null,
      assignedTrainer: null,
      userMeta: {
        employeeId: 'N/A',
        startDate: 'N/A',
        accounts: 'N/A',
        primaryTask: 'Operations User',
        firstName: fallbackName,
        middleName: 'N/A',
        lastName: '',
        suffix: 'N/A',
        mobileNo: 'N/A',
        homeAddress: 'N/A',
        systemRole: 'Operations User'
      }
    };
  }
}
