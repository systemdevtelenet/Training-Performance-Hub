'use server';

import { getSupabaseServerConfig } from '@/lib/supabase/server-env';

import { createClient } from '@supabase/supabase-js';
import { logActivity } from './logger';
import { isTrainerMatch } from '@/lib/analytics-utils';
import { APP_PAGE_ROLES, requireActionRole } from '@/lib/auth/access';
import { getTrainingTraineeRecords } from '@/lib/training-data';

const TRAFFIC_LIGHT_ROLES = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'TRAINER'] as const;
const TRAFFIC_LIGHT_EDIT_ROLES = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'TRAINER'] as const;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (e) {}
}

const { url: supabaseUrl, key: supabaseKey } = getSupabaseServerConfig();

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});

export async function getTrainerTraineeNames(trainerEmail?: string, trainerName?: string) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_ROLES);
  try {
    // A trainer may only query their own roster; client supplied identifiers
    // are retained for admin views that intentionally inspect another trainer.
    if (actor.role === 'TRAINER') {
      trainerEmail = actor.email;
      trainerName = actor.name;
    }
    const normalizeStr = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const cleanEmail = (trainerEmail || '').toLowerCase().trim();
    const cleanName = (trainerName || '').toLowerCase().trim();
    const normName = normalizeStr(trainerName);

    const roster = await getTrainingTraineeRecords(supabaseAdmin);
    const { getTraineeTrainerAssignmentMap } = await import('@/lib/data-fetcher');
    const assignmentMap = await getTraineeTrainerAssignmentMap();

    const matchedNames = new Set<string>();
    const matchedAccounts = new Set<string>();

    const allTrainees = roster;
    allTrainees.forEach(t => {
      const cleanTName = t.name.trim().toLowerCase();
      const normTName = normalizeStr(t.name);
      const assigned = (assignmentMap.get(cleanTName) || t.assignedTrainer || '').trim();
      const normAssigned = normalizeStr(assigned);
      const rawAcc = (t.accountName || 'General').toString().trim().toLowerCase();

      const isMatch = (cleanName && isTrainerMatch(assigned, cleanName)) || 
                      (cleanName && isTrainerMatch(cleanName, assigned)) ||
                      (cleanEmail && cleanEmail.includes('@') && assigned.toLowerCase() === cleanEmail.split('@')[0]);
      if (isMatch) {
        if (cleanTName) matchedNames.add(cleanTName);
        if (normTName) matchedNames.add(normTName);
        if (rawAcc && rawAcc !== 'trainers' && rawAcc !== 'leaders') {
          matchedAccounts.add(rawAcc);
        }
      }
    });

    // Include normalized employee account assignments for this trainer.
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, employee_name, employee_email');
    const trainerEmployee = (employees || []).find((employee: any) => {
      const employeeName = String(employee.employee_name || '').trim();
      const employeeEmail = String(employee.employee_email || '').trim().toLowerCase();
      return (cleanEmail && employeeEmail === cleanEmail) ||
        (cleanName && isTrainerMatch(employeeName, cleanName)) ||
        (normName && normalizeStr(employeeName) === normName);
    });
    if (trainerEmployee?.id) {
      const { data: assignments } = await supabaseAdmin
        .from('employee_assignments')
        .select('account_id')
        .eq('employee_id', trainerEmployee.id);
      const accountIds = (assignments || []).map((assignment: any) => Number(assignment.account_id)).filter(Boolean);
      if (accountIds.length > 0) {
        const { data: accounts } = await supabaseAdmin
          .from('accounts')
          .select('account_id, account_name, account_code')
          .in('account_id', accountIds);
        (accounts || []).forEach((account: any) => {
          const accountName = String(account.account_name || account.account_code || '').trim().toLowerCase();
          if (accountName) matchedAccounts.add(accountName);
        });
      }
    }

    return {
      names: Array.from(matchedNames),
      accounts: Array.from(matchedAccounts)
    };
  } catch (e) {
    console.error('Error in getTrainerTraineeNames:', e);
    return { names: [], accounts: [] };
  }
}

export async function getTrainerDashboardReliability() {
  const actor = await requireActionRole(TRAFFIC_LIGHT_ROLES);
  if (actor.role !== 'TRAINER') return null;

  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('id')
    .ilike('employee_email', actor.email)
    .maybeSingle();
  if (!employee?.id) return null;

  const { data, error } = await supabaseAdmin
    .schema('trainingHub_system').from('trainer_attendance_api')
    .select('status, attendance_code')
    .eq('trainer_employee_id', employee.id);
  if (error) throw error;

  let present = 0;
  let absent = 0;
  (data || []).forEach((row: any) => {
    const status = String(row.attendance_code || row.status || '').toUpperCase().trim();
    if (['A', 'ABSENT', 'SL', 'VL', 'SUSPENDED'].includes(status)) absent++;
    else present++;
  });
  const total = present + absent;
  const rate = total ? (present / total) * 100 : 100;
  return {
    rate,
    present,
    absent,
    status: rate >= 95 ? 'Excellent' : rate >= 90 ? 'Good' : rate >= 80 ? 'Needs Attention' : 'Critical',
  };
}

export async function getTrainerDashboardTrafficLights() {
  const actor = await requireActionRole(TRAFFIC_LIGHT_ROLES);
  if (actor.role !== 'TRAINER') return {};

  const scope = await getTrainerTraineeNames(actor.email, actor.name);
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const allowedNames = new Set(scope.names.map(normalize));
  allowedNames.add(normalize(actor.name));

  const { data: employee } = await supabaseAdmin.from('employees').select('id').ilike('employee_email', actor.email).maybeSingle();
  if (!employee) return {};
  const { data: rows, error } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring')
    .select('id, status, week_date').eq('trainer_employee_id', employee.id).order('week_date', { ascending: false });
  if (error) throw error;
  const result: Record<string, { status: string; remarks: string; date: string }> = {};
  const { data: remarks } = (rows || []).length
    ? await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks').select('monitoring_id, remark').in('monitoring_id', (rows || []).map((row: any) => row.id))
    : { data: [] };
  for (const row of rows || []) {
    const staffName = actor.name;
    if (!allowedNames.has(normalize(staffName)) || result[staffName.toLowerCase()]) continue;
    result[staffName.toLowerCase()] = { status: row.status, remarks: (remarks || []).filter((item: any) => item.monitoring_id === row.id).map((item: any) => item.remark).join('\n'), date: row.week_date };
  }
  return result;
}

export async function getEmployeeTrafficLightHistory() {
  const actor = await requireActionRole(APP_PAGE_ROLES);
  const { data: employee, error: employeeError } = await supabaseAdmin.from('employees').select('id').ilike('employee_email', actor.email).maybeSingle();
  if (employeeError) throw employeeError;
  if (!employee) return { currentStatus: 'Okay', latestDate: 'Current Period', remarks: '', history: [] };
  const { data: rows, error } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring')
    .select('id, week_date, status').eq('trainer_employee_id', employee.id).order('week_date', { ascending: false });
  if (error) throw error;
  const { data: remarks, error: remarksError } = (rows || []).length
    ? await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks').select('monitoring_id, remark').in('monitoring_id', (rows || []).map((row: any) => row.id))
    : { data: [], error: null };
  if (remarksError) throw remarksError;
  const history = (rows || []).map((row: any) => ({
    period: row.week_date,
    status: row.status,
    trainer: actor.name,
    remarks: (remarks || []).filter((remark: any) => Number(remark.monitoring_id) === Number(row.id)).map((remark: any) => remark.remark).join('\n') || 'Traffic light status recorded.',
  }));

  return {
    currentStatus: history[0]?.status || 'Okay',
    latestDate: history[0]?.period || 'Current Period',
    remarks: history[0]?.remarks || '',
    history,
  };
}

export async function getAvailableTrafficLightAccounts() {
  const actor = await requireActionRole(TRAFFIC_LIGHT_ROLES);
  try {
    const { data: accounts, error } = await supabaseAdmin.from('accounts').select('account_code, account_name').eq('is_active', true).order('account_name');
    if (error) throw error;
    const accountMap = new Map<string, string>();
    (accounts || []).forEach((account: any) => {
      const name = String(account.account_name || account.account_code || '').trim();
      const id = String(account.account_code || name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (id && name) accountMap.set(id, name);
    });
    const labelFormatting: Record<string, string> = { trainers: 'Trainers', general: 'General' };
    const preferredOrder = ['trainers', 'general', 'rm', 'xpn', 'fleet', 'leaders', 'dft', 'js', 'ono', 'awd', 'flexar', 'hh', 'mm_transpo', 'other_acc'];
    const resultList: { id: string; name: string }[] = [{ id: 'trainers', name: 'Trainers' }];
    if (!accountMap.has('general')) resultList.push({ id: 'general', name: 'General' });
    accountMap.forEach((name, id) => {
      if (id !== 'trainers') resultList.push({ id, name: labelFormatting[id] || name });
    });
    resultList.sort((a, b) => (preferredOrder.indexOf(a.id) < 0 ? 99 : preferredOrder.indexOf(a.id)) - (preferredOrder.indexOf(b.id) < 0 ? 99 : preferredOrder.indexOf(b.id)) || a.name.localeCompare(b.name));
    if (actor.role !== 'TRAINER') return resultList;
    const scope = await getTrainerTraineeNames(actor.email, actor.name);
    return resultList.filter(item => trainerCanAccessAccount(item.id, scope.accounts));
  } catch (e) {
    console.error('Error fetching traffic light accounts:', e);
    return [];
  }
}

function matchesTrafficLightAccount(accId: string, traineeAcc: string): boolean {
  if (!accId) return false;
  const cleanId = accId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTrainee = (traineeAcc || 'general').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (cleanId === cleanTrainee) return true;
  if (cleanTrainee.includes(cleanId) || cleanId.includes(cleanTrainee)) return true;
  
  // Specific alias mappings:
  if (cleanId === 'general' && (cleanTrainee.includes('general') || cleanTrainee === '' || cleanTrainee.includes('bilingual'))) return true;
  if ((cleanId === 'dft' || cleanId === 'deferit') && (cleanTrainee.includes('deferit') || cleanTrainee.includes('dft'))) return true;
  if (cleanId === 'flexar' && cleanTrainee.includes('flexar')) return true;
  if (cleanId === 'xpn' && cleanTrainee.includes('xpn')) return true;
  if (cleanId === 'fleet' && cleanTrainee.includes('fleet')) return true;
  if ((cleanId === 'mmtranspo' || cleanId === 'mm') && (cleanTrainee.includes('mmtranspo') || cleanTrainee === 'mm')) return true;
  if ((cleanId === 'hh' || cleanId === 'hammerhead') && (cleanTrainee.includes('hh') || cleanTrainee.includes('hammerhead'))) return true;
  if (cleanId === 'js' && cleanTrainee.includes('js')) return true;
  if (cleanId === 'ono' && cleanTrainee.includes('ono')) return true;
  if (cleanId === 'awd' && cleanTrainee.includes('awd')) return true;
  if (cleanId === 'rm' && cleanTrainee.includes('rm')) return true;
  if ((cleanId === 'otheracc' || cleanId === 'other') && (cleanTrainee.includes('general') || ['spa', 'cova', 'soas', 'corpqa', 'cts', 'bilingualcsr', 'bilingual'].some(s => cleanTrainee.includes(s)))) return true;

  return false;
}

function normalizeScopeValue(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function trainerCanAccessAccount(account: string, assignedAccounts: string[]) {
  const target = normalizeScopeValue(account);
  if (target === 'trainers') return true;
  return assignedAccounts.some(assigned =>
    matchesTrafficLightAccount(account, assigned) || matchesTrafficLightAccount(assigned, account) ||
    normalizeScopeValue(assigned) === target
  );
}

function trainerCanAccessStaff(staffName: string, actorName: string, traineeNames: string[]) {
  const target = normalizeScopeValue(staffName);
  return isTrainerMatch(staffName, actorName) ||
    traineeNames.some(name => normalizeScopeValue(name) === target);
}

function scopeTrafficLightRows(rows: any[], actorName: string, traineeNames: string[], account: string) {
  const visibleRows = rows.filter(row => {
    if (row.isAccountHeader || row.isTeamHeader) return false;
    if (normalizeScopeValue(account) === 'trainers') return isTrainerMatch(row.teams || row.name, actorName);
    return trainerCanAccessStaff(String(row.teams || row.name || ''), actorName, traineeNames) ||
      isTrainerMatch(String(row.assigned_trainer || ''), actorName);
  });
  if (!visibleRows.length) return [];
  return rows.filter(row => row.isAccountHeader || row.isTeamHeader || visibleRows.includes(row));
}

function scopeTrafficLightRemarks(
  remarks: Record<string, TrafficLightRemarkItem[]>,
  actorName: string,
  traineeNames: string[],
  account: string,
) {
  return Object.fromEntries(Object.entries(remarks).flatMap(([key, items]) => {
    const staffName = items[0]?.staffName || key.split('::')[0];
    const isVisible = normalizeScopeValue(account) === 'trainers'
      ? isTrainerMatch(staffName, actorName)
      : trainerCanAccessStaff(staffName, actorName, traineeNames);
    return isVisible ? [[key, items]] : [];
  }));
}

function getQuarterDateColumns(quarter: string) {
  const q = (quarter || 'q2').toLowerCase();
  if (q === 'q1') return ['1/2/2026', '1/9/2026', '1/16/2026', '1/23/2026', '1/30/2026', '2/6/2026', '2/13/2026', '2/20/2026', '2/27/2026', '3/6/2026', '3/13/2026', '3/20/2026', '3/27/2026'];
  if (q === 'q3') return ['7/3/2026', '7/10/2026', '7/17/2026', '7/24/2026', '7/31/2026', '8/7/2026', '8/14/2026', '8/21/2026', '8/28/2026', '9/4/2026', '9/11/2026', '9/18/2026', '9/25/2026'];
  if (q === 'q4') return ['10/2/2026', '10/9/2026', '10/16/2026', '10/23/2026', '10/30/2026', '11/6/2026', '11/13/2026', '11/20/2026', '11/27/2026', '12/4/2026', '12/11/2026', '12/18/2026', '12/25/2026'];
  return ['4/3/2026', '4/10/2026', '4/17/2026', '4/24/2026', '5/1/2026', '5/8/2026', '5/15/2026', '5/22/2026', '5/29/2026', '6/5/2026', '6/12/2026', '6/19/2026', '6/26/2026'];
}

function standardizeTrafficLightRow(row: any, fallbackAccount?: string) {
  if (!row) return row;
  const keys = Object.keys(row);
  const candidateKeys = ['teams', 'name', 'trainers', 'trainer', 'employee', 'staff', 'rm-teamleads', 'js', 'ono', 'flexar', 'dft', 'awd', 'hh', 'fleet', 'rm', 'xpn'];
  const metaKeys = ['id', 'created_at', 'account', 'position', '_account', 'isaccountheader', 'isAccountHeader', 'remarks', 'status', 'total', 'average'];
  
  let nameCol = keys.find(k => candidateKeys.includes(k.toLowerCase()));
  if (!nameCol) {
    nameCol = keys.find(k => !metaKeys.includes(k.toLowerCase()) && isNaN(new Date(k).getTime()) && !/^\d{1,2}\/\d{1,2}/.test(k));
  }
  if (!nameCol) nameCol = keys[0];

  const primaryName = row[nameCol] ?? row.teams ?? row.name ?? '';
  return {
    ...row,
    teams: primaryName,
    _nameCol: nameCol,
    _account: row._account || fallbackAccount
  };
}

export async function getTrafficLightData(account: string, quarter: string, accountList?: string[]) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_ROLES);
  try {
    const trainerScope = actor.role === 'TRAINER'
      ? await getTrainerTraineeNames(actor.email, actor.name)
      : null;
    if (account === 'all') {
      const requestedAccounts = accountList && accountList.length > 0
        ? accountList.filter(a => a !== 'all')
        : ['trainers', 'general', 'rm', 'xpn', 'fleet', 'leaders', 'dft', 'js', 'ono', 'awd', 'flexar', 'hh', 'mm_transpo', 'other_acc'];
      const targetAccounts = trainerScope
        ? requestedAccounts.filter(acc => trainerCanAccessAccount(acc, trainerScope.accounts))
        : requestedAccounts;

      const combined: any[] = [];
      const labelFormatting: Record<string, string> = {
        'general': 'General',
        'rm': 'RM',
        'xpn': 'XPN',
        'fleet': 'Fleet',
        'leaders': 'Leaders',
        'trainers': 'Trainers',
        'dft': 'DFT',
        'js': 'JS',
        'ono': 'ONO',
        'awd': 'AWD',
        'flexar': 'FLEXAR',
        'hh': 'HH',
        'mm_transpo': 'MM Transpo',
        'other_acc': 'Other Acc'
      };

      for (const acc of targetAccounts) {
        const res = await getSingleTrafficLightData(acc, quarter);
        const rows = trainerScope
          ? scopeTrafficLightRows(res.data || [], actor.name, trainerScope.names, acc)
          : (res.data || []);
        if (rows.length > 0) {
          const accLabel = labelFormatting[acc.toLowerCase()] || acc.toUpperCase().replace(/_/g, ' ');

          combined.push({
            id: `acc_header_${acc}`,
            teams: `ACCOUNT: ${accLabel}`,
            isAccountHeader: true,
            _account: acc
          });

          rows.forEach((r: any) => {
            combined.push(standardizeTrafficLightRow(r, acc));
          });
        }
      }
      return { data: combined, error: null };
    }

    if (trainerScope && !trainerCanAccessAccount(account, trainerScope.accounts)) {
      return { data: [], error: null };
    }
    const res = await getSingleTrafficLightData(account, quarter);
    const rows = trainerScope
      ? scopeTrafficLightRows(res.data || [], actor.name, trainerScope.names, account)
      : (res.data || []);
    const standardized = rows.map((r: any) => standardizeTrafficLightRow(r, account));
    return { data: standardized, error: res.error };
  } catch (e: any) {
    console.error('Error fetching traffic light data:', e);
    return { data: [], error: e.message || 'Server error' };
  }
}

async function getSingleTrafficLightData(account: string, quarter: string) {
  try {
    const dates = getQuarterDateColumns(quarter);
    const result: any[] = [];

    // 1. For 'trainers' account: retrieve employee-backed trainer records.
    if (account === 'trainers') {
      const { getTrainersData } = await import('@/lib/data-fetcher');
      const trainers = await getTrainersData();
      const employeeIds = trainers.map((trainer: any) => Number(trainer.employeeId)).filter((id: number) => Number.isInteger(id) && id > 0);
      const { data: monitors, error: monitoringError } = employeeIds.length
        ? await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring')
          .select('id, trainer_employee_id, week_date, status').in('trainer_employee_id', employeeIds)
        : { data: [], error: null };
      if (monitoringError) throw monitoringError;
      const monitorByEmployeeAndDate = new Map((monitors || []).map((row: any) => [`${row.trainer_employee_id}::${row.week_date}`, row]));
      trainers.forEach((tr: any) => {
        const row: any = {
          id: tr.name,
          teams: tr.name,
          _account: 'trainers',
          assigned_trainer: tr.name,
          position: tr.role || 'Trainer',
          startDate: tr.startDate || '-',
          accounts: tr.accounts || ''
        };
        dates.forEach(d => {
          const monitor: any = monitorByEmployeeAndDate.get(`${tr.employeeId}::${parseDateToISO(d)}`);
          const statusMap: Record<string, string> = { OKAY: 'Okay', SHAKY: 'Shaky', TERMINATED: 'Red', RESIGNED: 'Red', ACCOUNT_REMOVED: 'Red', NONE: null as any };
          row[d] = monitor ? statusMap[String(monitor.status || '').toUpperCase()] ?? monitor.status : null;
        });
        ['30 days', '60 days', '90 days'].forEach(d => { row[d] = null; });
        result.push(row);
      });
    } else {
      const allTrainees = await getTrainingTraineeRecords(supabaseAdmin);
      const matched = allTrainees.filter((trainee) => matchesTrafficLightAccount(account, trainee.accountName));
      const enrollmentIds = matched.map((trainee) => trainee.enrollmentId);
      const { data: assessments, error: assessmentsError } = enrollmentIds.length
        ? await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api')
          .select('assessment_id, enrollment_id, assessment_type, assessed_on, rating, remarks').in('enrollment_id', enrollmentIds)
        : { data: [], error: null };
      if (assessmentsError) throw assessmentsError;

      if (matched.length > 0) {
        // Group by wave / batch
        const groups: Record<string, any[]> = {};
        matched.forEach(t => {
          const rawBatch = t.batchName || 'Batch 1';
          const gKey = `TEAM ${rawBatch.toUpperCase()}`;
          if (!groups[gKey]) groups[gKey] = [];
          groups[gKey].push(t);
        });

        Object.entries(groups).forEach(([gName, list]) => {
          result.push({
            id: `team_hdr_${account}_${gName}`,
            teams: gName,
            isTeamHeader: true,
            _account: account
          });
          list.forEach(t => {
            const rawAccount = t.accountName || 'General';
            const assignedTrainer = t.assignedTrainer || '';

            const row: any = {
              id: t.enrollmentId,
              teams: t.name,
              _account: account,
              assigned_trainer: assignedTrainer,
              accountName: rawAccount,
              position: t.position || 'Trainee',
              startDate: t.start_date || '-'
            };
            dates.forEach(d => { row[d] = null; });
            ['30 days', '60 days', '90 days'].forEach(d => { row[d] = null; });
            (assessments || []).filter((assessment: any) => Number(assessment.enrollment_id) === t.enrollmentId).forEach((assessment: any) => {
              const assessmentType = String(assessment.assessment_type || '').toUpperCase();
              const key = assessmentType === 'MILESTONE_30' ? '30 days' : assessmentType === 'MILESTONE_60' ? '60 days' : assessmentType === 'MILESTONE_90' ? '90 days' : new Date(`${assessment.assessed_on}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC' });
              if (row[key] !== undefined) row[key] = assessment.rating;
            });
            result.push(row);
          });
        });
      }
    }

    return { data: result, error: null };
  } catch (e: any) {
    console.error('Error fetching single traffic light data:', e);
    return { data: [], error: e.message || 'Server error' };
  }
}

export async function updateTrafficLightCell(
  accountOrParams: string | { account: string; quarter: string; matchKey?: string; staffName?: string; colKey?: string; columnKey?: string; newValue: string },
  quarterArg?: string,
  matchKeyArg?: string,
  matchValueArg?: any,
  colKeyArg?: string,
  newValueArg?: string
) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_EDIT_ROLES);
  try {
    let account = '';
    let quarter = '';
    let matchKey = 'teams';
    let matchValue: any = '';
    let colKey = '';
    let newValue = '';

    if (typeof accountOrParams === 'object') {
      account = accountOrParams.account;
      quarter = accountOrParams.quarter;
      matchKey = accountOrParams.matchKey || 'teams';
      matchValue = accountOrParams.staffName || matchKeyArg;
      colKey = accountOrParams.columnKey || accountOrParams.colKey || '';
      newValue = accountOrParams.newValue || '';
    } else {
      account = accountOrParams;
      quarter = quarterArg || 'q2';
      matchKey = matchKeyArg || 'teams';
      matchValue = matchValueArg;
      colKey = colKeyArg || '';
      newValue = newValueArg || '';
    }

    const cleanAccount = (account || '').toLowerCase().trim();
    const cleanQuarter = (quarter || 'q2').toLowerCase().trim();
    const cleanStaffName = String(matchValue || '').trim();
    await assertTrafficLightTarget(actor, cleanAccount, cleanStaffName);
    const isoDate = parseDateToISO(colKey);
    const { data: actorEmployee, error: actorError } = await supabaseAdmin.from('employees').select('id').ilike('employee_email', actor.email).maybeSingle();
    if (actorError) throw actorError;
    if (!actorEmployee) throw new Error('The signed-in user is not linked to an employee record.');

    if (normalizeScopeValue(cleanAccount) === 'trainers') {
      const { data: employee, error: employeeError } = await supabaseAdmin.from('employees').select('id').ilike('employee_name', cleanStaffName).maybeSingle();
      if (employeeError) throw employeeError;
      if (!employee) throw new Error(`Trainer ${cleanStaffName} was not found.`);
      const { data: existing, error: lookupError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring')
        .select('id').eq('trainer_employee_id', employee.id).eq('week_date', isoDate).limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      const statusMap: Record<string, string> = { '': 'NONE', OKAY: 'OKAY', GREEN: 'OKAY', PASS: 'OKAY', SHAKY: 'SHAKY', YELLOW: 'SHAKY', RED: 'TERMINATED', TERMINATED: 'TERMINATED', RESIGNED: 'RESIGNED', 'ACCOUNT REMOVED': 'ACCOUNT_REMOVED' };
      const status = statusMap[String(newValue || '').toUpperCase()];
      if (!status) throw new Error('Unsupported trainer monitoring status.');
      const payload = { trainer_employee_id: employee.id, week_date: isoDate, status, updated_by: actorEmployee.id, created_by: actorEmployee.id };
      const write = existing
        ? await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring').update({ status, updated_by: actorEmployee.id }).eq('id', existing.id)
        : await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring').insert(payload);
      if (write.error) throw write.error;
    } else {
      const roster = await getTrainingTraineeRecords(supabaseAdmin);
      const target = roster.find((row) => row.name.toLowerCase() === cleanStaffName.toLowerCase() && matchesTrafficLightAccount(cleanAccount, row.accountName));
      if (!target) throw new Error(`Trainee ${cleanStaffName} was not found in ${cleanAccount}.`);
      const column = colKey.toLowerCase();
      const assessmentType = column === '30 days' ? 'MILESTONE_30' : column === '60 days' ? 'MILESTONE_60' : column === '90 days' ? 'MILESTONE_90' : 'TRAFFIC_LIGHT';
      const ratingMap: Record<string, string> = { '': 'NOT_ASSESSED', GREEN: 'GREEN', G: 'GREEN', YELLOW: 'YELLOW', Y: 'YELLOW', RED: 'RED', R: 'RED', OKAY: 'OKAY', PASS: 'PASS', FAIL: 'FAIL', 'IN PROGRESS': 'IN_PROGRESS', 'NOT ASSESSED': 'NOT_ASSESSED' };
      const rating = ratingMap[String(newValue || '').trim().toUpperCase()];
      if (!rating) throw new Error('Unsupported assessment rating.');
      const { data: existing, error: lookupError } = await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api')
        .select('assessment_id').eq('enrollment_id', target.enrollmentId).eq('assessment_type', assessmentType).eq('assessed_on', isoDate).order('assessment_id', { ascending: false }).limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      const payload = { enrollment_id: target.enrollmentId, assessment_type: assessmentType, assessed_on: isoDate, rating, assessed_by_employee_id: actorEmployee.id };
      const write = existing
        ? await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api').update({ rating, assessed_by_employee_id: actorEmployee.id }).eq('assessment_id', existing.assessment_id)
        : await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api').insert(payload);
      if (write.error) throw write.error;
    }

    await logActivity({
      title: 'Traffic Light Status Updated',
      description: `Updated status for ${cleanStaffName || 'staff'} (${colKey}) to "${newValue}" in ${cleanAccount.toUpperCase()} (${cleanQuarter.toUpperCase()}).`,
      iconType: 'success',
      author: 'Authorized Manager'
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error updating cell:', e);
    return { success: false, error: e.message };
  }
}

function parseDateToISO(dStr: string) {
  const d = new Date(dStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '2026-01-01';
}

export interface TrafficLightRemarkItem {
  metric_id: number;
  remarks: string;
  traffic_status?: string;
  staffName: string;
  columnKey: string;
  source_table: string;
}

export async function getTrafficLightRemarks(account: string, quarter: string, accountList?: string[]) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_ROLES);
  try {
    const trainerScope = actor.role === 'TRAINER'
      ? await getTrainerTraineeNames(actor.email, actor.name)
      : null;
    if (account === 'all') {
      const requestedAccounts = accountList && accountList.length > 0
        ? accountList.filter(a => a !== 'all')
        : ['trainers', 'rm', 'xpn', 'fleet', 'leaders', 'dft', 'js', 'ono', 'awd', 'flexar', 'hh', 'mm_transpo', 'other_acc'];
      const targetAccounts = trainerScope
        ? requestedAccounts.filter(acc => trainerCanAccessAccount(acc, trainerScope.accounts))
        : requestedAccounts;

      const combinedMap: Record<string, TrafficLightRemarkItem[]> = {};
      for (const acc of targetAccounts) {
        const res = await getSingleTrafficLightRemarks(acc, quarter);
        if (res.data) {
          Object.assign(combinedMap, trainerScope
            ? scopeTrafficLightRemarks(res.data, actor.name, trainerScope.names, acc)
            : res.data);
        }
      }
      return { data: combinedMap, error: null };
    }

    if (trainerScope && !trainerCanAccessAccount(account, trainerScope.accounts)) {
      return { data: {}, error: null };
    }
    const result = await getSingleTrafficLightRemarks(account, quarter);
    return trainerScope && result.data
      ? { ...result, data: scopeTrafficLightRemarks(result.data, actor.name, trainerScope.names, account) }
      : result;
  } catch (e: any) {
    console.error('Error in getTrafficLightRemarks:', e);
    return { data: {}, error: e.message };
  }
}

async function getSingleTrafficLightRemarks(account: string, quarter: string) {
  try {
    const remarksMap: Record<string, TrafficLightRemarkItem[]> = {};
    if (normalizeScopeValue(account) === 'trainers') {
      const { data: rows, error } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks')
        .select('id, monitoring_id, remark');
      if (error) throw error;
      const monitors = (rows || []).map((row: any) => Number(row.monitoring_id));
      const { data: monitoring } = monitors.length
        ? await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring').select('id, week_date, trainer_employee_id').in('id', monitors)
        : { data: [] };
      const employeeIds = Array.from(new Set((monitoring || []).map((row: any) => Number(row.trainer_employee_id))));
      const { data: employees } = employeeIds.length ? await supabaseAdmin.from('employees').select('id, employee_name').in('id', employeeIds) : { data: [] };
      const employeeById = new Map((employees || []).map((row: any) => [Number(row.id), row.employee_name]));
      const monitorById = new Map((monitoring || []).map((row: any) => [Number(row.id), row]));
      for (const row of rows || []) {
        const monitor: any = monitorById.get(Number(row.monitoring_id));
        const staffName = String(employeeById.get(Number(monitor?.trainer_employee_id)) || '');
        if (!staffName || !monitor) continue;
        const columnKey = new Date(`${monitor.week_date}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC' });
        const key = `${staffName}::${columnKey}`;
        (remarksMap[key] ||= []).push({ metric_id: Number(row.id), remarks: row.remark, staffName, columnKey, source_table: key });
      }
    } else {
      const roster = await getTrainingTraineeRecords(supabaseAdmin);
      const targetRows = roster.filter((row) => matchesTrafficLightAccount(account, row.accountName));
      const ids = targetRows.map((row) => row.enrollmentId);
      const { data, error } = ids.length
        ? await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api')
          .select('assessment_id, enrollment_id, assessment_type, assessed_on, rating, remarks').in('enrollment_id', ids).not('remarks', 'is', null)
        : { data: [], error: null };
      if (error) throw error;
      const traineeById = new Map(targetRows.map((row) => [row.enrollmentId, row]));
      for (const row of data || []) {
        const trainee = traineeById.get(Number(row.enrollment_id));
        if (!trainee || !row.remarks) continue;
        const type = String(row.assessment_type || '');
        const columnKey = type.startsWith('MILESTONE_') ? `${type.slice(10)} days` : new Date(`${row.assessed_on}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC' });
        const key = `${trainee.name}::${columnKey}`;
        (remarksMap[key] ||= []).push({ metric_id: Number(row.assessment_id), remarks: row.remarks, traffic_status: row.rating, staffName: trainee.name, columnKey, source_table: key });
      }
    }
    return { data: remarksMap, error: null };
  } catch (e: any) {
    console.error('Error in getSingleTrafficLightRemarks:', e);
    return { data: {}, error: e.message };
  }
}

export async function addTrafficLightRemark({
  account,
  quarter,
  staffName,
  columnKey,
  status,
  remarks,
  author
}: {
  account: string;
  quarter: string;
  staffName: string;
  columnKey: string;
  status?: string;
  remarks: string;
  author?: string;
}) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_EDIT_ROLES);
  try {
    const cleanAccount = account.toLowerCase();
    const cleanQuarter = quarter.toLowerCase();
    await assertTrafficLightTarget(actor, cleanAccount, staffName);
    const trimmedRemarks = (remarks || '').trim();
    const actionAuthor = author || 'Authorized Manager';

    if (!trimmedRemarks) {
      return { success: false, error: 'Remarks content cannot be empty.' };
    }

    const { data: authorEmployee, error: authorError } = await supabaseAdmin.from('employees').select('id').ilike('employee_email', actor.email).maybeSingle();
    if (authorError) throw authorError;
    if (!authorEmployee) throw new Error('The signed-in user is not linked to an employee record.');
    const assessedOn = parseDateToISO(columnKey);
    let inserted: any;
    if (normalizeScopeValue(cleanAccount) === 'trainers') {
      const { data: employee, error: employeeError } = await supabaseAdmin.from('employees').select('id').ilike('employee_name', staffName).maybeSingle();
      if (employeeError) throw employeeError;
      if (!employee) throw new Error(`Trainer ${staffName} was not found.`);
      const { data: monitor, error: monitorError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring')
        .select('id').eq('trainer_employee_id', employee.id).eq('week_date', assessedOn).limit(1).maybeSingle();
      if (monitorError) throw monitorError;
      let monitoringId = monitor?.id;
      if (!monitoringId) {
        const { data: created, error: createError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring')
          .insert({ trainer_employee_id: employee.id, week_date: assessedOn, status: 'NONE', created_by: authorEmployee.id, updated_by: authorEmployee.id }).select('id').single();
        if (createError) throw createError;
        monitoringId = created.id;
      }
      const { data, error } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks')
        .insert({ monitoring_id: monitoringId, category: 'GENERAL', remark: trimmedRemarks, created_by: authorEmployee.id, updated_by: authorEmployee.id }).select().single();
      if (error) throw error;
      inserted = data;
    } else {
      const roster = await getTrainingTraineeRecords(supabaseAdmin);
      const target = roster.find((row) => row.name.toLowerCase() === staffName.toLowerCase() && matchesTrafficLightAccount(cleanAccount, row.accountName));
      if (!target) throw new Error(`Trainee ${staffName} was not found in ${cleanAccount}.`);
      const normalizedColumn = columnKey.toLowerCase();
      const assessmentType = normalizedColumn === '30 days' ? 'MILESTONE_30' : normalizedColumn === '60 days' ? 'MILESTONE_60' : normalizedColumn === '90 days' ? 'MILESTONE_90' : 'TRAFFIC_LIGHT';
      const ratingMap: Record<string, string> = { '': 'NOT_ASSESSED', GREEN: 'GREEN', G: 'GREEN', YELLOW: 'YELLOW', Y: 'YELLOW', RED: 'RED', R: 'RED', OKAY: 'OKAY', PASS: 'PASS', FAIL: 'FAIL', 'IN PROGRESS': 'IN_PROGRESS', 'NOT ASSESSED': 'NOT_ASSESSED' };
      const rating = ratingMap[String(status || '').trim().toUpperCase()];
      if (!rating) throw new Error('Unsupported assessment rating.');
      const { data, error } = await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api')
        .insert({ enrollment_id: target.enrollmentId, assessment_type: assessmentType, assessed_on: assessedOn, rating, remarks: trimmedRemarks, assessed_by_employee_id: authorEmployee.id }).select().single();
      if (error) throw error;
      inserted = data;
    }

    await logActivity({
      title: 'Traffic Light Remark Added',
      description: `Added note for ${staffName} on ${columnKey} (${account.toUpperCase()} - ${quarter.toUpperCase()}): "${trimmedRemarks.slice(0, 70)}${trimmedRemarks.length > 70 ? '...' : ''}"`,
      iconType: 'alert',
      author: actionAuthor
    });

    return { success: true, item: inserted };
  } catch (e: any) {
    console.error('Error adding remark:', e);
    return { success: false, error: e.message };
  }
}

export async function updateTrafficLightRemark({
  metric_id,
  remarks,
  staffName,
  columnKey,
  account,
  quarter,
  author
}: {
  metric_id: number;
  remarks: string;
  staffName: string;
  columnKey: string;
  account: string;
  quarter: string;
  author?: string;
}) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_EDIT_ROLES);
  try {
    const trimmedRemarks = (remarks || '').trim();
    await assertTrafficLightTarget(actor, account.toLowerCase(), staffName);
    const actionAuthor = author || 'Authorized Manager';

    if (!trimmedRemarks) {
      return { success: false, error: 'Remark cannot be empty.' };
    }

    const { data: assessment, error: assessmentLookupError } = await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api')
      .select('assessment_id, enrollment_id, assessed_on').eq('assessment_id', metric_id).maybeSingle();
    if (assessmentLookupError) throw assessmentLookupError;
    if (assessment) {
      const roster = await getTrainingTraineeRecords(supabaseAdmin);
      const target = roster.find((row) => row.enrollmentId === Number(assessment.enrollment_id) && row.name.toLowerCase() === staffName.toLowerCase() && matchesTrafficLightAccount(account, row.accountName));
      if (!target || assessment.assessed_on !== parseDateToISO(columnKey)) throw new Error('Remark does not match the requested trainee and date.');
      const { error } = await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api').update({ remarks: trimmedRemarks }).eq('assessment_id', metric_id);
      if (error) throw error;
    } else {
      const { data: remark, error: remarkLookupError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks').select('id, monitoring_id').eq('id', metric_id).maybeSingle();
      if (remarkLookupError) throw remarkLookupError;
      if (!remark) throw new Error('Remark not found.');
      const { data: monitor, error: monitorError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring').select('id, trainer_employee_id, week_date').eq('id', remark.monitoring_id).maybeSingle();
      if (monitorError) throw monitorError;
      const { data: employee, error: employeeError } = await supabaseAdmin.from('employees').select('employee_name').eq('id', monitor?.trainer_employee_id).maybeSingle();
      if (employeeError) throw employeeError;
      if (!monitor || !isTrainerMatch(employee?.employee_name || '', staffName) || monitor.week_date !== parseDateToISO(columnKey)) throw new Error('Remark does not match the requested trainer and date.');
      const { error } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks').update({ remark: trimmedRemarks }).eq('id', metric_id);
      if (error) throw error;
    }

    await logActivity({
      title: 'Traffic Light Remark Updated',
      description: `Updated note for ${staffName} on ${columnKey} (${account.toUpperCase()} - ${quarter.toUpperCase()}): "${trimmedRemarks.slice(0, 70)}${trimmedRemarks.length > 70 ? '...' : ''}"`,
      iconType: 'alert',
      author: actionAuthor
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error updating remark:', e);
    return { success: false, error: e.message };
  }
}

export async function deleteTrafficLightRemarkItem({
  metric_id,
  staffName,
  columnKey,
  account,
  quarter,
  author
}: {
  metric_id: number;
  staffName: string;
  columnKey: string;
  account: string;
  quarter: string;
  author?: string;
}) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_EDIT_ROLES);
  try {
    const actionAuthor = author || 'Authorized Manager';
    await assertTrafficLightTarget(actor, account.toLowerCase(), staffName);

    const { data: assessment, error: assessmentLookupError } = await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api')
      .select('assessment_id, enrollment_id, assessed_on').eq('assessment_id', metric_id).maybeSingle();
    if (assessmentLookupError) throw assessmentLookupError;
    if (assessment) {
      const roster = await getTrainingTraineeRecords(supabaseAdmin);
      const target = roster.find((row) => row.enrollmentId === Number(assessment.enrollment_id) && row.name.toLowerCase() === staffName.toLowerCase() && matchesTrafficLightAccount(account, row.accountName));
      if (!target || assessment.assessed_on !== parseDateToISO(columnKey)) throw new Error('Remark does not match the requested trainee and date.');
      const { error } = await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api').update({ remarks: null }).eq('assessment_id', metric_id);
      if (error) throw error;
    } else {
      const { data: remark, error: remarkLookupError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks').select('id, monitoring_id').eq('id', metric_id).maybeSingle();
      if (remarkLookupError) throw remarkLookupError;
      if (!remark) throw new Error('Remark not found.');
      const { data: monitor, error: monitorError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring').select('id, trainer_employee_id, week_date').eq('id', remark.monitoring_id).maybeSingle();
      if (monitorError) throw monitorError;
      const { data: employee, error: employeeError } = await supabaseAdmin.from('employees').select('employee_name').eq('id', monitor?.trainer_employee_id).maybeSingle();
      if (employeeError) throw employeeError;
      if (!monitor || !isTrainerMatch(employee?.employee_name || '', staffName) || monitor.week_date !== parseDateToISO(columnKey)) throw new Error('Remark does not match the requested trainer and date.');
      const { error } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks').delete().eq('id', metric_id);
      if (error) throw error;
    }

    await logActivity({
      title: 'Traffic Light Remark Deleted',
      description: `Removed note for ${staffName} on ${columnKey} (${account.toUpperCase()} - ${quarter.toUpperCase()}).`,
      iconType: 'alert',
      author: actionAuthor
    });

    return { success: true };
  } catch (e: any) {
    console.error('Error deleting remark item:', e);
    return { success: false, error: e.message };
  }
}

// Backwards compatibility alias
export async function saveTrafficLightRemark(params: {
  account: string;
  quarter: string;
  staffName: string;
  columnKey: string;
  status?: string;
  remarks: string;
  author?: string;
}) {
  return addTrafficLightRemark(params);
}

export async function deleteTrafficLightRemark(params: {
  account: string;
  quarter: string;
  staffName: string;
  columnKey: string;
  author?: string;
}) {
  const actor = await requireActionRole(TRAFFIC_LIGHT_EDIT_ROLES);
  await assertTrafficLightTarget(actor, params.account.toLowerCase(), params.staffName);
  if (normalizeScopeValue(params.account) === 'trainers') {
    const { data: employee, error: employeeError } = await supabaseAdmin.from('employees').select('id').ilike('employee_name', params.staffName).maybeSingle();
    if (employeeError) return { success: false, error: employeeError.message };
    const date = parseDateToISO(params.columnKey);
    const { data: monitoring, error: monitoringError } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_monitoring')
      .select('id').eq('trainer_employee_id', employee?.id).eq('week_date', date).limit(1).maybeSingle();
    if (monitoringError) return { success: false, error: monitoringError.message };
    if (!monitoring) return { success: true };
    const { error } = await supabaseAdmin.schema('trainingHub_system').from('trainer_light_remarks').delete().eq('monitoring_id', monitoring.id);
    return { success: !error, error: error?.message };
  }
  const roster = await getTrainingTraineeRecords(supabaseAdmin);
  const target = roster.find((row) => row.name.toLowerCase() === params.staffName.toLowerCase() && matchesTrafficLightAccount(params.account, row.accountName));
  if (!target) return { success: false, error: 'Trainee not found.' };
  const type = params.columnKey.toLowerCase() === '30 days' ? 'MILESTONE_30' : params.columnKey.toLowerCase() === '60 days' ? 'MILESTONE_60' : params.columnKey.toLowerCase() === '90 days' ? 'MILESTONE_90' : 'TRAFFIC_LIGHT';
  const { error } = await supabaseAdmin.schema('trainingHub_system').from('trainee_assessments_api').update({ remarks: null }).eq('enrollment_id', target.enrollmentId).eq('assessment_type', type).eq('assessed_on', parseDateToISO(params.columnKey));
  return { success: !error, error: error?.message };
}

async function assertTrafficLightTarget(
  actor: Awaited<ReturnType<typeof requireActionRole>>,
  account: string,
  staffName: string,
) {
  if (actor.role !== 'TRAINER') return;
  const scope = await getTrainerTraineeNames(actor.email, actor.name);
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const allowedNames = new Set(scope.names.map(normalize));
  const trainerAccount = normalizeScopeValue(account) === 'trainers';
  if (!trainerAccount && !trainerCanAccessAccount(account, scope.accounts)) {
    throw new Error('Trainers may only edit traffic-light data for their assigned accounts.');
  }
  if (trainerAccount
    ? !isTrainerMatch(staffName, actor.name)
    : !allowedNames.has(normalize(staffName)) && !isTrainerMatch(staffName, actor.name)) {
    throw new Error('Trainers may only edit traffic-light data for their own roster.');
  }
}

