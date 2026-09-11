'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[url('https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/ctnp-bg-image-1.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/50" />

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

      {/* Centered Split Modal */}
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[440px] relative z-10">

        {/* Left Hero Panel */}
        <div className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-8 flex flex-col items-center justify-center text-center space-y-8 relative border-r border-slate-200/50 dark:border-slate-700/50">
          <div className="relative flex items-center justify-center w-full max-w-[280px]">
            <Image src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/ctnp-logo-full.png" alt="CTNP Logo Full" width={320} height={140} className="object-contain pointer-events-none select-none w-full h-auto drop-shadow-sm" priority />
          </div>

          <div className="space-y-1.5 pointer-events-none select-none">
            <h1 className="text-[1.1rem] leading-tight font-black tracking-wider uppercase text-primary">
              CEBU TELE-NET PHILIPPINES
            </h1>
            <p className="text-xs font-bold tracking-wide text-primary/80 uppercase">
              Training Performance Hub
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:px-6 sm:py-12 flex flex-col justify-center bg-white dark:bg-slate-800">
          <div className="mb-8 text-center space-y-2 pointer-events-none select-none">
            <h2 className="text-3xl font-bold text-[#2F6798] tracking-wider uppercase dark:text-[#5a9fd4]">
              LOGIN
            </h2>
            <p className="text-xs text-slate-400 font-normal">
              Enter your credentials to access the Training Performance Hub.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                  if (errors.general) setErrors({ ...errors, general: '' });
                }}
                disabled={!!lockoutUntil}
                className={`w-full px-4 py-3 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#2F6798] transition-all placeholder:text-slate-400 dark:bg-slate-900 disabled:opacity-50 ${
                  errors.email || errors.general
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 text-red-600' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-[0.65rem] mt-1 ml-1 font-medium">{errors.email}</p>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
                  if (errors.general) setErrors({ ...errors, general: '' });
                }}
                disabled={!!lockoutUntil}
                className={`w-full px-4 py-3 pr-10 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#2F6798] transition-all placeholder:text-slate-400 dark:bg-slate-900 disabled:opacity-50 ${
                  errors.password || errors.general
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 text-red-600' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!!lockoutUntil}
                className="absolute right-3 top-[22px] -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && !errors.general && (
                <p className="text-red-500 text-[0.65rem] mt-1 ml-1 font-medium">{errors.password}</p>
              )}
            </div>

            {errors.general && (
              <p className="text-red-500 text-[0.65rem] mt-1 ml-1 font-medium">
                {errors.general} {lockoutUntil && `(${countdown}s remaining)`}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                disabled={!!lockoutUntil}
                className="w-4 h-4 rounded border-slate-300 text-[#2F6798] focus:ring-[#2F6798] accent-[#2F6798] disabled:opacity-50"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <div className="pt-2 flex flex-col items-center">
              <Button
                type="submit"
                disabled={!!lockoutUntil || isSubmitLoading}
                className="w-10/12 py-5 rounded-lg bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-sm tracking-wider uppercase transition-all shadow-md hover:shadow-lg mx-auto flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  'LOGIN'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || !!lockoutUntil}
                className="w-10/12 py-2 mt-6 -mb-3 rounded-lg border border-slate-200 hover:bg-slate-50 bg-slate-50/50 text-slate-700 font-normal text-xs transition-all shadow-sm mx-auto flex items-center justify-center gap-2 disabled:opacity-50"
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
                {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
              </Button>
            </div>
          </form>
        </div>

      </div>
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