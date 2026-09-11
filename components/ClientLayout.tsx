'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import ThemeProvider from '@/components/ThemeProvider';
import dynamic from 'next/dynamic';
import DataSyncOverlay from '@/components/DataSyncOverlay';
import { ToastProvider } from '@/components/CustomToast';
import { RoleProvider, useRole } from '@/components/providers/RoleProvider';
import AccessRestrictedView from '@/components/AccessRestrictedView';
import PageLoading from '@/components/PageLoading';

const AiHubDrawer = dynamic(() => import('@/components/AiHubDrawer'), { ssr: false });

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, email, userName, userMeta, isLoading } = useRole();

  // Robust login detection: checks exact '/login', trailing slashes, subpaths, and query variants
  const isLoginPage = Boolean(
    pathname && (
      pathname.toLowerCase() === '/login' ||
      pathname.toLowerCase().startsWith('/login/') ||
      pathname.toLowerCase().startsWith('/login')
    )
  );

  // Client-side auth guard: if unauthenticated GUEST navigates to any protected page, redirect to /login
  useEffect(() => {
    if (!isLoading && role === 'GUEST' && !isLoginPage) {
      router.replace('/login');
    }
  }, [isLoading, role, isLoginPage, router]);

  if (isLoginPage) {
    return (
      <main className="w-full min-h-screen overflow-hidden">
        {children}
      </main>
    );
  }

  if (role === 'GUEST') {
    return (
      <main className="w-full min-h-screen overflow-hidden">
        <PageLoading
          title="Redirecting..."
          subtitle="Taking you to the login screen"
        />
      </main>
    );
  }

  // Access Restriction Guard: Block regular employees who have not been granted explicit role access
  if (!isLoading && (role === 'UNAUTHORIZED' || role === 'EMPLOYEE')) {
    return (
      <AccessRestrictedView
        email={email}
        userName={userName}
        userMeta={userMeta}
      />
    );
  }

  return (
    <>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Suspense fallback={<div className="hidden lg:block w-64 shrink-0 bg-primary h-full" />}>
          <Sidebar />
        </Suspense>
        <div className="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden">
          <Topbar />
          <main className="flex-1 p-3 sm:p-4 pb-24 lg:pb-4 overflow-y-auto min-h-0">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
      <AiHubDrawer />
      <DataSyncOverlay />
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RoleProvider>
          <LayoutContent>{children}</LayoutContent>
        </RoleProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
