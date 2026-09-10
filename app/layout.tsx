import './globals.css';
import { Poppins } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';

import type { Viewport, Metadata } from 'next';

const poppins = Poppins({ 
  subsets: ['latin'], 
  variable: '--font-sans', 
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap'
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2F6798',
};

export const metadata: Metadata = {
  title: 'Training Performance Hub',
  description: 'Enterprise Performance, Attendance & Analytics Hub',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CTNP Hub',
  },
  formatDetection: {
    telephone: false,
  },
};

import PwaRegister from '@/components/PwaRegister';

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <PwaRegister />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
