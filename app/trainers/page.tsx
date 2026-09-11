import { getTrainersData } from '@/lib/data-fetcher';
import TrainersClient from './TrainersClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TrainersPage() {
  const trainersData = await getTrainersData();
  
  return <TrainersClient initialTrainers={trainersData} />;
}
