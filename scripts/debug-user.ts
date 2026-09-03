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
  const targetEmail = 'blampago.telenet@gmail.com';
  
  // Get all auth users with pagination
  let allUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data || data.users.length === 0) break;
    allUsers.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  
  console.log(`Total Auth Users in DB: ${allUsers.length}`);
  const user = allUsers.find(u => u.email === targetEmail);
  console.log('Found user in Auth DB?', user ? `YES (ID: ${user.id})` : 'NO');
  
  if (user) {
    // Force update password to CTNP-2630
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'CTNP-2630'
    });
    console.log('Password update result:', updateError ? updateError.message : 'SUCCESSFULLY UPDATED TO CTNP-2630');
  }
}

check();
