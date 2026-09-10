const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findUser() {
  console.log('--- Searching trainers_profile ---');
  const { data: tp } = await supabase.from('trainers_profile').select('*').or('gmail_account.ilike.%colonia%,thunderbird_account.ilike.%colonia%,name.ilike.%colonia%');
  console.log('trainers_profile:', tp);

  console.log('--- Searching trainers ---');
  const { data: tr } = await supabase.from('trainers').select('*').or('name.ilike.%colonia%,employee_num.eq.1772,employee_num.eq.CTNP-1772');
  console.log('trainers:', tr);

  console.log('--- Searching employees ---');
  const { data: emp } = await supabase.from('employees').select('*').or('employee_email.ilike.%colonia%,employee_name.ilike.%colonia%,employee_code.ilike.%1772%');
  console.log('employees:', emp);

  console.log('--- Searching auth users ---');
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('auth error:', authErr);
  } else {
    const matched = authUsers.users.filter(u => u.email && (u.email.includes('colonia') || u.email.includes('1772')));
    console.log('Matched auth users:', matched.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
  }

  console.log('--- Searching user_roles ---');
  const { data: ur } = await supabase.from('user_roles').select('*').ilike('email', '%colonia%');
  console.log('user_roles:', ur);
}

findUser();
