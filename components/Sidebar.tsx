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
  Circle,
  Activity,
  Calendar,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole, UserRole } from '@/components/providers/RoleProvider';

const getNavItems = (role: UserRole) => {
  const items = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'EMPLOYEE', 'GUEST'] },
    { name: 'Trainees', href: '/trainees', icon: Users, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'] },
    { 
      name: 'Trainers', 
      href: '/trainers', 
      icon: UserCheck,
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'EMPLOYEE'],
      subItems: [
        { name: 'Directory', href: '/trainers', icon: FileText },
        { name: 'Attendance', href: '/trainers?tab=attendance', icon: Calendar },
        { name: 'Reliability', href: '/trainers?tab=reliability', icon: ShieldCheck }
      ]
    },
    { name: 'Analytics Trends', href: '/analytics', icon: BarChart, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'] },
    { name: 'Traffic Lights', href: '/traffic-lights', icon: Activity, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'] },
    { name: 'AI Insights', href: '/ai-insights', icon: Sparkles, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'] },
    { name: 'Activity Log', href: '/history', icon: ClipboardList, roles: ['SUPER_ADMIN', 'VIEW_ADMIN'] },
  ];

  return items.filter(item => item.roles.includes(role));
};

export default function Sidebar() {
  const { role, email } = useRole();
  const navItems = getNavItems(role);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '/trainers': true
  });

  const profile = useMemo(() => {
    const emailStr = (email || '').toLowerCase();
    if (emailStr.includes('bosssilver') || role === 'VIEW_ADMIN') {
      return { name: 'Boss Silver', title: 'Executive Admin (View Only)', initials: 'BS', email: email || 'bosssilver.telenet@gmail.com' };
    }
    if (emailStr.includes('nreguero') || role === 'HOT_ADMIN') {
      return { name: 'Nissi-Jeh Reguero', title: 'Head of Training', initials: 'NJ', email: email || 'nreguero.telenet@gmail.com' };
    }
    if (emailStr.includes('ralasagas') || role === 'QAS_ADMIN') {
      return { name: 'Raza Alasagas', title: 'QAS Head', initials: 'RA', email: email || 'ralasagas.telenet@gmail.com' };
    }
    if (email) {
      const handle = email.split('@')[0];
      const parts = handle.split(/[\._]/);
      const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      const initials = parts.map(p => p.charAt(0).toUpperCase()).join('').slice(0, 2);
      return { name, title: role || 'Operations User', initials: initials || 'U', email };
    }
    return { name: 'Nissi-Jeh Reguero', title: 'Head of Training', initials: 'NJ', email: 'nreguero.telenet@gmail.com' };
  }, [email, role]);

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login?logout=true');
  };

  useEffect(() => {
    const handleOpenLogout = () => setShowLogoutModal(true);
    window.addEventListener('open-logout-modal', handleOpenLogout);
    return () => window.removeEventListener('open-logout-modal', handleOpenLogout);
  }, []);

  return (
    <>
      <aside
        className={cn(
          "bg-primary dark:bg-[#1A1C1E] text-primary-foreground border-r border-primary/20 dark:border-slate-800 flex flex-col justify-between h-screen sticky top-0 shrink-0 transition-[width] duration-200 ease-out will-change-[width] shadow-md z-50 overflow-x-hidden",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div>
          <div className={cn("flex items-center border-b border-primary/20 dark:border-slate-800 transition-none", isCollapsed ? "justify-center p-4" : "justify-between p-4")}>
            {!isCollapsed && (
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-white flex items-center justify-center shadow-md shadow-black/10">
                  <Image src="/images/ctnp-logo.png" alt="CTNP" width={36} height={36} className="object-contain drop-shadow-sm p-1" />
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

          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isExpanded = expandedMenus[item.href];
              
              if (item.subItems) {
                return (
                  <div key={item.href} className="relative group space-y-1">
                    <button
                      onClick={() => {
                        if (isCollapsed) {
                          setIsCollapsed(false);
                          setExpandedMenus(prev => ({ ...prev, [item.href]: true }));
                        } else {
                          setExpandedMenus(prev => ({ ...prev, [item.href]: !prev[item.href] }));
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                        isCollapsed && "justify-center px-0",
                        isActive
                          ? "bg-white/20 text-white font-bold"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isActive ? "text-white" : "text-white/60 group-hover:text-white")} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </div>
                      {!isCollapsed && (
                        isExpanded ? <ChevronUp className="h-4 w-4 text-white/60" /> : <ChevronDown className="h-4 w-4 text-white/60" />
                      )}
                    </button>
                    
                    {!isCollapsed && isExpanded && (
                      <div className="ml-5 pl-3 my-1 border-l border-white/20 space-y-1">
                        {item.subItems.map(subItem => {
                          const currentTab = searchParams?.get('tab');
                          const subUrl = new URL(subItem.href, 'http://localhost');
                          const subTab = subUrl.searchParams.get('tab');
                          const isSubActive = (subTab === currentTab) || (!subTab && !currentTab);
                          const SubIcon = subItem.icon || FileText;
                          
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                isSubActive
                                  ? "bg-white/20 text-white font-bold"
                                  : "text-white/60 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <SubIcon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isSubActive ? "text-white" : "text-white/60")} />
                              <span className="truncate">{subItem.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Collapsed Hover Popover Menu Card */}
                    {isCollapsed && (
                      <div className="absolute left-full top-0 ml-3.5 w-60 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[100] bg-primary/95 dark:bg-[#1A1C1E]/95 text-white border border-white/20 rounded-2xl shadow-2xl p-2.5 backdrop-blur-xl animate-in fade-in slide-in-from-left-2">
                        <div className="px-3 py-2 border-b border-white/15 mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-white/80">{item.name}</span>
                          <span className="text-[10px] font-semibold text-white/50">{item.subItems.length} views</span>
                        </div>
                        <div className="space-y-1">
                          {item.subItems.map(subItem => {
                            const currentTab = searchParams?.get('tab');
                            const subUrl = new URL(subItem.href, 'http://localhost');
                            const subTab = subUrl.searchParams.get('tab');
                            const isSubActive = (subTab === currentTab) || (!subTab && !currentTab);
                            const SubIcon = subItem.icon || FileText;

                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                  isSubActive
                                    ? "bg-white/25 text-white font-bold shadow-xs"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/15", isSubActive ? "bg-white/30 text-white" : "bg-white/10 text-white/70")}>
                                  <SubIcon className="h-3.5 w-3.5" />
                                </div>
                                <span className="truncate">{subItem.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                      isCollapsed && "justify-center px-0",
                      isActive
                        ? "bg-white/20 text-white font-bold"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isActive ? "text-white" : "text-white/60 group-hover:text-white")} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>

                  {/* Collapsed Floating Tooltip Popover */}
                  {isCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[100] bg-primary/95 dark:bg-[#1A1C1E]/95 text-white border border-white/20 rounded-xl px-3.5 py-2 text-xs font-bold shadow-2xl backdrop-blur-xl whitespace-nowrap animate-in fade-in slide-in-from-left-2">
                      {item.name}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - Settings & User Profile Card */}
        <div className="p-3 border-t border-primary/20 dark:border-slate-800 space-y-2">
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

            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[100] bg-primary/95 dark:bg-[#1A1C1E]/95 text-white border border-white/20 rounded-xl px-3.5 py-2 text-xs font-bold shadow-2xl backdrop-blur-xl whitespace-nowrap animate-in fade-in slide-in-from-left-2">
                Settings
              </div>
            )}
          </div>

          {/* User Profile Card with Avatar & Collapsed Hover Menu */}
          <div className="relative group">
            <div className={cn("flex items-center justify-between p-2.5 rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/10 dark:border-slate-700/50 shadow-xs cursor-pointer transition-all hover:bg-white/15", isCollapsed && "justify-center p-2")}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
                  {profile.initials}
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
                  onClick={() => setShowLogoutModal(true)}
                  title="Logout"
                  className="p-1.5 rounded-xl text-white/60 hover:text-red-300 hover:bg-red-500/20 transition-all shrink-0 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Collapsed Hover User Menu Card (Matches User Screenshot) */}
            {isCollapsed && (
              <div className="absolute left-full bottom-0 ml-3.5 w-64 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[100] bg-primary/95 dark:bg-[#1A1C1E]/95 text-white border border-white/20 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in slide-in-from-left-2 space-y-2">
                <div className="flex items-center gap-3 pb-2 border-b border-white/15">
                  <div className="w-9 h-9 rounded-full bg-white/25 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30 shadow-sm">
                    {profile.initials}
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
            )}
          </div>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative shadow-2xl text-center space-y-6">
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
