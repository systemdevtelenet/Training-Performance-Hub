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

async function inspectColumns() {
  console.log('--- INHOUSE SAMPLE ---');
  const { data: ih } = await supabase.from('inhouse').select('*').limit(2);
  console.log(ih);

  console.log('--- PST SAMPLE ---');
  const { data: pst } = await supabase.from('product_spec_training').select('*').limit(2);
  console.log(pst);

  console.log('--- TRAINEES SAMPLE ---');
  const { data: tr } = await supabase.from('trainees').select('*').limit(2);
  console.log(tr);
}

inspectColumns();
