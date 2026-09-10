'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

  if (!rendered || !displayed || typeof window === 'undefined') return null;

  const rateNum = (() => {
    const rawRate = displayed.rate;
    if (rawRate) {
      const parsed = parseFloat(String(rawRate).replace('%', '').trim());
      if (!isNaN(parsed)) return parsed;
    }
    const total = (displayed.present || 0) + (displayed.losses || 0);
    if (total > 0) {
      return Math.round(((displayed.present || 0) / total) * 1000) / 10;
    }
    return 100.0;
  })();

  const displayRateString = `${rateNum.toFixed(1)}%`;
  const status = getReliabilityStatus(rateNum);

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayed.name} reliability details`}
    >
      <button
        aria-label="Close reliability details"
        onClick={onClose}
        className={`absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'} cursor-default`}
      />
      
      <aside className={`absolute inset-y-0 right-0 top-0 bottom-0 flex w-full max-w-[520px] sm:max-w-[560px] flex-col overflow-hidden rounded-none bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header - Solid Primary with safe-area top padding */}
        <header className="bg-primary px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0 pt-[max(0.875rem,env(safe-area-inset-top))]">
          <h2 className="text-xs sm:text-sm font-bold tracking-wide text-white uppercase">Trainer Reliability Details</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/80 hover:text-white transition-colors focus:outline-none p-1 rounded-lg hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))]">
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
                  {displayRateString} Reliability
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 pt-4 space-y-6">
            
            {rateNum < 80 && (
              <section>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3 items-start shadow-sm">
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

            {/* Summary Blocks */}
            <section>
              <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Reliability Summary</h3>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 shadow-sm">
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
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">{displayed.absent}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Losses</p>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{displayed.losses}</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Loss Breakdown</h3>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">SL (Sick Leave)</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{displayed.lossBreakdown.sl}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">VL (Vacation Leave)</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{displayed.lossBreakdown.vl}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Other Losses</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{displayed.lossBreakdown.other}</td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 dark:border-slate-700">
                    <tr className="bg-slate-100 dark:bg-slate-700">
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Total Losses</td>
                      <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">{displayed.losses}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Timeline Sections */}
            <section>
              <h3 className="mb-3 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Reliability Timeline</h3>
              <div className="space-y-2">
                {grouped.map(({ quarter, months }) => {
                  const isExpanded = expandedQuarters.has(quarter);
                  
                  return (
                    <div key={quarter} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleQuarter(quarter)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors text-left"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          )}
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{quarter}</span>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{months.length} month{months.length !== 1 ? 's' : ''}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-700/50 overflow-x-auto custom-horizontal-scrollbar touch-pan-x">
                          <table className="w-full text-sm min-w-[320px]">
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                              {months.map(({ month, p, a, losses }) => (
                                <tr key={month} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{month}</p>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                      <span>Present <strong className="text-slate-800 dark:text-slate-100">{p}</strong></span>
                                      <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                                      <span>Absent <strong className="text-slate-800 dark:text-slate-100">{a}</strong></span>
                                      <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                                      <span>Losses <strong className={losses > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}>{losses}</strong></span>
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
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic py-6 text-center">No timeline records available.</p>
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
