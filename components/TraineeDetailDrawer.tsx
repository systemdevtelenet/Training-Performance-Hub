'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  UserRound, 
  BriefcaseBusiness, 
  GraduationCap, 
  UserCheck, 
  CalendarDays, 
  CheckCircle2, 
  ClipboardCheck, 
  XCircle,
  ArrowLeft,
  TrendingDown,
  Users
} from 'lucide-react';

export type DrawerTrainee = {
  isBatch?: boolean;
  members?: any[];
  name: string;
  status?: string;
  p?: number;
  a?: number;
  isEndorsed?: boolean;
  isLoss?: boolean;
  assignedTrainer?: string;
  month?: string;
  quarter?: string;
  accountName: string;
  batchName: string;
  trainingType: string;
  headcount?: number;
  attritionRate?: string;
  contextLabel?: string;
};

export function TraineeDetailDrawer({ trainee, onClose }: { trainee: DrawerTrainee | null; onClose: () => void }) {
  const [rendered, setRendered] = useState(Boolean(trainee));
  const [open, setOpen] = useState(Boolean(trainee));
  const [displayedTrainee, setDisplayedTrainee] = useState<DrawerTrainee | null>(trainee);
  const [selectedMember, setSelectedMember] = useState<DrawerTrainee | null>(null);

  useEffect(() => {
    if (trainee) {
      setDisplayedTrainee(trainee);
      setSelectedMember(null);
      setRendered(true);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }

    setOpen(false);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setSelectedMember(null);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [trainee]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && rendered) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, rendered]);

  if (!rendered || !displayedTrainee || typeof window === 'undefined') return null;

  const getInitials = (fullName: string) => {
    if (!fullName) return 'TR';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // Render logic for INDIVIDUAL Trainee Details (Following user's exact original design)
  const renderTraineeDetails = (t: DrawerTrainee, isDrillDown: boolean) => {
    const totalAttendance = (t.p || 0) + (t.a || 0);
    const attendanceRate = totalAttendance ? `${(((t.p || 0) / totalAttendance) * 100).toFixed(1)}%` : 'N/A';
    const status = t.status || (t.isEndorsed ? 'ENDORSED' : t.isLoss ? 'LOSS' : 'ACTIVE');
    const upperStatus = status.toUpperCase();

    const statusBadgeClass = upperStatus === 'ENDORSED'
      ? 'border border-emerald-300 text-emerald-700 bg-emerald-50'
      : upperStatus === 'LOSS' || upperStatus === 'ATTRITION' || upperStatus === 'EOC'
      ? 'border border-red-300 text-red-700 bg-red-50'
      : 'border border-blue-300 text-blue-700 bg-blue-50';

    const infoItems = [
      { label: 'Full Name', value: t.name, icon: UserRound },
      { label: 'Batch', value: t.batchName, icon: BriefcaseBusiness },
      { label: 'Account / Client', value: t.accountName, icon: BriefcaseBusiness },
      { label: 'Training Type', value: t.trainingType, icon: GraduationCap },
      { label: 'Assigned Trainer', value: t.assignedTrainer || 'Unassigned', icon: UserCheck },
    ];

    const formatDayUnit = (count: number) => `${count} ${count === 1 ? 'Day' : 'Days'}`;

    const performanceItems = [
      { label: 'Attendance Rate', value: attendanceRate, icon: CalendarDays },
      { label: 'Present Days', value: formatDayUnit(t.p || 0), icon: CheckCircle2 },
      { label: 'Absent Days', value: formatDayUnit(t.a || 0), icon: XCircle },
    ];

    return (
      <div className="flex-1 overflow-y-auto font-sans">
        {isDrillDown && (
          <div className="px-6 py-2.5 bg-blue-50/60 border-b border-blue-100">
            <button 
              onClick={() => setSelectedMember(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6798] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Batch List
            </button>
          </div>
        )}

        {/* Profile Banner */}
        <div className="p-6 flex items-center gap-5 border-b border-slate-100 bg-white">
          <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-[#2F6798] font-bold text-xl shadow-sm shrink-0">
            {getInitials(t.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-800 truncate">{t.name}</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{t.accountName}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#2F6798] text-white">
                {t.batchName}
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                {upperStatus}
              </span>
            </div>
          </div>
        </div>

        {/* TABLE STYLE DETAILS CONTAINER - EXACT ORIGINAL DESIGN */}
        <div className="p-6">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            
            {/* BLUE HEADER BAR */}
            <div className="bg-[#2F6798] px-6 py-3 flex text-xs font-bold text-white tracking-wide uppercase">
              <div className="w-1/2 flex items-center gap-2">
                <span className="opacity-80">ⓘ</span> FIELD
              </div>
              <div className="w-1/2 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 opacity-80" /> DETAILS
              </div>
            </div>

            {/* SECTION 1: TRAINEE INFORMATION */}
            <div className="bg-slate-50/80 px-6 py-2.5 border-b border-slate-200 text-xs font-bold text-[#2F6798] uppercase tracking-wider">
              TRAINEE INFORMATION
            </div>

            <div className="divide-y divide-slate-100">
              {infoItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="w-1/2 flex items-center gap-3 text-xs font-medium text-slate-600">
                      <Icon className="h-4 w-4 text-[#2F6798] shrink-0" />
                      {item.label}
                    </div>
                    <div className="w-1/2 flex items-center text-xs font-bold text-slate-800">
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: PERFORMANCE METRICS */}
            <div className="bg-slate-50/80 px-6 py-2.5 border-t border-b border-slate-200 text-xs font-bold text-[#2F6798] uppercase tracking-wider">
              PERFORMANCE METRICS
            </div>

            <div className="divide-y divide-slate-100">
              {performanceItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="w-1/2 flex items-center gap-3 text-xs font-medium text-slate-600">
                      <Icon className={`h-4 w-4 shrink-0 ${item.label.includes('Absent') ? 'text-red-500' : 'text-[#2F6798]'}`} />
                      {item.label}
                    </div>
                    <div className={`w-1/2 flex items-center text-xs font-bold ${item.label.includes('Absent') && (t.a || 0) > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    );
  };

  // Render logic for BATCH / STREAM View
  const renderBatchDetails = (batch: DrawerTrainee) => {
    const members = batch.members || [];

    return (
      <div className="flex-1 overflow-y-auto font-sans">
        
        {/* Batch Banner */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <h3 className="text-xl font-bold text-slate-800">{batch.name} Summary</h3>
          <p className="text-xs font-medium text-slate-500 mt-1">Account: {batch.accountName}</p>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <Users className="w-5 h-5 text-[#2F6798]" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Headcount</span>
                <span className="text-lg font-black text-slate-800">{batch.headcount || members.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-red-200 bg-red-50/50">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <div>
                <span className="text-[10px] font-bold text-red-600/70 uppercase tracking-wider block">Attrition</span>
                <span className="text-lg font-black text-red-600">{batch.attritionRate || '0.0%'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ORIGINAL TABLE STYLE BATCH METADATA */}
        <div className="p-6">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm mb-6">
            <div className="bg-[#2F6798] px-6 py-3 flex text-xs font-bold text-white tracking-wide uppercase">
              <div className="w-1/2 flex items-center gap-2">ⓘ BATCH PARAMETER</div>
              <div className="w-1/2 flex items-center gap-2"><ClipboardCheck className="h-4 w-4 opacity-80" /> DETAILS</div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600">Account</div>
                <div className="w-1/2 font-bold text-slate-800">{batch.accountName}</div>
              </div>
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600">Training Type</div>
                <div className="w-1/2 font-bold text-slate-800">{batch.trainingType}</div>
              </div>
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600">Assigned Trainer</div>
                <div className="w-1/2 font-bold text-[#2F6798]">{batch.assignedTrainer || 'Unassigned'}</div>
              </div>
            </div>
          </div>

          {/* TRAINEE LIST SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-[#2F6798] uppercase tracking-wider">TRAINEE LIST</h4>
              <span className="text-[11px] font-bold text-slate-400">{members.length} Total</span>
            </div>

            <div className="space-y-2">
              {members.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">No trainees listed in this batch</div>
              ) : (
                members.map((member, idx) => {
                  const statusStr = (member.status || (member.isEndorsed ? 'ENDORSED' : member.isLoss ? 'EOC' : 'ACTIVE')).toUpperCase();
                  const badgeClass = statusStr === 'ENDORSED'
                    ? 'border border-emerald-300 text-emerald-700 bg-emerald-50'
                    : statusStr === 'EOC' || statusStr === 'LOSS' || statusStr === 'ATTRITION'
                    ? 'border border-slate-300 text-slate-600 bg-slate-100'
                    : 'border border-blue-300 text-blue-700 bg-blue-50';

                  return (
                    <button 
                      key={idx} 
                      type="button"
                      onClick={() => setSelectedMember({
                        ...member,
                        accountName: batch.accountName,
                        batchName: batch.batchName,
                        trainingType: batch.trainingType
                      })}
                      className="flex w-full items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:border-[#2F6798] hover:shadow-sm transition-all group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#2F6798] shrink-0">
                          {getInitials(member.name)}
                        </div>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-[#2F6798] transition-colors">{member.name}</span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                        {statusStr}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  const isBatch = displayedTrainee.isBatch;
  const titleHeader = selectedMember 
    ? 'TRAINEE DETAILS' 
    : isBatch 
    ? 'BATCH DETAILS' 
    : 'TRAINEE DETAILS';

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <button 
        aria-label="Close modal" 
        onClick={onClose} 
        className={`absolute inset-0 w-full h-full bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'} cursor-default`} 
      />
      
      {/* Clean Square Cornered Side Drawer with Blue Header Bar */}
      <aside 
        role="dialog" 
        aria-modal="true" 
        className={`fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[480px] flex-col overflow-hidden bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 ease-out rounded-none ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* BLUE HEADER BAR - NO CIRCLE CORNERS */}
        <header className="bg-[#2F6798] px-6 py-4 flex items-center justify-between shrink-0 font-sans shadow-sm">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-2">
            {titleHeader}
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
        {selectedMember 
          ? renderTraineeDetails(selectedMember, true) 
          : displayedTrainee.isBatch 
          ? renderBatchDetails(displayedTrainee) 
          : renderTraineeDetails(displayedTrainee, false)
        }
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
