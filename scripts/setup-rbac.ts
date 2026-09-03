import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupRbac() {
  console.log('Starting RBAC Setup...');

  // 1. Create user_roles table if it doesn't exist
  // Note: We use raw SQL for creating tables and policies
  // Since we cannot run raw SQL directly through the standard JS client without a custom RPC,
  // we will seed data directly if the table exists, OR we will prompt the user to run the SQL in Supabase Dashboard.
  
  console.log('--- ACTION REQUIRED ---');
  console.log('Please execute the following SQL in your Supabase SQL Editor:');
  console.log(`
    -- Create the roles enum
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'EMPLOYEE');

    -- Create the user_roles table
    CREATE TABLE IF NOT EXISTS public.user_roles (
        email TEXT PRIMARY KEY,
        role user_role NOT NULL DEFAULT 'EMPLOYEE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Seed Initial Admins
    INSERT INTO public.user_roles (email, role) 
    VALUES 
        ('nreguero.telenet@gmail.com', 'SUPER_ADMIN'),
        ('ralasagas.telenet@gmail.com', 'SUPER_ADMIN'),
        ('boss.silver@cebutelenet.com', 'VIEW_ADMIN'),
        ('super_admin@cebutelenet.com', 'SUPER_ADMIN')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
    
    -- Enable RLS on user_roles
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Users can only read their own role (or Service Role can read all)
    -- Assuming frontend uses anon key with a JWT containing the user's email.
    CREATE POLICY "Users can view their own role"
    ON public.user_roles
    FOR SELECT
    USING (auth.email() = email);
  `);
  
  console.log('\nOnce you have executed the SQL above, the database will be ready for RBAC.');
}

setupRbac().catch(console.error);
