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
  AlertCircle,
  Users,
  Trash2,
  ClipboardPaste,
  Sparkles,
  ClipboardCheck,
  Check
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface BulkRowTrainee {
  id: string;
  name: string;
  trainingType: 'INHOUSE' | 'PST';
  batchName: string;
  accountName: string;
  assignedTrainer: string;
  status: string;
}

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
  
  // Entry Mode: 'single' | 'bulk'
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  
  // Single Form State
  const [formData, setFormData] = useState(initialData);
  const [singleErrors, setSingleErrors] = useState<Record<string, string>>({});

  // Bulk Form States
  const [bulkDefaults, setBulkDefaults] = useState({
    trainingType: 'INHOUSE' as 'INHOUSE' | 'PST',
    batchName: 'General -1',
    accountName: accounts.length > 0 && accounts[0] !== 'All' ? accounts[0] : 'General',
    assignedTrainer: 'Unassigned',
    status: 'ACTIVE'
  });

  const [bulkRows, setBulkRows] = useState<BulkRowTrainee[]>([
    {
      id: 'row-1',
      name: '',
      trainingType: 'INHOUSE',
      batchName: 'General -1',
      accountName: 'General',
      assignedTrainer: 'Unassigned',
      status: 'ACTIVE'
    }
  ]);

  const [bulkPasteText, setBulkPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string | null>(null);

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
      setSingleErrors({});
      setBulkErrors(null);
      setEntryMode('single');
      setBulkDefaults({
        trainingType: initialData.trainingType || 'INHOUSE',
        batchName: initialData.batchName || 'General -1',
        accountName: initialData.accountName || 'General',
        assignedTrainer: initialData.assignedTrainer || 'Unassigned',
        status: initialData.status || 'ACTIVE'
      });
      setBulkRows([
        {
          id: `row-${Date.now()}-1`,
          name: '',
          trainingType: initialData.trainingType || 'INHOUSE',
          batchName: initialData.batchName || 'General -1',
          accountName: initialData.accountName || 'General',
          assignedTrainer: initialData.assignedTrainer || 'Unassigned',
          status: initialData.status || 'ACTIVE'
        }
      ]);
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setSingleErrors({});
      setBulkErrors(null);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialData, mode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rendered && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, rendered, isSubmitting]);

  const isEdit = mode === 'edit';
  const headerTitle = isEdit 
    ? 'EDIT TRAINEE RECORD' 
    : entryMode === 'bulk' 
    ? 'BULK ENROLL TRAINEES' 
    : 'ADD NEW TRAINEE';

  // Single dirty check
  const isSingleDirty = useMemo(() => {
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

  // Bulk Actions
  const handleAddBulkRow = () => {
    setBulkRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length + 1}`,
        name: '',
        trainingType: bulkDefaults.trainingType,
        batchName: bulkDefaults.batchName,
        accountName: bulkDefaults.accountName,
        assignedTrainer: bulkDefaults.assignedTrainer,
        status: bulkDefaults.status
      }
    ]);
  };

  const handleRemoveBulkRow = (index: number) => {
    if (bulkRows.length <= 1) {
      setBulkRows([{
        id: `row-${Date.now()}`,
        name: '',
        trainingType: bulkDefaults.trainingType,
        batchName: bulkDefaults.batchName,
        accountName: bulkDefaults.accountName,
        assignedTrainer: bulkDefaults.assignedTrainer,
        status: bulkDefaults.status
      }]);
      return;
    }
    setBulkRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBulkRow = (index: number, field: keyof BulkRowTrainee, value: any) => {
    setBulkRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    if (bulkErrors) setBulkErrors(null);
  };

  const handleApplyDefaultsToAll = () => {
    setBulkRows(prev =>
      prev.map(row => ({
        ...row,
        trainingType: bulkDefaults.trainingType,
        batchName: bulkDefaults.batchName,
        accountName: bulkDefaults.accountName,
        assignedTrainer: bulkDefaults.assignedTrainer,
        status: bulkDefaults.status
      }))
    );
  };

  const handleParsePastedNames = () => {
    if (!bulkPasteText.trim()) return;

    const lines = bulkPasteText
      .split(/[\r\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (lines.length === 0) return;

    const newRows: BulkRowTrainee[] = lines.map((name, idx) => ({
      id: `row-paste-${Date.now()}-${idx}`,
      name,
      trainingType: bulkDefaults.trainingType,
      batchName: bulkDefaults.batchName,
      accountName: bulkDefaults.accountName,
      assignedTrainer: bulkDefaults.assignedTrainer,
      status: bulkDefaults.status
    }));

    setBulkRows(prev => {
      const existingNonEmpty = prev.filter(r => r.name.trim().length > 0);
      return existingNonEmpty.length > 0 ? [...existingNonEmpty, ...newRows] : newRows;
    });
    setBulkPasteText('');
    setShowPasteBox(false);
  };

  // Validations
  const validateSingle = () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      newErrors.name = 'Full name is required.';
    } else {
      const lettersOnly = trimmedName.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length < 2) {
        newErrors.name = 'Full name must contain at least 2 letters.';
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

    const trimmedBatch = (formData.batchName || '').trim();
    if (!trimmedBatch) {
      newErrors.batchName = 'Batch / Wave name is required.';
    }

    const trimmedAccount = (formData.accountName || '').trim();
    if (!trimmedAccount) {
      newErrors.accountName = 'Client account is required.';
    }

    setSingleErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBulk = () => {
    const validRows = bulkRows.filter(r => r.name && r.name.trim().length > 0);
    if (validRows.length === 0) {
      setBulkErrors('Please enter at least one trainee name.');
      return false;
    }

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const trimmed = r.name.trim();
      const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length < 2) {
        setBulkErrors(`Row #${i + 1} ("${trimmed}") must have a valid full name with at least 2 letters.`);
        return false;
      }
      if (!r.batchName || !r.batchName.trim()) {
        setBulkErrors(`Row #${i + 1} (${trimmed}) is missing a Batch / Wave name.`);
        return false;
      }
      if (!r.accountName || !r.accountName.trim()) {
        setBulkErrors(`Row #${i + 1} (${trimmed}) is missing a Client Account.`);
        return false;
      }
    }

    setBulkErrors(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (entryMode === 'single' || isEdit) {
      if (!validateSingle()) return;
      await onSubmit(formData);
    } else {
      if (!validateBulk()) return;
      const validRows = bulkRows.filter(r => r.name && r.name.trim().length > 0);
      await onSubmit({
        isBulk: true,
        trainees: validRows.map(r => ({
          name: r.name.trim(),
          trainingType: r.trainingType,
          batchName: r.batchName.trim(),
          accountName: r.accountName.trim(),
          assignedTrainer: r.assignedTrainer || 'Unassigned',
          status: r.status || 'ACTIVE',
          quarter: 'Q3',
          month: 'September'
        }))
      });
    }
  };

  const handleSingleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (singleErrors[field]) {
      setSingleErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (!rendered) return null;

  const isSaveDisabled = isSubmitting || (isEdit && !isSingleDirty);
  const isBulkMode = entryMode === 'bulk' && !isEdit;
  const validBulkCount = bulkRows.filter(r => r.name && r.name.trim().length > 0).length;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop matching Batch Details */}
      <button
        aria-label="Close modal"
        onClick={e => {
          if (!isSubmitting) onClose();
        }}
        className={`absolute inset-0 w-full h-full bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        } cursor-default`}
      />

      {/* Drawer matching Batch Details */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-[9999] flex w-full ${
          isBulkMode ? 'max-w-[760px]' : 'max-w-[480px]'
        } flex-col overflow-hidden bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out rounded-none ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Solid Signature Blue Top Header Bar - Exact Match to Batch Details Drawer */}
        <div className="flex h-14 items-center justify-between bg-[#2F6798] px-6 text-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold tracking-wider uppercase">
              {headerTitle}
            </h2>
            {isBulkMode && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                {validBulkCount} {validBulkCount === 1 ? 'Trainee' : 'Trainees'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEdit && (
              <div className="flex items-center bg-black/20 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setEntryMode('single')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    entryMode === 'single'
                      ? 'bg-white text-[#2F6798] shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('bulk')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    entryMode === 'bulk'
                      ? 'bg-white text-[#2F6798] shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Bulk
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto font-sans bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div className="p-6 space-y-6">
            
            {/* Top Summary Banner */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-5 bg-white dark:bg-slate-900">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {isEdit
                  ? `${formData.name || 'Trainee'} Details`
                  : isBulkMode
                  ? 'Batch Roster Enrollment'
                  : 'Enroll Trainee'}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {isEdit
                  ? 'Modify trainee credentials & assigned trainer'
                  : isBulkMode
                  ? 'Register multiple trainees with individual or shared trainers'
                  : 'Enroll a new trainee into a training batch'}
              </p>

              {/* Headcount / Roster Metric Card */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <Users className="w-5 h-5 text-[#2F6798] dark:text-[#5a9fd4]" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isBulkMode ? 'Trainees To Enroll' : 'Enrollment Count'}
                    </span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {isBulkMode ? validBulkCount : 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30">
                  <CheckCircle2 className="w-5 h-5 text-[#2F6798] dark:text-[#5a9fd4]" />
                  <div>
                    <span className="text-[10px] font-bold text-[#2F6798]/70 dark:text-[#5a9fd4] uppercase tracking-wider block">
                      Initial Status
                    </span>
                    <span className="text-lg font-black text-[#2F6798] dark:text-[#5a9fd4]">
                      {isBulkMode ? bulkDefaults.status : formData.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= SINGLE ENTRY FORM ================= */}
            {!isBulkMode && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                {/* BLUE HEADER BAR - Exact match to BATCH PARAMETER */}
                <div className="bg-[#2F6798] px-6 py-3 flex text-xs font-bold text-white tracking-wide uppercase rounded-t-xl">
                  <div className="w-1/2 flex items-center gap-2">ⓘ BATCH PARAMETER</div>
                  <div className="w-1/2 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 opacity-80" /> DETAILS
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                  {/* Full Name */}
                  <div className="p-4 bg-white dark:bg-slate-800">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => handleSingleFieldChange('name', e.target.value)}
                      placeholder="e.g. John Doe"
                      className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold placeholder:text-slate-400 focus:outline-none transition-all ${
                        singleErrors.name
                          ? 'border-2 border-red-500 bg-red-50/20 text-slate-800 focus:ring-2 focus:ring-red-200'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#2F6798]'
                      }`}
                    />
                    {singleErrors.name && (
                      <p className="mt-1 text-[11px] font-semibold text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {singleErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Account */}
                  <div className="flex px-4 py-3 items-center">
                    <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Account</div>
                    <div className="w-1/2">
                      <CustomSelect
                        value={formData.accountName}
                        onChange={val => handleSingleFieldChange('accountName', val)}
                        options={accountOptions}
                      />
                    </div>
                  </div>

                  {/* Training Track */}
                  <div className="flex px-4 py-3 items-center">
                    <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Training Track</div>
                    <div className="w-1/2">
                      <CustomSelect
                        value={formData.trainingType}
                        onChange={val => handleSingleFieldChange('trainingType', val)}
                        options={[
                          { value: 'INHOUSE', label: 'INHOUSE TRAINING' },
                          { value: 'PST', label: 'PST TRAINING' }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Batch / Wave */}
                  <div className="flex px-4 py-3 items-center">
                    <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Batch / Wave</div>
                    <div className="w-1/2">
                      <input
                        type="text"
                        value={formData.batchName}
                        onChange={e => handleSingleFieldChange('batchName', e.target.value)}
                        placeholder="e.g. General -1"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#2F6798]"
                      />
                    </div>
                  </div>

                  {/* Assigned Trainer */}
                  <div className="flex px-4 py-3 items-center">
                    <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Assigned Trainer</div>
                    <div className="w-1/2">
                      <CustomSelect
                        value={formData.assignedTrainer}
                        onChange={val => handleSingleFieldChange('assignedTrainer', val)}
                        options={trainerOptions}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex px-4 py-3 items-center">
                    <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Status</div>
                    <div className="w-1/2">
                      <CustomSelect
                        value={formData.status}
                        onChange={val => handleSingleFieldChange('status', val)}
                        options={[
                          { value: 'ACTIVE', label: 'ACTIVE' },
                          { value: 'ONGOING', label: 'ONGOING' },
                          { value: 'ENDORSED', label: 'ENDORSED' },
                          { value: 'LOSS', label: 'LOSS / ATTRITION' }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= BULK MULTI-TRAINEE FORM ================= */}
            {isBulkMode && (
              <div className="space-y-5">
                {/* Cohort Parameters Table */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                  <div className="bg-[#2F6798] px-6 py-3 flex items-center justify-between text-xs font-bold text-white tracking-wide uppercase rounded-t-xl">
                    <div className="flex items-center gap-2">ⓘ BATCH PARAMETER (DEFAULTS)</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(!showPasteBox)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-xs font-semibold text-white rounded-lg transition-all"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        {showPasteBox ? 'Hide Paste' : 'Quick Paste Names'}
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyDefaultsToAll}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-[#2F6798] text-xs font-bold rounded-lg shadow-sm transition-colors"
                        title="Apply these default settings to all rows below"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply All
                      </button>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 dark:bg-slate-800/40 text-xs rounded-b-xl">
                    <div>
                      <span className="font-medium text-slate-500 block mb-1">Account</span>
                      <CustomSelect
                        value={bulkDefaults.accountName}
                        onChange={val => setBulkDefaults(prev => ({ ...prev, accountName: val }))}
                        options={accountOptions}
                      />
                    </div>

                    <div>
                      <span className="font-medium text-slate-500 block mb-1">Track</span>
                      <CustomSelect
                        value={bulkDefaults.trainingType}
                        onChange={val => setBulkDefaults(prev => ({ ...prev, trainingType: val as 'INHOUSE' | 'PST' }))}
                        options={[
                          { value: 'INHOUSE', label: 'INHOUSE' },
                          { value: 'PST', label: 'PST' }
                        ]}
                      />
                    </div>

                    <div>
                      <span className="font-medium text-slate-500 block mb-1">Batch / Wave</span>
                      <input
                        type="text"
                        value={bulkDefaults.batchName}
                        onChange={e => setBulkDefaults(prev => ({ ...prev, batchName: e.target.value }))}
                        placeholder="e.g. General -1"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#2F6798]"
                      />
                    </div>

                    <div>
                      <span className="font-medium text-slate-500 block mb-1">Default Trainer</span>
                      <CustomSelect
                        value={bulkDefaults.assignedTrainer}
                        onChange={val => setBulkDefaults(prev => ({ ...prev, assignedTrainer: val }))}
                        options={trainerOptions}
                      />
                    </div>
                  </div>

                  {/* Paste Box */}
                  {showPasteBox && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 rounded-b-xl">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Paste list of trainee names (one per line or separated by commas):
                      </label>
                      <textarea
                        rows={3}
                        value={bulkPasteText}
                        onChange={e => setBulkPasteText(e.target.value)}
                        placeholder="John Doe&#10;Jane Smith&#10;Alex Morgan..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-sans font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#2F6798]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPasteBox(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleParsePastedNames}
                          disabled={!bulkPasteText.trim()}
                          className="px-4 py-1.5 bg-[#2F6798] hover:bg-[#24527a] text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                        >
                          Import Trainees
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulk Error Alert */}
                {bulkErrors && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bulkErrors}</span>
                  </div>
                )}

                {/* TRAINEE LIST SECTION */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h4 className="text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] uppercase tracking-wider">
                      TRAINEE LIST
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400">
                      {bulkRows.length} Total
                    </span>
                  </div>

                  <div className="space-y-2">
                    {bulkRows.map((row, index) => (
                      <div
                        key={row.id}
                        className="relative flex flex-col md:flex-row items-start md:items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 gap-3"
                      >
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-xs text-[#2F6798] dark:text-[#5a9fd4] shrink-0">
                            {row.name ? row.name.substring(0, 2).toUpperCase() : `${index + 1}`}
                          </div>
                          <div className="flex-1 md:w-48">
                            <input
                              type="text"
                              value={row.name}
                              onChange={e => handleUpdateBulkRow(index, 'name', e.target.value)}
                              placeholder="Full Name *"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#2F6798]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-1 w-full md:w-auto">
                          {/* Dedicated Trainer Picker per Trainee */}
                          <div className="col-span-2 md:col-span-1">
                            <CustomSelect
                              value={row.assignedTrainer}
                              onChange={val => handleUpdateBulkRow(index, 'assignedTrainer', val)}
                              options={trainerOptions}
                              placeholder="Trainer"
                            />
                          </div>

                          <div>
                            <CustomSelect
                              value={row.accountName}
                              onChange={val => handleUpdateBulkRow(index, 'accountName', val)}
                              options={accountOptions}
                              placeholder="Account"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              value={row.batchName}
                              onChange={e => handleUpdateBulkRow(index, 'batchName', e.target.value)}
                              placeholder="Batch / Wave"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#2F6798]"
                            />
                          </div>
                        </div>

                        {/* Clean Red Delete Icon without box */}
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkRow(index)}
                          className="p-1.5 text-red-500 hover:text-red-700 transition-colors self-end md:self-center shrink-0"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBulkRow}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#2F6798] rounded-xl text-xs font-bold text-slate-500 hover:text-[#2F6798] flex items-center justify-center gap-2 transition-all bg-slate-50/50 hover:bg-white"
                  >
                    <Plus className="w-4 h-4" /> Add Another Trainee
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Solid Footer Matching Drawer Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500">
              {isBulkMode ? (
                <span>
                  Ready to enroll <strong>{validBulkCount}</strong> {validBulkCount === 1 ? 'trainee' : 'trainees'}
                </span>
              ) : (
                <span>Single enrollment</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaveDisabled || (isBulkMode && validBulkCount === 0)}
                title={isEdit && !isSingleDirty ? 'No changes made yet' : undefined}
                className="inline-flex items-center gap-2 px-6 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {isEdit ? 'Updating...' : isBulkMode ? 'Enrolling...' : 'Saving...'}
                  </>
                ) : isEdit ? (
                  'Update Trainee'
                ) : isBulkMode ? (
                  `Enroll ${validBulkCount > 0 ? validBulkCount : ''} Trainees`
                ) : (
                  'Save Trainee'
                )}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>,
    document.body
  );
}



