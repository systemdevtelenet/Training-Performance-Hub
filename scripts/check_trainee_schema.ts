import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: inhouse, error: err1 } = await supabase.from('inhouse').select('*').limit(2);
  const { data: pst, error: err2 } = await supabase.from('product_spec_training').select('*').limit(2);

  console.log('--- inhouse sample keys ---');
  if (err1) console.error('inhouse error:', err1);
  if (inhouse && inhouse[0]) {
    console.log(Object.keys(inhouse[0]));
    console.log('Sample inhouse row:', inhouse[0]);
  }

  console.log('--- product_spec_training sample keys ---');
  if (err2) console.error('pst error:', err2);
  if (pst && pst[0]) {
    console.log(Object.keys(pst[0]));
    console.log('Sample pst row:', pst[0]);
  }
}

main();
