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

function isTrainingLog(row) {
  if (!row) return false;
  const title = (row.title || '').toLowerCase();
  const desc = (row.description || '').toLowerCase();
  const url = (row.action_url || '').toLowerCase();

  // Explicitly reject any QA, QAS, Evaluation, Calibration or other non-training system events
  if (
    title.includes('evaluation') ||
    title.includes('calibration') ||
    title.includes('qa ') ||
    title.startsWith('qa') ||
    desc.includes('evaluation for') ||
    desc.includes('submitted by qa') ||
    desc.includes('removed by qas') ||
    desc.includes('added by qas') ||
    desc.includes('qas ray') ||
    desc.includes('qa stephen') ||
    desc.includes('qa josefura') ||
    url.includes('/evaluation/') ||
    url.includes('guideline=') ||
    url.startsWith('/accounts/')
  ) {
    return false;
  }

  // Include only Training Performance Hub events
  const isTrainingUrl = 
    url.startsWith('/traffic-lights') ||
    url.startsWith('/trainees') ||
    url.startsWith('/trainers') ||
    url.startsWith('/history') ||
    url.startsWith('/settings') ||
    url.startsWith('/analytics') ||
    url === '/';

  const isTrainingContent =
    title.includes('traffic light') ||
    title.includes('login') ||
    title.includes('trainee') ||
    title.includes('trainer') ||
    title.includes('remark') ||
    title.includes('attendance') ||
    title.includes('reliability') ||
    title.includes('export') ||
    title.includes('hub') ||
    title.includes('training');

  return isTrainingUrl || isTrainingContent;
}

async function testFilter() {
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('Total notifications in DB:', notifs?.length);
  const trainingOnly = (notifs || []).filter(isTrainingLog);
  console.log('Training Performance Hub only notifications:', trainingOnly.length);
  trainingOnly.forEach(t => {
    console.log(`- [${t.notification_id}] ${t.title}: ${t.description}`);
  });
}

testFilter();
