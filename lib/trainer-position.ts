export interface EmployeePosition {
  position_id: number;
  position_name?: string | null;
  position_code?: string | null;
}

export const TRAINER_POSITION_CODES = new Set([
  'HOT',
  'TC',
  'CORP-TR',
  'PST-BF',
  'PST-RM',
]);

export function normalizePositionCode(value?: string | null): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '-');
}

export function isTrainerPosition(position?: EmployeePosition | null): boolean {
  return TRAINER_POSITION_CODES.has(normalizePositionCode(position?.position_code));
}

export function isTrainerEmployee(position?: EmployeePosition | null, systemRole?: string | null): boolean {
  const role = String(systemRole || '').trim().toUpperCase();
  if (role.includes('QA') || role.includes('QUALITY')) return false;
  return isTrainerPosition(position);
}

export function getTrainingPositionLabel(position?: EmployeePosition | null): string {
  const code = normalizePositionCode(position?.position_code);

  if (code === 'HOT') return 'HEAD OF TRAINING';
  if (code === 'TC') return 'TRAINING COORDINATOR';
  return code || String(position?.position_name || 'TRAINER').trim().toUpperCase();
}
