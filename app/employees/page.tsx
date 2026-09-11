import EmployeesClient from './EmployeesClient';
import { getEmployeesData } from '@/lib/data-fetcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployeesPage() {
  const { employees, accounts, statuses, roles } = await getEmployeesData();
  return (
    <EmployeesClient
      initialEmployees={employees}
      accounts={accounts}
      statuses={statuses}
      roles={roles}
    />
  );
}

