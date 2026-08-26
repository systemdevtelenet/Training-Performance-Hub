'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function CustomSelect({ id, value, options, onChange, className = '', placeholder }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find the label for the currently selected value
  const selectedOption = options.find((opt) => opt.value === value);
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
        className={`flex w-full items-center justify-between appearance-none rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all hover:border-slate-300 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-600 ${
          isOpen ? 'border-primary ring-4 ring-primary/10' : ''
        } ${className}`}
      >
        <span className="truncate pr-4">{displayValue}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-100 no-scrollbar dark:bg-slate-800 dark:ring-slate-700">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-blue-50 hover:text-[#2F6798] dark:hover:bg-slate-700 dark:hover:text-blue-400 ${
                value === option.value
                  ? 'bg-blue-50 text-[#2F6798] dark:bg-slate-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
