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
  HelpCircle,
  Sparkles,
  Info,
  Check,
  Send
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { useRole } from '@/components/providers/RoleProvider';

export interface OffboardData {
  traineeName: string;
  trainingType: 'INHOUSE' | 'PST';
  batchName: string;
  accountName: string;
  assignedTrainer: string;
  status: 'RESIGNED' | 'TERMINATED' | 'FAILED' | 'AWOL' | 'ACCOUNT REMOVED';
  departureDate: string;
  reasonCategory: string;
  remarks: string;
  clearanceChecked: {
    assetsReturned: boolean;
    accessRevoked: boolean;
    evaluationsLogged: boolean;
  };
}

interface OffboardTraineeDrawerProps {
  isOpen: boolean;
  trainee: {
    id?: string;
    name: string;
    trainingType?: 'INHOUSE' | 'PST';
    batchName?: string;
    accountName?: string;
    assignedTrainer?: string;
    status?: string;
  } | null;
  availableTrainees?: Array<{
    id?: string;
    name: string;
    trainingType?: 'INHOUSE' | 'PST';
    batchName?: string;
    accountName?: string;
    assignedTrainer?: string;
    status?: string;
    isLoss?: boolean;
  }>;
  onClose: () => void;
  onSubmit: (data: OffboardData) => Promise<void>;
  isSubmitting: boolean;
}

const DEPARTURE_TYPES = [
  { value: 'RESIGNED', label: 'Voluntary Resignation (Resigned)', color: 'bg-amber-500' },
  { value: 'TERMINATED', label: 'Involuntary Termination (Terminated)', color: 'bg-rose-500' },
  { value: 'FAILED', label: 'Failed Quality Gate / Nesting (Failed)', color: 'bg-red-600' },
  { value: 'AWOL', label: 'Absence Without Official Leave (AWOL)', color: 'bg-orange-600' },
  { value: 'ACCOUNT REMOVED', label: 'Account Removed / Rolled Off', color: 'bg-slate-600' }
];

const REASON_CATEGORIES = [
  { value: 'Career Opportunity & Compensation', label: 'Better Career Opportunity / Compensation' },
  { value: 'Personal / Family Circumstances', label: 'Personal / Family Circumstances' },
  { value: 'Health / Medical Reasons', label: 'Health / Medical Reasons' },
  { value: 'Attendance & Punctuality Issues', label: 'Attendance & Punctuality Issues' },
  { value: 'Quality Gate & Mock Performance', label: 'Quality Gate & Assessment Performance' },
  { value: 'Relocation / Commute', label: 'Relocation / Commute Difficulties' },
  { value: 'Company Policy & Code of Conduct', label: 'Company Policy / Code of Conduct' },
  { value: 'Other / Non-disclosed', label: 'Other / Non-disclosed Reason' }
];

export function OffboardTraineeDrawer({
  isOpen,
  trainee,
  availableTrainees = [],
  onClose,
  onSubmit,
  isSubmitting
}: OffboardTraineeDrawerProps) {
  const { role, actualRole, userName } = useRole();
  const [rendered, setRendered] = useState(isOpen);
  const [open, setOpen] = useState(isOpen);

  // Selected trainee state if initiating from top-level without pre-selected trainee
  const [selectedTraineeName, setSelectedTraineeName] = useState<string>(trainee?.name || '');

  const activeTrainee = useMemo(() => {
    if (trainee?.name) return trainee;
    return availableTrainees.find(t => t.name === selectedTraineeName) || null;
  }, [trainee, availableTrainees, selectedTraineeName]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [formData, setFormData] = useState<OffboardData>({
    traineeName: trainee?.name || '',
    trainingType: trainee?.trainingType || 'INHOUSE',
    batchName: trainee?.batchName || '',
    accountName: trainee?.accountName || 'General',
    assignedTrainer: trainee?.assignedTrainer || 'Unassigned',
    status: 'RESIGNED',
    departureDate: todayStr,
    reasonCategory: 'Career Opportunity & Compensation',
    remarks: '',
    clearanceChecked: {
      assetsReturned: true,
      accessRevoked: true,
      evaluationsLogged: true
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() => setOpen(true));
      const target = trainee || (availableTrainees.length > 0 ? availableTrainees[0] : null);
      if (target) {
        setSelectedTraineeName(target.name);
        setFormData({
          traineeName: target.name,
          trainingType: target.trainingType || 'INHOUSE',
          batchName: target.batchName || '',
          accountName: target.accountName || 'General',
          assignedTrainer: target.assignedTrainer || 'Unassigned',
          status: 'RESIGNED',
          departureDate: todayStr,
          reasonCategory: 'Career Opportunity & Compensation',
          remarks: '',
          clearanceChecked: {
            assetsReturned: true,
            accessRevoked: true,
            evaluationsLogged: true
          }
        });
      }
      setErrors({});
    } else {
      setOpen(false);
      const timer = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, trainee, availableTrainees, todayStr]);

  const handleTraineeSelect = (name: string) => {
    setSelectedTraineeName(name);
    const found = availableTrainees.find(t => t.name === name);
    if (found) {
      setFormData(prev => ({
        ...prev,
        traineeName: found.name,
        trainingType: found.trainingType || 'INHOUSE',
        batchName: found.batchName || '',
        accountName: found.accountName || 'General',
        assignedTrainer: found.assignedTrainer || 'Unassigned'
      }));
    }
    if (errors.traineeName) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.traineeName;
        return next;
      });
    }
  };

  const handleClearanceToggle = (key: keyof OffboardData['clearanceChecked']) => {
    setFormData(prev => ({
      ...prev,
      clearanceChecked: {
        ...prev.clearanceChecked,
        [key]: !prev.clearanceChecked[key]
      }
    }));
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.traineeName || !formData.traineeName.trim()) {
      errs.traineeName = 'Please select a trainee to offboard.';
    }
    if (!formData.departureDate) {
      errs.departureDate = 'Departure date is required.';
    }
    if (!formData.reasonCategory) {
      errs.reasonCategory = 'Please specify a reason category.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const currentRole = role || actualRole;
    const isAdminRole = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(currentRole);
    const isTrainer = currentRole === 'TRAINER' || !isAdminRole;
    await onSubmit({
      ...formData,
      isTrainerRequest: isTrainer,
      author: isTrainer ? (userName || 'Trainer') : (userName || 'Nissi')
    } as any);
  };

  if (!rendered) return null;

  const currentRole = role || actualRole;
  const isAdminRole = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(currentRole);
  const isTrainer = currentRole === 'TRAINER' || !isAdminRole;

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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Offboard Trainee
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isTrainer
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                }`}>
                  {isTrainer ? 'Approval Request' : 'Attrition & Separation'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isTrainer
                  ? 'Request administrative approval to separate an assigned trainee.'
                  : 'Record employee separation, exit reasons, and update hub analytics.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 1. Trainee Selection / Identification Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#2F6798]" /> Trainee To Offboard
              </label>
              {activeTrainee && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  activeTrainee.trainingType === 'PST'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                }`}>
                  {activeTrainee.trainingType || 'INHOUSE'}
                </span>
              )}
            </div>

            {trainee ? (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-xl bg-[#2F6798] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {trainee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {trainee.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    {trainee.batchName || 'General'} • {trainee.accountName || 'General'} • Trainer: {trainee.assignedTrainer || 'Unassigned'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <CustomSelect
                  value={selectedTraineeName}
                  onChange={handleTraineeSelect}
                  options={availableTrainees.filter(t => !t.isLoss).map(t => ({
                    value: t.name,
                    label: `${t.name} (${t.batchName || 'General'} - ${t.accountName || 'General'})`
                  }))}
                />
                {errors.traineeName && (
                  <p className="text-[11px] text-rose-500 font-semibold">{errors.traineeName}</p>
                )}
              </div>
            )}
          </div>

          {/* 2. Departure Type & Status */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Separation / Attrition Type
            </label>
            <CustomSelect
              value={formData.status}
              onChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
              options={DEPARTURE_TYPES.map(d => ({
                value: d.value,
                label: d.label
              }))}
            />
          </div>

          {/* 3. Effective Departure Date */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2F6798]" /> Effective Date of Separation
            </label>
            <CustomDatePicker
              value={formData.departureDate}
              onChange={val => setFormData(prev => ({ ...prev, departureDate: val }))}
              hasError={Boolean(errors.departureDate)}
            />
            {errors.departureDate && (
              <p className="text-[11px] text-rose-500 font-semibold">{errors.departureDate}</p>
            )}
          </div>

          {/* 4. Primary Reason Category */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#C8A54B]" /> Reason Category (For Attrition Analytics)
            </label>
            <CustomSelect
              value={formData.reasonCategory}
              onChange={(val: any) => setFormData(prev => ({ ...prev, reasonCategory: val }))}
              options={REASON_CATEGORIES}
            />
          </div>

          {/* 5. Detailed Notes / Exit Remarks */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#2F6798]" /> Exit Remarks &amp; Handover Notes
            </label>
            <textarea
              rows={3}
              value={formData.remarks}
              onChange={e => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Add details regarding the departure, final assessment feedback, or reasons discussed during the exit discussion..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#2F6798] shadow-2xs resize-none"
            />
          </div>

          {/* 6. Separation & Clearance Checklist */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <h4 className="text-[10.5px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Clearance &amp; System Revocation Checklist
            </h4>
            
            <div className="space-y-2 text-xs">
              <label
                onClick={() => handleClearanceToggle('assetsReturned')}
                className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none hover:text-slate-900 dark:hover:text-white"
              >
                <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                  formData.clearanceChecked.assetsReturned
                    ? 'bg-[#2F6798] border-[#2F6798] text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}>
                  {formData.clearanceChecked.assetsReturned && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>Training identification, badge, and physical hardware returned</span>
              </label>

              <label
                onClick={() => handleClearanceToggle('accessRevoked')}
                className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none hover:text-slate-900 dark:hover:text-white"
              >
                <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                  formData.clearanceChecked.accessRevoked
                    ? 'bg-[#2F6798] border-[#2F6798] text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}>
                  {formData.clearanceChecked.accessRevoked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>Client platform credentials &amp; internal tool access revoked</span>
              </label>

              <label
                onClick={() => handleClearanceToggle('evaluationsLogged')}
                className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none hover:text-slate-900 dark:hover:text-white"
              >
                <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                  formData.clearanceChecked.evaluationsLogged
                    ? 'bg-[#2F6798] border-[#2F6798] text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}>
                  {formData.clearanceChecked.evaluationsLogged && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>Final attendance scorecard &amp; Traffic Light status updated</span>
              </label>
            </div>
          </div>

          {/* Action Notice */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-[11px] ${
            isTrainer
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300'
          }`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isTrainer ? 'text-amber-600' : 'text-rose-600'}`} />
            <span>
              {isTrainer ? (
                <>
                  <strong>Approval Request Notice:</strong> Submitting this request will immediately notify <strong>Administration (Nissi)</strong> for final separation review and clearance before the trainee is offboarded.
                </>
              ) : (
                <>
                  Offboarding will mark this trainee as separated, update their Traffic Lights status to <strong>{formData.status}</strong>, and archive them into the <strong>Offboarded Staff</strong> roster.
                </>
              )}
            </span>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2 pb-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                isTrainer
                  ? 'bg-[#2F6798] hover:bg-[#24527a]'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isTrainer ? 'Submitting Approval Request...' : 'Processing Offboarding...'}
                </>
              ) : (
                <>
                  {isTrainer ? <Send className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                  {isTrainer ? 'Submit Request for Admin Approval' : 'Confirm & Finalize Offboarding'}
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
