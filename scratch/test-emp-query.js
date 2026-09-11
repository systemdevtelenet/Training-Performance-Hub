require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
  const cleanEmail = 'nreguero.telenet@gmail.com';
  const empNum = '1597';

  const query = `employee_email.ilike.${cleanEmail}${empNum ? `,employee_code.eq."${empNum}"` : ''}`;
  console.log('Query:', query);

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .or(query)
    .maybeSingle();

  console.log('Employees result:', data, 'error:', error);
}

test();
