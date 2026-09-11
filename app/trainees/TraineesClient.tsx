'use client';

import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronDown,
  RefreshCw,
  Download,
  Printer,
  Users,
  TrendingDown,
  Layers,
  Building2,
  Table as TableIcon,
  LayoutGrid,
  Eye,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Briefcase,
  UserCheck,
  Loader2
} from 'lucide-react';
import { DrawerTrainee, TraineeDetailDrawer } from '@/components/TraineeDetailDrawer';
import { TraineeFormDrawer } from '@/components/TraineeFormDrawer';
import { useRole } from '@/components/providers/RoleProvider';
import { useToast } from '@/components/CustomToast';
import { CustomSelect } from '@/components/ui/CustomSelect';

export type Trainee = {
  id: string;
  name: string;
  status: string;
  month: string;
  quarter: string;
  p: number;
  a: number;
  isEndorsed: boolean;
  isLoss: boolean;
  assignedTrainer: string;
  batchName: string;
  accountName: string;
  trainingType?: 'INHOUSE' | 'PST';
};

const isLossStatus = (status?: string) => {
  if (!status) return false;
  const s = status.toUpperCase().trim();
  return ['LOSS', 'ATTRITION', 'EOC', 'AWOL', 'FAILED', 'RESIGNED', 'TERMINATED', 'RED', 'ACCOUNT REMOVED'].some(code => s.includes(code));
};

import { isTrainerMatch } from '@/lib/analytics-utils';

export default function TraineesPage({ initialTrainees = [] }: { initialTrainees?: Trainee[] }) {
  const { role, actualRole, userName, email } = useRole();
  const toast = useToast();
  const currentRole = role || actualRole;
  const isTrainer = currentRole === 'TRAINER';
  const isTrainee = currentRole === 'TRAINEE';
  const canManageTrainees = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'TRAINER'].includes(currentRole);

  const scopedInitialTrainees = useMemo(() => {
    if (!isTrainer && !isTrainee) return initialTrainees;
    if (isTrainer) {
      const qTrainer = userName || '';
      const qEmail = (email || '').toLowerCase().split('@')[0];
      return initialTrainees.filter(t => {
        if (!t.assignedTrainer) return false;
        return (
          isTrainerMatch(t.assignedTrainer, qTrainer) ||
          (qTrainer && t.assignedTrainer.toLowerCase().includes(qTrainer.toLowerCase())) ||
          (qEmail && t.assignedTrainer.toLowerCase().includes(qEmail))
        );
      });
    }
    if (isTrainee) {
      const qName = (userName || '').toLowerCase();
      const qEmail = (email || '').toLowerCase().split('@')[0];
      return initialTrainees.filter(t => {
        const tName = (t.name || '').toLowerCase();
        return (
          (qName && (tName.includes(qName) || qName.includes(tName))) ||
          (qEmail && tName.includes(qEmail))
        );
      });
    }
    return initialTrainees;
  }, [initialTrainees, isTrainer, isTrainee, userName, email]);

  const [trainees, setTrainees] = useState<Trainee[]>(scopedInitialTrainees);

  useEffect(() => {
    setTrainees(scopedInitialTrainees);
  }, [scopedInitialTrainees]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [breakdownTab, setBreakdownTab] = useState<'all' | 'inhouse' | 'pst' | 'accounts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [selectedQuarter, setSelectedQuarter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  // Sync search param from URL if navigated from Topbar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('search');
      if (s) {
        setSearchQuery(s);
      }
    }
  }, []);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null);
  const [deletingTrainee, setDeletingTrainee] = useState<Trainee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    trainingType: 'INHOUSE' as 'INHOUSE' | 'PST',
    batchName: 'General -1',
    accountName: 'General',
    assignedTrainer: 'Unassigned',
    status: 'ACTIVE',
    quarter: 'Q1',
    month: 'January'
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateTraineeForm = () => {
    const errors: Record<string, string> = {};
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else {
      const lettersOnly = trimmedName.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length < 2) {
        errors.name = 'Please enter a valid full name with at least 2 letters.';
      }
    }
    if (!formData.batchName || !formData.batchName.trim()) {
      errors.batchName = 'Batch / Wave name is required.';
    }
    if (!formData.accountName || !formData.accountName.trim()) {
      errors.accountName = 'Client account is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showToast = (msg: string, title?: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    if (type === 'success') toast.success(msg, title || 'Success');
    else if (type === 'error') toast.error(msg, title || 'Error');
    else if (type === 'warning') toast.warning(msg, title || 'Warning');
    else toast.info(msg, title || 'Info');
  };

  // Dynamic filter lists
  const availableAccounts = useMemo(() => {
    const set = new Set<string>();
    trainees.forEach(t => {
      if (t.accountName) set.add(t.accountName);
    });
    return ['All', ...Array.from(set).sort()];
  }, [trainees]);

  const availableTrainers = useMemo(() => {
    const set = new Set<string>();
    trainees.forEach(t => {
      if (t.assignedTrainer && t.assignedTrainer !== 'Unassigned') {
        set.add(t.assignedTrainer);
      }
    });
    return Array.from(set).sort();
  }, [trainees]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filter trainees based on global search & selects
  const filteredTrainees = useMemo(() => {
    return trainees.filter(t => {
      if (selectedAccount !== 'All' && t.accountName !== selectedAccount) return false;
      if (selectedQuarter !== 'All' && t.quarter !== selectedQuarter) return false;
      if (selectedMonth !== 'All' && t.month !== selectedMonth) return false;

      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesBatch = t.batchName.toLowerCase().includes(q);
        const matchesAccount = t.accountName.toLowerCase().includes(q);
        const matchesTrainer = (t.assignedTrainer || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBatch && !matchesAccount && !matchesTrainer) return false;
      }

      return true;
    });
  }, [trainees, deferredSearchQuery, selectedAccount, selectedQuarter, selectedMonth]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, selectedAccount, selectedQuarter, selectedMonth]);

  // Paginated trainees slice
  const totalPages = Math.ceil(filteredTrainees.length / pageSize) || 1;
  const paginatedTrainees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrainees.slice(start, start + pageSize);
  }, [filteredTrainees, currentPage, pageSize]);

  // Grouped datasets and top summary counts
  const { inhouseBatches, pstBatches, clientAccounts, totalHC, inhouseHC, pstHC, systemAttr } = useMemo(() => {
    const inhouseMap: Record<string, any> = {};
    const pstMap: Record<string, any> = {};
    const accountMap: Record<string, any> = {};

    let hcCount = 0;
    let ihCount = 0;
    let pstCount = 0;
    let lossCount = 0;

    filteredTrainees.forEach((t) => {
      hcCount++;
      if (t.trainingType === 'INHOUSE') ihCount++;
      else pstCount++;

      const isLoss = Boolean(t.isLoss || isLossStatus(t.status));
      if (isLoss) lossCount++;

      const acctName = t.accountName || 'Unknown Account';
      if (!accountMap[acctName]) {
        accountMap[acctName] = { 
          name: acctName, 
          trainer: t.assignedTrainer && t.assignedTrainer !== 'Unassigned' ? t.assignedTrainer : 'Unassigned',
          hc: 0, 
          lossCount: 0, 
          members: [] 
        };
      }
      accountMap[acctName].hc += 1;
      if (isLoss) accountMap[acctName].lossCount += 1;
      accountMap[acctName].members.push(t);
      if (accountMap[acctName].trainer === 'Unassigned' && t.assignedTrainer && t.assignedTrainer !== 'Unassigned') {
        accountMap[acctName].trainer = t.assignedTrainer;
      }

      const isInhouse = t.trainingType === 'INHOUSE';
      const targetMap = isInhouse ? inhouseMap : pstMap;
      const batchKey = t.batchName || 'Unknown Batch';

      if (!targetMap[batchKey]) {
        targetMap[batchKey] = {
          name: batchKey,
          trainer: t.assignedTrainer || 'Unassigned',
          hc: 0,
          lossCount: 0,
          members: []
        };
      }
      targetMap[batchKey].hc += 1;
      if (isLoss) targetMap[batchKey].lossCount += 1;
      targetMap[batchKey].members.push(t);

      if (targetMap[batchKey].trainer === 'Unassigned' && t.assignedTrainer && t.assignedTrainer !== 'Unassigned') {
        targetMap[batchKey].trainer = t.assignedTrainer;
      }
    });

    const formatAttr = (lCount: number, hc: number) => {
      if (hc === 0) return '0.0%';
      return ((lCount / hc) * 100).toFixed(1) + '%';
    };

    const inhouse = Object.values(inhouseMap).map(b => ({
      ...b,
      attr: formatAttr(b.lossCount, b.hc)
    }));

    const pst = Object.values(pstMap).map(b => ({
      ...b,
      attr: formatAttr(b.lossCount, b.hc)
    }));

    const clients = Object.values(accountMap).map(c => ({
      ...c,
      attr: formatAttr(c.lossCount, c.hc)
    }));

    const sortByName = (a: any, b: any) => a.name.localeCompare(b.name);
    const overallAttr = hcCount ? ((lossCount / hcCount) * 100).toFixed(2) + '%' : '0.00%';

    return {
      inhouseBatches: inhouse.sort(sortByName),
      pstBatches: pst.sort(sortByName),
      clientAccounts: clients.sort(sortByName),
      totalHC: hcCount,
      inhouseHC: ihCount,
      pstHC: pstCount,
      systemAttr: overallAttr
    };
  }, [filteredTrainees]);

  const openCard = (item: any, contextLabel: string, trainingType: string, accountName: string, trainer?: string) => {
    const trainersFromMembers = item.members && item.members.length > 0
      ? Array.from(new Set(item.members.map((m: any) => m.assignedTrainer).filter((t: string) => t && t !== 'Unassigned'))).join(', ')
      : '';
    const resolvedTrainer = (trainer && trainer !== 'Unassigned') 
      ? trainer 
      : (item.trainer && item.trainer !== 'Unassigned') 
      ? item.trainer 
      : (trainersFromMembers || 'Unassigned');

    setSelectedCard({
      isBatch: true,
      name: item.name,
      batchName: item.name,
      accountName,
      trainingType,
      assignedTrainer: resolvedTrainer,
      headcount: item.hc,
      attritionRate: item.attr,
      contextLabel,
      members: item.members
    });
  };

  const openTraineeCard = (t: Trainee) => {
    setSelectedCard({
      isBatch: false,
      name: t.name,
      batchName: t.batchName,
      accountName: t.accountName,
      trainingType: t.trainingType || 'TRAINING',
      assignedTrainer: t.assignedTrainer,
      status: t.status,
      p: t.p,
      a: t.a,
      isEndorsed: t.isEndorsed,
      isLoss: t.isLoss
    });
  };

  // Handle Add Trainee Submit
  const handleAddTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTrainees) {
      showToast('You have read-only access and cannot add trainees.', 'Permission Denied', 'warning');
      return;
    }
    if (!validateTraineeForm()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/trainees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const resData = await res.json();
      if (resData.success) {
        const newTrainee: Trainee = {
          id: resData.data?.id || Math.random().toString(),
          name: formData.name,
          status: formData.status,
          month: formData.month,
          quarter: formData.quarter,
          p: 0,
          a: 0,
          isEndorsed: formData.status === 'ENDORSED',
          isLoss: formData.status === 'LOSS' || formData.status === 'ATTRITION',
          assignedTrainer: formData.assignedTrainer,
          batchName: formData.batchName,
          accountName: formData.accountName,
          trainingType: formData.trainingType
        };
        setTrainees(prev => [newTrainee, ...prev]);
        showToast('Trainee added successfully!', 'Trainee Added', 'success');
        setIsAddModalOpen(false);
        setFormErrors({});
        setFormData({
          name: '',
          trainingType: 'INHOUSE',
          batchName: 'General -1',
          accountName: 'General',
          assignedTrainer: 'Unassigned',
          status: 'ACTIVE',
          quarter: 'Q1',
          month: 'January'
        });
      } else {
        showToast(resData.error || 'Failed to add trainee.', 'Addition Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding trainee.', 'Addition Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Trainee Submit
  const handleEditTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTrainees) {
      showToast('You have read-only access and cannot edit trainees.', 'Permission Denied', 'warning');
      return;
    }
    if (!editingTrainee) return;
    if (!validateTraineeForm()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/trainees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTrainee.id,
          name: formData.name,
          trainingType: formData.trainingType,
          batchName: formData.batchName,
          accountName: formData.accountName,
          assignedTrainer: formData.assignedTrainer,
          status: formData.status
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setTrainees(prev => prev.map(t => t.id === editingTrainee.id ? {
          ...t,
          name: formData.name,
          trainingType: formData.trainingType,
          batchName: formData.batchName,
          accountName: formData.accountName,
          assignedTrainer: formData.assignedTrainer,
          status: formData.status,
          isLoss: formData.status === 'LOSS' || formData.status === 'ATTRITION',
          isEndorsed: formData.status === 'ENDORSED'
        } : t));
        showToast('Trainee updated successfully!', 'Trainee Updated', 'success');
        setEditingTrainee(null);
      } else {
        showToast(resData.error || 'Failed to update trainee.', 'Update Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating trainee.', 'Update Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Trainee
  const handleDeleteTrainee = async () => {
    if (!canManageTrainees) {
      showToast('You have read-only access and cannot delete trainees.', 'Permission Denied', 'warning');
      return;
    }
    if (!deletingTrainee) return;
    setIsSubmitting(true);
    try {
      const url = `/api/trainees?name=${encodeURIComponent(deletingTrainee.name)}&type=${deletingTrainee.trainingType || 'INHOUSE'}&batch=${encodeURIComponent(deletingTrainee.batchName || '')}&account=${encodeURIComponent(deletingTrainee.accountName || '')}`;
      const res = await fetch(url, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (resData.success) {
        setTrainees(prev => prev.filter(t => !(t.name === deletingTrainee.name && t.batchName === deletingTrainee.batchName)));
        showToast('Trainee record was deleted successfully.', 'Trainee Deleted', 'success');
        setDeletingTrainee(null);
      } else {
        showToast(resData.error || 'Failed to delete trainee.', 'Delete Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting trainee.', 'Delete Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status?: string, isEndorsed?: boolean, isLoss?: boolean) => {
    const rawStatus = (status || (isEndorsed ? 'ENDORSED' : isLoss ? 'LOSS' : 'ONGOING')).trim();
    const upperStatus = rawStatus.toUpperCase();

    if (upperStatus === 'ENDORSED' || isEndorsed) {
      return <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-300 text-emerald-700 bg-emerald-50 shadow-sm">ENDORSED</span>;
    }
    if (isLoss || isLossStatus(upperStatus)) {
      return <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-red-300 text-red-700 bg-red-50 shadow-sm">{upperStatus || 'ATTRITION'}</span>;
    }
    return <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-blue-300 text-blue-700 bg-blue-50 shadow-sm">{upperStatus}</span>;
  };

  if (currentRole === 'EMPLOYEE' || currentRole === 'GUEST') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700/80 text-center max-w-lg mx-auto space-y-4 shadow-sm my-12">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center mx-auto">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Personal Performance Portal</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Company-wide trainee directories and batch management are reserved for Trainers and Administrators. Your personal training progress, attendance rate, and weekly evaluations are available on your Dashboard.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-md transition-all"
        >
          Return to My Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full pb-10 font-sans text-slate-800 dark:text-slate-200">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2F6798] dark:text-[#5a9fd4]" /> Refresh Data
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Download className="w-3.5 h-3.5 text-[#2F6798] dark:text-[#5a9fd4]" /> Export Summary
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Printer className="w-3.5 h-3.5 text-[#2F6798] dark:text-[#5a9fd4]" /> Print / PDF
          </button>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-3">
          {canManageTrainees && !isTrainee && (
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  trainingType: 'INHOUSE',
                  batchName: '',
                  accountName: availableAccounts.length > 1 ? availableAccounts[1] : 'General',
                  assignedTrainer: isTrainer ? (userName || 'Trainer') : 'Unassigned',
                  status: 'ACTIVE',
                  quarter: 'Q1',
                  month: 'January'
                });
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" /> Add Trainee
            </button>
          )}

          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-[#2F6798] dark:text-[#5a9fd4] shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Department Breakdown
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-[#2F6798] dark:text-[#5a9fd4] shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Trainees Table
            </button>
          </div>
        </div>
      </div>

      {/* TOP SUMMARY KPI BOXES - PROPERLY ARRANGED & RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Box 1: Total Active Headcount */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">TOTAL HEADCOUNT</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalHC.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#2F6798] dark:text-[#5a9fd4] shrink-0 ml-2 relative z-10">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Box 2: Inhouse Trainees */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">INHOUSE TRAINEES</p>
            <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{inhouseHC.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 ml-2 relative z-10">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Box 3: PST Trainees */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">PST TRAINEES</p>
            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{pstHC.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 relative z-10">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Box 4: Active Accounts */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">CLIENT ACCOUNTS</p>
            <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{clientAccounts.length}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 ml-2 relative z-10">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Box 5: System Attrition */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">SYSTEM ATTRITION</p>
            <h4 className={`text-2xl font-black mt-0.5 ${parseFloat(systemAttr) > 5 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {systemAttr}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 ml-2 relative z-10">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* UNIFIED FILTER & SUB-TABS CONTAINER */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-20 space-y-4">
        {/* Row 1: Filters with CustomSelect and Longer Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2 sm:col-span-1">
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6798]" /> Quarter Filter
            </label>
            <CustomSelect
              value={selectedQuarter}
              onChange={val => setSelectedQuarter(val)}
              options={[
                { value: 'All', label: 'All Quarters' },
                { value: 'Q1', label: 'Q1' },
                { value: 'Q2', label: 'Q2' },
                { value: 'Q3', label: 'Q3' },
                { value: 'Q4', label: 'Q4' }
              ]}
            />
          </div>

          <div className="lg:col-span-2 sm:col-span-1">
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2F6798]" /> Month Filter
            </label>
            <CustomSelect
              value={selectedMonth}
              onChange={val => setSelectedMonth(val)}
              options={[
                { value: 'All', label: 'All Months' },
                { value: 'January', label: 'January' },
                { value: 'February', label: 'February' },
                { value: 'March', label: 'March' },
                { value: 'April', label: 'April' },
                { value: 'May', label: 'May' },
                { value: 'June', label: 'June' },
                { value: 'July', label: 'July' },
                { value: 'August', label: 'August' },
                { value: 'September', label: 'September' },
                { value: 'October', label: 'October' },
                { value: 'November', label: 'November' },
                { value: 'December', label: 'December' }
              ]}
            />
          </div>

          <div className="lg:col-span-3 sm:col-span-1">
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Client Account Filter
            </label>
            <CustomSelect
              value={selectedAccount}
              onChange={val => setSelectedAccount(val)}
              options={availableAccounts.map(acct => ({
                value: acct,
                label: acct === 'All' ? 'All Client Accounts' : acct
              }))}
            />
          </div>

          <div className="lg:col-span-5 sm:col-span-1">
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Search Trainee / Batch / Trainer
            </label>
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type name, batch, or trainer..."
                className="h-10 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Sub-Tabs inside the same unified container (below filters) */}
        {viewMode === 'cards' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto p-0.5">
              <button
                type="button"
                onClick={() => setBreakdownTab('all')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  breakdownTab === 'all'
                    ? 'bg-[#2F6798] text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> All Overview (3 Columns)
              </button>
              <button
                type="button"
                onClick={() => setBreakdownTab('inhouse')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  breakdownTab === 'inhouse'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Inhouse Training ({inhouseBatches.length})
              </button>
              <button
                type="button"
                onClick={() => setBreakdownTab('pst')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  breakdownTab === 'pst'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> PST Training ({pstBatches.length})
              </button>
              <button
                type="button"
                onClick={() => setBreakdownTab('accounts')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  breakdownTab === 'accounts'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Client Accounts ({clientAccounts.length})
              </button>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 pr-2 hidden sm:block">
              {breakdownTab === 'all' && 'Side-by-side department overview'}
              {breakdownTab === 'inhouse' && `Full grid view of ${inhouseBatches.length} Inhouse batches`}
              {breakdownTab === 'pst' && `Full grid view of ${pstBatches.length} PST waves`}
              {breakdownTab === 'accounts' && `Full grid view of ${clientAccounts.length} Client accounts`}
            </div>
          </div>
        )}

        {/* Row 3: Breakdown & Table Content inside the same big external container */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {viewMode === 'cards' && (
            <div className="space-y-4 w-full">
              {/* TAB 1: ALL OVERVIEW (3-COLUMN SIDE BY SIDE) */}
              {breakdownTab === 'all' && (
                <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90 dark:divide-slate-700/80">

                {/* Column 1: INHOUSE TRAINING */}
                <div className="p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-800/90 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> INHOUSE TRAINING
                    </h3>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      DEPT 1
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {inhouseBatches.length === 0 ? (
                      <div className="text-center py-8 text-xs font-medium text-slate-400 dark:text-slate-500">No matching Inhouse batches</div>
                    ) : (
                      inhouseBatches.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openCard(item, 'DEPT 1', 'INHOUSE TRAINING', 'General', item.trainer)}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3.5 py-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                        >
                          <span className="text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] truncate" title={item.name}>{item.name}</span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                            HC: <strong className="text-slate-800 dark:text-slate-100">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>{item.attr}</strong>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: PST TRAINING */}
                <div className="p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-800/90 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> PST TRAINING
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      DEPT 2
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {pstBatches.length === 0 ? (
                      <div className="text-center py-8 text-xs font-medium text-slate-400 dark:text-slate-500">No matching PST waves</div>
                    ) : (
                      pstBatches.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openCard(item, 'DEPT 2', 'PST TRAINING', item.accountName || 'PST Account', item.trainer)}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3.5 py-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={item.name}>{item.name}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded shrink-0 max-w-[95px] truncate" title={item.trainer}>
                              {item.trainer}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                            HC: <strong className="text-slate-800 dark:text-slate-100">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>{item.attr}</strong>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: CLIENT ACCOUNTS */}
                <div className="p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-800/90 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> CLIENT ACCOUNTS
                    </h3>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      SUMMARY
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {clientAccounts.length === 0 ? (
                      <div className="text-center py-8 text-xs font-medium text-slate-400 dark:text-slate-500">No matching client accounts</div>
                    ) : (
                      clientAccounts.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openCard(item, 'SUMMARY', 'CLIENT ACCOUNTS', item.name, undefined)}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3.5 py-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                        >
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase truncate" title={item.name}>{item.name}</span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                            HC: <strong className="text-slate-800 dark:text-slate-100">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>{item.attr}</strong>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: INHOUSE FULL EXPANDED GRID VIEW */}
          {breakdownTab === 'inhouse' && (
            <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-4 w-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> INHOUSE TRAINING BATCHES ({inhouseBatches.length})
                </h3>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  DEPT 1
                </span>
              </div>
              {inhouseBatches.length === 0 ? (
                <div className="text-center py-12 text-xs font-medium text-slate-400 dark:text-slate-500">No matching Inhouse batches</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {inhouseBatches.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openCard(item, 'DEPT 1', 'INHOUSE TRAINING', 'General', item.trainer)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                    >
                      <span className="text-xs font-bold text-[#2F6798] dark:text-[#5a9fd4] truncate" title={item.name}>{item.name}</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                        HC: <strong className="text-slate-800 dark:text-slate-100">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>{item.attr}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PST FULL EXPANDED GRID VIEW (NO INDIVIDUAL SCROLLING) */}
          {breakdownTab === 'pst' && (
            <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-4 w-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> PST TRAINING WAVES ({pstBatches.length})
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  DEPT 2
                </span>
              </div>
              {pstBatches.length === 0 ? (
                <div className="text-center py-12 text-xs font-medium text-slate-400 dark:text-slate-500">No matching PST waves</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {pstBatches.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openCard(item, 'DEPT 2', 'PST TRAINING', item.accountName || 'PST Account', item.trainer)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={item.name}>{item.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded shrink-0 max-w-[95px] truncate" title={item.trainer}>
                          {item.trainer}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                        HC: <strong className="text-slate-800 dark:text-slate-100">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>{item.attr}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLIENT ACCOUNTS FULL EXPANDED GRID VIEW */}
          {breakdownTab === 'accounts' && (
            <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-4 w-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> CLIENT ACCOUNTS SUMMARY ({clientAccounts.length})
                </h3>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  SUMMARY
                </span>
              </div>
              {clientAccounts.length === 0 ? (
                <div className="text-center py-12 text-xs font-medium text-slate-400 dark:text-slate-500">No matching client accounts</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {clientAccounts.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openCard(item, 'SUMMARY', 'CLIENT ACCOUNTS', item.name, undefined)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase truncate" title={item.name}>{item.name}</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                        HC: <strong className="text-slate-800 dark:text-slate-100">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>{item.attr}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: ALL TRAINEES TABLE WITH PAGINATION & UNBOXED COLORED ACTION ICONS */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#2F6798] dark:text-[#5a9fd4]" />
              <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase font-mono">
                ALL TRAINEES DIRECTORY ({filteredTrainees.length})
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <span>
                Showing {filteredTrainees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTrainees.length)} of {filteredTrainees.length} records
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto custom-horizontal-scrollbar touch-pan-x overscroll-x-contain pb-1">
            <table className="w-full text-left text-xs border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                  <th className="py-3 px-4 min-w-[180px]">Trainee Name</th>
                  <th className="py-3 px-4 min-w-[120px]">Track Type</th>
                  <th className="py-3 px-4 min-w-[130px]">Batch / Wave</th>
                  <th className="py-3 px-4 min-w-[140px]">Client Account</th>
                  <th className="py-3 px-4 min-w-[160px]">Assigned Trainer</th>
                  <th className="py-3 px-4 min-w-[140px]">Attendance (P / A)</th>
                  <th className="py-3 px-4 min-w-[120px]">Status</th>
                  <th className="py-3 px-4 text-right min-w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {paginatedTrainees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-slate-500 font-medium">
                      No trainees found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedTrainees.map((t) => {
                    const totalAtt = (t.p || 0) + (t.a || 0);
                    const attRate = totalAtt ? `${(((t.p || 0) / totalAtt) * 100).toFixed(0)}%` : 'N/A';
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors whitespace-nowrap"
                      >
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 min-w-[180px]">
                          {t.name}
                        </td>
                        <td className="py-3 px-4 min-w-[120px]">
                          {/* Circular Pill Shape for Track Type */}
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm border ${t.trainingType === 'INHOUSE'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            }`}>
                            {t.trainingType || 'TRAINING'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#2F6798] dark:text-[#5a9fd4] min-w-[130px]">
                          {t.batchName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium min-w-[140px]">
                          {t.accountName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium min-w-[160px]">
                          {t.assignedTrainer || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300 min-w-[140px]">
                          <span className="font-bold">{attRate}</span> ({t.p || 0}P / {t.a || 0}A)
                        </td>
                        <td className="py-3 px-4 min-w-[120px]">
                          {renderStatusBadge(t.status, t.isEndorsed, t.isLoss)}
                        </td>
                        <td className="py-3 px-4 text-right min-w-[90px]">
                          {/* Unboxed Colored Icon Actions */}
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openTraineeCard(t)}
                              title="View Details"
                              className="text-[#C8A54B] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canManageTrainees && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingTrainee(t);
                                    setFormErrors({});
                                    setFormData({
                                      name: t.name,
                                      trainingType: t.trainingType || 'INHOUSE',
                                      batchName: t.batchName,
                                      accountName: t.accountName,
                                      assignedTrainer: t.assignedTrainer || 'Unassigned',
                                      status: t.status || 'ACTIVE',
                                      quarter: t.quarter || 'Q1',
                                      month: t.month || 'January'
                                    });
                                  }}
                                  title="Edit Trainee"
                                  className="text-[#2F6798] dark:text-[#5a9fd4] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingTrainee(t)}
                                  title="Delete Trainee"
                                  className="text-[#ED1C25] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE PAGINATION CONTROLS */}
          {filteredTrainees.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                {/* Page Number Buttons */}
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
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${currentPage === p
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
      )}
        </div>
      </div>

      {/* ADD TRAINEE DRAWER (RIGHT PANEL) */}
      {canManageTrainees && (
        <TraineeFormDrawer
          isOpen={isAddModalOpen}
          mode="add"
          initialData={formData}
          accounts={availableAccounts}
          trainers={isTrainer ? [userName || 'Trainer'] : availableTrainers}
          existingTrainees={trainees}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={async (data) => {
            setIsSubmitting(true);
            try {
              const res = await fetch('/api/trainees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              const resData = await res.json();
              if (resData.success) {
                const newTrainee: Trainee = {
                  id: resData.data?.id || Math.random().toString(),
                  name: data.name,
                  status: data.status,
                  month: data.month || 'January',
                  quarter: data.quarter || 'Q1',
                  p: 0,
                  a: 0,
                  isEndorsed: data.status === 'ENDORSED',
                  isLoss: data.status === 'LOSS' || data.status === 'ATTRITION',
                  assignedTrainer: data.assignedTrainer,
                  batchName: data.batchName,
                  accountName: data.accountName,
                  trainingType: data.trainingType
                };
                setTrainees(prev => [newTrainee, ...prev]);
                showToast('Trainee added successfully!', 'Trainee Added', 'success');
                setIsAddModalOpen(false);
              } else {
                showToast(resData.error || 'Failed to add trainee.', 'Addition Failed', 'error');
              }
            } catch (err: any) {
              showToast(err.message || 'Error adding trainee.', 'Addition Error', 'error');
            } finally {
              setIsSubmitting(false);
            }
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* EDIT TRAINEE DRAWER (RIGHT PANEL) */}
      {canManageTrainees && editingTrainee && (
        <TraineeFormDrawer
          isOpen={Boolean(editingTrainee)}
          mode="edit"
          initialData={{
            id: editingTrainee.id,
            name: editingTrainee.name,
            trainingType: editingTrainee.trainingType || 'INHOUSE',
            batchName: editingTrainee.batchName,
            accountName: editingTrainee.accountName,
            assignedTrainer: editingTrainee.assignedTrainer || 'Unassigned',
            status: editingTrainee.status || 'ACTIVE',
            quarter: editingTrainee.quarter || 'Q1',
            month: editingTrainee.month || 'January'
          }}
          accounts={availableAccounts}
          trainers={availableTrainers}
          existingTrainees={trainees}
          onClose={() => setEditingTrainee(null)}
          onSubmit={async (data) => {
            setIsSubmitting(true);
            try {
              const res = await fetch('/api/trainees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  originalName: editingTrainee.name,
                  id: editingTrainee.id || editingTrainee.name,
                  name: data.name,
                  trainingType: data.trainingType,
                  batchName: data.batchName,
                  accountName: data.accountName,
                  assignedTrainer: data.assignedTrainer,
                  status: data.status
                })
              });
              const resData = await res.json();
              if (resData.success) {
                setTrainees(prev => prev.map(t => (t.id === editingTrainee.id || t.name === editingTrainee.name) ? {
                  ...t,
                  id: data.name,
                  name: data.name,
                  trainingType: data.trainingType,
                  batchName: data.batchName,
                  accountName: data.accountName,
                  assignedTrainer: data.assignedTrainer,
                  status: data.status,
                  isLoss: data.status === 'LOSS' || data.status === 'ATTRITION',
                  isEndorsed: data.status === 'ENDORSED'
                } : t));
                showToast('Trainee updated successfully!', 'Trainee Updated', 'success');
                setEditingTrainee(null);
              } else {
                showToast(resData.error || 'Failed to update trainee.', 'Update Failed', 'error');
              }
            } catch (err: any) {
              showToast(err.message || 'Error updating trainee.', 'Update Error', 'error');
            } finally {
              setIsSubmitting(false);
            }
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* DELETE CONFIRMATION MODAL - RENDERED VIA PORTAL */}
      {canManageTrainees && deletingTrainee && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in-95 duration-150 text-center space-y-6 relative">
            <button
              onClick={() => setDeletingTrainee(null)}
              className="absolute top-5 right-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-20 h-20 bg-[#ED1C25] rounded-full flex items-center justify-center mx-auto shadow-md shadow-red-200 dark:shadow-red-900/30">
              <Trash2 className="h-9 w-9 text-white stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Delete Trainee Record</h3>
              <div className="flex flex-col gap-1 text-center text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium">
                  Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">{deletingTrainee.name}</strong>?
                </span>
                <span className="text-xs font-normal leading-relaxed">
                  This action cannot be undone and will permanently remove this record.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTrainee(null)}
                className="px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrainee}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full bg-[#ED1C25] hover:bg-[#c8161e] text-white font-bold text-sm transition-colors shadow-md shadow-red-200 dark:shadow-red-900/30 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Trainee Detail Drawer */}
      <TraineeDetailDrawer trainee={selectedCard} onClose={() => setSelectedCard(null)} />

    </div>
  );
}
