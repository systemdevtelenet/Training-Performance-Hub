import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: inhouse, error: err1 } = await supabase.from('INHOUSE').select('*').limit(1);
  const { data: pst, error: err2 } = await supabase.from('PST').select('*').limit(1);

  console.log('--- INHOUSE TABLE ---');
  if (err1) console.error(err1);
  console.log(inhouse);
  
  console.log('--- PST TABLE ---');
  if (err2) console.error(err2);
  console.log(pst);
}

main();
