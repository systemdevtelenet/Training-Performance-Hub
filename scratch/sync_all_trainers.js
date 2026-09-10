const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndSyncTrainers() {
  console.log('=== Checking all trainers_profile records ===');
  const { data: trainers, error } = await supabase.from('trainers_profile').select('*');
  if (error) {
    console.error('Error fetching trainers_profile:', error);
    return;
  }

  const { data: authUsersData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUsersMap = new Map();
  if (authUsersData?.users) {
    for (const u of authUsersData.users) {
      if (u.email) authUsersMap.set(u.email.toLowerCase().trim(), u);
    }
  }

  console.log(`Found ${trainers.length} trainer profiles and ${authUsersMap.size} auth users.`);

  for (const t of trainers) {
    const email = (t.gmail_account || t.thunderbird_account || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      console.log(`Skipping trainer with no email: ${t.name}`);
      continue;
    }

    const empNum = String(t.employee_num || '').trim();
    const password = empNum.length >= 6 ? empNum : `CTNP-${empNum}`;

    console.log(`Trainer: ${t.name} (${t.position}) -> Email: ${email}, Password: ${password}`);

    // Check if auth user exists
    const existing = authUsersMap.get(email);
    if (!existing) {
      console.log(`Creating auth user for: ${email}...`);
      const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: t.name,
          role: t.position || 'TRAINER',
          position: t.position
        }
      });
      if (createErr) {
        console.error(`Failed to create auth for ${email}:`, createErr.message);
      } else {
        console.log(`Created auth user: ${email} (ID: ${newAuth.user.id})`);
      }
    } else {
      console.log(`Updating password for existing auth user: ${email} -> ${password}`);
      const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: password,
        user_metadata: {
          ...existing.user_metadata,
          name: t.name,
          role: t.position || 'TRAINER',
          position: t.position
        }
      });
      if (updErr) console.error(`Failed to update ${email}:`, updErr.message);
      else console.log(`Updated auth password successfully for ${email}`);
    }

    // Also check/upsert into user_roles table
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const roleToAssign = t.position?.toUpperCase().includes('HOT') ? 'HOT_ADMIN' : 'TRAINER';
    if (!existingRole) {
      console.log(`Inserting user_roles entry for ${email} with role: ${roleToAssign}...`);
      const { error: insErr } = await supabase
        .from('user_roles')
        .insert([{ email: email, role: roleToAssign }]);
      if (insErr) console.error(`Error inserting user_roles for ${email}:`, insErr.message);
      else console.log(`user_roles created for ${email}`);
    } else {
      console.log(`user_roles already exists for ${email}: ${existingRole.role}`);
    }
  }

  console.log('=== Done syncing trainers! ===');
}

checkAndSyncTrainers();
