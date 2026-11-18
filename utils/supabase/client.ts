import { getSupabaseUrl, getSupabasePublishableKey } from '@/lib/supabase/public-env';
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey()
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
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      isSingleton: false,
      cookieOptions
    }
  )
}
