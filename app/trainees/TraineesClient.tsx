'use client';

import { useState, useMemo, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DrawerTrainee, TraineeDetailDrawer } from '@/components/TraineeDetailDrawer';

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

export default function TraineesPage({ initialTrainees = [] }: { initialTrainees?: Trainee[] }) {
  const [trainees, setTrainees] = useState<Trainee[]>(initialTrainees);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [selectedQuarter, setSelectedQuarter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null);
  const [deletingTrainee, setDeletingTrainee] = useState<Trainee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Dynamic filter lists
  const availableAccounts = useMemo(() => {
    const set = new Set<string>();
    trainees.forEach(t => {
      if (t.accountName) set.add(t.accountName);
    });
    return ['All', ...Array.from(set).sort()];
  }, [trainees]);

  // Filter trainees based on global search & selects
  const filteredTrainees = useMemo(() => {
    return trainees.filter(t => {
      if (selectedAccount !== 'All' && t.accountName !== selectedAccount) return false;
      if (selectedQuarter !== 'All' && t.quarter !== selectedQuarter) return false;
      if (selectedMonth !== 'All' && t.month !== selectedMonth) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesBatch = t.batchName.toLowerCase().includes(q);
        const matchesAccount = t.accountName.toLowerCase().includes(q);
        const matchesTrainer = (t.assignedTrainer || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBatch && !matchesAccount && !matchesTrainer) return false;
      }

      return true;
    });
  }, [trainees, searchQuery, selectedAccount, selectedQuarter, selectedMonth]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAccount, selectedQuarter, selectedMonth]);

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

      if (t.isLoss) lossCount++;

      const acctName = t.accountName || 'Unknown Account';
      if (!accountMap[acctName]) {
        accountMap[acctName] = { name: acctName, hc: 0, lossCount: 0, members: [] };
      }
      accountMap[acctName].hc += 1;
      if (t.isLoss) accountMap[acctName].lossCount += 1;
      accountMap[acctName].members.push(t);

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
      if (t.isLoss) targetMap[batchKey].lossCount += 1;
      targetMap[batchKey].members.push(t);

      if (targetMap[batchKey].trainer === 'Unassigned' && t.assignedTrainer) {
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
    setSelectedCard({
      isBatch: true,
      name: item.name,
      batchName: item.name,
      accountName,
      trainingType,
      assignedTrainer: trainer,
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
        showToast('Trainee added successfully!');
        setIsAddModalOpen(false);
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
        alert(`Error adding trainee: ${resData.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Trainee Submit
  const handleEditTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrainee) return;
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
        showToast('Trainee updated successfully!');
        setEditingTrainee(null);
      } else {
        alert(`Error updating trainee: ${resData.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Trainee
  const handleDeleteTrainee = async () => {
    if (!deletingTrainee) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/trainees?id=${deletingTrainee.id}&type=${deletingTrainee.trainingType || 'INHOUSE'}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (resData.success) {
        setTrainees(prev => prev.filter(t => t.id !== deletingTrainee.id));
        showToast('Trainee deleted successfully');
        setDeletingTrainee(null);
      } else {
        alert(`Error deleting: ${resData.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status?: string, isEndorsed?: boolean, isLoss?: boolean) => {
    const displayStatus = status || (isEndorsed ? 'ENDORSED' : isLoss ? 'LOSS' : 'ONGOING');
    const upperStatus = displayStatus.toUpperCase();

    if (upperStatus === 'ENDORSED') {
      return <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-300 text-emerald-700 bg-emerald-50 shadow-sm">ENDORSED</span>;
    }
    if (upperStatus === 'LOSS' || upperStatus === 'ATTRITION' || upperStatus === 'FAILED') {
      return <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-red-300 text-red-700 bg-red-50 shadow-sm">ATTRITION</span>;
    }
    return <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-blue-300 text-blue-700 bg-blue-50 shadow-sm">{upperStatus}</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans text-slate-800">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" /> Refresh Data
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export Summary
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <Printer className="w-3.5 h-3.5 text-[#2F6798]" /> Print / PDF
          </button>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
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
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Add Trainee
          </button>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards'
                  ? 'bg-white text-[#2F6798] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Department Breakdown
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table'
                  ? 'bg-white text-[#2F6798] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
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
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">TOTAL HEADCOUNT</p>
            <h4 className="text-2xl font-black text-slate-800 mt-0.5">{totalHC.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#2F6798] shrink-0 ml-2">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Box 2: Inhouse Trainees */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">INHOUSE TRAINEES</p>
            <h4 className="text-2xl font-black text-blue-600 mt-0.5">{inhouseHC.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 ml-2">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Box 3: PST Trainees */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">PST TRAINEES</p>
            <h4 className="text-2xl font-black text-emerald-600 mt-0.5">{pstHC.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 ml-2">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Box 4: Active Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">CLIENT ACCOUNTS</p>
            <h4 className="text-2xl font-black text-amber-600 mt-0.5">{clientAccounts.length}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 ml-2">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Box 5: System Attrition */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">SYSTEM ATTRITION</p>
            <h4 className={`text-2xl font-black mt-0.5 ${parseFloat(systemAttr) > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
              {systemAttr}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0 ml-2">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quarter Filter</label>
          <div className="relative">
            <select
              value={selectedQuarter}
              onChange={e => setSelectedQuarter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            >
              <option value="All">All Quarters</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Month Filter</label>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            >
              <option value="All">All Months</option>
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Client Account</label>
          <div className="relative">
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            >
              {availableAccounts.map(acct => (
                <option key={acct} value={acct}>{acct === 'All' ? 'All Client Accounts' : acct}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search Trainee / Batch / Trainer</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Type name or batch..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            />
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SINGLE LIGHT CONTAINER WITH DIVIDERS */}
      {viewMode === 'cards' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90">

            {/* Column 1: INHOUSE TRAINING */}
            <div className="p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> INHOUSE TRAINING
                </h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  DEPT 1
                </span>
              </div>
              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {inhouseBatches.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium text-slate-400">No matching Inhouse batches</div>
                ) : (
                  inhouseBatches.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openCard(item, 'DEPT 1', 'INHOUSE TRAINING', 'General', item.trainer)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                    >
                      <span className="text-xs font-bold text-[#2F6798]">{item.name}</span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: PST TRAINING */}
            <div className="p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> PST TRAINING
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  DEPT 2
                </span>
              </div>
              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {pstBatches.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium text-slate-400">No matching PST waves</div>
                ) : (
                  pstBatches.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openCard(item, 'DEPT 2', 'PST TRAINING', item.accountName || 'PST Account', item.trainer)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {item.trainer}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: CLIENT ACCOUNTS */}
            <div className="p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> CLIENT ACCOUNTS
                </h3>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  SUMMARY
                </span>
              </div>
              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {clientAccounts.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium text-slate-400">No matching client accounts</div>
                ) : (
                  clientAccounts.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openCard(item, 'SUMMARY', 'CLIENT ACCOUNTS', item.name, undefined)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
                    >
                      <span className="text-xs font-bold text-slate-800 uppercase">{item.name}</span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL TRAINEES TABLE WITH PAGINATION & UNBOXED COLORED ACTION ICONS */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#2F6798]" />
              <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase font-mono">
                ALL TRAINEES DIRECTORY ({filteredTrainees.length})
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Trainee Name</th>
                  <th className="py-3 px-4">Track Type</th>
                  <th className="py-3 px-4">Batch / Wave</th>
                  <th className="py-3 px-4">Client Account</th>
                  <th className="py-3 px-4">Assigned Trainer</th>
                  <th className="py-3 px-4">Attendance (P / A)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTrainees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
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
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {t.name}
                        </td>
                        <td className="py-3 px-4">
                          {/* Circular Pill Shape for Track Type */}
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm border ${t.trainingType === 'INHOUSE'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                            {t.trainingType || 'TRAINING'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#2F6798]">
                          {t.batchName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {t.accountName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {t.assignedTrainer || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          <span className="font-bold">{attRate}</span> ({t.p || 0}P / {t.a || 0}A)
                        </td>
                        <td className="py-3 px-4">
                          {renderStatusBadge(t.status, t.isEndorsed, t.isLoss)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {/* Unboxed Colored Icon Actions */}
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => openTraineeCard(t)}
                              title="View Details"
                              className="text-[#C8A54B] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingTrainee(t);
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
                              className="text-[#2F6798] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
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
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-medium text-slate-500">
                Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
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
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD TRAINEE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2F6798]" /> Add New Trainee
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrainee} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Training Track</label>
                  <select
                    value={formData.trainingType}
                    onChange={e => setFormData({ ...formData, trainingType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  >
                    <option value="INHOUSE">Inhouse Training</option>
                    <option value="PST">PST Training</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Batch / Wave</label>
                  <input
                    type="text"
                    required
                    value={formData.batchName}
                    onChange={e => setFormData({ ...formData, batchName: e.target.value })}
                    placeholder={formData.trainingType === 'INHOUSE' ? 'General -1' : 'Wave 1'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Client Account</label>
                  <input
                    type="text"
                    required
                    value={formData.accountName}
                    onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="e.g. General / Retail"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Assigned Trainer</label>
                  <input
                    type="text"
                    value={formData.assignedTrainer}
                    onChange={e => setFormData({ ...formData, assignedTrainer: e.target.value })}
                    placeholder="e.g. Trainer Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ENDORSED">ENDORSED</option>
                  <option value="ONGOING">ONGOING</option>
                  <option value="LOSS">LOSS / ATTRITION</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Trainee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRAINEE MODAL */}
      {editingTrainee && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#2F6798]" /> Edit Trainee Record
              </h3>
              <button onClick={() => setEditingTrainee(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTrainee} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Batch / Wave</label>
                  <input
                    type="text"
                    required
                    value={formData.batchName}
                    onChange={e => setFormData({ ...formData, batchName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Client Account</label>
                  <input
                    type="text"
                    required
                    value={formData.accountName}
                    onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Assigned Trainer</label>
                  <input
                    type="text"
                    value={formData.assignedTrainer}
                    onChange={e => setFormData({ ...formData, assignedTrainer: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ENDORSED">ENDORSED</option>
                    <option value="ONGOING">ONGOING</option>
                    <option value="LOSS">LOSS / ATTRITION</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTrainee(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold"
                >
                  {isSubmitting ? 'Updating...' : 'Update Trainee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTrainee && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#ED1C25] flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Delete Trainee Record</h3>
            <p className="text-xs text-slate-500 mb-6">
              Are you sure you want to delete <strong className="text-slate-800">{deletingTrainee.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingTrainee(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrainee}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#ED1C25] hover:bg-[#c9151c] text-white rounded-xl text-xs font-bold"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trainee Detail Drawer */}
      <TraineeDetailDrawer trainee={selectedCard} onClose={() => setSelectedCard(null)} />

    </div>
  );
}
