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

async function inspect() {
  const tables = [
    'inhouse', 'product_spec_training', 'pst',
    'trainers', 'trainers_profile', 'trainer_attendance_strat',
    'traffic_light_mon_rm_q1', 'traffic_light_mon_rm_q2', 'traffic_light_mon_rm_q3',
    'trainees', 'activity_logs'
  ];

  for (const t of tables) {
    const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table '${t}': Error (${error.message})`);
    } else {
      console.log(`Table '${t}': ${count} rows`);
    }
  }
}

inspect();
