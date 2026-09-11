const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkDynamicAccounts() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  const res = await fetch(url, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  const tables = Object.keys(data.definitions || {});
  console.log('Total definitions:', tables.length);
  const tfTables = tables.filter(t => t.startsWith('traffic_light_mon_'));
  console.log('Traffic light mon tables:', tfTables);
}

checkDynamicAccounts();
