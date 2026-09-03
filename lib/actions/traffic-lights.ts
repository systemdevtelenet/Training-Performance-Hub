'use server';

import { createClient } from '@supabase/supabase-js';

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

    if (res1) return { data: res1, error: null };
    if (res2) return { data: res2, error: null };

    return { data: [], error: err1?.message || err2?.message || 'No data found' };
  } catch (e: any) {
    console.error('Error fetching traffic light data:', e);
    return { data: [], error: e.message || 'Server error' };
  }
}

export async function updateTrafficLightCell(
  account: string,
  quarter: string,
  matchKey: string,
  matchValue: any,
  colKey: string,
  newValue: string
) {
  try {
    const tableName1 = `traffic_light_mon_${account}_${quarter}`;
    const tableName2 = `traffic_light_mon_ ${account}_${quarter}`;

    const { error: err1 } = await supabaseAdmin
      .from(tableName1)
      .update({ [colKey]: newValue })
      .eq(matchKey, matchValue);

    if (err1) {
      const { error: err2 } = await supabaseAdmin
        .from(tableName2)
        .update({ [colKey]: newValue })
        .eq(matchKey, matchValue);

      if (err2) {
        return { success: false, error: err2.message };
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('Error updating cell:', e);
    return { success: false, error: e.message };
  }
}
