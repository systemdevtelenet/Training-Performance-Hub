import React from 'react';

interface PageLoadingProps {
  title?: string;
  subtitle?: string;
}

export default function PageLoading({
  title = 'Loading...',
  subtitle = 'Getting the latest information ready for you',
}: PageLoadingProps) {
  return (
    <div className="fixed inset-0 z-[999] w-screen h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 animate-in fade-in duration-150">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-[#2F6798] animate-spin shadow-sm" />
          <div className="absolute inset-0 rounded-full bg-[#2F6798]/10 blur-xl animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 max-w-md">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
