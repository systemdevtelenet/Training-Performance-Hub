import Dashboard from '@/components/Dashboard';
import { getDashboardData } from '@/lib/data-fetcher';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // Fetch cached data from Supabase
  const dashboardData = await getDashboardData();
  
  return <Dashboard initialData={dashboardData} />;
}