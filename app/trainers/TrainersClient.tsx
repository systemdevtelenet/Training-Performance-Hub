'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Download,
  Users,
  Check,
  Info,
  Loader2,
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  X,
  Calendar,
  Building2,
  CheckCircle2,
  FileText,
  UserCheck,
  TrendingDown,
  LayoutGrid,
  Table as TableIcon,
  Eye
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TrainerAttendanceDrawer, type TrainerAttendanceData } from '@/components/TrainerAttendanceDrawer';
import { TrainerReliabilityDrawer, type TrainerReliabilityData, getReliabilityStatus, getReliabilityRateColor } from '@/components/TrainerReliabilityDrawer';
import { useRole } from '@/components/providers/RoleProvider';
import { CustomSelect } from '@/components/ui/CustomSelect';

import PageLoading from '@/components/PageLoading';

import { isTrainerMatch } from '@/lib/analytics-utils';

type TrainerTab = 'directory' | 'attendance' | 'reliability' | 'attendance-reliability';

export default function TrainersClient({ initialTrainers = [] }: { initialTrainers?: any[] }) {
  const { role, actualRole, email, avatarUrl, userName } = useRole();
  const currentRole = role || actualRole;
  const isTrainer = currentRole === 'TRAINER';
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams?.get('tab') as TrainerTab) || 'directory';
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getTrainerAvatar = useCallback((t: any) => {
    if (!t) return null;
    const pic = t.profilePic;
    const isValidPic = pic && typeof pic === 'string' && pic.trim() !== '' && !['none', 'null', 'undefined', 'n/a'].includes(pic.trim().toLowerCase()) && (pic.startsWith('http') || pic.startsWith('/') || pic.startsWith('data:'));
    if (isValidPic) return pic.trim();
    const isMatch = (t.name && userName && t.name.toLowerCase().includes(userName.toLowerCase())) ||
      (t.email && email && t.email.toLowerCase() === email.toLowerCase()) ||
      (t.name && t.name.toLowerCase().includes('nissi') && (email?.includes('nreguero') || !email));
    if (isMatch && avatarUrl) return avatarUrl;
    return null;
  }, [userName, email, avatarUrl]);

  const [selectedQuarter, setSelectedQuarter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');

  useEffect(() => {
    const s = searchParams?.get('search');
    if (s) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  const scopedInitialTrainers = useMemo(() => {
    if (!isTrainer) return initialTrainers;
    if (userName || email) {
      const qName = (userName || '').toLowerCase();
      const qEmail = (email || '').toLowerCase().split('@')[0];
      return initialTrainers.filter((t: any) => {
        const tName = (t.name || '').toLowerCase();
        const tEmail = (t.email || '').toLowerCase();
        return (
          (userName && isTrainerMatch(t.name, userName)) ||
          (qName && (tName.includes(qName) || qName.includes(tName))) ||
          (qEmail && (tEmail.includes(qEmail) || tName.includes(qEmail)))
        );
      });
    }
    return initialTrainers;
  }, [initialTrainers, isTrainer, userName, email]);

  const availableAccounts = useMemo(() => {
    const set = new Set<string>();
    scopedInitialTrainers.forEach((t: any) => {
      if (t.accounts) {
        t.accounts.split(',').forEach((a: string) => set.add(a.trim()));
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [scopedInitialTrainers]);

  // Filter trainers based on search & selects for Directory
  const filteredInitialTrainers = useMemo(() => {
    return scopedInitialTrainers.filter((t: any) => {
      if (role === 'EMPLOYEE' && email && t.email !== email) return false;
      if (selectedAccount !== 'All') {
        const accs = (t.accounts || '').toLowerCase();
        if (!accs.includes(selectedAccount.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (t.name || '').toLowerCase().includes(q);
        const matchesRole = (t.role || t.position || '').toLowerCase().includes(q);
        const matchesAccs = (t.accounts || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesAccs) return false;
      }
      return true;
    });
  }, [scopedInitialTrainers, role, email, selectedAccount, searchQuery]);

  // Simulate initial data fetching delay
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (isLoading || isRefreshing) {
    return (
      <PageLoading
        title={activeTab === 'directory' ? "Loading Trainers Directory..." : "Loading Attendance & Reliability..."}
        subtitle={activeTab === 'directory' ? "Retrieving trainer profiles, qualifications, and operational metrics" : "Retrieving attendance tracking, leave breakdown, and reliability records"}
      />
    );
  }

  if (role === 'EMPLOYEE' && activeTab !== 'directory') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700/80 text-center max-w-lg mx-auto space-y-4 shadow-sm my-12">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Trainer Attendance Restricted</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Trainer Attendance &amp; Reliability records are internal operational records for Trainers and Supervisors.
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

  // Attendance & Reliability View
  if (activeTab !== 'directory') {
    return (
      <div className="space-y-6 w-full max-w-full pb-12">
        <AttendanceReliabilityView
          initialTrainers={scopedInitialTrainers}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    );
  }

  // Directory View
  return (
    <div className="space-y-6 w-full max-w-full pb-12">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Trainers Management</h1>
          <p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-0.5">
            Real-time directory, automated attendance tracking, and reliability analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? (
              <Loader2 className="w-3.5 h-3.5 text-[#2F6798] animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" />
            )}
            Refresh Data
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export Summary
          </button>
        </div>
      </div>

      {/* Directory Filter Container */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-20 space-y-4">
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
              Search Trainer / Position / Account
            </label>
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type trainer name, position, or account..."
                className="h-10 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Directory Content */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className={`transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
            <DirectoryView trainers={filteredInitialTrainers} />
          </div>
        </div>
      </div>
    </div>
  );
}

{/* Master-Detail Directory Component */ }
function DirectoryView({ trainers }: { trainers: any[] }) {
  const { avatarUrl, userName, email } = useRole();
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLeave, setSelectedLeave] = useState<{ type: string, dates: string[] } | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const getTrainerAvatar = useCallback((t: any) => {
    if (!t) return null;
    const pic = t.profilePic;
    const isValidPic = pic && typeof pic === 'string' && pic.trim() !== '' && !['none', 'null', 'undefined', 'n/a'].includes(pic.trim().toLowerCase()) && (pic.startsWith('http') || pic.startsWith('/') || pic.startsWith('data:'));
    if (isValidPic) return pic.trim();
    const isMatch = (t.name && userName && t.name.toLowerCase().includes(userName.toLowerCase())) ||
      (t.email && email && t.email.toLowerCase() === email.toLowerCase()) ||
      (t.name && t.name.toLowerCase().includes('nissi') && (email?.includes('nreguero') || !email));
    if (isMatch && avatarUrl) return avatarUrl;
    return null;
  }, [userName, email, avatarUrl]);

  const trainersList = trainers;

  // Auto-select first trainer if none selected
  useEffect(() => {
    if (!selectedTrainerId && trainersList.length > 0) {
      setSelectedTrainerId(trainersList[0].id);
    }
  }, [trainersList, selectedTrainerId]);

  const filteredTrainers = useMemo(() => {
    return trainersList.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.accounts || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trainersList, searchQuery, statusFilter]);

  const active = trainersList.find(t => t.id === selectedTrainerId) || filteredTrainers[0] || trainersList[0];

  const toggleBatch = (batchKey: string) => {
    setExpandedBatches(prev => ({
      ...prev,
      [batchKey]: !prev[batchKey]
    }));
  };

  const isBatchExpanded = (batchKey: string, index: number) => {
    if (expandedBatches[batchKey] !== undefined) {
      return expandedBatches[batchKey];
    }
    return false; // Collapsed by default for a clean, compact overview
  };

  const allBatchesExpanded = useMemo(() => {
    if (!active?.batches || active.batches.length === 0) return false;
    return active.batches.every((b: any, idx: number) => {
      const key = `${b.account || 'GENERAL'}-${b.batch || idx}`;
      return isBatchExpanded(key, idx);
    });
  }, [active?.batches, expandedBatches]);

  const toggleAllBatches = () => {
    if (!active?.batches) return;
    const targetState = !allBatchesExpanded;
    const next: Record<string, boolean> = {};
    active.batches.forEach((b: any, idx: number) => {
      const key = `${b.account || 'GENERAL'}-${b.batch || idx}`;
      next[key] = targetState;
    });
    setExpandedBatches(next);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'RESIGNED': return 'bg-rose-50 text-rose-500 border-rose-200';
      case 'AWOL': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'LATERAL': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500';
      case 'RESIGNED': return 'bg-rose-500';
      case 'AWOL': return 'bg-amber-500';
      case 'LATERAL': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const getKPIStatus = (val: string, type: 'attendance' | 'reliability' | 'success' | 'attrition') => {
    if (!val || val === 'N/A' || isNaN(parseFloat(val))) return { label: 'N/A', color: 'text-slate-400 dark:text-slate-500' };
    const num = parseFloat(val);
    if (type === 'attrition') {
      if (num === 0) return { label: 'Excellent', color: 'text-emerald-600' };
      if (num < 10) return { label: 'Good', color: 'text-blue-600' };
      if (num < 20) return { label: 'Watch', color: 'text-amber-600' };
      return { label: 'Needs Attention', color: 'text-rose-600' };
    } else {
      if (num >= 95) return { label: 'Excellent', color: 'text-emerald-600' };
      if (num >= 90) return { label: 'Good', color: 'text-blue-600' };
      if (num >= 80) return { label: 'Needs Attention', color: 'text-amber-600' };
      return { label: 'Critical', color: 'text-rose-600' };
    }
  };

  const statuses = ['ALL', 'ACTIVE', 'RESIGNED', 'AWOL', 'LATERAL'];
  const statusCounts = statuses.reduce((acc, status) => {
    acc[status] = status === 'ALL' ? trainersList.length : trainersList.filter(t => t.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left List Pane */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-6 flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wider">
              Trainers Directory <span className="text-slate-400 dark:text-slate-500 font-normal">({filteredTrainers.length})</span>
            </h2>
          </div>

          <div className="relative mb-3 shrink-0 group">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
            <input
              type="text"
              placeholder="Search trainer, role, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 shadow-sm"
            />
          </div>

          <div className="flex gap-2 pb-4 mb-2 border-b border-slate-100 dark:border-slate-700/50 shrink-0 overflow-x-auto no-scrollbar">
            {statuses.map(status => {
              const isActive = statusFilter === status;
              const isAll = status === 'ALL';
              let colorClasses = '';

              if (isActive) {
                if (isAll) colorClasses = 'bg-[#2F6798] text-white border-[#2F6798] shadow-sm';
                else if (status === 'ACTIVE') colorClasses = 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20';
                else if (status === 'RESIGNED') colorClasses = 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/20';
                else if (status === 'AWOL') colorClasses = 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20';
                else if (status === 'LATERAL') colorClasses = 'bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/20';
              } else {
                colorClasses = 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80';
              }

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1.5 ${colorClasses}`}
                >
                  {!isAll && !isActive && <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(status)}`} />}
                  {isAll ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>{statusCounts[status]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
            {filteredTrainers.map((trainer) => {
              const isSelected = active.id === trainer.id;
              return (
                <button
                  key={trainer.id}
                  onClick={() => setSelectedTrainerId(trainer.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${isSelected
                    ? 'bg-[#2F6798]/5 border-[#2F6798]/30 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const tPhoto = getTrainerAvatar(trainer);
                      return (
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden border border-slate-200/60 dark:border-slate-700 ${isSelected ? 'bg-[#2F6798] text-white ring-2 ring-[#2F6798]/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                          }`}>
                          {tPhoto ? (
                            <>
                              <img
                                src={tPhoto}
                                alt={trainer.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling;
                                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                }}
                              />
                              <span className="hidden w-full h-full items-center justify-center">
                                {trainer.name ? trainer.name.charAt(0) : '?'}
                              </span>
                            </>
                          ) : (
                            trainer.name ? trainer.name.charAt(0) : '?'
                          )}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-[#2F6798]' : 'text-slate-800 dark:text-slate-100'}`}>
                          {trainer.name}
                        </h3>
                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-wider shrink-0 ${getStatusBadge(trainer.status)}`}>
                          {trainer.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase truncate block">
                        {trainer.role}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[#2F6798] text-white flex items-center justify-center shrink-0 ml-1.5 shadow-2xs">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
            {filteredTrainers.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">No trainers found.</p>
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-3.5 sm:p-5 h-[calc(100vh-12rem)] min-h-[600px] overflow-y-auto space-y-2.5 no-scrollbar relative">
          {!active ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p>No trainer details available.</p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="relative overflow-hidden pb-3 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-bl-full -mr-20 -mt-20 pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 w-full max-w-full min-w-0">
                  <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full max-w-full min-w-0">
                    {(() => {
                      const activePhoto = getTrainerAvatar(active);
                      return (
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#2F6798] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 mt-1 sm:mt-0 overflow-hidden shadow-md ring-4 ring-[#2F6798]/10 border-2 border-white dark:border-slate-700">
                          {activePhoto ? (
                            <>
                              <img
                                src={activePhoto}
                                alt={active.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling;
                                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                }}
                              />
                              <span className="hidden w-full h-full items-center justify-center font-black text-2xl sm:text-3xl">
                                {active.name ? active.name.charAt(0) : '?'}
                              </span>
                            </>
                          ) : (
                            active.name ? active.name.charAt(0) : '?'
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0 max-w-full">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{active.name || 'Unknown'}</h2>
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${getStatusBadge(active.status || '')}`}>
                          {active.status || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="mb-2.5">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#2F6798] text-white uppercase tracking-wider shadow-2xs">
                          {active.role || 'HEAD OF TRAINING'}
                        </span>
                      </div>

                      {/* Outer Scrollable Wrapper so horizontal scrollbar renders outside & below the box */}
                      <div className="w-full max-w-full overflow-x-auto custom-horizontal-scrollbar pb-1.5">
                        <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-2.5 shadow-2xs inline-flex min-w-max">
                          <div className="flex items-center divide-x divide-slate-200/60 dark:divide-slate-700/60">
                            <div className="px-3 shrink-0 min-w-[110px]">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Employee ID</span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 whitespace-nowrap block">{active.id}</span>
                            </div>
                            <div className="px-3 shrink-0 min-w-[110px]">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Start Date</span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 whitespace-nowrap block">{active.startDate || 'N/A'}</span>
                            </div>
                            <div className="px-3 shrink-0 min-w-[130px]">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Accounts</span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 whitespace-nowrap block">{active.accounts || 'N/A'}</span>
                            </div>
                            <div className="px-3 shrink-0 min-w-[150px]">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Primary Task</span>
                              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 whitespace-nowrap block">{active.tasks || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Snapshot */}
              <div className="bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#2F6798]" /> Performance Snapshot
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 divide-x divide-slate-200/60 dark:divide-slate-700/60">
                  <div className="px-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Attendance</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">{active.attendanceRate || 'N/A'}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${getKPIStatus(active.attendanceRate, 'attendance').color}`}>
                      {getKPIStatus(active.attendanceRate, 'attendance').label}
                    </p>
                  </div>
                  <div className="px-3">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Reliability</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">{active.reliabilityRate || 'N/A'}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${getKPIStatus(active.reliabilityRate, 'reliability').color}`}>
                      {getKPIStatus(active.reliabilityRate, 'reliability').label}
                    </p>
                  </div>
                  <div className="px-3">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Success Rate</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">{active.overallSuccess || 'N/A'}</p>
                    <p className={`text-[10px] font-bold mt-0.5 ${getKPIStatus(active.overallSuccess, 'success').color}`}>
                      {getKPIStatus(active.overallSuccess, 'success').label}
                    </p>
                  </div>
                  <div className="px-3 relative group">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <span>Avg Attrition</span>
                      <span className="cursor-help inline-flex items-center">
                        <Info className="w-3.5 h-3.5 text-[#C8A54B] hover:opacity-80" />
                      </span>
                    </p>
                    <div className="absolute top-0 right-0 -mt-8 mr-2 hidden group-hover:block bg-[#FAF6EA] dark:bg-[#252014] text-[#7A5E18] dark:text-[#E2BD5B] text-[10px] font-normal leading-relaxed p-2.5 rounded-xl shadow-xl border border-[#D8BA68]/60 w-52 z-30 pointer-events-none">
                      Percentage of trainees who leave or are lost from the training process.
                    </div>
                    {(() => {
                      const avgAttr = active.avgAttrition && active.avgAttrition !== 'N/A' 
                        ? active.avgAttrition 
                        : (active.batches && active.batches.length > 0
                            ? `${(active.batches.reduce((sum: number, b: any) => sum + parseFloat(b.attritionRate || b.attrition || '0'), 0) / active.batches.length).toFixed(1)}%`
                            : 'N/A');
                      
                      return (
                        <>
                          <p className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">{avgAttr}</p>
                          <p className={`text-[10px] font-bold mt-0.5 ${getKPIStatus(avgAttr, 'attrition').color}`}>
                            {getKPIStatus(avgAttr, 'attrition').label}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Attendance & Leave Breakdown */}
              <div className="bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 flex flex-col shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2F6798]" /> Attendance &amp; Leave Breakdown
                  </span>
                  <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 normal-case bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                    Click box for records
                  </span>
                </h3>

                <div className="grid grid-cols-4 sm:grid-cols-9 gap-1.5 text-center mt-2">
                  {[
                    { label: 'ABS', val: active.leaves?.absence ?? 0 },
                    { label: 'SL', val: active.leaves?.sl ?? 0 },
                    { label: 'VL', val: active.leaves?.vl ?? 0 },
                    { label: 'BL', val: active.leaves?.bl ?? 0 },
                    { label: 'MED', val: active.leaves?.med ?? 0 },
                    { label: 'SUS', val: active.leaves?.sus ?? 0 },
                    { label: 'HOL', val: active.leaves?.hol ?? 0 },
                    { label: 'ML', val: active.leaves?.ml ?? 0 },
                    { label: 'PL', val: active.leaves?.pl ?? 0 },
                    { label: 'UND', val: active.leaves?.und ?? 0 },
                  ].map((item) => ({ ...item, highlight: item.val > 0 })).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedLeave({ type: item.label, dates: active.leaves?.records?.[item.label] || [] })}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center hover:shadow-sm hover:-translate-y-0.5 focus:ring-2 focus:outline-none ${item.highlight
                        ? 'bg-rose-50/30 border-rose-100 hover:border-rose-300 focus:ring-rose-200/50'
                        : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:ring-slate-200/50'
                        }`}
                    >
                      <span className={`text-[9px] font-bold block uppercase mb-0.5 ${item.highlight ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>{item.label}</span>
                      <span className={`text-xs sm:text-sm font-black block ${item.highlight ? 'text-rose-700' : 'text-slate-800 dark:text-slate-100'}`}>{item.val}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Handled Batches & Success Rate */}
              <div className="bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 flex flex-col space-y-2.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#2F6798]" /> Handled Batches &amp; Success Rate
                  </h3>
                  <div className="flex items-center gap-2">
                    {active.batches && active.batches.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllBatches}
                        className="text-[10px] font-bold text-[#2F6798] dark:text-blue-400 hover:bg-[#2F6798]/10 px-2.5 py-0.5 rounded-md border border-[#2F6798]/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {allBatchesExpanded ? 'Collapse All' : 'Expand All'}
                      </button>
                    )}
                    <span className="text-[10px] font-extrabold text-[#2F6798] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200/80 dark:border-blue-900 shadow-2xs uppercase tracking-wider">
                      {active.batches?.length || 0} {(active.batches?.length === 1) ? 'Batch' : 'Batches'} Handled
                    </span>
                  </div>
                </div>

                {(!active.batches || active.batches.length === 0) ? (
                  <div className="text-center py-8 bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">No training batches assigned to this trainer yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {active.batches.map((b: any, idx: number) => {
                      const succRate = b.successRate || (b.headcount ? `${(((b.passed || 0) / b.headcount) * 100).toFixed(1)}%` : 'N/A');
                      const attrRate = b.attritionRate || b.attrition || (b.headcount ? `${(((b.losses || 0) / b.headcount) * 100).toFixed(1)}%` : '0.0%');
                      const cleanBatchNum = b.batch ? `${b.batch}`.replace(/^(batch\s*|wave\s*)/i, '').trim() : `${idx + 1}`;
                      const trainerDisplay = b.trainees?.[0]?.assignedTrainer || active.name;
                      const batchKey = `${b.account || 'GENERAL'}-${b.batch || idx}`;
                      const expanded = isBatchExpanded(batchKey, idx);

                      return (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-800/95 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs hover:shadow-md transition-all"
                        >
                          {/* Card Header Bar - Clickable Accordion Toggle */}
                          <div
                            onClick={() => toggleBatch(batchKey)}
                            className="p-2.5 sm:px-3.5 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/40 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-[#2F6798] text-white shadow-2xs uppercase tracking-wider shrink-0">
                                {b.account || 'GENERAL'}
                              </span>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight shrink-0">
                                Batch {cleanBatchNum}
                              </h4>
                              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs truncate">
                                <UserCheck className="w-3 h-3 text-[#2F6798]" />
                                <span className="truncate max-w-[150px]">{trainerDisplay}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-semibold shrink-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span>HC: <strong className="text-slate-900 dark:text-white font-black">{b.headcount || 0}</strong></span>
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border shadow-2xs ${b.losses > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                <TrendingDown className="w-3 h-3 text-rose-500" />
                                <span>Attr: <strong className="font-black">{attrRate}</strong></span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Success: <strong className="font-black">{succRate}</strong></span>
                              </span>
                              <div className={`p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {/* Trainees Table - Collapsible */}
                          {expanded && (
                            <div className="overflow-x-auto max-h-72 overflow-y-auto custom-horizontal-scrollbar touch-pan-x border-t border-slate-100 dark:border-slate-700/60">
                              <table className="w-full text-xs text-left min-w-[550px]">
                                <thead className="bg-slate-50/60 dark:bg-slate-900/50 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 sticky top-0 bg-white dark:bg-slate-800 z-10">
                                  <tr>
                                    <th className="py-2 px-3 sm:px-3.5">Trainee Name</th>
                                    <th className="py-2 px-3">Assigned Trainer</th>
                                    <th className="py-2 px-2.5 text-center">Present (P)</th>
                                    <th className="py-2 px-2.5 text-center">Absent (A)</th>
                                    <th className="py-2 px-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                  {b.trainees && b.trainees.length > 0 ? (
                                    b.trainees.map((t: any, tIdx: number) => {
                                      const sUpper = (t.status || '').toUpperCase();
                                      const isEndorsed = sUpper === 'ENDORSED' || sUpper === 'PASSED';
                                      const isLoss = ['FAIL', 'FAILED', 'DROP', 'DROPPED', 'FALLOUT', 'TERMINATED', 'RESIGNED', 'ATTRITION', 'INACTIVE', 'EOC', 'AWOL', 'REPROFILED'].some(ls => sUpper.includes(ls));
                                      
                                      let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
                                      if (isEndorsed) {
                                        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
                                      } else if (isLoss) {
                                        badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
                                      }

                                      const initials = t.name ? t.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : '?';

                                      return (
                                        <tr key={tIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                                          <td className="py-2 px-3 sm:px-3.5">
                                            <div className="flex items-center gap-2">
                                              <div className="w-5 h-5 rounded-full bg-[#2F6798]/10 dark:bg-[#2F6798]/20 text-[#2F6798] dark:text-blue-300 flex items-center justify-center text-[8px] font-black shrink-0 border border-[#2F6798]/20">
                                                {initials}
                                              </div>
                                              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                {t.name}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                                            {t.assignedTrainer || active.name || 'N/A'}
                                          </td>
                                          <td className="py-2 px-2.5 text-center font-black text-slate-700 dark:text-slate-200 text-xs">
                                            {t.p ?? 0}
                                          </td>
                                          <td className="py-2 px-2.5 text-center font-black text-xs">
                                            <span className={t.a > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}>
                                              {t.a ?? 0}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${badgeClass}`}>
                                              {t.status || 'ACTIVE'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className="py-3 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                                        No individual trainee records found for this batch.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </>
          )}

          {/* Right Side Popup Drawer for Leave Dates */}
          {selectedLeave && typeof document !== 'undefined' && createPortal(
            <div className={`fixed inset-0 z-[9999] pointer-events-auto`}>
              <button aria-label="Close modal" onClick={() => setSelectedLeave(null)} className={`absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 opacity-100 cursor-default`} />

              <aside role="dialog" aria-modal="true" className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col overflow-hidden bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out translate-x-0`}>

                <header className="bg-[#2F6798] px-6 py-4 flex items-center justify-between shrink-0">
                  <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                    {(({
                      'ABS': 'ABSENCE DETAILS',
                      'SL': 'SICK LEAVE DETAILS',
                      'VL': 'VACATION LEAVE DETAILS',
                      'BL': 'BEREAVEMENT LEAVE DETAILS',
                      'MED': 'MEDICAL LEAVE DETAILS',
                      'SUS': 'SUSPENSION DETAILS',
                      'HOL': 'HOLIDAY DETAILS',
                      'ML': 'MATERNITY LEAVE DETAILS',
                      'PL': 'PATERNITY LEAVE DETAILS',
                      'UND': 'UNDERTIME DETAILS'
                    }) as Record<string, string>)[selectedLeave.type] || `${selectedLeave.type} DETAILS`}
                  </h2>
                  <button type="button" onClick={() => setSelectedLeave(null)} aria-label="Close" className="text-white/80 hover:text-white transition-colors focus:outline-none">
                    <X className="h-5 w-5" />
                  </button>
                </header>

                <div className="p-6 md:p-8 flex-1 overflow-y-auto no-scrollbar">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {(({
                      'ABS': 'Absence Summary',
                      'SL': 'Sick Leave Summary',
                      'VL': 'Vacation Leave Summary',
                      'BL': 'Bereavement Leave Summary',
                      'MED': 'Medical Leave Summary',
                      'SUS': 'Suspension Summary',
                      'HOL': 'Holiday Summary',
                      'ML': 'Maternity Leave Summary',
                      'PL': 'Paternity Leave Summary',
                      'UND': 'Undertime Summary'
                    }) as Record<string, string>)[selectedLeave.type] || `${selectedLeave.type} Summary`}
                  </h3>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Trainer: {active?.name}</p>

                  <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className="flex flex-col p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-[#2F6798]">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Days</span>
                      </div>
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{selectedLeave.dates.length}</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2F6798]" />
                    Recorded Dates
                  </h4>

                  {selectedLeave.dates.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLeave.dates.map((d, i) => (
                        <div key={i} className="flex w-full items-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-rose-500" />
                            </div>
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{d}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No recorded dates for this leave type.</p>
                  )}
                </div>
              </aside>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}

{/* Unified Attendance & Reliability View Component */}
function AttendanceReliabilityView({
  initialTrainers = [],
  onRefresh,
  isRefreshing
}: {
  initialTrainers: any[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const { avatarUrl, userName, email } = useRole();
  const [selectedQuarter, setSelectedQuarter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'attRate' | 'relRate' | 'name' | 'present' | 'absent' | 'losses'>('attRate');
  const [viewFocus, setViewFocus] = useState<'all' | 'attendance' | 'reliability'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer states
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<'attendance' | 'reliability'>('attendance');

  const getTrainerAvatar = useCallback((t: any) => {
    if (!t) return null;
    const pic = t.profilePic;
    const isValidPic = pic && typeof pic === 'string' && pic.trim() !== '' && !['none', 'null', 'undefined', 'n/a'].includes(pic.trim().toLowerCase()) && (pic.startsWith('http') || pic.startsWith('/') || pic.startsWith('data:'));
    if (isValidPic) return pic.trim();
    const isMatch = (t.name && userName && t.name.toLowerCase().includes(userName.toLowerCase())) ||
      (t.email && email && t.email.toLowerCase() === email.toLowerCase()) ||
      (t.name && t.name.toLowerCase().includes('nissi') && (email?.includes('nreguero') || !email));
    if (isMatch && avatarUrl) return avatarUrl;
    return null;
  }, [userName, email, avatarUrl]);

  const lossCodes = useMemo(() => ['SL', 'VL', 'ML', 'PL', 'SUS', 'MED', 'BL', 'ABS', 'A', 'UND', 'UT'], []);

  const availableAccounts = useMemo(() => {
    const set = new Set<string>();
    initialTrainers.forEach((t: any) => {
      if (t.accounts) {
        t.accounts.split(',').forEach((a: string) => set.add(a.trim()));
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [initialTrainers]);

  const data = useMemo(() => {
    return initialTrainers.map(t => {
      const sl = t.leaves?.sl || 0;
      const vl = t.leaves?.vl || 0;
      const med = t.leaves?.med || 0;
      const sus = t.leaves?.sus || 0;
      const hol = t.leaves?.hol || 0;
      const ml = t.leaves?.ml || 0;
      const pl = t.leaves?.pl || 0;
      const bl = t.leaves?.bl || 0;
      const absence = t.leaves?.absence || 0;
      const und = t.leaves?.und || 0;

      const losses = t.losses ?? (sl + vl + med + sus + ml + pl + bl + absence + und);
      const present = t.present || 0;

      // Group timeline by month
      const monthMap = new Map();
      const getQuarter = (monthName: string) => {
        const m = (monthName || '').toLowerCase();
        if (['january', 'february', 'march'].includes(m)) return 'Q1';
        if (['april', 'may', 'june'].includes(m)) return 'Q2';
        if (['july', 'august', 'september'].includes(m)) return 'Q3';
        return 'Q4';
      };

      (t.timeline || []).forEach((r: any) => {
        if (!monthMap.has(r.month)) {
          monthMap.set(r.month, {
            month: r.month,
            quarter: getQuarter(r.month),
            p: 0,
            a: 0,
            losses: 0
          });
        }
        const m = monthMap.get(r.month);
        const s = (r.status || '').toUpperCase();
        if (s === 'P') {
          m.p++;
        } else if (lossCodes.some(lc => s.includes(lc))) {
          m.a++;
          m.losses++;
        }
      });

      return {
        name: t.name,
        profilePic: t.profilePic,
        email: t.email,
        role: t.role || t.position || 'TRAINER',
        accounts: t.accounts || '',
        status: t.status || 'ACTIVE',
        present: present,
        absent: t.absent ?? absence,
        suspension: t.suspension ?? sus,
        losses: losses,
        attendanceRate: t.attendanceRate || '0.0%',
        reliabilityRate: t.reliabilityRate || '100.0%',
        timeline: t.timeline || [],
        lossBreakdown: { sl, vl, other: med + sus + ml + pl + bl + und },
        monthlyTimeline: Array.from(monthMap.values()),
        leaves: t.leaves || {}
      };
    });
  }, [initialTrainers, lossCodes]);

  const getAttendanceStatus = useCallback((rate: number) => {
    if (rate >= 95) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50', dot: 'bg-emerald-500' };
    if (rate >= 90) return { label: 'Good', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50', dot: 'bg-blue-500' };
    if (rate >= 80) return { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50', dot: 'bg-amber-500' };
    return { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50', dot: 'bg-rose-500' };
  }, []);

  const getRateColor = useCallback((rate: number) => {
    if (rate < 80) return 'text-rose-600 dark:text-rose-400';
    if (rate >= 95) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-[#2F6798] dark:text-blue-400';
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = [...data];

    if (selectedAccount !== 'All') {
      list = list.filter(t => (t.accounts || '').toLowerCase().includes(selectedAccount.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q) || t.accounts.toLowerCase().includes(q));
    }

    if (statusFilter !== 'all') {
      list = list.filter(t => {
        const attNum = parseFloat(t.attendanceRate);
        const relNum = parseFloat(t.reliabilityRate);
        const targetNum = viewFocus === 'reliability' ? relNum : attNum;
        if (statusFilter === 'excellent') return targetNum >= 95;
        if (statusFilter === 'good') return targetNum >= 90 && targetNum < 95;
        if (statusFilter === 'attention') return targetNum >= 80 && targetNum < 90;
        if (statusFilter === 'critical') return targetNum < 80;
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'present') return b.present - a.present;
      if (sortBy === 'absent') return b.absent - a.absent;
      if (sortBy === 'losses') return b.losses - a.losses;
      if (sortBy === 'relRate') return parseFloat(b.reliabilityRate) - parseFloat(a.reliabilityRate);
      return parseFloat(b.attendanceRate) - parseFloat(a.attendanceRate);
    });

    return list;
  }, [data, selectedAccount, searchQuery, statusFilter, sortBy, viewFocus]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedQuarter, selectedMonth, selectedAccount, searchQuery, statusFilter, sortBy, viewFocus]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const paginatedTrainers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const kpis = useMemo(() => {
    const totalTrainers = filteredAndSorted.length;
    const totalPresent = filteredAndSorted.reduce((s, t) => s + t.present, 0);
    const totalAbsent = filteredAndSorted.reduce((s, t) => s + t.absent, 0);
    const totalLosses = filteredAndSorted.reduce((s, t) => s + t.losses, 0);

    let sumAtt = 0;
    let sumRel = 0;
    filteredAndSorted.forEach(t => {
      sumAtt += parseFloat(t.attendanceRate) || 0;
      sumRel += parseFloat(t.reliabilityRate) || 0;
    });

    const avgAtt = totalTrainers > 0 ? (sumAtt / totalTrainers).toFixed(1) + '%' : '0.0%';
    const avgRel = totalTrainers > 0 ? (sumRel / totalTrainers).toFixed(1) + '%' : '0.0%';

    return { totalTrainers, totalPresent, totalAbsent, totalLosses, avgAtt, avgRel };
  }, [filteredAndSorted]);

  const handleOpenDrawer = (trainer: any, defaultTab: 'attendance' | 'reliability' = 'attendance') => {
    setSelectedTrainer(trainer);
    setDrawerTab(defaultTab);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Row (No icon, text-lg title) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Trainer Attendance &amp; Reliability
          </h1>
          <p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-0.5">
            Unified tracking for attendance (working days &amp; absences) and reliability (SL, VL, leaves &amp; suspensions)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? (
                <Loader2 className="w-3.5 h-3.5 text-[#2F6798] animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" />
              )}
              Refresh Data
            </button>
          )}
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export Summary
          </button>
        </div>
      </div>

      {/* 2. 4 Summary Boxes Above Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Avg Attendance */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Avg Attendance
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              {kpis.avgAtt}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2F6798] flex items-center justify-center shrink-0 relative z-10">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Box 2: Avg Reliability */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Avg Reliability
            </span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {kpis.avgRel}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0 relative z-10">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Box 3: Total Present */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Total Present
            </span>
            <p className="text-2xl sm:text-3xl font-black text-[#2F6798] dark:text-[#5a9fd4] tracking-tight">
              {kpis.totalPresent.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#2F6798] dark:text-[#5a9fd4] flex items-center justify-center shrink-0 relative z-10">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Box 4: Absences & Losses */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              Absences &amp; Losses
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-500 tracking-tight">
                {kpis.totalAbsent}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                / {kpis.totalLosses} total
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0 relative z-10">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. UNIFIED SINGLE EXTERNAL WHITE CONTAINER (Wraps Filters + Cards/Table) */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        {/* Row 1: 5 Equal Width Select Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6798]" /> Quarter Filter
            </label>
            <CustomSelect
              value={selectedQuarter}
              onChange={setSelectedQuarter}
              options={[
                { value: 'All', label: 'All Quarters' },
                { value: 'Q1', label: 'Q1' },
                { value: 'Q2', label: 'Q2' },
                { value: 'Q3', label: 'Q3' },
                { value: 'Q4', label: 'Q4' }
              ]}
            />
          </div>

          <div>
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#2F6798]" /> Month Filter
            </label>
            <CustomSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
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

          <div>
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Client Account Filter
            </label>
            <CustomSelect
              value={selectedAccount}
              onChange={setSelectedAccount}
              options={availableAccounts.map(acct => ({
                value: acct,
                label: acct === 'All' ? 'All Client Accounts' : acct
              }))}
            />
          </div>

          <div>
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2F6798]" /> Status Filter
            </label>
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'excellent', label: 'Excellent (≥95%)' },
                { value: 'good', label: 'Good (90-94%)' },
                { value: 'attention', label: 'Needs Attention (80-89%)' },
                { value: 'critical', label: 'Critical (<80%)' }
              ]}
            />
          </div>

          <div>
            <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#2F6798]" /> Sort Filter
            </label>
            <CustomSelect
              value={sortBy}
              onChange={val => setSortBy(val as typeof sortBy)}
              options={[
                { value: 'attRate', label: 'Sort: Attendance Rate' },
                { value: 'relRate', label: 'Sort: Reliability Rate' },
                { value: 'name', label: 'Sort: Name (A-Z)' },
                { value: 'present', label: 'Sort: Present Days' },
                { value: 'absent', label: 'Sort: Absent Days' },
                { value: 'losses', label: 'Sort: Total Losses' }
              ]}
            />
          </div>
        </div>

        {/* Row 2: Left View Mode Tabs + View Switcher (Cards/Table) + Right Search Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 pt-0">
          {/* Left Side: View Focus Tabs + Cards/Table Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Metric Focus Tabs */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewFocus('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewFocus === 'all'
                    ? 'bg-white dark:bg-slate-800 text-[#2F6798] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setViewFocus('attendance')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewFocus === 'attendance'
                    ? 'bg-white dark:bg-slate-800 text-[#2F6798] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Attendance
              </button>
              <button
                type="button"
                onClick={() => setViewFocus('reliability')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewFocus === 'reliability'
                    ? 'bg-white dark:bg-slate-800 text-[#2F6798] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Reliability
              </button>
            </div>

            {/* Layout Mode Toggle (Cards vs Table) */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-[#2F6798] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-[#2F6798] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>

          {/* Right Side: Search */}
          <div className="relative group w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Type trainer name, position, or account..."
              className="h-9 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-1.5 pl-9 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
            />
          </div>
        </div>

        {/* Row 3: Content Section (Inside the SAME container) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {filteredAndSorted.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No trainers match your search criteria.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 shadow-xs">
              <div className="w-full overflow-x-auto custom-horizontal-scrollbar touch-pan-x overscroll-x-contain pb-1">
                <table className="w-full text-left border-collapse text-xs min-w-[980px]">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-700/80 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      <th className="py-3.5 px-4 min-w-[220px]">Trainer</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Account(s)</th>
                      <th className="py-3.5 px-4 text-center min-w-[95px]">Present (P)</th>
                      <th className="py-3.5 px-4 text-center min-w-[95px]">Absent (A)</th>
                      <th className="py-3.5 px-4 text-center min-w-[95px]">Losses</th>
                      {(viewFocus === 'all' || viewFocus === 'attendance') && (
                        <th className="py-3.5 px-4 text-center min-w-[125px]">Attendance Rate</th>
                      )}
                      {(viewFocus === 'all' || viewFocus === 'reliability') && (
                        <th className="py-3.5 px-4 text-center min-w-[125px]">Reliability Rate</th>
                      )}
                      <th className="py-3.5 px-4 text-center min-w-[100px]">Status</th>
                      <th className="py-3.5 px-4 text-center min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {paginatedTrainers.map((trainer) => {
                      const attNum = parseFloat(trainer.attendanceRate) || 0;
                      const relNum = parseFloat(trainer.reliabilityRate) || 0;
                      const attColor = getRateColor(attNum);
                      const relColor = getRateColor(relNum);
                      const isSelected = selectedTrainer?.name === trainer.name;
                      const tPhoto = getTrainerAvatar(trainer);

                      const initials = trainer.name
                        ? trainer.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                        : '?';

                      return (
                        <tr
                          key={trainer.name}
                          onClick={() => handleOpenDrawer(trainer)}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors cursor-pointer group whitespace-nowrap ${
                            isSelected ? 'bg-[#2F6798]/5' : ''
                          }`}
                        >
                          {/* Trainer Info */}
                          <td className="py-3.5 px-4 font-medium min-w-[220px]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#2F6798]/10 text-[#2F6798] dark:text-blue-300 flex items-center justify-center text-xs font-black shrink-0 border border-[#2F6798]/20 overflow-hidden">
                                {tPhoto ? (
                                  <img
                                    src={tPhoto}
                                    alt={trainer.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {trainer.name}
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold bg-[#2F6798] text-white uppercase tracking-wider mt-0.5 shadow-2xs">
                                  {trainer.role}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Account */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs font-medium min-w-[140px]">
                            {trainer.accounts || 'General'}
                          </td>

                          {/* Present Days */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-100 min-w-[95px]">
                            {trainer.present}
                          </td>

                          {/* Absent Days */}
                          <td className="py-3.5 px-4 text-center min-w-[95px]">
                            <span className={`font-bold ${trainer.absent > 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                              {trainer.absent}
                            </span>
                          </td>

                          {/* Losses */}
                          <td className="py-3.5 px-4 text-center min-w-[95px]">
                            <span className={`font-bold ${trainer.losses > 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                              {trainer.losses}
                            </span>
                          </td>

                          {/* Attendance Rate */}
                          {(viewFocus === 'all' || viewFocus === 'attendance') && (
                            <td className="py-3.5 px-4 text-center min-w-[125px]">
                              <div className="inline-flex flex-col items-center">
                                <span className={`font-black text-xs ${attColor}`}>{trainer.attendanceRate}</span>
                                <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1 mt-1">
                                  <div
                                    className={`h-1 rounded-full ${attNum >= 95 ? 'bg-emerald-500' : attNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(attNum, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Reliability Rate */}
                          {(viewFocus === 'all' || viewFocus === 'reliability') && (
                            <td className="py-3.5 px-4 text-center min-w-[125px]">
                              <div className="inline-flex flex-col items-center">
                                <span className={`font-black text-xs ${relColor}`}>{trainer.reliabilityRate}</span>
                                <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1 mt-1">
                                  <div
                                    className={`h-1 rounded-full ${relNum >= 95 ? 'bg-emerald-500' : relNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(relNum, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center min-w-[100px]">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                              trainer.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}>
                              {trainer.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center min-w-[80px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDrawer(trainer);
                              }}
                              title="View Attendance &amp; Reliability Details"
                              className="inline-flex items-center justify-center p-0.5 text-[#C8A54B] dark:text-[#E0B85C] hover:text-[#A88532] dark:hover:text-[#F3CE74] hover:scale-115 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none"
                            >
                              <Eye className="w-4 h-4 stroke-[2]" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {filteredAndSorted.length > pageSize && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({filteredAndSorted.length} trainers)
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
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
                                onClick={() => setCurrentPage(p)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                  currentPage === p
                                    ? 'bg-[#2F6798] text-white shadow-xs'
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
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CARDS VIEW */
            <div className="space-y-2.5">
              {filteredAndSorted.map((trainer) => {
                const attNum = parseFloat(trainer.attendanceRate) || 0;
                const relNum = parseFloat(trainer.reliabilityRate) || 0;
                const attColor = getRateColor(attNum);
                const relColor = getRateColor(relNum);
                const isSelected = selectedTrainer?.name === trainer.name;
                const tPhoto = getTrainerAvatar(trainer);

                const initials = trainer.name
                  ? trainer.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                  : '?';

                return (
                  <div
                    key={trainer.name}
                    onClick={() => handleOpenDrawer(trainer)}
                    className={`w-full text-left bg-white dark:bg-slate-800/90 rounded-2xl border shadow-xs px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 group transition-all duration-150 cursor-pointer ${isSelected
                      ? 'border-[#2F6798] ring-2 ring-[#2F6798]/20 shadow-md'
                      : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md hover:bg-slate-50/60 dark:hover:bg-slate-700/40'
                      }`}
                  >
                    {/* Left: Trainer Identity */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#2F6798]/10 dark:bg-[#2F6798]/20 text-[#2F6798] dark:text-blue-300 flex items-center justify-center text-xs font-black shrink-0 border border-[#2F6798]/20 overflow-hidden">
                        {tPhoto ? (
                          <img
                            src={tPhoto}
                            alt={trainer.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 tracking-wide truncate">
                            {trainer.name}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[8.5px] font-bold bg-[#2F6798] text-white uppercase tracking-wider shadow-2xs">
                            {trainer.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>Present <strong className="text-slate-800 dark:text-slate-100 font-bold ml-0.5">{trainer.present}</strong></span>
                          <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                          <span>Absent <strong className={trainer.absent > 0 ? 'text-rose-500 font-bold ml-0.5' : 'text-slate-800 dark:text-slate-100 font-bold ml-0.5'}>{trainer.absent}</strong></span>
                          <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                          <span>Losses <strong className={trainer.losses > 0 ? 'text-rose-500 font-bold ml-0.5' : 'text-slate-800 dark:text-slate-100 font-bold ml-0.5'}>{trainer.losses}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Dual Rate Gauges */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-700/60">
                      {/* Attendance Rate */}
                      {(viewFocus === 'all' || viewFocus === 'attendance') && (
                        <div className="flex items-center gap-3">
                          <div className="text-right min-w-[90px]">
                            <span className={`text-base sm:text-lg font-black ${attColor}`}>{trainer.attendanceRate}</span>
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Attendance</p>
                          </div>
                          <div className="hidden sm:block w-16">
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${attNum >= 95 ? 'bg-emerald-500' : attNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(attNum, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reliability Rate */}
                      {(viewFocus === 'all' || viewFocus === 'reliability') && (
                        <div className="flex items-center gap-3">
                          <div className="text-right min-w-[90px]">
                            <span className={`text-base sm:text-lg font-black ${relColor}`}>{trainer.reliabilityRate}</span>
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Reliability</p>
                          </div>
                          <div className="hidden sm:block w-16">
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${relNum >= 95 ? 'bg-emerald-500' : relNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(relNum, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2F6798] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Unified Drawer (Supports both Attendance and Reliability tabs) */}
      {selectedTrainer && (
        <>
          {drawerTab === 'attendance' ? (
            <TrainerAttendanceDrawer
              trainer={{
                name: selectedTrainer.name,
                present: selectedTrainer.present,
                absent: selectedTrainer.absent,
                suspension: selectedTrainer.suspension || 0,
                rate: selectedTrainer.attendanceRate || '100.0%',
                attendanceRate: selectedTrainer.attendanceRate,
                timeline: selectedTrainer.attendanceTimeline || selectedTrainer.timeline || []
              }}
              onClose={() => setSelectedTrainer(null)}
            />
          ) : (
            <TrainerReliabilityDrawer
              trainer={{
                name: selectedTrainer.name,
                present: selectedTrainer.present,
                absent: selectedTrainer.absent,
                losses: selectedTrainer.losses,
                rate: selectedTrainer.reliabilityRate,
                lossBreakdown: selectedTrainer.lossBreakdown,
                timeline: selectedTrainer.monthlyTimeline
              }}
              onClose={() => setSelectedTrainer(null)}
            />
          )}
        </>
      )}
    </div>
  );
}