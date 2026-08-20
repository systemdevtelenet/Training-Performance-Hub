'use client';

import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Topbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      <div>
        <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400">
          Training Performance Hub
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button 
          className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hover:text-slate-700 dark:hover:text-slate-200 hover:scale-105"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
        </button>

        <div 
          className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[#1f4a6e] text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-primary/30 cursor-pointer hover:opacity-90 hover:scale-105 transition-all ring-2 ring-white dark:ring-slate-800"
          title="N. Reguero"
        >
          NR
        </div>
      </div>
    </header>
  );
}
