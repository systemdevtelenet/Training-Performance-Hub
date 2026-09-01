'use client';

import { useRole, UserRole } from '@/components/providers/RoleProvider';
import { ChevronDown, ShieldAlert } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function RoleSwitcher() {
  const { actualRole, role: activeRole, setSimulatedRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only SUPER_ADMIN can see and use this switcher
  if (actualRole !== 'SUPER_ADMIN') {
    return null;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles: { value: UserRole | null; label: string }[] = [
    { value: null, label: 'Super Admin (Original)' },
    { value: 'HOT_ADMIN', label: 'View as HOT Admin' },
    { value: 'QAS_ADMIN', label: 'View as QAS Admin' },
    { value: 'EMPLOYEE', label: 'View as Employee' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-500 transition-colors shadow-sm"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span className="text-xs font-bold whitespace-nowrap">
          {activeRole === 'SUPER_ADMIN' ? 'Admin Mode' : `Simulating: ${activeRole}`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800 z-50">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Simulation Mode
            </p>
          </div>
          <div className="p-1 space-y-0.5">
            {roles.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  setSimulatedRole(r.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  (r.value === null && activeRole === 'SUPER_ADMIN') || r.value === activeRole
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
