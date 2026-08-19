'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { MONTH_ORDER } from '@/lib/analytics-utils';

export interface TrainerAttendanceRecord {
  name: string;
  month: string;
  quarter: string;
  p: number;
  a: number;
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

interface TrainerAttendanceDrawerProps {
  trainer: TrainerAttendanceData | null;
  onClose: () => void;
}

export function TrainerAttendanceDrawer({ trainer, onClose }: TrainerAttendanceDrawerProps) {
  const [rendered, setRendered] = useState(Boolean(trainer));
  const [open, setOpen] = useState(Boolean(trainer));
  const [displayed, setDisplayed] = useState<TrainerAttendanceData | null>(trainer);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());

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

  const grouped = useMemo(() => {
    if (!displayed) return [];
    const qMap = new Map<string, { months: Map<string, { p: number; a: number; sus: number }> }>();
    for (const r of displayed.timeline) {
      if (!qMap.has(r.quarter)) qMap.set(r.quarter, { months: new Map() });
      const q = qMap.get(r.quarter)!;
      if (!q.months.has(r.month)) q.months.set(r.month, { p: 0, a: 0, sus: 0 });
      const m = q.months.get(r.month)!;
      m.p += r.p;
      m.a += r.a;
    }
    return Array.from(qMap.entries()).map(([quarter, { months }]) => ({
      quarter,
      months: Array.from(months.entries())
        .sort((a, b) => MONTH_ORDER.indexOf(a[0]) - MONTH_ORDER.indexOf(b[0]))
        .map(([month, data]) => ({ month, ...data })),
    }));
  }, [displayed]);

  useEffect(() => {
    if (grouped.length > 0 && expandedQuarters.size === 0) {
      setExpandedQuarters(new Set(grouped.map(g => g.quarter)));
    }
  }, [grouped]);

  if (!rendered || !displayed) return null;

  const rateNum = parseFloat(displayed.rate);
  const status = getAttendanceStatus(rateNum);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayed.name} attendance details`}
    >
      <button
        aria-label="Close attendance details"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/10 dark:bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside className={`absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-transform duration-250 ease-out sm:w-[min(440px,calc(100%-2rem))] ${open ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}`}>
        <header className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 p-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Trainer Attendance</p>
              <h2 className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">{displayed.name}</h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Trainer</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close attendance details"
              className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Summary</h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-black ${getRateColor(rateNum)}`}>{displayed.rate}</span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attendance Rate</p>
                  <span className={`inline-flex items-center gap-1.5 mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>
              </div>
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
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SUS</p>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{displayed.suspension}</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Timeline</h3>
            <div className="space-y-2">
              {grouped.map(({ quarter, months }) => {
                const isExpanded = expandedQuarters.has(quarter);
                const qP = months.reduce((s, m) => s + m.p, 0);
                const qA = months.reduce((s, m) => s + m.a, 0);
                const qTotal = qP + qA;
                const qRate = qTotal > 0 ? ((qP / qTotal) * 100).toFixed(1) : '100.0';

                return (
                  <div key={quarter} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleQuarter(quarter)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{quarter}</span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{months.length} month{months.length !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-bold text-[#2F6798]">{qRate}%</span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-700/50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              <th className="text-left px-3 py-2">Month</th>
                              <th className="text-center px-2 py-2">Present</th>
                              <th className="text-center px-2 py-2">Absent</th>
                              <th className="text-center px-2 py-2">SUS</th>
                              <th className="text-right px-3 py-2">Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {months.map(({ month, p, a, sus }) => {
                              const mTotal = p + a + sus;
                              const mRate = mTotal > 0 ? ((p / mTotal) * 100).toFixed(1) : '100.0';
                              return (
                                <tr key={month} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                                  <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">{month}</td>
                                  <td className="px-2 py-2 text-center font-semibold text-slate-800 dark:text-slate-100">{p}</td>
                                  <td className={`px-2 py-2 text-center font-semibold ${a > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>{a}</td>
                                  <td className="px-2 py-2 text-center font-semibold text-slate-800 dark:text-slate-100">{sus}</td>
                                  <td className={`px-3 py-2 text-right font-bold ${parseFloat(mRate) < 80 ? 'text-rose-500' : 'text-[#2F6798]'}`}>
                                    {mRate}%
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
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-6 text-center">No attendance records available.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
