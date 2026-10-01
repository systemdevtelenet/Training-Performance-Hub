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
  Users,
  Trash2,
  UserMinus
} from 'lucide-react';

export type DrawerTrainee = {
  isBatch?: boolean;
  members?: any[];
  id?: string;
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
  attendanceRate?: string;
  attRate?: string;
  contextLabel?: string;
  startDate?: string;
  endorsedDate?: string;
  nhoCompleted?: boolean;
};

export function TraineeDetailDrawer({ 
  trainee, 
  onClose,
  onEndorse,
  canEndorse = false,
  onDelete,
  canDelete = false,
  onOffboard,
  canOffboard = false
}: { 
  trainee: DrawerTrainee | null; 
  onClose: () => void;
  onEndorse?: (trainee: DrawerTrainee) => Promise<void>;
  canEndorse?: boolean;
  onDelete?: (trainee: DrawerTrainee) => Promise<void>;
  canDelete?: boolean;
  onOffboard?: (trainee: DrawerTrainee) => void;
  canOffboard?: boolean;
}) {
  const [rendered, setRendered] = useState(Boolean(trainee));
  const [open, setOpen] = useState(Boolean(trainee));
  const [displayedTrainee, setDisplayedTrainee] = useState<DrawerTrainee | null>(trainee);
  const [selectedMember, setSelectedMember] = useState<DrawerTrainee | null>(null);
  const [isEndorsing, setIsEndorsing] = useState(false);

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
      ? 'border border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
      : upperStatus === 'LOSS' || upperStatus === 'ATTRITION' || upperStatus === 'EOC'
      ? 'border border-red-300 text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300'
      : 'border border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300';

    const infoItems: { label: string; value: string; icon: any }[] = [
      { label: 'Full Name', value: t.name, icon: UserRound },
      { label: 'Batch / Wave', value: t.batchName, icon: BriefcaseBusiness },
      { label: 'Account / Client', value: t.accountName, icon: BriefcaseBusiness },
      { label: 'Training Track', value: t.trainingType === 'INHOUSE' ? 'Inhouse Training' : (t.trainingType === 'PST' ? 'PST Training' : t.trainingType || 'Inhouse Training'), icon: GraduationCap },
      { label: 'Assigned Trainer', value: t.assignedTrainer || 'Unassigned', icon: UserCheck },
    ];

    if (t.startDate) {
      infoItems.push({ label: 'Start Date', value: t.startDate, icon: CalendarDays });
    }
    if (t.endorsedDate) {
      infoItems.push({ label: 'Endorsement Date', value: t.endorsedDate, icon: CheckCircle2 });
    }

    const formatDayUnit = (count: number) => `${count} ${count === 1 ? 'Day' : 'Days'}`;

    const performanceItems = [
      { label: 'Attendance Rate', value: attendanceRate, icon: CalendarDays },
      { label: 'Present Days', value: formatDayUnit(t.p || 0), icon: CheckCircle2 },
      { label: 'Absent Days', value: formatDayUnit(t.a || 0), icon: XCircle },
    ];

    const handleEndorseClick = async () => {
      if (!onEndorse || isEndorsing) return;
      setIsEndorsing(true);
      try {
        await onEndorse(t);
        setDisplayedTrainee(prev => prev ? { ...prev, status: 'ENDORSED', isEndorsed: true, endorsedDate: new Date().toISOString().split('T')[0] } : null);
        if (selectedMember) {
          setSelectedMember(prev => prev ? { ...prev, status: 'ENDORSED', isEndorsed: true, endorsedDate: new Date().toISOString().split('T')[0] } : null);
        }
      } finally {
        setIsEndorsing(false);
      }
    };

    return (
      <div className="flex-1 overflow-y-auto font-sans bg-white dark:bg-slate-900">
        {isDrillDown && (
          <div className="px-6 py-2.5 bg-blue-50/60 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50">
            <button 
              onClick={() => setSelectedMember(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Batch List
            </button>
          </div>
        )}

        {/* Profile Banner */}
        <div className="p-6 flex items-center gap-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#2F6798] dark:text-[#5a9fd4] font-bold text-xl shadow-sm shrink-0">
            {getInitials(t.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{t.name}</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.accountName}</p>
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
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
            
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
            <div className="bg-slate-50/80 dark:bg-slate-800/80 px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] uppercase tracking-wider">
              TRAINEE INFORMATION
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {infoItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="w-1/2 flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <Icon className="h-4 w-4 text-[#2F6798] dark:text-[#5a9fd4] shrink-0" />
                      {item.label}
                    </div>
                    <div className="w-1/2 flex items-center text-xs font-bold text-slate-800 dark:text-slate-100">
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: PERFORMANCE METRICS */}
            <div className="bg-slate-50/80 dark:bg-slate-800/80 px-6 py-2.5 border-t border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] uppercase tracking-wider">
              PERFORMANCE METRICS
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {performanceItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="w-1/2 flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <Icon className={`h-4 w-4 shrink-0 ${item.label.includes('Absent') ? 'text-red-500' : 'text-[#2F6798] dark:text-[#5a9fd4]'}`} />
                      {item.label}
                    </div>
                    <div className={`w-1/2 flex items-center text-xs font-bold ${item.label.includes('Absent') && (t.a || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Endorsement Action Banner for Trainers & Admins */}
          {canEndorse && onEndorse && upperStatus !== 'ENDORSED' && (
            <div className="mt-5 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Ready for Endorsement?
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 mt-0.5">
                  Graduate trainee and endorse to Live Operations / Nesting.
                </p>
              </div>
              <button
                onClick={handleEndorseClick}
                disabled={isEndorsing}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isEndorsing ? 'Endorsing...' : 'Endorse Trainee'}
              </button>
            </div>
          )}

          {/* Actions Section */}
          <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            {canOffboard && onOffboard && !t.isLoss && (
              <button
                type="button"
                onClick={() => onOffboard(t)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer border border-amber-200/80 dark:border-amber-800/60"
              >
                <UserMinus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Offboard / Separation Request
              </button>
            )}

            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(t)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer border border-red-200/60 dark:border-red-900/40 ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Record
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render logic for BATCH / STREAM View
  const renderBatchDetails = (batch: DrawerTrainee) => {
    const members = batch.members || [];
    let totalP = 0, totalA = 0;
    members.forEach((m: any) => {
      totalP += (m.p || 0);
      totalA += (m.a || 0);
    });
    const calculatedAtt = (totalP + totalA) > 0 ? `${(((totalP) / (totalP + totalA)) * 100).toFixed(1)}%` : '100.0%';
    const finalAttendanceRate = batch.attendanceRate || batch.attRate || calculatedAtt;

    return (
      <div className="flex-1 overflow-y-auto font-sans bg-white dark:bg-slate-900">
        
        {/* Batch Banner */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{batch.name} Summary</h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Account: {batch.accountName}</p>
          
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="flex flex-col p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Users className="w-4 h-4 text-[#2F6798] dark:text-[#5a9fd4]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Headcount</span>
              </div>
              <span className="text-base font-black text-slate-800 dark:text-slate-100">{batch.headcount || members.length}</span>
            </div>

            <div className="flex flex-col p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-1.5 text-emerald-600/80 dark:text-emerald-400 mb-1">
                <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
              </div>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{finalAttendanceRate}</span>
            </div>

            <div className="flex flex-col p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30">
              <div className="flex items-center gap-1.5 text-red-600/80 dark:text-red-400 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Attrition</span>
              </div>
              <span className="text-base font-black text-red-600 dark:text-red-400">{batch.attritionRate || '0.0%'}</span>
            </div>
          </div>
        </div>

        {/* ORIGINAL TABLE STYLE BATCH METADATA */}
        <div className="p-6">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm mb-6">
            <div className="bg-[#2F6798] px-6 py-3 flex text-xs font-bold text-white tracking-wide uppercase">
              <div className="w-1/2 flex items-center gap-2">ⓘ BATCH PARAMETER</div>
              <div className="w-1/2 flex items-center gap-2"><ClipboardCheck className="h-4 w-4 opacity-80" /> DETAILS</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Account</div>
                <div className="w-1/2 font-bold text-slate-800 dark:text-slate-100">{batch.accountName}</div>
              </div>
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Training Type</div>
                <div className="w-1/2 font-bold text-slate-800 dark:text-slate-100">{batch.trainingType}</div>
              </div>
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Assigned Trainer</div>
                <div className="w-1/2 font-bold text-[#2F6798] dark:text-[#5a9fd4]">
                  {(batch.assignedTrainer && batch.assignedTrainer !== 'Unassigned')
                    ? batch.assignedTrainer
                    : (members.length > 0
                        ? Array.from(new Set(members.map((m: any) => m.assignedTrainer || m.assigned_trainer).filter((t: string) => t && t !== 'Unassigned'))).join(', ')
                        : '') || 'Unassigned'}
                </div>
              </div>
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Attendance Rate</div>
                <div className="w-1/2 font-bold text-emerald-600 dark:text-emerald-400">{finalAttendanceRate}</div>
              </div>
              <div className="flex px-6 py-3.5">
                <div className="w-1/2 font-medium text-slate-600 dark:text-slate-300">Attrition Rate</div>
                <div className="w-1/2 font-bold text-red-600 dark:text-red-400">{batch.attritionRate || '0.0%'}</div>
              </div>
            </div>
          </div>

          {/* TRAINEE LIST SECTION - GROUPED BY TRAINER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <h4 className="text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] uppercase tracking-wider">TRAINEE LIST</h4>
              <span className="text-[11px] font-bold text-slate-400">{members.length} Total</span>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">No trainees listed in this batch</div>
            ) : (() => {
              // Group members by assigned trainer
              const trainerGroups: Record<string, any[]> = {};
              members.forEach((member: any) => {
                const trainerName = (member.assignedTrainer || member.assigned_trainer || 'Unassigned').trim();
                if (!trainerGroups[trainerName]) {
                  trainerGroups[trainerName] = [];
                }
                trainerGroups[trainerName].push(member);
              });

              const sortedTrainers = Object.keys(trainerGroups).sort((a, b) => {
                if (a === 'Unassigned') return 1;
                if (b === 'Unassigned') return -1;
                return a.localeCompare(b);
              });

              return (
                <div className="space-y-5">
                  {sortedTrainers.map((trainerName, groupIdx) => {
                    const groupMembers = trainerGroups[trainerName];

                    return (
                      <div key={groupIdx} className="space-y-2">
                        {/* Trainer Group Subheader - Header Blue Theme & Compact Size */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#2F6798] text-white shadow-2xs">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center font-bold">
                              <UserCheck className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-bold text-white tracking-wide">
                              {trainerName}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                            {groupMembers.length} {groupMembers.length === 1 ? 'Trainee' : 'Trainees'}
                          </span>
                        </div>

                        {/* Trainees under this trainer */}
                        <div className="space-y-1.5 pl-1">
                          {groupMembers.map((member, idx) => {
                            const statusStr = (member.status || (member.isEndorsed ? 'ENDORSED' : member.isLoss ? 'EOC' : 'ACTIVE')).toUpperCase();
                            const badgeClass = statusStr === 'ENDORSED'
                              ? 'border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                              : statusStr === 'EOC' || statusStr === 'LOSS' || statusStr === 'ATTRITION'
                              ? 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                              : 'border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40';

                            return (
                              <div
                                key={idx}
                                className="flex w-full items-center justify-between p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-[#2F6798] dark:hover:border-blue-400 hover:shadow-xs transition-all group"
                              >
                                <button 
                                  type="button"
                                  onClick={() => setSelectedMember({
                                    ...member,
                                    accountName: batch.accountName,
                                    batchName: member.batchName || batch.batchName,
                                    trainingType: batch.trainingType
                                  })}
                                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                                >
                                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-[11px] text-[#2F6798] dark:text-[#5a9fd4] shrink-0">
                                    {getInitials(member.name)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#2F6798] dark:group-hover:text-[#5a9fd4] transition-colors truncate">
                                      {member.name}
                                    </span>
                                    {member.batchName && member.batchName !== batch.name && (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                        {member.batchName}
                                      </span>
                                    )}
                                  </div>
                                </button>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                                    {statusStr}
                                  </span>
                                  {canDelete && onDelete && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete({
                                          ...member,
                                          accountName: batch.accountName,
                                          batchName: member.batchName || batch.batchName,
                                          trainingType: batch.trainingType
                                        });
                                      }}
                                      title={`Delete ${member.name}`}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
        className={`absolute inset-0 w-full h-full bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'} cursor-default`} 
      />
      
      {/* Clean Square Cornered Side Drawer with Blue Header Bar */}
      <aside 
        role="dialog" 
        aria-modal="true" 
        className={`fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[480px] flex-col overflow-hidden bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out rounded-none ${open ? 'translate-x-0' : 'translate-x-full'}`}
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
