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

async function checkOrCreateTable() {
  const { data: testCheck, error: checkErr } = await supabase.from('training_activity_logs').select('*').limit(1);
  console.log('training_activity_logs exists?', !checkErr, checkErr?.message);

  if (checkErr) {
    console.log('Attempting to create table via RPC or sql if available...');
    // test if rpc exists or if we can use postgres
  }
}

checkOrCreateTable();
