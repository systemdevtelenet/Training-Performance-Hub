'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Edit2,
  User,
  Briefcase,
  Layers,
  Building2,
  UserCheck,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface TraineeFormDrawerProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData: {
    id?: string;
    name: string;
    trainingType: 'INHOUSE' | 'PST';
    batchName: string;
    accountName: string;
    assignedTrainer: string;
    status: string;
    quarter?: string;
    month?: string;
  };
  accounts?: string[];
  trainers?: string[];
  existingTrainees?: any[];
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  isSubmitting: boolean;
}

const DEFAULT_ACCOUNTS = [
  'General',
  'RM',
  'BF',
  'DFT',
  'JS',
  'FLEXAR',
  'SPA',
  'COVA',
  'FLEET'
];

export function TraineeFormDrawer({
  isOpen,
  mode,
  initialData,
  accounts = [],
  trainers = [],
  existingTrainees = [],
  onClose,
  onSubmit,
  isSubmitting
}: TraineeFormDrawerProps) {
  const [rendered, setRendered] = useState(isOpen);
  const [open, setOpen] = useState(isOpen);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const accountOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_ACCOUNTS);
    accounts.forEach(a => {
      if (a && a !== 'All') set.add(a);
    });
    return Array.from(set).map(a => ({ value: a, label: a }));
  }, [accounts]);

  const trainerOptions = useMemo(() => {
    const set = new Set<string>(['Unassigned']);
    trainers.forEach(t => {
      if (t && t !== 'Unassigned') set.add(t);
    });
    return Array.from(set).map(t => ({ value: t, label: t }));
  }, [trainers]);

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
  const title = isEdit ? 'EDIT TRAINEE RECORD' : 'ADD NEW TRAINEE';

  // Dirty check: In edit mode, check if any field has been modified
  const isDirty = useMemo(() => {
    if (mode === 'add') return true;
    return (
      (formData.name || '').trim() !== (initialData.name || '').trim() ||
      formData.trainingType !== initialData.trainingType ||
      (formData.batchName || '').trim() !== (initialData.batchName || '').trim() ||
      (formData.accountName || '').trim() !== (initialData.accountName || '').trim() ||
      (formData.assignedTrainer || '').trim() !== (initialData.assignedTrainer || '').trim() ||
      formData.status !== initialData.status
    );
  }, [formData, initialData, mode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // 1. Full Name Validation (Letters only & Duplicate check)
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      newErrors.name = 'Full name is required.';
    } else {
      const lettersOnly = trimmedName.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length < 2) {
        newErrors.name = 'Full name must contain at least 2 letters (avoid numbers or symbols only).';
      } else {
        const duplicate = (existingTrainees || []).find(
          (t: any) =>
            t.name &&
            t.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
            t.batchName &&
            t.batchName.trim().toLowerCase() === (formData.batchName || '').trim().toLowerCase() &&
            (mode === 'add' || String(t.id) !== String(initialData.id))
        );
        if (duplicate) {
          newErrors.name = `A trainee named "${trimmedName}" is already registered in ${formData.batchName}.`;
        }
      }
    }

    // 2. Batch / Wave Validation
    const trimmedBatch = (formData.batchName || '').trim();
    if (!trimmedBatch) {
      newErrors.batchName = 'Batch / Wave name is required.';
    } else if (trimmedBatch.length < 2) {
      newErrors.batchName = 'Please enter a valid batch/wave name.';
    }

    // 3. Client Account Validation
    const trimmedAccount = (formData.accountName || '').trim();
    if (!trimmedAccount) {
      newErrors.accountName = 'Client account is required.';
    } else if (
      (formData.status === 'ACTIVE' || formData.status === 'ONGOING') &&
      trimmedAccount.toLowerCase() === 'unassigned'
    ) {
      newErrors.accountName = 'Active trainees must be assigned to a specific client account.';
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
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Auto-adjust default batch name placeholder if switching training type
      if (field === 'trainingType' && mode === 'add') {
        if (value === 'INHOUSE' && prev.batchName === 'Wave 1') {
          next.batchName = 'General -1';
        } else if (value === 'PST' && prev.batchName === 'General -1') {
          next.batchName = 'Wave 1';
        }
      }
      return next;
    });

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
      {/* Backdrop covering 100% viewport */}
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

      {/* Side Right Panel matching Employee Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[480px] flex-col overflow-hidden bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 ease-out rounded-none"
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
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all ${
                  errors.name
                    ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#2F6798] focus:bg-white'
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Training Track & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#2F6798]" /> Training Track
                </label>
                <CustomSelect
                  value={formData.trainingType}
                  onChange={val => handleFieldChange('trainingType', val)}
                  options={[
                    { value: 'INHOUSE', label: 'Inhouse Training' },
                    { value: 'PST', label: 'PST Training' }
                  ]}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6798]" /> Status
                </label>
                <CustomSelect
                  value={formData.status}
                  onChange={val => handleFieldChange('status', val)}
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'ONGOING', label: 'ONGOING' },
                    { value: 'ENDORSED', label: 'ENDORSED' },
                    { value: 'LOSS', label: 'LOSS / ATTRITION' }
                  ]}
                />
              </div>
            </div>

            {/* Batch / Wave & Client Account */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#2F6798]" /> Batch / Wave <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.batchName}
                  onChange={e => handleFieldChange('batchName', e.target.value)}
                  placeholder={formData.trainingType === 'INHOUSE' ? 'e.g. General -1' : 'e.g. Wave 1'}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all ${
                    errors.batchName
                      ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-[#2F6798] focus:bg-white'
                  }`}
                />
                {errors.batchName && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.batchName}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Client Account <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.accountName}
                  hasError={Boolean(errors.accountName)}
                  onChange={val => handleFieldChange('accountName', val)}
                  options={accountOptions}
                  placeholder="-- Select Account --"
                />
                {errors.accountName && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 flex items-center gap-1 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.accountName}
                  </p>
                )}
              </div>
            </div>

            {/* Assigned Trainer */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#2F6798]" /> Assigned Trainer
              </label>
              <CustomSelect
                value={formData.assignedTrainer}
                onChange={val => handleFieldChange('assignedTrainer', val)}
                options={trainerOptions}
                placeholder="-- Select Trainer --"
              />
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
                'Update Trainee'
              ) : (
                'Save Trainee'
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}

