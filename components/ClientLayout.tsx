'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import ThemeProvider from '@/components/ThemeProvider';
import dynamic from 'next/dynamic';
import DataSyncOverlay from '@/components/DataSyncOverlay';
import { ToastProvider } from '@/components/CustomToast';
import { RoleProvider } from '@/components/providers/RoleProvider';

const AiHubDrawer = dynamic(() => import('@/components/AiHubDrawer'), { ssr: false });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <ThemeProvider>
      <ToastProvider>
        <RoleProvider>
          {isLoginPage ? (
            <main className="w-full h-screen overflow-hidden">
              {children}
            </main>
          ) : (
            <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
              <Suspense fallback={<div className="hidden lg:block w-64 shrink-0 bg-primary h-screen" />}>
                <Sidebar />
              </Suspense>
              <div className="flex-1 flex flex-col min-w-0 w-full">
                <Topbar />
                <main className="flex-1 p-3 sm:p-4 pb-24 lg:pb-4 overflow-y-auto">
                  {children}
                </main>
              </div>
              <MobileBottomNav />
            </div>
          )}
          {!isLoginPage && <AiHubDrawer />}
          <DataSyncOverlay />
        </RoleProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
