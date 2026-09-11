const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspect() {
  const { data: inhouse, error: ihErr } = await supabase.from('inhouse').select('*').limit(3);
  console.log('=== INHOUSE SAMPLE ===', inhouse ? Object.keys(inhouse[0] || {}) : ihErr);
  if (inhouse && inhouse[0]) console.log(inhouse[0]);

  const { data: pst, error: pstErr } = await supabase.from('product_spec_training').select('*').limit(3);
  console.log('=== PST SAMPLE ===', pst ? Object.keys(pst[0] || {}) : pstErr);
  if (pst && pst[0]) console.log(pst[0]);

  // Check unique values in trainer/trainers/assigned_trainer in inhouse and pst
  const { data: allIh } = await supabase.from('inhouse').select('*');
  const ihTrainerCols = allIh ? Object.keys(allIh[0] || {}).filter(k => k.toLowerCase().includes('train')) : [];
  console.log('=== INHOUSE TRAINER COLS ===', ihTrainerCols);

  const { data: allPst } = await supabase.from('product_spec_training').select('*');
  const pstTrainerCols = allPst ? Object.keys(allPst[0] || {}).filter(k => k.toLowerCase().includes('train')) : [];
  console.log('=== PST TRAINER COLS ===', pstTrainerCols);

  // Check how Bianca's trainees are assigned or how trainers are linked to batches/accounts
  if (allIh) {
    const matchedIh = allIh.filter(row => JSON.stringify(row).toLowerCase().includes('bianca'));
    console.log('=== INHOUSE ROWS WITH BIANCA ===', matchedIh.length);
    if (matchedIh.length > 0) console.log(matchedIh[0]);
  }

  if (allPst) {
    const matchedPst = allPst.filter(row => JSON.stringify(row).toLowerCase().includes('bianca'));
    console.log('=== PST ROWS WITH BIANCA ===', matchedPst.length);
    if (matchedPst.length > 0) console.log(matchedPst[0]);
  }
}

inspect();
