import { isTrainerPosition, normalizePositionCode } from '../lib/trainer-position';

interface TrainerImportRecord {
  name: string;
  employeeNo?: string;
  email?: string;
  position?: string;
  status?: string;
  startDate?: string;
  profilePic?: string;
}

/** Imports trainer spreadsheet rows into the authoritative employee records. */
export async function importTrainerEmployees(supabase: any, trainers: TrainerImportRecord[]) {
  if (trainers.length === 0) return;

  const [rolesResult, positionsResult, statusesResult] = await Promise.all([
    supabase.from('roles').select('role_id, role_name'),
    supabase.from('positions').select('position_id, position_name, position_code'),
    supabase.from('statuses').select('status_id, status_name'),
  ]);
  const sourceError = rolesResult.error || positionsResult.error || statusesResult.error;
  if (sourceError) throw sourceError;

  const roles = rolesResult.data || [];
  const positions = positionsResult.data || [];
  const statuses = statusesResult.data || [];
  const employeeRows = trainers.map((trainer) => {
    const positionCode = normalizePositionCode(trainer.position);
    const position = positions.find((row: any) =>
      normalizePositionCode(row.position_code) === positionCode || normalizePositionCode(row.position_name) === positionCode,
    );
    if (!position || !isTrainerPosition(position)) {
      throw new Error(`Trainer position "${trainer.position || 'unspecified'}" is not configured in positions.`);
    }

    const isHeadOfTraining = normalizePositionCode(position.position_code) === 'HOT';
    const role = roles.find((row: any) => {
      const name = String(row.role_name || '').trim().toUpperCase();
      return isHeadOfTraining ? ['ADMIN', 'SUPER ADMIN', 'SUPER_ADMIN'].includes(name) : name.includes('TRAINER');
    });
    if (!role) throw new Error(`No ${isHeadOfTraining ? 'Admin' : 'Trainer'} role is configured for ${trainer.name}.`);

    const requestedStatus = String(trainer.status || 'ACTIVE').trim().toUpperCase();
    const status = statuses.find((row: any) => String(row.status_name || '').trim().toUpperCase() === requestedStatus)
      || statuses.find((row: any) => String(row.status_name || '').trim().toUpperCase() === 'ACTIVE');
    if (!status) throw new Error('No matching employee status is configured.');

    return {
      employee_code: String(trainer.employeeNo || '').trim() || null,
      employee_name: trainer.name.trim(),
      employee_email: String(trainer.email || '').trim().toLowerCase() || null,
      role_id: Number(role.role_id),
      position_id: Number(position.position_id),
      status_id: Number(status.status_id),
      hire_date: trainer.startDate || null,
      avatar_url: trainer.profilePic || null,
    };
  });

  const { error } = await supabase.from('employees').upsert(employeeRows, { onConflict: 'employee_code' });
  if (error) throw error;
}
