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

async function testFlow() {
  console.log('Testing roles fetch...');
  const { data: roles } = await supabase.from('roles').select('*');
  console.log('Roles found:', roles.map(r => `${r.role_id}: ${r.role_name}`));

  console.log('Testing employees with role_id...');
  const { data: emps } = await supabase.from('employees').select('id, employee_name, employee_code, role_id, status_id').limit(5);
  console.log('Employees:', emps);
}

testFlow();
