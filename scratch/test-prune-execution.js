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

  // Explicitly exclude ALL QA system events, evaluations, and QA employee mutations
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
    desc.includes('qa janine') ||
    desc.includes('qa jordan') ||
    url.includes('/evaluation/') ||
    url.includes('guideline=') ||
    url.startsWith('/accounts/')
  ) {
    return false;
  }

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
    title.includes('training') ||
    title.includes('employee profile');

  return isTrainingUrl || isTrainingContent;
}

async function testPruneAndFetch() {
  const { data: allNotifs } = await supabase
    .from('notifications')
    .select('notification_id, title, action_url, description, created_at')
    .order('created_at', { ascending: false });

  const trainingNotifs = (allNotifs || []).filter(isTrainingLog);
  console.log(`Found ${trainingNotifs.length} Training Performance Hub notifications in DB.`);
  
  if (trainingNotifs.length > 10) {
    const excessIds = trainingNotifs.slice(10).map(r => r.notification_id);
    console.log(`Deleting ${excessIds.length} excess old notifications:`, excessIds);
    await supabase.from('notifications').delete().in('notification_id', excessIds);
  }

  const { data: updatedNotifs } = await supabase
    .from('notifications')
    .select('notification_id, title, action_url, description, created_at')
    .order('created_at', { ascending: false });

  const updatedTraining = (updatedNotifs || []).filter(isTrainingLog);
  console.log(`After prune, Training Performance Hub has ${updatedTraining.length} notifications in DB.`);
  updatedTraining.forEach(t => console.log(`- [${t.notification_id}] ${t.title}: ${t.description}`));
}

testPruneAndFetch();
