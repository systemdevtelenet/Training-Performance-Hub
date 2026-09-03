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

async function checkUser() {
  const { data: users, error: err1 } = await supabase.auth.admin.listUsers();
  console.log('SUPABASE AUTH USERS:');
  (users?.users || []).forEach(u => {
    console.log(`- Email: ${u.email}, ID: ${u.id}`);
  });

  const { data: roles, error: err2 } = await supabase.from('user_roles').select('*');
  console.log('\nUSER ROLES TABLE:');
  console.log(roles);
}

checkUser().catch(console.error);
