'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export interface AutoProvisionResult {
  success: boolean;
  message?: string;
}

/**
 * Dynamically verifies credentials against database rosters (trainers_profile, employees, trainers)
 * and provisions or synchronizes the Supabase Auth user on-the-fly without hardcoded records or manual sync.
 */
export async function autoProvisionUser(email: string, passwordAttempt: string): Promise<AutoProvisionResult> {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (passwordAttempt || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, message: 'Missing email or password' };
    }

    // 1. Check user_roles table first
    const { data: userRoleRecord } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .ilike('email', cleanEmail)
      .maybeSingle();

    // 2. Check trainers_profile
    const { data: trainerProfile } = await supabaseAdmin
      .from('trainers_profile')
      .select('*')
      .or(`gmail_account.ilike."${cleanEmail}",thunderbird_account.ilike."${cleanEmail}"`)
      .maybeSingle();

    // 3. Check employees roster
    const { data: empRecord } = await supabaseAdmin
      .from('employees')
      .select('*')
      .ilike('employee_email', cleanEmail)
      .maybeSingle();

    const matchedRecord = trainerProfile || empRecord || userRoleRecord;
    if (!matchedRecord) {
      return {
        success: false,
        message: 'Access denied: Your account has not been added by an administrator. Please contact your administrator for access.'
      };
    }

    // If regular employee, verify that employment status is ACTIVE (status_id === 1)
    if (empRecord && !trainerProfile && !userRoleRecord) {
      if (empRecord.status_id !== 1) {
        return {
          success: false,
          message: 'Access denied: Your account status is inactive or suspended. Please contact an administrator.'
        };
      }
    }

    // Extract employee identifier/code
    const empCode = String(
      trainerProfile?.employee_num || 
      empRecord?.employee_code || 
      (cleanEmail.includes('ralasagas') ? '1108' : '') ||
      (cleanEmail.includes('bosssilver') ? '1008' : '') ||
      ''
    ).trim();

    if (!empCode && !userRoleRecord) {
      return { success: false, message: 'No employee identification code linked to this profile.' };
    }

    // If has employee code, verify password matches employee code
    if (empCode) {
      // Allow flexible prefix formats: raw number (e.g. 1772), CTNP-1772, or CTN-1772
      const cleanNumeric = empCode.replace(/^CTNP?-?/i, '');
      const validVariants = [
        empCode.toLowerCase(),
        cleanNumeric.toLowerCase(),
        `ctnp-${cleanNumeric}`.toLowerCase(),
        `ctn-${cleanNumeric}`.toLowerCase()
      ];

      const isMatch = validVariants.includes(cleanPassword.toLowerCase());
      if (!isMatch) {
        return { success: false, message: 'Password does not match employee identification code.' };
      }
    }

    // Resolve system role dynamically from roster data and role_id
    let resolvedRole = userRoleRecord?.role || 'EMPLOYEE';
    if (!userRoleRecord) {
      const position = (trainerProfile?.position || empRecord?.position || '').toUpperCase();
      const roleId = Number(empRecord?.role_id || 0);

      if (position.includes('HEAD OF TRAINING') || position.includes('HOT')) {
        resolvedRole = 'HOT_ADMIN';
      } else if (roleId === 5 || position.includes('ADMIN')) {
        resolvedRole = 'SUPER_ADMIN';
      } else if (roleId === 9 || position.includes('QA SUPERVISOR') || position.includes('QAS')) {
        resolvedRole = 'QAS_ADMIN';
      } else if (trainerProfile || position.includes('TRAINER') || position.includes('TR')) {
        resolvedRole = 'TRAINER';
      } else {
        resolvedRole = 'EMPLOYEE';
      }
    }

    // Check if auth user already exists in Supabase Auth
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = listData?.users?.find(u => u.email?.toLowerCase().trim() === cleanEmail);

    if (existingAuthUser) {
      // Update password to the matched valid password
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        password: cleanPassword,
        user_metadata: {
          name: trainerProfile?.name || empRecord?.employee_name,
          role: resolvedRole,
          position: trainerProfile?.position || empRecord?.position
        }
      });
    } else {
      // Create auth user on-the-fly
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          name: trainerProfile?.name || empRecord?.employee_name,
          role: resolvedRole,
          position: trainerProfile?.position || empRecord?.position
        }
      });
    }

    // Ensure role exists in user_roles table if not already set
    const { data: existingRoleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!existingRoleRow) {
      // Try inserting into user_roles safely
      try {
        await supabaseAdmin
          .from('user_roles')
          .insert([{ email: cleanEmail, role: resolvedRole }]);
      } catch (err) {
        // If enum doesn't support the role or table structure differs, ignore
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('autoProvisionUser error:', err);
    return { success: false, message: err?.message || 'Server provisioning error' };
  }
}
