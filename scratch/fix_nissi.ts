import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const email = 'nreguero.telenet@gmail.com';
  
  let page = 1;
  let user;
  
  while (true) {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }
    
    user = users.users.find(u => u.email === email);
    if (user || users.users.length === 0) {
        break;
    }
    page++;
  }
  
  if (!user) {
      console.log(`User ${email} still not found.`);
  } else {
      console.log(`User ${email} found (ID: ${user.id}). Updating password to CTNP-1597...`);
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
          password: 'CTNP-1597'
      });
      console.log("Update password:", error || 'Success');
  }
}

main();
