'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomDatePickerProps {
  id?: string;
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  hasError?: boolean;
}

export function CustomDatePicker({
  id,
  value,
  onChange,
  className = '',
  placeholder = 'Select date...',
  hasError = false
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date from value or fallback to today
  const parsedDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsedDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(parsedDate.getDate());
  const [openDropdown, setOpenDropdown] = useState<'month' | 'year' | null>(null);

  // Sync state whenever value changes or modal opens
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
      setSelectedDay(d);
    }
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setOpenDropdown(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Available Years: 1990 up to (current year + 10)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(2036, currentYear + 6);
    const years: number[] = [];
    for (let y = maxYear; y >= 1990; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatOutputDate = (year: number, month: number, day: number) => {
    const yStr = `${year}`;
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  };

  const handleSelectDay = (dayNum: number, isCurrMonth: boolean, offsetMonth: number = 0) => {
    let targetYear = viewYear;
    let targetMonth = viewMonth + offsetMonth;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    setViewYear(targetYear);
    setViewMonth(targetMonth);
    setSelectedDay(dayNum);

    const formatted = formatOutputDate(targetYear, targetMonth, dayNum);
    onChange(formatted);
  };

  const handleSetToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setViewYear(y);
    setViewMonth(m);
    setSelectedDay(d);
    onChange(formatOutputDate(y, m, d));
    setIsOpen(false);
  };

  const displayLabel = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return placeholder;
    const [y, m, d] = value.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [value, placeholder]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => {
          setIsOpen(!isOpen);
          setOpenDropdown(null);
        }}
        className={cn(
          "h-10 w-full rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-all shadow-2xs cursor-pointer outline-none",
          hasError
            ? "border-2 border-red-500 bg-red-50/20 text-slate-800"
            : isOpen
            ? "border-2 border-[#2F6798] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ring-4 ring-[#2F6798]/10"
            : "border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-3.5 h-3.5 text-[#2F6798] shrink-0" />
          <span className={cn("truncate", !value && "text-slate-400 font-normal")}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180 text-[#2F6798]")} />
      </button>

      {/* Popover Calendar (Traffic Lights Style, Compact & Elegant) */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 z-[120] w-[285px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row: Month & Day title, Month/Year selectors, and Top Badge */}
          <div className="flex items-start justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {monthNames[viewMonth]} {selectedDay}
              </h3>

              {/* Month & Year Selection Pill Dropdowns */}
              <div className="flex items-center gap-1.5">
                {/* Month Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(prev => prev === 'month' ? null : 'month')}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span>{monthNames[viewMonth]}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>

                  {openDropdown === 'month' && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-50 max-h-44 overflow-y-auto space-y-0.5">
                      {monthNames.map((mName, mIdx) => (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => {
                            setViewMonth(mIdx);
                            setOpenDropdown(null);
                            const maxDaysInMonth = new Date(viewYear, mIdx + 1, 0).getDate();
                            const newDay = Math.min(selectedDay, maxDaysInMonth);
                            setSelectedDay(newDay);
                            onChange(formatOutputDate(viewYear, mIdx, newDay));
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors",
                            viewMonth === mIdx
                              ? "font-bold text-[#2F6798] bg-blue-50 dark:bg-blue-950/40"
                              : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          {mName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Year Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(prev => prev === 'year' ? null : 'year')}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span>{viewYear}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </button>

                  {openDropdown === 'year' && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-24 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-50 max-h-44 overflow-y-auto space-y-0.5">
                      {availableYears.map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setViewYear(yr);
                            setOpenDropdown(null);
                            const maxDaysInMonth = new Date(yr, viewMonth + 1, 0).getDate();
                            const newDay = Math.min(selectedDay, maxDaysInMonth);
                            setSelectedDay(newDay);
                            onChange(formatOutputDate(yr, viewMonth, newDay));
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors",
                            viewYear === yr
                              ? "font-bold text-[#2F6798] bg-blue-50 dark:bg-blue-950/40"
                              : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cute Calendar Badge with Top Ring Tabs */}
            <div className="w-8 h-8 bg-[#2F6798] rounded-lg flex items-center justify-center relative shadow-sm shrink-0">
              <div className="absolute -top-1 left-1.5 w-1 h-1.5 bg-slate-200 rounded-full" />
              <div className="absolute -top-1 right-1.5 w-1 h-1.5 bg-slate-200 rounded-full" />
              <span className="text-[9px] font-black text-white tracking-wider">
                {viewYear}
              </span>
            </div>
          </div>

          {/* 7-Weekday Header */}
          <div className="grid grid-cols-7 text-center text-[9px] font-black uppercase tracking-wider text-[#2F6798] dark:text-blue-300">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((w) => (
              <div key={w} className="py-0.5">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          {(() => {
            const firstDayIdx = new Date(viewYear, viewMonth, 1).getDay();
            const totalMonthDays = new Date(viewYear, viewMonth + 1, 0).getDate();
            const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

            const matrixDays: { dayNum: number; isCurr: boolean; offset: number }[] = [];

            // Leading days
            for (let i = firstDayIdx - 1; i >= 0; i--) {
              matrixDays.push({ dayNum: prevMonthDays - i, isCurr: false, offset: -1 });
            }
            // Current month days
            for (let d = 1; d <= totalMonthDays; d++) {
              matrixDays.push({ dayNum: d, isCurr: true, offset: 0 });
            }
            // Trailing days
            const rem = (7 - (matrixDays.length % 7)) % 7;
            for (let i = 1; i <= rem; i++) {
              matrixDays.push({ dayNum: i, isCurr: false, offset: 1 });
            }

            return (
              <div className="grid grid-cols-7 gap-y-0.5 text-center">
                {matrixDays.map((item, idx) => {
                  const isSelected = item.isCurr && item.dayNum === selectedDay;
                  const padNum = item.dayNum < 10 ? `0${item.dayNum}` : `${item.dayNum}`;

                  return (
                    <div key={idx} className="flex items-center justify-center p-0.5">
                      <button
                        type="button"
                        onClick={() => handleSelectDay(item.dayNum, item.isCurr, item.offset)}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer",
                          isSelected
                            ? "bg-[#2F6798] text-white font-black shadow-md scale-105"
                            : item.isCurr
                            ? "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            : "text-slate-300 dark:text-slate-600 font-normal hover:text-slate-500"
                        )}
                      >
                        {padNum}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Selected Date Summary & Actions */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold">
                <Clock className="w-3 h-3 text-[#2F6798]" />
                <span>Selected</span>
              </div>
              <span className="font-black text-[#2F6798] dark:text-blue-300">
                {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSetToday}
                className="flex-1 py-1 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-1 px-2 bg-[#2F6798] hover:bg-[#24527a] text-white text-[11px] font-bold rounded-lg shadow-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
