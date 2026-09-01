-- Create the roles enum
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'EMPLOYEE');

-- Create the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    email TEXT PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Admins
INSERT INTO public.user_roles (email, role) 
VALUES 
    ('nreguero.telenet@gmail.com', 'HOT_ADMIN'),
    ('ralasagas.telenet@gmail.com', 'QAS_ADMIN'),
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
