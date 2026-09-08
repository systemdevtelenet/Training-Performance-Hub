'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string | number;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  hasError?: boolean;
}

export function CustomSelect({ id, value, options, onChange, className = '', placeholder, hasError }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find the label for the currently selected value
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayValue = selectedOption ? selectedOption.label : placeholder || 'Select...';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between appearance-none rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all shadow-sm ${
          hasError
            ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
            : isOpen
            ? 'border-2 border-[#2F6798] bg-white text-slate-800 ring-4 ring-[#2F6798]/10'
            : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200'
        } ${className}`}
      >
        <span className="truncate pr-4 text-left">{displayValue}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#2F6798]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-[70] mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl bg-white p-1.5 shadow-2xl border border-slate-100 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 no-scrollbar dark:bg-slate-800 dark:border-slate-700 dark:ring-white/10">
          {options.map((option) => {
            const isSelected = String(value) === String(option.value);
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(String(option.value));
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-blue-50 text-[#2F6798] dark:bg-slate-700 dark:text-blue-400 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#2F6798] dark:text-blue-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

