import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { getTrainingPositionLabel, isTrainerEmployee, isTrainerPosition, normalizePositionCode } from '@/lib/trainer-position';
import { authorizeAdminRequest, authorizeManagementReadRequest } from '@/lib/auth/access';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Fetch trainers and available accounts for form options
export async function GET() {
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
  return Response.json({ error: "Data storage is temporarily disabled while the schema is being replaced." }, { status: 503 });
}
