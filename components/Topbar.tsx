'use client';

import { Bell, Sun, Moon, Search, UserCheck, LayoutDashboard, FileText, User, Settings, LogOut, HelpCircle, CheckCircle2, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';
import DateFilter from '@/components/DateFilter';
import NotificationDropdown from '@/components/NotificationDropdown';
import RoleSwitcher from '@/components/RoleSwitcher';
import { useState, useEffect, useRef } from 'react';
import { useRole } from '@/components/providers/RoleProvider';

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const { email } = useRole();
  const router = useRouter();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [toastProgress, setToastProgress] = useState(100);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Check session flag for login toast with auto-expiration
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('show_login_toast') === 'true') {
      sessionStorage.removeItem('show_login_toast');
      setShowLoginToast(true);
      setToastProgress(100);

      const startTime = Date.now();
      const duration = 3500; // 3.5 seconds auto-dismiss

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setToastProgress(remaining);

        if (elapsed >= duration) {
          clearInterval(interval);
          setShowLoginToast(false);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, []);

  // Handle click outside for profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      {/* Top-Right Login Success Toast */}
      {showLoginToast && (
        <div className="fixed top-6 right-6 z-[100] flex flex-col bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 border-l-4 border-l-emerald-500 rounded-xl shadow-2xl animate-in slide-in-from-top-5 duration-200 min-w-[320px] max-w-sm overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Welcome Back
              </h4>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                You have successfully logged into the hub.
              </p>
            </div>
            <button 
              onClick={() => setShowLoginToast(false)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 shrink-0 cursor-pointer"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Animated Countdown Bar */}
          <div className="h-1 w-full bg-emerald-50 dark:bg-emerald-950 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-75 ease-linear"
              style={{ width: `${toastProgress}%` }}
            />
          </div>
        </div>
      )}

      <header className="h-16 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400">
          Training Performance Hub
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Input Container */}
        <div className="relative hidden md:block">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Type name or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-64 lg:w-80 rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-12 py-2.5 text-xs font-medium text-slate-700 shadow-2xs outline-none transition-all hover:border-slate-300 focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/10 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-600"
            />
            <kbd className="pointer-events-none absolute right-2.5 hidden h-5 select-none items-center gap-1 rounded border border-slate-200 bg-white/90 px-1.5 font-mono text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>

          {/* Search Dropdown Modal */}
          {isSearchFocused && (
            <div className="absolute left-0 top-full mt-2 w-full overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-[60vh] overflow-y-auto p-2">
                
                {/* Quick Suggestions */}
                {!searchQuery && (
                  <div className="px-2 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <p className="mb-2 uppercase tracking-wider">Suggested Actions</p>
                    <div className="space-y-1">
                      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group">
                        <UserCheck className="h-4 w-4 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">View Trainer Reliability</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group">
                        <LayoutDashboard className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Go to Dashboard</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group">
                        <FileText className="h-4 w-4 text-purple-500 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Export Latest Q3 Report</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mock Results */}
                {searchQuery && (
                  <div className="px-2 py-2">
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Search Results</p>
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">JA</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Joven Anañon</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Trainer • Wave 45</span>
                      </div>
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors mt-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">B45</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Batch 45 (Inhouse)</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Cohort • Started Aug 21</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <RoleSwitcher />
        <DateFilter />
        
        <NotificationDropdown />

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[#1f4a6e] text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-primary/30 cursor-pointer hover:opacity-90 hover:scale-105 transition-all ring-2 ring-white dark:ring-slate-800"
            title={email || "User"}
          >
            {email ? email.charAt(0).toUpperCase() : "U"}
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100 focus:outline-none dark:bg-slate-900 dark:ring-slate-800 animate-in fade-in zoom-in-95 duration-200 z-50">
              <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{email || "User"}</p>
                <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">Operations Analytics</p>
              </div>
              <div className="p-2 space-y-1">
                <button 
                  onClick={() => {
                    router.push('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  My Profile
                </button>
                <button 
                  onClick={() => {
                    window.dispatchEvent(new Event('open-ai-copilot'));
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                >
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  Help & Support
                </button>
                <button 
                  onClick={() => {
                    router.push('/settings');
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Settings
                </button>
              </div>
              <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new Event('open-logout-modal'));
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
