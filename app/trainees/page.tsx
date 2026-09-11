import TraineesClient from './TraineesClient';
import { getTraineesData } from '@/lib/data-fetcher';

export default async function TraineesPage() {
  const trainees = await getTraineesData();
  return <TraineesClient initialTrainees={trainees} />;
}

