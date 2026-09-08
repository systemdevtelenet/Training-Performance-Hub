'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  LogOut
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import {
  getTrafficLightData,
  updateTrafficLightCell,
  getTrafficLightRemarks,
  saveTrafficLightRemark,
  deleteTrafficLightRemark
} from '@/lib/actions/traffic-lights';
import { cn } from '@/lib/utils';

export const STATUS_OPTIONS = [
  { value: '', label: 'None', icon: Circle, color: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700', iconColor: 'text-slate-400', badgeStyle: 'bg-slate-50 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800' },
  { value: 'Okay', label: 'Okay', icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-bold', iconColor: 'text-emerald-600 dark:text-emerald-400', badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-bold shadow-2xs' },
  { value: 'Shaky', label: 'Shaky', icon: AlertTriangle, color: 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 font-bold', iconColor: 'text-amber-600 dark:text-amber-400', badgeStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 font-bold shadow-2xs' },
  { value: 'Terminated', label: 'Terminated', icon: XCircle, color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold', iconColor: 'text-rose-600 dark:text-rose-400', badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 font-bold shadow-2xs' },
  { value: 'Resigned', label: 'Resigned', icon: UserMinus, color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold', iconColor: 'text-rose-600 dark:text-rose-400', badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 font-bold shadow-2xs' },
  { value: 'Account Removed', label: 'Account Removed', icon: UserX, color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold', iconColor: 'text-rose-600 dark:text-rose-400', badgeStyle: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 font-bold shadow-2xs' },
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
  onOpenRemarks
}: {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  isPending?: boolean;
  remark?: string;
  onOpenRemarks?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentConfig = getStatusConfig(value);
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="relative w-full flex items-center gap-1 group/cell" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
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

      {/* Remarks Note Trigger Button */}
      {onOpenRemarks && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRemarks();
            }}
            title={remark ? `Remark: "${remark}"` : 'Add note/remark for this status'}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0",
              remark
                ? "bg-[#C8A54B]/20 text-[#8e6e22] dark:bg-[#C8A54B]/30 dark:text-[#f3d994] border border-[#C8A54B]/50 shadow-2xs hover:bg-[#C8A54B]/30"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover/cell:opacity-100"
            )}
          >
            {remark ? (
              <MessageSquare className="w-3.5 h-3.5 fill-[#C8A54B]/30 text-[#8e6e22] dark:text-[#f3d994]" />
            ) : (
              <MessageSquarePlus className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Hover Tooltip for existing remarks */}
          {remark && (
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/cell:flex flex-col z-50 w-52 p-2.5 bg-slate-900/95 text-white text-[11px] rounded-xl shadow-2xl backdrop-blur-xs border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#C8A54B] uppercase tracking-wider mb-1">
                <MessageSquare className="w-3 h-3 text-[#C8A54B]" />
                <span>Remarks / Notes</span>
              </div>
              <p className="line-clamp-3 text-slate-200 leading-snug font-normal">
                {remark}
              </p>
              <span className="text-[9px] text-slate-400 mt-1">Click to edit or view full note</span>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-52 rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-2xl border border-slate-200/80 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
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
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all text-left ${
                  opt.color
                } ${isSelected ? 'bg-slate-100 dark:bg-slate-700/80 font-bold' : ''}`}
              >
                <OptIcon className={cn("w-3.5 h-3.5 shrink-0", opt.iconColor)} />
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
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl text-[#2F6798] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all text-left"
              >
                {remark ? <MessageSquare className="w-3.5 h-3.5" /> : <MessageSquarePlus className="w-3.5 h-3.5" />}
                <span>{remark ? 'Edit Remarks' : 'Add Remarks'}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrafficLightsClient({ initialAccounts }: { initialAccounts?: { id: string; name: string }[] }) {
  const { actualRole, role: simulatedRole, email } = useRole();
  const currentRole = simulatedRole || actualRole;

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

  const [account, setAccount] = useState(accounts[0]?.id || 'rm');
  const [quarter, setQuarter] = useState('q2');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [data, setData] = useState<any[]>([]);
  const [allDateColumns, setAllDateColumns] = useState<string[]>([]);
  const [nameColumnKey, setNameColumnKey] = useState<string>('Teams');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'account' | 'quarter' | 'team' | null>(null);

  // Remarks / Notes State
  const [remarksMap, setRemarksMap] = useState<Record<string, { metric_id: number; remarks: string; traffic_status?: string }>>({});
  const [filterWithRemarksOnly, setFilterWithRemarksOnly] = useState(false);
  const [activeRemarkModal, setActiveRemarkModal] = useState<{
    staffName: string;
    teamName: string;
    columnKey: string;
    currentStatus: string;
    remarks: string;
    rowIndex: number;
  } | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [isSavingRemark, setIsSavingRemark] = useState(false);

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
  const [toast, setToast] = useState<{ title: string; description: string; type: 'success' | 'info' | 'error' } | null>(null);

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
    
    // Fetch data and remarks concurrently
    const [resultData, resultRemarks] = await Promise.all([
      getTrafficLightData(account, quarter),
      getTrafficLightRemarks(account, quarter)
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
    setIsLoading(false);
  };

  const processData = (rawData: any[]) => {
    if (!rawData || rawData.length === 0) {
      setData([]);
      setAllDateColumns([]);
      return;
    }

    const firstRow = rawData[0];
    const allKeys = Object.keys(firstRow);
    const candidateNameKeys = ['teams', 'name', 'trainers', 'trainer', 'employee', 'staff'];
    const nameCol = allKeys.find(k => candidateNameKeys.includes(k.toLowerCase())) 
      || allKeys.find(k => !['id', 'created_at', 'account', 'position'].includes(k.toLowerCase())) 
      || allKeys[0];

    const excludeCols = ['id', 'created_at', 'account', 'position', nameCol.toLowerCase()];
    const dateCols = allKeys.filter(k => !excludeCols.includes(k.toLowerCase()));

    // Chronological date sort (earliest to latest)
    dateCols.sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      return 0;
    });

    // Filter out blank spacer rows where employee/team name is null or empty
    const cleanData = rawData.filter(row => {
      const val = row[nameCol];
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
  }, [account, quarter]);

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
      } else if (currentTeamName) {
        const teamObj = teams.find(t => t.name === currentTeamName);
        if (teamObj) teamObj.count++;
      }
    });

    return teams;
  }, [data, nameColumnKey]);

  // Handle local cell edit change
  const handleCellChange = (rowIndex: number, colKey: string, newValue: string) => {
    const canEditAll = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'].includes(currentRole);
    const rowName = String(data[rowIndex][nameColumnKey] || '').toLowerCase();
    const userEmailStr = (email || '').toLowerCase();
    const isOwnRow = userEmailStr && (userEmailStr.includes(rowName.replace(/\s+/g, '')) || userEmailStr.includes(rowName.split(' ')[0]));

    if (!canEditAll && !isOwnRow) {
      alert('You can only edit your own traffic light status.');
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
    rowIndex: number
  ) => {
    const key = `${staffName}::${columnKey}`;
    const existing = remarksMap[key]?.remarks || '';
    setRemarkDraft(existing);
    setActiveRemarkModal({
      staffName,
      teamName,
      columnKey,
      currentStatus,
      remarks: existing,
      rowIndex
    });
  };

  // Save Remark to Supabase
  const handleSaveRemark = async () => {
    if (!activeRemarkModal) return;
    setIsSavingRemark(true);

    const { staffName, columnKey, currentStatus } = activeRemarkModal;
    const res = await saveTrafficLightRemark({
      account,
      quarter,
      staffName,
      columnKey,
      status: currentStatus,
      remarks: remarkDraft
    });

    setIsSavingRemark(false);

    if (res.success) {
      const key = `${staffName}::${columnKey}`;
      setRemarksMap(prev => {
        const updated = { ...prev };
        if (remarkDraft.trim()) {
          updated[key] = {
            metric_id: res.metric_id || 0,
            remarks: remarkDraft.trim(),
            traffic_status: currentStatus
          };
        } else {
          delete updated[key];
        }
        return updated;
      });

      setToast({
        title: 'Remarks Saved',
        description: `Updated note for ${staffName} on ${columnKey}.`,
        type: 'success'
      });
      setActiveRemarkModal(null);
    } else {
      setToast({
        title: 'Failed to Save Remark',
        description: res.error || 'Server error occurred while saving note.',
        type: 'error'
      });
    }
  };

  // Delete Remark from Supabase
  const handleDeleteRemark = async () => {
    if (!activeRemarkModal) return;
    setIsSavingRemark(true);

    const { staffName, columnKey } = activeRemarkModal;
    const res = await deleteTrafficLightRemark({
      account,
      quarter,
      staffName,
      columnKey
    });

    setIsSavingRemark(false);

    if (res.success) {
      const key = `${staffName}::${columnKey}`;
      setRemarksMap(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });

      setToast({
        title: 'Remark Deleted',
        description: `Removed note for ${staffName} on ${columnKey}.`,
        type: 'info'
      });
      setActiveRemarkModal(null);
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

      const res = await updateTrafficLightCell({
        account,
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

  // Calculate live summary KPI metrics
  const kpis = useMemo(() => {
    let employeeCount = 0;
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;

    data.forEach(row => {
      const nameVal = String(row[nameColumnKey] || '').trim();
      if (!nameVal.toUpperCase().startsWith('TEAM')) {
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
  }, [data, allDateColumns, nameColumnKey]);

  // Total remarks count
  const totalRemarksCount = useMemo(() => {
    return Object.keys(remarksMap).length;
  }, [remarksMap]);

  // Filter Data by search, selected team, and optional remarks filter
  const filteredData = useMemo(() => {
    if (!data) return [];
    let currentTeamName = '';

    return data.filter((row) => {
      const nameVal = String(row[nameColumnKey] || '').trim();

      if (nameVal.toUpperCase().startsWith('TEAM')) {
        currentTeamName = nameVal;
        if (selectedTeam !== 'ALL' && currentTeamName !== selectedTeam) {
          return false;
        }
        return true;
      }

      if (teamsList.length > 0) {
        if (selectedTeam !== 'ALL' && currentTeamName !== selectedTeam) {
          return false;
        }
      }

      if (searchQuery) {
        if (!nameVal.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      if (filterWithRemarksOnly) {
        const hasAnyRemark = displayedDateColumns.some(col => {
          const key = `${nameVal}::${col}`;
          return !!remarksMap[key]?.remarks;
        });
        if (!hasAnyRemark) return false;
      }

      return true;
    });
  }, [data, nameColumnKey, selectedTeam, searchQuery, teamsList, filterWithRemarksOnly, displayedDateColumns, remarksMap]);

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

  return (
    <div className="space-y-4 w-full max-w-full px-0 pb-12 font-sans">
      {/* Top-Right Success Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-start gap-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 px-4 py-3 rounded-xl shadow-2xl transition-all animate-in slide-in-from-top-5 duration-200 min-w-[320px] max-w-sm ${
            toast.type === 'success'
              ? 'border-l-4 border-l-emerald-500'
              : toast.type === 'info'
              ? 'border-l-4 border-l-[#2F6798]'
              : 'border-l-4 border-l-rose-500'
          }`}
        >
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
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#2F6798]/10 text-[#2F6798] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            Traffic Light Monitoring
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Monitored Staff</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-0.5">{kpis.employeeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Okay Flags (Green)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{kpis.greenCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Shaky Flags (Amber)</p>
            <p className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-0.5">{kpis.amberCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Critical / Loss Flags</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{kpis.redCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
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
              <span className="truncate">{accounts.find(a => a.id === account)?.name || account.toUpperCase()}</span>
              {openDropdown === 'account' ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {openDropdown === 'account' && (
              <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100/90 dark:border-slate-800 p-1.5 z-40 max-h-64 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
                {accounts.map((acc) => {
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-black border-b border-slate-200/80 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-slate-50/95 dark:bg-slate-800/95 z-20 shadow-xs min-w-[220px]">
                      {nameColumnKey}
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
                  {filteredData.map((row, rowIndex) => {
                    const nameVal = String(row[nameColumnKey] || '').trim();
                    const isTeamHeader = nameVal.toUpperCase().startsWith('TEAM');

                    if (isTeamHeader) {
                      return (
                        <tr
                          key={`team_${rowIndex}`}
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
                        key={row.id || rowIndex}
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
                          const userEmailStr = (email || '').toLowerCase();
                          const canEditAll = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'].includes(currentRole);
                          const isOwnRow =
                            userEmailStr &&
                            (userEmailStr.includes(nameVal.toLowerCase().replace(/\s+/g, '')) ||
                              userEmailStr.includes(nameVal.toLowerCase().split(' ')[0]));
                          const canEdit = canEditAll || isOwnRow;
                          const isPending = pendingEdits[`${rowIndex}_${col}`];
                          const isLatest = col === latestDateColumn;
                          const remarkKey = `${nameVal}::${col}`;
                          const existingRemark = remarksMap[remarkKey]?.remarks;

                          return (
                            <td
                              key={col}
                              className={`px-2 py-2 text-center align-middle ${
                                isLatest ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <StatusSelect
                                value={val || ''}
                                onChange={(newVal) => handleCellChange(rowIndex, col, newVal)}
                                disabled={!canEdit}
                                isPending={!!isPending}
                                remark={existingRemark}
                                onOpenRemarks={() => handleOpenRemarks(nameVal, selectedTeam, col, val || '', rowIndex)}
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
        </div>

      </div>

      {/* SIDE-RIGHT DRAWER / MODAL FOR STATUS REMARKS & NOTES */}
      {activeRemarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
            {/* Drawer Header */}
            <div>
              <div className="p-6 bg-[#2F6798] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Status Remarks & Notes</h2>
                    <p className="text-xs text-white/70">Document coaching reasons, attendance, or performance flags</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveRemarkModal(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-5">
                {/* Employee / Wave Metadata Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
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

                {/* Quick Tags Suggestions */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#2F6798]" />
                    <span>Quick Reason Presets</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickTags.map((tag) => {
                      const TagIcon = tag.icon;
                      return (
                        <button
                          key={tag.label}
                          type="button"
                          onClick={() => {
                            setRemarkDraft(prev => {
                              const trimmed = prev.trim();
                              if (!trimmed) return tag.text;
                              return `${trimmed}\n- ${tag.text}`;
                            });
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-600 flex items-center gap-1.5 shadow-2xs"
                        >
                          <TagIcon className="w-3.5 h-3.5 text-[#2F6798]" />
                          <span>{tag.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Remarks Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Detailed Remarks / Justification
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {remarkDraft.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    autoFocus
                    value={remarkDraft}
                    onChange={(e) => setRemarkDraft(e.target.value)}
                    placeholder="Enter reason why this status was assigned (e.g., Performance issues, Attendance, Escalation incidents, Coaching progress, Commendations)..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] transition-all"
                  />
                </div>

              </div>
            </div>

            {/* Drawer Action Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
              {activeRemarkModal.remarks ? (
                <button
                  type="button"
                  disabled={isSavingRemark}
                  onClick={handleDeleteRemark}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Note
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingRemark}
                  onClick={() => setActiveRemarkModal(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingRemark}
                  onClick={handleSaveRemark}
                  className="px-6 py-2.5 rounded-full bg-[#2F6798] hover:bg-[#24527a] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingRemark ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Remark
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Modal Loading Dialog during Save */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col items-center gap-3 min-w-[260px] text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Saving Changes</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Updating traffic light records in database...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
