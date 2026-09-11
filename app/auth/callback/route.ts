import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const baseUrl = isLocalEnv ? requestUrl.origin : forwardedHost ? `https://${forwardedHost}` : requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user?.email) {
      const email = data.user.email.toLowerCase().trim();
      const isAllowedDomain = 
        email.endsWith('.telenet@gmail.com') ||
        email.endsWith('telenet@gmail.com') ||
        email.endsWith('@cebutelenet.com') ||
        email.endsWith('@cebutele-net.com');

      if (!isAllowedDomain) {
        // Sign out unauthorized user immediately
        await supabase.auth.signOut();
        return NextResponse.redirect(`${baseUrl}/login?error=unauthorized_domain`);
      }

      // Check if user is registered by Admin in user_roles, trainers_profile, or active in employees
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: roleRow } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .ilike('email', email)
        .maybeSingle();

      const { data: trainerRow } = await supabaseAdmin
        .from('trainers_profile')
        .select('trainer_id')
        .or(`gmail_account.ilike."${email}",thunderbird_account.ilike."${email}"`)
        .maybeSingle();

      const { data: empRow } = await supabaseAdmin
        .from('employees')
        .select('id, status_id, role_id')
        .ilike('employee_email', email)
        .maybeSingle();

      const isAuthorized = Boolean(
        roleRow ||
        trainerRow ||
        (empRow && empRow.status_id === 1)
      );

      if (!isAuthorized) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${baseUrl}/login?error=not_authorized`);
      }
    }
  }

  return NextResponse.redirect(`${baseUrl}/`);
}
