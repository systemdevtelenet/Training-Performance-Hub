'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, UserCog, UserMinus, FileText, AlertTriangle, ShieldCheck, Download, Loader2, CheckCircle2 } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'alert',
    title: 'Trainer Reliability Flagged',
    description: 'System automatically flagged Joven Anañon for critical reliability (79.8% attrition impact).',
    time: '2 hours ago',
    user: 'System UI Copilot',
    icon: AlertTriangle,
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    id: 2,
    type: 'export',
    title: 'Q3 Summary Report Exported',
    description: 'The Q3 Executive Summary was exported as CSV.',
    time: '4 hours ago',
    user: 'N. Reguero',
    icon: Download,
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    id: 3,
    type: 'user',
    title: 'Trainee Status Updated',
    description: 'Changed status of trainee "Maria Clara" from Active to Attrition (Performance).',
    time: 'Yesterday at 3:45 PM',
    user: 'M. Santos',
    icon: UserMinus,
    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    id: 4,
    type: 'admin',
    title: 'New Cohort Created',
    description: 'Wave 45 - Inhouse Department was successfully created with 24 trainees.',
    time: 'Yesterday at 9:00 AM',
    user: 'N. Reguero',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    id: 5,
    type: 'trainer',
    title: 'Trainer Re-assigned',
    description: 'Vincent Luis Celdran was assigned to Wave 45.',
    time: 'Aug 21 at 1:15 PM',
    user: 'System Admin',
    icon: UserCog,
    iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
];

export default function HistoryPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setExportComplete(false);
    
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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-colors dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 dark:hover:border-slate-700/80">
            
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${activity.iconBg} shadow-sm`}>
                <activity.icon className="w-5 h-5" />
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
              <span className="text-slate-500 font-medium dark:text-slate-400">{activity.time}</span>
              <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1 dark:text-slate-500">
                By <span className="font-semibold text-slate-600 dark:text-slate-300">{activity.user}</span>
              </span>
            </div>
          </div>
        ))}
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
