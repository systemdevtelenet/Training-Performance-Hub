import AnalyticsClient from './AnalyticsClient';
import { getDashboardData } from '@/lib/data-fetcher';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const dashboardData = await getDashboardData();
  return <AnalyticsClient initialData={dashboardData} />;
}

