import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: trainers, error } = await supabaseAdmin.from('trainers').select('*');
  console.log('Trainers count:', trainers?.length, 'Error:', error);
  if (trainers && trainers.length > 0) {
    console.log('First trainer:', trainers[0]);
  }
}

test();
