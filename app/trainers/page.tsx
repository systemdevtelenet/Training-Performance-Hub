import { getTraineesData, getTrainersData } from '@/lib/data-fetcher';
import TrainersClient from './TrainersClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TrainersPage() {
  const [trainersData, traineesData] = await Promise.all([
    getTrainersData(),
    getTraineesData(),
  ]);
  
  return <TrainersClient initialTrainers={trainersData} initialTrainees={traineesData} />;
}
