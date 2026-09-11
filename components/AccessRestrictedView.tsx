'use client';

import React, { useState } from 'react';
import { LogOut, RefreshCw, Lock, HelpCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

interface AccessRestrictedProps {
  email: string | null;
  userName: string | null;
  userMeta?: {
    primaryTask?: string;
    employeeId?: string;
  };
}

export default function AccessRestrictedView({ email, userName, userMeta }: AccessRestrictedProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ctnp_cached_auth_profile_v3');
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/login?logout=true';
    } catch (err) {
      window.location.href = '/login?logout=true';
    }
  };

  const handleRefresh = () => {
    setIsChecking(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ctnp_cached_auth_profile_v3');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden select-none">
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2F6798]/10 dark:bg-[#2F6798]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl backdrop-blur-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* CTNP Logo & Shield Badge */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center justify-center mx-auto mb-1">
            <Image
              src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/ctnp-logo-full.png"
              alt="Cebu Tele-Net Logo"
              width={200}
              height={60}
              className="h-12 w-auto object-contain drop-shadow-xs"
              priority
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 text-xs font-bold tracking-wide uppercase">
            <Lock className="w-3.5 h-3.5" />
            <span>Access Restricted</span>
          </div>
        </div>

        {/* Header Content */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Authorization Required
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
            The <span className="font-semibold text-slate-900 dark:text-white">Training Performance Hub</span> is dedicated exclusively to Training, QA, Trainer, Trainee, and Administrative personnel.
          </p>
        </div>

        {/* Account Info Box - Solid Blue with White Text & White Pill for ID */}
        <div className="bg-[#2F6798] border border-[#24527a] rounded-2xl p-4 text-left space-y-2.5 text-xs text-white shadow-md shadow-[#2F6798]/20 relative overflow-hidden">
          <div className="flex items-center justify-between text-white/85 font-medium">
            <span className="text-[11px] font-semibold tracking-wide">Signed In Account</span>
            <span className="text-[11px] font-bold font-mono bg-white text-[#2F6798] px-3 py-0.5 rounded-full shadow-xs">
              {userMeta?.employeeId && userMeta.employeeId !== 'N/A' ? `ID: ${userMeta.employeeId}` : 'Employee'}
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="font-extrabold text-white text-base tracking-tight truncate">{userName || 'Employee User'}</p>
            <p className="text-white/80 font-mono text-xs truncate">{email || 'No email associated'}</p>
          </div>
          {userMeta?.primaryTask && userMeta.primaryTask !== 'N/A' && (
            <p className="text-[11px] text-white/70 pt-2 border-t border-white/20">
              Position: <span className="text-white font-semibold">{userMeta.primaryTask}</span>
            </p>
          )}
        </div>

        {/* Instructions Warning Box - Brand Gold #C8A54B */}
        <div className="flex items-start gap-2.5 bg-[#C8A54B]/10 border border-[#C8A54B]/35 rounded-2xl p-3.5 text-left">
          <HelpCircle className="w-4 h-4 text-[#C8A54B] shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-[#7a5c1a] dark:text-[#E8D196] leading-relaxed">
            If you are a trainer, trainee, QA, or need access for your operations, please contact your <span className="font-bold text-[#5c4310] dark:text-[#F7E7C4]">Head of Training</span> or <span className="font-bold text-[#5c4310] dark:text-[#F7E7C4]">Administrator</span> to grant you system access under <span className="underline font-semibold">Employee Management</span>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleRefresh}
            disabled={isChecking || isSigningOut}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Recheck Access'}</span>
          </button>
          
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ED1C25] hover:bg-[#c8161e] text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut className={`w-3.5 h-3.5 ${isSigningOut ? 'animate-spin' : ''}`} />
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-slate-400 dark:text-slate-500 tracking-wider font-medium">
        Cebu Tele-Net Philippines &middot; Training Performance Hub
      </p>
    </div>
  );
}
