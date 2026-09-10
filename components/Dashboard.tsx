'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, CalendarDays, Calendar, Building2 } from 'lucide-react';

import { getFilteredData, generateTrendAnalytics, MONTH_ORDER } from '@/lib/analytics-utils';
import { ExecutiveSummaryView } from '@/components/ExecutiveSummaryView';
import { EmployeeDashboardView } from '@/components/EmployeeDashboardView';
import { useRole } from '@/components/providers/RoleProvider';
import KpiCards from '@/components/KpiCards';
import { CustomSelect } from '@/components/ui/CustomSelect';
import PageLoading from '@/components/PageLoading';

export default function Dashboard({ initialData }: { initialData: any }) {
  const { role, isLoading } = useRole();
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

  // Compute dynamic KPI metrics based on active filters
  const filteredMetrics = useMemo(() => {
    if (!processedData) return initialData?.metrics;
    
    const batchSet = new Set();
    ['inhouse', 'pst'].forEach(type => {
      if (processedData[type]?.groups) {
        for (const acc in processedData[type].groups) {
          for (const b in processedData[type].groups[acc]) {
            if (processedData[type].groups[acc][b].members?.length > 0) {
              batchSet.add(`${type}-${acc}-${b}`);
            }
          }
        }
      }
    });

    const activeTrainersCount = processedData.summary?.trainersSummary?.headcount ?? initialData?.metrics?.activeTrainers ?? 16;

    return {
      totalTrainees: processedData.summary?.totalHeadcount ?? initialData?.metrics?.totalTrainees ?? 0,
      overallAttrition: processedData.summary?.globalRate ?? initialData?.metrics?.overallAttrition ?? '0.0%',
      activeTrainers: activeTrainersCount,
      classesInSession: batchSet.size
    };
  }, [processedData, initialData]);

  // Show full screen loading while user role & session are resolving
  if (isLoading) {
    return (
      <PageLoading
        title="Loading Dashboard..."
        subtitle="Getting your personalized workspace ready"
      />
    );
  }

  // For regular employees or non-admin users, render their personalized performance view with matching executive UI design
  const isAdminOrTrainer = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN', 'TRAINER'].includes(role);
  if (!isAdminOrTrainer) {
    return (
      <div className="space-y-5 text-[#363435] dark:text-slate-200">
        <EmployeeDashboardView rawData={initialData} />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#363435] dark:text-slate-200">
      
      {/* Page Title Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">DASHBOARD</span>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Executive Summary</h2>
        </div>
      </div>

      {/* KPI Cards Row (Dynamic & Filter-reactive) */}
      <KpiCards metrics={filteredMetrics} />

      {/* Global Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr] gap-4 relative z-20">
        <div>
          <label htmlFor="quarter" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <CalendarDays className="h-3.5 w-3.5 text-[#2F6798]" />Quarter
          </label>
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

        <div>
          <label htmlFor="month" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-[#2F6798]" />Month
          </label>
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

        <div>
          <label htmlFor="account" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <Building2 className="h-3.5 w-3.5 text-[#2F6798]" />Client Account
          </label>
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

        <div>
          <label htmlFor="search" className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            Search Trainee / Batch / Trainer
          </label>
          <div className="relative group">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
            <input 
              id="search" 
              type="search" 
              placeholder="Type name or batch..." 
              value={filters.search} 
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} 
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-10 pr-4 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/20" 
            />
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
