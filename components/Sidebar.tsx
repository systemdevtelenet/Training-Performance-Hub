'use client';

import { useState, useEffect } from 'react';
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
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole, UserRole } from '@/components/providers/RoleProvider';

const getNavItems = (role: UserRole) => {
  const items = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'EMPLOYEE', 'GUEST'] },
    { name: 'Trainees', href: '/trainees', icon: Users, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'] },
    { 
      name: 'Trainers', 
      href: '/trainers', 
      icon: UserCheck,
      roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'EMPLOYEE'],
      subItems: [
        { name: 'Directory', href: '/trainers' },
        { name: 'Attendance', href: '/trainers?tab=attendance' },
        { name: 'Reliability', href: '/trainers?tab=reliability' }
      ]
    },
    { name: 'Analytics Trends', href: '/analytics', icon: BarChart, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'] },
    { name: 'Traffic Lights', href: '/traffic-lights', icon: Activity, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'] },
    { name: 'AI Insights', href: '/ai-insights', icon: Sparkles, roles: ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'] },
    { name: 'Activity Log', href: '/history', icon: ClipboardList, roles: ['SUPER_ADMIN'] },
  ];

  return items.filter(item => item.roles.includes(role));
};

export default function Sidebar() {
  const { role } = useRole();
  const navItems = getNavItems(role);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '/trainers': true
  });

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    router.push('/login');
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
          "bg-primary dark:bg-slate-950 text-primary-foreground backdrop-blur-xl border-r border-primary/20 dark:border-slate-800 flex flex-col justify-between h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-50",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div>
          <div className={cn("flex items-center border-b border-primary/20 dark:border-slate-800 transition-all", isCollapsed ? "justify-center p-4" : "justify-between p-4")}>
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
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
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
                  <div key={item.href} className="space-y-1">
                    <button
                      onClick={() => {
                        if (isCollapsed) setIsCollapsed(false);
                        setExpandedMenus(prev => ({ ...prev, [item.href]: !prev[item.href] }));
                      }}
                      title={isCollapsed ? item.name : undefined}
                      className={cn(
                        "w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]",
                        isCollapsed && "justify-center px-0",
                        isActive
                          ? "bg-white/15 text-white shadow-[inset_2px_0_0_0_#fff]"
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
                      <div className="pl-9 pr-2 py-1 space-y-1">
                        {item.subItems.map(subItem => {
                          const currentTab = searchParams?.get('tab');
                          const subUrl = new URL(subItem.href, 'http://localhost');
                          const subTab = subUrl.searchParams.get('tab');
                          const isSubActive = (subTab === currentTab) || (!subTab && !currentTab);
                          
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                                isSubActive
                                  ? "bg-white/20 text-white"
                                  : "text-white/60 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <Circle className={cn("h-1.5 w-1.5", isSubActive ? "fill-white text-white" : "fill-transparent text-white/40")} />
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]",
                    isCollapsed && "justify-center px-0",
                    isActive
                      ? "bg-white/15 text-white shadow-[inset_2px_0_0_0_#fff]"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition-colors duration-200", isActive ? "text-white" : "text-white/60 group-hover:text-white")} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 space-y-1 border-t border-primary/20 dark:border-slate-800">
          <Link
            href="/profile"
            title={isCollapsed ? "Profile" : undefined}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]",
              isCollapsed && "justify-center px-0",
              pathname === '/profile'
                ? "bg-white/15 text-white shadow-[inset_2px_0_0_0_#fff]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <User className="h-4 w-4 shrink-0 transition-colors duration-200 text-white/60 group-hover:text-white" />
            {!isCollapsed && <span>Profile</span>}
          </Link>

          <Link
            href="/settings"
            title={isCollapsed ? "Settings" : undefined}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]",
              isCollapsed && "justify-center px-0",
              pathname === '/settings'
                ? "bg-white/15 text-white shadow-[inset_2px_0_0_0_#fff]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Settings className="h-4 w-4 shrink-0 transition-colors duration-200 text-white/60 group-hover:text-white" />
            {!isCollapsed && <span>Settings</span>}
          </Link>

          <button
            onClick={() => setShowLogoutModal(true)}
            title={isCollapsed ? "Logout" : undefined}
            className={cn(
              "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:bg-red-500/20 hover:text-red-100 transition-all duration-200 text-left hover:scale-[1.02]",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 transition-colors duration-200 text-white/60 group-hover:text-red-300" />
            {!isCollapsed && <span>Logout</span>}
          </button>

          <div className={cn("pt-4 pb-2 px-3 flex items-center gap-2 text-xs font-semibold text-white/60", isCollapsed && "justify-center px-0")}>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {!isCollapsed && <span className="truncate">Live Systems Connected</span>}
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
