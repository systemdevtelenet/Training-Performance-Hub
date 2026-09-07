import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testAwd() {
  const { data, error } = await supabaseAdmin.from('traffic_light_mon_other_acc_q2').select('*');
  console.log('Other Acc Q2 Data count:', data?.length);

  if (data) {
    let targetAccount = 'AWD';
    let capturing = false;
    const awdRows: any[] = [];

    for (const row of data) {
      const keys = Object.keys(row);
      const nameCol = keys.find(k => ['teams', 'name', 'trainers', 'trainer', 'employee', 'staff'].includes(k.toLowerCase())) || keys[0];
      const val = String(row[nameCol] || '').trim();

      if (!val || val.toLowerCase() === 'null') continue;

      if (val.toUpperCase().includes('AWD')) {
        capturing = true;
        awdRows.push(row);
        continue;
      }

      if (capturing) {
        // If we hit another section header like COVA, SOAs, etc., stop capturing for AWD
        if (['COVA', 'SOAS', 'FLEXAR', 'HH', 'JS', 'ONO', 'MM TRANSPO'].includes(val.toUpperCase()) || val.toUpperCase().startsWith('TEAM')) {
          break;
        }
        awdRows.push(row);
      }
    }

    console.log('AWD extracted rows:', awdRows);
  }
}

testAwd();
