import { isTrainerMatch } from '@/lib/analytics-utils';
import type { RequestActor } from '@/lib/auth/access';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN']);

function matchesEmployeeName(name: unknown, actor: RequestActor) {
  const recordName = String(name || '').toLowerCase().trim();
  const actorName = actor.name.toLowerCase().trim();
  const email = actor.email.toLowerCase().trim();
  const handle = email.split('@')[0].replace(/[._-]/g, ' ');
  return Boolean(recordName && (
    (actorName && (recordName === actorName || recordName.includes(actorName) || actorName.includes(recordName))) ||
    (email && email.includes(recordName.replace(/\s+/g, ''))) ||
    (handle && recordName.includes(handle))
  ));
}

function scopeGroups(groups: Record<string, any>, predicate: (member: any) => boolean) {
  return Object.fromEntries(Object.entries(groups || {}).flatMap(([account, batches]) => {
    const scopedBatches = Object.fromEntries(Object.entries(batches as Record<string, any>).flatMap(([batch, group]) => {
      const members = (group?.members || []).filter(predicate);
      return members.length ? [[batch, { ...group, members }]] : [];
    }));
    return Object.keys(scopedBatches).length ? [[account, scopedBatches]] : [];
  }));
}

/** Removes other employees' and cohorts' data before dashboard props reach the browser. */
export function scopeDashboardData<T extends Record<string, any>>(data: T, actor: RequestActor): T {
  if (ADMIN_ROLES.has(actor.role)) return data;

  const scoped = JSON.parse(JSON.stringify(data)) as Record<string, any>;
  const emailHandle = actor.email.split('@')[0].toLowerCase();
  const memberPredicate = actor.role === 'TRAINER'
    ? (member: any) => {
      const assigned = String(member.assignedTrainer || '').toLowerCase();
      return Boolean(assigned && (
        isTrainerMatch(assigned, actor.name) || isTrainerMatch(actor.name, assigned) ||
        assigned.includes(actor.email.toLowerCase()) || assigned.includes(emailHandle)
      ));
    }
    : (member: any) => matchesEmployeeName(member.name, actor);

  for (const type of ['inhouse', 'pst']) {
    const current = scoped[type];
    if (current?.groups) current.groups = scopeGroups(current.groups, memberPredicate);
  }

  if (actor.role === 'TRAINER') {
    for (const type of ['trainerAttendance', 'trainerReliability']) {
      const current = scoped[type];
      if (current?.groups) {
        current.groups = Object.fromEntries(Object.entries(current.groups).filter(([name]) =>
          isTrainerMatch(name, actor.name) || isTrainerMatch(actor.name, name)));
      }
    }
  } else {
    scoped.trainerAttendance = { groups: {} };
    scoped.trainerReliability = { groups: {} };
  }

  scoped.allTrainers = actor.role === 'TRAINER' ? [actor.name] : [];
  scoped.allAccounts = Array.from(new Set(
    ['inhouse', 'pst'].flatMap(type => Object.keys(scoped[type]?.groups || {})),
  ));
  scoped.summary = {};
  scoped.metrics = undefined;
  return scoped as T;
}
