const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testUpsert() {
  const sourceKey = `offboard_pending::test_trainee`;
  const payloadDetails = {
    traineeName: 'Test Trainee',
    trainingType: 'PST',
    batchName: 'RM -1',
    accountName: 'RM',
    assignedTrainer: 'Krisland Pepito',
    status: 'RESIGNED',
    departureDate: '2026-10-01',
    reasonCategory: 'Career Opportunity',
    remarks: 'Test notes',
    requestedBy: 'Krisland Pepito',
    requestedAt: new Date().toISOString()
  };

  // 1. Delete existing row if any
  await supabase.from('traffic_light_metrics').delete().eq('source_table', sourceKey);

  // 2. Insert new record
  const { data, error } = await supabase.from('traffic_light_metrics').insert({
    source_table: sourceKey,
    metric_group: 'offboard_pending',
    metric_date: '2026-10-01',
    traffic_status: 'Pending Approval',
    remarks: JSON.stringify(payloadDetails)
  });

  console.log('Insert result:', data, error);

  // Clean up
  await supabase.from('traffic_light_metrics').delete().eq('source_table', sourceKey);
  console.log('Cleaned up test record');
}

testUpsert();
