import Dashboard from '@/components/Dashboard';

export default async function Page() {
  // Simulate network delay to trigger loading skeleton
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return <Dashboard />;
}