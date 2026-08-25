'use client';

import './globals.css';
import { Poppins } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ThemeProvider from '@/components/ThemeProvider';
import AiCopilotDrawer from '@/components/AiCopilotDrawer';

const poppins = Poppins({ subsets: ['latin'], variable: '--font-sans', weight: ['300', '400', '500', '600', '700'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className={`${poppins.variable}`} suppressHydrationWarning>
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
          {isLoginPage ? (
            <main className="w-full h-screen overflow-hidden">
              {children}
            </main>
          ) : (
            <div className="flex min-h-screen w-full">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Topbar />
                <main className="flex-1 p-6 overflow-y-auto">
                  {children}
                </main>
              </div>
            </div>
          )}
          {!isLoginPage && <AiCopilotDrawer />}
        </ThemeProvider>
      </body>
    </html>
  );
}
