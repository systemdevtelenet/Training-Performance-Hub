import {
  Bell, Sun, Moon, Search, UserCheck, LayoutDashboard, FileText, User,
  Settings, LogOut, HelpCircle, CheckCircle2, X, Activity, Users,
  ClipboardList, ArrowRight, Loader2, Sparkles, Building2, CornerDownLeft
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';
import DateFilter from '@/components/DateFilter';
import NotificationDropdown from '@/components/NotificationDropdown';
import RoleSwitcher from '@/components/RoleSwitcher';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRole } from '@/components/providers/RoleProvider';
import { useToast } from '@/components/CustomToast';
import { searchGlobal, type SearchResultItem } from '@/lib/actions/search';

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const { role, actualRole, email, avatarUrl, userName } = useRole();
  const toast = useToast();
  const router = useRouter();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const positionTitle = useMemo(() => {
    const emailStr = (email || '').toLowerCase();
    if (emailStr.includes('bosssilver') || (actualRole as string) === 'VIEW_ADMIN') return 'Executive Admin (View Only)';
    if (emailStr.includes('nreguero') || actualRole === 'HOT_ADMIN' || role === 'HOT_ADMIN') return 'Head of Training';
    if (emailStr.includes('ralasagas') || actualRole === 'QAS_ADMIN' || role === 'QAS_ADMIN') return 'QAS Head';
    if (actualRole === 'SUPER_ADMIN' || role === 'SUPER_ADMIN') return 'Super Admin';
    if (actualRole === 'TRAINER' || role === 'TRAINER') return 'Trainer';
    if (actualRole === 'EMPLOYEE' || role === 'EMPLOYEE') return 'Employee';
    return role || 'Operations User';
  }, [email, role, actualRole]);

  // Check session flag for login toast with unified custom toast
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('show_login_toast') === 'true') {
      sessionStorage.removeItem('show_login_toast');
      toast.success('You have successfully logged into the hub.', 'Welcome Back');
    }
  }, [toast]);

  // Handle click outside for profile and search dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search debouncing
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchGlobal(q);
        setSearchResults(res);
      } catch (err) {
        console.error('Error in search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          setIsSearchFocused(true);
        }
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelectResult = useCallback((href: string) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    router.push(href);
  }, [router]);

  // Real Suggested Navigation Actions
  const suggestedActions = useMemo(() => [
    {
      title: 'Traffic Lights Status Tracking',
      subtitle: 'Weekly trainer & trainee ratings, notes & coaching',
      icon: Activity,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
      badge: 'Live',
      href: '/traffic-lights'
    },
    {
      title: 'Trainees Directory & Rosters',
      subtitle: 'Inhouse & PST cohorts, batch rosters & status',
      icon: Users,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
      badge: 'Roster',
      href: '/trainees'
    },
    {
      title: 'Trainers Reliability Matrix',
      subtitle: 'View trainer reliability scores, attendance & leaves',
      icon: UserCheck,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
      badge: 'Trainers',
      href: '/trainers?tab=reliability'
    },
    {
      title: 'Employees Management',
      subtitle: 'Employee codes, account assignments & vici links',
      icon: Building2,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-50 dark:bg-purple-950/50',
      badge: 'Staff',
      href: '/employees'
    },
    {
      title: 'Activity Log & Audit Trail',
      subtitle: 'Live history log, remarks updates & alerts',
      icon: ClipboardList,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-50 dark:bg-rose-950/50',
      badge: 'Logs',
      href: '/history'
    },
    {
      title: 'Dashboard Overview',
      subtitle: 'Headcount summaries, attrition rates & key charts',
      icon: LayoutDashboard,
      iconColor: 'text-cyan-500',
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/50',
      badge: 'Executive',
      href: '/'
    },
  ], []);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'trainer': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'trainee': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'employee': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'page': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      default: return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trainer': return UserCheck;
      case 'trainee': return Users;
      case 'employee': return Building2;
      case 'page': return FileText;
      default: return Sparkles;
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shadow-xs">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400">
          Training Performance Hub
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search Input Container */}
        <div className="relative hidden md:block" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Type name, batch, role, or page..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchResults.length > 0) {
                    handleSelectResult(searchResults[0].href);
                  } else if (searchQuery.trim()) {
                    handleSelectResult(`/trainees?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }
              }}
              className="w-72 lg:w-96 rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-16 py-2.5 text-xs font-medium text-slate-700 shadow-2xs outline-none transition-all hover:border-slate-300 focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/10 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-600"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <kbd className="pointer-events-none absolute right-2.5 hidden h-5 select-none items-center gap-1 rounded border border-slate-200 bg-white/90 px-1.5 font-mono text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>

          {/* Search Dropdown Modal */}
          {isSearchFocused && (
            <div className="absolute left-0 top-full mt-2 w-full lg:w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/90 dark:bg-slate-900 dark:ring-slate-800 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="max-h-[68vh] overflow-y-auto p-2.5 custom-scrollbar">
                
                {/* 1. Empty State: Real Suggested Actions */}
                {!searchQuery.trim() && (
                  <div className="px-1 py-1">
                    <div className="flex items-center justify-between px-2.5 py-1.5 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Quick Navigation & Actions</p>
                      <span className="text-[10px] text-slate-400">Press ↵ to open</span>
                    </div>
                    <div className="space-y-1">
                      {suggestedActions.map((action, idx) => {
                        const Icon = action.icon;
                        return (
                          <Link
                            key={idx}
                            href={action.href}
                            onClick={() => {
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectResult(action.href);
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all group cursor-pointer border border-transparent hover:border-slate-200/70 dark:hover:border-slate-700"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${action.iconBg} ${action.iconColor} transition-transform group-hover:scale-105 shadow-2xs`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#2F6798] dark:group-hover:text-blue-400 transition-colors truncate">
                                  {action.title}
                                </p>
                                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
                                  {action.subtitle}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700 shrink-0">
                              {action.badge}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Live Searching State */}
                {Boolean(searchQuery.trim()) && (
                  <div className="px-1 py-1">
                    <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        {isSearching ? <Loader2 className="w-3 h-3 animate-spin text-[#2F6798]" /> : <Search className="w-3 h-3 text-[#2F6798]" />}
                        <span>{isSearching ? 'Searching database...' : `Results for "${searchQuery}"`}</span>
                      </p>
                      {!isSearching && (
                        <span className="text-[10px] font-bold text-slate-500">
                          {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                        </span>
                      )}
                    </div>

                    {isSearching ? (
                      <div className="py-8 text-center space-y-2">
                        <Loader2 className="w-6 h-6 text-[#2F6798] animate-spin mx-auto" />
                        <p className="text-xs text-slate-400 font-medium">Scanning trainees, trainers, employees & pages...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 px-3 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">No exact matches found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a trainee name, batch number, trainer, or employee code.</p>
                        </div>
                        <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                          <Link
                            href={`/trainees?search=${encodeURIComponent(searchQuery)}`}
                            onClick={() => {
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectResult(`/trainees?search=${encodeURIComponent(searchQuery)}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#2F6798] text-white text-[10.5px] font-bold hover:bg-[#24527a] transition-all cursor-pointer shadow-xs"
                          >
                            Search Trainees Directory
                          </Link>
                          <Link
                            href={`/trainers?search=${encodeURIComponent(searchQuery)}`}
                            onClick={() => {
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectResult(`/trainers?search=${encodeURIComponent(searchQuery)}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10.5px] font-bold transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700"
                          >
                            Search Trainers Directory
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {searchResults.map((item) => {
                          const IconComponent = getCategoryIcon(item.category);
                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => {
                                setIsSearchFocused(false);
                                setSearchQuery('');
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectResult(item.href);
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all group cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 overflow-hidden border border-slate-200/60 dark:border-slate-700 group-hover:border-[#2F6798]/30 shadow-2xs">
                                  {item.avatar ? (
                                    <img src={item.avatar} alt={item.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <IconComponent className="w-4 h-4 text-[#2F6798]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#2F6798] dark:group-hover:text-blue-400 transition-colors truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
                                    {item.subtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.badge && (
                                  <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${getCategoryBadgeClass(item.category)}`}>
                                    {item.badge}
                                  </span>
                                )}
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2F6798] group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" /> Press <strong>Enter</strong> to jump
                </span>
                <span>
                  <strong>ESC</strong> to close
                </span>
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
            className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[#1f4a6e] text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-primary/30 cursor-pointer hover:opacity-90 hover:scale-105 transition-all ring-2 ring-white dark:ring-slate-800 overflow-hidden"
            title={userName || email || "User"}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName || email || "User"} className="w-full h-full object-cover" />
            ) : (
              <span>{email ? email.charAt(0).toUpperCase() : "U"}</span>
            )}
          </div>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100 focus:outline-none dark:bg-slate-900 dark:ring-slate-800 animate-in fade-in zoom-in-95 duration-200 z-50">
              <div className="border-b border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#1f4a6e] text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={userName || email || "User"} className="w-full h-full object-cover" />
                    ) : (
                      <span>{email ? email.charAt(0).toUpperCase() : "U"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{userName || email || "User"}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{email}</p>
                  </div>
                </div>
                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#2F6798]/10 text-[#2F6798] dark:bg-blue-950/60 dark:text-blue-300 border border-[#2F6798]/20">
                  {positionTitle}
                </div>
              </div>
              <div className="p-2 space-y-1">
                <button 
                  onClick={() => {
                    router.push('/settings?tab=profile');
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
