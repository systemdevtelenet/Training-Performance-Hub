'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { createClient, createAuthClient } from '@/utils/supabase/client';
import { logActivity } from '@/lib/actions/logger';

const ALLOWED_DOMAINS = ['cebutelenet.com', 'telenet@gmail.com'];
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  
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
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in with Google:', error);
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
      const { data, error } = await authClient.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

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
      
      // Log this activity
      await logActivity({
        title: 'User Login',
        description: `${formData.email} successfully logged into the hub.`,
        iconType: 'success',
        author: 'System Auth',
      });

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
      <div className="absolute inset-0 bg-[url('/images/ctnp-bg-image-1.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/50" />

      {/* Centered Split Modal */}
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[440px] relative z-10">

        {/* Left Hero Panel */}
        <div className="bg-[#2F6798]/95 p-8 flex flex-col items-center justify-center text-white text-center space-y-6 relative">
          <div className="relative flex items-center justify-center">
            <div className="w-[104px] h-[104px] rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm overflow-hidden shrink-0">
              <Image src="/images/ctnp-logo.png" alt="CTNP Logo" width={96} height={96} className="object-contain pointer-events-none select-none" />
            </div>
          </div>

          <div className="space-y-1 pointer-events-none select-none">
            <h1 className="text-xl font-black tracking-wider uppercase whitespace-nowrap">
              CEBU TELE-NET PHILIPPINES
            </h1>
            <p className="text-xs text-blue-100 font-medium tracking-wide">
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