'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CalendarCheck, 
  UserCheck, 
  UserMinus, 
  ShieldCheck, 
  UserCog, 
  ClipboardList, 
  Download, 
  Loader2, 
  LogIn, 
  Activity, 
  MessageSquare, 
  Users 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { getActivityLogs } from '@/lib/actions/logger';

import { useRole } from '@/components/providers/RoleProvider';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  icon_type: string;
  author: string;
  created_at: string;
}

const formatTimeAgo = (dateStr: string) => {
  try {
    const dist = formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    return dist
      .replace(/^about\s+/i, '')
      .replace(/^almost\s+/i, '')
      .replace(/^over\s+/i, '')
      .replace(/^less than a\s+/i, '< 1 ');
  } catch {
    return 'Just now';
  }
};

const getIconProps = (type: string) => {
  switch (type) {
    case 'login':
      return { 
        icon: LogIn, 
        tag: 'AUTH',
        bg: 'bg-[#E8F0FE] text-[#1967D2] dark:bg-blue-950/70 dark:text-blue-300',
        badgeBg: 'bg-blue-50 text-[#1967D2] dark:bg-blue-950/50 dark:text-blue-300'
      };
    case 'traffic':
      return { 
        icon: Activity, 
        tag: 'TRAFFIC LIGHT',
        bg: 'bg-[#FEF3D6] text-[#D97706] dark:bg-amber-950/70 dark:text-amber-300',
        badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
      };
    case 'remark':
      return { 
        icon: MessageSquare, 
        tag: 'REMARK NOTE',
        bg: 'bg-[#E3F2FD] text-[#0288D1] dark:bg-sky-950/70 dark:text-sky-300',
        badgeBg: 'bg-sky-50 text-[#0288D1] dark:bg-sky-950/50 dark:text-sky-300'
      };
    case 'attendance':
      return { 
        icon: CalendarCheck, 
        tag: 'ATTENDANCE',
        bg: 'bg-[#EDE7F6] text-[#5E35B1] dark:bg-purple-950/70 dark:text-purple-300',
        badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
      };
    case 'user':
      return { 
        icon: Users, 
        tag: 'DIRECTORY',
        bg: 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/70 dark:text-emerald-300',
        badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
      };
    case 'export':
      return { 
        icon: Download, 
        tag: 'REPORT',
        bg: 'bg-[#E8EAF6] text-[#3949AB] dark:bg-indigo-950/70 dark:text-indigo-300',
        badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
      };
    case 'alert':
      return { 
        icon: AlertTriangle, 
        tag: 'ALERT',
        bg: 'bg-[#FCE8E6] text-[#D93025] dark:bg-rose-950/70 dark:text-rose-300',
        badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
      };
    default:
      return { 
        icon: ClipboardList, 
        tag: 'ACTIVITY',
        bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      };
  }
};

const parseNotifItem = (row: any): NotificationItem => {
  const title = row.title || 'System Notification';
  let desc = (row.description || '').trim();
  let author = (row.author || '').trim();

  // Extract author if formatted as (by Name) or submitted by Name
  const byMatch = desc.match(/\(by ([^)]+)\)/i) || desc.match(/submitted by ([^,.]+)/i);
  if (byMatch) {
    if (!author || author === 'System' || author === 'Authorized User') {
      author = byMatch[1].trim();
    }
    desc = desc.replace(/\(by [^)]+\)/gi, '').trim();
  }
  if (!author) author = 'System';

  // Derive smart icon_type
  let type = row.icon_type || '';
  const tLower = title.toLowerCase();
  const dLower = desc.toLowerCase();

  if (!type || type === 'alert') {
    if (tLower.includes('login') || tLower.includes('auth') || dLower.includes('logged into')) {
      type = 'login';
    } else if (tLower.includes('export') || dLower.includes('export') || dLower.includes('download')) {
      type = 'export';
    } else if (tLower.includes('remark') || tLower.includes('note') || dLower.includes('added note') || dLower.includes('remark')) {
      type = 'remark';
    } else if (tLower.includes('traffic') || dLower.includes('traffic')) {
      type = 'traffic';
    } else if (tLower.includes('attendance') || tLower.includes('leave') || dLower.includes('attendance')) {
      type = 'attendance';
    } else if (tLower.includes('employee') || tLower.includes('trainer') || tLower.includes('trainee')) {
      type = 'user';
    } else if (tLower.includes('delete') || tLower.includes('removed') || tLower.includes('critical') || dLower.includes('loss')) {
      type = 'alert';
    } else {
      type = 'activity';
    }
  }

  return {
    id: String(row.notification_id || row.id || Math.random()),
    title,
    description: desc,
    icon_type: type,
    author,
    created_at: row.created_at || new Date().toISOString()
  };
};

export default function NotificationDropdown() {
  const { email } = useRole();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const [notifPrefs, setNotifPrefs] = useState({
    performanceAlerts: true,
    trainingUpdates: true,
    deliveryInApp: true,
    deliveryEmail: false,
  });

  useEffect(() => {
    const loadPrefs = () => {
      if (email) {
        const saved = localStorage.getItem(`user_notification_prefs_${email.toLowerCase().trim()}`);
        if (saved) {
          try {
            setNotifPrefs(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };
    loadPrefs();
    const handleUpdate = (e: any) => {
      if (e?.detail) setNotifPrefs(e.detail);
    };
    window.addEventListener('notification-prefs-updated', handleUpdate);
    return () => window.removeEventListener('notification-prefs-updated', handleUpdate);
  }, [email]);

  const fetchNotifications = async () => {
    try {
      const { data: notifData } = await getActivityLogs(15);

      let items = notifData && notifData.length > 0
        ? notifData.map(parseNotifItem)
        : [];

      // Filter by active preferences
      if (!notifPrefs.performanceAlerts) {
        items = items.filter(it => it.icon_type !== 'alert' && it.icon_type !== 'traffic');
      }
      if (!notifPrefs.trainingUpdates) {
        items = items.filter(it => it.icon_type !== 'user' && it.icon_type !== 'attendance' && it.icon_type !== 'remark');
      }

      setNotifications(items);
      const lastReadTimestamp = localStorage.getItem('notifications_read_at');
      if (!lastReadTimestamp) {
        setUnreadCount(notifPrefs.deliveryInApp ? items.length : 0);
      } else {
        const readTime = new Date(lastReadTimestamp).getTime();
        const unread = items.filter(item => new Date(item.created_at).getTime() > readTime).length;
        setUnreadCount(notifPrefs.deliveryInApp ? unread : 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        fetchNotifications();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [notifPrefs]);

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
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#ED1C25] text-white text-[8.5px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs leading-none animate-in zoom-in-50 duration-200 pointer-events-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Container */}
      {showNotifications && (
        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[80vh] flex flex-col">
          
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
            {!notifPrefs.deliveryInApp ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 text-center gap-2">
                <Bell className="w-8 h-8 opacity-40 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">In-App Alerts Muted</p>
                <p className="text-[11px] text-slate-400 max-w-xs">You have disabled in-app notification delivery in your Settings preferences.</p>
              </div>
            ) : isLoading ? (
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
                const { icon: Icon, bg, tag, badgeBg } = getIconProps(item.icon_type);
                return (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setShowNotifications(false);
                      router.push('/history');
                    }}
                    className="p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
                  >
                    <div className="flex gap-3">
                      <div className={`shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${bg} shadow-2xs group-hover:scale-105 transition-transform`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="pt-0.5 flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-slate-400 font-medium truncate">
                            By <strong className="font-bold text-slate-600 dark:text-slate-300">{item.author}</strong>
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-md text-[8.5px] font-extrabold uppercase tracking-wider ${badgeBg}`}>
                            {tag}
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

