'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserRound, BriefcaseBusiness, GraduationCap, UserCheck, CalendarDays, CheckCircle2, ClipboardCheck, TrendingDown } from 'lucide-react';

export type DrawerTrainee = {
  isBatch?: boolean;
  members?: any[];
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
  const [selectedMember, setSelectedMember] = useState<DrawerTrainee | null>(null);

  useEffect(() => {
    if (trainee) {
      setDisplayedTrainee(trainee);
      setSelectedMember(null); // Reset drill-down when a new batch/trainee is opened
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setSelectedMember(null);
    }, 250);
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

  // Render logic for INDIVIDUAL Trainee Details
  const renderTraineeDetails = (t: DrawerTrainee, isDrillDown: boolean) => {
    const totalAttendance = (t.p || 0) + (t.a || 0);
    const attendanceRate = totalAttendance ? `${(((t.p || 0) / totalAttendance) * 100).toFixed(1)}%` : 'N/A';
    const status = t.status || (t.isEndorsed ? 'Endorsed' : t.isLoss ? 'Loss' : 'Active');
    
    const statusColor = t.isLoss ? 'bg-destructive text-white' : 'bg-emerald-500 text-white';
    const roleColor = 'bg-primary text-white';

    const information = [
      { section: 'TRAINEE INFORMATION', items: [
        { label: 'Full Name', value: t.name, icon: UserRound },
        { label: 'Batch', value: t.batchName, icon: BriefcaseBusiness },
        { label: 'Account / Client', value: t.accountName, icon: BriefcaseBusiness },
        { label: 'Training Type', value: t.trainingType, icon: GraduationCap },
        { label: 'Assigned Trainer', value: t.assignedTrainer || 'Not assigned', icon: UserCheck },
      ]},
      { section: 'PERFORMANCE METRICS', items: [
        { label: 'Attendance Rate', value: attendanceRate, icon: CalendarDays },
        { label: 'Present / Absent', value: `${t.p || 0} / ${t.a || 0}`, icon: ClipboardCheck },
      ]}
    ];

    return (
      <div className="flex-1 overflow-y-auto">
        {isDrillDown && (
          <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
            <button 
              onClick={() => setSelectedMember(null)}
              className="text-xs font-bold text-[#2F6798] hover:underline flex items-center gap-1"
            >
              ← Back to Batch
            </button>
          </div>
        )}
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 dark:border-slate-700/50">
          <div className="w-24 h-24 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-md flex items-center justify-center overflow-hidden">
            <UserRound className="h-12 w-12 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.name}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{t.accountName}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${roleColor}`}>{t.batchName}</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${statusColor}`}>{status}</span>
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8 pt-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="bg-primary px-6 py-3 flex text-xs font-bold text-white tracking-wide">
              <div className="w-1/2 flex items-center gap-2 uppercase"><span className="opacity-70">ⓘ</span> FIELD</div>
              <div className="w-1/2 flex items-center gap-2 uppercase"><ClipboardCheck className="h-4 w-4 opacity-70" /> DETAILS</div>
            </div>
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
        </div>
      </div>
    );
  };

  // Render logic for BATCH view
  const renderBatchDetails = (batch: DrawerTrainee) => {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 flex flex-col items-center sm:items-start gap-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{batch.name} Summary</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Account: {batch.accountName}</p>
          
          <div className="grid grid-cols-2 gap-4 w-full mt-4">
            <div className="flex flex-col p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-[#2F6798]">
                  <UserRound className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Headcount</span>
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{batch.headcount || 0}</span>
            </div>
            
            <div className="flex flex-col p-4 rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-wider">Attrition</span>
              </div>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{batch.attritionRate || '0.0%'}</span>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">Trainee List</h4>
          <div className="space-y-2">
            {(batch.members || []).map((member, idx) => (
              <button 
                key={idx} 
                onClick={() => setSelectedMember({
                  ...member,
                  accountName: batch.accountName,
                  batchName: batch.batchName,
                  trainingType: batch.trainingType
                })}
                className="flex w-full items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#2F6798] hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <UserRound className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{member.name}</span>
                </div>
                <div className="flex items-center">
                  {(() => {
                    const statusStr = (member.status || (member.isEndorsed ? 'ENDORSED' : member.isLoss ? 'EOC' : 'ACTIVE')).toUpperCase();
                    if (statusStr === 'ENDORSED') {
                      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50">ENDORSED</span>;
                    }
                    if (statusStr === 'EOC' || statusStr === 'LOSS' || statusStr === 'ATTRITION') {
                      return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-slate-200 text-slate-600 bg-slate-100">EOC</span>;
                    }
                    return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-200 text-amber-700 bg-amber-50">{statusStr}</span>;
                  })()}
                </div>
              </button>
            ))}
            {(!batch.members || batch.members.length === 0) && (
              <p className="text-sm text-slate-500 italic">No trainees found in this batch.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button aria-label="Close modal" onClick={onClose} className={`absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'} cursor-default`} />
      
      <aside role="dialog" aria-modal="true" className={`absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-transform duration-300 ease-out sm:w-[min(500px,calc(100%-2rem))] ${open ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}`}>
        
        <header className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">
            {selectedMember ? 'Trainee Details' : displayedTrainee.isBatch ? 'Batch Details' : 'Trainee Details'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/80 hover:text-white transition-colors focus:outline-none">
            <X className="h-5 w-5" />
          </button>
        </header>

        {selectedMember ? renderTraineeDetails(selectedMember, true) : displayedTrainee.isBatch ? renderBatchDetails(displayedTrainee) : renderTraineeDetails(displayedTrainee, false)}
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
