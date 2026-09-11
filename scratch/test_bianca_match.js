const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testTrainerMatch() {
  const { data: ih } = await supabase.from('inhouse').select('name, assigned_trainer, account');
  const { data: pst } = await supabase.from('product_spec_training').select('name, assigned_trainer, account');

  const all = [...(ih || []), ...(pst || [])];
  const trainerName = 'Bianca Kaye Ernestine Colonia';
  const trainerEmail = 'bcolonia@cebutelenet.com';

  console.log('Total trainees in DB:', all.length);
  const matched = all.filter(t => {
    const assigned = (t.assigned_trainer || '').toLowerCase();
    return assigned.includes('bianca') || assigned.includes('bcolonia');
  });
  console.log('Matched count for Bianca:', matched.length);
  const accounts = Array.from(new Set(matched.map(m => m.account)));
  console.log('Matched accounts in DB:', accounts);
}

testTrainerMatch();
