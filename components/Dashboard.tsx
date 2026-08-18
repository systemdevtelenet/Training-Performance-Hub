'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, CalendarDays, Calendar, Building2 } from 'lucide-react';

import { getFilteredData, generateTrendAnalytics, MONTH_ORDER } from '@/lib/analytics-utils';
import { ExecutiveSummaryView } from '@/components/ExecutiveSummaryView';

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
    <div className="space-y-4 text-[#363435]">
      
      {/* Page Title Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col">
          <span className="text-[0.65rem] font-bold uppercase text-slate-400 tracking-wider">DASHBOARD</span>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Executive Summary</h2>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr]">
        <div>
          <label htmlFor="quarter" className="mb-1 flex items-center gap-1 text-[0.5rem] font-bold uppercase text-slate-500"><CalendarDays className="h-3 w-3" />Quarter</label>
          <div className="relative">
            <select id="quarter" value={filters.quarter} onChange={(e) => setFilters(prev => ({ ...prev, quarter: e.target.value }))} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs text-slate-700 outline-none transition focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/15">
              <option value="ALL">All Quarters</option><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label htmlFor="month" className="mb-1 flex items-center gap-1 text-[0.5rem] font-bold uppercase text-slate-500"><Calendar className="h-3 w-3" />Month</label>
          <div className="relative">
            <select id="month" value={filters.month} onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs text-slate-700 outline-none transition focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/15">
              <option value="ALL">All Months</option>{MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label htmlFor="account" className="mb-1 flex items-center gap-1 text-[0.5rem] font-bold uppercase text-slate-500"><Building2 className="h-3 w-3" />Client Account</label>
          <div className="relative">
            <select id="account" value={filters.account} onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value }))} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs text-slate-700 outline-none transition focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/15">
              <option value="ALL">All Client Accounts</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label htmlFor="search" className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Search Trainee / Batch / Trainer</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="search" type="search" placeholder="Type name or batch..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/15" />
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
