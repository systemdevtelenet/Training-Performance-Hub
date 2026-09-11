const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listAllTrafficTables() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  const tables = Object.keys(data.definitions || {}).filter(t => t.includes('traffic'));
  console.log('=== TRAFFIC LIGHT TABLES ===', tables);

  for (const t of tables) {
    const { data: rows } = await supabase.from(t).select('*').limit(2);
    console.log(`Table ${t}: ${rows ? rows.length : 0} rows. Sample keys:`, rows && rows[0] ? Object.keys(rows[0]).slice(0, 4) : 'empty');
  }
}

listAllTrafficTables();
