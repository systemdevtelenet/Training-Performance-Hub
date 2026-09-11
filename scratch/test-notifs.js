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

async function inspectNotifs() {
  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  console.log('Total notifs retrieved:', notifs ? notifs.length : 0, error);
  if (notifs) {
    notifs.forEach(n => {
      console.log(`[${n.notification_id}] title="${n.title}" desc="${n.description}" url="${n.action_url}" created="${n.created_at}"`);
    });
  }

  const { data: acts, error: actErr } = await supabase.from('activity_logs').select('*').limit(5);
  console.log('activity_logs table exists:', !actErr, acts ? acts.length : actErr);
}

inspectNotifs();
