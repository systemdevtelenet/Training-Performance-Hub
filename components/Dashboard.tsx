'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, CalendarDays, Calendar, Building2 } from 'lucide-react';

import { getFilteredData, generateTrendAnalytics, MONTH_ORDER } from '@/lib/analytics-utils';
import { ExecutiveSummaryView } from '@/components/ExecutiveSummaryView';
import { EmployeeDashboardView } from '@/components/EmployeeDashboardView';
import { useRole } from '@/components/providers/RoleProvider';
import KpiCards from '@/components/KpiCards';
import { CustomSelect } from '@/components/ui/CustomSelect';

export default function Dashboard({ initialData }: { initialData: any }) {
  const { role } = useRole();
  const [filters, setFilters] = useState({ month: 'ALL', quarter: 'ALL', account: 'ALL', search: '' });

  const processedData = useMemo(() => {
    try {
      if (!initialData) {
        console.warn('initialData is not available');
        return { trendData: { inhouse: { months: [], quarters: [] }, pst: { months: [], quarters: [] }, overall: { months: [], quarters: [] } } };
      }
      const filtered = getFilteredData(initialData, filters);
      const trendData = generateTrendAnalytics(initialData, filters);
      return { ...filtered, trendData };
    } catch (error) {
      console.error('Error processing data:', error);
      return { trendData: { inhouse: { months: [], quarters: [] }, pst: { months: [], quarters: [] }, overall: { months: [], quarters: [] } } };
    }
  }, [initialData, filters]);

  // If user is a regular employee / trainee, show personalized trainee portal dashboard
  if (role === 'EMPLOYEE') {
    return (
      <div className="space-y-4 text-[#363435] dark:text-slate-200">
        <EmployeeDashboardView rawData={initialData} />
      </div>
    );
  }

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
      <KpiCards metrics={initialData?.metrics} />

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] relative z-20">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 pointer-events-none" />
        <div className="relative z-10">
          <label htmlFor="quarter" className="mb-1.5 flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider"><CalendarDays className="h-3.5 w-3.5 text-primary" />Quarter</label>
          <CustomSelect 
            id="quarter" 
            value={filters.quarter} 
            onChange={(val) => setFilters(prev => ({ ...prev, quarter: val }))} 
            options={[
              { value: 'ALL', label: 'All Quarters' },
              { value: 'Q1', label: 'Q1' },
              { value: 'Q2', label: 'Q2' },
              { value: 'Q3', label: 'Q3' },
              { value: 'Q4', label: 'Q4' },
            ]}
          />
        </div>

        <div className="relative z-10">
          <label htmlFor="month" className="mb-1.5 flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider"><Calendar className="h-3.5 w-3.5 text-primary" />Month</label>
          <CustomSelect 
            id="month" 
            value={filters.month} 
            onChange={(val) => setFilters(prev => ({ ...prev, month: val }))} 
            options={[
              { value: 'ALL', label: 'All Months' },
              ...MONTH_ORDER.map(m => ({ value: m, label: m }))
            ]}
          />
        </div>

        <div className="relative z-10">
          <label htmlFor="account" className="mb-1.5 flex items-center gap-1.5 text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider"><Building2 className="h-3.5 w-3.5 text-primary" />Client Account</label>
          <CustomSelect 
            id="account" 
            value={filters.account} 
            onChange={(val) => setFilters(prev => ({ ...prev, account: val }))} 
            options={[
              { value: 'ALL', label: 'All Client Accounts' },
              ...(initialData?.allAccounts || []).map((acc: string) => ({ value: acc, label: acc }))
            ]}
          />
        </div>

        <div className="relative z-10">
          <label htmlFor="search" className="mb-1.5 block text-[0.6rem] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Search Trainee / Batch / Trainer</label>
          <div className="relative group">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
            <input id="search" type="search" placeholder="Type name or batch..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-11 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Main Executive Summary View */}
      <div className="mt-4">
        <ExecutiveSummaryView data={processedData} rawData={initialData} filters={filters} />
      </div>

    </div>
  );
}
