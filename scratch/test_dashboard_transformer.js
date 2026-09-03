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
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testTransformer() {
  const { data: inhouseData } = await supabaseAdmin.from('inhouse').select('*');
  const { data: pstData } = await supabaseAdmin.from('product_spec_training').select('*');
  const { data: trainersData } = await supabaseAdmin.from('trainers').select('*');

  const inhouseList = inhouseData || [];
  const pstList = pstData || [];
  const trainersList = trainersData || [];

  const totalTrainees = inhouseList.length + pstList.length;
  const activeTrainers = trainersList.filter(t => (t.status || '').toUpperCase() === 'ACTIVE' || !t.status).length || trainersList.length;

  const lossStatuses = ['FAILED', 'RESIGNED', 'TERMINATED', 'AWOL', 'RED', 'ACCOUNT REMOVED'];

  let totalLosses = 0;
  let totalPresent = 0;
  let totalAttLogs = 0;

  const inhouseGroups = {};
  inhouseList.forEach(item => {
    const accountName = item.account || item.acount || 'General';
    const batchName = item.batch ? `Batch ${item.batch}` : 'Unassigned';

    if (!inhouseGroups[accountName]) inhouseGroups[accountName] = {};
    if (!inhouseGroups[accountName][batchName]) inhouseGroups[accountName][batchName] = { members: [] };

    const statusUpper = (item.status || '').toUpperCase();
    const isLoss = lossStatuses.some(ls => statusUpper.includes(ls));
    if (isLoss) totalLosses++;

    inhouseGroups[accountName][batchName].members.push({
      id: item.id || item.name,
      name: item.name,
      status: item.status || 'ACTIVE',
      accountName,
      batchName,
      month: item.month || 'January',
      quarter: item.quarter || 'Q1',
      isLoss,
      p: 5,
      a: isLoss ? 1 : 0
    });
  });

  const pstGroups = {};
  pstList.forEach(item => {
    const accountName = item.account || 'General';
    const batchName = item.wave ? `Wave ${item.wave}` : item.batchName || 'Unassigned';

    if (!pstGroups[accountName]) pstGroups[accountName] = {};
    if (!pstGroups[accountName][batchName]) pstGroups[accountName][batchName] = { members: [] };

    const statusUpper = (item.status || '').toUpperCase();
    const isLoss = lossStatuses.some(ls => statusUpper.includes(ls));
    if (isLoss) totalLosses++;

    pstGroups[accountName][batchName].members.push({
      id: item.id || item.name,
      name: item.name,
      status: item.status || 'ACTIVE',
      accountName,
      batchName,
      month: item.month || 'January',
      quarter: item.quarter || 'Q1',
      isLoss,
      p: 5,
      a: isLoss ? 1 : 0
    });
  });

  const batchSet = new Set();
  Object.keys(inhouseGroups).forEach(acc => Object.keys(inhouseGroups[acc]).forEach(b => batchSet.add(`IH-${acc}-${b}`)));
  Object.keys(pstGroups).forEach(acc => Object.keys(pstGroups[acc]).forEach(b => batchSet.add(`PST-${acc}-${b}`)));

  const overallAttrition = totalTrainees > 0 ? ((totalLosses / totalTrainees) * 100).toFixed(1) + '%' : '0.0%';

  const result = {
    metrics: {
      totalTrainees,
      overallAttrition,
      activeTrainers,
      classesInSession: batchSet.size
    },
    inhouse: { groups: inhouseGroups },
    pst: { groups: pstGroups },
    summary: {
      trainersSummary: {
        headcount: totalTrainees,
        attendanceRate: '98.5%',
        reliabilityRate: '97.2%',
        attritionRate: overallAttrition,
        totalLosses
      }
    }
  };

  console.log('TRANSFORMER METRICS SUMMARY:');
  console.log(result.metrics);
  console.log('Inhouse accounts:', Object.keys(inhouseGroups));
  console.log('PST accounts:', Object.keys(pstGroups));
}

testTransformer();
