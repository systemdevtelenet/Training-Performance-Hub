'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { MONTH_ORDER } from '@/lib/analytics-utils';
import { useRole } from '@/components/providers/RoleProvider';
import { useRouter } from 'next/navigation';

export interface TrainerAttendanceRecord {
  attendance_id?: number;
  trainer_id?: number;
  date: string;
  month: string;
  day: number;
  weekday: string;
  status: string;
}

export interface TrainerAttendanceData {
  name: string;
  present: number;
  absent: number;
  suspension: number;
  rate: string;
  timeline: TrainerAttendanceRecord[];
}

function getAttendanceStatus(rate: number) {
  if (rate >= 95) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  if (rate >= 90) return { label: 'Good', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
  if (rate >= 80) return { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  return { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
}

function getRateColor(rate: number) {
  if (rate < 80) return 'text-rose-600';
  if (rate >= 95) return 'text-emerald-600';
  return 'text-[#2F6798]';
}

function getStatusPill(status: string) {
  const s = (status || '').trim().toUpperCase();
  switch (s) {
    case 'P':
    case 'PRESENT':
      return { label: 'P - Present', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50' };
    case 'A':
    case 'ABS':
    case 'ABSENT':
      return { label: 'A - Absent', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50' };
    case 'RD':
    case 'REST DAY':
      return { label: 'RD - Rest Day', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    case 'HOL':
    case 'HOLIDAY':
      return { label: 'HOL - Holiday', color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50' };
    case 'SL':
    case 'SICK LEAVE':
      return { label: 'SL - Sick Leave', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50' };
    case 'VL':
    case 'VACATION LEAVE':
      return { label: 'VL - Vacation Leave', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50' };
    case 'BL':
      return { label: 'BL - Bereavement Leave', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50' };
    case 'MED':
      return { label: 'MED - Medical', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50' };
    case 'SUS':
      return { label: 'SUS - Suspension', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50' };
    case 'ML':
      return { label: 'ML - Maternity Leave', color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/50' };
    case 'PL':
      return { label: 'PL - Paternity Leave', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
  }
}

interface TrainerAttendanceDrawerProps {
  trainer: TrainerAttendanceData | null;
  onClose: () => void;
}

export function TrainerAttendanceDrawer({ trainer, onClose }: TrainerAttendanceDrawerProps) {
  const [rendered, setRendered] = useState(Boolean(trainer));
  const [open, setOpen] = useState(Boolean(trainer));
  const [displayed, setDisplayed] = useState<TrainerAttendanceData | null>(trainer);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  
  const { actualRole, role: simulatedRole } = useRole();
  const router = useRouter();
  
  const isAdmin = actualRole === 'SUPER_ADMIN' || simulatedRole === 'SUPER_ADMIN' || simulatedRole === 'HOT_ADMIN';

  useEffect(() => {
    if (trainer) {
      setDisplayed(trainer);
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    setOpen(false);
    const timer = window.setTimeout(() => setRendered(false), 250);
    return () => window.clearTimeout(timer);
  }, [trainer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rendered) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, rendered]);

  const toggleQuarter = useCallback((quarter: string) => {
    setExpandedQuarters(prev => {
      const next = new Set(prev);
      if (next.has(quarter)) next.delete(quarter);
      else next.add(quarter);
      return next;
    });
  }, []);

  const handleStatusChange = async (attendanceId: number | undefined, newStatus: string) => {
    if (!attendanceId) return;
    setIsUpdating(attendanceId);
    try {
      const res = await fetch('/api/attendance/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: attendanceId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update attendance');
      
      // Update local state to reflect change immediately
      setDisplayed(prev => {
        if (!prev) return prev;
        const newTimeline = prev.timeline.map(record => 
          record.attendance_id === attendanceId ? { ...record, status: newStatus } : record
        );
        return { ...prev, timeline: newTimeline };
      });
      
      // Refresh the page data
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update attendance status. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  const grouped = useMemo(() => {
    if (!displayed) return [];
    
    // Group records by month name
    const mMap = new Map<string, TrainerAttendanceRecord[]>();
    for (const r of displayed.timeline) {
      if (!mMap.has(r.month)) mMap.set(r.month, []);
      mMap.get(r.month)!.push(r);
    }
    
    // Sort months and records
    return Array.from(mMap.entries())
      .sort((a, b) => MONTH_ORDER.indexOf(a[0]) - MONTH_ORDER.indexOf(b[0]))
      .map(([month, records]) => ({
        month,
        records: records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }));
  }, [displayed]);

  useEffect(() => {
    if (grouped.length > 0 && expandedQuarters.size === 0) {
      setExpandedQuarters(new Set(grouped.map(g => g.month)));
    }
  }, [grouped]);

  if (!rendered || !displayed || typeof window === 'undefined') return null;

  const rateNum = parseFloat(displayed.rate);
  const status = getAttendanceStatus(rateNum);

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayed.name} attendance details`}
    >
      <button
        aria-label="Close attendance details"
        onClick={onClose}
        className={`absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'} cursor-default`}
      />
      
      <aside className={`absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[500px] flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-out sm:w-[min(500px,calc(100%-2rem))] ${open ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}`}>
        
        {/* Header - Solid Primary */}
        <header className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">Trainer Attendance Details</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/80 hover:text-white transition-colors focus:outline-none">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Profile Section */}
          <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 dark:border-slate-700/50">
            {/* Avatar */}
            <div className="w-24 h-24 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-md flex items-center justify-center overflow-hidden">
              <span className="text-3xl font-black text-slate-400 dark:text-slate-500">
                {displayed.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Info & Badges */}
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{displayed.name}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Trainer</p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 bg-white border ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className="px-4 py-1.5 rounded-full text-xs font-bold shadow-sm bg-primary text-white">
                  {displayed.rate} Rate
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 pt-4 space-y-6">
            
            {/* Summary Blocks */}
            <section>
              <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Summary</h3>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${rateNum >= 95 ? 'bg-emerald-500' : rateNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(rateNum, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Present</p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{displayed.present}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Absent</p>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{displayed.absent}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Suspension</p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{displayed.suspension}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Timeline Sections */}
            <section>
              <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Timeline</h3>
              <div className="space-y-2">
                {grouped.map(({ month, records }) => {
                  const isExpanded = expandedQuarters.has(month);
                  const mP = records.filter(r => r.status?.toUpperCase() === 'P').length;
                  const mWorking = records.filter(r => !['RD', 'HOL'].includes(r.status?.toUpperCase())).length;
                  const mRate = mWorking > 0 ? ((mP / mWorking) * 100).toFixed(1) : '100.0';

                  return (
                    <div key={month} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleQuarter(month)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors text-left"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          )}
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{month}</span>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{records.length} record{records.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">{mRate}%</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100/50 dark:bg-slate-900/30 sticky top-0 z-10 backdrop-blur-sm">
                              <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <th className="text-left px-4 py-3 border-b border-slate-200 dark:border-slate-700">Date</th>
                                <th className="text-left px-3 py-3 border-b border-slate-200 dark:border-slate-700">Day</th>
                                <th className="text-right px-4 py-3 border-b border-slate-200 dark:border-slate-700">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {records.map((r) => {
                                const pill = getStatusPill(r.status);
                                return (
                                  <tr key={r.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">{new Date(r.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                                    <td className="px-3 py-3 font-medium text-slate-500 dark:text-slate-400">{r.weekday}</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-2xs whitespace-nowrap ${pill.color}`}>
                                        {pill.label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
                {grouped.length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic py-6 text-center">No attendance records available.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );

  return createPortal(modalContent, document.body);
}
