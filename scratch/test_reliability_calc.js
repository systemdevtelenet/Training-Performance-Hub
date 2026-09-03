const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCalc() {
  const { data: trainers } = await supabase.from('trainers').select('*');
  const { data: profiles } = await supabase.from('trainers_profile').select('*');
  const { data: att } = await supabase.from('trainer_attendance_strat').select('*');

  const lossTypes = ['SL', 'VL', 'ML', 'PL', 'HOL', 'SUS', 'MED', 'BL', 'ABS', 'A', 'UND', 'UT'];

  console.log(`Total trainers: ${trainers?.length}, Total att records: ${att?.length}`);

  const profileMap = new Map();
  (profiles || []).forEach(p => profileMap.set(p.employee_num, p.name));

  const stats = new Map();
  (att || []).forEach(r => {
    const tId = r.trainer_id;
    if (!stats.has(tId)) {
      stats.set(tId, { present: 0, losses: 0, lossBreakdown: {} });
    }
    const st = stats.get(tId);
    const code = (r.status || '').trim().toUpperCase();

    if (code === 'P') {
      st.present++;
    } else if (lossTypes.some(lt => code.includes(lt))) {
      st.losses++;
      st.lossBreakdown[code] = (st.lossBreakdown[code] || 0) + 1;
    }
  });

  (trainers || []).slice(0, 10).forEach(t => {
    const name = profileMap.get(t.employee_num) || t.trainer_id;
    const st = stats.get(t.trainer_id) || { present: 0, losses: 0, lossBreakdown: {} };
    const total = st.present + st.losses;
    const rate = total > 0 ? ((st.present / total) * 100).toFixed(1) + '%' : '0.0%';
    console.log(`Trainer: ${name} | Present: ${st.present} | Losses: ${st.losses} | Rate: ${rate} | Breakdown:`, st.lossBreakdown);
  });
}

testCalc().catch(console.error);
