import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: authUsers, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  
  const kciudad = authUsers?.users.find(u => u.email === 'kciudad.telenet@gmail.com');
  console.log('Is kciudad in Auth DB?', kciudad ? 'YES' : 'NO');
  
  const { data: dbData } = await supabase.from('trainers_profile').select('gmail_account, employee_num').ilike('gmail_account', '%kciudad%');
  console.log('DB Record:', dbData);
}

check();
