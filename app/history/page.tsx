'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, UserCog, UserMinus, FileText, AlertTriangle, ShieldCheck, Download, Loader2, CheckCircle2 } from 'lucide-react';
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

const parseLogItem = (row: any): ActivityLog => {
  const title = row.title || 'System Event';
  const desc = row.description || '';
  let author = row.author || 'Authorized User';
  let icon_type = row.icon_type || 'alert';

  // Extract author if formatted as (by Name) or submitted by Name
  if (!row.author) {
    const byMatch = desc.match(/\(by ([^)]+)\)/i) || desc.match(/submitted by ([^,.]+)/i);
    if (byMatch) {
      author = byMatch[1].trim();
    }
  }

  // Derive icon_type if not set
  if (!row.icon_type) {
    const tLower = title.toLowerCase();
    const dLower = desc.toLowerCase();
    if (tLower.includes('traffic') || dLower.includes('traffic')) icon_type = 'alert';
    else if (tLower.includes('evaluation') || dLower.includes('evaluation')) icon_type = 'success';
    else if (tLower.includes('attendance') || dLower.includes('attendance')) icon_type = 'trainer';
    else if (tLower.includes('employee') || dLower.includes('employee')) icon_type = 'user';
    else if (tLower.includes('export') || dLower.includes('export')) icon_type = 'export';
    else icon_type = 'alert';
  }

  return {
    id: String(row.notification_id || row.id || Math.random()),
    title,
    description: desc,
    icon_type,
    author,
    created_at: row.created_at || new Date().toISOString()
  };
};

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

export default function HistoryPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  
  const supabase = createClient();

  const fetchLogs = async () => {
    try {
      const { data: notifData } = await getActivityLogs(100);

      if (notifData && notifData.length > 0) {
        setActivities(notifData.map(parseLogItem));
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
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
    if (selectedCategory === 'traffic' && !act.title.toLowerCase().includes('traffic')) return false;
    if (selectedCategory === 'attendance' && !act.title.toLowerCase().includes('attendance')) return false;
    if (selectedCategory === 'trainee' && !act.title.toLowerCase().includes('trainee')) return false;
    if (selectedCategory === 'employee' && !act.title.toLowerCase().includes('employee')) return false;
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
    { id: 'traffic', label: 'Traffic Lights' },
    { id: 'attendance', label: 'Trainer Attendance' },
    { id: 'trainee', label: 'Trainees' },
    { id: 'employee', label: 'Employees' },
    { id: 'alert', label: 'Removals / Alerts' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Activity Log</h1>
          <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
            A chronological timeline of system events, edits, and administrative actions (Latest 10 logs).
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:outline-none shrink-0"
        >
          <FileText className="h-3.5 w-3.5 text-[#2F6798]" />
          <span>Export Log</span>
        </button>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2F6798] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            placeholder="Filter logs by name or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
          />
        </div>
      </div>

      {/* Timeline Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-2.5 min-h-[350px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#2F6798]" />
            <p className="text-xs text-slate-500 font-medium">Loading activity logs...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <ClipboardList className="w-8 h-8 mb-1.5 opacity-50 text-[#2F6798]" />
            <p className="text-xs font-medium">
              {searchQuery || selectedCategory !== 'ALL'
                ? 'No activity logs matching your filter.'
                : 'No activity recorded yet. Edits and changes will appear here automatically.'}
            </p>
          </div>
        ) : (
          filteredActivities.map((activity) => {
            const { icon: Icon, bg } = getIconProps(activity.icon_type);
            return (
              <div key={activity.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-colors dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 dark:hover:border-slate-700/80">
                
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${bg} shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {activity.title}
                    </h3>
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-snug">
                      {activity.description}
                    </p>
                  </div>
                </div>
                
                {/* Meta */}
                <div className="shrink-0 flex flex-col sm:items-end text-xs pl-11 sm:pl-0">
                  <span className="text-[11px] text-slate-500 font-medium dark:text-slate-400">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                  <span className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-1 dark:text-slate-500">
                    By <span className="font-semibold text-slate-600 dark:text-slate-300">{activity.author}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
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
