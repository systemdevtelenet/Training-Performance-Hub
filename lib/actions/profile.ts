'use server';

import { createClient } from '@supabase/supabase-js';
import { getRequestActor } from '@/lib/auth/access';
import { getTraineeTrainerAssignmentMap } from '@/lib/data-fetcher';

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
    position: string;
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
    const actor = await getRequestActor();
    if (!actor) throw new Error('Authentication required.');
    const requestedEmail = (userEmail || '').trim().toLowerCase();
    if (requestedEmail && requestedEmail !== actor.email) throw new Error('You can only access your own profile.');
    const cleanEmail = actor.email;

    // Employees is the authoritative identity and status source.
    const { data: empData } = await supabaseAdmin
      .from('employees')
      .select('id, employee_code, employee_name, employee_email, role_id, position_id, status_id, hire_date, avatar_url, first_name, middle_name, last_name, suffix, phone, mobile, contact_number, address, home_address')
      .ilike('employee_email', cleanEmail)
      .maybeSingle();

    const authUserMeta: Record<string, any> = { name: actor.name };

    // Determine actual full name dynamically from database or auth metadata
    let rawName: string | null = null;
    if (empData?.employee_name && empData.employee_name.trim() !== 'N/A') {
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

    // Display the exact same trusted role used by pages and server actions.
    // Keeping a second role resolver here caused EMPLOYEE/trainer accounts to
    // disagree with the server authorization policy.
    const effRole = actor.role;

    // These reads depend only on the employee row/name. Run them together so
    // optional profile data doesn't add one network round trip after another.
    const [positionResult, primaryTaskResult, traineeAssignmentResult, employeeAssignmentsResult, accountsResult] = await Promise.all([
      empData?.position_id
        ? supabaseAdmin.from('positions').select('position_name').eq('position_id', empData.position_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      empData?.id
        ? supabaseAdmin.schema('training_system').from('primary_tasks').select('task_name').eq('employee_id', empData.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      rawName
        ? getTraineeTrainerAssignmentMap().then((assignments) => ({
            data: { assignedTrainer: assignments.get(rawName.toLowerCase()) || null },
            error: null,
          }))
        : Promise.resolve({ data: null, error: null }),
      empData?.id
        ? supabaseAdmin.from('employee_assignments').select('account_id').eq('employee_id', empData.id)
        : Promise.resolve({ data: null, error: null }),
      supabaseAdmin.from('accounts').select('account_id, account_name, account_code'),
    ]);
    const positionData = positionResult.data;
    const normalizedPrimaryTask = primaryTaskResult.error ? null : primaryTaskResult.data?.task_name || null;
    const assignedTrainer = traineeAssignmentResult.data?.assignedTrainer || null;
    const accountNamesById = new Map<number, string>(
      (accountsResult.data || []).map((account: any) => [
        Number(account.account_id),
        String(account.account_name || account.account_code || ''),
      ]),
    );
    const employeeAccounts = Array.from(new Set(
      (employeeAssignmentsResult.data || [])
        .map((assignment: any) => accountNamesById.get(Number(assignment.account_id)))
        .filter((name): name is string => Boolean(name)),
    ));

    // Dynamic position title from database or role title
    const resolvedPosition = (
      (positionData?.position_name && positionData.position_name !== 'N/A') ? positionData.position_name :
      (authUserMeta?.position && authUserMeta.position !== 'N/A') ? authUserMeta.position :
      (effRole === 'HOT_ADMIN' ? 'Head of Training' :
       effRole === 'SUPER_ADMIN' ? 'Super Admin' :
       effRole === 'QAS_ADMIN' ? 'QA Supervisor' :
       effRole === 'VIEW_ADMIN' ? 'Executive Admin (View Only)' :
       effRole === 'TRAINER' ? 'Trainer' :
       effRole === 'TRAINEE' ? 'Trainee' :
       effRole === 'UNAUTHORIZED' ? 'Unauthorized Employee' : 'Employee')
    );

    const resolvedPrimaryTask = (
      normalizedPrimaryTask ||
      'N/A'
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

    const avatarUrl = empData?.avatar_url || null;

    return {
      success: true,
      role: effRole,
      userName: rawName || 'User',
      email: cleanEmail,
      avatarUrl,
      assignedTrainer,
      userMeta: {
        employeeId: String(empData?.employee_code || 'N/A'),
        startDate: String(empData?.hire_date || 'N/A'),
        accounts: employeeAccounts.join(', ') || 'N/A',
        position: resolvedPosition,
        primaryTask: resolvedPrimaryTask,
        firstName: fName || 'User',
        middleName: mName || 'N/A',
        lastName: lName || '',
        suffix: sName || 'N/A',
        mobileNo: empData?.phone || empData?.mobile || empData?.contact_number || 'N/A',
        homeAddress: empData?.address || empData?.home_address || 'N/A',
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
        position: 'N/A',
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
