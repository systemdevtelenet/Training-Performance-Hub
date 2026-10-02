'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserPlus,
  Calendar,
  Building2,
  Mail,
  Hash,
  Shield,
  Briefcase,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  Check,
  Plus
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { useRole } from '@/components/providers/RoleProvider';
import { emitCustomToast } from '@/components/CustomToast';

interface TrainerFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableAccounts?: string[];
}

const TRAINER_POSITIONS = [
  { value: 'Trainer', label: 'Trainer (Classroom & Nesting Facilitator)' },
  { value: 'Corporate Trainer', label: 'Corporate Trainer (Advanced / Cross-Skilling)' },
  { value: 'Training Coordinator', label: 'Training Coordinator (Logistics & Roster Admin)' },
  { value: 'Head of Training', label: 'Head of Training (Lead Operations)' }
];

export function TrainerFormDrawer({
  isOpen,
  onClose,
  onSuccess,
  availableAccounts = []
}: TrainerFormDrawerProps) {
  const { userName } = useRole();
  const [rendered, setRendered] = useState(isOpen);
  const [open, setOpen] = useState(isOpen);

  const [formData, setFormData] = useState({
    name: '',
    employee_num: '',
    position: 'Trainer',
    email: '',
    startDate: new Date().toISOString().split('T')[0],
    selectedAccounts: [] as string[],
    newAccountInput: '',
    assignedTask: '',
    profilePic: ''
  });

  const [accountOptions, setAccountOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch account options from API if not provided
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() => setOpen(true));
      setErrorMsg(null);
      setErrors({});

      fetch('/api/trainers')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.accounts)) {
            const merged = Array.from(new Set([...availableAccounts, ...data.accounts])).filter(Boolean).sort();
            setAccountOptions(merged);
          } else if (availableAccounts.length > 0) {
            setAccountOptions(availableAccounts);
          }
        })
        .catch(() => {
          if (availableAccounts.length > 0) setAccountOptions(availableAccounts);
        });
    } else {
      setOpen(false);
      const timer = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleAccount = (acc: string) => {
    setFormData(prev => {
      const exists = prev.selectedAccounts.includes(acc);
      return {
        ...prev,
        selectedAccounts: exists
          ? prev.selectedAccounts.filter(a => a !== acc)
          : [...prev.selectedAccounts, acc]
      };
    });
  };

  const handleAddCustomAccount = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const val = formData.newAccountInput.trim();
    if (!val) return;

    if (!accountOptions.includes(val)) {
      setAccountOptions(prev => [...prev, val].sort());
    }
    if (!formData.selectedAccounts.includes(val)) {
      setFormData(prev => ({
        ...prev,
        selectedAccounts: [...prev.selectedAccounts, val],
        newAccountInput: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, newAccountInput: '' }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const cleanName = formData.name.trim();

    if (!cleanName) {
      errs.name = 'Full name is required.';
    } else if (cleanName.replace(/[^a-zA-Z]/g, '').length < 3) {
      errs.name = 'Please enter a valid full trainer name (at least 3 letters).';
    }

    if (!formData.employee_num.trim()) {
      errs.employee_num = 'Employee ID number is required.';
    } else if (!/^\d+$/.test(formData.employee_num.trim())) {
      errs.employee_num = 'Employee ID must contain digits only.';
    }

    if (!formData.startDate) {
      errs.startDate = 'Start date is required.';
    }

    if (!formData.position) {
      errs.position = 'Position / role is required.';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please provide a valid email format (e.g. trainername.telenet@gmail.com).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          employee_num: formData.employee_num,
          position: formData.position,
          email: formData.email,
          startDate: formData.startDate,
          accounts: formData.selectedAccounts,
          assignedTask: formData.assignedTask,
          profilePic: formData.profilePic,
          adminName: userName || 'Admin'
        })
      });

      const data = await res.json();
      if (data.success) {
        emitCustomToast({
          title: 'Trainer Added Successfully',
          message: `${formData.name} has been added to the Trainers Hub.`,
          type: 'success'
        });
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          name: '',
          employee_num: '',
          position: 'Trainer',
          email: '',
          startDate: new Date().toISOString().split('T')[0],
          selectedAccounts: [],
          newAccountInput: '',
          assignedTask: '',
          profilePic: ''
        });
      } else {
        setErrorMsg(data.error || 'Failed to add trainer.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error submitting trainer form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rendered) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container */}
      <div
        className={`relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 to-slate-50/50 dark:from-blue-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2F6798]/15 dark:bg-[#2F6798]/25 text-[#2F6798] dark:text-[#5a9fd4] flex items-center justify-center shrink-0 shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Add New Trainer
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 uppercase">
                  Staff Onboarding
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Register a new instructor, assign client accounts, and enable batch management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Full Name & Employee Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#2F6798]" /> Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                placeholder="e.g., TR John Doe"
                className={`w-full rounded-xl border p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none transition-all ${
                  errors.name
                    ? 'border-red-500 bg-red-50/15 focus:ring-2 focus:ring-red-200 dark:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#2F6798]'
                }`}
              />
              {errors.name && <p className="text-[11px] text-red-500 dark:text-red-400 font-normal">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#2F6798]" /> Employee ID / Number *
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.employee_num}
                onChange={e => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, employee_num: digitsOnly }));
                  if (errors.employee_num) setErrors(prev => ({ ...prev, employee_num: '' }));
                }}
                placeholder="e.g., 1045"
                className={`w-full rounded-xl border p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none transition-all ${
                  errors.employee_num
                    ? 'border-red-500 bg-red-50/15 focus:ring-2 focus:ring-red-200 dark:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#2F6798]'
                }`}
              />
              {errors.employee_num && <p className="text-[11px] text-red-500 dark:text-red-400 font-normal">{errors.employee_num}</p>}
            </div>
          </div>

          {/* Position & Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#2F6798]" /> Position / Role *
              </label>
              <CustomSelect
                value={formData.position}
                hasError={!!errors.position}
                onChange={val => {
                  setFormData(prev => ({ ...prev, position: val }));
                  if (errors.position) setErrors(prev => ({ ...prev, position: '' }));
                }}
                options={TRAINER_POSITIONS}
              />
              {errors.position && <p className="text-[11px] text-red-500 dark:text-red-400 font-normal">{errors.position}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2F6798]" /> Start / Hire Date *
              </label>
              <CustomDatePicker
                value={formData.startDate}
                hasError={!!errors.startDate}
                onChange={val => {
                  setFormData(prev => ({ ...prev, startDate: val }));
                  if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                }}
              />
              {errors.startDate && <p className="text-[11px] text-red-500 dark:text-red-400 font-normal">{errors.startDate}</p>}
            </div>
          </div>

          {/* Work Email Address */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#2F6798]" /> Work Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              placeholder="e.g., trainername.telenet@gmail.com"
              className={`w-full rounded-xl border p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none transition-all ${
                errors.email
                  ? 'border-red-500 bg-red-50/15 focus:ring-2 focus:ring-red-200 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#2F6798]'
              }`}
            />
            {errors.email ? (
              <p className="text-[11px] text-red-500 dark:text-red-400 font-normal">{errors.email}</p>
            ) : (
              <p className="text-[10px] text-slate-400">
                Email will be used for authentication and attendance logging access.
              </p>
            )}
          </div>

          {/* Client Accounts Assignment */}
          <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Assigned Client Accounts
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                {formData.selectedAccounts.length} selected
              </span>
            </div>

            {/* Selected Account Pills */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              {formData.selectedAccounts.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">No accounts selected yet. Click options below.</span>
              ) : (
                formData.selectedAccounts.map(acc => (
                  <span
                    key={acc}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2F6798]/10 text-[#2F6798] dark:text-[#5a9fd4] font-bold text-[10px]"
                  >
                    {acc}
                    <button
                      type="button"
                      onClick={() => toggleAccount(acc)}
                      className="hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Quick-Pick Account Buttons */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-semibold text-slate-500">Available Accounts (Click to toggle):</p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {accountOptions.map(acc => {
                  const isSelected = formData.selectedAccounts.includes(acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => toggleAccount(acc)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2F6798] text-white shadow-2xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {isSelected ? `✓ ${acc}` : `+ ${acc}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Account */}
            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="text"
                value={formData.newAccountInput}
                onChange={e => setFormData(prev => ({ ...prev, newAccountInput: e.target.value }))}
                onKeyDown={handleAddCustomAccount}
                placeholder="Or type custom account name..."
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-800 dark:text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomAccount}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200"
              >
                Add Account
              </button>
            </div>
          </div>

          {/* Assigned Tasks / Responsibilities */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#2F6798]" /> Primary Tasks / Responsibilities
            </label>
            <input
              type="text"
              value={formData.assignedTask}
              onChange={e => setFormData(prev => ({ ...prev, assignedTask: e.target.value }))}
              placeholder="e.g., PST Facilitation, Daily Attendance, Mock Call Evaluations"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#2F6798]"
            />
          </div>

          {/* System Info Banner */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl text-[11px] text-[#2F6798] dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Once registered, this trainer will immediately become selectable across <strong>PST Waves</strong>, <strong>In-House Batches</strong>, and <strong>Trainee Forms</strong>.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Trainer...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Trainer Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
