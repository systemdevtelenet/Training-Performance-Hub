import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  const { data: statuses } = await supabaseAdmin.from('statuses').select('*');
  console.log('--- STATUSES ---', statuses);

  const { data: roles } = await supabaseAdmin.from('roles').select('*');
  console.log('--- ROLES ---', roles);

  const { data: accounts } = await supabaseAdmin.from('accounts').select('*');
  console.log('--- ACCOUNTS ---', accounts);

  const { data: assignments } = await supabaseAdmin.from('employee_assignments').select('*').limit(5);
  console.log('--- EMPLOYEE ASSIGNMENTS ---', assignments);

  // Check sample 10 employees
  const { data: sampleEmployees } = await supabaseAdmin.from('employees').select('*').limit(10);
  console.log('--- SAMPLE EMPLOYEES ---', sampleEmployees);
}

inspectTables();
