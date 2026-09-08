'use client';

import { useEffect, useState, useMemo } from 'react';
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
  Loader2,
  AlertCircle
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

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
  existingEmployees?: any[];
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
  existingEmployees = [],
  onClose,
  onSubmit,
  isSubmitting
}: EmployeeFormDrawerProps) {
  const [rendered, setRendered] = useState(isOpen);
  const [open, setOpen] = useState(isOpen);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setErrors({});
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setErrors({});
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

  const isEdit = mode === 'edit';
  const title = isEdit ? 'EDIT EMPLOYEE PROFILE' : 'ADD NEW EMPLOYEE';

  // Dirty check: In edit mode, check if any field has been modified
  const isDirty = useMemo(() => {
    if (mode === 'add') return true;
    return (
      (formData.employee_name || '').trim() !== (initialData.employee_name || '').trim() ||
      (formData.employee_code || '').trim() !== (initialData.employee_code || '').trim() ||
      (formData.employee_email || '').trim() !== (initialData.employee_email || '').trim() ||
      Number(formData.status_id) !== Number(initialData.status_id) ||
      (formData.hire_date || '') !== (initialData.hire_date || '') ||
      (formData.vici_link || '').trim() !== (initialData.vici_link || '').trim() ||
      String(formData.account_id || '') !== String(initialData.account_id || '')
    );
  }, [formData, initialData, mode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // 1. Full Name Validation
    const trimmedName = (formData.employee_name || '').trim();
    if (!trimmedName) {
      newErrors.employee_name = 'Full name is required.';
    } else {
      const lettersOnly = trimmedName.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length < 2) {
        newErrors.employee_name = 'Please enter a valid full name with at least 2 letters.';
      }
    }

    // 2. Employee Code Validation (Digits Only & Uniqueness)
    const trimmedCode = (formData.employee_code || '').trim();
    if (trimmedCode) {
      if (!/^\d+$/.test(trimmedCode)) {
        newErrors.employee_code = 'Employee code must contain digits only (e.g. 1108).';
      } else {
        const duplicateCode = (existingEmployees || []).find(
          (e: any) =>
            e.employee_code &&
            String(e.employee_code).trim() === trimmedCode &&
            (mode === 'add' || Number(e.id) !== Number(initialData.id))
        );
        if (duplicateCode) {
          newErrors.employee_code = `Employee code "${trimmedCode}" is already taken by ${duplicateCode.employee_name}.`;
        }
      }
    }

    // 3. Email Validation (Format, "telenet" inclusion, & Uniqueness)
    const trimmedEmail = (formData.employee_email || '').trim().toLowerCase();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.employee_email = 'Please enter a valid email format (e.g. user.telenet@gmail.com).';
      } else if (!trimmedEmail.includes('telenet')) {
        newErrors.employee_email = 'Email must contain "telenet" (e.g. user.telenet@gmail.com).';
      } else {
        const duplicateEmail = (existingEmployees || []).find(
          (e: any) =>
            e.employee_email &&
            e.employee_email.trim().toLowerCase() === trimmedEmail &&
            (mode === 'add' || Number(e.id) !== Number(initialData.id))
        );
        if (duplicateEmail) {
          newErrors.employee_email = `Email "${trimmedEmail}" is already registered to ${duplicateEmail.employee_name}.`;
        }
      }
    }

    // 4. Client Account Assignment Validation (Required when status is Active)
    if (Number(formData.status_id) === 1 && (!formData.account_id || formData.account_id === '')) {
      newErrors.account_id = 'Active employees must be assigned to a client account.';
    }

    // 5. Hire Date Validation (Cannot be in the future)
    if (formData.hire_date) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (formData.hire_date > todayStr) {
        newErrors.hire_date = 'Hire date cannot be in the future.';
      }
    }

    // 6. VICI Stats Link Validation (Protocol and cebutele-net.ph domain check)
    const trimmedLink = (formData.vici_link || '').trim();
    if (trimmedLink) {
      if (!/^https?:\/\//i.test(trimmedLink)) {
        newErrors.vici_link = 'VICI Link must start with http:// or https://';
      } else if (!trimmedLink.toLowerCase().includes('cebutele-net.ph')) {
        newErrors.vici_link = 'VICI Link must point to a cebutele-net.ph domain (e.g. https://vici01.cebutele-net.ph/...).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (!rendered || typeof window === 'undefined') return null;

  const isSaveDisabled = isSubmitting || (isEdit && !isDirty);

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
        className={`fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[480px] flex-col overflow-hidden bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 ease-out rounded-none`}
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)'
        }}
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
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 font-sans space-y-5">
            {/* Full Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2F6798]" /> Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employee_name}
                onChange={e => handleFieldChange('employee_name', e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all ${
                  errors.employee_name
                    ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#2F6798] focus:bg-white'
                }`}
              />
              {errors.employee_name && (
                <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.employee_name}
                </p>
              )}
            </div>

            {/* Employee Code & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#2F6798]" /> Employee Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.employee_code}
                  onChange={e => handleFieldChange('employee_code', e.target.value)}
                  placeholder="e.g. 1108"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all ${
                    errors.employee_code
                      ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#2F6798] focus:bg-white'
                  }`}
                />
                {errors.employee_code && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.employee_code}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6798]" /> Status
                </label>
                <CustomSelect
                  value={formData.status_id}
                  onChange={val => handleFieldChange('status_id', Number(val))}
                  options={[
                    { value: 1, label: 'Active' },
                    { value: 2, label: 'Inactive' },
                    { value: 3, label: 'Resigned' },
                    { value: 4, label: 'On Leave' },
                  ]}
                />
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
                  onChange={e => handleFieldChange('employee_email', e.target.value)}
                  placeholder="e.g. user.telenet@gmail.com"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all ${
                    errors.employee_email
                      ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#2F6798] focus:bg-white'
                  }`}
                />
                {errors.employee_email && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.employee_email}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Client Account
                </label>
                <CustomSelect
                  value={formData.account_id}
                  hasError={Boolean(errors.account_id)}
                  onChange={val => handleFieldChange('account_id', val)}
                  options={[
                    { value: '', label: '-- Unassigned --' },
                    ...(accounts || []).map((acc: any) => ({
                      value: String(acc.account_id),
                      label: acc.account_name || acc.account_code
                    }))
                  ]}
                  placeholder="-- Unassigned --"
                />
                {errors.account_id && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.account_id}
                  </p>
                )}
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
                  onChange={e => handleFieldChange('hire_date', e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none transition-all ${
                    errors.hire_date
                      ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#2F6798] focus:bg-white'
                  }`}
                />
                {errors.hire_date && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.hire_date}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[#2F6798]" /> Vici Stats Link
                </label>
                <input
                  type="url"
                  value={formData.vici_link}
                  onChange={e => handleFieldChange('vici_link', e.target.value)}
                  placeholder="https://vici01.cebutele-net.ph/..."
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all ${
                    errors.vici_link
                      ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#2F6798] focus:bg-white'
                  }`}
                />
                {errors.vici_link && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.vici_link}
                  </p>
                )}
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
              disabled={isSaveDisabled}
              title={isEdit && !isDirty ? 'No changes made yet' : undefined}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
