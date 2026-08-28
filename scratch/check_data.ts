import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('trainers_profile').select('*').limit(3);
  if (error) {
    console.error('Error fetching trainers_profile:', error);
  } else {
    console.log('trainers_profile count:', data.length);
  }

  const { data: d2, error: e2 } = await supabase.from('trainers').select('*').limit(3);
  if (e2) {
    console.error('Error fetching trainers:', e2);
  } else {
    console.log('trainers count:', d2.length);
  }
}

main();
