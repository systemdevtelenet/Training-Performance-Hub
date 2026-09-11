'use client';

import React, { useState, useEffect } from 'react';
import PageLoading from '@/components/PageLoading';
import { 
  ClipboardList, 
  UserCog, 
  UserMinus, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  Download, 
  Loader2, 
  CheckCircle2, 
  LogIn, 
  Activity, 
  MessageSquare, 
  Users, 
  CalendarCheck,
  Search,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { logActivity, getActivityLogs } from '@/lib/actions/logger';

interface ActivityLog {
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
        badgeBg: 'bg-blue-50 text-[#1967D2] dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40'
      };
    case 'traffic':
      return { 
        icon: Activity, 
        tag: 'TRAFFIC LIGHT',
        bg: 'bg-[#FEF3D6] text-[#D97706] dark:bg-amber-950/70 dark:text-amber-300',
        badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
      };
    case 'remark':
      return { 
        icon: MessageSquare, 
        tag: 'REMARK NOTE',
        bg: 'bg-[#E3F2FD] text-[#0288D1] dark:bg-sky-950/70 dark:text-sky-300',
        badgeBg: 'bg-sky-50 text-[#0288D1] dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40'
      };
    case 'attendance':
      return { 
        icon: CalendarCheck, 
        tag: 'ATTENDANCE',
        bg: 'bg-[#EDE7F6] text-[#5E35B1] dark:bg-purple-950/70 dark:text-purple-300',
        badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40'
      };
    case 'user':
      return { 
        icon: Users, 
        tag: 'DIRECTORY',
        bg: 'bg-[#E8F5E9] text-[#2E7D32] dark:bg-emerald-950/70 dark:text-emerald-300',
        badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
      };
    case 'export':
      return { 
        icon: FileText, 
        tag: 'REPORT',
        bg: 'bg-[#E8EAF6] text-[#3949AB] dark:bg-indigo-950/70 dark:text-indigo-300',
        badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40'
      };
    case 'alert':
      return { 
        icon: AlertTriangle, 
        tag: 'ALERT',
        bg: 'bg-[#FCE8E6] text-[#D93025] dark:bg-rose-950/70 dark:text-rose-300',
        badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40'
      };
    default:
      return { 
        icon: ClipboardList, 
        tag: 'ACTIVITY',
        bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700'
      };
  }
};

const parseLogItem = (row: any): ActivityLog => {
  const title = row.title || 'System Activity';
  let desc = (row.description || '').trim();
  let author = (row.author || '').trim();

  // Extract author if formatted as (by Name) or submitted by Name
  const byMatch = desc.match(/\(by ([^)]+)\)/i) || desc.match(/submitted by ([^,.]+)/i);
  if (byMatch) {
    if (!author || author === 'Authorized User' || author === 'System') {
      author = byMatch[1].trim();
    }
    desc = desc.replace(/\(by [^)]+\)/gi, '').trim();
  }
  if (!author) author = 'System';

  // Smart type detection
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

import { useRole } from '@/components/providers/RoleProvider';

export default function HistoryPage() {
  const { role, actualRole, email, userName } = useRole();
  const currentRole = role || actualRole;
  const isTrainer = currentRole === 'TRAINER';
  const isTrainee = currentRole === 'TRAINEE';
  const isAdmin = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(currentRole);

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  
  const supabase = createClient();

  const fetchLogs = async () => {
    try {
      const { data: notifData } = await getActivityLogs(30);

      if (notifData && notifData.length > 0) {
        let items = notifData.map(parseLogItem);

        if (!isAdmin && (email || userName)) {
          const cleanEmail = (email || '').toLowerCase().trim();
          const emailPrefix = cleanEmail.split('@')[0];
          const cleanName = (userName || '').toLowerCase().trim();

          items = items.filter(it => {
            const titleLow = (it.title || '').toLowerCase();
            const descLow = (it.description || '').toLowerCase();
            const authorLow = (it.author || '').toLowerCase();

            if (titleLow.includes('login') || descLow.includes('logged into')) {
              return descLow.includes(cleanEmail) || descLow.includes(emailPrefix) || authorLow.includes(cleanEmail);
            }

            if (
              titleLow.includes('employee access') || 
              titleLow.includes('role assignment') || 
              titleLow.includes('system admin') || 
              descLow.includes('admin access') || 
              descLow.includes('employee management')
            ) {
              return false;
            }

            if (isTrainer) {
              return (
                authorLow.includes(cleanEmail) || 
                authorLow.includes(cleanName) ||
                descLow.includes(cleanEmail) ||
                (cleanName && descLow.includes(cleanName)) ||
                titleLow.includes('trainee') ||
                titleLow.includes('traffic light') ||
                titleLow.includes('attendance')
              );
            }

            if (isTrainee) {
              return (
                descLow.includes(cleanEmail) || 
                (cleanName && descLow.includes(cleanName)) ||
                authorLow.includes(cleanEmail)
              );
            }

            return true;
          });
        }

        setActivities(items);
      } else {
        setActivities([]);
      }
    } catch (e) {
      console.error('Error fetching activity history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Supabase Realtime subscription for live activity updates
    const channel = supabase
      .channel('history_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    
    await logActivity({
      title: 'Activity Log Exported',
      description: 'A user requested an export of the chronological activity log.',
      iconType: 'export',
      author: 'Authorized User',
    });
    
    await fetchLogs();

    setTimeout(() => {
      setExportComplete(true);
      setTimeout(() => {
        setIsExporting(false);
        setExportComplete(false);
      }, 1500);
    }, 2000);
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedCategory === 'traffic' && act.icon_type !== 'traffic' && act.icon_type !== 'remark') return false;
    if (selectedCategory === 'attendance' && act.icon_type !== 'attendance') return false;
    if (selectedCategory === 'trainee' && !act.title.toLowerCase().includes('trainee') && !act.description.toLowerCase().includes('trainee')) return false;
    if (selectedCategory === 'trainer' && !act.title.toLowerCase().includes('trainer') && !act.description.toLowerCase().includes('trainer')) return false;
    if (selectedCategory === 'auth' && act.icon_type !== 'login') return false;
    if (selectedCategory === 'alert' && act.icon_type !== 'alert') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchDesc = act.description.toLowerCase().includes(q);
      const matchAuthor = act.author.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor) return false;
    }

    return true;
  });

  const categories = [
    { id: 'ALL', label: 'All Activities' },
    { id: 'trainee', label: 'Trainees' },
    { id: 'trainer', label: 'Trainers' },
    { id: 'attendance', label: 'Trainer Attendance' },
    { id: 'traffic', label: 'Traffic Lights & Remarks' },
    { id: 'auth', label: 'User Logins' },
    { id: 'alert', label: 'Alerts & Actions' },
  ];

  // Full screen loading on initial load, matching other pages
  if (isLoading && activities.length === 0) {
    return (
      <PageLoading
        title="Loading Activity Logs..."
        subtitle="Fetching recent system audit logs and timeline events"
      />
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full pb-10 font-sans text-slate-800 dark:text-slate-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Activity Log</h1>
          <p className="text-xs font-normal text-slate-400 mt-0.5 dark:text-slate-400">
            A chronological timeline of system events, logins, updates, and administrative actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#2F6798] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all focus:outline-none shrink-0 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[#2F6798]" />
            <span>Export Log</span>
          </button>
        </div>
      </div>

      {/* Unified White Container for Filters & Activity Feed */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        {/* Search & Category Filter Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2F6798] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative group w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
            <input
              type="text"
              placeholder="Search activity by keyword, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-1.5 pl-9 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 shadow-xs"
            />
          </div>
        </div>

        {/* Activity Feed Cards */}
        <div className="space-y-2 pt-1">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <ClipboardList className="w-8 h-8 mb-2 opacity-40 text-[#2F6798]" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {searchQuery || selectedCategory !== 'ALL'
                  ? 'No activity logs match your filter criteria.'
                  : 'No activity recorded yet.'}
              </p>
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const { icon: Icon, bg, tag, badgeBg } = getIconProps(activity.icon_type);
              return (
                <div 
                  key={activity.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs transition-all duration-150"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Circular Icon matching Image 2 */}
                    <div className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full ${bg} shadow-2xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {activity.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider ${badgeBg}`}>
                          {tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 sm:hidden pt-0.5">
                        <span>By <strong className="font-bold text-slate-600 dark:text-slate-300">{activity.author}</strong></span>
                        <span>&middot;</span>
                        <span>{formatTimeAgo(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Meta (Desktop Right Side) */}
                  <div className="shrink-0 hidden sm:flex flex-col items-end text-right pl-4">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                    <span className="text-slate-400 text-[11px] mt-0.5">
                      By <strong className="font-bold text-slate-700 dark:text-slate-200">{activity.author}</strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Export Loading Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60 animate-in fade-in duration-200 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              
              {!exportComplete ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Generating Report</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Compiling activity logs into PDF...</p>
                  </div>
                  {/* Fake Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-[progress_2s_ease-in-out_forwards]" style={{ width: '0%', animation: 'progress 2s ease-in-out forwards' }}>
                      <style>{`@keyframes progress { to { width: 100%; } }`}</style>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Export Complete</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your report has been downloaded.</p>
                  </div>
                </>
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
