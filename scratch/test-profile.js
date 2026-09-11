require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
  const cleanEmail = 'nreguero.telenet@gmail.com';
  console.log('Testing for:', cleanEmail);

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('*')
    .ilike('email', cleanEmail);
  console.log('user_roles:', roleData, 'error:', roleError);

  const { data: trainerData, error: trError } = await supabaseAdmin
    .from('trainers_profile')
    .select('*')
    .or(`gmail_account.ilike.${cleanEmail},thunderbird_account.ilike.${cleanEmail}`);
  console.log('trainers_profile:', trainerData, 'error:', trError);

  const { data: authList, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const matchedAuth = authList?.users?.find(u => u.email?.toLowerCase().trim() === cleanEmail);
  console.log('matchedAuth:', matchedAuth?.email, matchedAuth?.user_metadata);
}

test();
