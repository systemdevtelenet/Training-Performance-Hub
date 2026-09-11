const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// load env
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: emp, error: e1 } = await supabase.from('employees').select('*').limit(3);
  console.log('Employees sample:', emp, e1);
  const { data: roles, error: e2 } = await supabase.from('roles').select('*');
  console.log('roles table:', roles, e2);
  const { data: userRoles, error: e3 } = await supabase.from('user_roles').select('*').limit(10);
  console.log('user_roles table:', userRoles, e3);
}
run();
