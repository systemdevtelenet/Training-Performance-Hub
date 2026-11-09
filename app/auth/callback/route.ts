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

      // Use the same trusted role resolver as protected pages and actions.
      let isAuthorized = false;
      try {
        const { getRequestActor } = await import('@/lib/auth/access');
        const actor = await getRequestActor();
        isAuthorized = Boolean(actor && actor.role !== 'UNAUTHORIZED');
      } catch (error) {
        console.error('Unable to verify callback user role:', error);
      }

      if (!isAuthorized) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${baseUrl}/login?error=not_authorized`);
      }
    }
  }

  return NextResponse.redirect(`${baseUrl}/`);
}
