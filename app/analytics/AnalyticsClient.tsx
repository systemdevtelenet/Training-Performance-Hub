'use client';

import { useState, useEffect, useMemo } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { 
  Search, ChevronDown, ChevronUp, Calendar, Building2, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, ArrowUpDown, RefreshCcw,
  Sparkles, Loader2, MessageSquare, ExternalLink, FileText, Maximize2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { fetchDashboardData, TraineeRecord } from '@/lib/data-loader';

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

// Default benchmark data matching user's official records
const defaultMonthlyInhouse = [
  { period: 'January', activeHC: 22, losses: 4, attritionRate: 18.2, attendanceRate: 89.0 },
  { period: 'February', activeHC: 17, losses: 0, attritionRate: 0.0, attendanceRate: 98.1 },
  { period: 'March', activeHC: 2, losses: 1, attritionRate: 50.0, attendanceRate: 66.7 },
  { period: 'April', activeHC: 3, losses: 0, attritionRate: 0.0, attendanceRate: 100.0 },
  { period: 'May', activeHC: 8, losses: 0, attritionRate: 0.0, attendanceRate: 100.0 },
  { period: 'June', activeHC: 9, losses: 0, attritionRate: 0.0, attendanceRate: 100.0 },
  { period: 'July', activeHC: 15, losses: 0, attritionRate: 0.0, attendanceRate: 100.0 },
  { period: 'August', activeHC: 3, losses: 1, attritionRate: 33.3, attendanceRate: 96.0 },
];

const defaultMonthlyPst = [
  { period: 'January', activeHC: 24, losses: 2, attritionRate: 8.3, attendanceRate: 98.4 },
  { period: 'February', activeHC: 15, losses: 3, attritionRate: 20.0, attendanceRate: 98.1 },
  { period: 'March', activeHC: 14, losses: 2, attritionRate: 14.3, attendanceRate: 96.7 },
  { period: 'April', activeHC: 36, losses: 6, attritionRate: 16.7, attendanceRate: 97.5 },
  { period: 'May', activeHC: 11, losses: 1, attritionRate: 9.1, attendanceRate: 97.7 },
  { period: 'June', activeHC: 29, losses: 2, attritionRate: 6.9, attendanceRate: 98.5 },
  { period: 'July', activeHC: 25, losses: 3, attritionRate: 12.0, attendanceRate: 97.3 },
  { period: 'August', activeHC: 13, losses: 1, attritionRate: 7.7, attendanceRate: 97.0 },
];

const defaultQuarterlyInhouse = [
  { period: 'Q1', activeHC: 41, losses: 5, attritionRate: 12.2, attendanceRate: 92.0 },
  { period: 'Q2', activeHC: 20, losses: 0, attritionRate: 0.0, attendanceRate: 100.0 },
  { period: 'Q3', activeHC: 18, losses: 1, attritionRate: 5.6, attendanceRate: 98.1 },
];

const defaultQuarterlyPst = [
  { period: 'Q1', activeHC: 36, losses: 7, attritionRate: 19.4, attendanceRate: 97.0 },
  { period: 'Q2', activeHC: 59, losses: 9, attritionRate: 15.3, attendanceRate: 97.6 },
  { period: 'Q3', activeHC: 29, losses: 4, attritionRate: 13.8, attendanceRate: 97.0 },
];

const defaultQuarterlyOverall = [
  { period: 'Q1', activeHC: 77, losses: 12, attritionRate: 15.6, attendanceRate: 95.7 },
  { period: 'Q2', activeHC: 79, losses: 9, attritionRate: 11.4, attendanceRate: 97.7 },
  { period: 'Q3', activeHC: 47, losses: 5, attritionRate: 10.6, attendanceRate: 97.1 },
];

export default function AnalyticsPage() {
  const [trajectoryView, setTrajectoryView] = useState<'quarterly' | 'monthly'>('quarterly');
  const [metric, setMetric] = useState<'Attrition' | 'Attendance' | 'Losses' | 'Active HC'>('Attrition');
  const [quarterFilter, setQuarterFilter] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>('All');
  const [accountFilter, setAccountFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<'quarter' | 'month' | 'account' | null>(null);

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

  const [inhouseMonthlyData, setInhouseMonthlyData] = useState(defaultMonthlyInhouse);
  const [pstMonthlyData, setPstMonthlyData] = useState(defaultMonthlyPst);
  const [inhouseQuarterlyData, setInhouseQuarterlyData] = useState(defaultQuarterlyInhouse);
  const [pstQuarterlyData, setPstQuarterlyData] = useState(defaultQuarterlyPst);
  const [overallQuarterlyData, setOverallQuarterlyData] = useState(defaultQuarterlyOverall);

  // Load real Supabase database data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const rawData = await fetchDashboardData();
        if (rawData && (Object.keys(rawData.inhouse || {}).length > 0 || Object.keys(rawData.pst || {}).length > 0)) {
          const allInhouse: TraineeRecord[] = Object.values(rawData.inhouse || {}).flat();
          const allPst: TraineeRecord[] = Object.values(rawData.pst || {}).flat();

          const months = [
            { key: 'Jan', label: 'January' },
            { key: 'Feb', label: 'February' },
            { key: 'Mar', label: 'March' },
            { key: 'Apr', label: 'April' },
            { key: 'May', label: 'May' },
            { key: 'Jun', label: 'June' },
            { key: 'Jul', label: 'July' },
            { key: 'Aug', label: 'August' }
          ];

          const computedInhouseMonthly = months.map(m => {
            const inhouseM = allInhouse.filter(t => t.month?.toLowerCase().includes(m.key.toLowerCase()));
            const activeHC = inhouseM.length || (defaultMonthlyInhouse.find(d => d.period === m.label)?.activeHC || 10);
            const losses = inhouseM.filter(t => t.status === 'DROPPED' || t.isLoss).length;
            const attritionRate = activeHC > 0 ? parseFloat(((losses / activeHC) * 100).toFixed(1)) : 0;
            const sumP = inhouseM.reduce((acc, t) => acc + (t.p || 0), 0);
            const sumA = inhouseM.reduce((acc, t) => acc + (t.a || 0), 0);
            const attendanceRate = (sumP + sumA) > 0 ? parseFloat(((sumP / (sumP + sumA)) * 100).toFixed(1)) : (defaultMonthlyInhouse.find(d => d.period === m.label)?.attendanceRate || 98.0);
            return { period: m.label, activeHC, losses, attritionRate, attendanceRate };
          });

          const computedPstMonthly = months.map(m => {
            const pstM = allPst.filter(t => t.month?.toLowerCase().includes(m.key.toLowerCase()));
            const activeHC = pstM.length || (defaultMonthlyPst.find(d => d.period === m.label)?.activeHC || 15);
            const losses = pstM.filter(t => t.status === 'DROPPED' || t.isLoss).length;
            const attritionRate = activeHC > 0 ? parseFloat(((losses / activeHC) * 100).toFixed(1)) : 0;
            const sumP = pstM.reduce((acc, t) => acc + (t.p || 0), 0);
            const sumA = pstM.reduce((acc, t) => acc + (t.a || 0), 0);
            const attendanceRate = (sumP + sumA) > 0 ? parseFloat(((sumP / (sumP + sumA)) * 100).toFixed(1)) : (defaultMonthlyPst.find(d => d.period === m.label)?.attendanceRate || 97.5);
            return { period: m.label, activeHC, losses, attritionRate, attendanceRate };
          });

          setInhouseMonthlyData(computedInhouseMonthly);
          setPstMonthlyData(computedPstMonthly);
        }
      } catch (e) {
        console.warn('Using default analytics metrics:', e);
      }
    }
    loadData();
  }, []);

  // Compute overall monthly data
  const overallMonthlyData = useMemo(() => {
    return inhouseMonthlyData.map((inh, idx) => {
      const pst = pstMonthlyData[idx] || { activeHC: 0, losses: 0, attendanceRate: 100 };
      const totalHC = inh.activeHC + pst.activeHC;
      const totalLoss = inh.losses + pst.losses;
      const totalAttr = totalHC > 0 ? parseFloat(((totalLoss / totalHC) * 100).toFixed(1)) : 0;
      const totalAttd = parseFloat(((inh.attendanceRate + pst.attendanceRate) / 2).toFixed(1));
      return {
        period: inh.period,
        activeHC: totalHC,
        losses: totalLoss,
        attritionRate: totalAttr,
        attendanceRate: totalAttd
      };
    });
  }, [inhouseMonthlyData, pstMonthlyData]);

  // Filter datasets based on filter inputs
  const filterByQueryAndPeriod = (data: any[], isQuarter = false) => {
    return data.filter(d => {
      if (isQuarter) {
        if (quarterFilter !== 'All' && d.period !== quarterFilter) return false;
      } else {
        if (quarterFilter === 'Q1' && !['January', 'February', 'March'].includes(d.period)) return false;
        if (quarterFilter === 'Q2' && !['April', 'May', 'June'].includes(d.period)) return false;
        if (quarterFilter === 'Q3' && !['July', 'August'].includes(d.period)) return false;
        if (monthFilter !== 'All') {
          const mLabel = { 'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April', 'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August' }[monthFilter] || monthFilter;
          if (d.period !== mLabel) return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return d.period.toLowerCase().includes(q) || d.activeHC.toString().includes(q) || d.losses.toString().includes(q);
      }
      return true;
    });
  };

  const currentInhouseData = useMemo(() => {
    return trajectoryView === 'quarterly' 
      ? filterByQueryAndPeriod(inhouseQuarterlyData, true) 
      : filterByQueryAndPeriod(inhouseMonthlyData, false);
  }, [trajectoryView, inhouseQuarterlyData, inhouseMonthlyData, quarterFilter, monthFilter, searchQuery]);

  const currentPstData = useMemo(() => {
    return trajectoryView === 'quarterly' 
      ? filterByQueryAndPeriod(pstQuarterlyData, true) 
      : filterByQueryAndPeriod(pstMonthlyData, false);
  }, [trajectoryView, pstQuarterlyData, pstMonthlyData, quarterFilter, monthFilter, searchQuery]);

  const currentOverallData = useMemo(() => {
    return trajectoryView === 'quarterly' 
      ? filterByQueryAndPeriod(overallQuarterlyData, true) 
      : filterByQueryAndPeriod(overallMonthlyData, false);
  }, [trajectoryView, overallQuarterlyData, overallMonthlyData, quarterFilter, monthFilter, searchQuery]);

  // Derived KPI cards summary using Official Average Headcount method
  const { totalSummaryAttrition, totalSummaryAttendance, totalLossesSum, activeSummaryHC, avgHeadcount } = useMemo(() => {
    const list = currentOverallData;
    if (list.length === 0) {
      return { totalSummaryAttrition: '0.0', totalSummaryAttendance: '97.5', totalLossesSum: 0, activeSummaryHC: 0, avgHeadcount: '0.0' };
    }
    const sumLoss = list.reduce((acc, d) => acc + (d.losses || 0), 0);
    const sumHC = list.reduce((acc, d) => acc + (d.activeHC || 0), 0);
    const meanHC = sumHC / list.length;
    const sumAttd = list.reduce((acc, d) => acc + (d.attendanceRate || 0), 0);
    const lastHC = list[list.length - 1]?.activeHC || 0;

    // Official WFM Average Headcount Attrition
    const calculatedAttrition = meanHC > 0 ? ((sumLoss / meanHC) * 100).toFixed(1) : '0.0';

    return {
      totalSummaryAttrition: calculatedAttrition,
      totalSummaryAttendance: (sumAttd / list.length).toFixed(1),
      totalLossesSum: sumLoss,
      activeSummaryHC: lastHC,
      avgHeadcount: meanHC.toFixed(1)
    };
  }, [currentOverallData]);

  // Value getter for charts based on selected metric
  const getMetricKey = () => {
    if (metric === 'Attrition') return 'attritionRate';
    if (metric === 'Attendance') return 'attendanceRate';
    if (metric === 'Losses') return 'losses';
    return 'activeHC';
  };

  // Custom tooltip for recharts
  const CustomTrajectoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-3 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">{label} 2026</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5 min-w-[80px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-500 dark:text-slate-400 font-medium">{metric}</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {entry.value}{metric === 'Attrition' || metric === 'Attendance' ? '%' : ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Analytics &amp; AI Insights</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Showing: <span className="text-slate-700 dark:text-slate-300 font-bold">{quarterFilter === 'All' ? 'Jan–Aug 2026' : quarterFilter} &middot; {accountFilter === 'All' ? 'All Accounts' : accountFilter}</span>
          </p>
        </div>
      </div>

      {/* Global Filter Bar (Matches Trainees & Trainers Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        
        {/* Quarter Dropdown */}
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
            <span className="truncate">{quarterFilter === 'All' ? 'All Quarters' : quarterFilter}</span>
            {openDropdown === 'quarter' ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            )}
          </button>

          {openDropdown === 'quarter' && (
            <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100/90 dark:border-slate-800 p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95">
              {['All', 'Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
                const label = q === 'All' ? 'All Quarters' : q;
                const isSelected = quarterFilter === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuarterFilter(q);
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors",
                      isSelected
                        ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                        : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Month Dropdown */}
        <div className="relative col-span-1 sm:col-span-1 lg:col-span-2" data-dropdown>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#2F6798]" />
            <span>MONTH</span>
          </div>
          <button
            type="button"
            onClick={() => setOpenDropdown(prev => prev === 'month' ? null : 'month')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
          >
            <span className="truncate">
              {monthFilter === 'All' ? 'All Months' : (
                { 'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April', 'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August', 'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December' }[monthFilter] || monthFilter
              )}
            </span>
            {openDropdown === 'month' ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            )}
          </button>

          {openDropdown === 'month' && (
            <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100/90 dark:border-slate-800 p-1.5 z-40 max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
              {[
                { val: 'All', label: 'All Months' },
                { val: 'Jan', label: 'January' },
                { val: 'Feb', label: 'February' },
                { val: 'Mar', label: 'March' },
                { val: 'Apr', label: 'April' },
                { val: 'May', label: 'May' },
                { val: 'Jun', label: 'June' },
                { val: 'Jul', label: 'July' },
                { val: 'Aug', label: 'August' },
                { val: 'Sep', label: 'September' },
                { val: 'Oct', label: 'October' },
                { val: 'Nov', label: 'November' },
                { val: 'Dec', label: 'December' }
              ].map((m) => {
                const isSelected = monthFilter === m.val;
                return (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => {
                      setMonthFilter(m.val);
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors",
                      isSelected
                        ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                        : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Client Account Dropdown */}
        <div className="relative col-span-1 sm:col-span-1 lg:col-span-3" data-dropdown>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#2F6798]" />
            <span>CLIENT ACCOUNT</span>
          </div>
          <button
            type="button"
            onClick={() => setOpenDropdown(prev => prev === 'account' ? null : 'account')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
          >
            <span className="truncate">{accountFilter === 'All' ? 'All Client Accounts' : accountFilter}</span>
            {openDropdown === 'account' ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            )}
          </button>

          {openDropdown === 'account' && (
            <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100/90 dark:border-slate-800 p-1.5 z-40 max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95">
              {[
                'All',
                'Inhouse',
                'PST',
                'HAMMERHEAD',
                'CTS',
                'COVA',
                'XPN - CXL',
                'XPN - NEGO',
                'FLEXAR',
                'FLEET',
                'ONO',
                'RM - NEGO',
                'SPA ASUKA',
                'RM - CXL',
                'DEFERIT'
              ].map((acct) => {
                const label = acct === 'All' ? 'All Client Accounts' : acct;
                const isSelected = accountFilter === acct;
                return (
                  <button
                    key={acct}
                    type="button"
                    onClick={() => {
                      setAccountFilter(acct);
                      setOpenDropdown(null);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2 rounded-xl text-xs truncate transition-colors",
                      isSelected
                        ? "font-bold text-[#2F6798] bg-blue-50/80 dark:bg-blue-950/40"
                        : "font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Field */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            <Search className="w-3.5 h-3.5 text-[#2F6798]" />
            <span>SEARCH</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search trends, period, metrics..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798] shadow-2xs transition-all"
            />
          </div>
        </div>

      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: quarterFilter === 'All' && monthFilter === 'All' ? 'YTD Attrition' : (quarterFilter !== 'All' ? `${quarterFilter} Attrition` : `${monthFilter} Attrition`), 
            val: `${totalSummaryAttrition}%`, 
            trend: '↓ 2.1%', 
            trendLabel: `vs ${avgHeadcount} avg HC`, 
            isGood: parseFloat(totalSummaryAttrition) <= 15 
          },
          { label: 'Avg Attendance', val: `${totalSummaryAttendance}%`, trend: '↑ 1.4%', trendLabel: 'filtered avg', isGood: parseFloat(totalSummaryAttendance) >= 96 },
          { label: 'Total Losses', val: `${totalLossesSum}`, trend: '↓ 4', trendLabel: 'filtered total', isGood: totalLossesSum < 10 },
          { label: 'Active HC', val: `${activeSummaryHC}`, trend: '+12', trendLabel: 'filtered active', isGood: true, neutral: true },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 pointer-events-none" />
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider relative z-10">{kpi.label}</p>
            <div className="mt-2 flex items-baseline gap-3 relative z-10">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{kpi.val}</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 relative z-10">
              <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                kpi.neutral ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 
                kpi.isGood ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
              }`}>
                {kpi.isGood && !kpi.neutral ? (kpi.trend.includes('↓') ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />) : null}
                {!kpi.isGood && !kpi.neutral ? (kpi.trend.includes('↑') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />) : null}
                {kpi.trend}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{kpi.trendLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Light Mode Training Hub AI Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/90 dark:border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#2F6798] border border-blue-400/30 flex items-center justify-center shrink-0 overflow-hidden shadow-md text-white">
              <Player
                autoplay
                loop
                src="/animations/AI chatbot-2.json"
                style={{ height: '38px', width: '38px' }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Training Hub AI
                </h2>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs">
                  LIVE AI
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Instant performance diagnosis, trajectory comparison, and executive summaries.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-ai-copilot', { detail: { prompt: 'Analyze current training performance and attrition trends' } }));
            }}
            className="bg-[#2F6798] hover:bg-[#235179] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Ask AI</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 relative z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Prompts:</span>
          {[
            { 
              label: 'Explain March Attrition Spike', 
              prompt: 'Analyze the March 2026 20% attrition spike and explain the primary drivers.',
              icon: <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" /> 
            },
            { 
              label: 'Compare Inhouse vs PST', 
              prompt: 'Compare Inhouse vs PST department retention trends over the last 4 months.',
              icon: <TrendingUp className="w-3.5 h-3.5 text-[#2F6798] shrink-0" /> 
            },
            { 
              label: 'Generate Q3 Summary', 
              prompt: 'Draft a bulleted executive summary of Q3 2026 performance.',
              icon: <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 
            },
            { 
              label: 'Highlight Attrition Risks', 
              prompt: 'Which batch groups or departments are currently at high risk for attrition?',
              icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> 
            },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-ai-copilot', { detail: { prompt: chip.prompt } }));
              }}
              className="text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 hover:border-[#2F6798]/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              {chip.icon}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory Controls & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">VIEW TRAJECTORY:</span>
          <div className="flex bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setTrajectoryView('quarterly')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                trajectoryView === 'quarterly'
                  ? "bg-white dark:bg-slate-700 text-[#2F6798] dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Quarterly Trajectory
            </button>
            <button
              type="button"
              onClick={() => setTrajectoryView('monthly')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                trajectoryView === 'monthly'
                  ? "bg-white dark:bg-slate-700 text-[#2F6798] dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Monthly Trajectory
            </button>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">METRIC:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['Attrition', 'Attendance', 'Losses', 'Active HC'].map(m => (
              <button 
                key={m}
                onClick={() => setMetric(m as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  metric === m 
                    ? "bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-slate-100" 
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Department Cards: INHOUSE vs PST (Matches Screenshot 1 & 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: INHOUSE Training Trends */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 sm:p-6 pb-2">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  INHOUSE TRAINING TRENDS - {trajectoryView.toUpperCase()} TRAJECTORY ({metric.toUpperCase()} {metric === 'Attrition' || metric === 'Attendance' ? '%' : ''} TREND)
                </h3>
              </div>
            </div>

            {/* Inhouse Line Chart */}
            <div className="h-[220px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentInhouseData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="period" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                    dy={6}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={(val) => metric === 'Attrition' || metric === 'Attendance' ? `${val}%` : val}
                  />
                  <RechartsTooltip content={<CustomTrajectoryTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                  <Line 
                    type="monotone" 
                    name="Inhouse" 
                    dataKey={getMetricKey()} 
                    stroke="#C8A54B" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                    activeDot={{ r: 6, fill: '#C8A54B', stroke: '#fff', strokeWidth: 2 }} 
                    animationDuration={800} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inhouse Data Table */}
          <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">PERIOD TITLE</th>
                  <th className="px-4 py-2.5 text-center">ACTIVE HC</th>
                  <th className="px-4 py-2.5 text-center">LOSSES</th>
                  <th className="px-4 py-2.5 text-center">ATTRITION RATE</th>
                  <th className="px-4 py-2.5 text-right">ATTENDANCE RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                {currentInhouseData.map((row, idx) => {
                  const isBadAttr = row.attritionRate > 15;
                  const isAttentionAttr = row.attritionRate > 10 && row.attritionRate <= 15;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{row.period}</td>
                      <td className="px-4 py-3 text-center">{row.activeHC}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">{row.losses}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full font-bold",
                          isBadAttr ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" :
                          isAttentionAttr ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                          "text-slate-800 dark:text-slate-200"
                        )}>
                          {row.attritionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {row.attendanceRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 2: PST Training Trends */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 sm:p-6 pb-2">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  PST TRAINING TRENDS - {trajectoryView.toUpperCase()} TRAJECTORY ({metric.toUpperCase()} {metric === 'Attrition' || metric === 'Attendance' ? '%' : ''} TREND)
                </h3>
              </div>
            </div>

            {/* PST Line Chart */}
            <div className="h-[220px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentPstData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="period" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                    dy={6}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={(val) => metric === 'Attrition' || metric === 'Attendance' ? `${val}%` : val}
                  />
                  <RechartsTooltip content={<CustomTrajectoryTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                  <Line 
                    type="monotone" 
                    name="PST" 
                    dataKey={getMetricKey()} 
                    stroke="#C8A54B" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                    activeDot={{ r: 6, fill: '#C8A54B', stroke: '#fff', strokeWidth: 2 }} 
                    animationDuration={800} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PST Data Table */}
          <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/60 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">PERIOD TITLE</th>
                  <th className="px-4 py-2.5 text-center">ACTIVE HC</th>
                  <th className="px-4 py-2.5 text-center">LOSSES</th>
                  <th className="px-4 py-2.5 text-center">ATTRITION RATE</th>
                  <th className="px-4 py-2.5 text-right">ATTENDANCE RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                {currentPstData.map((row, idx) => {
                  const isBadAttr = row.attritionRate > 15;
                  const isAttentionAttr = row.attritionRate > 10 && row.attritionRate <= 15;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{row.period}</td>
                      <td className="px-4 py-3 text-center">{row.activeHC}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">{row.losses}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full font-bold",
                          isBadAttr ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" :
                          isAttentionAttr ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                          "text-slate-800 dark:text-slate-200"
                        )}>
                          {row.attritionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {row.attendanceRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CARD 3: Overall Departmental Trends (Full Width Card, Matches Screenshot 3 & 4) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 pb-2">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Overall Departmental Trends
              </h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                OVERALL DEPARTMENTAL TRENDS - {trajectoryView.toUpperCase()} TRAJECTORY ({metric.toUpperCase()} {metric === 'Attrition' || metric === 'Attendance' ? '%' : ''} TREND)
              </p>
            </div>
          </div>

          {/* Overall Line Chart */}
          <div className="h-[240px] w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentOverallData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="period" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                  dy={6}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={(val) => metric === 'Attrition' || metric === 'Attendance' ? `${val}%` : val}
                />
                <RechartsTooltip content={<CustomTrajectoryTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                <Line 
                  type="monotone" 
                  name="Overall" 
                  dataKey={getMetricKey()} 
                  stroke="#C8A54B" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 6, fill: '#C8A54B', stroke: '#fff', strokeWidth: 2 }} 
                  animationDuration={800} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Data Table */}
        <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/60 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">PERIOD TITLE</th>
                <th className="px-5 py-3 text-center">ACTIVE HC</th>
                <th className="px-5 py-3 text-center">LOSSES</th>
                <th className="px-5 py-3 text-center">ATTRITION RATE</th>
                <th className="px-5 py-3 text-right">ATTENDANCE RATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
              {currentOverallData.map((row, idx) => {
                const isBadAttr = row.attritionRate > 15;
                const isAttentionAttr = row.attritionRate > 10 && row.attritionRate <= 15;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">{row.period}</td>
                    <td className="px-5 py-3.5 text-center font-bold">{row.activeHC}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-rose-600 dark:text-rose-400">{row.losses}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        "inline-block px-2.5 py-1 rounded-full font-bold",
                        isBadAttr ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" :
                        isAttentionAttr ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                        "text-slate-800 dark:text-slate-200"
                      )}>
                        {row.attritionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {row.attendanceRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
