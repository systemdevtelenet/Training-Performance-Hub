import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createSuperAdmin() {
  const email = 'bosssilver.telenet@gmail.com';
  const password = 'CTN-4567';

  console.log(`Creating SUPER_ADMIN user: ${email}...`);

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
        console.log("User already exists in Auth. We will just ensure they have SUPER_ADMIN role.");
    } else {
        console.error("Error creating Auth user:", authError);
        process.exit(1);
    }
  } else {
    console.log("Successfully created user in Auth. ID:", authData.user.id);
  }

  // 2. Upsert into public.user_roles as SUPER_ADMIN (primary key is email)
  const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ 
          email: email, 
          role: 'SUPER_ADMIN' 
      }, { onConflict: 'email' });

  if (roleError) {
      console.error("Error assigning SUPER_ADMIN role:", roleError);
      process.exit(1);
  }

  console.log("Successfully assigned SUPER_ADMIN role!");
  
  // 3. Ensure they exist in the employees table just so the UI has their name (optional)
  const { error: empError } = await supabase
      .from('employees')
      .upsert({
          employee_email: email,
          employee_code: '4567',
          employee_name: 'Boss Silver',
          employee_position: 'SUPER_ADMIN'
      }, { onConflict: 'employee_email' });

  if (empError) {
      console.error("Note: could not insert into employees table (maybe schema diff).", empError);
  } else {
      console.log("Successfully inserted placeholder in employees table.");
  }
}

createSuperAdmin();
