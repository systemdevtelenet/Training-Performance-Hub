'use server';

import { createClient } from '@supabase/supabase-js';
import { logActivity } from './logger';

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

    if (accountMap.size === 0) {
      return [
        { id: 'rm', name: 'RM' },
        { id: 'xpn', name: 'XPN' },
        { id: 'fleet', name: 'Fleet' },
        { id: 'leaders', name: 'Leaders' },
        { id: 'trainers', name: 'Trainers' },
        { id: 'dft', name: 'DFT' },
        { id: 'js', name: 'JS' },
        { id: 'ono', name: 'ONO' },
        { id: 'awd', name: 'AWD' },
        { id: 'flexar', name: 'FLEXAR' },
        { id: 'hh', name: 'HH' },
        { id: 'mm_transpo', name: 'MM Transpo' },
        { id: 'other_acc', name: 'Other Acc' }
      ];
    }

    return Array.from(accountMap.entries()).map(([id, name]) => ({ id, name }));
  } catch (e) {
    console.error('Error fetching traffic light accounts:', e);
    return [];
  }
}

export async function getTrafficLightData(account: string, quarter: string) {
  try {
    const tableName1 = `traffic_light_mon_${account}_${quarter}`;
    const tableName2 = `traffic_light_mon_ ${account}_${quarter}`;

    // Try primary clean table name first
    const { data: res1, error: err1 } = await supabaseAdmin.from(tableName1).select('*');
    if (!err1 && res1 && res1.length > 0) {
      return { data: res1, error: null };
    }

    // Try fallback table name with space
    const { data: res2, error: err2 } = await supabaseAdmin.from(tableName2).select('*');
    if (!err2 && res2 && res2.length > 0) {
      return { data: res2, error: null };
    }

    // If direct table was empty/missing, check other_acc table
    const otherTable1 = `traffic_light_mon_other_acc_${quarter}`;
    const otherTable2 = `traffic_light_mon_ other_acc_${quarter}`;

    let { data: otherData, error: errOther } = await supabaseAdmin.from(otherTable1).select('*');
    if (!otherData || otherData.length === 0) {
      const { data: o2, error: errO2 } = await supabaseAdmin.from(otherTable2).select('*');
      if (o2 && o2.length > 0) otherData = o2;
      else if (errO2) errOther = errO2;
    }

    if (otherData && otherData.length > 0) {
      if (account === 'other_acc') {
        return { data: otherData, error: null };
      }

      // Filter sub-section from other_acc table
      const cleanTarget = account.toLowerCase().replace(/[^a-z0-9]/g, '');
      let capturing = false;
      const extracted: any[] = [];

      for (const row of otherData) {
        const keys = Object.keys(row);
        const candidateKeys = ['teams', 'name', 'trainers', 'trainer', 'employee', 'staff'];
        const nameCol = keys.find(k => candidateKeys.includes(k.toLowerCase())) || keys[0];
        const rawVal = row[nameCol];

        if (rawVal === null || rawVal === undefined) continue;
        const strVal = String(rawVal).trim();
        if (!strVal || strVal.toLowerCase() === 'null') continue;

        const cleanVal = strVal.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!capturing && (cleanVal === cleanTarget || cleanVal.includes(cleanTarget) || cleanTarget.includes(cleanVal))) {
          capturing = true;
          continue;
        }

        if (capturing) {
          const knownHeaders = ['cova', 'soas', 'flexar', 'hh', 'js', 'ono', 'mmtranspo', 'bilingualcsr', 'corpqa', 'cts'];
          const isHeader = (knownHeaders.includes(cleanVal) && cleanVal !== cleanTarget) || strVal.toUpperCase().startsWith('TEAM');
          if (isHeader) {
            break;
          }
          extracted.push(row);
        }
      }

      if (extracted.length > 0) {
        return { data: extracted, error: null };
      }
    }

    if (res1) return { data: res1, error: null };
    if (res2) return { data: res2, error: null };

    return { data: [], error: err1?.message || err2?.message || errOther?.message || 'No data found' };
  } catch (e: any) {
    console.error('Error fetching traffic light data:', e);
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

    const tableName1 = `traffic_light_mon_${account}_${quarter}`;
    const tableName2 = `traffic_light_mon_ ${account}_${quarter}`;
    const otherTable1 = `traffic_light_mon_other_acc_${quarter}`;
    const otherTable2 = `traffic_light_mon_ other_acc_${quarter}`;

    // Try primary clean table first
    let { error: err } = await supabaseAdmin
      .from(tableName1)
      .update({ [colKey]: newValue })
      .eq(matchKey, matchValue);

    if (err) {
      // Try space fallback table
      const { error: err2 } = await supabaseAdmin
        .from(tableName2)
        .update({ [colKey]: newValue })
        .eq(matchKey, matchValue);

      if (err2) {
        // Try other_acc table
        const { error: err3 } = await supabaseAdmin
          .from(otherTable1)
          .update({ [colKey]: newValue })
          .eq(matchKey, matchValue);

        if (err3) {
          const { error: err4 } = await supabaseAdmin
            .from(otherTable2)
            .update({ [colKey]: newValue })
            .eq(matchKey, matchValue);

          if (err4) {
            return { success: false, error: err4.message };
          }
        }
      }
    }

    await logActivity({
      title: 'Traffic Light Status Updated',
      description: `Updated status for ${matchValue || 'staff'} (${colKey}) to "${newValue}" in ${account.toUpperCase()} (${quarter.toUpperCase()}).`,
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

export async function getTrafficLightRemarks(account: string, quarter: string) {
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
    console.error('Error in getTrafficLightRemarks:', e);
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

