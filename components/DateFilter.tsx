'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('This Quarter (Q3)');
  const [selectedDate, setSelectedDate] = useState<number | null>(15);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  // Mock calendar data
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: 3 }, (_, i) => i); // August 2026 starts on a Saturday, but let's just make it look like the image (starts mid-week)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
      >
        <CalendarIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span>{selectedRange}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Modern Calendar Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 flex w-[520px] origin-top-right overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-100 focus:outline-none dark:bg-slate-900 dark:ring-slate-800 animate-in fade-in zoom-in-95 duration-200 z-50">
          
          {/* Left Side: Presets */}
          <div className="w-40 border-r border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col">
            <div className="px-2 py-2 mb-1">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Presets</p>
            </div>
            <div className="space-y-0.5">
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSelectedRange(option);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
                    selectedRange === option
                      ? 'bg-blue-100 text-[#2F6798] dark:bg-blue-900/40 dark:text-blue-400 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <span>{option}</span>
                  {selectedRange === option && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Calendar */}
          <div className="flex-1 p-6">
            {/* Header row: Title and Calendar Icon */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex flex-col gap-2 mt-1">
                <h2 className="text-xl leading-none font-black text-slate-900 dark:text-slate-50 tracking-tight">Select Date</h2>
                
                <div className="flex gap-2">
                  {/* Month Dropdown */}
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    August <ChevronDown className="h-3 w-3 opacity-70" />
                  </div>
                  {/* Year Dropdown */}
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    2026 <ChevronDown className="h-3 w-3 opacity-70" />
                  </div>
                </div>
              </div>
              
              {/* Calendar Icon Illustration */}
              <div className="relative flex h-[46px] w-[46px] flex-col items-center justify-center rounded-xl bg-[#2F6798] shadow-md shadow-[#2F6798]/30">
                {/* Binder rings */}
                <div className="absolute -top-1 left-2 h-2.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-400"></div>
                <div className="absolute -top-1 right-2 h-2.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-400"></div>
                
                <span className="text-xl leading-none font-black text-white mt-1">
                  {selectedDate?.toString().padStart(2, '0') || '15'}
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
                  {29 + i}
                </div>
              ))}
              
              {daysInMonth.map((day) => {
                const isSelected = selectedDate === day;
                
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className="relative flex h-7 flex-col items-center justify-center group"
                  >
                    <span className={`text-xs font-bold transition-colors ${
                      isSelected 
                        ? 'text-[#2F6798] dark:text-blue-400' 
                        : 'text-slate-700 dark:text-slate-300 group-hover:text-[#2F6798] dark:group-hover:text-blue-400'
                    }`}>
                      {day.toString().padStart(2, '0')}
                    </span>
                    
                    {/* Underline indicator for selected date */}
                    {isSelected && (
                      <div className="absolute bottom-0 h-0.5 w-3.5 rounded-full bg-[#2F6798] dark:bg-blue-400"></div>
                    )}
                  </button>
                );
              })}
              
              {/* Trailing empty cells */}
              {[1, 2].map((i) => (
                <div key={`trailing-${i}`} className="flex h-7 items-center justify-center text-xs font-bold text-slate-300 dark:text-slate-600">
                  {i.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
            
            {/* Confirm Button */}
            <button 
              onClick={() => {
                setSelectedRange(`August ${selectedDate}, 2026`);
                setIsOpen(false);
              }}
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
