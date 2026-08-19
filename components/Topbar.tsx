'use client';

import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Topbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Training Performance Hub
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        <button 
          className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-800" />
        </button>

        <div 
          className="h-9 w-9 rounded-full bg-slate-900 dark:bg-slate-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
          title="N. Reguero"
        >
          NR
        </div>
      </div>
    </header>
  );
}
