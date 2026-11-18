import 'server-only';

import { getSupabasePublishableKey, getSupabaseUrl } from './public-env';

/**
 * Server-side key selection. New secret keys and legacy service-role keys
 * have elevated access; the public key is a compatibility fallback only.
 */
export function getSupabaseServerConfig() {
  return {
    url: getSupabaseUrl(),
    key: getSupabasePrivilegedKey()
      || getSupabasePublishableKey(),
  };
}

/** Secret keys are server-only and retain the legacy service-role fallback. */
export function getSupabasePrivilegedKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
