import { getTraineesData, getTrainersData } from '@/lib/data-fetcher';
import TrainersClient from './TrainersClient';
import { APP_PAGE_ROLES, requirePageRole } from '@/lib/auth/access';
import { scopeTraineeRecords } from '@/lib/trainee-scope';
import { isTrainerMatch } from '@/lib/analytics-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TrainersPage() {
  const actor = await requirePageRole(APP_PAGE_ROLES);
  const [trainersData, traineesData] = await Promise.all([
    getTrainersData(),
    getTraineesData(),
  ]);
  const isAdmin = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(actor.role);
  const visibleTrainers = isAdmin
    ? trainersData
    : actor.role === 'TRAINER'
      ? trainersData.filter((trainer: any) =>
        String(trainer.email || '').toLowerCase() === actor.email ||
        isTrainerMatch(trainer.name, actor.name) || isTrainerMatch(actor.name, trainer.name))
      : [];
  const visibleTrainees = scopeTraineeRecords(
    traineesData,
    actor.role === 'TRAINER',
    actor.role === 'TRAINEE',
    actor.name,
    actor.email,
  );

  return <TrainersClient initialTrainers={visibleTrainers} initialTrainees={visibleTrainees} />;
}
