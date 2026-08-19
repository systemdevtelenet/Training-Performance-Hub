'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { MONTH_ORDER } from '@/lib/analytics-utils';

export interface TrainerReliabilityRecord {
  month: string;
  quarter: string;
  p: number;
  a: number;
  losses: number;
}

export interface TrainerReliabilityData {
  name: string;
  present: number;
  absent: number;
  losses: number;
  rate: string;
  lossBreakdown: { sl: number; vl: number; other: number };
  timeline: TrainerReliabilityRecord[];
}

export function getReliabilityStatus(rate: number) {
  if (rate >= 95) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  if (rate >= 90) return { label: 'Good', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
  if (rate >= 80) return { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  return { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
}

export function getReliabilityRateColor(rate: number) {
  if (rate < 80) return 'text-rose-600';
  if (rate >= 95) return 'text-emerald-600';
  return 'text-[#2F6798]';
}

interface TrainerReliabilityDrawerProps {
  trainer: TrainerReliabilityData | null;
  onClose: () => void;
}

export function TrainerReliabilityDrawer({ trainer, onClose }: TrainerReliabilityDrawerProps) {
  const [rendered, setRendered] = useState(Boolean(trainer));
  const [open, setOpen] = useState(Boolean(trainer));
  const [displayed, setDisplayed] = useState<TrainerReliabilityData | null>(trainer);
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
    const qMap = new Map<string, { months: Map<string, { p: number; a: number; losses: number }> }>();
    for (const r of displayed.timeline) {
      if (!qMap.has(r.quarter)) qMap.set(r.quarter, { months: new Map() });
      const q = qMap.get(r.quarter)!;
      if (!q.months.has(r.month)) q.months.set(r.month, { p: 0, a: 0, losses: 0 });
      const m = q.months.get(r.month)!;
      m.p += r.p;
      m.a += r.a;
      m.losses += r.losses;
    }
    return Array.from(qMap.entries()).map(([quarter, { months }]) => ({
      quarter,
      months: Array.from(months.entries())
        .sort((a, b) => {
          const aIdx = MONTH_ORDER?.indexOf(a[0]) ?? -1;
          const bIdx = MONTH_ORDER?.indexOf(b[0]) ?? -1;
          return aIdx - bIdx;
        })
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
  const status = getReliabilityStatus(rateNum);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayed.name} reliability details`}
    >
      <button
        aria-label="Close reliability details"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/10 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside className={`absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-transform duration-250 ease-out sm:w-[min(440px,calc(100%-2rem))] ${open ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'}`}>
        <header className="border-b border-slate-200 bg-slate-50/70 p-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trainer Reliability</p>
              <h2 className="truncate text-lg font-bold text-slate-800">{displayed.name}</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Trainer</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reliability details"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {rateNum < 80 && (
            <section>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800 mb-1.5">High Reliability Risk</h4>
                  <div className="text-xs text-rose-700/90 leading-relaxed">
                    <p className="mb-1">Main contributors:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li><strong className="font-bold">{displayed.losses}</strong> total losses</li>
                      <li><strong className="font-bold">{displayed.absent}</strong> absences</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">Reliability Summary</h3>
            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-black ${getReliabilityRateColor(rateNum)}`}>{displayed.rate}</span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reliability Rate</p>
                  <span className={`inline-flex items-center gap-1.5 mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${rateNum >= 95 ? 'bg-emerald-500' : rateNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(rateNum, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{displayed.present}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Absent</p>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{displayed.absent}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Losses</p>
                  <p className="text-lg font-black text-rose-600 mt-0.5">{displayed.losses}</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">Loss Breakdown</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-600">SL (Sick Leave)</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{displayed.lossBreakdown.sl}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-600">VL (Vacation Leave)</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{displayed.lossBreakdown.vl}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-600">Other Losses</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{displayed.lossBreakdown.other}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-slate-200">
                  <tr className="bg-slate-100">
                    <td className="px-4 py-3 font-bold text-slate-800 uppercase tracking-wider">Total Losses</td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">{displayed.losses}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">Reliability Timeline</h3>
            <div className="space-y-2">
              {grouped.map(({ quarter, months }) => {
                const isExpanded = expandedQuarters.has(quarter);
                
                return (
                  <div key={quarter} className="rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleQuarter(quarter)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-slate-800">{quarter}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{months.length} month{months.length !== 1 ? 's' : ''}</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-slate-50">
                            {months.map(({ month, p, a, losses }) => (
                              <tr key={month} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-800 mb-1">{month}</p>
                                  <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                                    <span>Present <strong className="text-slate-800">{p}</strong></span>
                                    <span className="text-slate-300">&middot;</span>
                                    <span>Absent <strong className="text-slate-800">{a}</strong></span>
                                    <span className="text-slate-300">&middot;</span>
                                    <span>Losses <strong className={losses > 0 ? 'text-rose-500' : 'text-slate-800'}>{losses}</strong></span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              {grouped.length === 0 && (
                <p className="text-xs text-slate-400 italic py-6 text-center">No timeline records available.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
