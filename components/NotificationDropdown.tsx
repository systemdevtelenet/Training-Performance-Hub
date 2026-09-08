'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, UserCheck, UserMinus, ShieldCheck, UserCog, ClipboardList, Download, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  icon_type: string;
  author: string;
  created_at: string;
}

const getIconProps = (type: string) => {
  switch (type) {
    case 'alert': return { icon: AlertTriangle, bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' };
    case 'export': return { icon: Download, bg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'user': return { icon: UserMinus, bg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'success': return { icon: ShieldCheck, bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'trainer': return { icon: UserCog, bg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' };
    default: return { icon: ClipboardList, bg: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400' };
  }
};

export default function NotificationDropdown() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        const lastReadTimestamp = localStorage.getItem('notifications_read_at');
        if (!lastReadTimestamp) {
          setUnreadCount(data.length);
        } else {
          const readTime = new Date(lastReadTimestamp).getTime();
          const unread = data.filter(item => new Date(item.created_at).getTime() > readTime).length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

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

  const handleToggleMarkRead = () => {
    if (unreadCount > 0) {
      localStorage.setItem('notifications_read_at', new Date().toISOString());
      setUnreadCount(0);
    } else {
      localStorage.removeItem('notifications_read_at');
      setUnreadCount(notifications.length);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (!showNotifications) fetchNotifications();
        }}
        className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hover:text-slate-700 dark:hover:text-slate-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
        )}
      </button>

      {/* Dropdown Menu Container */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notifications</h3>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#2F6798] dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-200/60">
                  {unreadCount} New
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
                  All Read
                </span>
              )}
            </div>
            <button 
              className="text-xs font-bold text-[#2F6798] hover:text-[#24527a] dark:text-blue-400 transition-colors cursor-pointer"
              onClick={handleToggleMarkRead}
            >
              {unreadCount > 0 ? 'Mark all as read' : 'Mark all as unread'}
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#2F6798]" />
                <span className="text-xs font-medium">Fetching notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 text-center gap-2">
                <Bell className="w-8 h-8 opacity-40 text-[#2F6798]" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No notifications</p>
                <p className="text-[11px] text-slate-400">System updates and activity alerts will show up here.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const { icon: Icon, bg } = getIconProps(item.icon_type);
                return (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setShowNotifications(false);
                      router.push('/history');
                    }}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex gap-3">
                      <div className={`shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${bg} shadow-xs group-hover:scale-105 transition-transform`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                          <span className="text-[10px] font-medium text-slate-400 shrink-0 mt-0.5">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            By {item.author}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-center">
            <button 
              onClick={() => {
                setShowNotifications(false);
                router.push('/history');
              }}
              className="text-xs font-bold text-slate-600 hover:text-[#2F6798] dark:text-slate-300 dark:hover:text-blue-400 transition-colors py-1.5 px-4 w-full rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              View All Activity Logs
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

