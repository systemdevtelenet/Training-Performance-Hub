import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAuthUsers() {
  console.log('Fetching employees from the database...');
  
  // 1. Fetch all employees from DB
  let employeeData: any[] = [];
  
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('employee_email, employee_code, employee_name');
    
  if (empError) {
    console.log('Failed to fetch from employees table, trying trainers_profile...', empError.message);
    const { data: trainers, error: trainerError } = await supabase
      .from('trainers_profile')
      .select('gmail_account, employee_num, name, position');
      
    if (trainerError) {
       console.error('Failed to fetch from trainers_profile too', trainerError);
       process.exit(1);
    }
    
    employeeData = (trainers || []).map(t => ({
      email: t.gmail_account,
      password: t.employee_num,
      name: t.name,
      role: t.position
    }));
  } else {
    employeeData = (employees || []).map(e => ({
      email: e.employee_email,
      password: e.employee_code,
      name: e.employee_name,
      role: 'EMPLOYEE'
    }));
  }

  const validEmployees = employeeData.filter(e => e.email && e.password && e.email.includes('@'));
  console.log(`Found ${validEmployees.length} valid employee records.`);

  // 2. Fetch all existing Auth users in Supabase using pagination
  console.log('Fetching existing Auth users...');
  const existingUsersMap = new Map<string, string>(); // email -> user.id
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data || data.users.length === 0) break;
    for (const u of data.users) {
      if (u.email) existingUsersMap.set(u.email.toLowerCase(), u.id);
    }
    if (data.users.length < 1000) break;
    page++;
  }
  console.log(`Loaded ${existingUsersMap.size} existing Auth users.`);

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  // 3. Process each employee: update password if exists, or create new user
  for (const emp of validEmployees) {
    const email = emp.email.trim().toLowerCase();
    const baseCode = String(emp.password).trim();
    const password = baseCode.length >= 6 ? baseCode : `CTNP-${baseCode}`;
    const existingId = existingUsersMap.get(email);

    if (existingId) {
      // Update existing user's password to match expected format
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existingId, {
        password: password,
        user_metadata: {
          name: emp.name,
          role: emp.role,
          is_imported: true
        }
      });
      if (updateErr) {
        console.error(`Error updating ${email}:`, updateErr.message);
        errorCount++;
      } else {
        updatedCount++;
      }
    } else {
      // Create new user
      const { error: createErr } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: emp.name,
          role: emp.role,
          is_imported: true
        }
      });

      if (createErr) {
        console.error(`Error creating ${email}:`, createErr.message);
        errorCount++;
      } else {
        console.log(`Successfully created Auth user for: ${email}`);
        createdCount++;
      }
    }
  }

  console.log('\n--- SYNC COMPLETE ---');
  console.log(`Created New: ${createdCount}`);
  console.log(`Updated Passwords: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('---------------------');
  console.log('All employee passwords have been synchronized!');
}

syncAuthUsers().catch(console.error);
