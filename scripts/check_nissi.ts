import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFormulas() {
  const { data: trainers } = await supabase.from('trainers').select('*');
  const { data: profiles } = await supabase.from('trainers_profile').select('*');

  const profileMap = new Map();
  profiles?.forEach(p => profileMap.set(p.employee_num, p));

  const { data: attData } = await supabase.from('trainer_attendance_strat').select('*');

  trainers?.slice(0, 5).forEach(t => {
    const prof = profileMap.get(t.employee_num) || {};
    const tRows = attData?.filter(r => r.trainer_id === t.trainer_id) || [];

    const present = tRows.filter(r => (r.status || '').toUpperCase() === 'P').length;
    const abs = tRows.filter(r => ['A', 'ABS'].includes((r.status || '').toUpperCase())).length;
    const vl = tRows.filter(r => (r.status || '').toUpperCase().includes('VL')).length;
    const sl = tRows.filter(r => (r.status || '').toUpperCase().includes('SL')).length;
    const hol = tRows.filter(r => (r.status || '').toUpperCase().includes('HOL')).length;
    const rd = tRows.filter(r => (r.status || '').toUpperCase().includes('RD')).length;
    const l = tRows.filter(r => (r.status || '').toUpperCase() === 'L').length;

    const totalWorking = tRows.length - rd - hol;
    const attRate = totalWorking > 0 ? ((totalWorking - abs) / totalWorking * 100).toFixed(1) + '%' : '0.0%';
    const relRate = totalWorking > 0 ? ((totalWorking - abs - vl - sl - l) / totalWorking * 100).toFixed(1) + '%' : '0.0%';

    console.log(`Trainer: ${prof.name || t.employee_num}`);
    console.log(`  Start Date: prof="${prof.start_date}" t="${t.start_date}"`);
    console.log(`  Total: ${tRows.length}, P: ${present}, ABS: ${abs}, VL: ${vl}, SL: ${sl}, L: ${l}, HOL: ${hol}, RD: ${rd}`);
    console.log(`  Calculated -> Attendance Rate: ${attRate}, Reliability Rate: ${relRate}`);
    console.log('---');
  });
}

testFormulas();
