import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testFetch(account: string, quarter: string) {
  const tableName1 = `traffic_light_mon_${account}_${quarter}`;
  const tableName2 = `traffic_light_mon_ ${account}_${quarter}`;

  // Try direct tables first
  const { data: res1 } = await supabaseAdmin.from(tableName1).select('*');
  if (res1 && res1.length > 0) return { data: res1, source: tableName1 };

  const { data: res2 } = await supabaseAdmin.from(tableName2).select('*');
  if (res2 && res2.length > 0) return { data: res2, source: tableName2 };

  // Fallback to other_acc
  const otherTable1 = `traffic_light_mon_other_acc_${quarter}`;
  const otherTable2 = `traffic_light_mon_ other_acc_${quarter}`;

  let { data: otherData } = await supabaseAdmin.from(otherTable1).select('*');
  if (!otherData || otherData.length === 0) {
    const { data: o2 } = await supabaseAdmin.from(otherTable2).select('*');
    otherData = o2;
  }

  if (otherData && otherData.length > 0) {
    if (account === 'other_acc') return { data: otherData, source: 'other_acc_all' };

    // Filter sub-section from other_acc
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

      // Check if this row is the section header for the target account
      if (!capturing && (cleanVal === cleanTarget || cleanVal.includes(cleanTarget) || cleanTarget.includes(cleanVal))) {
        capturing = true;
        extracted.push(row);
        continue;
      }

      if (capturing) {
        // If we encounter another section header (non-employee, short uppercase header, or team header), stop
        const isHeader = ['cova', 'soas', 'flexar', 'hh', 'js', 'ono', 'mmtranspo', 'bilingualcsr', 'corpqa', 'cts'].includes(cleanVal) || strVal.toUpperCase().startsWith('TEAM');
        if (isHeader) {
          break;
        }
        extracted.push(row);
      }
    }

    if (extracted.length > 0) {
      return { data: extracted, source: 'other_acc_extracted' };
    }
  }

  return { data: [], source: 'none' };
}

async function run() {
  console.log('Testing AWD:', await testFetch('awd', 'q2'));
  console.log('Testing COVA:', await testFetch('cova', 'q2'));
  console.log('Testing RM:', await testFetch('rm', 'q2'));
  console.log('Testing OTHER_ACC:', await testFetch('other_acc', 'q2'));
}

run();
