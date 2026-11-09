import { isTrainerMatch } from '@/lib/analytics-utils';

export interface ScopedTrainee {
  name?: string;
  assignedTrainer?: string | null;
  [key: string]: unknown;
}

export function scopeTraineeRecords<T extends ScopedTrainee>(
  records: T[],
  isTrainer: boolean,
  isTrainee: boolean,
  userName: string,
  email: string,
): T[] {
  if (isTrainer) {
    const qTrainer = userName || '';
    const qEmail = (email || '').toLowerCase().split('@')[0];
    return records.filter(record => {
      if (!record.assignedTrainer || record.assignedTrainer === 'Unassigned') return false;
      return isTrainerMatch(record.assignedTrainer, qTrainer) ||
        isTrainerMatch(qTrainer, record.assignedTrainer) ||
        Boolean(email && qEmail.length >= 3 && record.assignedTrainer.toLowerCase() === qEmail);
    });
  }
  if (isTrainee) {
    const qName = (userName || '').toLowerCase();
    const qEmail = (email || '').toLowerCase().split('@')[0];
    return records.filter(record => {
      const traineeName = (record.name || '').toLowerCase();
      return Boolean((qName && (traineeName === qName || isTrainerMatch(traineeName, qName))) || (qEmail && traineeName.includes(qEmail)));
    });
  }
  return records;
}
