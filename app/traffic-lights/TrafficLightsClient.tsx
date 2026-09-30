'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  ExternalLink
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
  { value: '', label: 'None', icon: Circle, color: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700', iconColor: 'text-slate-400', badgeStyle: 'bg-slate-50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800' },
  { value: 'Okay', label: 'Okay', icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-bold', iconColor: 'text-emerald-600 dark:text-emerald-400', badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-bold shadow-2xs' },
  { value: 'Shaky', label: 'Shaky', icon: AlertTriangle, color: 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 font-bold', iconColor: 'text-amber-600 dark:text-amber-400', badgeStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 font-bold shadow-2xs' },
  { value: 'Terminated', label: 'Terminated', icon: XCircle, color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold', iconColor: 'text-rose-600 dark:text-rose-400', badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 font-bold shadow-2xs' },
  { value: 'Resigned', label: 'Resigned', icon: UserMinus, color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold', iconColor: 'text-rose-600 dark:text-rose-400', badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 font-bold shadow-2xs' },
  { value: 'Account Removed', label: 'Account Removed', icon: UserX, color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold', iconColor: 'text-rose-600 dark:text-rose-400', badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 font-bold shadow-2xs' },
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
  if (!accId || !traineeAcc) return false;
  const cleanId = accId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTrainee = traineeAcc.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (cleanId === cleanTrainee) return true;
  if (cleanTrainee.includes(cleanId) || cleanId.includes(cleanTrainee)) return true;
  
  // Specific alias mappings:
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
  if ((cleanId === 'otheracc' || cleanId === 'other') && ['spa', 'cova', 'soas', 'corpqa', 'cts', 'bilingualcsr'].some(s => cleanTrainee.includes(s))) return true;

  return false;
}

export default function TrafficLightsClient({ initialAccounts }: { initialAccounts?: { id: string; name: string }[] }) {
  const { actualRole, role: simulatedRole, email, userName, userMeta } = useRole();
  const currentRole = simulatedRole || actualRole;
  const isTrainer = currentRole === 'TRAINER';
  const isTrainee = currentRole === 'TRAINEE';

  const accounts = (initialAccounts && initialAccounts.length > 0) ? initialAccounts : [
    { id: 'rm', name: 'RM' },
    { id: 'xpn', name: 'XPN' },
    { id: 'fleet', name: 'Fleet' },
    { id: 'leaders', name: 'Leaders' },
    { id: 'trainers', name: 'Trainers' },
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
        return trainerAccounts.some(ta => matchesTrafficLightAccount(acc.id, ta));
      });
      list = filtered.length > 0 ? filtered : accounts.filter(a => a.id.toLowerCase() === 'trainers');
    } else {
      list = accounts;
    }
    return [
      { id: 'all', name: 'All Accounts' },
      ...list.filter(a => a.id !== 'all')
    ];
  }, [accounts, isTrainer, trainerAccounts]);

  const [account, setAccount] = useState<string>(() => {
    if (isTrainer) return 'trainers';
    return accounts[0]?.id || 'rm';
  });

  useEffect(() => {
    if (visibleAccounts.length > 0 && !visibleAccounts.some(a => a.id === account)) {
      setAccount(visibleAccounts[0].id);
    }
  }, [visibleAccounts]);
  const [quarter, setQuarter] = useState('q2');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [data, setData] = useState<any[]>([]);
  const [allDateColumns, setAllDateColumns] = useState<string[]>([]);
  const [nameColumnKey, setNameColumnKey] = useState<string>('Teams');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'account' | 'quarter' | 'team' | null>(null);

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

  // UX ENHANCEMENT CONTROLS: WEEK WINDOW & SORT ORDER
  const [weekWindow, setWeekWindow] = useState<'last4' | 'last8' | 'all'>('last4');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Close custom dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
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
    
    // Scoped accounts list when account === 'all'
    const accountsScope = visibleAccounts.filter(a => a.id !== 'all').map(a => a.id);

    try {
      // Fetch data and remarks concurrently
      const [resultData, resultRemarks] = await Promise.all([
        getTrafficLightData(account, quarter, accountsScope),
        getTrafficLightRemarks(account, quarter, accountsScope)
      ]);

      if (resultRemarks.data) {
        setRemarksMap(resultRemarks.data);
      }

      if (resultData.error || !resultData.data || resultData.data.length === 0) {
        if (resultData.error) console.error('Error fetching traffic light data:', resultData.error);
        setData([]);
        setAllDateColumns([]);
      } else {
        processData(resultData.data);
      }
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

    // Supabase Realtime subscription to reflect remarks to everyone instantly
    const channel = supabase
      .channel(`traffic_light_realtime_${account}_${quarter}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'traffic_light_metrics' },
        () => {
          const accountsScope = visibleAccounts.filter(a => a.id !== 'all').map(a => a.id);
          getTrafficLightRemarks(account, quarter, accountsScope).then(res => {
            if (res.data) setRemarksMap(res.data);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [account, quarter, visibleAccounts]);

  // Dynamically compute active displayed columns based on weekWindow & sortOrder
  const displayedDateColumns = useMemo(() => {
    let dates = [...allDateColumns];

    // 1. Filter by Week Window
    if (weekWindow === 'last4') {
      dates = dates.slice(-4);
    } else if (weekWindow === 'last8') {
      dates = dates.slice(-8);
    }

    // 2. Sort Order (Newest First puts latest week directly next to Employee Name)
    if (sortOrder === 'newest') {
      dates.reverse();
    }

    return dates;
  }, [allDateColumns, weekWindow, sortOrder]);

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

  // Check if current user is authorized to edit a specific row
  const checkCanEditRow = (rowStaffName: string, rowAccount?: string) => {
    const canEditAll = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'].includes(currentRole);
    if (canEditAll) return true;

    const targetAccount = rowAccount || account;

    if (isTrainer) {
      // If viewing assigned client accounts (e.g. DFT, AWD, etc.), trainer can edit their trainees!
      if (targetAccount !== 'trainers') {
        const isAssignedAccount = (
          trainerAccounts.some(ta => matchesTrafficLightAccount(targetAccount, ta)) ||
          visibleAccounts.some(va => va.id === targetAccount || va.id === 'all')
        );
        if (isAssignedAccount) return true;
      }

      // On 'trainers' account, trainer can ONLY edit their own record
      const cleanStaff = rowStaffName.toLowerCase().trim();
      const userEmailStr = (email || '').toLowerCase().trim();
      const userEmailHandle = userEmailStr.split('@')[0];
      const userNameStr = (userName || '').toLowerCase().trim();

      const isOwnRow = Boolean(
        (userEmailStr && (userEmailStr.includes(cleanStaff.replace(/\s+/g, '')) || userEmailHandle.includes(cleanStaff) || cleanStaff.includes(userEmailHandle))) ||
        (userNameStr && (isTrainerMatch(cleanStaff, userNameStr) || userNameStr.includes(cleanStaff) || cleanStaff.includes(userNameStr)))
      );
      return isOwnRow;
    }

    const cleanStaff = rowStaffName.toLowerCase().trim();
    const userEmailStr = (email || '').toLowerCase().trim();
    const userEmailHandle = userEmailStr.split('@')[0];
    const userNameStr = (userName || '').toLowerCase().trim();

    const isOwnRow = Boolean(
      (userEmailStr && (userEmailStr.includes(cleanStaff.replace(/\s+/g, '')) || userEmailHandle.includes(cleanStaff) || cleanStaff.includes(userEmailHandle))) ||
      (userNameStr && (userNameStr.includes(cleanStaff) || cleanStaff.includes(userNameStr)))
    );

    return isOwnRow;
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
    setIsPostingRemark(true);

    const { staffName, columnKey, currentStatus } = activeRemarkModal;
    const authorName = email || 'Authorized Manager';
    const targetAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);

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
    setIsPostingRemark(true);

    const { staffName, columnKey } = activeRemarkModal;
    const authorName = email || 'Authorized Manager';
    const targetAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);

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
    setIsDeletingRemarkId(metric_id);

    const { staffName, columnKey } = activeRemarkModal;
    const authorName = email || 'Authorized Manager';
    const targetAccount = activeRemarkModal.account || (account === 'all' ? 'trainers' : account);

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

      // 1. In Trainers account: Trainers can ONLY see their own record (they cannot see other trainers)
      if (rowAccount === 'trainers' && isTrainer && (userName || email)) {
        const qName = (userName || '').toLowerCase().trim();
        const qEmail = (email || '').toLowerCase().split('@')[0].trim();
        const lowerName = nameVal.toLowerCase().trim();
        const isOwnTrainerRow = (
          (userName && isTrainerMatch(nameVal, userName)) ||
          (qName && (lowerName.includes(qName) || qName.includes(lowerName))) ||
          (qEmail && (lowerName.includes(qEmail) || qEmail.includes(lowerName)))
        );
        if (!isOwnTrainerRow) return false;
      }

      // 2. In Client/Trainee Accounts (e.g. DFT, FLEXAR): Trainers only see their specific assigned trainees from the database
      if (isTrainer && rowAccount !== 'trainers') {
        const rowTrainer = String(row.assigned_trainer || '').trim();
        const qName = (userName || '').toLowerCase().trim();
        const qEmail = (email || '').toLowerCase().split('@')[0].trim();
        const cleanTraineeName = nameVal.toLowerCase().trim();

        const isDirectTrainerMatch = Boolean(
          (rowTrainer && userName && isTrainerMatch(rowTrainer, userName)) ||
          (rowTrainer && qName && (rowTrainer.toLowerCase().includes(qName) || qName.includes(rowTrainer.toLowerCase()))) ||
          (rowTrainer && qEmail && (rowTrainer.toLowerCase().includes(qEmail) || qEmail.includes(rowTrainer.toLowerCase().replace(/\s+/g, ''))))
        );

        const isNameAssigned = trainerTraineeNames.length > 0 && trainerTraineeNames.some(tn => {
          const cleanTn = tn.toLowerCase().trim();
          return cleanTn === cleanTraineeName ||
                 cleanTraineeName.includes(cleanTn) ||
                 cleanTn.includes(cleanTraineeName) ||
                 isTrainerMatch(cleanTraineeName, cleanTn);
        });

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

      // Team filter
      if (teamsList.length > 0) {
        if (selectedTeam !== 'ALL' && currentTeamName !== selectedTeam) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        if (!nameVal.toLowerCase().includes(searchQuery.toLowerCase())) {
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
  }, [data, nameColumnKey, isTrainer, isTrainee, account, userName, email, selectedTeam, searchQuery, teamsList, filterWithRemarksOnly, displayedDateColumns, remarksMap, trainerTraineeNames]);

  // Pagination State (Display 10 per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [account, quarter, selectedTeam, searchQuery, filterWithRemarksOnly]);

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
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all animate-bounce"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes ({pendingCount})
              </button>
              <button
                onClick={handleDiscardEdits}
                disabled={isSaving}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Discard
              </button>
            </div>
          )}

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
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-40 pointer-events-none select-none opacity-[0.45] dark:opacity-[0.25] group-hover:opacity-[0.65] dark:group-hover:opacity-[0.45] transition-all duration-300 transform group-hover:scale-105 z-0">
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

      {/* ONE SINGLE UNIFIED EXTERNAL CONTAINER FOR FILTERS, WEEK WINDOW & TEAMS TABLE */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
        
        {/* Section 1: Global Filter Bar (Account, Quarter, Team, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          {/* Account Selector */}
          <div className="relative col-span-1 sm:col-span-1 lg:col-span-3" data-dropdown>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>SELECT ACCOUNT</span>
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'account' ? null : 'account')}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            >
              <span className="truncate">{visibleAccounts.find(a => a.id === account)?.name || account.toUpperCase()}</span>
              {openDropdown === 'account' ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {openDropdown === 'account' && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100/90 dark:border-slate-800 p-1.5 z-40 max-h-64 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
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
                        "w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors",
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

          {/* Quarter Selector */}
          <div className="relative col-span-1 sm:col-span-1 lg:col-span-2" data-dropdown>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>QUARTER</span>
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(prev => prev === 'quarter' ? null : 'quarter')}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            >
              <span className="truncate">{quarters.find(q => q.id === quarter)?.name || quarter}</span>
              {openDropdown === 'quarter' ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {openDropdown === 'quarter' && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100/90 dark:border-slate-800 p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95">
                {quarters.map((q) => {
                  const isSelected = quarter === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setQuarter(q.id);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors",
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

          {/* Team Filter Dropdown */}
          {teamsList.length > 0 && (
            <div className="relative col-span-1 sm:col-span-1 lg:col-span-3" data-dropdown>
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2F6798]" />
                <span>TEAM FILTER</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenDropdown(prev => prev === 'team' ? null : 'team')}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
              >
                <span className="truncate">
                  {selectedTeam === 'ALL' ? `All Teams (${teamsList.length})` : selectedTeam}
                </span>
                {openDropdown === 'team' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                )}
              </button>

              {openDropdown === 'team' && (
                <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100/90 dark:border-slate-800 p-1.5 z-40 max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeam('ALL');
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors",
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
                          "w-full text-left px-3.5 py-2 rounded-xl text-xs truncate transition-colors",
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
          )}

          {/* Search Employee Field */}
          <div className={cn("col-span-1 sm:col-span-2", teamsList.length > 0 ? "lg:col-span-4" : "lg:col-span-7")}>
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <Search className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>SEARCH EMPLOYEE</span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type name or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] shadow-2xs transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: WEEK WINDOW RANGE, CHRONOLOGICAL SORT & REMARKS FILTER CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
          {/* Left: Week Window Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#2F6798]" /> Week Window:
            </span>

            <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setWeekWindow('last4')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  weekWindow === 'last4'
                    ? 'bg-[#2F6798] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Last 4 Weeks
              </button>
              <button
                type="button"
                onClick={() => setWeekWindow('last8')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  weekWindow === 'last8'
                    ? 'bg-[#2F6798] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Last 8 Weeks
              </button>
              <button
                type="button"
                onClick={() => setWeekWindow('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  weekWindow === 'all'
                    ? 'bg-[#2F6798] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All ({allDateColumns.length} Weeks)
              </button>
            </div>
          </div>

          {/* Right: Remarks Filter & Chronological Sort Toggle */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterWithRemarksOnly(!filterWithRemarksOnly)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border",
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
              title="Switch column date ordering"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#2F6798]" />
              <span>{sortOrder === 'newest' ? 'Latest Week First' : 'Oldest Week First'}</span>
            </button>
          </div>
        </div>

        {/* Section 3: Teams Table Container */}
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
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-black border-b border-slate-200/80 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-slate-50/95 dark:bg-slate-800/95 z-20 shadow-xs min-w-[220px]">
                      {account === 'trainers' ? 'Trainers' : account === 'all' ? 'Account / Trainees' : 'Trainees & Cohort'}
                    </th>
                    {displayedDateColumns.map((col) => {
                      const isLatest = col === latestDateColumn;
                      return (
                        <th
                          key={col}
                          className={`px-3 py-3 text-center min-w-[155px] ${
                            isLatest ? 'bg-blue-100/60 dark:bg-blue-950/60 text-[#2F6798] dark:text-blue-300 font-extrabold' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {isLatest && (
                              <span className="bg-[#2F6798] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md tracking-wider">
                                LATEST
                              </span>
                            )}
                            <span>{col}</span>
                          </div>
                        </th>
                      );
                    })}
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
                            colSpan={displayedDateColumns.length + 1}
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
                            colSpan={displayedDateColumns.length + 1}
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

                    const initialLetter = nameVal.charAt(0).toUpperCase() || 'E';

                    return (
                      <tr
                        key={row.id || `${actualIndex}_${nameVal}`}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Employee Name Column */}
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 min-w-[220px]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
                              {initialLetter}
                            </div>
                            <span className="truncate text-xs font-bold tracking-tight">
                              {nameVal}
                            </span>
                          </div>
                        </td>

                        {/* Date Cells */}
                        {displayedDateColumns.map((col) => {
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
                              className={`px-2 py-2 text-center align-middle ${
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
                        })}
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

      </div>

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
                        <p className="text-[9px] text-slate-400">Use the form below to post the first remark or coaching note.</p>
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

                                {!isEditing && (
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

              {/* SECTION 2: ADD NEW REMARK COMPOSER */}
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

                                {!isEditing && (
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
                Live timeline synchronized with Supabase
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
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Updating traffic light records in database...</p>
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
    </div>
  );
}
