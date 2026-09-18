'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  UserCheck,
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Download,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Table as TableIcon,
  Filter,
  Eye,
  Edit3
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { isTrainerMatch } from '@/lib/analytics-utils';

export interface TraineeAttendanceItem {
  id?: string;
  name: string;
  batch: string;
  account: string;
  assignedTrainer: string;
  trainingType: 'INHOUSE' | 'PST';
  status: string; // 'ONGOING' | 'ENDORSED' | 'EOC' | 'AWOL' | 'ACTIVE'
  attCode?: 'P' | 'L' | 'U' | 'A' | '';
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface AttendanceCalendarViewProps {
  initialTrainers?: any[];
  allTrainers?: any[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const ATTENDANCE_TAGS = [
  { 
    code: 'P', 
    label: 'Present', 
    short: 'P', 
    defaultStyle: 'bg-[#D1FAE5]/70 text-[#065F46] border-[#A7F3D0] hover:bg-[#D1FAE5] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/80',
    activeStyle: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981] ring-2 ring-[#10B981]/40 shadow-xs scale-105 font-black dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-500',
    color: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]', 
    lightColor: 'bg-[#D1FAE5]/60 text-[#065F46] border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-300', 
    dot: 'bg-emerald-500' 
  },
  { 
    code: 'L', 
    label: 'Late', 
    short: 'L', 
    defaultStyle: 'bg-[#FEF3C7]/70 text-[#92400E] border-[#FDE68A] hover:bg-[#FEF3C7] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80',
    activeStyle: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B] ring-2 ring-[#F59E0B]/40 shadow-xs scale-105 font-black dark:bg-amber-950 dark:text-amber-200 dark:border-amber-500',
    color: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]', 
    lightColor: 'bg-[#FEF3C7]/60 text-[#92400E] border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-300', 
    dot: 'bg-amber-500' 
  },
  { 
    code: 'U', 
    label: 'Undertime', 
    short: 'U', 
    defaultStyle: 'bg-[#FFEDD5]/70 text-[#9A3412] border-[#FED7AA] hover:bg-[#FFEDD5] dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/80',
    activeStyle: 'bg-[#FFEDD5] text-[#9A3412] border-[#F97316] ring-2 ring-[#F97316]/40 shadow-xs scale-105 font-black dark:bg-orange-950 dark:text-orange-200 dark:border-orange-500',
    color: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]', 
    lightColor: 'bg-[#FFEDD5]/60 text-[#9A3412] border-[#FED7AA] dark:bg-orange-950/40 dark:text-orange-300', 
    dot: 'bg-orange-500' 
  },
  { 
    code: 'A', 
    label: 'Absent', 
    short: 'A', 
    defaultStyle: 'bg-[#FFE4E6]/70 text-[#9F1239] border-[#FECDD3] hover:bg-[#FFE4E6] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/80',
    activeStyle: 'bg-[#FFE4E6] text-[#9F1239] border-[#F43F5E] ring-2 ring-[#F43F5E]/40 shadow-xs scale-105 font-black dark:bg-rose-950 dark:text-rose-200 dark:border-rose-500',
    color: 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3]', 
    lightColor: 'bg-[#FFE4E6]/60 text-[#9F1239] border-[#FECDD3] dark:bg-rose-950/40 dark:text-rose-300', 
    dot: 'bg-rose-500' 
  },
] as const;

const LIFECYCLE_STATUSES = [
  { value: 'ONGOING', label: 'Ongoing', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' },
  { value: 'ENDORSED', label: 'Endorsed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'EOC', label: 'EOC (End of Contract)', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  { value: 'AWOL', label: 'AWOL', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' },
  { value: 'RESIGNED', label: 'Resigned', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800' },
  { value: 'TERMINATED', label: 'Terminated', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
];

const QUICK_REASONS = [
  'Late: Traffic / Transportation delay',
  'Late: Technical / System connectivity issue',
  'Late: Prior authorized supervisor coaching',
  'Undertime: Medical consultation / Clinic visit',
  'Undertime: Urgent personal / family matter',
  'Absent: Sick leave (med cert pending)',
  'Absent: Sick leave (med cert submitted)',
  'Absent: Unexcused / No notification',
  'Absent: Bereavement / Emergency leave',
  'Status: Completed training & officially endorsed',
  'Status: End of Contract (EOC) reached',
  'Status: AWOL notice issued (3 consecutive days no contact)'
];

export function AttendanceCalendarView({
  initialTrainers = [],
  allTrainers = [],
  onRefresh,
  isRefreshing
}: AttendanceCalendarViewProps) {
  const { role, actualRole, userName, email } = useRole();
  const currentRole = role || actualRole;
  const isTrainer = currentRole === 'TRAINER';
  const isAdmin = currentRole === 'SUPER_ADMIN' || currentRole === 'HOT_ADMIN' || currentRole === 'QAS_ADMIN' || currentRole === 'VIEW_ADMIN';

  // Date selection (Defaults to today in YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // View mode switcher: 'table' (Daily Roster) vs 'matrix' (Monthly Calendar Grid)
  const [viewMode, setViewMode] = useState<'table' | 'matrix'>('table');

  // Timeframe range selection for Matrix view: 'monthly' | 'weekly' | 'biweekly'
  const [matrixRange, setMatrixRange] = useState<'monthly' | 'weekly' | 'biweekly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [matrixRefDate, setMatrixRefDate] = useState<Date>(() => new Date());

  const handlePrevPeriod = () => {
    if (matrixRange === 'monthly') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
      setMatrixRefDate(prevDate);
    } else if (matrixRange === 'weekly') {
      const d = new Date(matrixRefDate);
      d.setDate(d.getDate() - 7);
      setMatrixRefDate(d);
      setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    } else if (matrixRange === 'biweekly') {
      const d = new Date(matrixRefDate);
      if (d.getDate() > 15) {
        d.setDate(1);
      } else {
        d.setMonth(d.getMonth() - 1);
        d.setDate(16);
      }
      setMatrixRefDate(d);
      setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleNextPeriod = () => {
    if (matrixRange === 'monthly') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
      setMatrixRefDate(nextDate);
    } else if (matrixRange === 'weekly') {
      const d = new Date(matrixRefDate);
      d.setDate(d.getDate() + 7);
      setMatrixRefDate(d);
      setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    } else if (matrixRange === 'biweekly') {
      const d = new Date(matrixRefDate);
      if (d.getDate() <= 15) {
        d.setDate(16);
      } else {
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
      }
      setMatrixRefDate(d);
      setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleGoToCurrentPeriod = () => {
    const today = new Date();
    setMatrixRefDate(today);
    setSelectedMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  };

  const formattedMatrixPeriodLabel = useMemo(() => {
    if (matrixRange === 'monthly') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    const today = matrixRefDate;
    const y = today.getFullYear();
    const m = today.getMonth();

    if (matrixRange === 'weekly') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sunStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${monStr} – ${sunStr}`;
    }

    if (matrixRange === 'biweekly') {
      const monthName = today.toLocaleDateString('en-US', { month: 'short' });
      if (today.getDate() <= 15) {
        return `${monthName} 1 – 15, ${y}`;
      } else {
        const lastDay = new Date(y, m + 1, 0).getDate();
        return `${monthName} 16 – ${lastDay}, ${y}`;
      }
    }

    return selectedMonth;
  }, [matrixRange, selectedMonth, matrixRefDate]);

  const monthDays = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const days: Array<{
      num: number;
      iso: string;
      dayName: string;
      dayShort: string;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    if (matrixRange === 'monthly') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const dayDate = new Date(y, m - 1, d);
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'narrow' });
        const dayShort = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        days.push({
          num: d,
          iso,
          dayName,
          dayShort,
          isWeekend,
          isToday: iso === todayStr
        });
      }
    } else if (matrixRange === 'weekly') {
      const day = matrixRefDate.getDay();
      const diff = matrixRefDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(matrixRefDate);
      monday.setDate(diff);

      for (let i = 0; i < 7; i++) {
        const current = new Date(monday);
        current.setDate(monday.getDate() + i);
        const y = current.getFullYear();
        const m = current.getMonth() + 1;
        const d = current.getDate();
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayName = current.toLocaleDateString('en-US', { weekday: 'narrow' });
        const dayShort = current.toLocaleDateString('en-US', { weekday: 'short' });
        const isWeekend = current.getDay() === 0 || current.getDay() === 6;
        days.push({
          num: d,
          iso,
          dayName,
          dayShort,
          isWeekend,
          isToday: iso === todayStr
        });
      }
    } else if (matrixRange === 'biweekly') {
      const y = matrixRefDate.getFullYear();
      const m = matrixRefDate.getMonth() + 1;
      const startDay = matrixRefDate.getDate() <= 15 ? 1 : 16;
      const endDay = matrixRefDate.getDate() <= 15 ? 15 : new Date(y, m, 0).getDate();

      for (let d = startDay; d <= endDay; d++) {
        const dayDate = new Date(y, m - 1, d);
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'narrow' });
        const dayShort = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        days.push({
          num: d,
          iso,
          dayName,
          dayShort,
          isWeekend,
          isToday: iso === todayStr
        });
      }
    }

    return days;
  }, [matrixRange, selectedMonth, matrixRefDate]);

  // Filters
  const [selectedTrainer, setSelectedTrainer] = useState<string>('All');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [selectedAccount, setSelectedAccount] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Daily records map: key = `${date}___${traineeName.toLowerCase()}`
  const [dailyRecordsMap, setDailyRecordsMap] = useState<Record<string, any>>({});
  const [isLoadingDaily, setIsLoadingDaily] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Floating Cell Dropdown Menu Popover State (for Matrix Grid)
  const [popoverAnchor, setPopoverAnchor] = useState<{
    trainee: TraineeAttendanceItem;
    date: string;
    x: number;
    y: number;
  } | null>(null);

  // Close popover when pressing Escape
  useEffect(() => {
    if (!popoverAnchor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverAnchor(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popoverAnchor]);

  // Note Modal state
  const [activeNoteTrainee, setActiveNoteTrainee] = useState<TraineeAttendanceItem | null>(null);
  const [activeNoteDate, setActiveNoteDate] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // Fetch daily attendance records from API on date change
  const fetchDailyData = useCallback(async (date: string) => {
    setIsLoadingDaily(true);
    try {
      const res = await fetch(`/api/attendance/daily?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        if (json.map) {
          setDailyRecordsMap(json.map);
        }
      }
    } catch (e) {
      console.error('Error fetching daily attendance:', e);
    } finally {
      setIsLoadingDaily(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate, fetchDailyData]);

  // Extract all trainers list
  const trainersList = useMemo(() => {
    return allTrainers && allTrainers.length > 0 ? allTrainers : initialTrainers;
  }, [allTrainers, initialTrainers]);

  // If user is a Trainer, auto-default selected trainer to them
  useEffect(() => {
    if (isTrainer && userName) {
      setSelectedTrainer(userName);
    }
  }, [isTrainer, userName]);

  // Extract all trainees across batches from initialTrainers
  const allTraineesList = useMemo(() => {
    const list: TraineeAttendanceItem[] = [];
    const seenNames = new Set<string>();

    trainersList.forEach((t: any) => {
      const trainerName = t.name || 'Unknown Trainer';
      const batches = t.batches || [];

      batches.forEach((b: any) => {
        const batchName = b.batch ? `Batch ${`${b.batch}`.replace(/^(batch\s*|wave\s*)/i, '').trim()}` : 'General';
        const accountName = b.account || 'General';
        const trainees = b.trainees || [];

        trainees.forEach((tr: any) => {
          const trName = tr.name ? tr.name.trim() : '';
          if (!trName || seenNames.has(`${batchName}-${trName}`)) return;
          seenNames.add(`${batchName}-${trName}`);

          const rawStatus = (tr.status || 'ONGOING').toUpperCase();
          let cleanStatus = 'ONGOING';
          if (rawStatus === 'ENDORSED' || rawStatus === 'PASSED') cleanStatus = 'ENDORSED';
          else if (rawStatus === 'EOC') cleanStatus = 'EOC';
          else if (rawStatus === 'AWOL') cleanStatus = 'AWOL';
          else if (['FAIL', 'FAILED', 'DROP', 'DROPPED', 'TERMINATED', 'RESIGNED', 'ATTRITION'].some(s => rawStatus.includes(s))) cleanStatus = 'EOC';

          list.push({
            id: tr.id || trName,
            name: trName,
            batch: batchName,
            account: accountName,
            assignedTrainer: tr.assignedTrainer || trainerName,
            trainingType: b.account === 'CORP' || b.account === 'General' ? 'INHOUSE' : 'PST',
            status: cleanStatus
          });
        });
      });
    });

    return list;
  }, [trainersList]);

  // Compute available batch & account filters
  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    allTraineesList.forEach(t => {
      if (t.batch) set.add(t.batch);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allTraineesList]);

  const availableAccounts = useMemo(() => {
    const set = new Set<string>();
    allTraineesList.forEach(t => {
      if (t.account) set.add(t.account);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allTraineesList]);

  const availableTrainerNames = useMemo(() => {
    const set = new Set<string>();
    trainersList.forEach(t => {
      if (t.name) set.add(t.name);
    });
    return ['All', ...Array.from(set).sort()];
  }, [trainersList]);

  // Merge trainees with live daily attendance & notes for the selected date
  const enrichedTrainees = useMemo(() => {
    return allTraineesList.map(t => {
      const key = `${selectedDate}___${t.name.trim().toLowerCase()}`;
      const savedRecord = dailyRecordsMap[key];

      return {
        ...t,
        attCode: savedRecord?.attCode || '',
        status: savedRecord?.status || t.status,
        notes: savedRecord?.notes || '',
        updatedAt: savedRecord?.updatedAt,
        updatedBy: savedRecord?.updatedBy
      };
    });
  }, [allTraineesList, dailyRecordsMap, selectedDate]);

  // Filtered trainees based on all controls
  const filteredTrainees = useMemo(() => {
    return enrichedTrainees.filter(t => {
      // Role & Trainer scoping
      if (isTrainer && userName) {
        if (!isTrainerMatch(t.assignedTrainer, userName)) {
          return false;
        }
      } else if (selectedTrainer !== 'All') {
        if (!isTrainerMatch(t.assignedTrainer, selectedTrainer)) {
          return false;
        }
      }

      // Batch filter
      if (selectedBatch !== 'All' && t.batch !== selectedBatch) {
        return false;
      }

      // Account filter
      if (selectedAccount !== 'All' && !t.account.toLowerCase().includes(selectedAccount.toLowerCase())) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'All' && t.status !== selectedStatusFilter) {
        return false;
      }

      // Tag filter
      if (selectedTagFilter !== 'All') {
        if (selectedTagFilter === 'UNTAGGED') {
          if (t.attCode) return false;
        } else if (t.attCode !== selectedTagFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesBatch = t.batch.toLowerCase().includes(q);
        const matchesAccount = t.account.toLowerCase().includes(q);
        const matchesTrainer = t.assignedTrainer.toLowerCase().includes(q);
        const matchesNote = (t.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBatch && !matchesAccount && !matchesTrainer && !matchesNote) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedTrainees, isTrainer, userName, selectedTrainer, selectedBatch, selectedAccount, selectedStatusFilter, selectedTagFilter, searchQuery]);

  // Pagination state (configurable rows per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTrainer, selectedBatch, selectedAccount, selectedStatusFilter, selectedTagFilter, searchQuery, selectedDate]);

  const totalPages = Math.ceil(filteredTrainees.length / pageSize) || 1;
  const paginatedTrainees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrainees.slice(start, start + pageSize);
  }, [filteredTrainees, currentPage, pageSize]);

  // Daily KPI calculations
  const dailyKPIs = useMemo(() => {
    const total = filteredTrainees.length;
    let present = 0;
    let late = 0;
    let undertime = 0;
    let absent = 0;
    let untagged = 0;

    filteredTrainees.forEach(t => {
      if (t.attCode === 'P') present++;
      else if (t.attCode === 'L') late++;
      else if (t.attCode === 'U') undertime++;
      else if (t.attCode === 'A') absent++;
      else untagged++;
    });

    const presentRate = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '0.0%';
    const taggedCount = total - untagged;

    return { total, present, late, undertime, absent, untagged, presentRate, taggedCount };
  }, [filteredTrainees]);

  // Handle single attendance tag change
  const handleTagChange = async (
    trainee: TraineeAttendanceItem,
    newTag: 'P' | 'L' | 'U' | 'A' | '',
    targetDate?: string
  ) => {
    const effDate = targetDate || selectedDate;
    if (isAdmin && !isTrainer) {
      showToast('Admin Mode is Read-Only. Only assigned trainers can mark attendance.', 'info');
      return;
    }

    const key = `${effDate}___${trainee.name.trim().toLowerCase()}`;
    const currentCode = dailyRecordsMap[key]?.attCode || (effDate === selectedDate ? trainee.attCode : '');
    const nextCode = currentCode === newTag ? '' : newTag;

    // Optimistic UI update
    setDailyRecordsMap(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        date: effDate,
        traineeName: trainee.name,
        batchName: trainee.batch,
        accountName: trainee.account,
        trainerName: trainee.assignedTrainer,
        trainingType: trainee.trainingType,
        attCode: nextCode,
        status: prev[key]?.status || trainee.status,
        notes: prev[key]?.notes || trainee.notes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: userName || 'Trainer'
      }
    }));

    try {
      const res = await fetch('/api/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: effDate,
          updatedBy: userName || 'Trainer',
          records: [
            {
              date: effDate,
              traineeName: trainee.name,
              batchName: trainee.batch,
              accountName: trainee.account,
              trainerName: trainee.assignedTrainer,
              trainingType: trainee.trainingType,
              attCode: nextCode,
              status: trainee.status,
              notes: dailyRecordsMap[key]?.notes || trainee.notes || ''
            }
          ]
        })
      });

      if (!res.ok) throw new Error('Failed to save attendance');
      const tagLabel = ATTENDANCE_TAGS.find(t => t.code === nextCode)?.label || 'Untagged';
      showToast(`${trainee.name} on ${effDate} tagged as ${tagLabel}`, 'success');
    } catch (err: any) {
      console.error('Error saving tag:', err);
      showToast('Failed to save attendance tag. Please retry.', 'error');
      fetchDailyData(effDate);
    }
  };

  // Cycle tag in Monthly Matrix Grid View: P -> L -> U -> A -> Clear
  const cycleMatrixTag = (trainee: TraineeAttendanceItem, dateStr: string) => {
    if (isAdmin && !isTrainer) {
      showToast('Admin Mode is Read-Only. Only trainers can modify trainee attendance tags.', 'info');
      return;
    }
    const key = `${dateStr}___${trainee.name.trim().toLowerCase()}`;
    const currentCode = dailyRecordsMap[key]?.attCode || '';
    const order: Array<'P' | 'L' | 'U' | 'A' | ''> = ['P', 'L', 'U', 'A', ''];
    const nextIdx = (order.indexOf(currentCode as any) + 1) % order.length;
    const nextCode = order[nextIdx];

    handleTagChange(trainee, nextCode, dateStr);
  };

  // Compute monthly stats for a trainee in Matrix View
  const getTraineeMonthStats = useCallback((trainee: TraineeAttendanceItem) => {
    let p = 0;
    let l = 0;
    let u = 0;
    let a = 0;
    monthDays.forEach(day => {
      const key = `${day.iso}___${trainee.name.trim().toLowerCase()}`;
      const code = dailyRecordsMap[key]?.attCode;
      if (code === 'P') p++;
      else if (code === 'L') l++;
      else if (code === 'U') u++;
      else if (code === 'A') a++;
    });
    const totalTagged = p + l + u + a;
    const rate = totalTagged > 0 ? (((p + l * 0.5) / totalTagged) * 100).toFixed(0) + '%' : '100%';
    return { p, l, u, a, totalTagged, rate };
  }, [monthDays, dailyRecordsMap]);

  // Handle Lifecycle Status change
  const handleStatusChange = async (trainee: TraineeAttendanceItem, newStatus: string) => {
    if (isAdmin && !isTrainer) {
      showToast('Admin Mode is Read-Only. Only trainers can modify trainee statuses.', 'info');
      return;
    }

    const key = `${selectedDate}___${trainee.name.trim().toLowerCase()}`;

    // Optimistic update
    setDailyRecordsMap(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        date: selectedDate,
        traineeName: trainee.name,
        batchName: trainee.batch,
        accountName: trainee.account,
        trainerName: trainee.assignedTrainer,
        trainingType: trainee.trainingType,
        attCode: trainee.attCode,
        status: newStatus,
        notes: trainee.notes,
        updatedAt: new Date().toISOString(),
        updatedBy: userName || 'Trainer'
      }
    }));

    try {
      const res = await fetch('/api/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          updatedBy: userName || 'Trainer',
          records: [
            {
              date: selectedDate,
              traineeName: trainee.name,
              batchName: trainee.batch,
              accountName: trainee.account,
              trainerName: trainee.assignedTrainer,
              trainingType: trainee.trainingType,
              attCode: trainee.attCode,
              status: newStatus,
              notes: trainee.notes
            }
          ]
        })
      });

      if (!res.ok) throw new Error('Failed to save status');
      showToast(`Status for ${trainee.name} updated to ${newStatus}`, 'success');
    } catch (err: any) {
      console.error('Error saving status:', err);
      showToast('Failed to update status. Please retry.', 'error');
      fetchDailyData(selectedDate);
    }
  };

  // Open note modal
  const handleOpenNoteModal = (trainee: TraineeAttendanceItem, dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    const key = `${targetDate}___${trainee.name.trim().toLowerCase()}`;
    const record = dailyRecordsMap[key];
    setActiveNoteTrainee(trainee);
    setActiveNoteDate(targetDate);
    setTempNoteText(record?.notes || (targetDate === selectedDate ? trainee.notes : '') || '');
  };

  // Save Reason Note
  const handleSaveNote = async () => {
    if (!activeNoteTrainee) return;
    if (isAdmin && !isTrainer) {
      showToast('Admin Mode is Read-Only. Notes cannot be edited by admins.', 'info');
      setActiveNoteTrainee(null);
      setActiveNoteDate(null);
      return;
    }

    const effDate = activeNoteDate || selectedDate;
    setIsSaving(true);
    const key = `${effDate}___${activeNoteTrainee.name.trim().toLowerCase()}`;

    // Optimistic update
    setDailyRecordsMap(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        date: effDate,
        traineeName: activeNoteTrainee.name,
        batchName: activeNoteTrainee.batch,
        accountName: activeNoteTrainee.account,
        trainerName: activeNoteTrainee.assignedTrainer,
        trainingType: activeNoteTrainee.trainingType,
        attCode: prev[key]?.attCode || (effDate === selectedDate ? activeNoteTrainee.attCode : ''),
        status: prev[key]?.status || activeNoteTrainee.status,
        notes: tempNoteText.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: userName || 'Trainer'
      }
    }));

    try {
      const res = await fetch('/api/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: effDate,
          updatedBy: userName || 'Trainer',
          records: [
            {
              date: effDate,
              traineeName: activeNoteTrainee.name,
              batchName: activeNoteTrainee.batch,
              accountName: activeNoteTrainee.account,
              trainerName: activeNoteTrainee.assignedTrainer,
              trainingType: activeNoteTrainee.trainingType,
              attCode: dailyRecordsMap[key]?.attCode || (effDate === selectedDate ? activeNoteTrainee.attCode : ''),
              status: dailyRecordsMap[key]?.status || activeNoteTrainee.status,
              notes: tempNoteText.trim()
            }
          ]
        })
      });

      if (!res.ok) throw new Error('Failed to save note');
      showToast(`Reason note saved for ${activeNoteTrainee.name}`, 'success');
      setActiveNoteTrainee(null);
      setActiveNoteDate(null);
    } catch (err: any) {
      console.error('Error saving note:', err);
      showToast('Failed to save reason note. Please retry.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk Action: Mark All Untagged as Present
  const handleMarkAllPresent = async () => {
    if (isAdmin && !isTrainer) {
      showToast('Admin Mode is Read-Only. Only trainers can mark bulk attendance.', 'info');
      return;
    }

    if (filteredTrainees.length === 0) return;

    const untaggedOrAll = filteredTrainees.filter(t => t.attCode !== 'P');
    if (untaggedOrAll.length === 0) {
      showToast('All currently visible trainees are already marked Present.', 'info');
      return;
    }

    const payload = untaggedOrAll.map(t => ({
      date: selectedDate,
      traineeName: t.name,
      batchName: t.batch,
      accountName: t.account,
      trainerName: t.assignedTrainer,
      trainingType: t.trainingType,
      attCode: 'P' as const,
      status: t.status,
      notes: t.notes
    }));

    // Optimistic update
    setDailyRecordsMap(prev => {
      const next = { ...prev };
      payload.forEach(item => {
        const k = `${selectedDate}___${item.traineeName.trim().toLowerCase()}`;
        next[k] = {
          name: item.traineeName,
          batch: item.batchName,
          account: item.accountName,
          assignedTrainer: item.trainerName,
          trainingType: item.trainingType,
          attCode: 'P',
          status: item.status,
          notes: item.notes,
          updatedAt: new Date().toISOString(),
          updatedBy: userName || 'Trainer'
        };
      });
      return next;
    });

    try {
      const res = await fetch('/api/attendance/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          updatedBy: userName || 'Trainer',
          records: payload
        })
      });

      if (!res.ok) throw new Error('Failed to bulk mark present');
      showToast(`Marked ${payload.length} trainees as Present for ${selectedDate}`, 'success');
      fetchDailyData(selectedDate);
    } catch (err: any) {
      console.error('Error bulk tagging:', err);
      showToast('Failed to bulk mark present. Please retry.', 'error');
      fetchDailyData(selectedDate);
    }
  };

  // Export Daily Attendance CSV
  const handleExportCSV = () => {
    if (filteredTrainees.length === 0) {
      showToast('No trainee records to export.', 'info');
      return;
    }

    const headers = ['Date', 'Trainee Name', 'Batch', 'Account', 'Assigned Trainer', 'Attendance Tag', 'Status', 'Reason Notes', 'Last Updated By', 'Timestamp'];
    const rows = filteredTrainees.map(t => {
      const tagLabel = ATTENDANCE_TAGS.find(tag => tag.code === t.attCode)?.label || 'UNTAGGED';
      return [
        selectedDate,
        `"${t.name.replace(/"/g, '""')}"`,
        `"${t.batch}"`,
        `"${t.account}"`,
        `"${t.assignedTrainer}"`,
        tagLabel,
        t.status,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        `"${t.updatedBy || ''}"`,
        `"${t.updatedAt || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Trainee_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report exported successfully.', 'success');
  };

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const setDateToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };



  const formattedSelectedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-6 w-full max-w-full pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[99999] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold text-white ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 border-rose-700'
              : toastMessage.type === 'info'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-[#2F6798] border-[#24527a]'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 text-white/90 animate-pulse" />
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Context Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Trainee Attendance &amp; Status Calendar
            </h1>
            {isTrainer ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#2F6798] border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                <UserCheck className="w-3 h-3" /> Trainer Live Tagging Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                <Eye className="w-3 h-3" /> Admin Reflection Mode (Read-Only)
              </span>
            )}
          </div>
          <p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-0.5">
            Calendar-style attendance tagging, lifecycle status management, and real-time reason logs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDailyData(selectedDate)}
            disabled={isLoadingDaily}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            {isLoadingDaily ? (
              <Loader2 className="w-3.5 h-3.5 text-[#2F6798] animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" />
            )}
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export Day
          </button>
        </div>
      </div>

      {/* Admin Reflection Banner if user is Admin */}
      {isAdmin && !isTrainer && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 dark:border-amber-700/60 rounded-2xl p-3.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Admin Audit &amp; Reflection View
              </h4>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                You are viewing real-time attendance and notes recorded by trainers. Editing is restricted to assigned trainers.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-white dark:bg-slate-800 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 shadow-2xs">
              Live Feed Synced
            </span>
          </div>
        </div>
      )}

      {/* Daily Attendance Breakdown KPI Cards (Artwork Watermark & Badge Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Box 1: Scheduled Cohort */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
              <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
                <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
              </div>
              <div className="min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">SCHEDULED COHORT</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100">{dailyKPIs.total}</h4>
                  <span className="text-[10px] font-bold text-slate-400">({dailyKPIs.taggedCount} Tagged)</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#2F6798] dark:text-[#5a9fd4] shrink-0 ml-2 relative z-10">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Box 2: Present (P) */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
              <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
                <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
              </div>
              <div className="min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">PRESENT (P)</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{dailyKPIs.present}</h4>
                  <span className="text-[10px] font-bold text-emerald-600">({dailyKPIs.presentRate})</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 relative z-10">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Box 3: Late (L) */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
              <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
                <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
              </div>
              <div className="min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">LATE (L)</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400">{dailyKPIs.late}</h4>
                  <span className="text-[10px] font-bold text-amber-500">
                    ({dailyKPIs.total > 0 ? ((dailyKPIs.late / dailyKPIs.total) * 100).toFixed(1) + '%' : '0%'})
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 ml-2 relative z-10">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Box 4: Undertime (U) */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
              <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
                <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
              </div>
              <div className="min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">UNDERTIME (U)</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <h4 className="text-2xl font-black text-orange-600 dark:text-orange-400">{dailyKPIs.undertime}</h4>
                  <span className="text-[10px] font-bold text-orange-500">
                    ({dailyKPIs.total > 0 ? ((dailyKPIs.undertime / dailyKPIs.total) * 100).toFixed(1) + '%' : '0%'})
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 ml-2 relative z-10">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            {/* Box 5: Absent (A) */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
              <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
                <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
              </div>
              <div className="min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">ABSENT (A)</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400">{dailyKPIs.absent}</h4>
                  <span className="text-[10px] font-bold text-rose-500">
                    ({dailyKPIs.total > 0 ? ((dailyKPIs.absent / dailyKPIs.total) * 100).toFixed(1) + '%' : '0%'})
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 ml-2 relative z-10">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
      </div>

      {/* Unified Filters & Trainees Attendance Roster Container */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        {/* Top Filters & Search Section */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
            {/* Admin Trainer Selector (Admins can switch trainers, Trainers are scoped) */}
            {!isTrainer && (
              <div className="lg:col-span-3 sm:col-span-1">
                <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#2F6798]" /> Assigned Trainer
                </label>
                <CustomSelect
                  value={selectedTrainer}
                  onChange={val => setSelectedTrainer(val)}
                  options={availableTrainerNames.map(name => ({
                    value: name,
                    label: name === 'All' ? 'All Trainers' : name
                  }))}
                />
              </div>
            )}

            {/* Batch Selector */}
            <div className={!isTrainer ? "lg:col-span-2 sm:col-span-1" : "lg:col-span-3 sm:col-span-1"}>
              <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Batch / Cohort
              </label>
              <CustomSelect
                value={selectedBatch}
                onChange={val => setSelectedBatch(val)}
                options={availableBatches.map(b => ({
                  value: b,
                  label: b === 'All' ? 'All Batches' : b
                }))}
              />
            </div>

            {/* Account Filter */}
            <div className="lg:col-span-2 sm:col-span-1">
              <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Account
              </label>
              <CustomSelect
                value={selectedAccount}
                onChange={val => setSelectedAccount(val)}
                options={availableAccounts.map(a => ({
                  value: a,
                  label: a === 'All' ? 'All Accounts' : a
                }))}
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2 sm:col-span-1">
              <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2F6798]" /> Status
              </label>
              <CustomSelect
                value={selectedStatusFilter}
                onChange={val => setSelectedStatusFilter(val)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'ONGOING', label: 'Ongoing' },
                  { value: 'ENDORSED', label: 'Endorsed' },
                  { value: 'EOC', label: 'EOC' },
                  { value: 'AWOL', label: 'AWOL' },
                  { value: 'RESIGNED', label: 'Resigned' },
                  { value: 'TERMINATED', label: 'Terminated' },
                ]}
              />
            </div>

            {/* Search Trainee */}
            <div className={!isTrainer ? "lg:col-span-3 sm:col-span-1" : "lg:col-span-5 sm:col-span-1"}>
              <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Search Trainee / Note
              </label>
              <div className="relative group">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type trainee name or reason keyword..."
                  className="h-10 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Attendance Tag Filter Buttons & View Mode Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            {/* Tag Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                Tag Filter:
              </span>
              {[
                { id: 'All', label: 'All Trainees' },
                { id: 'P', label: 'Present (P)' },
                { id: 'L', label: 'Late (L)' },
                { id: 'U', label: 'Undertime (U)' },
                { id: 'A', label: 'Absent (A)' },
                { id: 'UNTAGGED', label: 'Untagged' }
              ].map(tag => {
                const isActive = selectedTagFilter === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTagFilter(tag.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                      isActive
                        ? 'bg-[#2F6798] text-white border-[#2F6798] shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>

            {/* View Switcher: Table View vs Calendar Matrix */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-[#2F6798] dark:text-blue-400 shadow-xs font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white dark:bg-slate-800 text-[#2F6798] dark:text-blue-400 shadow-xs font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar Matrix</span>
              </button>
            </div>
          </div>
        </div>

        {/* VIEW 1: DAILY TABLE VIEW */}
        {viewMode === 'table' ? (
          <>
            {/* Trainees Attendance Roster Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-[#2F6798] dark:text-[#5a9fd4]" />
                  <h3 className="text-xs font-bold tracking-wide text-slate-800 dark:text-slate-100 uppercase font-sans">
                    DAILY ROSTER ({filteredTrainees.length} Trainees)
                  </h3>
                </div>

                {/* Date Stepper & Picker Integrated */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => shiftDate(-1)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={setDateToday}
                    className="px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftDate(1)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Next Day"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => e.target.value && setSelectedDate(e.target.value)}
                    className="text-xs font-bold text-[#2F6798] dark:text-blue-400 bg-transparent px-1.5 py-0.5 outline-none cursor-pointer"
                  />
                </div>

                {/* Mark All Present */}
                {isTrainer && (
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                    title="Mark all filtered trainees as Present for selected date"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark All Present</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize >= 10000 ? 'all' : pageSize}
                    onChange={e => {
                      setPageSize(e.target.value === 'all' ? 100000 : Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <span>
                  Showing {filteredTrainees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTrainees.length)} of {filteredTrainees.length} records
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto custom-horizontal-scrollbar touch-pan-x overscroll-x-contain pb-1 min-h-[360px]">
              <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                    <th className="py-3 px-4 min-w-[200px]">Trainee Profile</th>
                    <th className="py-3 px-4 min-w-[130px]">Batch &amp; Account</th>
                    <th className="py-3 px-4 min-w-[160px]">Assigned Trainer</th>
                    <th className="py-3 px-4 text-center min-w-[220px]">Daily Attendance Tag</th>
                    <th className="py-3 px-4 text-center min-w-[180px]">Status</th>
                    <th className="py-3 px-4 text-left min-w-[180px]">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {paginatedTrainees.length > 0 ? (
                    paginatedTrainees.map((trainee, idx) => {
                      const initials = trainee.name
                        ? trainee.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                        : '?';

                      const hasNote = Boolean(trainee.notes && trainee.notes.trim().length > 0);

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          {/* Trainee Profile */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#2F6798]/10 dark:bg-[#2F6798]/20 text-[#2F6798] dark:text-blue-300 flex items-center justify-center text-xs font-black shrink-0 border border-[#2F6798]/20 shadow-2xs">
                                {initials}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">
                                  {trainee.name}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {trainee.trainingType} Trainee
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Batch & Account */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                                {trainee.batch}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 w-fit tracking-wider uppercase">
                                {trainee.account}
                              </span>
                            </div>
                          </td>

                          {/* Assigned Trainer */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                            <span className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-[#2F6798]" />
                              {trainee.assignedTrainer}
                            </span>
                          </td>

                          {/* 4-Pill Daily Attendance Tagging */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {ATTENDANCE_TAGS.map(tag => {
                                const isSelected = trainee.attCode === tag.code;
                                const isReadOnly = isAdmin && !isTrainer;

                                return (
                                  <button
                                    key={tag.code}
                                    type="button"
                                    onClick={() => handleTagChange(trainee, tag.code)}
                                    disabled={isReadOnly}
                                    title={
                                      isReadOnly
                                        ? `Admin View-Only: Tagged as ${tag.label}`
                                        : `Mark as ${tag.label} (${tag.short})`
                                    }
                                    className={`w-7 h-7 rounded-[7px] text-[11px] font-black border transition-all flex items-center justify-center ${
                                      isSelected
                                        ? tag.activeStyle
                                        : isReadOnly
                                        ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-60'
                                        : `${tag.defaultStyle} cursor-pointer`
                                    }`}
                                  >
                                    <span>{tag.short}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Lifecycle Status Dropdown */}
                          <td className="py-3 px-4 text-center">
                            {isTrainer ? (
                              <div className="w-40 sm:w-44 mx-auto">
                                <CustomSelect
                                  value={trainee.status || 'ONGOING'}
                                  onChange={val => handleStatusChange(trainee, val)}
                                  options={LIFECYCLE_STATUSES.map(s => ({
                                    value: s.value,
                                    label: s.label
                                  }))}
                                />
                              </div>
                            ) : (
                              (() => {
                                const match = LIFECYCLE_STATUSES.find(s => s.value === trainee.status) || LIFECYCLE_STATUSES[0];
                                return (
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${match.badgeClass}`}>
                                    {match.label}
                                  </span>
                                );
                              })()
                            )}
                          </td>

                          {/* Reason / Notes Button & Preview */}
                          <td className="py-3 px-4">
                            {hasNote ? (
                              <div className="flex items-center gap-2 group">
                                <button
                                  type="button"
                                  onClick={() => handleOpenNoteModal(trainee)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#2F6798] text-white border border-[#2F6798] hover:bg-[#25537b] transition-all max-w-[220px] text-left truncate cursor-pointer shadow-xs"
                                  title={trainee.notes}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-white shrink-0" />
                                  <span className="truncate text-white">{trainee.notes}</span>
                                </button>
                                {isTrainer && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNoteModal(trainee)}
                                    className="p-1 text-slate-400 hover:text-[#2F6798] transition-colors rounded"
                                    title="Edit note"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenNoteModal(trainee)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                  isTrainer
                                    ? 'bg-[#2F6798] hover:bg-[#25537b] active:bg-[#1e4466] text-white border-[#2F6798] shadow-xs cursor-pointer'
                                    : 'bg-transparent text-slate-400 border-transparent cursor-default'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                <span className="text-white font-bold">{isTrainer ? '+ Add Note' : 'No Notes'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No trainees found for this date &amp; filter selection.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting the batch, account, or search query.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {filteredTrainees.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
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
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                currentPage === p
                                  ? 'bg-[#2F6798] text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* VIEW 2: MONTHLY MATRIX CALENDAR GRID VIEW */
          <>
            {/* Matrix Period Navigator & Header Controls */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
                <CalendarDays className="w-4 h-4 text-[#2F6798] dark:text-[#5a9fd4] shrink-0 hidden md:block" />
                
                {/* Date Navigator Box with +1 height */}
                <div className="h-10 px-2 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevPeriod}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Previous Period"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black tracking-wide text-slate-800 dark:text-slate-100 uppercase px-2 font-sans font-['Poppins',sans-serif] whitespace-nowrap">
                    {formattedMatrixPeriodLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPeriod}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Next Period"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Timeframe Dropdown (Weekly / Monthly / Bi-Weekly) using CustomSelect */}
                <div className="w-36 sm:w-40 shrink-0">
                  <CustomSelect
                    value={matrixRange}
                    onChange={val => setMatrixRange(val as any)}
                    options={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'biweekly', label: 'Bi-Weekly' },
                      { value: 'weekly', label: 'Weekly' }
                    ]}
                  />
                </div>

                {/* Jump to Today/Current Period */}
                <button
                  type="button"
                  onClick={handleGoToCurrentPeriod}
                  className="h-10 px-3 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 hover:text-[#2F6798] shadow-2xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {matrixRange === 'monthly' ? 'This Month' : matrixRange === 'weekly' ? 'This Week' : 'Current Cutoff'}
                </button>

                {/* Mark All Present in Matrix View */}
                {isTrainer && (
                  <button
                    type="button"
                    onClick={() => handleMarkAllPresent()}
                    className="h-10 inline-flex items-center gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                    title="Mark all visible trainees as Present for selected date / today"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark All Present</span>
                  </button>
                )}
              </div>

              {/* Legend with Hint Below the Pills */}
              <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[10px] font-extrabold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                    P - Present
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[10px] font-extrabold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    L - Late
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[10px] font-extrabold bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]">
                    U - Undertime
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[10px] font-extrabold bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3]">
                    A - Absent
                  </span>
                </div>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">
                  (Click box to tag &amp; note)
                </span>
              </div>
            </div>

            {/* Matrix Table Grid with Blue Header */}
            <div className="w-full overflow-x-auto custom-horizontal-scrollbar touch-pan-x overscroll-x-contain pb-1 min-h-[420px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#2F6798] text-white border-b border-[#25547c] font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                    {/* Sticky Trainee Column */}
                    <th className="py-3.5 px-4 min-w-[220px] sticky left-0 z-20 bg-[#2F6798] text-white border-r border-[#24527a] shadow-[2px_0_5px_rgba(0,0,0,0.15)] font-['Poppins',sans-serif] tracking-wider text-[11px]">
                      Trainee Profile &amp; Batch
                    </th>

                    {/* Days of the Month Columns */}
                    {monthDays.map(day => (
                      <th
                        key={day.iso}
                        className={`py-2 px-1 text-center min-w-[36px] max-w-[40px] border-r border-[#3d77aa] transition-colors ${
                          day.isToday
                            ? 'bg-[#204a6e] text-amber-300 ring-2 ring-inset ring-amber-400/60 font-black'
                            : day.isWeekend
                            ? 'bg-[#285b87] text-white/70'
                            : 'bg-[#2F6798] text-white font-bold'
                        }`}
                      >
                        <span className="text-[8px] uppercase tracking-tighter block opacity-80 font-semibold text-sky-100">
                          {day.dayShort}
                        </span>
                        <span className="text-[11px] font-black block text-white">
                          {day.num}
                        </span>
                      </th>
                    ))}

                    {/* Summary Columns */}
                    <th className="py-3 px-2 text-center min-w-[36px] bg-[#24527a] text-emerald-300 font-black border-r border-[#3d77aa]" title="Present Count">
                      P
                    </th>
                    <th className="py-3 px-2 text-center min-w-[36px] bg-[#24527a] text-amber-300 font-black border-r border-[#3d77aa]" title="Late Count">
                      L
                    </th>
                    <th className="py-3 px-2 text-center min-w-[36px] bg-[#24527a] text-orange-300 font-black border-r border-[#3d77aa]" title="Undertime Count">
                      U
                    </th>
                    <th className="py-3 px-2 text-center min-w-[36px] bg-[#24527a] text-rose-300 font-black border-r border-[#3d77aa]" title="Absent Count">
                      A
                    </th>
                    <th className="py-3 px-3 text-center min-w-[65px] bg-[#1e4566] text-white font-black" title="Attendance Percentage">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredTrainees.length > 0 ? (
                    filteredTrainees.map((trainee, idx) => {
                      const initials = trainee.name
                        ? trainee.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                        : '?';

                      const stats = getTraineeMonthStats(trainee);

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors group"
                        >
                          {/* Sticky Trainee Column */}
                          <td className="py-2.5 px-4 sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-750 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#2F6798]/10 dark:bg-[#2F6798]/20 text-[#2F6798] dark:text-blue-300 flex items-center justify-center text-[10px] font-black shrink-0 border border-[#2F6798]/20">
                                {initials}
                              </div>
                              <div className="truncate max-w-[150px]">
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block truncate" title={trainee.name}>
                                  {trainee.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] font-semibold text-slate-400 truncate">
                                    {trainee.batch}
                                  </span>
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60 uppercase">
                                    {trainee.account}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Days Cells */}
                          {monthDays.map(day => {
                            const key = `${day.iso}___${trainee.name.trim().toLowerCase()}`;
                            const record = dailyRecordsMap[key];
                            const tagCode = record?.attCode || '';
                            const tagMatch = ATTENDANCE_TAGS.find(t => t.code === tagCode);
                            const hasNote = Boolean(record?.notes && record.notes.trim().length > 0);

                            return (
                              <td
                                key={day.iso}
                                className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 relative ${
                                  day.isToday
                                    ? 'bg-blue-50/30 dark:bg-blue-950/20'
                                    : day.isWeekend
                                    ? 'bg-slate-50/40 dark:bg-slate-900/30'
                                    : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAdmin && !isTrainer) {
                                      showToast('Admin Mode is Read-Only. Only trainers can modify trainee attendance tags.', 'info');
                                      return;
                                    }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setPopoverAnchor({
                                      trainee,
                                      date: day.iso,
                                      x: Math.max(130, Math.min(window.innerWidth - 130, rect.left + rect.width / 2)),
                                      y: rect.bottom + 6
                                    });
                                  }}
                                  title={`${trainee.name} - ${day.iso}${tagMatch ? `: ${tagMatch.label}` : ': Untagged'}${hasNote ? ` | Note: "${record.notes}"` : ''} (Click to open dropdown)`}
                                  className={`w-7 h-7 mx-auto rounded-[7px] text-[11px] font-black border transition-all flex items-center justify-center relative ${
                                    tagMatch
                                      ? `${tagMatch.color} shadow-2xs hover:scale-110 active:scale-95 cursor-pointer`
                                      : isAdmin && !isTrainer
                                      ? 'bg-transparent text-slate-200 dark:text-slate-700 border-transparent cursor-default'
                                      : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200/70 dark:border-slate-700 hover:border-[#2F6798] hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-500 cursor-pointer'
                                  }`}
                                >
                                  {tagMatch ? (
                                    <span>{tagMatch.short}</span>
                                  ) : (
                                    <span className="text-[9px] opacity-30 font-mono">-</span>
                                  )}
                                  {/* Small indicator dot if note exists */}
                                  {hasNote && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#2F6798] ring-1 ring-white dark:ring-slate-900" />
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          {/* Summary Badges */}
                          <td className="py-2 px-2 text-center bg-emerald-50/30 dark:bg-emerald-950/20">
                            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-xs">
                              {stats.p}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center bg-amber-50/30 dark:bg-amber-950/20">
                            <span className="font-extrabold text-amber-700 dark:text-amber-300 text-xs">
                              {stats.l}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center bg-orange-50/30 dark:bg-orange-950/20">
                            <span className="font-extrabold text-orange-700 dark:text-orange-300 text-xs">
                              {stats.u}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center bg-rose-50/30 dark:bg-rose-950/20">
                            <span className="font-extrabold text-rose-700 dark:text-rose-300 text-xs">
                              {stats.a}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-[11px] bg-slate-50 dark:bg-slate-900/60">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                parseInt(stats.rate, 10) >= 95
                                   ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : parseInt(stats.rate, 10) >= 90
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                              }`}
                            >
                              {stats.rate}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={monthDays.length + 6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No trainees found for this month &amp; filter selection.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting the batch, account, or search query.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Matrix Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Displaying <strong>{filteredTrainees.length}</strong> trainees for <strong>{formattedMatrixPeriodLabel}</strong>
              </span>
              <span className="font-semibold text-slate-400">
                {monthDays.length} Total Days in View ({matrixRange.charAt(0).toUpperCase() + matrixRange.slice(1)})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Reason Notes Right-Side Slide-Over Drawer */}
      {activeNoteTrainee && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-auto">
          {/* Backdrop */}
          <button
            aria-label="Close notes drawer"
            onClick={() => {
              setActiveNoteTrainee(null);
              setActiveNoteDate(null);
            }}
            className="absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 opacity-100 cursor-default"
          />

          {/* Right-Side Drawer Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Attendance Reason Notes"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] sm:max-w-[520px] flex-col overflow-hidden bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out animate-in slide-in-from-right"
          >
            {/* Header - CTNP Theme */}
            <header className="bg-[#2F6798] px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between shrink-0 shadow-md relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold tracking-wide text-white uppercase leading-tight">
                    Attendance Reason Notes
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-white font-bold truncate max-w-[200px]">
                      {activeNoteTrainee.name}
                    </span>
                    <span className="text-[10px] text-white/85 font-medium px-2 py-0.5 rounded-md bg-white/15 border border-white/10 shrink-0">
                      {activeNoteTrainee.batch} &middot; {activeNoteTrainee.account}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveNoteTrainee(null);
                  setActiveNoteDate(null);
                }}
                aria-label="Close"
                className="text-white/80 hover:text-white transition-colors focus:outline-none p-2 rounded-xl hover:bg-white/15 relative z-10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Drawer Body */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 no-scrollbar">
              {/* Context Summary Box */}
              <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
                  Trainee Status Overview
                </span>
                <div className="grid grid-cols-3 gap-3 text-center divide-x divide-slate-200/60 dark:divide-slate-700/60">
                  <div className="px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Date</span>
                    <span className="font-black text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{activeNoteDate || selectedDate}</span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Current Tag</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                      {(() => {
                        const effDate = activeNoteDate || selectedDate;
                        const key = `${effDate}___${activeNoteTrainee.name.trim().toLowerCase()}`;
                        const code = dailyRecordsMap[key]?.attCode || (effDate === selectedDate ? activeNoteTrainee.attCode : '');
                        return ATTENDANCE_TAGS.find(t => t.code === code)?.label || 'Untagged';
                      })()}
                    </span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Status</span>
                    <span className="font-black text-[#2F6798] dark:text-blue-400 text-xs sm:text-sm">{activeNoteTrainee.status}</span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Reasons */}
              {isTrainer && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2F6798]" /> Quick Reason Presets:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {QUICK_REASONS.map((reason, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTempNoteText(reason)}
                        className="text-[11px] font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#2F6798] hover:text-white border border-slate-200/80 dark:border-slate-700 transition-all text-left shadow-2xs group cursor-pointer"
                      >
                        <span className="line-clamp-2">{reason}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Reason Textarea */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
                  <span>Detailed Reason / Comments:</span>
                  {isTrainer && <span className="text-[10px] font-normal text-slate-400">Click a preset above or type custom</span>}
                </label>
                <textarea
                  value={tempNoteText}
                  onChange={e => setTempNoteText(e.target.value)}
                  readOnly={isAdmin && !isTrainer}
                  placeholder={
                    isTrainer
                      ? "Enter the specific reason for late, absence, undertime, or status change..."
                      : "No notes recorded by trainer."
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 shadow-inner leading-relaxed"
                />
              </div>

              {/* Author & Timestamp Info */}
              {activeNoteTrainee.updatedAt && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Logged by: <strong className="text-slate-700 dark:text-slate-200">{activeNoteTrainee.updatedBy || 'Trainer'}</strong></span>
                  <span>{new Date(activeNoteTrainee.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveNoteTrainee(null);
                  setActiveNoteDate(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isAdmin && !isTrainer ? 'Close' : 'Cancel'}
              </button>

              {isTrainer && (
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>Save Reason Note</span>
                </button>
              )}
            </footer>
          </aside>
        </div>,
        document.body
      )}

      {/* Interactive Floating Cell Dropdown Popover (Matrix View) */}
      {popoverAnchor && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-[0.5px]"
            onClick={() => setPopoverAnchor(null)}
          />

          {/* Floating Dropdown Card */}
          <div
            style={{
              position: 'fixed',
              left: `${popoverAnchor.x}px`,
              top: `${Math.min(window.innerHeight - 280, popoverAnchor.y)}px`,
              transform: 'translateX(-50%)'
            }}
            className="w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header with trainee info and date */}
            <div className="px-1 py-1 border-b border-slate-100 dark:border-slate-800 mb-2 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                  {popoverAnchor.trainee.name}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-0.5">
                  <span>{new Date(popoverAnchor.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>&middot;</span>
                  <span className="uppercase text-sky-700 dark:text-sky-400 font-bold">{popoverAnchor.trainee.account}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPopoverAnchor(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tag Selection Options */}
            <div className="space-y-1">
              {[
                { code: 'P', label: 'P - Present', hover: 'hover:bg-[#D1FAE5]/60 hover:text-[#065F46]', badge: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' },
                { code: 'L', label: 'L - Late', hover: 'hover:bg-[#FEF3C7]/60 hover:text-[#92400E]', badge: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' },
                { code: 'U', label: 'U - Undertime', hover: 'hover:bg-[#FFEDD5]/60 hover:text-[#9A3412]', badge: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]' },
                { code: 'A', label: 'A - Absent', hover: 'hover:bg-[#FFE4E6]/60 hover:text-[#9F1239]', badge: 'bg-[#FFE4E6] text-[#9F1239] border-[#FECDD3]' },
              ].map(opt => {
                const key = `${popoverAnchor.date}___${popoverAnchor.trainee.name.trim().toLowerCase()}`;
                const currentCode = dailyRecordsMap[key]?.attCode || '';
                const isSelected = currentCode === opt.code;

                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      handleTagChange(popoverAnchor.trainee, opt.code as any, popoverAnchor.date);
                      setPopoverAnchor(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-[#2F6798] dark:text-blue-400 ring-1 ring-slate-200 dark:ring-slate-700'
                        : `${opt.hover} text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-[6px] text-[10px] font-black border flex items-center justify-center shrink-0 ${opt.badge}`}>
                        {opt.code}
                      </span>
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#2F6798] dark:text-blue-400 stroke-[3]" />}
                  </button>
                );
              })}

              {/* Clear Option */}
              <button
                type="button"
                onClick={() => {
                  handleTagChange(popoverAnchor.trainee, '', popoverAnchor.date);
                  setPopoverAnchor(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-slate-400" />
                <span>Clear Tag</span>
              </button>
            </div>

            {/* Note Divider & Note Action */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const t = popoverAnchor.trainee;
                  const d = popoverAnchor.date;
                  setPopoverAnchor(null);
                  handleOpenNoteModal(t, d);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {dailyRecordsMap[`${popoverAnchor.date}___${popoverAnchor.trainee.name.trim().toLowerCase()}`]?.notes
                    ? 'View / Edit Reason Note'
                    : '+ Add Reason Note'}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
