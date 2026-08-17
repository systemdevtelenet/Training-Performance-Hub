'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  TrendingUp, 
  Sparkles,
  User,
  LogOut,
  X,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Trainees', href: '/trainees', icon: Users },
  { name: 'Trainers', href: '/trainers', icon: UserCheck },
  { name: 'Analytics Trends', href: '/analytics', icon: TrendingUp },
  { name: 'AI Insights', href: '/ai-insights', icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    router.push('/login');
  };

  return (
    <>
      <aside 
        className={cn(
          "border-r border-slate-200 bg-white flex flex-col justify-between h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div>
          {/* Brand & Menu Toggle Header */}
          <div className={cn("flex items-center border-b border-slate-100 transition-all", isCollapsed ? "justify-center p-4" : "justify-between p-6")}>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h2 className="font-bold text-lg text-slate-900 tracking-tight whitespace-nowrap">Cebu Tele-Net</h2>
                <p className="text-xs text-slate-500 whitespace-nowrap">Operations Analytics</p>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="h-5 w-5 shrink-0" />
            </button>
          </div>

          {/* Main Navigation Links */}
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isCollapsed && "justify-center px-0",
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile, Logout & Status Area */}
        <div className="p-3 space-y-1 border-t border-slate-100">
          <Link
            href="/profile"
            title={isCollapsed ? "Profile" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
              isCollapsed && "justify-center px-0",
              pathname === '/profile'
                ? "bg-slate-100 text-slate-900"
                : "text-slate-900 hover:bg-slate-50"
            )}
          >
            <User className="h-4 w-4 shrink-0 text-slate-800" />
            {!isCollapsed && <span>Profile</span>}
          </Link>

          <button
            onClick={() => setShowLogoutModal(true)}
            title={isCollapsed ? "Logout" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors text-left",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-800" />
            {!isCollapsed && <span>Logout</span>}
          </button>

          {/* System Status */}
          <div className={cn("pt-4 pb-2 px-3 flex items-center gap-2 text-xs text-slate-500", isCollapsed && "justify-center px-0")}>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            {!isCollapsed && <span className="truncate">Live Systems Connected</span>}
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Pop-up Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Circular Logout Icon */}
            <div className="w-20 h-20 bg-[#e52e2e] rounded-full flex items-center justify-center mx-auto shadow-md shadow-red-200">
              <LogOut className="h-9 w-9 text-white stroke-[2.5]" />
            </div>

            {/* Title & Prompt */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Logout</h3>
              <p className="text-sm text-slate-500 font-medium">
                Are you sure you want to logout?
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-6 py-2.5 rounded-full bg-[#e52e2e] hover:bg-[#cc2525] text-white font-bold text-sm transition-colors shadow-md shadow-red-200"
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