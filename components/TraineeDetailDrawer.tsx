'use client';

import { useEffect, useState } from 'react';
import { X, UserRound, BriefcaseBusiness, GraduationCap, UserCheck, CalendarDays, CheckCircle2, ClipboardCheck } from 'lucide-react';

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

  if (!rendered || !displayedTrainee) return null;

  const totalAttendance = (displayedTrainee.p || 0) + (displayedTrainee.a || 0);
  const attendanceRate = totalAttendance ? `${(((displayedTrainee.p || 0) / totalAttendance) * 100).toFixed(1)}%` : 'N/A';
  const status = displayedTrainee.status;
  const statusClass = displayedTrainee.isLoss
    ? 'bg-[#ED1C25]/10 text-[#ED1C25]'
    : 'bg-[#2F6798]/10 text-[#2F6798]';

  const information = [
    ['Full Name', displayedTrainee.name, UserRound],
    ['Batch', displayedTrainee.batchName, BriefcaseBusiness],
    ['Account / Client', displayedTrainee.accountName, BriefcaseBusiness],
    ['Training', displayedTrainee.trainingType, GraduationCap],
    ['Trainer', displayedTrainee.assignedTrainer || 'Not assigned', UserCheck],
    ...(status ? [['Status', status, CheckCircle2] as const] : []),
  ];

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button aria-label="Close trainee details" onClick={onClose} className={`absolute inset-0 bg-slate-900/10 dark:bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside role="dialog" aria-modal="true" aria-label={`${displayedTrainee.name} details`} className={`absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-transform duration-250 ease-out sm:w-[min(440px,calc(100%-2rem))] ${open ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}`}>
        <header className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">{displayedTrainee.name}</h2>
                {status && <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase ${statusClass}`}>{status}</span>}
              </div>
              <p className="text-sm font-medium text-[#2F6798]">{displayedTrainee.batchName}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{displayedTrainee.accountName}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close trainee details" className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">{displayedTrainee.contextLabel || 'Trainee Information'}</h3>
            <dl className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700">
              {information.map(([label, value, Icon]) => {
                const DetailIcon = Icon as typeof UserRound;
                return <div key={label as string} className="flex items-center justify-between gap-4 px-4 py-3"><dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><DetailIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />{label as string}</dt><dd className="max-w-[58%] text-right text-xs font-semibold text-slate-800 dark:text-slate-100">{value as string}</dd></div>;
              })}
            </dl>
          </section>

          {displayedTrainee.headcount !== undefined ? <section><h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Performance</h3><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4"><p className="text-[0.65rem] font-bold uppercase text-slate-500 dark:text-slate-400">Headcount</p><p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{displayedTrainee.headcount}</p></div><div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4"><p className="text-[0.65rem] font-bold uppercase text-slate-500 dark:text-slate-400">Attrition</p><p className="mt-1 text-xl font-bold text-[#ED1C25]">{displayedTrainee.attritionRate || 'N/A'}</p></div></div></section> : <section>
            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Performance</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4"><p className="text-[0.65rem] font-bold uppercase text-slate-500 dark:text-slate-400">Attendance</p><p className="mt-1 text-xl font-bold text-[#2F6798]">{attendanceRate}</p></div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4"><p className="text-[0.65rem] font-bold uppercase text-slate-500 dark:text-slate-400">Present / Absent</p><p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{displayedTrainee.p || 0}<span className="text-sm text-slate-400 dark:text-slate-500"> / </span><span className="text-[#ED1C25]">{displayedTrainee.a || 0}</span></p></div>
              <div className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4"><p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase text-slate-500 dark:text-slate-400"><ClipboardCheck className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />Training outcome</p><p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{displayedTrainee.isEndorsed ? 'Endorsed' : displayedTrainee.isLoss ? 'Marked as loss' : 'In progress'}</p></div>
            </div>
          </section>}

          {(displayedTrainee.month || displayedTrainee.quarter) && <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><CalendarDays className="h-4 w-4 text-slate-400 dark:text-slate-500" />Reporting period: {[displayedTrainee.month, displayedTrainee.quarter].filter(Boolean).join(' · ')}</p>}
        </div>
      </aside>
    </div>
  );
}
