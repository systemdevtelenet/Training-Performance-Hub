import Dashboard from '@/components/Dashboard';
import { getDashboardData } from '@/lib/data-fetcher';
import { APP_PAGE_ROLES, requirePageRole } from '@/lib/auth/access';
import { scopeDashboardData } from '@/lib/dashboard-scope';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const actor = await requirePageRole(APP_PAGE_ROLES);
  // Fetch cached data from Supabase
  const dashboardData = scopeDashboardData(await getDashboardData(), actor);
  
  return <Dashboard initialData={dashboardData} />;
}
