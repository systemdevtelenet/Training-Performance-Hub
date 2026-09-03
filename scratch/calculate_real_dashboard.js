const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function calculateRealData() {
  const { data: inhouse } = await supabase.from('inhouse').select('*');
  const { data: pst } = await supabase.from('product_spec_training').select('*');
  const { data: trainers } = await supabase.from('trainers').select('*');

  const inhouseList = inhouse || [];
  const pstList = pst || [];
  const trainersList = trainers || [];

  const totalTrainees = inhouseList.length + pstList.length;
  const activeTrainers = trainersList.filter(t => (t.status || '').toUpperCase() === 'ACTIVE' || !t.status).length || trainersList.length;

  // Calculate attrition
  let totalLosses = 0;
  const lossStatuses = ['FAILED', 'RESIGNED', 'TERMINATED', 'AWOL', 'RED', 'ACCOUNT REMOVED'];

  inhouseList.forEach(t => {
    const s = (t.status || '').toUpperCase();
    if (lossStatuses.some(ls => s.includes(ls))) totalLosses++;
  });

  pstList.forEach(t => {
    const s = (t.status || '').toUpperCase();
    if (lossStatuses.some(ls => s.includes(ls))) totalLosses++;
  });

  const overallAttrition = totalTrainees > 0 ? ((totalLosses / totalTrainees) * 100).toFixed(1) + '%' : '0.0%';

  // Count distinct batches / classes
  const batchSet = new Set();
  inhouseList.forEach(t => { if (t.batch) batchSet.add(`IH-${t.batch}`); });
  pstList.forEach(t => { if (t.wave) batchSet.add(`PST-${t.wave}`); });

  console.log('REAL DASHBOARD METRICS:');
  console.log({
    totalTrainees,
    overallAttrition,
    activeTrainers,
    classesInSession: batchSet.size,
    inhouseCount: inhouseList.length,
    pstCount: pstList.length
  });
}

calculateRealData();
