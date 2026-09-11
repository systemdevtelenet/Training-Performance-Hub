'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserRound,
  Mail,
  CalendarDays,
  Building2,
  ExternalLink,
  ClipboardCheck,
  CheckCircle2,
  Hash,
  Link as LinkIcon,
  Shield
} from 'lucide-react';
import { EmployeeRecord } from '@/app/employees/EmployeesClient';
import { useRole } from '@/components/providers/RoleProvider';

export function EmployeeDetailDrawer({
  employee,
  onClose
}: {
  employee: EmployeeRecord | null;
  onClose: () => void;
}) {
  const { avatarUrl, userName, email } = useRole();
  const [rendered, setRendered] = useState(Boolean(employee));
  const [open, setOpen] = useState(Boolean(employee));
  const [displayedEmp, setDisplayedEmp] = useState<EmployeeRecord | null>(employee);

  useEffect(() => {
    if (employee) {
      setDisplayedEmp(employee);
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => {
      setRendered(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [employee]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rendered) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, rendered]);

  if (!rendered || !displayedEmp || typeof window === 'undefined') return null;

  const isMatch = (displayedEmp.employee_name && userName && displayedEmp.employee_name.toLowerCase().includes(userName.toLowerCase())) ||
    (displayedEmp.employee_email && email && displayedEmp.employee_email.toLowerCase() === email.toLowerCase()) ||
    (displayedEmp.employee_name && displayedEmp.employee_name.toLowerCase().includes('nissi'));
  const empPhoto = displayedEmp.avatar_url || (isMatch ? avatarUrl : null);

  const getInitials = (fullName: string) => {
    if (!fullName) return 'EM';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const statusName = (
    displayedEmp.status_name ||
    (displayedEmp.status_id === 1 ? 'ACTIVE' : displayedEmp.status_id === 2 ? 'INACTIVE' : 'ACTIVE')
  ).toUpperCase();

  const roleName = displayedEmp.role_name || (
    displayedEmp.role_id === 9 ? 'QA SUPERVISOR' :
    displayedEmp.role_id === 5 ? 'Admin' :
    displayedEmp.role_id === 2 ? 'QA' :
    displayedEmp.role_id === 6 ? 'TL' :
    displayedEmp.role_id === 3 ? 'Account Manager' :
    displayedEmp.role_id === 4 ? 'Quality Coordinator' : 'Agent'
  );

  const statusBadgeClass =
    statusName === 'ACTIVE'
      ? 'border border-emerald-300 text-emerald-700 bg-emerald-50'
      : statusName === 'INACTIVE' || statusName === 'RESIGNED'
      ? 'border border-slate-300 text-slate-700 bg-slate-100'
      : statusName === 'ON LEAVE'
      ? 'border border-amber-300 text-amber-700 bg-amber-50'
      : 'border border-blue-300 text-blue-700 bg-blue-50';

  const infoItems = [
    { label: 'Full Name', value: displayedEmp.employee_name || 'N/A', icon: UserRound },
    { label: 'Employee Code', value: displayedEmp.employee_code || 'N/A', icon: Hash },
    { label: 'Role / Access', value: roleName, icon: Shield },
    { label: 'Email Address', value: displayedEmp.employee_email || 'N/A', icon: Mail },
    { label: 'Employment Status', value: statusName, icon: CheckCircle2 },
    { label: 'Assigned Accounts', value: displayedEmp.assigned_accounts || 'Unassigned', icon: Building2 },
    { label: 'Hire Date', value: displayedEmp.hire_date || 'N/A', icon: CalendarDays },
  ];

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className={`absolute inset-0 w-full h-full bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        } cursor-default`}
      />

      {/* Clean Square Cornered Side Drawer with Blue Header Bar */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[480px] flex-col overflow-hidden bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out rounded-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* BLUE HEADER BAR */}
        <header className="bg-[#2F6798] px-6 py-4 flex items-center justify-between shrink-0 font-sans shadow-sm">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-2">
            EMPLOYEE DETAILS
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/80 hover:text-white transition-colors focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto font-sans">
          {/* Profile Banner */}
          <div className="p-6 flex items-center gap-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#2F6798] dark:text-[#5a9fd4] font-bold text-xl shadow-sm shrink-0 overflow-hidden">
              {empPhoto ? (
                <img src={empPhoto} alt={displayedEmp.employee_name} className="w-full h-full object-cover" />
              ) : (
                getInitials(displayedEmp.employee_name)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{displayedEmp.employee_name}</h3>
              <p className="text-xs font-mono font-semibold text-[#2F6798] dark:text-[#5a9fd4] mt-0.5">
                Code: {displayedEmp.employee_code || 'N/A'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#2F6798] text-white">
                  {roleName}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {displayedEmp.assigned_accounts || 'General'}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                  {statusName}
                </span>
              </div>
            </div>
          </div>

          {/* TABLE STYLE DETAILS CONTAINER - EXACT MATCH WITH TRAINEES DRAWER */}
          <div className="p-6">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800/80 shadow-sm">
              {/* BLUE HEADER BAR */}
              <div className="bg-[#2F6798] px-6 py-3 flex text-xs font-bold text-white tracking-wide uppercase">
                <div className="w-1/2 flex items-center gap-2">
                  <span className="opacity-80">ⓘ</span> FIELD
                </div>
                <div className="w-1/2 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 opacity-80" /> DETAILS
                </div>
              </div>

              {/* SECTION: EMPLOYEE INFORMATION */}
              <div className="bg-slate-50/80 dark:bg-slate-800/90 px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] uppercase tracking-wider">
                EMPLOYEE INFORMATION
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {infoItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                      <div className="w-1/2 flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <Icon className="h-4 w-4 text-[#2F6798] dark:text-[#5a9fd4] shrink-0" />
                        {item.label}
                      </div>
                      <div className="w-1/2 flex items-center text-xs font-bold text-slate-800 dark:text-slate-100 break-words">
                        {item.value}
                      </div>
                    </div>
                  );
                })}

                {/* Vici Link Row */}
                <div className="flex px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                  <div className="w-1/2 flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <LinkIcon className="h-4 w-4 text-[#2F6798] dark:text-[#5a9fd4] shrink-0" />
                    Vici Stats Link
                  </div>
                  <div className="w-1/2 flex items-center text-xs font-bold">
                    {displayedEmp.vici_link ? (
                      <a
                        href={displayedEmp.vici_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#2F6798] dark:text-[#5a9fd4] hover:underline font-bold"
                      >
                        Open Vici <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-normal">N/A</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
