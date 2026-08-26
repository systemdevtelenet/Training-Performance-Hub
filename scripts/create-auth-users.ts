import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// WARNING: You MUST use the Service Role Key here, NOT the Anon Key.
// The Anon Key does not have permission to bypass auth and create users directly.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create a Supabase client with the Service Role Key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrateUsers() {
  console.log('🔄 Fetching employees from public."Employee Details"...');

  // Fetch all employees
  const { data: employees, error: fetchError } = await supabaseAdmin
    .from('Employee Details') // Ensure this exactly matches your table name
    .select('"EMPLOYEE ID", "EMPLOYEE NAME", "EMPLOYEE EMAIL", "ROLE"');

  if (fetchError) {
    console.error('❌ Error fetching employees:', fetchError);
    return;
  }

  if (!employees || employees.length === 0) {
    console.log('⚠️ No employees found in the table.');
    return;
  }

  console.log(`✅ Found ${employees.length} employees. Starting user creation...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const employee of employees) {
    const email = employee['EMPLOYEE EMAIL'];
    const password = employee['EMPLOYEE ID']; // Using Employee ID as password
    const name = employee['EMPLOYEE NAME'];
    const role = employee['ROLE'];

    if (!email || !password) {
      console.log(`⏭️ Skipping ${name || 'Unknown'} - Missing email or ID.`);
      continue;
    }

    try {
      // Use the Admin API to create the user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm their email so they can log in immediately
        user_metadata: {
          name: name,
          role: role,
        },
      });

      if (error) {
        // If the user already exists, it will throw an error, which is fine to skip
        console.error(`❌ Failed to create user ${email}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Created user: ${email}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Unexpected error creating ${email}:`, err);
      errorCount++;
    }
  }

  console.log('\n=============================================');
  console.log(`🎉 Migration Complete!`);
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`❌ Failed/Skipped: ${errorCount}`);
  console.log('=============================================');
}

migrateUsers();
