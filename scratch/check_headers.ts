import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('trainers_attendance_strat').select('*');
  if (error) {
    console.error('Error fetching trainers_attendance_strat:', error);
  } else {
    const headers = data?.filter(row => !row.name) || [];
    console.log('Header rows:', JSON.stringify(headers, null, 2));
    console.log('Total rows:', data?.length);
  }
}

main();
