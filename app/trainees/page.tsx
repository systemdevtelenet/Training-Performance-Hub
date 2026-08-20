import TraineesClient from './TraineesClient';

export default async function TraineesPage() {
  // Simulate network delay to trigger loading skeleton
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return <TraineesClient />;
}
