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
      const email = data.user.email.toLowerCase();
      const isAllowed = 
        email.endsWith('.telenet@gmail.com') ||
        email.endsWith('telenet@gmail.com') ||
        email.endsWith('@cebutelenet.com') ||
        email.endsWith('@cebutele-net.com');

      if (!isAllowed) {
        // Sign out unauthorized user immediately
        await supabase.auth.signOut();
        return NextResponse.redirect(`${baseUrl}/login?error=unauthorized_domain`);
      }
    }
  }

  return NextResponse.redirect(`${baseUrl}/`);
}
