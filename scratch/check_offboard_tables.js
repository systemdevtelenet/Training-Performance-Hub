const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkTables() {
  const { data: t1, error: e1 } = await supabase.from('offboarding_requests').select('*').limit(1);
  console.log('offboarding_requests table:', !e1, e1?.message);

  const { data: t2, error: e2 } = await supabase.from('onboarding_trainees').select('*').limit(1);
  console.log('onboarding_trainees table:', !e2, e2?.message);

  const { data: t3, error: e3 } = await supabase.from('traffic_light_metrics').select('*').limit(1);
  console.log('traffic_light_metrics table:', !e3, e3?.message);
}

checkTables();
