'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react';
import { getTrainerStatusCode, isTrainerAttendanceLoss } from '@/lib/analytics-utils';
import { useRole } from '@/components/providers/RoleProvider';
import { useRouter } from 'next/navigation';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';

export interface TrainerAttendanceRecord {
  attendance_id?: number;
  trainer_id?: number;
  date: string;
  month: string;
  day: number;
  weekday: string;
  status: string;
  source?: 'WORKFORCE_PORTAL';
  clockIn?: string | null;
  clockOut?: string | null;
}

export interface TrainerAttendanceData {
  name: string;
  profilePic?: string | null;
  present: number;
  absent: number;
  suspension?: number;
  rate?: string;
  attendanceRate?: string;
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
    case 'L':
    case 'LATE':
      return { label: 'L - Late', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50' };
    case 'U':
    case 'UT':
    case 'UND':
    case 'UNDERTIME':
      return { label: 'U - Undertime', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50' };
    case 'L/UND':
      return { label: 'Late / Undertime', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50' };
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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  
  const { actualRole, role: simulatedRole } = useRole();
  const router = useRouter();
  
  const isAdmin = actualRole === 'SUPER_ADMIN' || simulatedRole === 'SUPER_ADMIN' || simulatedRole === 'HOT_ADMIN';

  useEffect(() => {
    if (trainer) {
      setDisplayed(trainer);
      setSelectedDate(null);
      setSelectedMonthIndex(0);
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
    
    const mMap = new Map<string, { month: string; records: TrainerAttendanceRecord[] }>();
    for (const r of displayed.timeline) {
      const parsedDate = new Date(`${r.date}T12:00:00`);
      const validDate = !Number.isNaN(parsedDate.getTime());
      const key = validDate ? r.date.slice(0, 7) : r.month;
      const month = validDate
        ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(parsedDate)
        : r.month;
      if (!mMap.has(key)) mMap.set(key, { month, records: [] });
      mMap.get(key)!.records.push(r);
    }
    
    return Array.from(mMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, group]) => ({
        key,
        month: group.month,
        records: group.records.sort((a, b) => a.date.localeCompare(b.date)),
      }));
  }, [displayed]);

  useEffect(() => {
    setSelectedMonthIndex(Math.max(0, grouped.length - 1));
  }, [grouped]);

  const changeViewMode = (mode: 'list' | 'calendar') => {
    setViewMode(mode);
    setSelectedDate(null);
  };

  const currentGroup = grouped[selectedMonthIndex];
  const changeMonth = (offset: number) => {
    setSelectedMonthIndex(index => Math.max(0, Math.min(grouped.length - 1, index + offset)));
    setSelectedDate(null);
  };

  if (!rendered || !displayed || typeof window === 'undefined') return null;

  const rateNum = (() => {
    const rawRate = displayed.rate || displayed.attendanceRate;
    if (rawRate) {
      const parsed = parseFloat(String(rawRate).replace('%', '').trim());
      if (!isNaN(parsed)) return parsed;
    }
    const total = (displayed.present || 0) + (displayed.absent || 0);
    if (total > 0) {
      return Math.round(((displayed.present || 0) / total) * 1000) / 10;
    }
    return 100.0;
  })();

  const displayRateString = `${rateNum.toFixed(1)}%`;
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
      
      <aside className={`absolute inset-y-0 right-0 top-0 bottom-0 flex w-full max-w-[520px] sm:max-w-[600px] flex-col overflow-hidden rounded-none bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header - Solid Primary with safe-area top padding */}
        <header className="bg-primary px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0 pt-[max(0.875rem,env(safe-area-inset-top))]">
          <h2 className="text-xs sm:text-sm font-bold tracking-wide text-white uppercase">Trainer Attendance Details</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/80 hover:text-white transition-colors focus:outline-none p-1 rounded-lg hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Profile Section */}
          <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 dark:border-slate-700/50">
            {/* Avatar */}
            <div className="relative w-24 h-24 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-md flex items-center justify-center overflow-hidden">
              <span className="text-3xl font-black text-slate-400 dark:text-slate-500">
                {displayed.name.charAt(0).toUpperCase()}
              </span>
              {displayed.profilePic && (
                <img
                  src={displayed.profilePic}
                  alt={`${displayed.name} profile photo`}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={event => { event.currentTarget.style.display = 'none'; }}
                />
              )}
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
                  {displayRateString} Rate
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
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Attendance Timeline</h3>
                <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900/50" role="group" aria-label="Attendance display mode">
                  <button
                    type="button"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => changeViewMode('list')}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-white text-[#2F6798] shadow-sm dark:bg-slate-800 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    <List className="h-3.5 w-3.5" /> List
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'calendar'}
                    onClick={() => changeViewMode('calendar')}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-white text-[#2F6798] shadow-sm dark:bg-slate-800 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Calendar
                  </button>
                </div>
              </div>
              {currentGroup ? (() => {
                const { month, records } = currentGroup;
                const mWorking = records.filter(r => !['RD', 'HOL'].includes(getTrainerStatusCode(r.status))).length;
                const mLosses = records.filter(r => isTrainerAttendanceLoss(r.status)).length;
                const mRate = mWorking > 0 ? ((Math.max(0, mWorking - mLosses) / mWorking) * 100).toFixed(1) : '100.0';
                const [year, monthNumber] = records[0]?.date.split('-').map(Number) || [];

                return (
                  <div className="rounded-lg border border-slate-200 shadow-sm dark:border-slate-700">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        disabled={selectedMonthIndex <= 0}
                        aria-label="Previous month"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <CustomDatePicker
                          value={selectedDate || records[records.length - 1]?.date}
                          onChange={date => {
                            const index = grouped.findIndex(group => group.key === date.slice(0, 7));
                            if (index >= 0) setSelectedMonthIndex(index);
                            setSelectedDate(date);
                          }}
                          isDateDisabled={date => !displayed.timeline.some(record => record.date === date)}
                          className="!h-8 !rounded-md !px-2 !py-1 !text-[11px] !shadow-none"
                          popoverClassName="w-[min(285px,calc(100vw-72px))]"
                        />
                      </div>
                      <span className="hidden shrink-0 text-[10px] font-semibold text-slate-400 sm:inline">{records.length} days</span>
                      <span className="shrink-0 px-1 text-xs font-bold text-primary">{mRate}%</span>
                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        disabled={selectedMonthIndex >= grouped.length - 1}
                        aria-label="Next month"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    {viewMode === 'calendar' ? (() => {
                      if (!year || !monthNumber) return null;
                      const monthIndex = monthNumber - 1;
                      const firstWeekday = new Date(year, monthIndex, 1).getDay();
                      const daysInMonth = new Date(year, monthNumber, 0).getDate();
                      const gridStart = new Date(year, monthIndex, 1 - firstWeekday);
                      const gridDayCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
                      const recordsByDate = new Map(displayed.timeline.map(record => [record.date, record]));
                      const selectedRecord = records.find(record => record.date === selectedDate);
                      const cells = Array.from({ length: gridDayCount }, (_, index) => {
                        const dateValue = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
                        const date = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
                        return {
                          key: date,
                          date,
                          day: dateValue.getDate(),
                          inMonth: dateValue.getMonth() === monthIndex && dateValue.getFullYear() === year,
                          record: recordsByDate.get(date),
                        };
                      });
                      const today = new Date();
                      const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                      return (
                        <div className="overflow-hidden rounded-b-lg">
                          <div className="grid grid-cols-7 bg-[#2F6798] text-center text-[9px] font-extrabold uppercase text-white sm:text-[10px]">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(weekday => <span key={weekday} className="border-r border-white/20 py-2.5 last:border-r-0">{weekday}</span>)}
                          </div>
                          <div className="grid grid-cols-7 border-l border-slate-200 dark:border-slate-700">
                            {cells.map(cell => {
                              const record = cell.record;
                              const pill = record ? getStatusPill(record.status) : null;
                              const isSelected = selectedDate === cell.date;
                              const isToday = todayValue === cell.date;
                              const dateParts = cell.date.split('-').map(Number);
                              const displayDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                              const shortMonth = displayDate.toLocaleDateString('en-US', { month: 'short' });
                              const statusLabel = pill?.label.split(' - ').slice(-1)[0] || pill?.label;
                              return (
                                <button
                                  key={cell.key}
                                  type="button"
                                  disabled={!record}
                                  onClick={() => {
                                    setSelectedDate(isSelected ? null : cell.date);
                                    if (!cell.inMonth) {
                                      const index = grouped.findIndex(group => group.key === cell.date.slice(0, 7));
                                      if (index >= 0) setSelectedMonthIndex(index);
                                    }
                                  }}
                                  aria-label={record ? `${record.weekday}, ${displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}: ${pill?.label}` : `${displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}: no attendance record`}
                                  aria-pressed={isSelected}
                                  className={`flex min-h-[104px] min-w-0 flex-col border-b border-r border-slate-200 p-1.5 text-left transition-colors sm:min-h-[148px] sm:p-2.5 dark:border-slate-700 ${cell.inMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-950/50'} ${record ? 'cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/20' : 'cursor-default'} ${isSelected ? 'relative z-[1] outline outline-2 outline-[#2F6798] outline-offset-[-2px] bg-blue-50/70 dark:bg-blue-950/30' : ''}`}
                                >
                                  <span className="mb-2 flex min-h-4 w-full items-center justify-between gap-1">
                                    {isToday ? <span className="text-[8px] font-extrabold uppercase tracking-wide text-emerald-600">Today</span> : !cell.inMonth ? <span className="text-[8px] font-semibold text-slate-300 dark:text-slate-600">{shortMonth}</span> : <span />}
                                    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold sm:text-[11px] ${isToday ? 'bg-emerald-500 text-white' : cell.inMonth ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>{cell.day}</span>
                                  </span>
                                  {record && pill && (
                                    <>
                                      <span className={`flex min-h-6 w-full min-w-0 items-center justify-center overflow-hidden rounded-md border px-1 py-1 text-center text-[8px] font-bold leading-tight whitespace-normal break-words sm:min-h-7 sm:text-[10px] ${pill.color}`}>{statusLabel}</span>
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {selectedRecord && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                  {new Date(`${selectedRecord.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <span className={`inline-flex h-auto min-h-7 w-[112px] min-w-0 shrink-0 items-center justify-center overflow-hidden whitespace-normal break-words rounded-full border px-1 py-1 text-center text-[9px] font-bold leading-tight ${getStatusPill(selectedRecord.status).color}`}>
                                {getStatusPill(selectedRecord.status).label}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="max-h-[420px] overflow-y-auto">
                        <table className="w-full table-fixed text-[13px]">
                          <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur dark:bg-slate-900/95">
                            <tr className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 sm:text-[10px]">
                              <th className="w-[50%] border-b border-slate-200 px-3 py-2.5 text-left dark:border-slate-700 sm:w-[33%]">Date</th>
                              <th className="hidden w-[22%] border-b border-slate-200 px-3 py-2.5 text-left dark:border-slate-700 sm:table-cell">Day</th>
                              <th className="w-[50%] border-b border-slate-200 px-1 py-2.5 text-right dark:border-slate-700 sm:w-[45%] sm:px-2">Attendance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {records.map(record => {
                              const pill = getStatusPill(record.status);
                              return (
                                <tr key={record.date} className={`${selectedDate === record.date ? 'bg-blue-50/70 dark:bg-blue-950/20' : ''} hover:bg-slate-50/70 dark:hover:bg-slate-700/40`}>
                                  <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 sm:px-4">
                                    <time dateTime={record.date}>{new Date(`${record.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                                    <span className="block text-[10px] font-medium text-slate-400 sm:hidden">{record.weekday}</span>
                                  </td>
                                  <td className="hidden px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400 sm:table-cell">{record.weekday}</td>
                                  <td className="px-1 py-2.5 text-right sm:px-2">
                                    <span className={`inline-flex h-auto min-h-7 w-[112px] min-w-0 shrink-0 items-center justify-center overflow-hidden whitespace-normal break-words rounded-full border px-1 py-1 text-center text-[9px] font-bold leading-tight ${pill.color}`}>
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
              })() : (
                <p className="rounded-lg border border-slate-200 py-8 text-center text-[13px] text-slate-400 dark:border-slate-700">No attendance records available.</p>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );

  return createPortal(modalContent, document.body);
}
