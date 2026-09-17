'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
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
  { code: 'P', label: 'Present', short: 'P', color: 'bg-emerald-500 text-white border-emerald-600', lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' },
  { code: 'L', label: 'Late', short: 'L', color: 'bg-amber-500 text-white border-amber-600', lightColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', dot: 'bg-amber-500' },
  { code: 'U', label: 'Undertime', short: 'U', color: 'bg-orange-500 text-white border-orange-600', lightColor: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800', dot: 'bg-orange-500' },
  { code: 'A', label: 'Absent', short: 'A', color: 'bg-rose-500 text-white border-rose-600', lightColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', dot: 'bg-rose-500' },
] as const;

const LIFECYCLE_STATUSES = [
  { value: 'ONGOING', label: 'Ongoing', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' },
  { value: 'ENDORSED', label: 'Endorsed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'EOC', label: 'EOC (End of Contract)', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  { value: 'AWOL', label: 'AWOL', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' },
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

  // Note Modal state
  const [activeNoteTrainee, setActiveNoteTrainee] = useState<TraineeAttendanceItem | null>(null);
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
  const handleTagChange = async (trainee: TraineeAttendanceItem, newTag: 'P' | 'L' | 'U' | 'A') => {
    if (isAdmin && !isTrainer) {
      showToast('Admin Mode is Read-Only. Only assigned trainers can mark attendance.', 'info');
      return;
    }

    const nextCode = trainee.attCode === newTag ? '' : newTag;
    const key = `${selectedDate}___${trainee.name.trim().toLowerCase()}`;

    // Optimistic UI update
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
        attCode: nextCode,
        status: trainee.status,
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
              attCode: nextCode,
              status: trainee.status,
              notes: trainee.notes
            }
          ]
        })
      });

      if (!res.ok) throw new Error('Failed to save attendance');
      const tagLabel = ATTENDANCE_TAGS.find(t => t.code === nextCode)?.label || 'Untagged';
      showToast(`${trainee.name} tagged as ${tagLabel}`, 'success');
    } catch (err: any) {
      console.error('Error saving tag:', err);
      showToast('Failed to save attendance tag. Please retry.', 'error');
      fetchDailyData(selectedDate);
    }
  };

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
  const handleOpenNoteModal = (trainee: TraineeAttendanceItem) => {
    setActiveNoteTrainee(trainee);
    setTempNoteText(trainee.notes || '');
  };

  // Save Reason Note
  const handleSaveNote = async () => {
    if (!activeNoteTrainee) return;
    if (isAdmin && !isTrainer) {
      showToast('Admin Mode is Read-Only. Notes cannot be edited by admins.', 'info');
      setActiveNoteTrainee(null);
      return;
    }

    setIsSaving(true);
    const key = `${selectedDate}___${activeNoteTrainee.name.trim().toLowerCase()}`;

    // Optimistic update
    setDailyRecordsMap(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        date: selectedDate,
        traineeName: activeNoteTrainee.name,
        batchName: activeNoteTrainee.batch,
        accountName: activeNoteTrainee.account,
        trainerName: activeNoteTrainee.assignedTrainer,
        trainingType: activeNoteTrainee.trainingType,
        attCode: activeNoteTrainee.attCode,
        status: activeNoteTrainee.status,
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
          date: selectedDate,
          updatedBy: userName || 'Trainer',
          records: [
            {
              date: selectedDate,
              traineeName: activeNoteTrainee.name,
              batchName: activeNoteTrainee.batch,
              accountName: activeNoteTrainee.account,
              trainerName: activeNoteTrainee.assignedTrainer,
              trainingType: activeNoteTrainee.trainingType,
              attCode: activeNoteTrainee.attCode,
              status: activeNoteTrainee.status,
              notes: tempNoteText.trim()
            }
          ]
        })
      });

      if (!res.ok) throw new Error('Failed to save note');
      showToast(`Reason note saved for ${activeNoteTrainee.name}`, 'success');
      setActiveNoteTrainee(null);
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
          ...item,
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

  // Mini 7-Day Date Ribbon Generator
  const dateRibbon = useMemo(() => {
    const items = [];
    const center = new Date(selectedDate);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const isSelected = iso === selectedDate;
      const isToday = iso === new Date().toISOString().split('T')[0];
      items.push({ iso, dayName, dayNum, isSelected, isToday });
    }
    return items;
  }, [selectedDate]);

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

      {/* Calendar Control Ribbon & Date Navigator */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Active Date Title & Quick Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-600">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                title="Previous Day"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-[#2F6798] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={setDateToday}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-[#2F6798] transition-all"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                title="Next Day"
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-[#2F6798] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative group">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2F6798]/10 text-[#2F6798] dark:bg-blue-950/60 dark:text-blue-300 rounded-xl border border-[#2F6798]/20">
                <CalendarIcon className="w-4 h-4 text-[#2F6798]" />
                <span className="text-xs sm:text-sm font-black tracking-tight">{formattedSelectedDate}</span>
              </div>
            </div>
          </div>

          {/* Date Picker Input & Quick Bulk Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Pick Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              />
            </div>

            {/* Quick Mark All Present for Trainer */}
            {isTrainer && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
            )}
          </div>
        </div>

        {/* 7-Day Visual Strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {dateRibbon.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDate(item.iso)}
              className={`p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                item.isSelected
                  ? 'bg-[#2F6798] text-white border-[#2F6798] shadow-md -translate-y-0.5'
                  : item.isToday
                  ? 'bg-blue-50/70 text-[#2F6798] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 hover:bg-blue-100'
                  : 'bg-slate-50/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${item.isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                {item.dayName}
              </span>
              <span className={`text-sm sm:text-base font-black block ${item.isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                {item.dayNum}
              </span>
              {item.isToday && !item.isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#2F6798] mt-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Attendance Breakdown KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Scheduled / Tagged */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Scheduled Cohort
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50">{dailyKPIs.total}</span>
              <span className="text-[10px] font-bold text-slate-400">({dailyKPIs.taggedCount} Tagged)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Present */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Present (P)
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">{dailyKPIs.present}</span>
              <span className="text-[10px] font-bold text-emerald-600">({dailyKPIs.presentRate})</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Late */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Late (L)
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300">{dailyKPIs.late}</span>
              <span className="text-[10px] font-bold text-amber-500">
                ({dailyKPIs.total > 0 ? ((dailyKPIs.late / dailyKPIs.total) * 100).toFixed(1) + '%' : '0%'})
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Undertime */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-200/80 dark:border-orange-900/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Undertime (U)
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-orange-700 dark:text-orange-300">{dailyKPIs.undertime}</span>
              <span className="text-[10px] font-bold text-orange-500">
                ({dailyKPIs.total > 0 ? ((dailyKPIs.undertime / dailyKPIs.total) * 100).toFixed(1) + '%' : '0%'})
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Absent */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Absent (A)
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">{dailyKPIs.absent}</span>
              <span className="text-[10px] font-bold text-rose-500">
                ({dailyKPIs.total > 0 ? ((dailyKPIs.absent / dailyKPIs.total) * 100).toFixed(1) + '%' : '0%'})
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-20 space-y-4">
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
              <ShieldCheck className="w-3.5 h-3.5 text-[#2F6798]" /> Status Filter
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

        {/* Attendance Tag Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
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
      </div>

      {/* Trainees Attendance Roster Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-[#2F6798] dark:text-[#5a9fd4]" />
            <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase font-mono">
              DAILY ATTENDANCE ROSTER ({filteredTrainees.length}) &middot; {formattedSelectedDate}
            </h3>
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
                <option value={25}>25</option>
                <option value={50}>50</option>
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
                <th className="py-3 px-4 text-center min-w-[140px]">Lifecycle Status</th>
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-fit">
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
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? `${tag.color} shadow-sm shadow-black/10 scale-105 ring-2 ring-white dark:ring-slate-800`
                                    : isReadOnly
                                    ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-60'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                <span>{tag.short}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Lifecycle Status Dropdown */}
                      <td className="py-3 px-4 text-center">
                        {isTrainer ? (
                          <div className="w-32 mx-auto">
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
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-all max-w-[220px] text-left truncate cursor-pointer shadow-2xs"
                              title={trainee.notes}
                            >
                              <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">{trainee.notes}</span>
                            </button>
                            {isTrainer && (
                              <button
                                type="button"
                                onClick={() => handleOpenNoteModal(trainee)}
                                className="p-1 text-slate-400 hover:text-[#2F6798] transition-colors rounded"
                                title="Edit note"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(trainee)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                              isTrainer
                                ? 'bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#2F6798] hover:text-[#2F6798] cursor-pointer'
                                : 'bg-transparent text-slate-400 border-transparent cursor-default'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>{isTrainer ? '+ Add Note' : 'No Notes'}</span>
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
      </div>

      {/* Reason Notes Right-Side Slide-Over Drawer */}
      {activeNoteTrainee && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-auto">
          {/* Backdrop */}
          <button
            aria-label="Close notes drawer"
            onClick={() => setActiveNoteTrainee(null)}
            className="absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 opacity-100 cursor-default"
          />

          {/* Right-Side Drawer Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Attendance Reason Notes"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] sm:max-w-[520px] flex-col overflow-hidden bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out animate-in slide-in-from-right"
          >
            {/* Header - CTNP Theme (Taller, spacious header) */}
            <header className="bg-gradient-to-r from-[#2F6798] to-[#25547c] px-6 py-6 sm:px-8 sm:py-7 flex items-center justify-between shrink-0 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
              
              <div className="flex items-center gap-3.5 relative z-10 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-white uppercase leading-tight">
                    Attendance Reason Notes
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-white font-bold truncate max-w-[200px]">
                      {activeNoteTrainee.name}
                    </span>
                    <span className="text-[10px] text-white/80 font-medium px-2 py-0.5 rounded-md bg-white/15 border border-white/10 shrink-0">
                      {activeNoteTrainee.batch} &middot; {activeNoteTrainee.account}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveNoteTrainee(null)}
                aria-label="Close"
                className="text-white/80 hover:text-white transition-colors focus:outline-none p-2 rounded-xl hover:bg-white/15 relative z-10"
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
                    <span className="font-black text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{selectedDate}</span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Current Tag</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                      {ATTENDANCE_TAGS.find(t => t.code === activeNoteTrainee.attCode)?.label || 'Untagged'}
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
                        className="text-[11px] font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#2F6798] hover:text-white border border-slate-200/80 dark:border-slate-700 transition-all text-left shadow-2xs group"
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
                onClick={() => setActiveNoteTrainee(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isAdmin && !isTrainer ? 'Close' : 'Cancel'}
              </button>

              {isTrainer && (
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
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
    </div>
  );
}
