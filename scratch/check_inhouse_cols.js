const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('inhouse').select('*').limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    console.log('INHOUSE_COLUMNS:', JSON.stringify(keys));
  }
}

main();
