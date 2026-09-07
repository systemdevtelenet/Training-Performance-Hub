'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Edit2,
  ChevronDown,
  User,
  Hash,
  Mail,
  Building2,
  Calendar,
  Link as LinkIcon,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface EmployeeFormDrawerProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData: {
    id?: number;
    employee_code: string;
    employee_name: string;
    employee_email: string;
    status_id: number;
    hire_date: string;
    vici_link: string;
    account_id: string;
  };
  accounts: any[];
  statuses?: any[];
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  isSubmitting: boolean;
}

export function EmployeeFormDrawer({
  isOpen,
  mode,
  initialData,
  accounts = [],
  statuses = [],
  onClose,
  onSubmit,
  isSubmitting
}: EmployeeFormDrawerProps) {
  const [rendered, setRendered] = useState(isOpen);
  const [open, setOpen] = useState(isOpen);
  const [formData, setFormData] = useState(initialData);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => {
      setRendered(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rendered && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, rendered, isSubmitting]);

  if (!rendered || typeof window === 'undefined') return null;

  const isEdit = mode === 'edit';
  const title = isEdit ? 'EDIT EMPLOYEE PROFILE' : 'ADD NEW EMPLOYEE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
        className={`absolute inset-0 w-full h-full bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        } cursor-default`}
      />

      {/* Clean Square Cornered Side Drawer with Blue Header Bar */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[480px] flex-col overflow-hidden bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 ease-out rounded-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* BLUE HEADER BAR */}
        <header className="bg-[#2F6798] px-6 py-4 flex items-center justify-between shrink-0 font-sans shadow-sm">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-2">
            {isEdit ? <Edit2 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="text-white/80 hover:text-white transition-colors focus:outline-none disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 font-sans space-y-5">
            {/* Full Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2F6798]" /> Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.employee_name}
                onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:bg-white transition-all"
              />
            </div>

            {/* Employee Code & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#2F6798]" /> Employee Code
                </label>
                <input
                  type="text"
                  value={formData.employee_code}
                  onChange={e => setFormData({ ...formData, employee_code: e.target.value })}
                  placeholder="e.g. 1108"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6798]" /> Status
                </label>
                <div className="relative">
                  <select
                    value={formData.status_id}
                    onChange={e => setFormData({ ...formData, status_id: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:bg-white transition-all"
                  >
                    <option value={1}>Active</option>
                    <option value={2}>Inactive</option>
                    <option value={3}>Resigned</option>
                    <option value={4}>On Leave</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Email Address & Client Account */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#2F6798]" /> Email Address
                </label>
                <input
                  type="email"
                  value={formData.employee_email}
                  onChange={e => setFormData({ ...formData, employee_email: e.target.value })}
                  placeholder="e.g. user@telenet.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Client Account
                </label>
                <div className="relative">
                  <select
                    value={formData.account_id}
                    onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:bg-white transition-all"
                  >
                    <option value="">-- Unassigned --</option>
                    {(accounts || []).map((acc: any) => (
                      <option key={acc.account_id} value={acc.account_id}>
                        {acc.account_name || acc.account_code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Hire Date & Vici Stats Link */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#2F6798]" /> Hire Date
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={e => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[#2F6798]" /> Vici Stats Link
                </label>
                <input
                  type="url"
                  value={formData.vici_link}
                  onChange={e => setFormData({ ...formData, vici_link: e.target.value })}
                  placeholder="https://vici01.cebutele-net.ph/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isEdit ? 'Updating...' : 'Saving...'}
                </>
              ) : isEdit ? (
                'Update Employee'
              ) : (
                'Save Employee'
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
