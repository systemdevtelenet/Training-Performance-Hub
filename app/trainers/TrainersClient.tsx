'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronDown,
  ChevronRight,
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
  Calendar
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { TrainersDirectorySkeleton } from '@/components/TrainersDirectorySkeleton';
import { TrainerAttendanceDrawer, type TrainerAttendanceData } from '@/components/TrainerAttendanceDrawer';
import { TrainerReliabilityDrawer, type TrainerReliabilityData, getReliabilityStatus, getReliabilityRateColor } from '@/components/TrainerReliabilityDrawer';
import { useRole } from '@/components/providers/RoleProvider';

type TrainerTab = 'directory' | 'attendance' | 'reliability';

export default function TrainersClient({ initialTrainers = [] }: { initialTrainers?: any[] }) {
  const { role, email } = useRole();
  const searchParams = useSearchParams();
  const activeTab = (searchParams?.get('tab') as TrainerTab) || 'directory';
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter for employees: they can only see themselves
  const filteredInitialTrainers = useMemo(() => {
    if (role === 'EMPLOYEE' && email) {
      return initialTrainers.filter(t => t.email === email);
    }
    return initialTrainers;
  }, [initialTrainers, role, email]);

  // Simulate initial data fetching delay
  useEffect(() => {
    // Note: in a real app, this would be a useEffect data fetch. 
    // We are simulating it for demonstration.
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Trainers Management</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
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
            Refresh
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-200/60 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Systems
          </span>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm">
        <div>
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 px-1">Quarter</label>
          <div className="relative">
            <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
              <option>All Quarters</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 px-1">Month</label>
          <div className="relative">
            <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
              <option>All Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 px-1">Account</label>
          <div className="relative">
            <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
              <option>All Client Accounts</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Dynamic Tab Content Views */}
      <div className="pt-2">
        {isLoading ? (
          <TrainersDirectorySkeleton />
        ) : (
          <>
            <div className={`transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
              {activeTab === 'directory' && <DirectoryView trainers={filteredInitialTrainers} />}
              {activeTab === 'attendance' && <AttendanceView initialTrainers={filteredInitialTrainers} />}
              {activeTab === 'reliability' && <ReliabilityView />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

{/* Master-Detail Directory Component */ }
function DirectoryView({ trainers }: { trainers: any[] }) {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLeave, setSelectedLeave] = useState<{ type: string, dates: string[] } | null>(null);

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
    if (!val) return { label: 'N/A', color: 'text-slate-400' };
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

          <div className="relative mb-3 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trainer, role, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 shadow-xs"
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
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-[#2F6798] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                      }`}>
                      {trainer.name.charAt(0)}
                    </div>
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
                    <Check className="w-4 h-4 text-[#2F6798] shrink-0 ml-2" />
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
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-6 h-[calc(100vh-12rem)] min-h-[600px] overflow-y-auto space-y-8 no-scrollbar relative">
          {!active ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p>No trainer details available.</p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="relative overflow-hidden pb-8 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-bl-full -mr-20 -mt-20 pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-[#2F6798] text-white flex items-center justify-center font-black text-3xl shrink-0">
                      {active.name ? active.name.charAt(0) : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1.5">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{active.name || 'Unknown'}</h2>
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${getStatusBadge(active.status || '')}`}>
                          {active.status || 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
                        {active.role || 'N/A'}
                      </p>

                      <div className="flex items-center gap-3 w-full overflow-hidden">
                        <div className="flex-1 min-w-0 flex flex-col px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Employee ID</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{active.id}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Start Date</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{active.startDate || 'N/A'}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Accounts</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{active.accounts || 'N/A'}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Primary Task</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{active.tasks || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col gap-2 shrink-0 self-start mt-2">
                    <button className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2F6798] group-hover:scale-125 transition-transform" />
                      View Attendance
                    </button>
                    <button className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:scale-125 transition-transform" />
                      View Reliability
                    </button>
                  </div>
                </div>
              </div>

              {/* Performance Snapshot */}
              <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">Performance Snapshot</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-slate-100 dark:divide-slate-700">
                  <div className="px-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Attendance</p>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">{active.attendanceRate || 'N/A'}</p>
                    <p className={`text-[10px] font-bold mt-1 ${getKPIStatus(active.attendanceRate, 'attendance').color}`}>
                      {getKPIStatus(active.attendanceRate, 'attendance').label}
                    </p>
                  </div>
                  <div className="px-4">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Reliability</p>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">{active.reliabilityRate || 'N/A'}</p>
                    <p className={`text-[10px] font-bold mt-1 ${getKPIStatus(active.reliabilityRate, 'reliability').color}`}>
                      {getKPIStatus(active.reliabilityRate, 'reliability').label}
                    </p>
                  </div>
                  <div className="px-4">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Success Rate</p>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">{active.overallSuccess || 'N/A'}</p>
                    <p className={`text-[10px] font-bold mt-1 ${getKPIStatus(active.overallSuccess, 'success').color}`}>
                      {getKPIStatus(active.overallSuccess, 'success').label}
                    </p>
                  </div>
                  <div className="px-4 relative group">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      Avg Attrition
                      <span className="cursor-help">
                        <Info className="w-3 h-3 text-slate-300 dark:text-slate-600 hover:text-slate-500" />
                      </span>
                    </p>
                    <div className="absolute top-0 right-0 -mt-8 mr-2 hidden group-hover:block bg-slate-800 text-white text-[10px] font-medium p-2 rounded shadow-lg w-48 z-20">
                      Percentage of trainees who leave or are lost from the training process.
                    </div>
                    {(() => {
                      if (!active.batches || active.batches.length === 0) return (
                        <>
                          <p className="text-xl font-black text-slate-800 dark:text-slate-100">N/A</p>
                          <p className="text-[10px] font-bold mt-1 text-slate-400 dark:text-slate-500">N/A</p>
                        </>
                      );
                      const totalAttr = active.batches.reduce((sum: number, b: any) => sum + parseFloat(b.attrition), 0);
                      const avgAttr = (totalAttr / active.batches.length).toFixed(1) + '%';
                      return (
                        <>
                          <p className="text-xl font-black text-slate-800 dark:text-slate-100">{avgAttr}</p>
                          <p className={`text-[10px] font-bold mt-1 ${getKPIStatus(avgAttr, 'attrition').color}`}>
                            {getKPIStatus(avgAttr, 'attrition').label}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Attendance & Leave Breakdown */}
              <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex flex-col">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1 flex items-center justify-between">
                  Attendance & Leave Breakdown
                  <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 normal-case bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                    Click box for records
                  </span>
                </h3>

                <div className="grid grid-cols-4 sm:grid-cols-9 gap-2 text-center mt-3">
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
                      className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center hover:shadow-sm hover:-translate-y-0.5 focus:ring-2 focus:outline-none ${item.highlight
                          ? 'bg-rose-50/30 border-rose-100 hover:border-rose-300 focus:ring-rose-200/50'
                          : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:ring-slate-200/50'
                        }`}
                    >
                      <span className={`text-[9px] font-bold block uppercase mb-0.5 ${item.highlight ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>{item.label}</span>
                      <span className={`text-sm font-black block ${item.highlight ? 'text-rose-700' : 'text-slate-800 dark:text-slate-100'}`}>{item.val}</span>
                    </button>
                  ))}
                </div>
              </div>


            </>
          )}

          {/* Right Side Popup Drawer for Leave Dates */}
          {selectedLeave && typeof document !== 'undefined' && createPortal(
            <div className={`fixed inset-0 z-[9999] pointer-events-auto`}>
              <button aria-label="Close modal" onClick={() => setSelectedLeave(null)} className={`absolute inset-0 w-full h-full bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 opacity-100 cursor-default`} />

              <aside role="dialog" aria-modal="true" className={`absolute bottom-3 right-3 top-3 flex w-[calc(100%-1.5rem)] max-w-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-transform duration-300 ease-out sm:w-[min(500px,calc(100%-2rem))] translate-x-0`}>

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

{/* Attendance View Component */ }
function AttendanceView({ initialTrainers = [] }: { initialTrainers: any[] }) {
  const attendanceData = useMemo<TrainerAttendanceData[]>(() => {
    return initialTrainers.map(t => ({
      name: t.name,
      present: t.present || 0,
      absent: t.absent ?? t.leaves?.absence ?? 0,
      suspension: t.suspension ?? t.leaves?.sus ?? 0,
      rate: t.attendanceRate || '0%',
      timeline: t.timeline || []
    }));
  }, [initialTrainers]);


  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'rate' | 'name' | 'present' | 'absent'>('rate');
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerAttendanceData | null>(null);

  const getAttendanceStatus = useCallback((rate: number) => {
    if (rate >= 95) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    if (rate >= 90) return { label: 'Good', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    if (rate >= 80) return { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    return { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  }, []);

  const getRateColor = useCallback((rate: number) => {
    if (rate < 80) return 'text-rose-600';
    if (rate >= 95) return 'text-emerald-600';
    return 'text-[#2F6798]';
  }, []);

  const filteredAndSorted = useMemo(() => {
    let data = [...attendanceData];
    if (searchQuery) {
      data = data.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      data = data.filter(t => {
        const rate = parseFloat(t.rate);
        if (statusFilter === 'excellent') return rate >= 95;
        if (statusFilter === 'good') return rate >= 90 && rate < 95;
        if (statusFilter === 'attention') return rate >= 80 && rate < 90;
        if (statusFilter === 'critical') return rate < 80;
        return true;
      });
    }
    data.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'present') return b.present - a.present;
      if (sortBy === 'absent') return b.absent - a.absent;
      return parseFloat(b.rate) - parseFloat(a.rate);
    });
    return data;
  }, [attendanceData, searchQuery, statusFilter, sortBy]);

  const kpis = useMemo(() => {
    const totalPresent = attendanceData.reduce((s, t) => s + t.present, 0);
    const totalAbsent = attendanceData.reduce((s, t) => s + t.absent, 0);
    const totalSUS = attendanceData.reduce((s, t) => s + t.suspension, 0);
    const totalTrainers = attendanceData.length;
    const avgRate = totalPresent + totalAbsent > 0
      ? ((totalPresent / (totalPresent + totalAbsent)) * 100).toFixed(1) + '%'
      : '0.0%';
    return { totalPresent, totalAbsent, totalSUS, totalTrainers, avgRate };
  }, [attendanceData]);

  const handleTrainerClick = useCallback((trainer: TrainerAttendanceData) => {
    setSelectedTrainer(prev => prev?.name === trainer.name ? null : trainer);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wide">
            Trainer Attendance (SUS counted as a loss) Breakdown
          </h2>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
            {attendanceData.length} trainers &middot; Click a card to view details
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#2F6798]/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[#2F6798]" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Rate</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.avgRate}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Present</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.totalPresent.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Absent</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.totalAbsent}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Trainers</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.totalTrainers}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trainer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 transition-all"
            />
          </div>
          <div className="flex gap-2.5">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 cursor-pointer transition-all"
              >
                <option value="all">All Status</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="attention">Needs Attention</option>
                <option value="critical">Critical</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 cursor-pointer transition-all"
              >
                <option value="rate">Sort by Rate</option>
                <option value="name">Sort by Name</option>
                <option value="present">Sort by Present</option>
                <option value="absent">Sort by Absent</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-8 text-center">
          <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No trainers match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAndSorted.map((trainer) => {
            const rateNum = parseFloat(trainer.rate);
            const status = getAttendanceStatus(rateNum);
            const rateColor = getRateColor(rateNum);
            const isSelected = selectedTrainer?.name === trainer.name;

            return (
              <button
                key={trainer.name}
                type="button"
                onClick={() => handleTrainerClick(trainer)}
                className={`w-full text-left bg-white dark:bg-slate-800 rounded-2xl border shadow-xs px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all duration-150 cursor-pointer ${isSelected
                    ? 'border-[#2F6798] ring-2 ring-[#2F6798]/20 shadow-md'
                    : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 hover:shadow-md hover:bg-slate-50/30 dark:hover:bg-slate-700/30'
                  }`}
                aria-label={`${trainer.name}, attendance rate ${trainer.rate}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-50 tracking-wide truncate">
                      {trainer.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold border whitespace-nowrap ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span>Present <strong className="text-slate-800 dark:text-slate-100 font-bold ml-0.5">{trainer.present}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                    <span>Absent <strong className={trainer.absent > 0 ? 'text-rose-500 font-bold ml-0.5' : 'text-slate-800 dark:text-slate-100 font-bold ml-0.5'}>{trainer.absent}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                    <span>SUS <strong className="text-slate-800 dark:text-slate-100 font-bold ml-0.5">{trainer.suspension}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-5 shrink-0">
                  <div className="text-right">
                    <span className={`text-xl font-black ${rateColor}`}>{trainer.rate}</span>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attendance Rate</p>
                  </div>
                  <div className="hidden sm:block w-24">
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${rateNum >= 95 ? 'bg-emerald-500' : rateNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(rateNum, 100)}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#2F6798] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <TrainerAttendanceDrawer trainer={selectedTrainer} onClose={() => setSelectedTrainer(null)} />
    </div>
  );
}

function ReliabilityView({ initialTrainers = [] }: { initialTrainers: any[] }) {
  const reliabilityData = useMemo<TrainerReliabilityData[]>(() => {
    return initialTrainers.map(t => {
      let sl = t.leaves?.sl || 0;
      let vl = t.leaves?.vl || 0;
      let med = t.leaves?.med || 0;
      let sus = t.leaves?.sus || 0;
      let other = (t.leaves?.absence || 0) + (t.leaves?.und || 0) + (t.leaves?.pl || 0) + (t.leaves?.bl || 0) + (t.leaves?.ml || 0);

      // Losses can be whatever logic applies (e.g., absence + sus + etc.)
      // For now, mirroring simple addition:
      let losses = t.absent + t.suspension;
      
      // Calculate the timeline grouped by month/quarter
      const monthMap = new Map();
      
      const getQuarter = (monthName: string) => {
        const m = monthName.toLowerCase();
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
        const s = r.status?.toUpperCase();
        if (s === 'P') m.p++;
        else if (s === 'A' || s === 'SUS' || s === 'ABS' || s === 'UND') {
          m.a++;
          m.losses++;
        }
      });
      
      return {
        name: t.name,
        present: t.present || 0,
        absent: t.absent || 0,
        losses: losses,
        rate: t.reliabilityRate || '0.0%',
        lossBreakdown: { sl, vl, other: med + sus + other },
        timeline: Array.from(monthMap.values())
      };
    });
  }, [initialTrainers]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'low' | 'high'>('low');
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerReliabilityData | null>(null);

  const filteredAndSorted = useMemo(() => {
    let data = [...reliabilityData];
    if (searchQuery) {
      data = data.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (statusFilter !== 'all') {
      data = data.filter(t => {
        const rate = parseFloat(t.rate);
        if (statusFilter === 'excellent') return rate >= 95;
        if (statusFilter === 'good') return rate >= 90 && rate < 95;
        if (statusFilter === 'attention') return rate >= 80 && rate < 90;
        if (statusFilter === 'critical') return rate < 80;
        return true;
      });
    }
    data.sort((a, b) => {
      const aRate = parseFloat(a.rate);
      const bRate = parseFloat(b.rate);
      return sortBy === 'low' ? aRate - bRate : bRate - aRate;
    });
    return data;
  }, [reliabilityData, searchQuery, statusFilter, sortBy]);

  const kpis = useMemo(() => {
    const totalTrainers = reliabilityData.length;
    let sumRate = 0;
    let reliable = 0;
    let attention = 0;
    let critical = 0;

    reliabilityData.forEach(t => {
      const rate = parseFloat(t.rate);
      sumRate += rate;
      if (rate >= 90) reliable++;
      else if (rate >= 80) attention++;
      else critical++;
    });

    const avgRate = (sumRate / totalTrainers).toFixed(1) + '%';
    return { avgRate, reliable, attention, critical };
  }, [reliabilityData]);

  const handleTrainerClick = useCallback((trainer: TrainerReliabilityData) => {
    setSelectedTrainer(prev => prev?.name === trainer.name ? null : trainer);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wide">
            Trainer Reliability (SL, VL, ML, PL, HOL, SUS, MED, BL counted as losses)
          </h2>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
            {reliabilityData.length} trainers &middot; Click a card to view details
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#2F6798]/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[#2F6798]" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Reliability</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.avgRate}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Reliable</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.reliable}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Needs Attention</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.attention}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Critical</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-50">{kpis.critical}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trainer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 transition-all"
            />
          </div>
          <div className="flex gap-2.5">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 cursor-pointer transition-all"
              >
                <option value="all">All Status</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="attention">Needs Attention</option>
                <option value="critical">Critical</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'low' | 'high')}
                className="h-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 cursor-pointer transition-all"
              >
                <option value="low">Sort: Low → High</option>
                <option value="high">Sort: High → Low</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-8 text-center">
          <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No trainers match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAndSorted.map((trainer) => {
            const rateNum = parseFloat(trainer.rate);
            const status = getReliabilityStatus(rateNum);
            const rateColor = getReliabilityRateColor(rateNum);
            const isSelected = selectedTrainer?.name === trainer.name;

            return (
              <button
                key={trainer.name}
                type="button"
                onClick={() => handleTrainerClick(trainer)}
                className={`w-full text-left bg-white dark:bg-slate-800 rounded-2xl border shadow-xs px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all duration-150 cursor-pointer ${isSelected
                    ? 'border-[#2F6798] ring-2 ring-[#2F6798]/20 shadow-md'
                    : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 hover:shadow-md hover:bg-slate-50/30 dark:hover:bg-slate-700/30'
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-50 tracking-wide truncate">
                      {trainer.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold border whitespace-nowrap ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span>Present <strong className="text-slate-800 dark:text-slate-100 font-bold ml-0.5">{trainer.present}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                    <span>Absent <strong className={trainer.absent > 0 ? 'text-rose-500 font-bold ml-0.5' : 'text-slate-800 dark:text-slate-100 font-bold ml-0.5'}>{trainer.absent}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                    <span>Losses <strong className={trainer.losses > 0 ? 'text-rose-500 font-bold ml-0.5' : 'text-slate-800 dark:text-slate-100 font-bold ml-0.5'}>{trainer.losses}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-5 shrink-0">
                  <div className="text-right">
                    <span className={`text-xl font-black ${rateColor}`}>{trainer.rate}</span>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Reliability Rate</p>
                  </div>
                  <div className="hidden sm:block w-24">
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${rateNum >= 95 ? 'bg-emerald-500' : rateNum >= 80 ? 'bg-[#2F6798]' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(rateNum, 100)}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2F6798] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <TrainerReliabilityDrawer trainer={selectedTrainer} onClose={() => setSelectedTrainer(null)} />
    </div>
  );
}