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
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark') {
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
