'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { 
  format, 
  getDaysInMonth, 
  startOfMonth, 
  getDay, 
  setMonth, 
  setYear, 
  subDays, 
  startOfToday, 
  startOfYesterday,
  startOfMonth as getStartOfMonth,
  startOfQuarter,
  startOfYear
} from 'date-fns';

export default function DateFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('Today');
  const [viewDate, setViewDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [realTimeDate, setRealTimeDate] = useState(new Date());

  useEffect(() => {
    // Ensure we pull the real-time system date on the client to avoid SSR hydration mismatches
    setRealTimeDate(new Date());
  }, []);

  
  // Custom dropdown states
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMonthOpen(false);
        setIsYearOpen(false);
      }
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setIsYearOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    'Today',
    'Yesterday',
    'Last 7 Days',
    'Last 30 Days',
    'This Month',
    'This Quarter (Q3)',
    'Year to Date',
  ];

  const daysInMonth = Array.from({ length: getDaysInMonth(viewDate) }, (_, i) => i + 1);
  const firstDayOfMonth = getDay(startOfMonth(viewDate));
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const prevMonthDays = getDaysInMonth(subDays(startOfMonth(viewDate), 1));
  
  const dispatchGlobalDateChange = (rangeName: string, dateObj?: Date) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('global-date-change', {
        detail: { range: rangeName, date: dateObj }
      }));
    }
  };

  const handlePresetSelect = (option: string) => {
    setSelectedRange(option);
    
    const today = startOfToday();
    let newDate = today;

    switch (option) {
      case 'Today': newDate = today; break;
      case 'Yesterday': newDate = startOfYesterday(); break;
      case 'Last 7 Days': newDate = subDays(today, 7); break;
      case 'Last 30 Days': newDate = subDays(today, 30); break;
      case 'This Month': newDate = getStartOfMonth(today); break;
      case 'This Quarter (Q3)': newDate = startOfQuarter(today); break;
      case 'Year to Date': newDate = startOfYear(today); break;
    }
    
    setSelectedDate(newDate);
    setViewDate(newDate);
    dispatchGlobalDateChange(option, newDate);
    setIsOpen(false);
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
    const formatted = format(newDate, 'MMMM d, yyyy');
    setSelectedRange(formatted);
    dispatchGlobalDateChange(formatted, newDate);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setViewDate(setMonth(viewDate, monthIndex));
    setIsMonthOpen(false);
  };

  const handleYearSelect = (year: number) => {
    setViewDate(setYear(viewDate, year));
    setIsYearOpen(false);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  // Generate years from 1990 up to 5 years in the future
  const startYear = 1990;
  const years = Array.from({ length: (currentYear + 5) - startYear + 1 }, (_, i) => startYear + i);

  // Derive display values for the header (Always system date per user request)
  const displayTitle = format(realTimeDate, 'MMMM d'); // e.g., "August 28"
  const displayIconYear = format(realTimeDate, 'yyyy'); // e.g., "2026"

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          if (!isOpen) {
            setViewDate(selectedDate || new Date());
          }
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
      >
        <CalendarIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span>{selectedRange}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Modern Calendar Popover */}
      {isOpen && (
        <div className="fixed left-3 right-3 top-16 max-w-lg mx-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 flex flex-col sm:flex-row sm:w-[520px] origin-top-right overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-100 focus:outline-none dark:bg-slate-900 dark:ring-slate-800 animate-in fade-in zoom-in-95 duration-200 z-50">
          
          {/* Left Side: Presets */}
          <div className="w-full sm:w-40 border-b sm:border-b-0 sm:border-r border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col">
            <div className="px-2 py-2 mb-1">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Presets</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1 sm:space-y-0.5">
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => handlePresetSelect(option)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs text-left transition-colors ${
                    selectedRange === option
                      ? 'bg-blue-100 text-[#2F6798] dark:bg-blue-900/40 dark:text-blue-400 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <span className="flex-1 pr-2 leading-snug">{option}</span>
                  {selectedRange === option && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Calendar */}
          <div className="flex-1 p-6">
            {/* Header row: Title and Calendar Icon */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex flex-col gap-2 mt-1">
                <h2 className="text-xl leading-none font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  {displayTitle}
                </h2>
                
                <div className="flex gap-2 relative mt-2">
                  
                  {/* Custom Month Dropdown */}
                  <div className="relative" ref={monthRef}>
                    <button 
                      onClick={() => {
                        setIsMonthOpen(!isMonthOpen);
                        setIsYearOpen(false);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-slate-100/80 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {format(viewDate, 'MMMM')} <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                    {isMonthOpen && (
                      <div className="absolute top-full left-0 mt-1 max-h-48 overflow-y-auto w-32 rounded-xl bg-white shadow-xl ring-1 ring-slate-100 z-50 py-1 no-scrollbar dark:bg-slate-800 dark:ring-slate-700">
                        {months.map((m, i) => (
                          <button
                            key={m}
                            onClick={() => handleMonthSelect(i)}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-blue-50 hover:text-[#2F6798] dark:hover:bg-slate-700 dark:hover:text-blue-400 ${
                              viewDate.getMonth() === i ? 'bg-blue-50 text-[#2F6798] dark:bg-slate-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom Year Dropdown */}
                  <div className="relative" ref={yearRef}>
                    <button 
                      onClick={() => {
                        setIsYearOpen(!isYearOpen);
                        setIsMonthOpen(false);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-slate-100/80 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {viewDate.getFullYear()} <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                    {isYearOpen && (
                      <div className="absolute top-full left-0 mt-1 max-h-48 overflow-y-auto w-24 rounded-xl bg-white shadow-xl ring-1 ring-slate-100 z-50 py-1 no-scrollbar dark:bg-slate-800 dark:ring-slate-700">
                        {years.map(y => (
                          <button
                            key={y}
                            onClick={() => handleYearSelect(y)}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-blue-50 hover:text-[#2F6798] dark:hover:bg-slate-700 dark:hover:text-blue-400 ${
                              viewDate.getFullYear() === y ? 'bg-blue-50 text-[#2F6798] dark:bg-slate-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
              
              {/* Calendar Icon Illustration (Now shows Year) */}
              <div className="relative flex h-[46px] w-[54px] flex-col items-center justify-center rounded-xl bg-[#2F6798] shadow-md shadow-[#2F6798]/30">
                {/* Binder rings */}
                <div className="absolute -top-1 left-2 h-2.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-400"></div>
                <div className="absolute -top-1 right-2 h-2.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-400"></div>
                
                <span className="text-sm leading-none font-black text-white mt-1">
                  {displayIconYear}
                </span>
              </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                <div key={day} className={`text-[9px] font-black tracking-wider ${i === 0 ? 'text-[#2F6798] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
              {emptyCells.map((_, i) => (
                <div key={`empty-${i}`} className="flex h-7 items-center justify-center text-xs font-bold text-slate-300 dark:text-slate-600">
                  {prevMonthDays - emptyCells.length + i + 1}
                </div>
              ))}
              
              {daysInMonth.map((day) => {
                const isSelected = selectedDate && 
                                   selectedDate.getDate() === day && 
                                   selectedDate.getMonth() === viewDate.getMonth() && 
                                   selectedDate.getFullYear() === viewDate.getFullYear();
                
                const today = new Date();
                const isToday = today.getDate() === day && 
                                today.getMonth() === viewDate.getMonth() && 
                                today.getFullYear() === viewDate.getFullYear();

                // Per user request:
                // 1. Current date (Today) gets solid circular background
                // 2. Any other selected day gets a circular border outline
                const circleClasses = isToday
                  ? 'bg-[#2F6798] text-white dark:bg-blue-600 dark:text-white'
                  : isSelected
                    ? 'border border-[#2F6798] text-[#2F6798] dark:border-blue-400 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-800';
                
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className="relative flex h-7 items-center justify-center group"
                  >
                    <div className={`flex items-center justify-center h-6 w-6 rounded-full transition-colors ${circleClasses}`}>
                      <span className="text-xs font-bold">
                        {day.toString().padStart(2, '0')}
                      </span>
                    </div>
                  </button>
                );
              })}
              
              {/* Trailing empty cells to fill the grid */}
              {Array.from({ length: 42 - (emptyCells.length + daysInMonth.length) }).map((_, i) => (
                <div key={`trailing-${i}`} className="flex h-7 items-center justify-center text-xs font-bold text-slate-300 dark:text-slate-600">
                  {(i + 1).toString().padStart(2, '0')}
                </div>
              ))}
            </div>
            
            {/* Confirm Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full rounded-xl bg-[#2F6798] py-2.5 text-sm font-bold text-white shadow-md shadow-[#2F6798]/20 transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-blue-600 dark:shadow-blue-600/20"
            >
              Confirm
            </button>
            
          </div>
        </div>
      )}
    </div>
  );
}
