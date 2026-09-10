'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Users, UserCheck, ShieldCheck, Activity, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useRole } from '@/components/providers/RoleProvider';

function MobileBottomNavContent() {
  const { role } = useRole();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trainerTab = searchParams?.get('tab') || 'directory';

  const isAttendanceActive = pathname.startsWith('/trainers') && (trainerTab === 'attendance' || trainerTab === 'attendance-reliability' || trainerTab === 'reliability');
  const isTrainersActive = pathname.startsWith('/trainers') && !isAttendanceActive;

  const isEmployee = role === 'EMPLOYEE' || role === 'GUEST';

  const tabs = isEmployee ? [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      name: 'Traffic',
      href: '/traffic-lights',
      icon: Activity,
      isActive: pathname.startsWith('/traffic-lights'),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      isActive: pathname.startsWith('/settings'),
    },
  ] : [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      name: 'Trainees',
      href: '/trainees',
      icon: Users,
      isActive: pathname.startsWith('/trainees'),
    },
    {
      name: 'Trainers',
      href: '/trainers?tab=directory',
      icon: UserCheck,
      isActive: isTrainersActive,
    },
    {
      name: 'Attendance',
      href: '/trainers?tab=attendance',
      icon: ShieldCheck,
      isActive: isAttendanceActive,
    },
    {
      name: 'Traffic',
      href: '/traffic-lights',
      icon: Activity,
      isActive: pathname.startsWith('/traffic-lights'),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      isActive: pathname.startsWith('/settings'),
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#2F6798] dark:bg-[#1A365D] border-t border-white/15 px-1 py-1 shadow-[0_-4px_25px_rgba(0,0,0,0.18)] pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              prefetch={true}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 flex-1 min-w-0 relative",
                tab.isActive
                  ? "bg-white/20 text-white font-bold shadow-xs scale-102"
                  : "text-white/75 hover:text-white hover:bg-white/10 font-medium"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 mb-0.5 text-white stroke-[2.2]", tab.isActive ? "opacity-100" : "opacity-85")} />
              <span className="text-[9.5px] xs:text-[10px] text-white tracking-tight leading-none text-center truncate max-w-full">
                {tab.name}
              </span>
              {tab.isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-white mt-1 shadow-xs animate-in zoom-in-50" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function MobileBottomNav() {
  return (
    <Suspense fallback={
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#2F6798] h-14 border-t border-white/15 pb-[max(0.375rem,env(safe-area-inset-bottom))]" />
    }>
      <MobileBottomNavContent />
    </Suspense>
  );
}
