export type ResolvedSystemRole = 'SUPER_ADMIN' | 'HOT_ADMIN' | 'QAS_ADMIN' | 'TRAINER' | 'UNAUTHORIZED';

/** Keeps the application shell's access gate aligned with server role resolution. */
export function canAccessTrainingHub(role: unknown): boolean {
  return ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'TRAINER'].includes(
    String(role || '').trim().toUpperCase(),
  );
}

/** Maps the employee's database role and position to the app's allowlisted roles. */
export function resolveSystemRole(roleName: unknown, positionName: unknown, positionCode: unknown): ResolvedSystemRole {
  const role = String(roleName || '').trim().toUpperCase();
  const position = String(positionName || '').trim().toUpperCase();
  const code = String(positionCode || '').trim().toUpperCase();

  if (code === 'HOT' || position.includes('HEAD OF TRAINING')) return 'HOT_ADMIN';
  if (code === 'QAS' || position.includes('QA SUPERVISOR')) return 'QAS_ADMIN';
  if (role === 'ADMIN' || role === 'SUPER ADMIN' || role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (
    role.includes('TRAINER') ||
    position.includes('TRAINER') ||
    position.includes('INSTRUCTOR') ||
    code === 'CORP-TR'
  ) return 'TRAINER';

  return 'UNAUTHORIZED';
}
