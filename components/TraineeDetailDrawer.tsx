'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserRound, BriefcaseBusiness, GraduationCap, UserCheck, CalendarDays, CheckCircle2, ClipboardCheck, TrendingDown } from 'lucide-react';

export type DrawerTrainee = {
  name: string;
  status?: string;
  p?: number;
  a?: number;
  isEndorsed?: boolean;
  isLoss?: boolean;
  assignedTrainer?: string;
  month?: string;
  quarter?: string;
  accountName: string;
  batchName: string;
  trainingType: string;
  headcount?: number;
  attritionRate?: string;
  contextLabel?: string;
};

export function TraineeDetailDrawer({ trainee, onClose }: { trainee: DrawerTrainee | null; onClose: () => void }) {
  const [rendered, setRendered] = useState(Boolean(trainee));
  const [open, setOpen] = useState(Boolean(trainee));
  const [displayedTrainee, setDisplayedTrainee] = useState<DrawerTrainee | null>(trainee);

  useEffect(() => {
    if (trainee) {
      setDisplayedTrainee(trainee);
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => setRendered(false), 250);
    return () => window.clearTimeout(timer);
  }, [trainee]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rendered) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, rendered]);

  if (!rendered || !displayedTrainee || typeof window === 'undefined') return null;

  const totalAttendance = (displayedTrainee.p || 0) + (displayedTrainee.a || 0);
  const attendanceRate = totalAttendance ? `${(((displayedTrainee.p || 0) / totalAttendance) * 100).toFixed(1)}%` : 'N/A';
  const status = displayedTrainee.status || (displayedTrainee.isEndorsed ? 'Endorsed' : displayedTrainee.isLoss ? 'Loss' : 'Active');
  
  const statusColor = displayedTrainee.isLoss ? 'bg-destructive text-white' : 'bg-emerald-500 text-white';
  const roleColor = 'bg-primary text-white';

  const information = [
    { section: 'TRAINEE INFORMATION', items: [
      { label: 'Full Name', value: displayedTrainee.name, icon: UserRound },
      { label: 'Batch', value: displayedTrainee.batchName, icon: BriefcaseBusiness },
      { label: 'Account / Client', value: displayedTrainee.accountName, icon: BriefcaseBusiness },
      { label: 'Training Type', value: displayedTrainee.trainingType, icon: GraduationCap },
      { label: 'Assigned Trainer', value: displayedTrainee.assignedTrainer || 'Not assigned', icon: UserCheck },
    ]},
    { section: 'PERFORMANCE METRICS', items: [
      displayedTrainee.headcount !== undefined ? 
        { label: 'Batch Headcount', value: String(displayedTrainee.headcount), icon: UserRound } :
        { label: 'Attendance Rate', value: attendanceRate, icon: CalendarDays },
      
      displayedTrainee.headcount !== undefined ? 
        { label: 'Batch Attrition', value: displayedTrainee.attritionRate || '0.0%', icon: TrendingDown } :
        { label: 'Present / Absent', value: `${displayedTrainee.p || 0} / ${displayedTrainee.a || 0}`, icon: ClipboardCheck },
    ]}
  ];

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <button aria-label="Close modal" onClick={onClose} className={`absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'} cursor-default`} />
      
      {/* Drawer Container */}
      <aside role="dialog" aria-modal="true" aria-label={`${displayedTrainee.name} details`} className={`absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-transform duration-300 ease-out sm:w-[min(500px,calc(100%-2rem))] ${open ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}`}>
        
        {/* Header - Solid Primary */}
        <header className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">Trainee Details</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/80 hover:text-white transition-colors focus:outline-none">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Section */}
          <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 dark:border-slate-700/50">
            {/* Avatar */}
            <div className="w-24 h-24 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-md flex items-center justify-center overflow-hidden">
              <UserRound className="h-12 w-12 text-slate-400 dark:text-slate-500" />
            </div>
            
            {/* Info & Badges */}
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{displayedTrainee.name}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{displayedTrainee.accountName}</p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${roleColor}`}>
                  {displayedTrainee.batchName}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${statusColor}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          {/* Table-like Info Section */}
          <div className="p-6 md:p-8 pt-4">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              
              {/* Table Header */}
              <div className="bg-primary px-6 py-3 flex text-xs font-bold text-white tracking-wide">
                <div className="w-1/2 flex items-center gap-2 uppercase"><span className="opacity-70">ⓘ</span> FIELD</div>
                <div className="w-1/2 flex items-center gap-2 uppercase"><ClipboardCheck className="h-4 w-4 opacity-70" /> DETAILS</div>
              </div>

              {/* Sections */}
              {information.map((section, sIdx) => (
                <div key={sIdx}>
                  <div className="bg-slate-50/50 dark:bg-slate-900/30 px-6 py-3 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-primary dark:text-primary tracking-wide">
                    {section.section}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {section.items.map((item, iIdx) => {
                      const Icon = item.icon;
                      return (
                        <div key={iIdx} className="flex px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="w-1/2 flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <Icon className="h-4 w-4 text-primary" />
                            {item.label}
                          </div>
                          <div className="w-1/2 flex items-center text-sm font-medium text-slate-800 dark:text-slate-100">
                            {item.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 mt-6">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-[#2F6798]">
                      <UserRound className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Headcount</span>
                  </div>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    {displayedTrainee.headcount !== undefined ? displayedTrainee.headcount : 'N/A'}
                  </span>
                </div>
                
                <div className="flex flex-col p-4 rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-wider">Attrition</span>
                  </div>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {displayedTrainee.attritionRate || '0.0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
