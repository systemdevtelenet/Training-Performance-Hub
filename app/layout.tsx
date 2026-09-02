'use client';

import './globals.css';
import { Open_Sans } from 'next/font/google';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ThemeProvider from '@/components/ThemeProvider';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';

const AiCopilotDrawer = dynamic(() => import('@/components/AiCopilotDrawer'), { ssr: false });

const openSans = Open_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['300', '400', '500', '600', '700', '800'] });

import { RoleProvider } from '@/components/providers/RoleProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className={`${openSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen transition-colors duration-200">
        <ThemeProvider>
          <RoleProvider>
            {isLoginPage ? (
              <main className="w-full h-screen overflow-hidden">
                {children}
              </main>
            ) : (
              <div className="flex min-h-screen w-full">
                <Suspense fallback={<div className="w-64 shrink-0 bg-primary h-screen" />}>
                  <Sidebar />
                </Suspense>
                <div className="flex-1 flex flex-col min-w-0">
                  <Topbar />
                  <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                  </main>
                </div>
              </div>
            )}
            {!isLoginPage && <AiCopilotDrawer />}
          </RoleProvider>
        </ThemeProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
