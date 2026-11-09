'use server';

/**
 * Kept as a compatibility action for older clients. Roster values are not
 * credentials: account creation and password resets must happen through the
 * administrator-controlled Supabase Auth invitation/recovery flow.
 */
export async function autoProvisionUser(_email: string, _passwordAttempt: string) {
  return {
    success: false,
    message: 'This account is not provisioned yet. Please contact your administrator to receive an invitation or reset link.',
  };
}
