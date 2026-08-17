'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Checks if user is on the login page
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {isLoginPage ? (
          /* Full-screen wrapper for Login Page (No Sidebar, No Topbar) */
          <main className="w-full h-screen overflow-hidden">
            {children}
          </main>
        ) : (
          /* Standard Dashboard Layout Shell */
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
      </body>
    </html>
  );
}