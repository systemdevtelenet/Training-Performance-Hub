'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BarChart,
  Sparkles,
  User,
  Settings,
  LogOut,
  X,
  Menu,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Circle,
  Activity,
  Calendar,
  FileText,
  ShieldCheck,
  Building2,
  TrendingDown,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole, UserRole } from '@/components/providers/RoleProvider';

export interface NavSubItem {
  name: string;
  href: string;
  icon?: any;
  desc?: string;
  badge?: string;
}

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
  subItems?: NavSubItem[];
  flyoutItems?: NavSubItem[];
}

const getNavItems = (role: UserRole): NavItem[] => {
  const items: NavItem[] = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: LayoutDashboard, 
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'TRAINER', 'TRAINEE'],
      flyoutItems: [
        { name: 'Operations Overview', href: '/', icon: LayoutDashboard, desc: 'Real-time KPIs & wave progress summary' },
        { name: 'Active Waves & Batches', href: '/?view=active', icon: Activity, desc: 'Current live training cohorts' },
        { name: 'Throughput & Pass Rates', href: '/?view=stats', icon: BarChart, desc: 'Milestone tracker & completion rates' },
      ]
    },
    { 
      name: 'Trainees', 
      href: '/trainees', 
      icon: Users, 
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'TRAINER'],
      flyoutItems: [
        { name: 'All Trainees Directory', href: '/trainees', icon: Users, desc: 'Trainee records & cohort rosters' },
        { name: 'Performance & Grades', href: '/trainees?tab=performance', icon: GraduationCap, desc: 'Assessments, mock scores & gate milestones' },
        { name: 'Wave Rosters & Batches', href: '/trainees?tab=batches', icon: ShieldCheck, desc: 'Batch groupings & assigned accounts' },
      ]
    },
    { 
      name: 'Trainers', 
      href: '/trainers', 
      icon: UserCheck,
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'TRAINER'],
      subItems: [
        { name: 'Trainers Directory', href: '/trainers', icon: FileText, desc: 'Profiles & qualifications' },
        { name: 'Attendance & Reliability', href: '/trainers?tab=attendance', icon: ShieldCheck, desc: 'Attendance & Reliability records' },
      ],
      flyoutItems: [
        { name: 'Trainers Directory', href: '/trainers', icon: FileText, desc: 'Profiles, qualifications & accounts' },
        { name: 'Attendance & Reliability', href: '/trainers?tab=attendance', icon: ShieldCheck, desc: 'Reliability records & attendance scorecards' },
      ]
    },
    { 
      name: 'Employees Management', 
      href: '/employees', 
      icon: Users, 
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'],
      flyoutItems: [
        { name: 'All Headcount Directory', href: '/employees', icon: Users, desc: 'Unified employee master list' },
        { name: 'Trainers Headcount', href: '/employees?role=TRAINER', icon: UserCheck, desc: 'Filter training personnel' },
        { name: 'Role & Access Control', href: '/employees?tab=roles', icon: ShieldCheck, desc: 'System permissions & access roles' },
      ]
    },
    { 
      name: 'Analytics & AI Insights', 
      href: '/analytics', 
      icon: BarChart, 
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'],
      flyoutItems: [
        { name: 'Performance Analytics', href: '/analytics', icon: BarChart, desc: 'Interactive charts & wave metrics' },
        { name: 'AI Insights & Trends', href: '/analytics?tab=trends', icon: Sparkles, desc: 'Predictive trends & forecasts' },
        { name: 'Scorecards & Attrition', href: '/analytics?tab=attrition', icon: Activity, desc: 'Risk flags & milestone scores' },
      ]
    },
    { 
      name: 'Traffic Lights', 
      href: '/traffic-lights', 
      icon: Activity, 
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'TRAINER', 'TRAINEE'],
      flyoutItems: [
        { name: 'Operational Health Grid', href: '/traffic-lights', icon: Activity, desc: 'Live Green / Yellow / Red status monitor' },
        { name: 'Critical & Attention Flags', href: '/traffic-lights?status=RED', icon: TrendingDown, desc: 'Batches needing manager intervention' },
        { name: 'Wave Milestones', href: '/traffic-lights?tab=milestones', icon: ShieldCheck, desc: 'Milestone compliance & SLA progress' },
      ]
    },
    { 
      name: 'Activity Log', 
      href: '/history', 
      icon: ClipboardList, 
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'],
      flyoutItems: [
        { name: 'Training Activity Feed', href: '/history', icon: ClipboardList, desc: 'Recent system audit trail & trainer updates' },
        { name: 'Trainer & Trainee Logs', href: '/history?filter=trainers', icon: UserCheck, desc: 'Filtered training department event history' },
        { name: 'Latest 10 Notifications', href: '/history?tab=recent', icon: Activity, desc: 'Rolling notifications & log entries' },
      ]
    },
  ];

  return items.filter(item => item.roles.includes(role));
};

export default function Sidebar() {
  const { role, email, avatarUrl, userName, userMeta } = useRole();
  const navItems = getNavItems(role);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '/trainers': true
  });
  // Auto-expand active parent menu on route change
  useEffect(() => {
    if (pathname) {
      const matched = navItems.find(item => item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href)));
      if (matched && matched.subItems && matched.subItems.length > 0) {
        setExpandedMenus(prev => ({
          ...prev,
          [matched.href]: true
        }));
      }
    }
  }, [pathname]);

  const toggleMenu = (href: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedMenus(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  const isSubItemActive = (subHref: string) => {
    if (subHref.includes('?')) {
      const [subPath, subQuery] = subHref.split('?');
      if (pathname !== subPath) return false;
      const urlParams = new URLSearchParams(subQuery);
      let matches = true;
      urlParams.forEach((val, key) => {
        if (searchParams?.get(key) !== val) {
          matches = false;
        }
      });
      return matches;
    }
    // Base trainers directory view
    if (subHref === '/trainers') {
      const tab = searchParams?.get('tab');
      return pathname === '/trainers' && (!tab || tab === 'directory');
    }
    return pathname === subHref;
  };

  // Close mobile menu on route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  const profile = useMemo(() => {
    const displayName = (userName && userName !== 'N/A') ? userName : (email ? email.split('@')[0].split(/[\._]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : 'User');
    
    // Compute dynamic initials
    const parts = displayName.trim().split(/\s+/);
    const initials = parts.length >= 2 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
      : (displayName.slice(0, 2).toUpperCase() || 'U');

    // Dynamic role title
    const title = userMeta?.primaryTask !== 'N/A' && userMeta?.primaryTask
      ? userMeta.primaryTask
      : role === 'SUPER_ADMIN' ? 'Super Admin'
      : role === 'HOT_ADMIN' ? 'Head of Training'
      : role === 'QAS_ADMIN' ? 'QA Supervisor'
      : role === 'VIEW_ADMIN' ? 'Executive Admin (View Only)'
      : role === 'TRAINER' ? 'Trainer'
      : role === 'EMPLOYEE' ? 'Employee'
      : role || 'Operations User';

    return { name: displayName, title, initials, email: email || '' };
  }, [email, role, userName, userMeta]);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login?logout=true');
  };

  useEffect(() => {
    const handleOpenLogout = () => setShowLogoutModal(true);
    const handleOpenMobile = () => setIsMobileOpen(true);
    window.addEventListener('open-logout-modal', handleOpenLogout);
    window.addEventListener('open-mobile-menu', handleOpenMobile);
    return () => {
      window.removeEventListener('open-logout-modal', handleOpenLogout);
      window.removeEventListener('open-mobile-menu', handleOpenMobile);
    };
  }, []);

  return (
    <>
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside
        className={cn(
          "hidden lg:flex bg-primary dark:bg-[#1A1C1E] text-primary-foreground border-r border-primary/20 dark:border-slate-800 flex-col justify-between h-full shrink-0 transition-[width] duration-200 ease-out will-change-[width] shadow-md z-50 overflow-visible relative",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="relative z-10">
          <div className={cn("flex items-center border-b border-primary/20 dark:border-slate-800 transition-none", isCollapsed ? "justify-center p-4" : "justify-between p-4")}>
            {!isCollapsed && (
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-white flex items-center justify-center shadow-md shadow-black/10">
                  <Image src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/ctnp-logo.png" alt="CTNP" width={36} height={36} className="object-contain drop-shadow-sm p-1" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <h2 className="font-extrabold text-sm text-white tracking-tight whitespace-nowrap truncate">Cebu Tele-Net</h2>
                  <p className="text-[10px] font-medium text-white/60 whitespace-nowrap truncate uppercase tracking-wider">Operations Analytics</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="h-5 w-5 shrink-0" />
            </button>
          </div>

          <nav className="px-3 py-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const subList = item.subItems || [];
              const hasSubItems = subList.length > 0;
              const isExpanded = !!expandedMenus[item.href];
              const isParentActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <div key={item.href} className="relative group">
                  {/* Clean Navigation Link with Dropdown Toggle for Expanded Sidebar */}
                  {!isCollapsed ? (
                    <div>
                      <div
                        className={cn(
                          "flex items-center justify-between w-full rounded-xl transition-all duration-150 group/item",
                          isParentActive && !isExpanded
                            ? "bg-white/20 text-white font-bold shadow-xs"
                            : isParentActive
                            ? "bg-white/15 text-white font-semibold"
                            : "text-white/75 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Link
                          href={item.href}
                          prefetch={true}
                          className={cn(
                            "flex-1 flex items-center gap-3 px-3 py-2.5 text-xs font-semibold min-w-0 transition-colors duration-150",
                            !hasSubItems ? "rounded-xl" : "rounded-l-xl"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isParentActive ? "text-white" : "text-white/60 group-hover/item:text-white")} />
                          <span className="truncate">{item.name}</span>
                        </Link>
                        {hasSubItems && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleMenu(item.href, e);
                            }}
                            className="p-2 mr-1 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                            title={isExpanded ? "Collapse section" : "Expand section"}
                          >
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded ? "rotate-180 text-white" : "rotate-0 text-white/70 group-hover/item:text-white")} />
                          </button>
                        )}
                      </div>

                      {/* In-sidebar Dropdown Subitems for Expanded Mode */}
                      {hasSubItems && isExpanded && (
                        <div className="mt-1 ml-3.5 pl-3 border-l-2 border-white/20 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          {subList.map((sub, idx) => {
                            const isSubActive = isSubItemActive(sub.href);
                            const SubIcon = sub.icon || FileText;

                            return (
                              <Link
                                key={idx}
                                href={sub.href}
                                prefetch={true}
                                className={cn(
                                  "group/sub relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-all duration-150",
                                  isSubActive
                                    ? "bg-white/25 text-white font-bold shadow-xs"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                                )}
                              >
                                <SubIcon className={cn("h-4 w-4 shrink-0 transition-colors", isSubActive ? "text-white" : "text-white/70 group-hover/sub:text-white")} />
                                <span className="truncate flex-1 text-xs">{sub.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Collapsed Icon-Only Link */
                    <Link
                      href={item.href}
                      prefetch={true}
                      className={cn(
                        "flex items-center justify-center px-0 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                        isParentActive
                          ? "bg-white/20 text-white font-bold"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isParentActive ? "text-white" : "text-white/60 group-hover:text-white")} />
                    </Link>
                  )}

                  {/* Collapsed Hover Flyout Menu Popover with Rich Live Contents */}
                  {isCollapsed && (
                    <div className="absolute left-full top-0 pl-3 w-72 sm:w-80 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[100]">
                      <div className="bg-[#2F6798] dark:bg-[#161a1d] text-white border border-white/20 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in slide-in-from-left-2">
                        {/* Top Header Title Chip - Clickable with Direct Navigation */}
                        <Link
                          href={item.href}
                          prefetch={true}
                          className="flex items-center justify-between pb-2 mb-2 border-b border-white/15 hover:bg-white/10 -mx-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer group/hdr"
                          title={`Open ${item.name}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs group-hover/hdr:bg-white/30 transition-colors">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black uppercase tracking-wider text-white truncate block group-hover/hdr:text-white">{item.name}</span>
                              <span className="text-[10px] text-white/65 font-medium block">Quick Navigation &amp; Contents</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded-full shrink-0 group-hover/hdr:bg-white/25">
                            {(item.flyoutItems || subList).length} views
                          </span>
                        </Link>

                        {/* Rich Contextual Content List */}
                        <div className="space-y-1">
                          {(item.flyoutItems || subList).map((sub, idx) => {
                            const isSubActive = isSubItemActive(sub.href);
                            const SubIcon = sub.icon || FileText;

                            return (
                              <Link
                                key={idx}
                                href={sub.href}
                                prefetch={true}
                                className={cn(
                                  "group/sub relative flex items-start gap-2.5 p-2 rounded-xl transition-all duration-150 cursor-pointer",
                                  isSubActive
                                    ? "bg-white/25 text-white font-bold shadow-xs"
                                    : "text-white/85 hover:text-white hover:bg-white/15"
                                )}
                              >
                                <SubIcon className="h-4 w-4 shrink-0 text-white/80 group-hover/sub:text-white mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold truncate">{sub.name}</span>
                                    <ChevronRight className={cn(
                                      "w-3.5 h-3.5 shrink-0 transition-transform duration-150",
                                      isSubActive
                                        ? "opacity-100 translate-x-0 text-white"
                                        : "opacity-0 -translate-x-1 group-hover/sub:opacity-100 group-hover/sub:translate-x-0 text-white/70"
                                    )} />
                                  </div>
                                  {sub.desc && (
                                    <p className="text-[10.5px] text-white/60 group-hover/sub:text-white/80 font-normal truncate mt-0.5 leading-snug">
                                      {sub.desc}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - Settings & User Profile Card */}
        <div className="p-3 border-t border-primary/20 dark:border-slate-800 space-y-2 relative z-10">
          {/* Settings Item */}
          <div className="relative group">
            <Link
              href="/settings"
              title={isCollapsed ? "Settings" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                isCollapsed && "justify-center px-0",
                pathname === '/settings'
                  ? "bg-white/20 text-white font-bold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Settings className="h-4 w-4 shrink-0 transition-colors duration-200 text-white/60 group-hover:text-white" />
              {!isCollapsed && <span>Settings</span>}
            </Link>

            {/* Collapsed Hover Flyout for Settings */}
            {isCollapsed && (
              <div className="absolute left-full top-0 pl-3 w-72 sm:w-80 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[100]">
                <div className="bg-[#2F6798] dark:bg-[#161a1d] text-white border border-white/20 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in slide-in-from-left-2">
                  <Link
                    href="/settings"
                    prefetch={true}
                    className="flex items-center justify-between pb-2 mb-2 border-b border-white/15 hover:bg-white/10 -mx-1 px-2 py-1.5 rounded-xl transition-all cursor-pointer group/hdr"
                    title="Open Settings"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0 shadow-2xs group-hover/hdr:bg-white/30 transition-colors">
                        <Settings className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase tracking-wider text-white truncate block group-hover/hdr:text-white">Settings</span>
                        <span className="text-[10px] text-white/65 font-medium block">Configuration &amp; Preferences</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded-full shrink-0 group-hover/hdr:bg-white/25">
                      4 views
                    </span>
                  </Link>
                  <div className="space-y-1">
                    {[
                      { name: 'General Preferences', href: '/settings', desc: 'Hub preferences, display & timezone settings' },
                      { name: 'Profile & Account', href: '/settings?tab=profile', desc: 'Personal details, email & profile photo' },
                      { name: 'Appearance & Theme', href: '/settings?tab=appearance', desc: 'Dark mode, light mode & brand colors' },
                      { name: 'Security & Access', href: '/settings?tab=security', desc: 'User role, authentication & password' },
                    ].map((sub, idx) => (
                      <Link
                        key={idx}
                        href={sub.href}
                        prefetch={true}
                        className={cn(
                          "group/sub relative flex items-start gap-2.5 p-2 rounded-xl transition-all duration-150 cursor-pointer",
                          pathname === '/settings' && sub.href === '/settings'
                            ? "bg-white/25 text-white font-bold shadow-xs"
                            : "text-white/85 hover:text-white hover:bg-white/15"
                        )}
                      >
                        <Settings className="h-4 w-4 shrink-0 text-white/80 group-hover/sub:text-white mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate">{sub.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-0 -translate-x-1 group-hover/sub:opacity-100 group-hover/sub:translate-x-0 text-white/70 transition-transform duration-150" />
                          </div>
                          <p className="text-[10.5px] text-white/60 group-hover/sub:text-white/80 font-normal truncate mt-0.5 leading-snug">
                            {sub.desc}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Card with Avatar & Collapsed Hover Menu */}
          <div className="relative group">
            <div 
              onClick={() => router.push('/settings?tab=profile')}
              className={cn("flex items-center justify-between p-2.5 rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 dark:border-slate-700/50 shadow-xs cursor-pointer transition-all hover:bg-white/15", isCollapsed && "justify-center p-2")}
              title="View Profile Settings"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30 shadow-xs overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile.initials
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="text-xs font-bold text-white truncate leading-tight">{profile.name}</span>
                    <span className="text-[10px] font-medium text-white/60 truncate leading-tight">{profile.title}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogoutModal(true);
                  }}
                  title="Logout"
                  className="p-1.5 rounded-xl text-white/60 hover:text-red-300 hover:bg-red-500/20 transition-all shrink-0 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Collapsed Hover User Menu Card (Matches User Screenshot) */}
            {isCollapsed && (
              <div className="absolute left-full bottom-0 pl-3 w-64 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[100]">
                <div className="bg-primary/95 dark:bg-[#1A1C1E]/95 text-white border border-white/20 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in slide-in-from-left-2 space-y-2">
                  <div className="flex items-center gap-3 pb-2 border-b border-white/15">
                    <div className="w-9 h-9 rounded-full bg-white/25 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30 shadow-sm overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        profile.initials
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{profile.name}</span>
                      <span className="text-[10px] text-white/60 truncate">{profile.email} &middot; {profile.title}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all"
                    >
                      <Settings className="h-4 w-4 text-white/60" />
                      <span>Settings</span>
                    </Link>

                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-red-300" />
                      <span>Logout</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/10 text-[10px] text-white/40 flex items-center justify-between px-1">
                    <span>Training Performance Hub v1.0</span>
                    <span>Terms & Support</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Decorative Bottom Illustration Artwork */}
        <div className={cn("absolute bottom-5 left-0 right-0 pointer-events-none select-none z-0 overflow-hidden transition-all duration-200", isCollapsed ? "opacity-20 max-w-[80px]" : "opacity-40 dark:opacity-25")}>
          <img
            src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png"
            alt="Sidebar Illustration"
            className="w-full h-auto object-cover object-bottom pointer-events-none select-none"
          />
        </div>
      </aside>

      {/* Mobile Slide-Over Navigation Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative flex flex-col w-[82vw] max-w-xs bg-primary dark:bg-[#1A1C1E] text-white h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/15 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-white flex items-center justify-center shadow-md">
                  <Image src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/ctnp-logo.png" alt="CTNP" width={36} height={36} className="object-contain p-1" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-white tracking-tight">Cebu Tele-Net</h2>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">Operations Analytics</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const subList = item.subItems || [];
                const hasSubItems = subList.length > 0;
                const isExpanded = !!expandedMenus[item.href];
                const isParentActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <div key={item.href} className="space-y-1">
                    <div
                      className={cn(
                        "flex items-center justify-between w-full rounded-xl transition-all",
                        isParentActive && !isExpanded
                          ? "bg-white/20 text-white font-bold"
                          : isParentActive
                          ? "bg-white/15 text-white font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex-1 flex items-center gap-3 px-3 py-2.5 text-xs font-semibold",
                          !hasSubItems ? "rounded-xl" : "rounded-l-xl"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                      {hasSubItems && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleMenu(item.href, e);
                          }}
                          className="p-2 mr-1 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                          title={isExpanded ? "Collapse section" : "Expand section"}
                        >
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded ? "rotate-180 text-white" : "rotate-0 text-white/70")} />
                        </button>
                      )}
                    </div>

                    {/* Mobile Dropdown Subitems */}
                    {hasSubItems && isExpanded && (
                      <div className="ml-3.5 pl-3 border-l-2 border-white/20 space-y-1 py-1">
                        {subList.map((sub, idx) => {
                          const isSubActive = isSubItemActive(sub.href);
                          const SubIcon = sub.icon || FileText;

                          return (
                            <Link
                              key={idx}
                              href={sub.href}
                              onClick={() => setIsMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-all",
                                isSubActive
                                  ? "bg-white/25 text-white font-bold"
                                  : "text-white/75 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <SubIcon className={cn("h-4 w-4 shrink-0", isSubActive ? "text-white" : "text-white/70")} />
                              <span className="truncate text-xs">{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-3 border-t border-white/15 space-y-2 relative z-10">
              <Link
                href="/settings"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all",
                  pathname === '/settings'
                    ? "bg-white/20 text-white font-bold"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>

              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/10 border border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      profile.initials
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="text-xs font-bold text-white truncate leading-tight">{profile.name}</span>
                    <span className="text-[10px] font-medium text-white/60 truncate leading-tight">{profile.title}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="p-1.5 rounded-xl text-white/70 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Decorative Bottom Illustration Artwork for Mobile Drawer */}
            <div className="absolute bottom-5 left-0 right-0 pointer-events-none select-none z-0 overflow-hidden opacity-35 dark:opacity-20">
              <img
                src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png"
                alt="Sidebar Illustration"
                className="w-full h-auto object-cover object-bottom pointer-events-none select-none"
              />
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-5 right-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-20 h-20 bg-[#ED1C25] rounded-full flex items-center justify-center mx-auto shadow-md shadow-red-200 dark:shadow-red-900/30">
              <LogOut className="h-9 w-9 text-white stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Logout</h3>
              <div className="flex flex-col gap-1 text-center text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium">
                  Are you sure you want to logout?
                </span>
                <span className="text-xs font-normal leading-relaxed">
                  You will need to sign in again to access the dashboard.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-6 py-2.5 rounded-full bg-[#ED1C25] hover:bg-[#c8161e] text-white font-bold text-sm transition-colors shadow-md shadow-red-200 dark:shadow-red-900/30"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
