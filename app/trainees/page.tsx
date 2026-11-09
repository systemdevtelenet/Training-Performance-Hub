import TraineesClient from './TraineesClient';
import { getTraineesData } from '@/lib/data-fetcher';
import { APP_PAGE_ROLES, requirePageRole } from '@/lib/auth/access';
import { scopeTraineeRecords } from '@/lib/trainee-scope';

export const dynamic = 'force-dynamic';

export default async function TraineesPage() {
  const actor = await requirePageRole(APP_PAGE_ROLES);
  const allTrainees = await getTraineesData();
  const isTrainer = actor.role === 'TRAINER';
  const isTrainee = actor.role === 'TRAINEE';
  const trainees = scopeTraineeRecords(allTrainees, isTrainer, isTrainee, actor.name, actor.email);
  return <TraineesClient initialTrainees={trainees} />;
}


