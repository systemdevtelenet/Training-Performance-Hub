'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, UserRound, LockKeyhole, CheckCircle2, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { createClient, createAuthClient } from '@/utils/supabase/client';
import { logActivity } from '@/lib/actions/logger';
import { autoProvisionUser } from '@/lib/actions/auth-dynamic';

const ALLOWED_DOMAINS = ['cebutelenet.com', 'cebutele-net.com', 'telenet@gmail.com', 'gmail.com'];
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(100);
  const [heroWord, setHeroWord] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = window.setInterval(() => setHeroWord(index => (index + 1) % 3), 3000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchParams.get('logout') === 'true') {
      setShowLogoutToast(true);
      setLogoutProgress(100);

      const animTimer = setTimeout(() => {
        setLogoutProgress(0);
      }, 50);

      const dismissTimer = setTimeout(() => {
        setShowLogoutToast(false);
      }, 3500);

      return () => {
        clearTimeout(animTimer);
        clearTimeout(dismissTimer);
      };
    }

    if (searchParams.get('error') === 'unauthorized_domain') {
      setErrors(prev => ({
        ...prev,
        general: 'Access denied: Please sign in using your official company Google account (*.telenet@gmail.com or @cebutelenet.com).'
      }));
    } else if (searchParams.get('error') === 'not_authorized') {
      setErrors(prev => ({
        ...prev,
        general: 'Access denied: Your account has not been added by an administrator or granted system access. Please contact your administrator.'
      }));
    }
  }, [searchParams]);

  // If login component is rendered while URL is on a protected route (e.g. after AFK session expiration), sync URL
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/auth')) {
      window.location.replace('/login');
    }
  }, []);

  // Validation and Loading States
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });

  // Brute Force Protection States
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Handle Lockout Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutUntil && lockoutUntil > Date.now()) {
      setCountdown(Math.ceil((lockoutUntil - Date.now()) / 1000));
      timer = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutUntil(null);
          setFailedAttempts(0);
          setCountdown(0);
          setErrors(prev => ({ ...prev, general: '' }));
          clearInterval(timer);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const authClient = createAuthClient(formData.rememberMe);
      const { error } = await authClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Error logging in with Google:', error);
      setErrors(prev => ({ ...prev, general: error?.message || 'Failed to connect to Google. Please check your network or configuration.' }));
      setIsGoogleLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '', general: '' };

    // 1. Required Field Checks
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }
    if (!isValid && !newErrors.email && !newErrors.password) {
       newErrors.general = 'Email and password are required';
    }

    // 2. Email Format Syntax Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // 3. Company Domain Restriction
    if (formData.email && emailRegex.test(formData.email)) {
      const domain = formData.email.split('@')[1]?.toLowerCase() || '';
      // Check if domain is exactly cebutelenet.com, OR if it ends with telenet@gmail.com (handling the CSV edge case)
      const isAllowedDomain = ALLOWED_DOMAINS.some(allowed => 
        formData.email.toLowerCase().endsWith(allowed)
      );
      
      if (!isAllowedDomain) {
        newErrors.email = 'Unauthorized domain. Please use your official company email.';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockoutUntil && lockoutUntil > Date.now()) {
      return; // Locked out
    }

    if (!validateForm()) return;

    setIsSubmitLoading(true);
    setErrors({ email: '', password: '', general: '' });

    try {
      // 4. Credential Match (Authentication)
      const authClient = createAuthClient(formData.rememberMe);
      const cleanEmail = formData.email.trim();
      const cleanPass = formData.password.trim();

      let { data, error } = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      // If initial login failed, dynamically attempt roster verification and auto-provisioning on the server
      if (error) {
        const provisionResult = await autoProvisionUser(cleanEmail, cleanPass);
        if (provisionResult.success) {
          // Retry signIn now that the account/credentials have been dynamically provisioned
          const retry = await authClient.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPass,
          });
          if (!retry.error) {
            data = retry.data;
            error = null;
          }
        } else if (provisionResult.message) {
          setErrors(prev => ({ ...prev, general: provisionResult.message || 'Access denied' }));
          setIsSubmitLoading(false);
          return;
        }
      }

      if (error) {
        handleFailedAttempt();
        return;
      }

      // Removed legacy user_metadata role check.
      // Roles are now securely fetched from the user_roles table via RoleProvider.
      // All authenticated users in the allowed domains are granted access, 
      // and their permissions are strictly limited by their role.

      // Success! Reset attempts and redirect
      setFailedAttempts(0);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('show_login_toast', 'true');
      }
      
      // Log this activity asynchronously without delaying redirect
      logActivity({
        title: 'User Login',
        description: `${formData.email} successfully logged into the hub.`,
        iconType: 'success',
        author: 'System Auth',
      }).catch(console.error);

      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      setErrors(prev => ({ ...prev, general: 'An unexpected error occurred.' }));
      setIsSubmitLoading(false);
    }
  };

  const handleFailedAttempt = () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      // 6. Rate Limiting & Brute Force Defense
      setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
      setErrors(prev => ({ ...prev, general: `Too many failed attempts. Locked out for ${LOCKOUT_DURATION_MS / 1000} seconds.` }));
    } else {
      setErrors(prev => ({ ...prev, general: 'Invalid email or password' }));
    }
    setIsSubmitLoading(false);
  };

  return (
    <main className="fixed inset-0 z-[10000] grid min-h-screen w-full grid-cols-1 overflow-x-hidden overflow-y-auto bg-[#F8F8F6] font-['Geist',Arial,sans-serif] text-[#17283B] lg:h-screen lg:grid-cols-[1.35fr_1fr] lg:overflow-y-hidden">

      {/* Top-Right Logout Success Toast */}
      {showLogoutToast && (
        <div className="fixed top-6 right-6 z-[100] flex flex-col bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 border-l-4 border-l-[#2F6798] rounded-xl shadow-2xl animate-in slide-in-from-top-5 duration-200 min-w-[320px] max-w-sm overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <CheckCircle2 className="w-5 h-5 text-[#2F6798] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Signed Out
              </h4>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                You have safely logged out of your account.
              </p>
            </div>
            <button 
              onClick={() => setShowLogoutToast(false)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 shrink-0 cursor-pointer"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Animated Countdown Bar */}
          <div className="h-1 w-full bg-blue-50 dark:bg-blue-950 overflow-hidden">
            <div 
              className="h-full bg-[#2F6798] transition-all duration-[3500ms] ease-linear"
              style={{ width: `${logoutProgress}%` }}
            />
          </div>
        </div>
      )}
      {/* Pure White Full Screen Loading Overlay (Only for Main Login Submit Redirect) */}
      {isSubmitLoading && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white animate-in fade-in duration-150">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-full border-4 border-slate-100 border-t-[#2F6798] animate-spin" />
            <p className="text-sm font-bold text-slate-600 tracking-tight">
              Loading Dashboard Data...
            </p>
          </div>
        </div>
      )}

      <section className="relative hidden min-h-screen overflow-hidden bg-[#132B43] text-white lg:flex lg:flex-col lg:justify-between">
        <Image src="/login-hero.png" alt="Customer service representative" fill sizes="57vw" className="pointer-events-none object-contain object-right opacity-[0.85]" priority />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#132B43] via-[#132B43]/45 to-[#132B43]/10" />
        <div className="pointer-events-none absolute -bottom-[270px] -right-[480px] h-[620px] w-[620px] rounded-full border-[56px] border-[#2F6798]/40" />
        <div className="pointer-events-none absolute -bottom-[310px] -right-[410px] h-[530px] w-[530px] rounded-full border-[28px] border-[#C8A54B]/30" />
        <div className="relative z-10 mt-auto px-10 pb-44 xl:px-16">
          <h1 className="text-[clamp(42px,4vw,60px)] font-semibold leading-[0.98]">
            Train.<br />Track.<br /><span className="text-[#C8A54B]">{['Lead.', 'Improve.', 'Deliver.'][heroWord]}<span className="ml-1 inline-block h-[0.9em] w-[3px] animate-pulse bg-[#C8A54B] align-[-0.1em] motion-reduce:animate-none" /></span>
          </h1>
          <div className="mt-7 h-px w-16 bg-[#C8A54B]" />
          <p className="mt-6 max-w-xl text-base leading-8 text-white/75 xl:text-lg">Manage training batches, track attendance, and monitor trainee performance in one place.</p>
        </div>
        <div className="relative z-10 px-10 pb-4 xl:px-16">
          <div className="grid grid-cols-3 gap-4 pb-4">
            {[['BATCHES', 'Manage waves & rosters'], ['ATTENDANCE', 'Record daily status'], ['PERFORMANCE', 'Review trainee results']].map(([label, detail]) => <div key={label} className={`border-l pl-4 ${label === 'PERFORMANCE' ? 'border-[#C8A54B]' : 'border-white/25'}`}><p className={`text-[10px] font-semibold tracking-[0.18em] ${label === 'PERFORMANCE' ? 'text-[#C8A54B]' : 'text-[#91A6BC]'}`}>{label}</p><p className="mt-1 text-sm font-medium">{detail}</p></div>)}
          </div>
          <div className="flex justify-between border-t border-white/15 pt-5 text-[10px] font-semibold tracking-[0.22em] text-[#8CA5BD]"><span>TRAINING PERFORMANCE HUB</span><span>CTNP | PHILIPPINES</span></div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:h-screen lg:px-12">
        <div className="w-full max-w-[466px]">
          <div className="text-center">
            <Image src="/login-logo.png" alt="CTNP" width={220} height={84} className="mx-auto h-auto w-[152px] sm:w-[160px]" priority />
            <p className="mt-8 text-xs font-semibold text-[#C8A54B] lg:hidden">TRAIN. TRACK. LEAD.</p>
            <h2 className="mt-5 text-[30px] font-semibold leading-tight text-[#17283B]">Welcome back</h2>
            <p className="mt-2 text-sm text-[#6A7583]">Sign in to your Training Performance Hub.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold tracking-[0.12em] text-[#536172]">EMAIL</label>
              <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8190A0]" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                  if (errors.general) setErrors({ ...errors, general: '' });
                }}
                disabled={!!lockoutUntil}
                className={`login-email-input h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-[15px] text-[#17283B] outline-none transition focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 disabled:opacity-50 ${
                  errors.email || errors.general
                    ? 'border-red-500'
                    : 'border-[#D7DDE3]'
                }`}
              />
              </div>
              {errors.email && (
                <p className="text-red-500 text-[0.65rem] mt-1 ml-1 font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold tracking-[0.12em] text-[#536172]">PASSWORD</label>
              <div className={`flex h-12 w-full items-center overflow-hidden rounded-xl border bg-white transition focus-within:border-[#2F6798] focus-within:ring-4 focus-within:ring-[#2F6798]/10 ${errors.password || errors.general ? 'border-red-500' : 'border-[#D7DDE3]'}`}>
              <LockKeyhole className="ml-4 mr-3 h-5 w-5 shrink-0 text-[#8190A0]" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
                  if (errors.general) setErrors({ ...errors, general: '' });
                }}
                disabled={!!lockoutUntil}
                className="login-password-input h-full min-w-0 flex-1 bg-[#E8F0FE] px-2 text-[15px] text-[#17283B] outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!!lockoutUntil}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="flex h-full w-14 shrink-0 items-center justify-center text-[#8190A0] hover:text-[#244F78] disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              </div>
              {errors.password && !errors.general && (
                <p className="text-red-500 text-[0.65rem] mt-1 ml-1 font-medium">{errors.password}</p>
              )}
            </div>

            {errors.general && (
              <p className="text-red-500 text-[0.65rem] mt-1 ml-1 font-medium">
                {errors.general} {lockoutUntil && `(${countdown}s remaining)`}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                disabled={!!lockoutUntil}
                className="h-4 w-4 accent-[#2F6798] disabled:opacity-50"
              />
              <label htmlFor="rememberMe" className="cursor-pointer select-none text-sm text-[#6A7583]">
                Remember me
              </label>
              </div>
              <button type="button" onClick={() => setErrors(prev => ({ ...prev, general: 'Please contact your system administrator for account help.' }))} className="text-sm font-medium text-[#244F78] hover:text-[#C8A54B]">Need help?</button>
            </div>

            <div>
              <button
                type="submit"
                disabled={!!lockoutUntil || isSubmitLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#244F78] text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(36,79,120,0.16)] transition hover:bg-[#173B5D] disabled:opacity-50"
              >
                {isSubmitLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  'Sign In'
                )}
              </button>
              <div className="my-5 flex items-center gap-4 text-xs text-[#9AA4AF]"><span className="h-px flex-1 bg-[#E0E4E8]" /><span>OR</span><span className="h-px flex-1 bg-[#E0E4E8]" /></div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || !!lockoutUntil}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#D7DDE3] bg-white text-[15px] font-medium text-[#17283B] transition hover:bg-[#F0F3F5] disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <span className="w-4 h-4 border-2 border-[#2F6798] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}
              </button>
            </div>
          </form>
          <p className="mt-5 text-center text-[9px] font-semibold tracking-[0.2em] text-[#A2ABB5]">TRAINING PERFORMANCE HUB | INTERNAL USE ONLY</p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-[#2F6798] animate-spin" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
