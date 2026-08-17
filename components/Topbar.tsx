'use client';

import { Bell } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          Training Performance Hub
        </h1>
      </div>

      {/* Right Corner: Notification & Profile Avatar */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button 
          className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Circular Profile Avatar */}
        <div 
          className="h-9 w-9 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
          title="N. Reguero"
        >
          NR
        </div>
      </div>
    </header>
  );
}