import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { resolveSystemRole } from '@/lib/auth/role-resolution';

export type SystemRole =
  | 'SUPER_ADMIN'
  | 'HOT_ADMIN'
  | 'QAS_ADMIN'
  | 'VIEW_ADMIN'
  | 'TRAINER'
  | 'TRAINEE'
  | 'UNAUTHORIZED';

export interface RequestActor {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  employeeCode?: string;
}

type AccessResult =
  | { ok: true; actor: RequestActor }
  | { ok: false; response: NextResponse };

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

/** Resolves the signed-in identity and role from trusted server-side records. */
export async function getRequestActor(): Promise<RequestActor | null> {
  const sessionClient = await createClient();
  // getClaims verifies the session JWT without an Auth user-record round trip
  // when the project uses asymmetric signing keys. Role authorization below
  // still comes from the database, never from user-editable JWT metadata.
  const { data: claimsData, error } = await sessionClient.auth.getClaims();
  const claims = claimsData?.claims;
  const subject = typeof claims?.sub === 'string' ? claims.sub : '';
  const claimEmail = typeof claims?.email === 'string' ? claims.email : '';
  if (error || !claims || !subject || !claimEmail) return null;

  const email = claimEmail.trim().toLowerCase();
  // Use the user's session when no server key is configured. This keeps the
  // role lookup subject to RLS instead of silently falling back to anon access.
  const dataClient = getAdminClient() || sessionClient;
  const employeeResult = await dataClient.from('employees')
      .select('id, employee_code, employee_name, role_id, position_id, status_id')
      .ilike('employee_email', email)
      .maybeSingle();

  if (employeeResult.error) {
    console.error('Trusted employee lookup failed:', {
      code: employeeResult.error.code,
      message: employeeResult.error.message,
    });
    throw new Error('Unable to verify the current user role.');
  }

  const employee = employeeResult.data;
  const [roleNameResult, positionResult] = employee
    ? await Promise.all([
      dataClient.from('roles').select('role_name').eq('role_id', employee.role_id).maybeSingle(),
      dataClient.from('positions').select('position_name, position_code').eq('position_id', employee.position_id).maybeSingle(),
    ])
    : [{ data: null, error: null }, { data: null, error: null }];

  if (roleNameResult.error || positionResult.error) {
    console.error('Trusted role/position lookup failed:', {
      roleLookup: roleNameResult.error ? { code: roleNameResult.error.code, message: roleNameResult.error.message } : null,
      positionLookup: positionResult.error ? { code: positionResult.error.code, message: positionResult.error.message } : null,
    });
    throw new Error('Unable to verify the current user role.');
  }

  const role = employee
    ? resolveSystemRole(
      roleNameResult.data?.role_name,
      positionResult.data?.position_name,
      positionResult.data?.position_code,
    )
    : 'UNAUTHORIZED';

  return {
    id: subject,
    email,
    name: String(
      employee?.employee_name ||
      (typeof claims.user_metadata?.name === 'string' ? claims.user_metadata.name : '') ||
      (typeof claims.user_metadata?.full_name === 'string' ? claims.user_metadata.full_name : '') ||
      email.split('@')[0],
    ),
    role,
    employeeCode: employee?.employee_code ? String(employee.employee_code) : undefined,
  };
}

export async function authorizeRequest(allowedRoles: readonly SystemRole[]): Promise<AccessResult> {
  try {
    const actor = await getRequestActor();
    if (!actor) {
      return { ok: false, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
    }
    if (!allowedRoles.includes(actor.role)) {
      return { ok: false, response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }) };
    }
    return { ok: true, actor };
  } catch (error) {
    console.error('Authorization check failed:', error);
    return { ok: false, response: NextResponse.json({ error: 'Unable to verify access.' }, { status: 503 }) };
  }
}

const ADMIN_ROLES: readonly SystemRole[] = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'];
const MANAGEMENT_READ_ROLES: readonly SystemRole[] = [...ADMIN_ROLES, 'VIEW_ADMIN'];
const AUTHENTICATED_ROLES: readonly SystemRole[] = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'TRAINER', 'TRAINEE'];

export const authorizeAdminRequest = () => authorizeRequest(ADMIN_ROLES);
export const authorizeManagementReadRequest = () => authorizeRequest(MANAGEMENT_READ_ROLES);
export const authorizeAuthenticatedRequest = () => authorizeRequest(AUTHENTICATED_ROLES);
export const authorizeTrainerOrAdminRequest = () => authorizeRequest([...ADMIN_ROLES, 'TRAINER']);
export const ADMIN_PAGE_ROLES: readonly SystemRole[] = MANAGEMENT_READ_ROLES;
export const APP_PAGE_ROLES: readonly SystemRole[] = AUTHENTICATED_ROLES;

export async function requireActionRole(allowedRoles: readonly SystemRole[]): Promise<RequestActor> {
  const actor = await getRequestActor();
  if (!actor) throw new Error('Authentication required.');
  if (!allowedRoles.includes(actor.role)) throw new Error('You do not have permission to perform this action.');
  return actor;
}

export async function requirePageRole(allowedRoles: readonly SystemRole[]): Promise<RequestActor> {
  const actor = await getRequestActor();
  if (!actor) redirect('/login');
  if (!allowedRoles.includes(actor.role)) notFound();
  return actor;
}
