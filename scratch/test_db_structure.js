const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspect() {
  console.log('=== TRAINERS PROFILE ===');
  const { data: tp, error: errTp } = await supabase.from('trainers_profile').select('*');
  if (errTp) console.error(errTp);
  else console.log(JSON.stringify(tp, null, 2));

  console.log('=== EMPLOYEES (trainer records are identified by employee roles/positions) ===');
  const { data: emp, error: errEmp } = await supabase.from('employees').select('*').limit(3);
  if (errEmp) console.error(errEmp);
  else console.log(JSON.stringify(emp, null, 2));
}

inspect();
