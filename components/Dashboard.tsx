'use client';

import { useState, useMemo } from 'react';
import { Select, SelectItem, TextInput } from '@tremor/react';
import { Search } from 'lucide-react';

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
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Executive Summary</h2>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/60 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1 block">Quarter Filter</label>
          <Select value={filters.quarter} onValueChange={(v) => setFilters(prev => ({ ...prev, quarter: v }))}>
            <SelectItem value="ALL">All Quarters</SelectItem>
            <SelectItem value="Q1">Q1</SelectItem>
            <SelectItem value="Q2">Q2</SelectItem>
            <SelectItem value="Q3">Q3</SelectItem>
            <SelectItem value="Q4">Q4</SelectItem>
          </Select>
        </div>

        <div>
          <label className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1 block">Month Filter</label>
          <Select value={filters.month} onValueChange={(v) => setFilters(prev => ({ ...prev, month: v }))}>
            <SelectItem value="ALL">All Months</SelectItem>
            {MONTH_ORDER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </Select>
        </div>

        <div>
          <label className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1 block">Client Account</label>
          <Select value={filters.account} onValueChange={(v) => setFilters(prev => ({ ...prev, account: v }))}>
            <SelectItem value="ALL">All Client Accounts</SelectItem>
          </Select>
        </div>

        <div>
          <label className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1 block">Search Trainee / Batch / Trainer</label>
          <TextInput
            icon={Search}
            placeholder="Type name or batch..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Main Executive Summary View */}
      <div className="mt-4">
        <ExecutiveSummaryView data={processedData} rawData={dummyPayload} filters={filters} />
      </div>

    </div>
  );
}