import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { isTrainerEmployee } from '../lib/trainer-position';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFormulas() {
  const [{ data: employees }, { data: roles }, { data: positions }] = await Promise.all([
    supabase.from('employees').select('id, employee_code, employee_name, hire_date, role_id, position_id'),
    supabase.from('roles').select('role_id, role_name'),
    supabase.from('positions').select('position_id, position_name, position_code'),
  ]);
  const { data: profiles } = await supabase.from('trainers_profile').select('*');

  const profileMap = new Map();
  profiles?.forEach(p => profileMap.set(String(p.employee_num), p));

  const roleById = new Map((roles || []).map(role => [Number(role.role_id), role.role_name]));
  const positionById = new Map((positions || []).map(position => [Number(position.position_id), position]));
  const trainers = (employees || []).filter(employee =>
    isTrainerEmployee(positionById.get(Number(employee.position_id)), roleById.get(Number(employee.role_id))),
  );

  const { data: attData } = await supabase.from('trainer_attendance_strat').select('*');

  trainers?.slice(0, 5).forEach(t => {
    const prof = profileMap.get(String(t.employee_code)) || {};
    const tRows = attData?.filter(r => String(r.trainer_id) === String(t.id) || String(r.trainer_id) === String(t.employee_code)) || [];

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

    console.log(`Trainer: ${prof.name || t.employee_name || t.employee_code}`);
    console.log(`  Start Date: prof="${prof.start_date}" t="${t.hire_date}"`);
    console.log(`  Total: ${tRows.length}, P: ${present}, ABS: ${abs}, VL: ${vl}, SL: ${sl}, L: ${l}, HOL: ${hol}, RD: ${rd}`);
    console.log(`  Calculated -> Attendance Rate: ${attRate}, Reliability Rate: ${relRate}`);
    console.log('---');
  });
}

testFormulas();
