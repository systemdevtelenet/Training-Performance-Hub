const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findBiancaAllAccounts() {
  console.log('=== CHECK EMPLOYEES ===');
  const { data: emps } = await supabase.from('employees').select('*').ilike('employee_name', '%bianca%');
  console.log(emps);

  console.log('=== CHECK TRAINERS PROFILE ===');
  const { data: tp } = await supabase.from('trainers_profile').select('*').ilike('trainer_name', '%bianca%');
  console.log(tp);

  console.log('=== CHECK TRAINERS ===');
  const { data: tr } = await supabase.from('trainers').select('*').ilike('name', '%bianca%');
  console.log(tr);

  console.log('=== CHECK PRODUCT SPEC TRAINING ASSIGNED TRAINER ===');
  const { data: pst } = await supabase.from('product_spec_training').select('account, assigned_trainer').ilike('assigned_trainer', '%bianca%');
  const pstAccounts = Array.from(new Set(pst.map(r => r.account)));
  console.log('PST Accounts:', pstAccounts);

  console.log('=== CHECK INHOUSE ===');
  const { data: ih } = await supabase.from('inhouse').select('*');
  const ihMatched = (ih || []).filter(r => JSON.stringify(r).toLowerCase().includes('bianca'));
  console.log('Inhouse Matched:', ihMatched);

  // Check all available traffic light tables and see where Bianca or her trainees appear
  console.log('=== TRAFFIC LIGHT TABLES CHECK ===');
  const { data: monTrainers } = await supabase.from('traffic_light_mon_trainers_q2').select('*').limit(20);
  console.log('Traffic light trainers q2 names:', monTrainers ? monTrainers.map(r => r.TRAINERS || r.name || r.Teams) : []);
}

findBiancaAllAccounts();
