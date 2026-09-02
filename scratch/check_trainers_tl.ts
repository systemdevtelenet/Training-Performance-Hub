import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.rpc('get_tables'); // Or some query
  // Wait, supabase doesn't have an easy way to list tables via JS client without RPC.
  // Instead I'll just check if a 'trainers' table exists in traffic lights.
  const { data: d1, error: e1 } = await supabase.from('traffic_light_mon_trainers_q1').select('*').limit(1);
  console.log('traffic_light_mon_trainers_q1:', d1, e1?.message);
}

main();
