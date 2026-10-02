'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserMinus,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Building2,
  Layers,
  GraduationCap,
  Loader2,
  ShieldAlert,
  ArrowRightLeft,
  Sparkles,
  Info,
  Check,
  UserX,
  ShieldCheck,
  Users
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { useRole } from '@/components/providers/RoleProvider';
import { emitCustomToast } from '@/components/CustomToast';

export interface TrainerOffboardData {
  trainerName: string;
  trainerEmail?: string;
  replacementTrainer: string;
  departureDate: string;
  reasonCategory: string;
  remarks: string;
  reassignActiveTrainees: boolean;
  revokeAccess: boolean;
  clearanceChecked: {
    assetsReturned: boolean;
    accessRevoked: boolean;
    handoverCompleted: boolean;
  };
}

interface TrainerOffboardDrawerProps {
  isOpen: boolean;
  initialTrainerName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const REASON_CATEGORIES = [
  { value: '', label: '-- Select Resignation Reason --' },
  { value: 'Better Career Opportunity / Compensation', label: 'Better Career Opportunity / Compensation' },
  { value: 'Relocation / Family Circumstances', label: 'Relocation / Family Circumstances' },
  { value: 'Career Transition / Industry Change', label: 'Career Transition / Industry Change' },
  { value: 'Health / Medical Reasons', label: 'Health / Medical Reasons' },
  { value: 'Contract Completion / End of Assignment', label: 'Contract Completion / End of Assignment' },
  { value: 'Personal Pursuits / Further Studies', label: 'Personal Pursuits / Further Studies' },
  { value: 'Other / Non-disclosed Reason', label: 'Other / Non-disclosed Reason' }
];

export function TrainerOffboardDrawer({
  isOpen,
  initialTrainerName,
  onClose,
  onSuccess
}: TrainerOffboardDrawerProps) {
  const { userName, role } = useRole();
  const [rendered, setRendered] = useState(isOpen);
  const [open, setOpen] = useState(isOpen);

  const [activeTrainers, setActiveTrainers] = useState<any[]>([]);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TrainerOffboardData>({
    trainerName: initialTrainerName || '',
    trainerEmail: '',
    replacementTrainer: '',
    departureDate: new Date().toISOString().split('T')[0],
    reasonCategory: '',
    remarks: '',
    reassignActiveTrainees: true,
    revokeAccess: true,
    clearanceChecked: {
      assetsReturned: true,
      accessRevoked: true,
      handoverCompleted: true
    }
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch active trainers with active workload
  const loadTrainersData = async () => {
    setIsLoadingTrainers(true);
    try {
      const res = await fetch('/api/trainers/offboard');
      const data = await res.json();
      if (data.success && Array.isArray(data.activeTrainers)) {
        setActiveTrainers(data.activeTrainers);
        if (initialTrainerName) {
          const matched = data.activeTrainers.find((t: any) => t.name.toLowerCase() === initialTrainerName.toLowerCase());
          if (matched) {
            setFormData(prev => ({
              ...prev,
              trainerName: matched.name,
              trainerEmail: matched.email || ''
            }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load active trainers:', err);
    } finally {
      setIsLoadingTrainers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() => setOpen(true));
      setFormErrors({});
      setSubmitError(null);
      setFormData({
        trainerName: initialTrainerName || '',
        trainerEmail: '',
        replacementTrainer: '',
        departureDate: new Date().toISOString().split('T')[0],
        reasonCategory: '',
        remarks: '',
        reassignActiveTrainees: true,
        revokeAccess: true,
        clearanceChecked: {
          assetsReturned: true,
          accessRevoked: true,
          handoverCompleted: true
        }
      });
      loadTrainersData();
    } else {
      setOpen(false);
      const timer = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialTrainerName]);

  // Find currently selected trainer info
  const selectedTrainerObj = useMemo(() => {
    return activeTrainers.find(t => t.name.toLowerCase() === (formData.trainerName || '').toLowerCase());
  }, [activeTrainers, formData.trainerName]);

  // Keep email synced when selected trainer changes
  useEffect(() => {
    if (selectedTrainerObj) {
      setFormData(prev => ({
        ...prev,
        trainerEmail: selectedTrainerObj.email || ''
      }));
    }
  }, [selectedTrainerObj]);

  // Potential replacement trainers (all other active trainers)
  const replacementOptions = useMemo(() => {
    const list = activeTrainers
      .filter(t => t.name.toLowerCase() !== (formData.trainerName || '').toLowerCase())
      .map(t => ({
        value: t.name,
        label: `${t.name} (${t.position || 'Trainer'}) - ${t.activeTraineeCount || 0} active trainees`
      }));

    return [
      { value: '', label: '-- Select Replacement Trainer --' },
      ...list,
      { value: 'Unassigned', label: 'Do not reassign now (Keep Unassigned)' }
    ];
  }, [activeTrainers, formData.trainerName]);

  const handleClearanceToggle = (key: keyof TrainerOffboardData['clearanceChecked']) => {
    setFormData(prev => ({
      ...prev,
      clearanceChecked: {
        ...prev.clearanceChecked,
        [key]: !prev.clearanceChecked[key]
      }
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!formData.trainerName || !formData.trainerName.trim()) {
      errs.trainerName = 'Please select a trainer to offboard.';
    }

    if (formData.reassignActiveTrainees) {
      if (!formData.replacementTrainer || !formData.replacementTrainer.trim()) {
        errs.replacementTrainer = 'Please select a replacement trainer for active batches.';
      } else if (formData.replacementTrainer.toLowerCase() === formData.trainerName.toLowerCase()) {
        errs.replacementTrainer = 'Replacement trainer cannot be the same as the resigning trainer.';
      }
    }

    if (!formData.departureDate) {
      errs.departureDate = 'Separation date is required.';
    }

    if (!formData.reasonCategory || !formData.reasonCategory.trim()) {
      errs.reasonCategory = 'Please select a reason for separation.';
    }

    if (!formData.remarks || !formData.remarks.trim()) {
      errs.remarks = 'Handover remarks or notes are required.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setSubmitError('Please complete all required fields highlighted in red below.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/trainers/offboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerName: formData.trainerName,
          trainerEmail: formData.trainerEmail,
          replacementTrainer: formData.replacementTrainer,
          departureDate: formData.departureDate,
          reasonCategory: formData.reasonCategory,
          remarks: formData.remarks,
          reassignActiveTrainees: formData.reassignActiveTrainees,
          revokeAccess: formData.revokeAccess,
          adminName: userName || 'Admin Nissi'
        })
      });

      const data = await res.json();
      if (data.success) {
        emitCustomToast({
          title: 'Trainer Offboarded',
          message: `${formData.trainerName} has been transitioned to Inactive/Resigned status.`,
          type: 'success'
        });
        onClose();
        try {
          if (onSuccess) onSuccess();
        } catch (callbackErr) {
          console.error('Error in onSuccess callback:', callbackErr);
        }
      } else {
        setSubmitError(data.error || 'Failed to offboard trainer.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error occurred while offboarding trainer.');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 dark:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Trainer Resignation &amp; Batch Handover
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 uppercase">
                  Admin Action
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Officially resign a trainer, reassign active trainees, and archive historical records
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {submitError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{submitError}</span>
            </div>
          )}

          {/* 1. Resigning Trainer Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <UserMinus className="w-3.5 h-3.5 text-rose-600" /> Resigning Trainer *
            </label>
            <CustomSelect
              value={formData.trainerName}
              hasError={!!formErrors.trainerName}
              placeholder="Select Trainer to Resign..."
              searchable
              searchPlaceholder="Search trainer by name or role..."
              onChange={val => {
                const matched = activeTrainers.find(t => t.name === val);
                setFormData(prev => ({
                  ...prev,
                  trainerName: val,
                  trainerEmail: matched?.email || '',
                  replacementTrainer: prev.replacementTrainer === val ? '' : prev.replacementTrainer
                }));
                if (formErrors.trainerName) setFormErrors(prev => ({ ...prev, trainerName: '' }));
              }}
              options={
                activeTrainers.length > 0
                  ? [
                      { value: '', label: '-- Select Trainer to Resign --' },
                      ...activeTrainers.map(t => ({
                        value: t.name,
                        label: `${t.name} (${t.position || 'Trainer'}) - ${t.activeTraineeCount || 0} active trainees`
                      }))
                    ]
                  : [{ value: '', label: isLoadingTrainers ? 'Loading trainers...' : 'No active trainers found' }]
              }
            />
            {formErrors.trainerName && (
              <p className="text-[11px] text-red-500 dark:text-red-400 font-normal mt-1">{formErrors.trainerName}</p>
            )}
          </div>

          {/* Active Workload Alert Card */}
          {selectedTrainerObj && (
            <div className={`p-4 rounded-xl border transition-all ${
              selectedTrainerObj.activeTraineeCount > 0 
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60' 
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
            }`}>
              <div className="flex items-start gap-3">
                {selectedTrainerObj.activeTraineeCount > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    {selectedTrainerObj.activeTraineeCount > 0
                      ? `${selectedTrainerObj.name} has ${selectedTrainerObj.activeTraineeCount} Active Trainee(s)`
                      : `${selectedTrainerObj.name} has no active trainees currently assigned`}
                  </h4>
                  {selectedTrainerObj.activeBatches?.length > 0 ? (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      <p className="font-semibold mb-1">Active Batches to Hand Over:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTrainerObj.activeBatches.map((b: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-100/90 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-md font-mono text-[10px] font-bold">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      All previous batches handled by this trainer are already closed or completed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Batch & Trainee Handover Section */}
          <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#2F6798] dark:text-[#5a9fd4] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Active Trainee &amp; Batch Handover
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.reassignActiveTrainees}
                  onChange={e => setFormData(prev => ({ ...prev, reassignActiveTrainees: e.target.checked }))}
                  className="rounded border-slate-300 text-[#2F6798] focus:ring-[#2F6798]"
                />
                Auto-reassign batches
              </label>
            </div>

            {formData.reassignActiveTrainees && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 dark:text-slate-300 text-[11px] block">
                  Select Replacement Trainer: *
                </label>
                <CustomSelect
                  value={formData.replacementTrainer}
                  hasError={!!formErrors.replacementTrainer}
                  searchable
                  searchPlaceholder="Search replacement trainer..."
                  onChange={val => {
                    setFormData(prev => ({ ...prev, replacementTrainer: val }));
                    if (formErrors.replacementTrainer) setFormErrors(prev => ({ ...prev, replacementTrainer: '' }));
                  }}
                  options={replacementOptions}
                />
                {formErrors.replacementTrainer && (
                  <p className="text-[11px] text-red-500 dark:text-red-400 font-normal mt-1">{formErrors.replacementTrainer}</p>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                  <Info className="w-3 h-3 text-[#2F6798] shrink-0" />
                  All active roster assignments and daily attendance tracking will seamlessly transfer to the chosen trainer.
                </p>
              </div>
            )}
          </div>

          {/* 3. Resignation Reason & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2F6798]" /> Separation / Last Day *
              </label>
              <CustomDatePicker
                value={formData.departureDate}
                hasError={!!formErrors.departureDate}
                onChange={val => {
                  setFormData(prev => ({ ...prev, departureDate: val }));
                  if (formErrors.departureDate) setFormErrors(prev => ({ ...prev, departureDate: '' }));
                }}
              />
              {formErrors.departureDate && (
                <p className="text-[11px] text-red-500 dark:text-red-400 font-normal mt-1">{formErrors.departureDate}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2F6798]" /> Resignation Reason *
              </label>
              <CustomSelect
                value={formData.reasonCategory}
                hasError={!!formErrors.reasonCategory}
                onChange={val => {
                  setFormData(prev => ({ ...prev, reasonCategory: val }));
                  if (formErrors.reasonCategory) setFormErrors(prev => ({ ...prev, reasonCategory: '' }));
                }}
                options={REASON_CATEGORIES}
              />
              {formErrors.reasonCategory && (
                <p className="text-[11px] text-red-500 dark:text-red-400 font-normal mt-1">{formErrors.reasonCategory}</p>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#2F6798]" /> Handover Remarks &amp; Notes *
            </label>
            <textarea
              value={formData.remarks}
              onChange={e => {
                setFormData(prev => ({ ...prev, remarks: e.target.value }));
                if (formErrors.remarks) setFormErrors(prev => ({ ...prev, remarks: '' }));
              }}
              placeholder="e.g., Handed over Batch 14 materials and mock rubrics to TR Niña. Completed exit interview."
              rows={3}
              className={`w-full rounded-xl border p-3 text-xs text-slate-800 dark:text-slate-100 outline-none transition-all ${
                formErrors.remarks
                  ? 'border-red-500 bg-red-50/15 focus:ring-2 focus:ring-red-200 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#2F6798]'
              }`}
            />
            {formErrors.remarks && (
              <p className="text-[11px] text-red-500 dark:text-red-400 font-normal mt-1">{formErrors.remarks}</p>
            )}
          </div>

          {/* 4. Clearance & Security Checklist */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <h4 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Admin Clearance &amp; System Revocation
            </h4>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.revokeAccess}
                  onChange={e => setFormData(prev => ({ ...prev, revokeAccess: e.target.checked }))}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Revoke trainer system privileges and write access in <code className="text-rose-600 font-bold">user_roles</code></span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.clearanceChecked.handoverCompleted}
                  onChange={() => handleClearanceToggle('handoverCompleted')}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Training materials, mock call assessments, and attendance records submitted</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.clearanceChecked.assetsReturned}
                  onChange={() => handleClearanceToggle('assetsReturned')}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Company headsets, trainer laptop/workstation, and ID badge surrendered</span>
              </label>
            </div>
          </div>

          {/* Notice Banner */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
            <strong>Data Integrity Guarantee:</strong> Marking this trainer as Resigned will archive their profile and preserve all past batch performance, throughput rates, and reliability stats intact for historical reporting.
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Resignation...</span>
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  <span>Confirm Resignation &amp; Transfer Batches</span>
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
