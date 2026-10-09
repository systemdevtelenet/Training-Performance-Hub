'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRole } from '@/components/providers/RoleProvider';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_DURATION_MS = 2 * 60 * 1000;
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_DURATION_MS;
const ACTIVITY_STORAGE_KEY = 'ctnp_last_activity_at';
const PROFILE_CACHE_KEY = 'ctnp_cached_auth_profile_v3';
const ACTIVITY_THROTTLE_MS = 15 * 1000;

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function IdleSessionGuard() {
  const { email } = useRole();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(WARNING_DURATION_MS);
  const lastActivityRef = useRef(Date.now());
  const lastRecordedActivityRef = useRef(0);
  const warningRef = useRef(false);
  const isSigningOutRef = useRef(false);

  const recordActivity = useCallback((force = false) => {
    if (warningRef.current || isSigningOutRef.current) return;
    const now = Date.now();
    if (!force && now - lastRecordedActivityRef.current < ACTIVITY_THROTTLE_MS) return;

    lastActivityRef.current = now;
    lastRecordedActivityRef.current = now;
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    } catch {
      // The in-memory timer still works when storage is unavailable.
    }
  }, []);

  const signOutForInactivity = useCallback(async () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    } catch {
      // Continue with Supabase sign-out.
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.replace('/login?logout=true&reason=idle');
    }
  }, []);

  const staySignedIn = useCallback(() => {
    warningRef.current = false;
    setShowWarning(false);
    setRemainingMs(WARNING_DURATION_MS);
    recordActivity(true);
  }, [recordActivity]);

  useEffect(() => {
    if (!email) return;

    let initialActivity = Date.now();
    try {
      const storedActivity = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
      if (Number.isFinite(storedActivity) && storedActivity > 0) initialActivity = storedActivity;
      else localStorage.setItem(ACTIVITY_STORAGE_KEY, String(initialActivity));
    } catch {
      // Use the current time when storage is unavailable.
    }
    lastActivityRef.current = initialActivity;
    lastRecordedActivityRef.current = initialActivity;

    const handleActivity = () => recordActivity();
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVITY_STORAGE_KEY || !event.newValue) return;
      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp)) return;
      lastActivityRef.current = timestamp;
      if (warningRef.current) {
        warningRef.current = false;
        setShowWarning(false);
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'pointerdown',
    ];
    activityEvents.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    window.addEventListener('storage', handleStorage);

    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      const timeRemaining = IDLE_TIMEOUT_MS - idleFor;

      if (timeRemaining <= 0) {
        void signOutForInactivity();
        return;
      }

      if (idleFor >= WARNING_AT_MS) {
        warningRef.current = true;
        setShowWarning(true);
        setRemainingMs(timeRemaining);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
      window.removeEventListener('storage', handleStorage);
    };
  }, [email, recordActivity, signOutForInactivity]);

  if (!email || !showWarning) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="idle-session-title">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 bg-[#2F6798] px-5 py-4 text-white">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/15">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 id="idle-session-title" className="text-sm font-extrabold uppercase tracking-wide">Session Expiring</h2>
            <p className="mt-0.5 text-xs font-medium text-white/80">No activity has been detected.</p>
          </div>
        </div>

        <div className="px-6 py-6 text-center">
          <Clock className="mx-auto h-8 w-8 text-[#2F6798] dark:text-blue-400" />
          <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            You will be signed out automatically unless you continue your session.
          </p>
          <p className="mt-3 font-mono text-3xl font-black text-slate-900 dark:text-white" aria-live="polite">
            {formatCountdown(remainingMs)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/70">
          <button
            type="button"
            onClick={() => void signOutForInactivity()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <button
            type="button"
            onClick={staySignedIn}
            autoFocus
            className="rounded-lg bg-[#2F6798] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#24527a]"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
