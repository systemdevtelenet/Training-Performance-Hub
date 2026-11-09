'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { createAuthClient } from '@/utils/supabase/client';
import { logActivity } from '@/lib/actions/logger';

const ALLOWED_DOMAINS = ['cebutelenet.com', 'cebutele-net.com', 'telenet@gmail.com', 'gmail.com'];
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds
const HERO_WORDS = ['Lead.', 'Improve.', 'Deliver.'];

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(100);
  const [heroWord, setHeroWord] = useState(0);
  const [heroText, setHeroText] = useState('');
  const [heroDeleting, setHeroDeleting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const currentWord = HERO_WORDS[heroWord % HERO_WORDS.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!heroDeleting) {
      if (heroText !== currentWord) {
        timeout = setTimeout(() => setHeroText(currentWord.slice(0, heroText.length + 1)), 90);
      } else {
        timeout = setTimeout(() => setHeroDeleting(true), 1700);
      }
    } else if (heroText.length > 0) {
      timeout = setTimeout(() => setHeroText(currentWord.slice(0, heroText.length - 1)), 55);
    } else {
      timeout = setTimeout(() => {
        setHeroDeleting(false);
        setHeroWord(index => index + 1);
      }, 300);
    }

    return () => clearTimeout(timeout);
  }, [heroDeleting, heroText, heroWord, reduceMotion]);

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

      const { error } = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        handleFailedAttempt('Unable to sign in. Check your credentials or contact an administrator for an invitation or password reset.');
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

  const handleFailedAttempt = (failureMessage = 'Invalid email or password') => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      // 6. Rate Limiting & Brute Force Defense
      setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
      setErrors(prev => ({ ...prev, general: `Too many failed attempts. Locked out for ${LOCKOUT_DURATION_MS / 1000} seconds.` }));
    } else {
      setErrors(prev => ({ ...prev, general: failureMessage }));
    }
    setIsSubmitLoading(false);
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#F8F8F6] font-['Geist',Arial,sans-serif] text-[#17283B] lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
      {showLogoutToast && (
        <div className="fixed right-6 top-6 z-[100] flex min-w-[320px] max-w-sm flex-col overflow-hidden rounded-xl border border-slate-200/80 border-l-4 border-l-[#2F6798] bg-white text-slate-800 shadow-2xl animate-in slide-in-from-top-5 duration-200">
          <div className="flex items-start gap-3 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2F6798]" />
            <div className="min-w-0 flex-1 pr-2">
              <h4 className="text-xs font-bold leading-tight">Signed Out</h4>
              <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">You have safely logged out of your account.</p>
            </div>
            <button type="button" onClick={() => setShowLogoutToast(false)} className="shrink-0 cursor-pointer p-0.5 text-slate-400 transition-colors hover:text-slate-600" title="Close notification" aria-label="Close notification">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-1 w-full overflow-hidden bg-blue-50">
            <div className="h-full bg-[#2F6798] transition-all duration-[3500ms] ease-linear" style={{ width: `${logoutProgress}%` }} />
          </div>
        </div>
      )}

      {isSubmitLoading && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white animate-in fade-in duration-150">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-14 w-14 rounded-full border-4 border-slate-100 border-t-[#2F6798] animate-spin" />
            <p className="text-sm font-bold tracking-tight text-slate-600">Loading Dashboard Data...</p>
          </div>
        </div>
      )}

      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-[#132B43] text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-y-0 right-0 flex items-center">
          <Image
            src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/Herro-Photo-scaled.png"
            alt=""
            width={1971}
            height={2560}
            priority
            className="login-hero-image h-full w-auto object-contain opacity-[0.7]"
            sizes="58vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#132B43]/70 via-[#132B43]/35 to-[#132B43]/85" />
        <div className="absolute bottom-0 right-0 hidden lg:block">
          <div className="absolute -bottom-40 -left-44 h-[520px] w-[520px] rounded-full border-[80px] border-[#2F6798]/40" />
          <div className="absolute -bottom-28 -left-32 h-[380px] w-[380px] rounded-full border-[55px] border-[#C8A54B]/30" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-[clamp(2rem,5vw,4rem)] py-12">
          <div className="max-w-2xl">
            <h1 className="text-[clamp(2.75rem,5vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              Train.
              <br />
              Track.
              <br />
              <span className="login-hero-word inline-block text-[#C8A54B]">
                {reduceMotion ? HERO_WORDS[0] : heroText}
                <span className="login-hero-cursor ml-1">|</span>
              </span>
            </h1>
            <div className="my-8 h-px w-16 bg-[#C8A54B]" />
            <p className="max-w-lg text-[clamp(1rem,1.4vw,1.25rem)] leading-8 text-white/75">
              Manage training batches, track attendance, and monitor trainee performance in one place.
            </p>
          </div>
        </div>

        <div className="relative z-10 px-[clamp(2rem,5vw,4rem)] pb-[clamp(2rem,4vw,3rem)]">
          <div className="mb-[clamp(2rem,5vh,3rem)] grid max-w-3xl grid-cols-3 gap-[clamp(1rem,2.5vw,2rem)]">
            <div className="border-l border-white/20 pl-4">
              <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-white/55">BATCHES</p>
              <p className="text-sm font-medium">Manage waves &amp; rosters</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-white/55">ATTENDANCE</p>
              <p className="text-sm font-medium">Record daily status</p>
            </div>
            <div className="border-l border-[#C8A54B] pl-4">
              <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-[#C8A54B]">PERFORMANCE</p>
              <p className="text-sm font-medium">Review trainee results</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.3em] text-white/45">
            <span>TRAINING PERFORMANCE HUB</span>
            <span>CTNP | PHILIPPINES</span>
          </div>
        </div>
      </section>

      <section className="flex min-h-[100dvh] w-full overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 lg:px-[clamp(2rem,5vw,5rem)] lg:py-12">
        <div className="relative z-10 mx-auto flex h-auto min-h-full w-full max-w-[34rem] flex-col justify-center">
          <div className="mb-2 flex justify-center">
            <Image src="/login-logo.png" alt="CTNP" width={492} height={188} priority className="h-auto w-[clamp(9.5rem,18vw,13.75rem)]" />
          </div>

          <div className="mb-6 text-center lg:hidden">
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17283B]">
              Train. Track.{' '}
              <span className="login-hero-word inline-block text-[#C8A54B]">
                {reduceMotion ? HERO_WORDS[0] : heroText}
                <span className="login-hero-cursor ml-0.5">|</span>
              </span>
            </p>
          </div>

          <div className="mb-7 text-center sm:mb-8">
            <h2 className="text-[clamp(2rem,4vw,2.25rem)] font-semibold tracking-[-0.035em] text-[#17283B]">Welcome back</h2>
            <p className="mt-3 text-base text-[#6A7583]">Sign in to your Training Performance Hub.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#536172]">Email</label>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8190A0]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.6-3.4 2.9-5.5 7-5.5s6.4 2.1 7 5.5" />
                </svg>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(event) => {
                    setFormData({ ...formData, email: event.target.value });
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
                  }}
                  disabled={!!lockoutUntil || isSubmitLoading || isGoogleLoading}
                  placeholder="Enter your email"
                  className={`h-14 w-full rounded-xl border bg-white pl-12 pr-4 text-[15px] text-[#17283B] outline-none transition placeholder:text-[#9AA4AF] focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 disabled:cursor-not-allowed disabled:opacity-60 ${errors.email || errors.general ? 'border-red-500' : 'border-[#D7DDE3]'}`}
                />
              </div>
              {errors.email && <p className="ml-1 mt-1 text-xs font-medium text-red-600" role="alert">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#536172]">Password</label>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8190A0]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 018 0v3" />
                </svg>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(event) => {
                    setFormData({ ...formData, password: event.target.value });
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
                  }}
                  disabled={!!lockoutUntil || isSubmitLoading || isGoogleLoading}
                  placeholder="Enter your password"
                  className={`h-14 w-full rounded-xl border bg-white pl-12 pr-12 text-[15px] text-[#17283B] outline-none transition placeholder:text-[#9AA4AF] focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 disabled:cursor-not-allowed disabled:opacity-60 ${errors.password || errors.general ? 'border-red-500' : 'border-[#D7DDE3]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(visible => !visible)}
                  disabled={!!lockoutUntil || isSubmitLoading || isGoogleLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8190A0] transition hover:text-[#2F6798] disabled:opacity-50"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a3 3 0 004.2 4.2" />
                      <path d="M9.9 4.7A10.7 10.7 0 0112 4.5c5 0 8.5 4.5 9.5 7.5a12.4 12.4 0 01-3.1 4.9" />
                      <path d="M6.1 6.1C4.4 7.4 3.2 9.2 2.5 12c1 3 4.5 7.5 9.5 7.5 1.4 0 2.7-.3 3.8-.8" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M2.5 12S6 4.5 12 4.5 21.5 12 21.5 12 18 19.5 12 19.5 2.5 12 2.5 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && !errors.general && <p className="ml-1 mt-1 text-xs font-medium text-red-600" role="alert">{errors.password}</p>}
              {(lockoutUntil || failedAttempts > 0) && (
                <p className="mt-2 text-xs text-[#9A5B13]" role="status" aria-live="polite">
                  {lockoutUntil ? `Login temporarily unavailable. Try again in ${countdown} seconds.` : `${MAX_FAILED_ATTEMPTS - failedAttempts} attempts remaining.`}
                </p>
              )}
            </div>

            {errors.general && <p className="ml-1 text-xs font-medium text-red-600" role="alert">{errors.general}</p>}

            <div className="flex items-center justify-end gap-4 pt-1 text-sm">
              <div className="mr-auto flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onChange={(event) => setFormData({ ...formData, rememberMe: event.target.checked })}
                  disabled={!!lockoutUntil || isSubmitLoading || isGoogleLoading}
                  className="h-4 w-4 accent-[#2F6798] disabled:opacity-50"
                />
                <label htmlFor="rememberMe" className="cursor-pointer select-none text-sm text-[#6A7583]">Remember me</label>
              </div>
              <button type="button" onClick={() => setErrors(prev => ({ ...prev, general: 'Please contact your system administrator for account help.' }))} className="font-medium text-[#244F78] transition hover:text-[#C8A54B]">Need help?</button>
            </div>

            <button
              type="submit"
              disabled={!!lockoutUntil || isSubmitLoading || isGoogleLoading}
              className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#244F78] px-5 text-[15px] font-semibold text-white shadow-[0_10px_25px_rgba(36,79,120,0.18)] transition hover:bg-[#173B5D] focus:outline-none focus:ring-4 focus:ring-[#2F6798]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitLoading ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-[#9AA4AF]">
            <span className="h-px flex-1 bg-[#E0E4E8]" />
            <span>OR</span>
            <span className="h-px flex-1 bg-[#E0E4E8]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitLoading || isGoogleLoading || !!lockoutUntil}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#D7DDE3] bg-white px-5 text-[15px] font-medium text-[#26384A] transition hover:border-[#B9C3CD] hover:bg-[#FBFCFD] focus:outline-none focus:ring-4 focus:ring-[#2F6798]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGoogleLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#2F6798]" aria-hidden="true" /> : (
              <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            <span>{isGoogleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>

          <p className="mt-12 text-center text-[9px] uppercase tracking-[0.34em] text-[#A2ABB5]">TRAINING PERFORMANCE HUB &nbsp;|&nbsp; INTERNAL USE ONLY</p>
        </div>
      </section>
    </div>
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
