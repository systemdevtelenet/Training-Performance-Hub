const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('Testing login with bcolonia.telenet@gmail.com and CTNP-1772...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'bcolonia.telenet@gmail.com',
    password: 'CTNP-1772'
  });

  if (error) {
    console.error('Login error:', error.message);
  } else {
    console.log('Login successful! User ID:', data.user.id, 'Email:', data.user.email);
  }
}

testLogin();
