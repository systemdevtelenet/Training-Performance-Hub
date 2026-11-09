import EmployeesClient from './EmployeesClient';
import { getEmployeesData } from '@/lib/data-fetcher';
import { ADMIN_PAGE_ROLES, requirePageRole } from '@/lib/auth/access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployeesPage() {
  await requirePageRole(ADMIN_PAGE_ROLES);
  const { employees, accounts, statuses, roles, positions } = await getEmployeesData();
  return (
    <EmployeesClient
      initialEmployees={employees}
      accounts={accounts}
      statuses={statuses}
      roles={roles}
      positions={positions}
    />
  );
}

