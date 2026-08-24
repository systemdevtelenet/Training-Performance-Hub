'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, UserCheck } from 'lucide-react';

export default function NotificationDropdown() {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hover:text-slate-700 dark:hover:text-slate-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
      </button>

      {/* Dropdown Menu Container */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notifications</h3>
              <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">3 New</span>
            </div>
            <button 
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              onClick={() => setShowNotifications(false)}
            >
              Mark all as read
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            
            {/* Item 1 (Critical Alert - Red Theme) */}
            <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Critical Attrition Warning</p>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">10m ago</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Batch General -10 reached 100% loss rate today.</p>
                  <div className="pt-1.5">
                    <span className="inline-block px-2.5 py-1 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      View Trainees
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Item 2 (Milestone - Blue Theme) */}
            <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group bg-blue-50/30 dark:bg-blue-900/10">
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">PST Phase Transition</p>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">2h ago</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Batch 4 (FLEET-PST) transitions to PST tomorrow at 8:00 AM.</p>
                  <div className="pt-1.5">
                    <span className="inline-block px-2.5 py-1 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors">
                      View Batch
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Item 3 (System Action - Green Theme) */}
            <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 group-hover:scale-110 transition-transform">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Status Record Updated</p>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">1d ago</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Nissi-Jeh updated Vincent Celdran's shift schedule.</p>
                </div>
              </div>
            </div>

          </div>
          
          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-center">
            <button className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors py-1 px-4 w-full rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
              View All Notifications
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
