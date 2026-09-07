import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function inspectEmployeesTable() {
  console.log('Fetching sample from public.employees...');
  const { data, error } = await supabaseAdmin.from('employees').select('*').limit(5);
  if (error) {
    console.error('Error fetching employees table:', error);
  } else {
    console.log(`Found ${data?.length} rows.`);
    if (data && data.length > 0) {
      console.log('Columns of employees table:', Object.keys(data[0]));
      console.log('Sample row 0:', data[0]);
    }
  }

  // Also count total, active, inactive if status column exists
  const { count: totalCount } = await supabaseAdmin.from('employees').select('*', { count: 'exact', head: true });
  console.log('Total count in employees table:', totalCount);
}

inspectEmployeesTable();
