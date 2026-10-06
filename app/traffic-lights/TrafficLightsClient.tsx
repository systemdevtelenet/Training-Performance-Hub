'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  Search,
  RefreshCw,
  ShieldCheck,
  Activity,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Clock,
  ArrowUpDown,
  MessageSquare,
  MessageSquarePlus,
  Trash2,
  Tag,
  Info,
  Circle,
  UserMinus,
  UserX,
  Award,
  BookOpen,
  AlertOctagon,
  HeartPulse,
  LogOut,
  Edit2,
  Plus,
  Filter,
  Sparkles,
  Maximize2,
  ExternalLink,
  Table as TableIcon,
  CalendarDays,
  LayoutGrid
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import PageLoading from '@/components/PageLoading';
import {
  getTrafficLightData,
  updateTrafficLightCell,
  getTrafficLightRemarks,
  addTrafficLightRemark,
  updateTrafficLightRemark,
  deleteTrafficLightRemarkItem,
  getTrainerTraineeNames,
  type TrafficLightRemarkItem
} from '@/lib/actions/traffic-lights';
import { isTrainerMatch } from '@/lib/analytics-utils';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export const STATUS_OPTIONS = [
  { value: '', label: 'None', icon: Circle, color: 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700', iconColor: 'text-slate-400', badgeStyle: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold' },
  { value: 'Okay', label: 'Okay', icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-bold', iconColor: 'text-white', badgeStyle: 'bg-emerald-600 text-white font-bold shadow-xs hover:bg-emerald-700 border border-emerald-700' },
  { value: 'Shaky', label: 'Shaky', icon: AlertTriangle, color: 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 font-bold', iconColor: 'text-white', badgeStyle: 'bg-amber-500 text-white font-bold shadow-xs hover:bg-amber-600 border border-amber-600' },
  { value: 'Terminated', label: 'Terminated', icon: XCircle, color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold', iconColor: 'text-white', badgeStyle: 'bg-rose-600 text-white font-bold shadow-xs hover:bg-rose-700 border border-rose-700' },
  { value: 'Resigned', label: 'Resigned', icon: UserMinus, color: 'text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/60 font-bold', iconColor: 'text-white', badgeStyle: 'bg-red-700 text-white font-bold shadow-xs hover:bg-red-800 border border-red-800' },
  { value: 'Account Removed', label: 'Account Removed', icon: UserX, color: 'text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/60 font-bold', iconColor: 'text-white', badgeStyle: 'bg-orange-600 text-white font-bold shadow-xs hover:bg-orange-700 border border-orange-700' },
];

export const QUICK_REASON_TAGS = [
  { label: 'Resignation', text: 'Resignation: Submitted formal resignation notice.', icon: LogOut },
  { label: 'Attendance', text: 'Attendance Issue: Multiple unexcused absences or NCNS recorded.', icon: UserMinus },
  { label: 'Coaching', text: 'Coaching Note: 1-on-1 performance review / action plan initiated.', icon: BookOpen },
  { label: 'Medical / LOA', text: 'Medical / LOA: Approved leave of absence with medical documentation.', icon: HeartPulse },
  { label: 'Performance', text: 'Performance Flag: Low score in weekly assessment / remediation needed.', icon: AlertOctagon },
  { label: 'Commendation', text: 'Commendation: Exceeded performance metrics and milestones.', icon: Award },
];

export const getStatusConfig = (val: string) => {
  if (!val) return STATUS_OPTIONS[0];
  const v = val.toUpperCase().trim();
  if (v === 'OKAY' || v === 'GREEN') return STATUS_OPTIONS[1];
  if (v === 'SHAKY' || v === 'AMBER' || v === 'YELLOW') return STATUS_OPTIONS[2];
  if (v === 'TERMINATED' || v === 'RED') return STATUS_OPTIONS[3];
  if (v === 'RESIGNED') return STATUS_OPTIONS[4];
  if (v === 'ACCOUNT REMOVED') return STATUS_OPTIONS[5];
  return {
    value: val,
    label: val,
    icon: Circle,
    color: 'text-slate-700 dark:text-slate-300',
    iconColor: 'text-slate-500',
    badgeStyle: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold'
  };
};

// Custom Popover Dropdown for Traffic Light Status Cells
function StatusSelect({
  value,
  onChange,
  disabled,
  isPending,
  remark,
  remarksList,
  onOpenRemarks
}: {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  isPending?: boolean;
  remark?: string;
  remarksList?: TrafficLightRemarkItem[];
  onOpenRemarks?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  
  const ref = useRef<HTMLDivElement>(null);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const noteBtnRef = useRef<HTMLButtonElement>(null);

  const updateDropdownPos = () => {
    if (!statusBtnRef.current) return;
    const rect = statusBtnRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const dropdownWidth = 210;
    
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = window.innerWidth - dropdownWidth - 16;
    }
    if (left < 16) left = 16;

    // Always position directly below the trigger button
    setDropdownPos({
      top: rect.bottom + 6,
      left,
    });

    // If bottom of dropdown extends past viewport bottom, gently scroll down so it's fully visible
    const overflowBottom = (rect.bottom + 6 + dropdownHeight) - window.innerHeight;
    if (overflowBottom > 0) {
      window.scrollBy({ top: overflowBottom + 32, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current && 
        !ref.current.contains(target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updateDropdownPos);
      window.addEventListener('scroll', updateDropdownPos, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateDropdownPos);
      window.removeEventListener('scroll', updateDropdownPos, true);
    };
  }, [isOpen]);

  const noteCount = remarksList?.length || (remark ? 1 : 0);
  const latestRemark = remarksList && remarksList.length > 0 
    ? remarksList[remarksList.length - 1].remarks 
    : (remark || '');

  const handleMouseEnter = () => {
    if (noteCount === 0 || !noteBtnRef.current) return;
    const rect = noteBtnRef.current.getBoundingClientRect();
    const tooltipWidth = 256;
    let left = rect.right - tooltipWidth;
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    if (rect.top < 120) {
      // Near top of screen: render below
      setTooltipPos({
        top: rect.bottom + 8,
        left
      });
    } else {
      // Render above
      setTooltipPos({
        bottom: window.innerHeight - rect.top + 8,
        left
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const currentConfig = getStatusConfig(value);
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="relative w-full flex items-center gap-1 group/cell" ref={ref}>
      <button
        ref={statusBtnRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) {
            updateDropdownPos();
          }
          setIsOpen(!isOpen);
        }}
        className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 pl-2.5 pr-6 rounded-xl text-left relative transition-all outline-none flex items-center gap-1.5 ${currentConfig.badgeStyle} ${isPending ? 'ring-2 ring-[#2F6798]' : ''} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'
        }`}
      >
        <CurrentIcon className={cn("w-3 h-3 shrink-0", currentConfig.iconColor)} />
        <span className="truncate block pr-1">{currentConfig.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Remarks Note Trigger Button with Multi-Remark Badge */}
      {onOpenRemarks && (
        <div className="relative">
          <button
            ref={noteBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
              onOpenRemarks();
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 relative",
              noteCount > 0
                ? "bg-[#C8A54B]/20 text-[#8e6e22] dark:bg-[#C8A54B]/30 dark:text-[#f3d994] border border-[#C8A54B]/50 shadow-2xs hover:bg-[#C8A54B]/35"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover/cell:opacity-100"
            )}
          >
            {noteCount > 0 ? (
              <div className="relative flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 fill-[#C8A54B]/30 text-[#8e6e22] dark:text-[#f3d994]" />
                {noteCount > 1 && (
                  <span className="absolute -top-2 -right-2.5 px-1 min-w-3.5 h-3.5 bg-[#C8A54B] text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-xs leading-none ring-1 ring-white dark:ring-slate-900">
                    {noteCount}
                  </span>
                )}
              </div>
            ) : (
              <MessageSquarePlus className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Solid Light-Gold Hover Tooltip rendered in Portal */}
          {noteCount > 0 && showTooltip && tooltipPos && typeof document !== 'undefined' && createPortal(
            <div
              style={{
                position: 'fixed',
                top: tooltipPos.top,
                bottom: tooltipPos.bottom,
                left: tooltipPos.left,
              }}
              className="z-[9999] w-72 p-3.5 bg-[#FEF9E7] dark:bg-[#241C0E] text-amber-950 dark:text-amber-100 text-[11px] rounded-2xl shadow-2xl shadow-black/25 border border-[#C8A54B] dark:border-[#C8A54B] pointer-events-none animate-in fade-in zoom-in-95 duration-100 space-y-2"
            >
              <div className="flex items-center justify-between pb-1 border-b border-[#C8A54B]/30">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8e6e22] dark:text-[#f3d994] uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-[#8e6e22] dark:text-[#f3d994]" />
                  <span>{noteCount > 1 ? `Remarks (${noteCount} Notes)` : 'Remark / Note'}</span>
                </div>
                {noteCount > 1 && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#C8A54B] text-white shadow-2xs">
                    {noteCount} Total
                  </span>
                )}
              </div>

              {/* Latest Note preview */}
              <div className="space-y-1">
                {noteCount > 1 && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#8e6e22] dark:text-[#f3d994] block">
                    Latest Note (#{noteCount}):
                  </span>
                )}
                <p className="line-clamp-3 text-amber-950 dark:text-amber-100 leading-snug font-medium bg-amber-500/10 dark:bg-amber-500/20 p-2 rounded-xl border border-[#C8A54B]/30">
                  {latestRemark}
                </p>
              </div>

              {/* If there are more notes, show previous snippets */}
              {noteCount > 1 && remarksList && remarksList.length > 1 && (
                <div className="space-y-1 pt-0.5">
                  <span className="text-[9px] text-[#8e6e22]/90 dark:text-[#f3d994]/90 font-bold block">
                    Recent Timeline:
                  </span>
                  <div className="space-y-0.5">
                    {remarksList.slice(-3, -1).reverse().map((prevNote, idx) => (
                      <div key={prevNote.metric_id || idx} className="text-[10px] text-amber-900/80 dark:text-amber-200/80 truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8A54B] shrink-0" />
                        <span className="truncate">{prevNote.remarks}</span>
                      </div>
                    ))}
                  </div>
                  {noteCount > 3 && (
                    <span className="text-[9px] text-[#8e6e22]/80 dark:text-[#f3d994]/80 italic block">
                      +{noteCount - 3} older note{noteCount - 3 > 1 ? 's' : ''} in timeline
                    </span>
                  )}
                </div>
              )}

              <div className="pt-1.5 border-t border-[#C8A54B]/30 flex items-center justify-between text-[9px] text-[#8e6e22] dark:text-[#f3d994] font-semibold">
                <span>Click icon to open full history</span>
                <span className="underline">View all {noteCount} &rarr;</span>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* Floating Status Dropdown Menu rendered in Portal to prevent clipping */}
      {isOpen && dropdownPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            bottom: dropdownPos.bottom,
            left: dropdownPos.left,
          }}
          className="z-[9999] w-52 max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-2xl border border-slate-200/80 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 custom-scrollbar"
        >
          <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">Set Status</div>
          {STATUS_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const isSelected = (value || '').toUpperCase() === opt.value.toUpperCase();
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all text-left cursor-pointer ${
                  opt.color
                } ${isSelected ? 'bg-slate-100 dark:bg-slate-700/80 font-bold' : ''}`}
              >
                <OptIcon className={cn("w-3 h-3 shrink-0", opt.iconColor)} />
                <span>{opt.label}</span>
              </button>
            );
          })}

          {onOpenRemarks && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-700/80" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenRemarks();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold rounded-xl text-[#2F6798] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all text-left cursor-pointer"
              >
                {noteCount > 0 ? <MessageSquare className="w-3 h-3" /> : <MessageSquarePlus className="w-3 h-3" />}
                <span>{noteCount > 0 ? `View Remarks (${noteCount})` : 'Add Remarks'}</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function matchesTrafficLightAccount(accId: string, traineeAcc: string): boolean {
  if (!accId) return false;
  const cleanId = accId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTrainee = (traineeAcc || 'general').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (cleanId === cleanTrainee) return true;
  if (cleanTrainee.includes(cleanId) || cleanId.includes(cleanTrainee)) return true;
  
  // Specific alias mappings:
  if (cleanId === 'general' && (cleanTrainee.includes('general') || cleanTrainee === '' || cleanTrainee.includes('bilingual'))) return true;
  if ((cleanId === 'dft' || cleanId === 'deferit') && (cleanTrainee.includes('deferit') || cleanTrainee.includes('dft'))) return true;
  if (cleanId === 'flexar' && cleanTrainee.includes('flexar')) return true;
  if (cleanId === 'xpn' && cleanTrainee.includes('xpn')) return true;
  if (cleanId === 'fleet' && cleanTrainee.includes('fleet')) return true;
  if ((cleanId === 'mmtranspo' || cleanId === 'mm') && (cleanTrainee.includes('mmtranspo') || cleanTrainee === 'mm')) return true;
  if ((cleanId === 'hh' || cleanId === 'hammerhead') && (cleanTrainee.includes('hh') || cleanTrainee.includes('hammerhead'))) return true;
  if (cleanId === 'js' && cleanTrainee.includes('js')) return true;
  if (cleanId === 'ono' && cleanTrainee.includes('ono')) return true;
  if (cleanId === 'awd' && cleanTrainee.includes('awd')) return true;
  if (cleanId === 'rm' && cleanTrainee.includes('rm')) return true;
  if ((cleanId === 'otheracc' || cleanId === 'other') && (cleanTrainee.includes('general') || ['spa', 'cova', 'soas', 'corpqa', 'cts', 'bilingualcsr', 'bilingual'].some(s => cleanTrainee.includes(s)))) return true;

  return false;
}

export default function TrafficLightsClient({ initialAccounts }: { initialAccounts?: { id: string; name: string }[] }) {
  const { actualRole, role: simulatedRole, email, userName, userMeta } = useRole();
  const currentRole = simulatedRole || actualRole;
  const isPrivilegedAdmin = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(currentRole as any) ||
    ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(simulatedRole as any) ||
    ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(actualRole as any);
  const isTrainer = currentRole === 'TRAINER' || (!isPrivilegedAdmin && currentRole !== 'TRAINEE' && currentRole !== 'GUEST');
  const isTrainee = currentRole === 'TRAINEE';

  // Helper to test if a row's name belongs to the currently logged in trainer
  const checkIsOwnTrainerRow = useCallback((staffName: string) => {
    if (!staffName) return false;
    const cleanEmail = (email || '').toLowerCase().trim();
    const qEmail = (email || '').toLowerCase().split('@')[0].trim();
    const lowerName = staffName.toLowerCase().trim();
    return Boolean(
      (userName && isTrainerMatch(staffName, userName || undefined)) ||
      (userName && isTrainerMatch(userName || undefined, staffName)) ||
      (cleanEmail && lowerName === cleanEmail) ||
      (cleanEmail && qEmail.length >= 3 && lowerName === qEmail)
    );
  }, [userName, email]);

  const accounts = (initialAccounts && initialAccounts.length > 0) ? initialAccounts : [
    { id: 'trainers', name: 'Trainers' },
    { id: 'general', name: 'General' },
    { id: 'rm', name: 'RM' },
    { id: 'xpn', name: 'XPN' },
    { id: 'fleet', name: 'Fleet' },
    { id: 'leaders', name: 'Leaders' },
    { id: 'dft', name: 'DFT' },
    { id: 'js', name: 'JS' },
    { id: 'ono', name: 'ONO' },
    { id: 'awd', name: 'AWD' },
    { id: 'flexar', name: 'FLEXAR' },
    { id: 'hh', name: 'HH' },
    { id: 'mm_transpo', name: 'MM Transpo' },
    { id: 'other_acc', name: 'Other Acc' },
  ];

  const [trainerTraineeNames, setTrainerTraineeNames] = useState<string[]>([]);
  const [trainerAccounts, setTrainerAccounts] = useState<string[]>([]);

  useEffect(() => {
    if (isTrainer) {
      if (userMeta?.accounts && userMeta.accounts !== 'N/A') {
        const metaAccs = userMeta.accounts.split(/[,/|]/).map(s => s.trim().toLowerCase()).filter(Boolean);
        if (metaAccs.length > 0) {
          setTrainerAccounts(prev => Array.from(new Set([...prev, ...metaAccs])));
        }
      }

      getTrainerTraineeNames(email || undefined, userName || undefined).then(res => {
        if (res?.names && res.names.length > 0) {
          setTrainerTraineeNames(res.names);
        }
        if (res?.accounts && res.accounts.length > 0) {
          setTrainerAccounts(prev => Array.from(new Set([...prev, ...res.accounts])));
        }
      });
    }
  }, [isTrainer, email, userName, userMeta]);

  const visibleAccounts = useMemo(() => {
    let list: { id: string; name: string }[] = [];
    if (isTrainer) {
      const filtered = accounts.filter(acc => {
        const accId = acc.id.toLowerCase();
        if (accId === 'trainers') return true;
        // Only include client accounts if the trainer actually has assigned trainees in them
        return trainerTraineeNames.length > 0 && trainerAccounts.some(ta => matchesTrafficLightAccount(acc.id, ta));
      });
      list = filtered.length > 0 ? filtered : accounts.filter(a => a.id.toLowerCase() === 'trainers');
    } else {
      list = accounts;
    }
    return [
      { id: 'all', name: 'All Accounts' },
      ...list.filter(a => a.id !== 'all')
    ];
  }, [accounts, isTrainer, trainerAccounts, trainerTraineeNames]);

  const [account, setAccount] = useState<string>('all');

  useEffect(() => {
    if (visibleAccounts.length > 0 && !visibleAccounts.some(a => a.id === account)) {
      setAccount('all');
    }
  }, [visibleAccounts, account]);
  const [quarter, setQuarter] = useState('q2');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('ALL');
  const [data, setData] = useState<any[]>([]);
  const [allDateColumns, setAllDateColumns] = useState<string[]>([]);
  const [nameColumnKey, setNameColumnKey] = useState<string>('Teams');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Remarks / Notes State (Multi-Remarks Timeline)
  const [remarksMap, setRemarksMap] = useState<Record<string, TrafficLightRemarkItem[]>>({});
  const [filterWithRemarksOnly, setFilterWithRemarksOnly] = useState(false);
  const [activeRemarkModal, setActiveRemarkModal] = useState<{
    staffName: string;
    teamName: string;
    columnKey: string;
    currentStatus: string;
    rowIndex: number;
    account?: string;
  } | null>(null);

  const [newRemarkDraft, setNewRemarkDraft] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [isPostingRemark, setIsPostingRemark] = useState(false);
  const [isDeletingRemarkId, setIsDeletingRemarkId] = useState<number | null>(null);
  const [confirmDeleteRemarkId, setConfirmDeleteRemarkId] = useState<number | null>(null);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');
  const [drawerSortOrder, setDrawerSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [drawerTagFilter, setDrawerTagFilter] = useState('ALL');
  const [isFullHistoryModalOpen, setIsFullHistoryModalOpen] = useState(false);
  const [showAllInDrawer, setShowAllInDrawer] = useState(false);

  // UX ENHANCEMENT CONTROLS: VIEW MODE, DATE PICKER & SORT ORDER
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarCurrentDate, setCalendarCurrentDate] = useState<Date>(() => new Date(2026, 5, 1)); // Default June 2026 for Q2
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{ date: Date; dateStr: string; entries: any[] } | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Interactive Date Picker Popover State (matching Image 3)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(2026);
  const [pickerMonth, setPickerMonth] = useState<number>(5); // 0-indexed (5 is June)
  const [pickerSelectedDay, setPickerSelectedDay] = useState<number>(1);
  const [openDropdown, setOpenDropdown] = useState<'account' | 'quarter' | 'team' | 'trainer' | 'status' | 'pickerMonth' | 'pickerYear' | null>(null);

  // Sync date picker temp state when opening
  useEffect(() => {
    if (isDatePickerOpen) {
      setPickerYear(calendarCurrentDate.getFullYear());
      setPickerMonth(calendarCurrentDate.getMonth());
      setPickerSelectedDay(calendarCurrentDate.getDate());
    }
  }, [isDatePickerOpen, calendarCurrentDate]);

  // Close custom dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]') && !target.closest('[data-datepicker]')) {
        setOpenDropdown(null);
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track pending status edits before saving
  const [pendingEdits, setPendingEdits] = useState<Record<string, { rowIndex: number; colKey: string; newValue: string }>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [toast, setToast] = useState<{ title: string; description: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const quarters = [
    { id: 'q1', name: 'Q1 2026' },
    { id: 'q2', name: 'Q2 2026' },
    { id: 'q3', name: 'Q3 2026' },
    { id: 'q4', name: 'Q4 2026' },
  ];

  const fetchTableData = async () => {
    setIsLoading(true);
    setPendingEdits({});
    setSelectedTeam('ALL');
    setSelectedTrainer('ALL');
    
    // Scoped accounts list when account === 'all'
    const accountsScope = visibleAccounts.filter(a => a.id !== 'all').map(a => a.id);

    try {
      // Fetch data and remarks concurrently
      const [resultData, resultRemarks] = await Promise.all([
        getTrafficLightData(account, quarter, accountsScope),
        getTrafficLightRemarks(account, quarter, accountsScope)
      ]);

      if (resultRemarks?.data) {
        setRemarksMap(resultRemarks.data);
      } else {
        setRemarksMap({});
      }

      if (!resultData || resultData.error || !resultData.data || resultData.data.length === 0) {
        if (resultData?.error) console.error('Error fetching traffic light data:', resultData.error);
        setData([]);
        setAllDateColumns([]);
      } else {
        processData(resultData.data);
      }
    } catch (err) {
      console.error('Error in fetchTableData:', err);
      setData([]);
      setAllDateColumns([]);
      setRemarksMap({});
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  const processData = (rawData: any[]) => {
    if (!rawData || rawData.length === 0) {
      setData([]);
      setAllDateColumns([]);
      return;
    }

    const nameCol = 'teams';

    const isValidDateKey = (k: string): boolean => {
      if (!k) return false;
      const clean = k.trim();
      const lower = clean.toLowerCase();
      if ([
        'id', 'created_at', 'account', 'position', '_account', 
        '_namecol', 'isaccountheader', 'isAccountHeader', 'isteamheader',
        'isTeamHeader', 'remarks', 'status', 'total', 'average', 'teams',
        'name', 'assigned_trainer', 'accountname', 'account_name', 'batch', 'wave'
      ].includes(lower)) {
        return false;
      }
      // Must match standard date pattern like M/D/YYYY, M/D, YYYY-MM-DD, M-D-YYYY
      if (/^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?$/.test(clean) || /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(clean)) {
        return true;
      }
      const parsed = Date.parse(clean);
      return !isNaN(parsed) && /^\d/.test(clean);
    };

    // Discover all unique date columns across all rows (ignoring account header objects and metadata)
    const dateColsSet = new Set<string>();
    rawData.forEach(row => {
      if (row.isAccountHeader) return;
      Object.keys(row).forEach(k => {
        if (isValidDateKey(k)) {
          dateColsSet.add(k);
        }
      });
    });

    const dateCols = Array.from(dateColsSet);

    // Chronological date sort (earliest to latest)
    dateCols.sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      return a.localeCompare(b);
    });

    // Filter out blank spacer rows where employee/team name is null or empty
    const cleanData = rawData.filter(row => {
      const val = row[nameCol] ?? row.teams ?? row.name;
      if (val === null || val === undefined) return false;
      const str = String(val).trim();
      return str !== '' && str.toLowerCase() !== 'null' && str.toLowerCase() !== 'undefined';
    });

    setNameColumnKey(nameCol);
    setAllDateColumns(dateCols);
    setData(cleanData);
  };

  useEffect(() => {
    fetchTableData();

    // Supabase Realtime subscription to reflect status updates & remarks to Admin and Trainers instantly
    const channel = supabase
      .channel(`traffic_light_realtime_${account}_${quarter}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'traffic_light_metrics' },
        () => {
          const accountsScope = visibleAccounts.filter(a => a.id !== 'all').map(a => a.id);
          getTrafficLightRemarks(account, quarter, accountsScope).then(res => {
            if (res?.data) setRemarksMap(res.data);
          }).catch(err => {
            console.error('Error in realtime remarks fetch:', err);
          });
          // Also refresh table data so statuses reflect on Admin's screen immediately
          getTrafficLightData(account, quarter, accountsScope).then(res => {
            if (res?.data) processData(res.data);
          }).catch(err => {
            console.error('Error in realtime data fetch:', err);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [account, quarter, visibleAccounts]);

  // Dynamic Years Generator: Start from 1990 up to max(2031, currentYear + 5)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = Math.max(2031, currentYear + 5);
    const yrs: number[] = [];
    for (let y = 1990; y <= maxYear; y++) {
      yrs.push(y);
    }
    return yrs;
  }, []);

  // Helper to map month to quarter (q1, q2, q3, q4)
  const getQuarterFromDate = (d: Date) => {
    const m = d.getMonth();
    if (m >= 0 && m <= 2) return 'q1';
    if (m >= 3 && m <= 5) return 'q2';
    if (m >= 6 && m <= 8) return 'q3';
    return 'q4';
  };

  // Sync Quarter when Date Navigator changes
  const handleDateChange = (newDate: Date) => {
    setCalendarCurrentDate(newDate);
    const targetQ = getQuarterFromDate(newDate);
    if (targetQ !== quarter) {
      setQuarter(targetQ);
    }
  };

  // Sync Date Navigator when Quarter selector changes
  const handleQuarterChange = (newQuarter: string) => {
    setQuarter(newQuarter);
    const currQ = getQuarterFromDate(calendarCurrentDate);
    if (currQ !== newQuarter) {
      const qStartMonth = newQuarter === 'q1' ? 0 : newQuarter === 'q2' ? 3 : newQuarter === 'q3' ? 6 : 9;
      setCalendarCurrentDate(new Date(calendarCurrentDate.getFullYear(), qStartMonth, 1));
    }
  };

  // Dynamically compute active displayed columns: Filter table dates strictly by selected Calendar Month
  const displayedDateColumns = useMemo(() => {
    const targetYear = calendarCurrentDate.getFullYear();
    const targetMonth = calendarCurrentDate.getMonth(); // 0-indexed (e.g. 5 for June, 8 for Sept)
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const targetMonthPrefix = monthNames[targetMonth];

    let dates = allDateColumns.filter(col => {
      if (!col) return false;
      const clean = col.trim();

      // 1. Try Date.parse
      try {
        const parsed = new Date(clean);
        if (!isNaN(parsed.getTime()) && !/^\d+$/.test(clean)) {
          if (parsed.getFullYear() === targetYear && parsed.getMonth() === targetMonth) {
            return true;
          }
          if (parsed.getMonth() === targetMonth) {
            return true;
          }
        }
      } catch {}

      // 2. Try numeric splitting: M/D/YYYY or M/D/YY or M-D-YYYY
      const parts = clean.split(/[\/\-]/).map(Number);
      if (parts.length === 2 && !isNaN(parts[0])) {
        return parts[0] === (targetMonth + 1);
      }
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const m = parts[0] > 1000 ? parts[1] : parts[0];
        const yr = parts[2] < 100 ? 2000 + parts[2] : parts[2];
        const y = parts[0] > 1000 ? parts[0] : yr;
        return m === (targetMonth + 1) && (!y || y === targetYear);
      }

      // 3. Month name matching (e.g. "Jun 26", "Sep 5", "September 12")
      if (clean.toLowerCase().includes(targetMonthPrefix)) {
        return true;
      }

      return false;
    });

    // Strictly show only matched columns for the selected month (no fallback to other months)
    if (sortOrder === 'newest') {
      dates = [...dates].reverse();
    }

    return dates;
  }, [allDateColumns, calendarCurrentDate, sortOrder]);

  const latestDateColumn = useMemo(() => {
    if (allDateColumns.length === 0) return null;
    return allDateColumns[allDateColumns.length - 1];
  }, [allDateColumns]);

  // Dynamically extract teams and member counts
  const teamsList = useMemo(() => {
    if (!data || data.length === 0 || !nameColumnKey) return [];
    const teams: { name: string; count: number }[] = [];
    let currentTeamName = '';

    data.forEach(row => {
      const val = String(row[nameColumnKey] || '').trim();
      if (val.toUpperCase().startsWith('TEAM')) {
        currentTeamName = val;
        if (!teams.find(t => t.name === currentTeamName)) {
          teams.push({ name: currentTeamName, count: 0 });
        }
      } else if (currentTeamName && !row.isAccountHeader && !val.toUpperCase().startsWith('ACCOUNT:')) {
        const teamObj = teams.find(t => t.name === currentTeamName);
        if (teamObj) teamObj.count++;
      }
    });

    return teams;
  }, [data, nameColumnKey]);

  // Discover all distinct trainers present in active traffic light data
  const trainersFilterList = useMemo(() => {
    if (isTrainer && userName) {
      return [userName];
    }
    const set = new Set<string>();
    data.forEach(r => {
      if (r.isAccountHeader || r.isTeamHeader) return;
      const tr = String(r.assigned_trainer || '').trim();
      if (tr && tr !== 'Unassigned' && tr.toLowerCase() !== 'null' && tr.toLowerCase() !== 'undefined') {
        set.add(tr);
      }
      if (r._account === 'trainers' && r.teams) {
        set.add(String(r.teams).trim());
      }
    });
    return Array.from(set).sort();
  }, [data, isTrainer, userName]);

  // Helper to get Day of Week (e.g., FRI, TUE)
  const getDayOfWeek = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      }
    } catch (e) {}
    return 'DAY';
  };

  // Helper to format Date Label (e.g. SEP 1 or 6/26)
  const getFormattedDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        return `${month} ${d.getDate()}`;
      }
    } catch (e) {}
    return dateStr;
  };

  // Helper for 2-letter Avatar Initials
  const getInitials = (nameStr: string) => {
    if (!nameStr) return '?';
    const parts = nameStr.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Check if current user is authorized to edit a specific row
  const checkCanEditRow = (rowStaffName: string, rowAccount?: string) => {
    if (isPrivilegedAdmin && currentRole !== 'VIEW_ADMIN') return true;

    const targetAccount = rowAccount || account;

    if (isTrainer) {
      // 1. Trainer's own traffic light record is strictly VIEW-ONLY!
      if (targetAccount === 'trainers' || targetAccount === 'leaders' || checkIsOwnTrainerRow(rowStaffName)) {
        return false;
      }

      // 2. In trainee/client accounts: Trainers CAN edit their strictly assigned trainees!
      const cleanStaff = rowStaffName.toLowerCase().trim();
      const isAssignedTrainee = Boolean(
        (trainerTraineeNames.length > 0 &&
        trainerTraineeNames.some(tn => {
          const cleanTn = tn.toLowerCase().trim();
          return cleanTn === cleanStaff || cleanStaff.includes(cleanTn) || cleanTn.includes(cleanStaff) || isTrainerMatch(cleanStaff, cleanTn);
        })) ||
        data.some(r => {
          const rName = String(r[nameColumnKey] || '').toLowerCase().trim();
          return (rName === cleanStaff || isTrainerMatch(cleanStaff, rName)) && isTrainerMatch(r.assigned_trainer, userName || undefined);
        })
      );

      return isAssignedTrainee;
    }

    return false;
  };

  // Handle local cell edit change
  const handleCellChange = (rowIndex: number, colKey: string, newValue: string) => {
    const row = data[rowIndex];
    const staffName = String(row?.[nameColumnKey] || '');
    const rowAccount = row?._account || account;
    const canEdit = checkCanEditRow(staffName, rowAccount);

    if (!canEdit) {
      alert('You can only edit traffic light statuses for your own profile or assigned trainees/accounts.');
      return;
    }

    const updatedData = [...data];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [colKey]: newValue };
    setData(updatedData);

    const editKey = `${rowIndex}_${colKey}`;
    setPendingEdits(prev => ({
      ...prev,
      [editKey]: { rowIndex, colKey, newValue }
    }));
  };

  // Open Remark Modal
  const handleOpenRemarks = (
    staffName: string,
    teamName: string,
    columnKey: string,
    currentStatus: string,
    rowIndex: number,
    rowAccount?: string
  ) => {
    setNewRemarkDraft('');
    setEditingRemarkId(null);
    setEditingDraft('');
    setDrawerSearchQuery('');
    setDrawerTagFilter('ALL');
    setDrawerSortOrder('newest');
    setIsFullHistoryModalOpen(false);
    setShowAllInDrawer(false);
    setActiveRemarkModal({
      staffName,
      teamName,
      columnKey,
      currentStatus,
      rowIndex,
      account: rowAccount || (account === 'all' ? 'trainers' : account)
    });
  };

  // Add a new Remark to Supabase
  const handleAddRemark = async () => {
    if (!activeRemarkModal || !newRemarkDraft.trim()) return;

    const { staffName, columnKey, currentStatus } = activeRemarkModal;
    const authorName = email || 'Authorized Manager';
    const targetAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);

    if (isTrainer && (targetAccount === 'trainers' || targetAccount === 'leaders' || checkIsOwnTrainerRow(staffName))) {
      alert('Your own traffic light record is view-only. Only administrators can add or edit remarks on trainer records.');
      return;
    }

    setIsPostingRemark(true);

    const res = await addTrafficLightRemark({
      account: targetAccount,
      quarter,
      staffName,
      columnKey,
      status: currentStatus,
      remarks: newRemarkDraft.trim(),
      author: authorName
    });

    setIsPostingRemark(false);

    if (res.success && res.item) {
      const key = `${staffName}::${columnKey}`;
      setRemarksMap(prev => {
        const existingList = prev[key] || [];
        return {
          ...prev,
          [key]: [
            ...existingList,
            {
              metric_id: res.item.metric_id,
              remarks: newRemarkDraft.trim(),
              traffic_status: currentStatus,
              staffName,
              columnKey,
              source_table: res.item.source_table
            }
          ]
        };
      });

      setNewRemarkDraft('');
      setToast({
        title: 'Remark Added',
        description: `New note added for ${staffName} on ${columnKey}.`,
        type: 'success'
      });
    } else {
      setToast({
        title: 'Failed to Add Remark',
        description: res.error || 'Server error occurred while saving note.',
        type: 'error'
      });
    }
  };

  // Update an existing Remark item
  const handleUpdateRemark = async (metric_id: number) => {
    if (!activeRemarkModal || !editingDraft.trim()) return;

    const { staffName, columnKey } = activeRemarkModal;
    const authorName = email || 'Authorized Manager';
    const targetAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);

    if (isTrainer && (targetAccount === 'trainers' || targetAccount === 'leaders' || checkIsOwnTrainerRow(staffName))) {
      alert('Your own traffic light record is view-only. Only administrators can modify remarks on trainer records.');
      return;
    }

    setIsPostingRemark(true);

    const res = await updateTrafficLightRemark({
      metric_id,
      remarks: editingDraft.trim(),
      staffName,
      columnKey,
      account: targetAccount,
      quarter,
      author: authorName
    });

    setIsPostingRemark(false);

    if (res.success) {
      const key = `${staffName}::${columnKey}`;
      setRemarksMap(prev => {
        const existingList = prev[key] || [];
        return {
          ...prev,
          [key]: existingList.map(item =>
            item.metric_id === metric_id ? { ...item, remarks: editingDraft.trim() } : item
          )
        };
      });

      setEditingRemarkId(null);
      setEditingDraft('');
      setToast({
        title: 'Remark Updated',
        description: `Note updated successfully.`,
        type: 'success'
      });
    } else {
      setToast({
        title: 'Failed to Update Remark',
        description: res.error || 'Server error.',
        type: 'error'
      });
    }
  };

  // Delete a specific Remark item from Supabase
  const handleDeleteRemarkItem = async (metric_id: number) => {
    if (!activeRemarkModal) return;

    const { staffName, columnKey } = activeRemarkModal;
    const authorName = email || 'Authorized Manager';
    const targetAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);

    if (isTrainer && (targetAccount === 'trainers' || targetAccount === 'leaders' || checkIsOwnTrainerRow(staffName))) {
      alert('Your own traffic light record is view-only. Only administrators can delete remarks on trainer records.');
      return;
    }

    setIsDeletingRemarkId(metric_id);

    const res = await deleteTrafficLightRemarkItem({
      metric_id,
      staffName,
      columnKey,
      account: targetAccount,
      quarter,
      author: authorName
    });

    setIsDeletingRemarkId(null);
    setConfirmDeleteRemarkId(null);

    if (res.success) {
      const key = `${staffName}::${columnKey}`;
      setRemarksMap(prev => {
        const existingList = prev[key] || [];
        const updatedList = existingList.filter(item => item.metric_id !== metric_id);
        const updatedMap = { ...prev };
        if (updatedList.length > 0) {
          updatedMap[key] = updatedList;
        } else {
          delete updatedMap[key];
        }
        return updatedMap;
      });

      setToast({
        title: 'Remark Deleted',
        description: `Removed note from history.`,
        type: 'info'
      });
    } else {
      setToast({
        title: 'Failed to Delete Remark',
        description: res.error || 'Server error.',
        type: 'error'
      });
    }
  };

  // Discard all local unsaved edits
  const handleDiscardEdits = () => {
    fetchTableData();
  };

  // Save all accumulated pending edits in batch to backend Supabase
  const handleSaveAll = async () => {
    const editsToSave = Object.values(pendingEdits);
    if (editsToSave.length === 0) return;

    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const edit of editsToSave) {
      const row = data[edit.rowIndex];
      if (!row) continue;
      const staffName = row[nameColumnKey];

      const targetAccount = row._account || (account === 'all' ? 'trainers' : account);

      if (!checkCanEditRow(staffName, targetAccount)) continue;

      const res = await updateTrafficLightCell({
        account: targetAccount,
        quarter,
        staffName,
        columnKey: edit.colKey,
        newValue: edit.newValue
      });

      if (res.success) {
        successCount++;
      } else {
        console.error(`Failed to save cell (${staffName}, ${edit.colKey}):`, res.error);
        failCount++;
      }
    }

    setIsSaving(false);
    setPendingEdits({});

    if (failCount === 0) {
      setToast({
        title: 'All Changes Saved',
        description: `Successfully updated ${successCount} traffic light record${successCount > 1 ? 's' : ''}.`,
        type: 'success'
      });
    } else {
      setToast({
        title: 'Saved with Warnings',
        description: `Saved ${successCount} edits. ${failCount} failed to update.`,
        type: 'error'
      });
    }

    setTimeout(() => {
      fetchTableData();
    }, 500);
  };

  // Filter Data by search, selected team, and optional remarks filter
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let currentTeamName = '';

    const preFiltered = data.filter((row) => {
      const nameVal = String(row[nameColumnKey] || '').trim();
      const isAccountHeader = row.isAccountHeader || nameVal.toUpperCase().startsWith('ACCOUNT:');
      const isTeamHeader = nameVal.toUpperCase().startsWith('TEAM');

      if (isAccountHeader) {
        return true;
      }

      if (isTeamHeader) {
        currentTeamName = nameVal;
        if (selectedTeam !== 'ALL' && currentTeamName !== selectedTeam) {
          return false;
        }
        return true;
      }

      const rowAccount = row._account || account;

      // 1. In Trainers / Leaders account: Trainers can ONLY see their own record (they cannot see other trainers)
      if (rowAccount === 'trainers' || rowAccount === 'leaders') {
        if (isTrainer) {
          const isOwnTrainerRow = checkIsOwnTrainerRow(nameVal);
          if (!isOwnTrainerRow) return false;
        }
      }

      // 2. In Client/Trainee Accounts (e.g. DFT, FLEXAR, RM, etc.):
      // Only the trainer's own row (if present) and their strictly assigned trainees reflect.
      // Other trainers and other trainers' trainees must NEVER reflect!
      if (isTrainer && rowAccount !== 'trainers' && rowAccount !== 'leaders') {
        // If this row happens to be the trainer's own profile, show it (view-only)
        if (checkIsOwnTrainerRow(nameVal)) {
          return true;
        }

        const rowTrainer = String(row.assigned_trainer || '').trim();
        const cleanTraineeName = nameVal.toLowerCase().trim();

        const isDirectTrainerMatch = Boolean(
          (rowTrainer && userName && isTrainerMatch(rowTrainer, userName || undefined)) ||
          (rowTrainer && userName && isTrainerMatch(userName || undefined, rowTrainer)) ||
          (rowTrainer && email && email.includes('@') && rowTrainer.toLowerCase() === email.toLowerCase().split('@')[0])
        );

        const isNameAssigned = trainerTraineeNames.length > 0 && trainerTraineeNames.some(tn => {
          const cleanTn = tn.toLowerCase().trim();
          return cleanTn === cleanTraineeName ||
                 cleanTraineeName.includes(cleanTn) ||
                 cleanTn.includes(cleanTraineeName) ||
                 isTrainerMatch(cleanTraineeName, cleanTn);
        });

        // A trainer only sees trainees who are strictly assigned to them
        if (!isDirectTrainerMatch && !isNameAssigned) {
          return false;
        }
      }

      // 3. For Trainees: only see their own row
      if (isTrainee && (userName || email)) {
        const qName = (userName || '').toLowerCase();
        const qEmail = (email || '').toLowerCase().split('@')[0];
        const lowerName = nameVal.toLowerCase();
        const isOwnTrainee = (qName && (lowerName.includes(qName) || qName.includes(lowerName))) || (qEmail && lowerName.includes(qEmail));
        if (!isOwnTrainee) return false;
      }

      // Trainer filter
      if (selectedTrainer !== 'ALL') {
        const rowTrainer = String(row.assigned_trainer || '').trim();
        const rowName = nameVal;
        const matchesTrainer = 
          (rowTrainer && (isTrainerMatch(rowTrainer, selectedTrainer) || rowTrainer.toLowerCase().includes(selectedTrainer.toLowerCase()))) ||
          (rowAccount === 'trainers' && (isTrainerMatch(rowName, selectedTrainer) || rowName.toLowerCase().includes(selectedTrainer.toLowerCase())));
        if (!matchesTrainer) return false;
      }

      // Team filter
      if (teamsList.length > 0) {
        if (selectedTeam !== 'ALL' && currentTeamName !== selectedTeam) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        const hasMatchingStatus = allDateColumns.some(col => {
          const rawVal = row[col];
          if (!rawVal) return false;
          const cfg = getStatusConfig(String(rawVal));
          return cfg.value.toLowerCase() === statusFilter.toLowerCase();
        });
        if (!hasMatchingStatus) return false;
      }

      // Search Query: Matches Trainee Name, Assigned Trainer, or Account
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = nameVal.toLowerCase().includes(q);
        const matchesTrainer = String(row.assigned_trainer || '').toLowerCase().includes(q);
        const matchesAcc = String(row.accountName || row.acount || row._account || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTrainer && !matchesAcc) {
          return false;
        }
      }

      // Remarks Only filter
      if (filterWithRemarksOnly) {
        const hasAnyRemark = displayedDateColumns.some(col => {
          const key = `${nameVal}::${col}`;
          return (remarksMap[key]?.length || 0) > 0;
        });
        if (!hasAnyRemark) return false;
      }

      return true;
    });

    // Prune empty headers (headers with no following data rows)
    const result: any[] = [];
    for (let i = 0; i < preFiltered.length; i++) {
      const row = preFiltered[i];
      const isHeader = row.isAccountHeader || String(row[nameColumnKey] || '').toUpperCase().startsWith('ACCOUNT:');
      const isTeam = String(row[nameColumnKey] || '').toUpperCase().startsWith('TEAM');

      if (isHeader) {
        let hasChildren = false;
        for (let j = i + 1; j < preFiltered.length; j++) {
          const nextRow = preFiltered[j];
          const nextIsHeader = nextRow.isAccountHeader || String(nextRow[nameColumnKey] || '').toUpperCase().startsWith('ACCOUNT:');
          if (nextIsHeader) break;
          const nextIsTeam = String(nextRow[nameColumnKey] || '').toUpperCase().startsWith('TEAM');
          if (!nextIsTeam) {
            hasChildren = true;
            break;
          }
        }
        if (hasChildren) result.push(row);
      } else if (isTeam) {
        let hasChildren = false;
        for (let j = i + 1; j < preFiltered.length; j++) {
          const nextRow = preFiltered[j];
          const nextIsHeader = nextRow.isAccountHeader || String(nextRow[nameColumnKey] || '').toUpperCase().startsWith('ACCOUNT:');
          const nextIsTeam = String(nextRow[nameColumnKey] || '').toUpperCase().startsWith('TEAM');
          if (nextIsHeader || nextIsTeam) break;
          hasChildren = true;
          break;
        }
        if (hasChildren) result.push(row);
      } else {
        result.push(row);
      }
    }

    return result;
  }, [data, nameColumnKey, isTrainer, isTrainee, account, userName, email, selectedTeam, selectedTrainer, statusFilter, searchQuery, teamsList, filterWithRemarksOnly, displayedDateColumns, remarksMap, trainerTraineeNames, trainerAccounts, checkIsOwnTrainerRow]);

  // Pagination State (Display 10 per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [account, quarter, selectedTeam, selectedTrainer, statusFilter, searchQuery, filterWithRemarksOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Calculate live summary KPI metrics
  const kpis = useMemo(() => {
    let employeeCount = 0;
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;

    filteredData.forEach(row => {
      const nameVal = String(row[nameColumnKey] || '').trim();
      const isAccountHeader = row.isAccountHeader || nameVal.toUpperCase().startsWith('ACCOUNT:');
      const isTeamHeader = nameVal.toUpperCase().startsWith('TEAM');

      if (!isAccountHeader && !isTeamHeader) {
        employeeCount++;
        allDateColumns.forEach(c => {
          const val = String(row[c] || '').toUpperCase().trim();
          if (val === 'OKAY' || val === 'GREEN') greenCount++;
          else if (val === 'SHAKY' || val === 'AMBER' || val === 'YELLOW') amberCount++;
          else if (['TERMINATED', 'RESIGNED', 'ACCOUNT REMOVED', 'RED'].includes(val)) redCount++;
        });
      }
    });

    return { employeeCount, greenCount, amberCount, redCount };
  }, [filteredData, allDateColumns, nameColumnKey]);

  // Total remarks count across all trainees & cells
  const totalRemarksCount = useMemo(() => {
    return Object.values(remarksMap).reduce((sum, list) => sum + (list?.length || 0), 0);
  }, [remarksMap]);

  const pendingCount = Object.keys(pendingEdits).length;

  // Quick Remark Preset Tags (Clean Lucide icons, no emojis)
  const quickTags = [
    { label: 'Performance Concern', icon: AlertTriangle, text: 'Performance Concern: Trainee requires additional coaching and metric review.' },
    { label: 'Attendance / Tardy', icon: Clock, text: 'Attendance Issue: Late arrivals or unexcused absences noted during the week.' },
    { label: 'High QA / Commendation', icon: Award, text: 'High Performer: Outstanding QA scores and positive customer feedback.' },
    { label: 'Coaching in Progress', icon: BookOpen, text: 'Coaching in Progress: 1-on-1 action plan underway to improve product accuracy.' },
    { label: 'Escalation Incident', icon: AlertOctagon, text: 'Escalation: Incident logged regarding policy compliance or process breach.' },
    { label: 'Medical / LOA', icon: HeartPulse, text: 'Medical Leave: On approved medical leave of absence.' },
    { label: 'Resignation Notice', icon: LogOut, text: 'Resignation: Submitted formal resignation notice.' },
  ];

  // Month days generation for Traffic Lights Calendar
  const calendarMonthInfo = useMemo(() => {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const getMatchingColsForDate = (targetD: Date) => {
      const tYear = targetD.getFullYear();
      const tMonth = targetD.getMonth(); // 0-indexed
      const tDate = targetD.getDate();

      return allDateColumns.filter(col => {
        try {
          const parsed = new Date(col);
          if (!isNaN(parsed.getTime())) {
            return parsed.getFullYear() === tYear && parsed.getMonth() === tMonth && parsed.getDate() === tDate;
          }
        } catch {}

        const parts = col.split(/[\/\-]/).map(Number);
        if (parts.length === 2) {
          return parts[0] === (tMonth + 1) && parts[1] === tDate;
        }
        if (parts.length === 3) {
          if (parts[0] > 1000) {
            return parts[0] === tYear && parts[1] === (tMonth + 1) && parts[2] === tDate;
          } else {
            const yr = parts[2] < 100 ? 2000 + parts[2] : parts[2];
            return yr === tYear && parts[0] === (tMonth + 1) && parts[1] === tDate;
          }
        }
        return false;
      });
    };

    const days: {
      dayNum: number;
      isCurrentMonth: boolean;
      date: Date;
      dateKeyPattern: string;
      matchingCols: string[];
      entries: {
        staffName: string;
        rowAccount: string;
        status: string;
        colKey: string;
        actualIndex: number;
        remarksList: TrafficLightRemarkItem[];
      }[];
      statusCounts: Record<string, number>;
    }[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthTotalDays - i;
      const d = new Date(year, month - 1, dNum);
      days.push({
        dayNum: dNum,
        isCurrentMonth: false,
        date: d,
        dateKeyPattern: `${d.getMonth() + 1}/${dNum}/${d.getFullYear()}`,
        matchingCols: [],
        entries: [],
        statusCounts: {}
      });
    }

    // 2. Current month days
    for (let dNum = 1; dNum <= totalDays; dNum++) {
      const d = new Date(year, month, dNum);
      const matchingCols = getMatchingColsForDate(d);
      
      const rawEntries: {
        staffName: string;
        rowAccount: string;
        status: string;
        colKey: string;
        actualIndex: number;
        remarksList: TrafficLightRemarkItem[];
      }[] = [];

      const statusCounts: Record<string, number> = {
        Okay: 0,
        Shaky: 0,
        Terminated: 0,
        Resigned: 0,
        'Account Removed': 0,
      };

      if (matchingCols.length > 0) {
        filteredData.forEach((row, idx) => {
          const staffName = String(row[nameColumnKey] || '').trim();
          const isHeader = row.isAccountHeader || staffName.toUpperCase().startsWith('ACCOUNT:') || staffName.toUpperCase().startsWith('TEAM');
          if (isHeader) return;

          const originalDataIndex = data.findIndex(item => (item.id && item.id === row.id) || (item[nameColumnKey] === row[nameColumnKey] && item._account === row._account));
          const actualIndex = originalDataIndex !== -1 ? originalDataIndex : idx;

          matchingCols.forEach(col => {
            const val = row[col];
            if (val && String(val).trim()) {
              const rawStatus = String(val).trim();
              const config = getStatusConfig(rawStatus);
              if (config.value) {
                const rKey = `${staffName}::${col}`;
                const rList = remarksMap[rKey] || [];
                const entry = {
                  staffName,
                  rowAccount: row._account || account,
                  status: config.value,
                  colKey: col,
                  actualIndex,
                  remarksList: rList
                };

                const cLabel = config.label;
                if (statusCounts[cLabel] !== undefined) {
                  statusCounts[cLabel]++;
                }

                if (statusFilter === 'ALL' || statusFilter.toUpperCase() === config.value.toUpperCase()) {
                  rawEntries.push(entry);
                }
              }
            }
          });
        });
      }

      days.push({
        dayNum: dNum,
        isCurrentMonth: true,
        date: d,
        dateKeyPattern: `${month + 1}/${dNum}/${year}`,
        matchingCols,
        entries: rawEntries,
        statusCounts
      });
    }

    // 3. Next month leading days
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        dayNum: i,
        isCurrentMonth: false,
        date: d,
        dateKeyPattern: `${d.getMonth() + 1}/${i}/${d.getFullYear()}`,
        matchingCols: [],
        entries: [],
        statusCounts: {}
      });
    }

    return { year, month, days };
  }, [calendarCurrentDate, allDateColumns, filteredData, data, nameColumnKey, account, remarksMap, statusFilter]);

  if (isInitialLoading) {
    return (
      <PageLoading
        title="Loading Traffic Lights..."
        subtitle="Evaluating risk indicators, milestones, and trainee performance flags"
      />
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full px-0 pb-72 min-h-[calc(100vh+150px)] font-sans">
      {/* Top-Right Success Toast Notification rendered in Portal to be in front of all drawers/modals */}
      {toast && mounted && createPortal(
        <div
          className={`fixed top-6 right-6 z-[10005] flex flex-col bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-2xl shadow-2xl transition-all animate-in slide-in-from-top-5 duration-200 min-w-[320px] max-w-sm overflow-hidden ${
            toast.type === 'success'
              ? 'border-l-4 border-l-emerald-500'
              : toast.type === 'info'
              ? 'border-l-4 border-l-[#2F6798]'
              : 'border-l-4 border-l-rose-500'
          }`}
        >
          <div className="flex items-start gap-3 p-4">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white ${
                toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'info' ? 'bg-[#2F6798]' : 'bg-rose-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{toast.title}</h4>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {toast.description}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Animated Countdown Progress Bar */}
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
            <div
              className={`h-full ${
                toast.type === 'success'
                  ? 'bg-emerald-500'
                  : toast.type === 'info'
                  ? 'bg-[#2F6798]'
                  : 'bg-rose-500'
              }`}
              style={{
                animation: 'toastCountdown 4.5s linear forwards',
                width: '100%'
              }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#2F6798]/10 text-[#2F6798] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            Traffic Light Monitoring
          </h1>
          <p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-0.5">
            Real-time status tracking and remarks notes across accounts, waves, and quarterly flags
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTableData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 text-[#2F6798] animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" />}
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Box 1: Monitored Staff */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-28 sm:w-36 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Monitored Staff</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-0.5">{kpis.employeeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center relative z-10">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Box 2: Okay Flags */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-28 sm:w-36 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Okay Flags (Green)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{kpis.greenCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center relative z-10">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Box 3: Shaky Flags */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-28 sm:w-36 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Shaky Flags (Amber)</p>
            <p className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-0.5">{kpis.amberCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 flex items-center justify-center relative z-10">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Box 4: Critical / Loss Flags */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-28 sm:w-36 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Critical / Loss Flags</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{kpis.redCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center relative z-10">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ONE SINGLE UNIFIED EXTERNAL CONTAINER FOR FILTERS & TEAMS TABLE / CALENDAR */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
        
        {/* Section 1: Global Filter Bar (Account, Quarter, Team, Status, Search) - Compact Filters, Longer Search */}
        <div className="flex flex-wrap items-end gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          {/* 1. Account Selector */}
          <div className="relative w-36 shrink-0" data-dropdown>
            <div className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>SELECT ACCOUNT</span>
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'account' ? null : 'account')}
              className="h-10 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#2F6798]/10 focus:border-[#2F6798] cursor-pointer"
            >
              <span className="truncate">{visibleAccounts.find(a => a.id === account)?.name || account.toUpperCase()}</span>
              {openDropdown === 'account' ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {openDropdown === 'account' && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 max-h-64 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
                {visibleAccounts.map((acc) => {
                  const isSelected = account === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setAccount(acc.id);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                        isSelected
                          ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                          : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {acc.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Quarter Selector */}
          <div className="relative w-28 shrink-0" data-dropdown>
            <div className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>QUARTER</span>
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'quarter' ? null : 'quarter')}
              className="h-10 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#2F6798]/10 focus:border-[#2F6798] cursor-pointer"
            >
              <span className="truncate">{quarters.find(q => q.id === quarter)?.name || quarter}</span>
              {openDropdown === 'quarter' ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {openDropdown === 'quarter' && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95">
                {quarters.map((q) => {
                  const isSelected = quarter === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        handleQuarterChange(q.id);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                        isSelected
                          ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                          : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {q.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Team Filter Dropdown */}
          <div className="relative w-36 shrink-0" data-dropdown>
            <div className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>TEAM FILTER</span>
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'team' ? null : 'team')}
              className="h-10 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#2F6798]/10 focus:border-[#2F6798] cursor-pointer"
            >
              <span className="truncate">
                {selectedTeam === 'ALL' ? (teamsList.length > 0 ? `All Teams (${teamsList.length})` : 'All Teams') : selectedTeam}
              </span>
              {openDropdown === 'team' ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {openDropdown === 'team' && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeam('ALL');
                    setOpenDropdown(null);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                    selectedTeam === 'ALL'
                      ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                      : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  All Teams ({teamsList.length})
                </button>
                {teamsList.map((t) => {
                  const isSelected = selectedTeam === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        setSelectedTeam(t.name);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-lg text-xs truncate transition-colors cursor-pointer",
                        isSelected
                          ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                          : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {t.name} ({t.count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trainer Filter Dropdown (Admins Only) */}
          {isPrivilegedAdmin && (
            <div className="relative w-36 shrink-0" data-dropdown>
              <div className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#2F6798]" />
                <span>TRAINER</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'trainer' ? null : 'trainer')}
                className="h-10 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#2F6798]/10 focus:border-[#2F6798] cursor-pointer"
              >
                <span className="truncate">
                  {selectedTrainer === 'ALL' ? (trainersFilterList.length > 0 ? `All Trainers (${trainersFilterList.length})` : 'All Trainers') : selectedTrainer}
                </span>
                {openDropdown === 'trainer' ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                )}
              </button>

              {openDropdown === 'trainer' && (
                <div className="absolute top-[calc(100%+6px)] left-0 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTrainer('ALL');
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                      selectedTrainer === 'ALL'
                        ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                        : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    All Trainers ({trainersFilterList.length})
                  </button>
                  {trainersFilterList.map((trName) => {
                    const isSelected = selectedTrainer === trName;
                    return (
                      <button
                        key={trName}
                        type="button"
                        onClick={() => {
                          setSelectedTrainer(trName);
                          setOpenDropdown(null);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-lg text-xs truncate transition-colors cursor-pointer",
                          isSelected
                            ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                            : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {trName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Status Filter Dropdown */}
          <div className="relative w-36 shrink-0" data-dropdown>
            <div className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>STATUS FILTER</span>
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'status' ? null : 'status')}
              className="h-10 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#2F6798]/10 focus:border-[#2F6798] cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                {statusFilter !== 'ALL' && (
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    statusFilter === 'Okay' ? 'bg-emerald-500' :
                    statusFilter === 'Shaky' ? 'bg-amber-400' :
                    statusFilter === 'Terminated' ? 'bg-rose-500' :
                    statusFilter === 'Resigned' ? 'bg-red-500' : 'bg-orange-500'
                  )} />
                )}
                <span className="truncate">{statusFilter === 'ALL' ? 'All Statuses' : statusFilter}</span>
              </div>
              {openDropdown === 'status' ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {openDropdown === 'status' && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95">
                {['ALL', 'Okay', 'Shaky', 'Terminated', 'Resigned', 'Account Removed'].map((st) => {
                  const isSelected = statusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer",
                        isSelected
                          ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                          : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {st !== 'ALL' ? (
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          st === 'Okay' ? 'bg-emerald-500' :
                          st === 'Shaky' ? 'bg-amber-400' :
                          st === 'Terminated' ? 'bg-rose-500' :
                          st === 'Resigned' ? 'bg-red-500' : 'bg-orange-500'
                        )} />
                      ) : (
                        <Circle className="w-2 h-2 text-slate-400 shrink-0" />
                      )}
                      <span>{st === 'ALL' ? 'All Statuses' : st}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Search Employee Field - Expanded Full Width */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>SEARCH EMPLOYEE</span>
            </div>
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
              <input
                type="text"
                placeholder="Type name or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 2: VIEW MODE SWITCHER & COMPACT DATE PICKER CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          {/* Left: View Mode Toggle + Unified Date Navigator Bar (No Today Button) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle: Table View vs Calendar View */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'table'
                    ? "bg-[#2F6798] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'calendar'
                    ? "bg-[#2F6798] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
            </div>

            {/* Date Navigator & Interactive Popover Trigger */}
            <div className="relative flex items-center gap-1.5 flex-wrap" data-datepicker>
              {/* Prev Month Button */}
              <button
                type="button"
                onClick={() => {
                  handleDateChange(new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() - 1, 1));
                }}
                className="w-8 h-8 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month-Year Pill Trigger with Chevron (Image 2) */}
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs font-bold text-[#2F6798] dark:text-blue-300 flex items-center gap-2 transition-all cursor-pointer shadow-2xs hover:border-[#2F6798]/50"
              >
                <Calendar className="w-3.5 h-3.5 text-[#2F6798]" />
                <span className="font-black text-slate-900 dark:text-slate-100">
                  {calendarCurrentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {isDatePickerOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Next Month Button */}
              <button
                type="button"
                onClick={() => {
                  handleDateChange(new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() + 1, 1));
                }}
                className="w-8 h-8 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* AESTHETIC COMPACT DATE PICKER POPOVER MODAL (MATCHING IMAGE 3) */}
              {isDatePickerOpen && (
                <div
                  className="absolute top-[calc(100%+8px)] left-0 z-50 w-[305px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Top Header Row with Title (e.g. "June 1"), Month/Year Dropdowns, and Calendar Badge */}
                  <div className="flex items-start justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {new Date(pickerYear, pickerMonth, 1).toLocaleDateString('en-US', { month: 'long' })} {pickerSelectedDay}
                      </h3>

                      {/* Month & Year Selection Pill Buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Month Selector */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(prev => prev === 'pickerMonth' ? null : 'pickerMonth')}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 hover:bg-slate-200 transition-colors"
                          >
                            <span>{new Date(pickerYear, pickerMonth, 1).toLocaleDateString('en-US', { month: 'long' })}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {openDropdown === 'pickerMonth' && (
                            <div className="absolute top-[calc(100%+4px)] left-0 w-36 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-50 max-h-48 overflow-y-auto space-y-0.5">
                              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((mName, mIdx) => (
                                <button
                                  key={mName}
                                  type="button"
                                  onClick={() => {
                                    setPickerMonth(mIdx);
                                    setOpenDropdown(null);
                                  }}
                                  className={cn(
                                    "w-full text-left px-2 py-1 rounded-md text-xs transition-colors",
                                    pickerMonth === mIdx
                                      ? "font-bold text-[#2F6798] bg-blue-50 dark:bg-blue-950/40"
                                      : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  )}
                                >
                                  {mName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Year Selector (1990 - 2031+) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdown(prev => prev === 'pickerYear' ? null : 'pickerYear')}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 hover:bg-slate-200 transition-colors"
                          >
                            <span>{pickerYear}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {openDropdown === 'pickerYear' && (
                            <div className="absolute top-[calc(100%+4px)] left-0 w-24 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-50 max-h-48 overflow-y-auto space-y-0.5">
                              {availableYears.map((yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => {
                                    setPickerYear(yr);
                                    setOpenDropdown(null);
                                  }}
                                  className={cn(
                                    "w-full text-left px-2 py-1 rounded-md text-xs transition-colors",
                                    pickerYear === yr
                                      ? "font-bold text-[#2F6798] bg-blue-50 dark:bg-blue-950/40"
                                      : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  )}
                                >
                                  {yr}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cute Calendar Badge with Top Ring Tabs (Image 3) */}
                    <div className="w-10 h-10 bg-[#2F6798] rounded-xl flex items-center justify-center relative shadow-sm shrink-0">
                      <div className="absolute -top-1 left-2 w-1 h-2 bg-slate-200 rounded-full" />
                      <div className="absolute -top-1 right-2 w-1 h-2 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-black text-white tracking-wider">
                        {pickerYear}
                      </span>
                    </div>
                  </div>

                  {/* 7-Weekday Header (Image 3) */}
                  <div className="grid grid-cols-7 text-center text-[9.5px] font-black uppercase tracking-wider text-[#2F6798] dark:text-blue-300">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((w) => (
                      <div key={w} className="py-0.5">
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days Matrix (2-digit zero-padded numbers, Image 3) */}
                  {(() => {
                    const firstDayIdx = new Date(pickerYear, pickerMonth, 1).getDay();
                    const totalMonthDays = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                    const prevMonthDays = new Date(pickerYear, pickerMonth, 0).getDate();

                    const matrixDays: { dayNum: number; isCurr: boolean }[] = [];

                    // Leading days from prev month
                    for (let i = firstDayIdx - 1; i >= 0; i--) {
                      matrixDays.push({ dayNum: prevMonthDays - i, isCurr: false });
                    }
                    // Current month days
                    for (let d = 1; d <= totalMonthDays; d++) {
                      matrixDays.push({ dayNum: d, isCurr: true });
                    }
                    // Trailing days
                    const rem = (7 - (matrixDays.length % 7)) % 7;
                    for (let i = 1; i <= rem; i++) {
                      matrixDays.push({ dayNum: i, isCurr: false });
                    }

                    return (
                      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                        {matrixDays.map((item, idx) => {
                          const isSelected = item.isCurr && item.dayNum === pickerSelectedDay;
                          const padNum = item.dayNum < 10 ? `0${item.dayNum}` : `${item.dayNum}`;

                          return (
                            <div key={idx} className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.isCurr) {
                                    setPickerSelectedDay(item.dayNum);
                                  } else {
                                    if (idx < 7) {
                                      setPickerMonth(prev => prev === 0 ? 11 : prev - 1);
                                      if (pickerMonth === 0) setPickerYear(y => y - 1);
                                    } else {
                                      setPickerMonth(prev => prev === 11 ? 0 : prev + 1);
                                      if (pickerMonth === 11) setPickerYear(y => y + 1);
                                    }
                                    setPickerSelectedDay(item.dayNum);
                                  }
                                }}
                                className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all cursor-pointer",
                                  isSelected
                                    ? "bg-[#2F6798] text-white font-black shadow-md scale-105"
                                    : item.isCurr
                                    ? "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    : "text-slate-300 dark:text-slate-600 font-normal hover:text-slate-500"
                                )}
                              >
                                {padNum}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Selected Date Summary Box (Image 3) */}
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#2F6798]" />
                      <span>Selected Date</span>
                    </div>
                    <span className="font-black text-[#2F6798] dark:text-blue-300">
                      {new Date(pickerYear, pickerMonth, pickerSelectedDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Confirm Selection Action Button (Image 3) */}
                  <button
                    type="button"
                    onClick={() => {
                      const newD = new Date(pickerYear, pickerMonth, pickerSelectedDay);
                      handleDateChange(newD);
                      setIsDatePickerOpen(false);
                    }}
                    className="w-full py-2 bg-[#2F6798] hover:bg-[#24527a] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Confirm Selection
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Remarks Only Filter & Sorting Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterWithRemarksOnly(!filterWithRemarksOnly)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs border",
                filterWithRemarksOnly
                  ? "bg-[#C8A54B] text-white border-[#b08e3a] shadow-md shadow-[#C8A54B]/20"
                  : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Remarks Only</span>
              {totalRemarksCount > 0 && (
                <span className={cn("px-1.5 py-0.2 rounded-md text-[10px] font-black", filterWithRemarksOnly ? "bg-white/25 text-white" : "bg-[#C8A54B]/20 text-[#8e6e22] dark:bg-[#C8A54B]/30 dark:text-[#f3d994]")}>
                  {totalRemarksCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
              title="Switch column date ordering"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>{sortOrder === 'newest' ? 'Latest Week First' : 'Oldest Week First'}</span>
            </button>
          </div>
        </div>

        {/* Section 3: VIEW CONTENT (TABLE VIEW OR CALENDAR VIEW) */}
        {viewMode === 'calendar' ? (
          /* CALENDAR VIEW CONTAINER */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col w-full">
            {/* Month & Year Title Bar Above Calendar (e.g. September 2026) */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/90 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2F6798]/10 dark:bg-blue-950/50 flex items-center justify-center text-[#2F6798] dark:text-blue-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {calendarCurrentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Traffic Lights Monthly Schedule &amp; Activity
                  </p>
                </div>
              </div>
            </div>

            {/* 7-Day Header */}
            <div className="grid grid-cols-7 bg-[#2F6798] dark:bg-[#24527a] text-white text-center text-[10px] font-black uppercase tracking-wider overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-2 border-r border-blue-400/20 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days 7-Column Grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-200/80 dark:border-slate-700/80 bg-slate-200 dark:bg-slate-800">
              {calendarMonthInfo.days.map((dayItem, dIdx) => {
                const isToday = dayItem.date.toDateString() === new Date().toDateString();
                const hasEntries = dayItem.entries.length > 0;
                return (
                  <div
                    key={dIdx}
                    className={cn(
                      "min-h-[120px] sm:min-h-[140px] p-2 transition-all flex flex-col justify-between group/day",
                      dayItem.isCurrentMonth
                        ? isToday
                          ? "bg-blue-50/50 dark:bg-blue-950/20"
                          : "bg-white dark:bg-slate-900"
                        : "bg-slate-50/60 dark:bg-slate-900/40 opacity-45"
                    )}
                  >
                    {/* Day Cell Top Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black",
                          isToday
                            ? "bg-[#2F6798] text-white shadow-xs"
                            : dayItem.isCurrentMonth
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-400 dark:text-slate-600"
                        )}
                      >
                        {dayItem.dayNum}
                      </span>

                      {hasEntries && (
                        <button
                          type="button"
                          onClick={() => setSelectedCalendarDay({
                            date: dayItem.date,
                            dateStr: dayItem.dateKeyPattern,
                            entries: dayItem.entries
                          })}
                          className="text-[8.5px] font-black px-1.5 py-0.2 rounded-md bg-[#2F6798]/10 text-[#2F6798] dark:text-blue-300 hover:bg-[#2F6798]/20 transition-colors cursor-pointer"
                        >
                          {dayItem.entries.length} staff
                        </button>
                      )}
                    </div>

                    {/* Day Cell Entries */}
                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {dayItem.entries.slice(0, 3).map((entry, eIdx) => {
                        const cfg = getStatusConfig(entry.status);
                        const noteCount = entry.remarksList?.length || 0;
                        return (
                          <button
                            key={`${entry.staffName}_${entry.colKey}_${eIdx}`}
                            type="button"
                            onClick={() => handleOpenRemarks(entry.staffName, selectedTeam, entry.colKey, entry.status, entry.actualIndex, entry.rowAccount)}
                            className={cn(
                              "w-full text-left p-1 rounded-lg text-[9.5px] font-bold flex items-center justify-between gap-1 shadow-2xs hover:scale-[1.01] transition-transform cursor-pointer",
                              cfg.badgeStyle
                            )}
                            title={`${entry.staffName} (${cfg.label}) - Click to view/edit remarks`}
                          >
                            <span className="truncate pr-0.5">{entry.staffName}</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {noteCount > 0 && (
                                <span className="w-3.5 h-3.5 rounded-full bg-white/30 text-white flex items-center justify-center text-[7.5px] font-black">
                                  {noteCount}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {dayItem.entries.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCalendarDay({
                            date: dayItem.date,
                            dateStr: dayItem.dateKeyPattern,
                            entries: dayItem.entries
                          })}
                          className="w-full text-center py-0.5 text-[9px] font-extrabold text-[#2F6798] dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                        >
                          +{dayItem.entries.length - 3} more staff
                        </button>
                      )}
                    </div>

                    {/* Quick status summary dots on footer */}
                    {hasEntries && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-[8px] font-black">
                        {dayItem.statusCounts['Okay'] > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {dayItem.statusCounts['Okay']}
                          </span>
                        )}
                        {dayItem.statusCounts['Shaky'] > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {dayItem.statusCounts['Shaky']}
                          </span>
                        )}
                        {(dayItem.statusCounts['Terminated'] > 0 || dayItem.statusCounts['Resigned'] > 0 || dayItem.statusCounts['Account Removed'] > 0) && (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {(dayItem.statusCounts['Terminated'] || 0) + (dayItem.statusCounts['Resigned'] || 0) + (dayItem.statusCounts['Account Removed'] || 0)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* TABLE VIEW CONTAINER */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-24 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2F6798]" />
                <p className="text-xs font-semibold">Loading traffic light records...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-24 text-slate-400">
                <ShieldCheck className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium text-slate-500">
                  {filterWithRemarksOnly ? 'No records with remarks found in this selection.' : 'No records found for this team / filter selection.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-horizontal-scrollbar touch-pan-x">
                <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                  <thead className="bg-[#2F6798] dark:bg-[#24527a] text-white uppercase tracking-wider text-[10px] font-black border-b border-blue-900/40">
                    <tr>
                      <th className="px-3 py-1.5 sticky left-0 bg-[#2F6798] dark:bg-[#24527a] z-20 min-w-[105px] text-center border-r border-blue-400/20">
                        START DATE
                      </th>
                      <th className="px-3 py-1.5 sticky left-[105px] bg-[#2F6798] dark:bg-[#24527a] z-20 min-w-[125px] text-left border-r border-blue-400/20">
                        POSITION
                      </th>
                      <th className="px-4 py-1.5 sticky left-[230px] bg-[#2F6798] dark:bg-[#24527a] z-20 min-w-[220px] text-left border-r border-blue-400/20 shadow-xs">
                        {account === 'trainers' ? 'TRAINER NAME' : account === 'all' ? 'ACCOUNT & TRAINEE' : 'EMPLOYEE NAME'}
                      </th>
                      {displayedDateColumns.length === 0 ? (
                        <th className="px-6 py-2.5 text-center text-[11px] font-semibold text-blue-100 min-w-[280px]">
                          No date records found for {calendarCurrentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </th>
                      ) : (
                        displayedDateColumns.map((col) => {
                          const isLatest = col === latestDateColumn;
                          const dayOfWeek = getDayOfWeek(col);
                          const dateLabel = getFormattedDateLabel(col);
                          return (
                            <th
                              key={col}
                              className={`px-3 py-1.5 text-center min-w-[145px] border-r border-blue-400/20 last:border-r-0 ${
                                isLatest ? 'bg-[#1d4c75] text-amber-300 font-black' : 'text-white'
                              }`}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9.5px] font-bold tracking-wider text-blue-100 uppercase">
                                  {dayOfWeek}
                                </span>
                                <span className="text-[11px] font-black tracking-wide">
                                  {dateLabel}
                                </span>
                                {isLatest && (
                                  <span className="bg-amber-400 text-slate-900 text-[7.5px] font-black px-1.5 py-0.2 rounded mt-0.5 tracking-wider">
                                    LATEST
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                    {paginatedData.map((row, index) => {
                      const originalDataIndex = data.findIndex(d => (d.id && d.id === row.id) || (d[nameColumnKey] === row[nameColumnKey] && d._account === row._account));
                      const actualIndex = originalDataIndex !== -1 ? originalDataIndex : index;
                      const nameVal = String(row[nameColumnKey] || '').trim();
                      const isAccountHeader = row.isAccountHeader || nameVal.toUpperCase().startsWith('ACCOUNT:');
                      const isTeamHeader = nameVal.toUpperCase().startsWith('TEAM');

                      if (isAccountHeader) {
                        return (
                          <tr
                            key={`acc_${index}_${nameVal}`}
                            className="bg-[#2F6798]/15 dark:bg-[#2F6798]/30 text-[#2F6798] dark:text-blue-300 font-black text-xs uppercase tracking-wider"
                          >
                            <td
                              colSpan={Math.max(1, displayedDateColumns.length) + 3}
                              className="px-4 py-2.5 sticky left-0 bg-blue-50/95 dark:bg-slate-800/95 z-10 border-y border-blue-200/80 dark:border-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#2F6798]" />
                                <span className="font-extrabold tracking-wide">{nameVal}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      if (isTeamHeader) {
                        return (
                          <tr
                            key={`team_${index}_${nameVal}`}
                            className="bg-slate-100/80 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-black text-xs uppercase tracking-wider"
                          >
                            <td
                              colSpan={Math.max(1, displayedDateColumns.length) + 3}
                              className="px-4 py-2.5 sticky left-0 bg-slate-100/90 dark:bg-slate-800/90 z-10 border-y border-slate-200/80 dark:border-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#2F6798]" />
                                <span>{nameVal}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const initials = getInitials(nameVal);

                      return (
                        <tr
                          key={row.id || `${actualIndex}_${nameVal}`}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Start Date */}
                          <td className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 min-w-[105px]">
                            {row.startDate || row.start_date || '-'}
                          </td>

                          {/* Position */}
                          <td className="px-3 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 sticky left-[105px] bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 min-w-[125px]">
                            <span className="truncate block">{row.position || (account === 'trainers' ? 'Trainer' : 'Trainee')}</span>
                          </td>

                          {/* Employee Name Column with 2-letter Avatar Initial */}
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 sticky left-[230px] bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-700 shadow-xs min-w-[220px]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#2F6798]/10 dark:bg-[#2F6798]/20 text-[#2F6798] dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0 border border-[#2F6798]/20 shadow-2xs">
                                {initials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                  {nameVal}
                                </span>
                                {row._account === 'trainers' ? (
                                  row.accounts ? (
                                    <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                      Accounts: {row.accounts}
                                    </span>
                                  ) : null
                                ) : (
                                  row.assigned_trainer && row.assigned_trainer !== 'Unassigned' && (
                                    <span className="text-[9.5px] text-[#2F6798] dark:text-blue-400 font-semibold truncate flex items-center gap-1">
                                      <span>TR: {row.assigned_trainer}</span>
                                      {row.accountName && (
                                        <span className="text-slate-400 dark:text-slate-500 font-normal">({row.accountName})</span>
                                      )}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Date Status Cells */}
                          {displayedDateColumns.length === 0 ? (
                            <td className="px-4 py-3 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                              No evaluation records for {calendarCurrentDate.toLocaleDateString('en-US', { month: 'long' })}
                            </td>
                          ) : (
                            displayedDateColumns.map((col) => {
                              const val = row[col];
                              const canEdit = checkCanEditRow(nameVal, row._account);
                              const isPending = pendingEdits[`${actualIndex}_${col}`];
                              const isLatest = col === latestDateColumn;
                              const remarkKey = `${nameVal}::${col}`;
                              const cellRemarksList = remarksMap[remarkKey] || [];
                              const existingRemark = cellRemarksList[cellRemarksList.length - 1]?.remarks;

                              return (
                                <td
                                  key={col}
                                  className={`px-2 py-2 text-center align-middle border-r border-slate-100 dark:border-slate-800/80 last:border-r-0 ${
                                    isLatest ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                                  }`}
                                >
                                  <StatusSelect
                                    value={val || ''}
                                    onChange={(newVal) => handleCellChange(actualIndex, col, newVal)}
                                    disabled={!canEdit}
                                    isPending={!!isPending}
                                    remark={existingRemark}
                                    remarksList={cellRemarksList}
                                    onOpenRemarks={() => handleOpenRemarks(nameVal, selectedTeam, col, val || '', actualIndex, row._account)}
                                  />
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer (Display 10 per page) */}
            {!isLoading && filteredData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing <strong className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredData.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredData.length}</strong> records
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                      Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                      </button>

                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                          .map((p, i, arr) => {
                            const prev = arr[i - 1];
                            const showEllipsis = prev && p - prev > 1;
                            return (
                              <div key={p} className="flex items-center">
                                {showEllipsis && <span className="px-1.5 text-xs text-slate-400">...</span>}
                                <button
                                  onClick={() => setCurrentPage(p)}
                                  className={`w-7 h-7 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    currentPage === p
                                      ? 'bg-[#2F6798] text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                      >
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL POPUP FOR SELECTED CALENDAR DAY (VIEW ALL STAFF ROSTER ON THIS DATE) */}
      {selectedCalendarDay && mounted && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-[#2F6798] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {selectedCalendarDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {selectedCalendarDay.entries.length} staff recorded on this date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCalendarDay(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of staff on this day */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {selectedCalendarDay.entries.map((entry, idx) => {
                const cfg = getStatusConfig(entry.status);
                const noteCount = entry.remarksList?.length || 0;
                return (
                  <div
                    key={`${entry.staffName}_${idx}`}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#2F6798]/10 dark:bg-[#2F6798]/20 text-[#2F6798] dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0 border border-[#2F6798]/20">
                        {getInitials(entry.staffName)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {entry.staffName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {entry.rowAccount?.toUpperCase() || account.toUpperCase()} &middot; {entry.colKey}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                        cfg.badgeStyle
                      )}>
                        <span>{cfg.label}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCalendarDay(null);
                          handleOpenRemarks(entry.staffName, selectedTeam, entry.colKey, entry.status, entry.actualIndex, entry.rowAccount);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-xs font-bold text-[#2F6798] dark:text-blue-300 flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{noteCount > 0 ? `Remarks (${noteCount})` : 'Remarks'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCalendarDay(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SIDE-RIGHT DRAWER / MODAL FOR MULTI-REMARKS & HISTORY TIMELINE */}
      {activeRemarkModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-700">
            {/* Drawer Header */}
            <div className="p-6 bg-[#2F6798] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Remarks & History Timeline</h2>
                  <p className="text-xs text-white/75">Multi-entry notes for status tracking & coaching</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRemarkModal(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Employee / Wave Metadata Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee / Trainer</span>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{activeRemarkModal.staffName}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#2F6798]/10 text-[#2F6798] border border-[#2F6798]/20">
                    {accounts.find(a => a.id === account)?.name || account.toUpperCase()} &middot; {quarter.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Target Week</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{activeRemarkModal.columnKey}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Current Status</span>
                    {(() => {
                      const statusVal = activeRemarkModal.currentStatus;
                      const config = getStatusConfig(statusVal);
                      const StatusIcon = config.icon;
                      return (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                          config.badgeStyle
                        )}>
                          <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", config.iconColor)} />
                          <span>{config.label || statusVal || 'None'}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* SECTION 1: EXISTING REMARKS TIMELINE WITH ADVANCED SEARCH, SORT & FILTERS */}
              {(() => {
                const modalKey = `${activeRemarkModal.staffName}::${activeRemarkModal.columnKey}`;
                const rawList = remarksMap[modalKey] || [];
                const totalNotes = rawList.length;

                const targetModalAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);
                const isTrainerAccountModal = targetModalAccount === 'trainers' || targetModalAccount === 'leaders';
                const isOwnModalRow = checkIsOwnTrainerRow(activeRemarkModal.staffName);
                const canManageActiveRemarks = Boolean(
                  (isPrivilegedAdmin && currentRole !== 'VIEW_ADMIN') ||
                  (isTrainer && !isTrainerAccountModal && !isOwnModalRow)
                );

                // Associate each note with its original 1-based chronological index
                const indexedList = rawList.map((item, idx) => ({
                  ...item,
                  originalIndex: idx + 1,
                  isLatest: idx === rawList.length - 1
                }));

                // Extract dynamic tag counts from the notes
                const tagCounts: Record<string, number> = {};
                QUICK_REASON_TAGS.forEach(t => {
                  const count = rawList.filter(item => 
                    item.remarks.toLowerCase().includes(t.label.toLowerCase()) || 
                    item.remarks.toLowerCase().includes(t.text.split(':')[0].toLowerCase())
                  ).length;
                  if (count > 0) tagCounts[t.label] = count;
                });

                // Apply Tag Filter
                let filteredList = indexedList;
                if (drawerTagFilter !== 'ALL') {
                  filteredList = filteredList.filter(item =>
                    item.remarks.toLowerCase().includes(drawerTagFilter.toLowerCase())
                  );
                }

                // Apply Search Query Filter
                if (drawerSearchQuery.trim()) {
                  const q = drawerSearchQuery.trim().toLowerCase();
                  filteredList = filteredList.filter(item =>
                    item.remarks.toLowerCase().includes(q) ||
                    (item.traffic_status && item.traffic_status.toLowerCase().includes(q)) ||
                    `note #${item.originalIndex}`.includes(q)
                  );
                }

                // Apply Sort Order (Newest First by default for rapid review)
                const sortedList = [...filteredList].sort((a, b) => {
                  if (drawerSortOrder === 'newest') {
                    return b.originalIndex - a.originalIndex;
                  }
                  return a.originalIndex - b.originalIndex;
                });

                // Determine notes displayed in drawer (top 2 if not showAll / not searching)
                const isSearchingOrFiltering = Boolean(drawerSearchQuery.trim() || drawerTagFilter !== 'ALL');
                const displayedList = (showAllInDrawer || isSearchingOrFiltering)
                  ? sortedList
                  : sortedList.slice(0, 2);

                return (
                  <div className="space-y-2">
                    {/* Header & Controls Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5 text-[#C8A54B]" />
                            <span>Timeline History</span>
                          </label>
                          <span className="px-1.5 py-0.2 rounded-md bg-[#C8A54B]/20 text-[#8e6e22] dark:text-[#f3d994] text-[8px] font-black">
                            {totalNotes} {totalNotes === 1 ? 'Note' : 'Notes'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {totalNotes > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsFullHistoryModalOpen(true)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-[#C8A54B]/15 hover:bg-[#C8A54B]/25 text-[#8e6e22] dark:text-[#f3d994] border border-[#C8A54B]/40 transition-all cursor-pointer shadow-2xs"
                              title="Open full view modal popup"
                            >
                              <ExternalLink className="w-2 h-2" />
                              <span>Full View</span>
                            </button>
                          )}

                          {/* Sort Order Toggle */}
                          {totalNotes > 1 && (
                            <button
                              type="button"
                              onClick={() => setDrawerSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer shadow-2xs"
                              title="Toggle note sorting order"
                            >
                              <ArrowUpDown className="w-2 h-2 text-[#2F6798]" />
                              <span>{drawerSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Search Bar & Tag Chips */}
                      {totalNotes > 1 && (
                        <div className="space-y-1">
                          {/* Search Input styled like Image 2 */}
                          <div className="relative">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={drawerSearchQuery}
                              onChange={(e) => setDrawerSearchQuery(e.target.value)}
                              placeholder="Type name or batch..."
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-lg pl-8 pr-6 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] shadow-2xs transition-all"
                            />
                            {drawerSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setDrawerSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          {/* Quick Tag Filter Pills */}
                          {Object.keys(tagCounts).length > 0 && (
                            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[8.5px]">
                              <button
                                type="button"
                                onClick={() => setDrawerTagFilter('ALL')}
                                className={cn(
                                  "px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer shrink-0",
                                  drawerTagFilter === 'ALL'
                                    ? "bg-[#2F6798] text-white shadow-2xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                )}
                              >
                                All ({totalNotes})
                              </button>
                              {Object.entries(tagCounts).map(([tagName, count]) => (
                                <button
                                  key={tagName}
                                  type="button"
                                  onClick={() => setDrawerTagFilter(prev => prev === tagName ? 'ALL' : tagName)}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer shrink-0 border",
                                    drawerTagFilter === tagName
                                      ? "bg-[#C8A54B] text-white border-[#C8A54B] shadow-2xs font-bold"
                                      : "bg-[#FFFDF7] dark:bg-slate-900 text-[#8e6e22] dark:text-[#f3d994] border-[#C8A54B]/40 hover:bg-[#C8A54B]/15"
                                  )}
                                >
                                  {tagName} ({count})
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Filter / Search Match Count Notice */}
                          {(drawerSearchQuery || drawerTagFilter !== 'ALL') && (
                            <div className="flex items-center justify-between text-[8.5px] text-slate-500 dark:text-slate-400 px-0.5 font-medium">
                              <span>
                                Showing <strong className="text-slate-700 dark:text-slate-200">{sortedList.length}</strong> of {totalNotes} remarks
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerSearchQuery('');
                                  setDrawerTagFilter('ALL');
                                }}
                                className="text-[#2F6798] hover:underline font-bold cursor-pointer"
                              >
                                Reset filters
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Feed Container with dedicated scrollbar for long histories */}
                    {totalNotes === 0 ? (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                        <MessageSquarePlus className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">No remarks logged yet</p>
                        <p className="text-[9px] text-slate-400">
                          {canManageActiveRemarks ? 'Use the form below to post the first remark or coaching note.' : 'Remarks will appear here once logged by administrators.'}
                        </p>
                      </div>
                    ) : sortedList.length === 0 ? (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                        <Search className="w-4 h-4 text-slate-400 mx-auto" />
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">No notes match your filter</p>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawerSearchQuery('');
                            setDrawerTagFilter('ALL');
                          }}
                          className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#2F6798] text-white hover:bg-[#24527a] transition-all cursor-pointer shadow-xs"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {displayedList.map((item) => {
                          const isEditing = editingRemarkId === item.metric_id;

                          return (
                            <div
                              key={item.metric_id}
                              className={cn(
                                "p-2 rounded-lg bg-[#FFFDF7] dark:bg-[#231C10]/60 border transition-all space-y-1 shadow-2xs hover:shadow-xs",
                                item.isLatest
                                  ? "border-[#C8A54B] dark:border-[#C8A54B] ring-1 ring-[#C8A54B]/30"
                                  : "border-[#C8A54B]/40 dark:border-[#C8A54B]/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider bg-[#C8A54B]/25 text-[#8e6e22] dark:text-[#f3d994] flex items-center gap-1">
                                    <span>Note #{item.originalIndex}</span>
                                    {item.isLatest && (
                                      <span className="text-[7.5px] bg-[#C8A54B] text-white px-1 py-0 rounded-full flex items-center gap-0.5 font-bold">
                                        <Sparkles className="w-1.5 h-1.5" /> Latest
                                      </span>
                                    )}
                                  </span>
                                  {item.traffic_status && (
                                    <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-semibold">
                                      &bull; {item.traffic_status}
                                    </span>
                                  )}
                                </div>

                                {!isEditing && canManageActiveRemarks && (
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRemarkId(item.metric_id);
                                        setEditingDraft(item.remarks);
                                      }}
                                      className="p-0.5 rounded-md text-slate-400 hover:text-[#2F6798] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all cursor-pointer"
                                      title="Edit Note"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRemarkId(item.metric_id)}
                                      className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                                      title="Delete Note"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="space-y-1 pt-0.5">
                                  <textarea
                                    rows={2}
                                    value={editingDraft}
                                    onChange={(e) => setEditingDraft(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-[#C8A54B] rounded-md p-1.5 text-[10px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                                  />
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRemarkId(null);
                                        setEditingDraft('');
                                      }}
                                      className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isPostingRemark || !editingDraft.trim()}
                                      onClick={() => handleUpdateRemark(item.metric_id)}
                                      className="px-2.5 py-0.5 rounded-md text-[9px] font-bold bg-[#2F6798] hover:bg-[#24527a] text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    >
                                      {isPostingRemark ? <Loader2 className="w-2 h-2 animate-spin" /> : <Save className="w-2 h-2" />}
                                      <span>Save Edit</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-800 dark:text-slate-100 font-medium leading-normal whitespace-pre-wrap">
                                  {item.remarks}
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {/* View All / Show More Action Buttons */}
                        {totalNotes > 2 && !isSearchingOrFiltering && (
                          <div className="pt-0.5 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setIsFullHistoryModalOpen(true)}
                              className="h-6 px-2.5 rounded-md bg-[#C8A54B]/10 hover:bg-[#C8A54B]/20 border border-[#C8A54B]/50 text-[#8e6e22] dark:text-[#f3d994] text-[8.5px] font-bold transition-all inline-flex items-center justify-center gap-1 shadow-2xs cursor-pointer hover:border-[#C8A54B]"
                            >
                              <ExternalLink className="w-2.5 h-2.5 text-[#C8A54B]" />
                              <span>View All {totalNotes} Remarks</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowAllInDrawer(prev => !prev)}
                              className="h-6 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[8.5px] font-bold transition-all inline-flex items-center justify-center gap-1 cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                            >
                              <span>{showAllInDrawer ? 'Show Less' : `+${totalNotes - 2} More`}</span>
                              <ChevronDown className={cn("w-2 h-2 transition-transform", showAllInDrawer ? "rotate-180" : "")} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SECTION 2: ADD NEW REMARK COMPOSER (ADMIN OR ASSIGNED TRAINER ONLY) */}
              {(() => {
                const targetModalAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);
                const isTrainerAccountModal = targetModalAccount === 'trainers' || targetModalAccount === 'leaders';
                const isOwnModalRow = checkIsOwnTrainerRow(activeRemarkModal.staffName);
                const canManageActiveRemarks = Boolean(
                  (isPrivilegedAdmin && currentRole !== 'VIEW_ADMIN') ||
                  (isTrainer && !isTrainerAccountModal && !isOwnModalRow)
                );

                if (!canManageActiveRemarks) {
                  return (
                    <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/80">
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-medium">Trainer remarks are view-only. Only Administrators can add, edit, or delete remarks on trainer records.</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-[#2F6798]" />
                        <span>Add New Remark</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {newRemarkDraft.length} characters
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_REASON_TAGS.map((tag) => {
                        const TagIcon = tag.icon;
                        return (
                          <button
                            key={tag.label}
                            type="button"
                            onClick={() => {
                              setNewRemarkDraft(prev => {
                                const trimmed = prev.trim();
                                if (!trimmed) return tag.text;
                                return `${trimmed}\n- ${tag.text}`;
                              });
                            }}
                            className="px-2.5 py-1 text-[10px] font-semibold rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-600 flex items-center gap-1 shadow-2xs"
                          >
                            <TagIcon className="w-3 h-3 text-[#2F6798]" />
                            <span>{tag.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* New Remark Input */}
                    <textarea
                      rows={4}
                      value={newRemarkDraft}
                      onChange={(e) => setNewRemarkDraft(e.target.value)}
                      placeholder="Type a new remark or update for this employee (e.g. coaching notes, absences, progress, documentation)..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] transition-all shadow-2xs"
                    />

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isPostingRemark || !newRemarkDraft.trim()}
                        onClick={handleAddRemark}
                        className="px-5 py-2.5 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPostingRemark ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span>Post Remark</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
              <span className="text-[11px] text-slate-400">
                All notes are saved live and synchronized to all viewers.
              </span>
              <button
                type="button"
                onClick={() => setActiveRemarkModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CENTERED MODAL POPUP FOR FULL REMARKS HISTORY */}
      {isFullHistoryModalOpen && activeRemarkModal && mounted && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/65 backdrop-blur-sm animate-in fade-in duration-200 p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[88vh] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-[#2F6798] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold">All Remarks & Timeline History</h2>
                  <p className="text-xs text-white/80">
                    {activeRemarkModal.staffName} &middot; {activeRemarkModal.columnKey} ({accounts.find(a => a.id === account)?.name || account.toUpperCase()} - {quarter.toUpperCase()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullHistoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(() => {
                const modalKey = `${activeRemarkModal.staffName}::${activeRemarkModal.columnKey}`;
                const rawList = remarksMap[modalKey] || [];
                const totalNotes = rawList.length;

                const targetModalAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);
                const isTrainerAccountModal = targetModalAccount === 'trainers' || targetModalAccount === 'leaders';
                const isOwnModalRow = checkIsOwnTrainerRow(activeRemarkModal.staffName);
                const canManageActiveRemarks = Boolean(
                  (isPrivilegedAdmin && currentRole !== 'VIEW_ADMIN') ||
                  (isTrainer && !isTrainerAccountModal && !isOwnModalRow)
                );

                const indexedList = rawList.map((item, idx) => ({
                  ...item,
                  originalIndex: idx + 1,
                  isLatest: idx === rawList.length - 1
                }));

                const tagCounts: Record<string, number> = {};
                QUICK_REASON_TAGS.forEach(t => {
                  const count = rawList.filter(item => 
                    item.remarks.toLowerCase().includes(t.label.toLowerCase()) || 
                    item.remarks.toLowerCase().includes(t.text.split(':')[0].toLowerCase())
                  ).length;
                  if (count > 0) tagCounts[t.label] = count;
                });

                let filteredList = indexedList;
                if (drawerTagFilter !== 'ALL') {
                  filteredList = filteredList.filter(item =>
                    item.remarks.toLowerCase().includes(drawerTagFilter.toLowerCase())
                  );
                }

                if (drawerSearchQuery.trim()) {
                  const q = drawerSearchQuery.trim().toLowerCase();
                  filteredList = filteredList.filter(item =>
                    item.remarks.toLowerCase().includes(q) ||
                    (item.traffic_status && item.traffic_status.toLowerCase().includes(q)) ||
                    `note #${item.originalIndex}`.includes(q)
                  );
                }

                const sortedList = [...filteredList].sort((a, b) => {
                  if (drawerSortOrder === 'newest') {
                    return b.originalIndex - a.originalIndex;
                  }
                  return a.originalIndex - b.originalIndex;
                });

                return (
                  <div className="space-y-4">
                    {/* Search & Filter bar */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Showing {sortedList.length} of {totalNotes} Remarks
                        </span>
                        <button
                          type="button"
                          onClick={() => setDrawerSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer shadow-2xs"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#2F6798]" />
                          <span>{drawerSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
                        </button>
                      </div>

                      {/* Search Bar styled identical to Image 2 */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={drawerSearchQuery}
                          onChange={(e) => setDrawerSearchQuery(e.target.value)}
                          placeholder="Type name or batch..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl pl-11 pr-9 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] shadow-2xs transition-all"
                        />
                        {drawerSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setDrawerSearchQuery('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Quick Tag Filter Pills */}
                      {Object.keys(tagCounts).length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-xs">
                          <button
                            type="button"
                            onClick={() => setDrawerTagFilter('ALL')}
                            className={cn(
                              "px-3 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0",
                              drawerTagFilter === 'ALL'
                                ? "bg-[#2F6798] text-white shadow-2xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                            )}
                          >
                            All ({totalNotes})
                          </button>
                          {Object.entries(tagCounts).map(([tagName, count]) => (
                            <button
                              key={tagName}
                              type="button"
                              onClick={() => setDrawerTagFilter(prev => prev === tagName ? 'ALL' : tagName)}
                              className={cn(
                                "px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer shrink-0 border",
                                drawerTagFilter === tagName
                                  ? "bg-[#C8A54B] text-white border-[#C8A54B] shadow-2xs font-bold"
                                  : "bg-[#FFFDF7] dark:bg-slate-900 text-[#8e6e22] dark:text-[#f3d994] border-[#C8A54B]/40 hover:bg-[#C8A54B]/15"
                              )}
                            >
                              {tagName} ({count})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Full List of Remarks */}
                    {sortedList.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                        <Search className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No matching remarks found</p>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawerSearchQuery('');
                            setDrawerTagFilter('ALL');
                          }}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#2F6798] text-white hover:bg-[#24527a] cursor-pointer"
                        >
                          Clear Search & Filter
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                        {sortedList.map((item) => {
                          const isEditing = editingRemarkId === item.metric_id;

                          return (
                            <div
                              key={item.metric_id}
                              className={cn(
                                "p-2.5 rounded-xl bg-[#FFFDF7] dark:bg-[#231C10]/60 border transition-all space-y-1 shadow-2xs",
                                item.isLatest
                                  ? "border-[#C8A54B] dark:border-[#C8A54B] ring-1 ring-[#C8A54B]/30"
                                  : "border-[#C8A54B]/40 dark:border-[#C8A54B]/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 rounded-md text-[8.5px] font-black uppercase tracking-wider bg-[#C8A54B]/25 text-[#8e6e22] dark:text-[#f3d994] flex items-center gap-1">
                                    <span>Note #{item.originalIndex}</span>
                                    {item.isLatest && (
                                      <span className="text-[7.5px] bg-[#C8A54B] text-white px-1.5 py-0 rounded-full flex items-center gap-0.5 font-bold">
                                        <Sparkles className="w-1.5 h-1.5" /> Latest
                                      </span>
                                    )}
                                  </span>
                                  {item.traffic_status && (
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                                      &bull; {item.traffic_status}
                                    </span>
                                  )}
                                </div>

                                {!isEditing && canManageActiveRemarks && (
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRemarkId(item.metric_id);
                                        setEditingDraft(item.remarks);
                                      }}
                                      className="p-1 rounded-md text-slate-400 hover:text-[#2F6798] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all cursor-pointer"
                                      title="Edit Note"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRemarkId(item.metric_id)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                                      title="Delete Note"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="space-y-1 pt-0.5">
                                  <textarea
                                    rows={2}
                                    value={editingDraft}
                                    onChange={(e) => setEditingDraft(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-[#C8A54B] rounded-lg p-2 text-[10.5px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                                  />
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRemarkId(null);
                                        setEditingDraft('');
                                      }}
                                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isPostingRemark || !editingDraft.trim()}
                                      onClick={() => handleUpdateRemark(item.metric_id)}
                                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#2F6798] hover:bg-[#24527a] text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    >
                                      {isPostingRemark ? <Loader2 className="w-2 h-2 animate-spin" /> : <Save className="w-2 h-2" />}
                                      <span>Save Edit</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[10.5px] text-slate-800 dark:text-slate-100 font-medium leading-normal whitespace-pre-wrap">
                                  {item.remarks}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live timeline updated in real-time
              </span>
              <button
                type="button"
                onClick={() => setIsFullHistoryModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close Full View
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Centered Modal Loading Dialog during Save */}
      {isSaving && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col items-center gap-3 min-w-[260px] text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Saving Changes</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Please wait while your updates are being saved...</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Dialog for Deleting Remark */}
      {confirmDeleteRemarkId && mounted && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-700 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/80 dark:border-rose-900/60 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Delete Remark Note?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            {/* Note text preview */}
            {(() => {
              const modalKey = activeRemarkModal ? `${activeRemarkModal.staffName}::${activeRemarkModal.columnKey}` : '';
              const targetNote = (remarksMap[modalKey] || []).find(n => n.metric_id === confirmDeleteRemarkId);
              if (!targetNote) return null;

              return (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-700 dark:text-slate-300 italic line-clamp-3">
                  "{targetNote.remarks}"
                </div>
              );
            })()}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to permanently remove this note from the timeline history?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
              <button
                type="button"
                disabled={isDeletingRemarkId === confirmDeleteRemarkId}
                onClick={() => setConfirmDeleteRemarkId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRemarkId === confirmDeleteRemarkId}
                onClick={() => handleDeleteRemarkItem(confirmDeleteRemarkId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingRemarkId === confirmDeleteRemarkId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes, Delete Note</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Bottom-Right Action Bar for Save Changes & Discard */}
      {pendingCount > 0 && mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-[9990] flex items-center gap-3 p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 animate-in slide-in-from-bottom-5 fade-in duration-200 ring-1 ring-black/5">
          <div className="flex items-center gap-2 pl-2 pr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {pendingCount} unsaved {pendingCount === 1 ? 'change' : 'changes'}
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

          <button
            type="button"
            onClick={handleDiscardEdits}
            disabled={isSaving}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Discard
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes ({pendingCount})
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
