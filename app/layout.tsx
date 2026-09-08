import './globals.css';
import { Open_Sans } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';

const openSans = Open_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['300', '400', '500', '600', '700', '800'] });

export const metadata = {
  title: 'Training Performance Hub',
  description: 'Enterprise Performance, Attendance & Analytics Hub',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
