import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.from('trainer_attendance_strat').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample Data:', data[0]);
  }
}

main();
