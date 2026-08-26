import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function createAuthClient(rememberMe: boolean) {
  const cookieOptions: any = {
    // Other default options can go here if needed
  };
  
  if (rememberMe) {
    cookieOptions.maxAge = 31536000; // 1 year
  }
  // If rememberMe is false, maxAge is not set, resulting in a session cookie.

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      cookieOptions
    }
  )
}
