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

async function updateRole() {
  const { data, error } = await supabase
    .from('user_roles')
    .upsert({ email: 'bosssilver.telenet@gmail.com', role: 'VIEW_ADMIN' });

  if (error) {
    console.error('Error updating role:', error);
  } else {
    console.log('SUCCESSFULLY SET bosssilver.telenet@gmail.com ROLE TO VIEW_ADMIN!');
  }
}

updateRole();
