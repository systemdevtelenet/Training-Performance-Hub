'use client';

import { useState, useMemo } from 'react';
import { Card, Button, Select, SelectItem, TextInput } from '@tremor/react';
import { RefreshCw, BarChart2, Printer, Search, Sparkles } from 'lucide-react';

import { getFilteredData, generateTrendAnalytics, MONTH_ORDER } from '@/lib/analytics-utils';
import { ExecutiveSummaryView } from '@/components/ExecutiveSummaryView';
import { TrainersDirectoryView } from '@/components/TrainersDirectoryView';
import { AnalyticsChart } from '@/components/AnalyticsChart';

// Sample dynamic structure corresponding to spreadsheet input payload
import dummyPayload from '@/data/dashboard-mock.json';

function DashboardPageContent() {
  const [activeTab, setActiveTab] = useState<'summary' | 'trainees' | 'trainers' | 'ai-report' | 'analytics'>('summary');
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
    <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-6 text-[#363435]">
      <div className="max-w-full mx-auto space-y-4">
        
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white/90 px-5 py-3 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Training Performance Hub</h1>
            <p className="text-xs text-slate-500">Cebu Tele-Net Operations Analytics</p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Button size="xs" variant="secondary" icon={RefreshCw}>Refresh Data</Button>
            <Button size="xs" variant="secondary" icon={BarChart2}>Export Summary</Button>
            <Button size="xs" variant="secondary" icon={Printer} onClick={() => window.print()}>Print / PDF</Button>
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Systems
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-[#eef2f6] p-1.5 rounded-2xl shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff]">
          {[
            { id: 'summary', label: 'Executive Summary' },
            { id: 'trainees', label: 'Trainees' },
            { id: 'trainers', label: 'Trainers Directory' },
            { id: 'analytics', label: 'Analytics Trends' },
            { id: 'ai-report', label: 'AI Insights' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-[#2F6798] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
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

        {/* Main Panel Output */}
        <div className="mt-4">
          {activeTab === 'summary' && <ExecutiveSummaryView data={processedData} rawData={dummyPayload} filters={filters} />}
          {activeTab === 'trainers' && <TrainersDirectoryView rawData={dummyPayload} filters={filters} />}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <AnalyticsChart title="INHOUSE Quarterly Trajectory" data={processedData.trendData.inhouse.quarters} />
              <AnalyticsChart title="PST Quarterly Trajectory" data={processedData.trendData.pst.quarters} />
            </div>
          )}
          {activeTab === 'ai-report' && (
            <Card className="p-6 text-center space-y-4">
              <Sparkles className="w-8 h-8 text-[#2F6798] mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Gemini AI Insights Engine</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select a report timeframe above or click a trigger button to execute LLM analysis on current attrition rates.
              </p>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardPageContent />;
}