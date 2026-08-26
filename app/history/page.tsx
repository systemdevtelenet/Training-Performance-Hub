'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, UserCog, UserMinus, FileText, AlertTriangle, ShieldCheck, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { logActivity } from '@/lib/actions/logger';

interface ActivityLog {
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

export default function HistoryPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) {
        setActivities(data);
      } else if (error) {
        console.error('Error fetching logs:', error);
      }
      setIsLoading(false);
    }
    fetchLogs();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    
    // Log this action to our new dynamic system!
    await logActivity({
      title: 'Activity Log Exported',
      description: 'A user requested an export of the chronological activity log.',
      iconType: 'export',
      author: 'Current User', // In a full app, grab the active user's name
    });
    
    // Refresh logs so the export action appears immediately
    const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
    if (data) setActivities(data);

    // Simulate 2 second export generation, then show success for 1 second
    setTimeout(() => {
      setExportComplete(true);
      setTimeout(() => {
        setIsExporting(false);
        setExportComplete(false);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            A chronological timeline of system events and administrative actions.
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <FileText className="h-4 w-4" />
          Export Log
        </button>
      </div>

      {/* Timeline Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#2F6798]" />
            <p className="text-sm text-slate-500 font-medium">Loading activity logs...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <ClipboardList className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">No activity recorded yet.</p>
          </div>
        ) : (
          activities.map((activity) => {
            const { icon: Icon, bg } = getIconProps(activity.icon_type);
            return (
              <div key={activity.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-colors dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 dark:hover:border-slate-700/80">
                
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${bg} shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {activity.description}
                    </p>
                  </div>
                </div>
                
                {/* Meta */}
                <div className="shrink-0 flex flex-col sm:items-end text-sm pl-14 sm:pl-0">
                  <span className="text-slate-500 font-medium dark:text-slate-400">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                  <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1 dark:text-slate-500">
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
