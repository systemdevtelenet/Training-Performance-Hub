'use server';

import { createClient } from '@supabase/supabase-js';
import { logActivity } from './logger';
import { isTrainerMatch } from '@/lib/analytics-utils';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (e) {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});

export async function getTrainerTraineeNames(trainerEmail?: string, trainerName?: string) {
  try {
    const normalizeStr = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const cleanEmail = (trainerEmail || '').toLowerCase().trim();
    const cleanName = (trainerName || '').toLowerCase().trim();
    const normName = normalizeStr(trainerName);

    const { data: ih } = await supabaseAdmin.from('inhouse').select('*');
    const { data: pst } = await supabaseAdmin.from('product_spec_training').select('*');
    const { getTraineeTrainerAssignmentMap } = await import('@/lib/data-fetcher');
    const assignmentMap = await getTraineeTrainerAssignmentMap();

    const matchedNames = new Set<string>();
    const matchedAccounts = new Set<string>();

    const allTrainees = [...(ih || []), ...(pst || [])];
    allTrainees.forEach(t => {
      const cleanTName = (t.name || '').trim().toLowerCase();
      const normTName = normalizeStr(t.name);
      const assigned = (assignmentMap.get(cleanTName) || t.assigned_trainer || t.trainer || '').trim();
      const normAssigned = normalizeStr(assigned);
      const rawAcc = (t.account || t.acount || t.accountName || 'General').toString().trim().toLowerCase();

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

export async function getAvailableTrafficLightAccounts() {
  try {
    const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
    const res = await fetch(url, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    if (!res.ok) return [];

    const data = await res.json();
    const tables = Object.keys(data.definitions || {});
    
    const accountMap = new Map<string, string>();
    const labelFormatting: Record<string, string> = {
      'trainers': 'Trainers',
      'general': 'General',
      'rm': 'RM',
      'xpn': 'XPN',
      'fleet': 'Fleet',
      'leaders': 'Leaders',
      'dft': 'DFT',
      'js': 'JS',
      'ono': 'ONO',
      'awd': 'AWD',
      'flexar': 'FLEXAR',
      'hh': 'HH',
      'mm_transpo': 'MM Transpo',
      'other_acc': 'Other Acc'
    };

    tables.forEach(t => {
      if (t.startsWith('traffic_light_mon_')) {
        const clean = t.replace('traffic_light_mon_', '').trim();
        const parts = clean.split('_');
        if (parts.length >= 2) {
          const accId = parts.slice(0, -1).join('_');
          const name = labelFormatting[accId] || accId.toUpperCase().replace(/_/g, ' ');
          accountMap.set(accId, name);
        }
      }
    });

    const preferredOrder = ['trainers', 'general', 'rm', 'xpn', 'fleet', 'leaders', 'dft', 'js', 'ono', 'awd', 'flexar', 'hh', 'mm_transpo', 'other_acc'];
    const resultList: { id: string; name: string }[] = [];
    preferredOrder.forEach(id => {
      resultList.push({ id, name: labelFormatting[id] || id.toUpperCase() });
    });
    accountMap.forEach((name, id) => {
      if (!preferredOrder.includes(id)) {
        resultList.push({ id, name });
      }
    });
    return resultList;
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
  try {
    if (account === 'all') {
      const targetAccounts = accountList && accountList.length > 0
        ? accountList.filter(a => a !== 'all')
        : ['trainers', 'general', 'rm', 'xpn', 'fleet', 'leaders', 'dft', 'js', 'ono', 'awd', 'flexar', 'hh', 'mm_transpo', 'other_acc'];

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
        if (res.data && res.data.length > 0) {
          const accLabel = labelFormatting[acc.toLowerCase()] || acc.toUpperCase().replace(/_/g, ' ');

          combined.push({
            id: `acc_header_${acc}`,
            teams: `ACCOUNT: ${accLabel}`,
            isAccountHeader: true,
            _account: acc
          });

          res.data.forEach((r: any) => {
            combined.push(standardizeTrafficLightRow(r, acc));
          });
        }
      }
      return { data: combined, error: null };
    }

    const res = await getSingleTrafficLightData(account, quarter);
    const standardized = (res.data || []).map((r: any) => standardizeTrafficLightRow(r, account));
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
        dates.forEach(d => { row[d] = null; });
        result.push(row);
      });
    } else {
      // 2. For client accounts: Retrieve live trainees from inhouse and product_spec_training (matching Trainees page)
      const { data: ih } = await supabaseAdmin.from('inhouse').select('*');
      const { data: pst } = await supabaseAdmin.from('product_spec_training').select('*');
      const { getTraineeTrainerAssignmentMap } = await import('@/lib/data-fetcher');
      const assignmentMap = await getTraineeTrainerAssignmentMap();
      const allTrainees = [...(ih || []), ...(pst || [])];

      const matched = allTrainees.filter(t => {
        const rawAccount = (t.account || t.acount || t.accountName || 'General').toString().trim();
        return matchesTrafficLightAccount(account, rawAccount);
      });

      if (matched.length > 0) {
        // Group by wave / batch
        const groups: Record<string, any[]> = {};
        matched.forEach(t => {
          const rawBatch = t.batch ? `Batch ${t.batch}` : (t.wave ? `Wave ${t.wave}` : 'Batch 1');
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
            const cleanTName = (t.name || '').trim().toLowerCase();
            const rawAccount = (t.account || t.acount || t.accountName || 'General').toString().trim();
            const assignedTrainer = assignmentMap.get(cleanTName) || t.assigned_trainer || t.trainer || '';

            const row: any = {
              id: t.name,
              teams: t.name,
              _account: account,
              assigned_trainer: assignedTrainer,
              accountName: rawAccount,
              position: t.position || 'Trainee',
              startDate: t.start_date || t.startDate || t.date_hired || t.start || '-'
            };
            dates.forEach(d => { row[d] = null; });
            result.push(row);
          });
        });
      }
    }

    // 3. Overlay any saved status values from traffic_light_metrics and legacy tables
    const { data: metrics } = await supabaseAdmin
      .from('traffic_light_metrics')
      .select('person_id, metric_date, traffic_status, source_table')
      .eq('metric_group', account);

    if (metrics && metrics.length > 0) {
      metrics.forEach(m => {
        let pName = '';
        let colKey = '';
        if (m.source_table && m.source_table.includes('::')) {
          const parts = m.source_table.split('::');
          if (parts.length >= 4) {
            pName = parts[2];
            colKey = parts.slice(3).join('::');
          }
        }
        if (!pName && m.person_id) {
          pName = String(m.person_id);
        }

        if (pName && m.traffic_status) {
          const targetRow = result.find(r => !r.isAccountHeader && !r.isTeamHeader && r.teams && r.teams.toLowerCase().trim() === pName.toLowerCase().trim());
          if (targetRow) {
            if (colKey && targetRow[colKey] !== undefined) {
              targetRow[colKey] = m.traffic_status;
            } else if (m.metric_date) {
              const dObj = new Date(m.metric_date);
              const fallbackColKey = `${dObj.getMonth() + 1}/${dObj.getDate()}/${dObj.getFullYear()}`;
              if (targetRow[fallbackColKey] !== undefined) {
                targetRow[fallbackColKey] = m.traffic_status;
              }
            }
          }
        }
      });
    }

    // Fallback: If no trainees in live tables, try legacy traffic_light_mon_<account>_<quarter>
    if (result.length === 0) {
      const candidateTableNames = [
        `traffic_light_mon_${account}_${quarter}`,
        `traffic_light_mon_ ${account}_${quarter}`,
        `traffic_light_mon_${account}`,
        `traffic_light_mon_ ${account}`
      ];

      for (const tbl of candidateTableNames) {
        const { data: res, error: err } = await supabaseAdmin.from(tbl).select('*');
        if (!err && res && res.length > 0) {
          return { data: res, error: null };
        }
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
    const isoDate = parseDateToISO(colKey);
    const sourceTable = `${cleanAccount}::${cleanQuarter}::${cleanStaffName}::${colKey}`;

    // 1. Save / Update in traffic_light_metrics
    const { data: existingRecords } = await supabaseAdmin
      .from('traffic_light_metrics')
      .select('metric_id')
      .eq('source_table', sourceTable);

    if (existingRecords && existingRecords.length > 0) {
      await supabaseAdmin
        .from('traffic_light_metrics')
        .update({
          traffic_status: newValue || null,
          metric_date: isoDate,
          metric_group: cleanAccount
        })
        .eq('source_table', sourceTable);
    } else {
      await supabaseAdmin
        .from('traffic_light_metrics')
        .insert({
          metric_group: cleanAccount,
          metric_date: isoDate,
          traffic_status: newValue || null,
          source_table: sourceTable
        });
    }

    // 2. Also try updating legacy table if exists
    const candidateTables = [
      `traffic_light_mon_${cleanAccount}_${cleanQuarter}`,
      `traffic_light_mon_ ${cleanAccount}_${cleanQuarter}`,
      `traffic_light_mon_${cleanAccount}`,
      `traffic_light_mon_ ${cleanAccount}`,
      `traffic_light_mon_other_acc_${cleanQuarter}`,
      `traffic_light_mon_ other_acc_${cleanQuarter}`
    ];

    const candidateMatchKeys = [matchKey, 'teams', 'TRAINERS', 'trainers', 'name', 'js', 'RM-TEAMLEADS'];

    for (const tbl of candidateTables) {
      for (const mKey of candidateMatchKeys) {
        try {
          await supabaseAdmin
            .from(tbl)
            .update({ [colKey]: newValue })
            .eq(mKey, cleanStaffName);
        } catch (ignored) {}
      }
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
  try {
    if (account === 'all') {
      const targetAccounts = accountList && accountList.length > 0
        ? accountList.filter(a => a !== 'all')
        : ['trainers', 'rm', 'xpn', 'fleet', 'leaders', 'dft', 'js', 'ono', 'awd', 'flexar', 'hh', 'mm_transpo', 'other_acc'];

      const combinedMap: Record<string, TrafficLightRemarkItem[]> = {};
      for (const acc of targetAccounts) {
        const res = await getSingleTrafficLightRemarks(acc, quarter);
        if (res.data) {
          Object.assign(combinedMap, res.data);
        }
      }
      return { data: combinedMap, error: null };
    }

    return await getSingleTrafficLightRemarks(account, quarter);
  } catch (e: any) {
    console.error('Error in getTrafficLightRemarks:', e);
    return { data: {}, error: e.message };
  }
}

async function getSingleTrafficLightRemarks(account: string, quarter: string) {
  try {
    const prefix = `${account.toLowerCase()}::${quarter.toLowerCase()}::`;
    const { data, error } = await supabaseAdmin
      .from('traffic_light_metrics')
      .select('*')
      .like('source_table', `${prefix}%`)
      .order('metric_id', { ascending: true });

    if (error) {
      console.error('Error fetching remarks:', error);
      return { data: {}, error: error.message };
    }

    const remarksMap: Record<string, TrafficLightRemarkItem[]> = {};

    (data || []).forEach(row => {
      const parts = (row.source_table || '').split('::');
      if (parts.length >= 4) {
        const staffName = parts[2];
        const columnKey = parts.slice(3).join('::');
        const key = `${staffName}::${columnKey}`;
        if (!remarksMap[key]) {
          remarksMap[key] = [];
        }
        remarksMap[key].push({
          metric_id: row.metric_id,
          remarks: row.remarks || '',
          traffic_status: row.traffic_status || '',
          staffName,
          columnKey,
          source_table: row.source_table
        });
      }
    });

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
  try {
    const cleanAccount = account.toLowerCase();
    const cleanQuarter = quarter.toLowerCase();
    const sourceKey = `${cleanAccount}::${cleanQuarter}::${staffName}::${columnKey}`;
    const trimmedRemarks = (remarks || '').trim();
    const actionAuthor = author || 'Authorized Manager';

    if (!trimmedRemarks) {
      return { success: false, error: 'Remarks content cannot be empty.' };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('traffic_light_metrics')
      .insert({
        metric_group: cleanAccount,
        metric_date: parseDateToISO(columnKey),
        traffic_status: status || null,
        remarks: trimmedRemarks,
        source_table: sourceKey
      })
      .select()
      .single();

    if (error) throw error;

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
  try {
    const trimmedRemarks = (remarks || '').trim();
    const actionAuthor = author || 'Authorized Manager';

    if (!trimmedRemarks) {
      return { success: false, error: 'Remark cannot be empty.' };
    }

    const { error } = await supabaseAdmin
      .from('traffic_light_metrics')
      .update({ remarks: trimmedRemarks })
      .eq('metric_id', metric_id);

    if (error) throw error;

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
  try {
    const actionAuthor = author || 'Authorized Manager';

    const { error } = await supabaseAdmin
      .from('traffic_light_metrics')
      .delete()
      .eq('metric_id', metric_id);

    if (error) throw error;

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
  const sourceKey = `${params.account.toLowerCase()}::${params.quarter.toLowerCase()}::${params.staffName}::${params.columnKey}`;
  const { error } = await supabaseAdmin
    .from('traffic_light_metrics')
    .delete()
    .eq('source_table', sourceKey);
  return { success: !error, error: error?.message };
}

