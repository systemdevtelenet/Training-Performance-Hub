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

async function getAccounts() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  const res = await fetch(url, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await res.json();
  const tables = Object.keys(data.definitions || {});
  
  const accounts = new Set();
  tables.forEach(t => {
    if (t.startsWith('traffic_light_mon_')) {
      // e.g. traffic_light_mon_rm_q1 -> rm
      const clean = t.replace('traffic_light_mon_', '').trim();
      const parts = clean.split('_');
      if (parts.length >= 2) {
        const accId = parts.slice(0, -1).join('_');
        accounts.add(accId);
      }
    }
  });

  console.log('DYNAMIC TRAFFIC LIGHT ACCOUNTS FROM SUPABASE SCHEMA:');
  console.log(Array.from(accounts));
}

getAccounts();
