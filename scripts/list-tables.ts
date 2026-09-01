import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchSchema() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey!,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  if (!response.ok) {
    console.error("Failed", response.status, await response.text());
    return;
  }
  
  const data = await response.json();
  const tables = Object.keys(data.definitions || {});
  console.log("TABLES FOUND:");
  console.log(tables.join('\n'));
}

fetchSchema();
