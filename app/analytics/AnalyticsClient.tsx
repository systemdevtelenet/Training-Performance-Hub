'use client';

import { useState } from 'react';
import { 
  Search, ChevronDown, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, ArrowUpDown, RefreshCcw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

const mockMonthlyData = [
  { period: 'Jan', inhouseAttr: 18.2, inhouseHC: 22, inhouseLoss: 4, pstAttr: 8.7, pstHC: 23, pstLoss: 2, totalAttr: 13.3, totalHC: 45, totalLoss: 6, totalAttd: 96.0 },
  { period: 'Feb', inhouseAttr: 0.0, inhouseHC: 17, inhouseLoss: 0, pstAttr: 21.4, pstHC: 14, pstLoss: 3, totalAttr: 9.7, totalHC: 31, totalLoss: 3, totalAttd: 97.8 },
  { period: 'Mar', inhouseAttr: 50.0, inhouseHC: 2, inhouseLoss: 1, pstAttr: 15.4, pstHC: 13, pstLoss: 2, totalAttr: 20.0, totalHC: 15, totalLoss: 3, totalAttd: 95.7 },
  { period: 'Apr', inhouseAttr: 0.0, inhouseHC: 3, inhouseLoss: 0, pstAttr: 17.1, pstHC: 35, pstLoss: 6, totalAttr: 15.8, totalHC: 38, totalLoss: 6, totalAttd: 98.4 },
  { period: 'May', inhouseAttr: 0.0, inhouseHC: 8, inhouseLoss: 0, pstAttr: 10.0, pstHC: 10, pstLoss: 1, totalAttr: 5.6, totalHC: 18, totalLoss: 1, totalAttd: 98.6 },
  { period: 'Jun', inhouseAttr: 0.0, inhouseHC: 9, inhouseLoss: 0, pstAttr: 7.1, pstHC: 28, pstLoss: 2, totalAttr: 5.4, totalHC: 37, totalLoss: 2, totalAttd: 99.1 },
  { period: 'Jul', inhouseAttr: 0.0, inhouseHC: 15, inhouseLoss: 0, pstAttr: 12.5, pstHC: 24, pstLoss: 3, totalAttr: 7.7, totalHC: 39, totalLoss: 3, totalAttd: 98.5 },
  { period: 'Aug', inhouseAttr: 0.0, inhouseHC: 2, inhouseLoss: 0, pstAttr: 0.0, pstHC: 9, pstLoss: 0, totalAttr: 0.0, totalHC: 11, totalLoss: 0, totalAttd: 99.6 },
];

export default function AnalyticsPage() {
  const [metric, setMetric] = useState<'Attrition' | 'Attendance' | 'Losses' | 'Active HC'>('Attrition');
  
  // Custom tooltip for recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-3 text-xs">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label} 2026</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5 w-20">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-500 font-medium">{entry.name}</span>
              </div>
              <span className="font-bold text-slate-800">
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
      {/* 1. Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Analytics Trends</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Showing: <span className="text-slate-700 dark:text-slate-300 font-bold">Jan–Aug 2026 &middot; All Accounts</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/20 shadow-xs cursor-pointer">
              <option>All Quarters</option>
              <option>Q1 2026</option>
              <option>Q2 2026</option>
              <option>Q3 2026</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/20 shadow-xs cursor-pointer">
              <option>All Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/20 shadow-xs cursor-pointer">
              <option>All Client Accounts</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search..."
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/20 shadow-xs w-48"
            />
          </div>
          <button className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg transition-colors shadow-xs" title="Reset Filters">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Attrition', val: '7.8%', trend: '↓ 2.1%', trendLabel: 'vs prev quarter', isGood: true },
          { label: 'Avg Attendance', val: '96.4%', trend: '↑ 1.4%', trendLabel: 'vs prev quarter', isGood: true },
          { label: 'Total Losses', val: '25', trend: '↓ 8', trendLabel: 'vs prev quarter', isGood: true },
          { label: 'Active HC', val: '117', trend: '+12', trendLabel: 'vs prev quarter', isGood: true, neutral: true },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 pointer-events-none" />
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider relative z-10">{kpi.label}</p>
            <div className="mt-2 flex items-baseline gap-3 relative z-10">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{kpi.val}</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 relative z-10">
              <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                kpi.neutral ? 'bg-blue-50 text-blue-600' : 
                kpi.isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-9 space-y-6">
          {/* 3. Department Performance Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 group cursor-pointer transition-shadow hover:shadow-md relative">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-bold text-[#2F6798] bg-blue-50/50 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-blue-100 shadow-xs">
                ↗ Expand Chart
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:pr-24">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Department Performance</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Comparing Inhouse vs PST trajectory</p>
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                {['Attrition', 'Attendance', 'Losses', 'Active HC'].map(m => (
                  <button 
                    key={m}
                    onClick={(e) => { e.stopPropagation(); setMetric(m as any); }}
                    className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      metric === m ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockMonthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="period" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    tickFormatter={(val) => metric === 'Attrition' || metric === 'Attendance' ? `${val}%` : val}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569', paddingTop: '20px' }} />
                  
                  {metric === 'Attrition' && (
                    <>
                      <Line type="monotone" name="Inhouse" dataKey="inhouseAttr" stroke="#2F6798" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#2F6798', stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
                      <Line type="monotone" name="PST" dataKey="pstAttr" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
                    </>
                  )}
                  {metric === 'Active HC' && (
                    <>
                      <Line type="monotone" name="Inhouse" dataKey="inhouseHC" stroke="#2F6798" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} animationDuration={1000} />
                      <Line type="monotone" name="PST" dataKey="pstHC" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} animationDuration={1000} />
                    </>
                  )}
                  {metric === 'Losses' && (
                    <>
                      <Line type="monotone" name="Inhouse" dataKey="inhouseLoss" stroke="#2F6798" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} animationDuration={1000} />
                      <Line type="monotone" name="PST" dataKey="pstLoss" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} animationDuration={1000} />
                    </>
                  )}
                  {metric === 'Attendance' && (
                    <>
                      <Line type="monotone" name="Overall" dataKey="totalAttd" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} animationDuration={1000} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Period Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Period Breakdown</h3>
              <div className="flex bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg">
                <button className="px-3 py-1 bg-white dark:bg-slate-700 shadow-xs rounded-md text-xs font-bold text-slate-800 dark:text-slate-100">Monthly</button>
                <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">Quarterly</button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-1">Period <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-5 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-center gap-1">Active HC <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-5 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-center gap-1">Losses <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-5 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-center gap-1">Attrition Rate <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-end gap-1">Attendance Rate <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {mockMonthlyData.map((row, idx) => {
                    const isBadAttrition = row.totalAttr > 15;
                    const isAttentionAttrition = row.totalAttr > 10 && row.totalAttr <= 15;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-100">{row.period} 2026</td>
                        <td className="px-5 py-4 text-center font-bold">{row.totalHC}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={row.totalLoss > 3 ? 'text-rose-600 font-bold' : ''}>{row.totalLoss}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
                            isBadAttrition ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' :
                            isAttentionAttrition ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
                            'text-slate-800 dark:text-slate-200'
                          }`}>
                            {isBadAttrition && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                            {isAttentionAttrition && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                            {row.totalAttr.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                          {row.totalAttd.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 5. Right Sidebar (Insights & Risk) */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2 relative z-10">
              <span className="text-blue-400">✨</span> Key Insights
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-default">
                <div className="flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">March has highest attrition</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Overall attrition spiked to <strong className="text-slate-200">20.0%</strong>, primarily driven by a 50% spike in Inhouse attrition.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-default">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Attendance recovered in April</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Overall attendance climbed to <strong className="text-slate-200">98.4%</strong> across all departments following the Q1 dip.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-default">
                <div className="flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">PST remains above Inhouse</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      PST attrition is consistently hovering around 10-17% over the last 4 months while Inhouse remained at 0%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Periods Requiring Attention
            </h3>
            
            <div className="space-y-3">
              {[
                { period: 'March 2026', title: 'Overall Attrition: 20.0%', subtitle: 'Losses: 3 · Active HC: 15', status: 'critical' },
                { period: 'April 2026', title: 'PST Attrition: 17.1%', subtitle: 'Losses: 6 · Active HC: 38', status: 'critical' },
                { period: 'February 2026', title: 'PST Attrition: 21.4%', subtitle: 'Losses: 3 · Active HC: 31', status: 'attention' },
              ].map((risk, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3 transition-colors cursor-default ${
                  risk.status === 'critical' 
                    ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/30 dark:hover:bg-rose-900/20' 
                    : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 dark:hover:bg-amber-900/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 shadow-sm ${
                    risk.status === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{risk.period}</h4>
                    <p className={`text-[11px] font-bold mt-1 ${
                      risk.status === 'critical' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                    }`}>{risk.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{risk.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
