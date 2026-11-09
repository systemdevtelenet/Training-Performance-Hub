import AnalyticsClient from './AnalyticsClient';
import { getDashboardData } from '@/lib/data-fetcher';
import { ADMIN_PAGE_ROLES, requirePageRole } from '@/lib/auth/access';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  await requirePageRole(ADMIN_PAGE_ROLES);
  const dashboardData = await getDashboardData();
  return <AnalyticsClient initialData={dashboardData} />;
}

