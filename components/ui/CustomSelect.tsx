'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

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
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export function CustomSelect({
  id,
  value,
  options,
  onChange,
  className = '',
  placeholder,
  hasError,
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Find the label for the currently selected value
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayValue = selectedOption ? selectedOption.label : placeholder || 'Select...';

  // Filtered options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(term) ||
      String(opt.value).toLowerCase().includes(term)
    );
  }, [options, searchTerm, searchable]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search and auto-focus when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
      if (searchable) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, searchable]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const selected = filteredOptions[highlightedIndex];
        onChange(String(selected.value));
        setIsOpen(false);
      }
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(true);
    } else if (searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setSearchTerm(e.key);
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-[100]' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center justify-between appearance-none rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all shadow-sm ${
          hasError
            ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
            : isOpen
            ? 'border-2 border-[#2F6798] bg-white text-slate-800 ring-4 ring-[#2F6798]/10'
            : 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        <span className="truncate pr-4 text-left">{displayValue}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#2F6798]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-[110] mt-1.5 w-full rounded-xl bg-white shadow-2xl border border-slate-200 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 dark:bg-slate-800 dark:border-slate-700 dark:ring-white/10 overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/80">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:border-transparent transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-400 space-y-1">
                <Search className="w-4 h-4 mx-auto opacity-40 mb-1" />
                <p className="font-semibold">No results found</p>
                <p className="text-[10px] text-slate-400">Try searching with a different name or keyword</p>
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = String(value) === String(option.value);
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={String(option.value)}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      onChange(String(option.value));
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-[#2F6798] dark:bg-slate-700 dark:text-blue-400 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-700/70 text-slate-900 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#2F6798] dark:text-blue-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
