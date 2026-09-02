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
  
  // Try fetching from employees table first, then trainers_profile if it fails
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
    
    // Map trainers to expected structure
    employeeData = (trainers || []).map(t => ({
      email: t.gmail_account,
      password: t.employee_num,
      name: t.name,
      role: t.position
    }));
  } else {
    // Map employees to expected structure
    employeeData = (employees || []).map(e => ({
      email: e.employee_email,
      password: e.employee_code,
      name: e.employee_name,
      role: 'EMPLOYEE'
    }));
  }

  const validEmployees = employeeData.filter(e => e.email && e.password);
  console.log(`Found ${validEmployees.length} employees with both email and code.`);

  let createdCount = 0;
  let existsCount = 0;
  let errorCount = 0;

  for (const emp of validEmployees) {
    const email = emp.email.trim();
    // Prefix with CTNP- to satisfy Supabase's 6-character minimum requirement
    const baseCode = String(emp.password).trim();
    const password = baseCode.length >= 6 ? baseCode : `CTNP-${baseCode}`;

    // Attempt to create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: emp.name,
        role: emp.role,
        is_imported: true
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        existsCount++;
      } else {
        console.error(`Error creating ${email}:`, authError.message);
        errorCount++;
      }
    } else {
      console.log(`Successfully created Auth user for: ${email}`);
      createdCount++;
    }
  }

  console.log('\n--- SYNC COMPLETE ---');
  console.log(`Created: ${createdCount}`);
  console.log(`Already Existed: ${existsCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('---------------------');
  console.log('These users can now log in using their email and employee code as their password.');
}

syncAuthUsers().catch(console.error);
