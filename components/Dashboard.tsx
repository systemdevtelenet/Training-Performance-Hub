'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, CalendarDays, Calendar, Building2 } from 'lucide-react';

import { getFilteredData, generateTrendAnalytics, MONTH_ORDER } from '@/lib/analytics-utils';
import { ExecutiveSummaryView } from '@/components/ExecutiveSummaryView';
import KpiCards from '@/components/KpiCards';

import dummyPayload from '@/data/dashboard-mock.json';

export default function Dashboard() {
  const [filters, setFilters] = useState({ month: 'ALL', quarter: 'ALL', account: 'ALL', search: '' });

  const processedData = useMemo(() => {
    try {
      if (!dummyPayload) {
        console.warn('dummyPayload is not available');
        return { trendData: { inhouse: { months: [], quarters: [] }, pst: { months: [], quarters: [] }, overall: { months: [], quarters: [] } } };
      }
      const filtered = getFilteredData(dummyPayload, filters);
      const trendData = generateTrendAnalytics(dummyPayload, filters);
      return { ...filtered, trendData };
    } catch (error) {
      console.error('Error processing data:', error);
      return { trendData: { inhouse: { months: [], quarters: [] }, pst: { months: [], quarters: [] }, overall: { months: [], quarters: [] } } };
    }
  }, [filters]);

  return (
    <div className="space-y-4 text-[#363435] dark:text-slate-200">
      
      {/* Page Title Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col">
          <span className="text-[0.65rem] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">DASHBOARD</span>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Executive Summary</h2>
        </div>
      </div>

      {/* KPI Cards Row */}
      <KpiCards />

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 pointer-events-none" />
        <div className="relative z-10">
          <label htmlFor="quarter" className="mb-1.5 flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider"><CalendarDays className="h-3.5 w-3.5 text-primary" />Quarter</label>
          <div className="relative group">
            <select id="quarter" value={filters.quarter} onChange={(e) => setFilters(prev => ({ ...prev, quarter: e.target.value }))} className="h-11 w-full appearance-none rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-4 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm cursor-pointer">
              <option value="ALL">All Quarters</option><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        <div className="relative z-10">
          <label htmlFor="month" className="mb-1.5 flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider"><Calendar className="h-3.5 w-3.5 text-primary" />Month</label>
          <div className="relative group">
            <select id="month" value={filters.month} onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))} className="h-11 w-full appearance-none rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-4 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm cursor-pointer">
              <option value="ALL">All Months</option>{MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        <div className="relative z-10">
          <label htmlFor="account" className="mb-1.5 flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider"><Building2 className="h-3.5 w-3.5 text-primary" />Client Account</label>
          <div className="relative group">
            <select id="account" value={filters.account} onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value }))} className="h-11 w-full appearance-none rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-4 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm cursor-pointer">
              <option value="ALL">All Client Accounts</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        <div className="relative z-10">
          <label htmlFor="search" className="mb-1.5 block text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Search Trainee / Batch / Trainer</label>
          <div className="relative group">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
            <input id="search" type="search" placeholder="Type name or batch..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-11 pr-4 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Main Executive Summary View */}
      <div className="mt-4">
        <ExecutiveSummaryView data={processedData} rawData={dummyPayload} filters={filters} />
      </div>

    </div>
  );
}
