import TraineesClient from './TraineesClient';
import { getTraineesData } from '@/lib/data-fetcher';

export const dynamic = 'force-dynamic';

export default async function TraineesPage() {
  const trainees = await getTraineesData();
  return <TraineesClient initialTrainees={trainees} />;
}


