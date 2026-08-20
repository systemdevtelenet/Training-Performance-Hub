import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
  // Simulate network delay to trigger loading skeleton
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return <AnalyticsClient />;
}
