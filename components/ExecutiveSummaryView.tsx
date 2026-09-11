'use client';

import React, { useState } from 'react';
import { Card, Metric, Text } from '@tremor/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { 
  UsersRound, TrendingDown, Percent, LayoutDashboard, 
  LineChart as LineChartIcon, ListTree, ChevronDown, ChevronUp, 
  X, Search, User, ArrowRight, Layers, CheckCircle2, AlertCircle,
  Users, Info, ClipboardList
} from 'lucide-react';
import { DrawerTrainee, TraineeDetailDrawer } from './TraineeDetailDrawer';

export function ExecutiveSummaryView({ data, rawData, filters }: { data: any; rawData: any; filters: any }) {
  const [selectedTrainee, setSelectedTrainee] = useState<DrawerTrainee | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [overallView, setOverallView] = useState<'quarterly' | 'monthly'>('quarterly');
  const [showTableBreakdown, setShowTableBreakdown] = useState<boolean>(false);

  if (!data?.summary) return null;

  const ts = data.summary.trainersSummary || { headcount: 16, attendanceRate: '100.0%', reliabilityRate: '100.0%', attritionRate: '0.0%', totalLosses: 0 };
  const trendData = data.trendData || { overall: { months: [], quarters: [] } };

  const activeBatches: any[] = [];
  ['inhouse', 'pst'].forEach(type => {
    if (!data[type]?.groups) return;
    for (const accName in data[type].groups) {
      const displayAcc = accName && accName.trim() !== "" ? accName.trim() : "General";
      for (const bName in data[type].groups[accName]) {
        const group = data[type].groups[accName][bName];
        if (!group.members || group.members.length === 0) continue;

        const ongoingCount = group.members.filter((m: any) => 
          m.status?.toUpperCase().includes('ONGOING') || m.status?.toUpperCase() === 'ACTIVE'
        ).length;

        if (ongoingCount > 0) {
          const hc = group.members.length;
          const losses = group.members.filter((m: any) => m.isLoss).length;
          const attritionRate = hc > 0 ? ((losses / hc) * 100).toFixed(1) + '%' : '0.0%';

          let totalP = 0, totalA = 0;
          group.members.forEach((m: any) => { totalP += (m.p || 0); totalA += (m.a || 0); });
          const totalAtt = totalP + totalA;
          const attendanceRate = totalAtt > 0 ? ((totalP / totalAtt) * 100).toFixed(1) + '%' : '100.0%';

          const assignedTrainer = group.members.find((m: any) => m.assignedTrainer || m.assigned_trainer)?.assignedTrainer ||
            group.members.find((m: any) => m.assigned_trainer)?.assigned_trainer ||
            group.trainer || 'Mitch';

          activeBatches.push({
            accountName: displayAcc,
            batchName: bName,
            trainingType: type === 'inhouse' ? 'Inhouse Training' : 'PST Training',
            trainer: assignedTrainer,
            headcount: hc,
            ongoing: ongoingCount,
            losses,
            attritionRate,
            attendanceRate,
            members: group.members.sort((x: any, y: any) => (x.name || '').localeCompare(y.name || ''))
          });
        }
      }
    }
  });

  const quarterlyData = trendData.overall?.quarters || [];
  const monthlyData = trendData.overall?.months || [];
  const currentTrendData = overallView === 'quarterly' ? quarterlyData : monthlyData;

  const CustomTrajectoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-300 dark:border-amber-500/40 shadow-xl rounded-xl p-3 text-xs space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1">
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
              {label}
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded">
              OVERALL
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Attrition Rate:</span>
            <span className="font-mono font-black text-[#C8A54B] dark:text-amber-400 text-sm">{dataPoint.attritionRate || `${dataPoint.attritionNum || 0}%`}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Active Headcount:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{dataPoint.activeHC || dataPoint.headcount || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Losses:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{dataPoint.losses || 0}</span>
          </div>
          {dataPoint.attendanceRate && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Attendance:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{dataPoint.attendanceRate}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Executive Performance Overview */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
            <h3 className="mb-4 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700/80 pb-3 text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              <LayoutDashboard className="h-4 w-4 text-[#2F6798]" /> Executive Performance Overview
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center relative z-10">
              <div className="flex flex-col items-center bg-slate-50/90 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Headcount</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-7 w-7 rounded-lg bg-[#2F6798]/10 dark:bg-[#2F6798]/20 flex items-center justify-center">
                    <UsersRound className="h-3.5 w-3.5 text-[#2F6798]" />
                  </div>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">{data.summary.totalHeadcount}</span>
                </div>
              </div>

              <div className="flex flex-col items-center bg-slate-50/90 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Losses</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400">{data.summary.totalLosses}</span>
                </div>
              </div>

              <div className="flex flex-col items-center bg-slate-50/90 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Global Attrition</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-7 w-7 rounded-lg bg-[#2F6798]/10 dark:bg-[#2F6798]/20 flex items-center justify-center">
                    <Percent className="h-3.5 w-3.5 text-[#2F6798]" />
                  </div>
                  <span className="text-xl font-black text-[#2F6798] dark:text-blue-400">{data.summary.globalRate}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border-l-4 border-l-[#2F6798] border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-1.5 block">INHOUSE TRAINING</span>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Headcount</span><span className="font-bold text-slate-700 dark:text-slate-200">{data.summary.inhouse.count}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Ongoing</span><span className="font-bold text-slate-700 dark:text-slate-200">{data.summary.inhouse.ongoing}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Losses</span><span className="font-bold text-rose-600 dark:text-rose-400">{data.summary.inhouse.losses}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Attrition</span><span className="font-bold text-[#2F6798] dark:text-blue-400">{data.summary.inhouse.rate}</span></div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border-l-4 border-l-[#2F6798] border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-1.5 block">PST TRAINING</span>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Headcount</span><span className="font-bold text-slate-700 dark:text-slate-200">{data.summary.pst.count}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Ongoing</span><span className="font-bold text-slate-700 dark:text-slate-200">{data.summary.pst.ongoing}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Losses</span><span className="font-bold text-rose-600 dark:text-rose-400">{data.summary.pst.losses}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Attrition</span><span className="font-bold text-[#2F6798] dark:text-blue-400">{data.summary.pst.rate}</span></div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-1.5 block">TRAINERS</span>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Active</span><span className="font-bold text-slate-700 dark:text-slate-200">{ts.headcount}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Losses</span><span className="font-bold text-rose-600 dark:text-rose-400">{ts.totalLosses}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Attrition</span><span className="font-bold text-slate-700 dark:text-slate-200">{ts.attritionRate}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Att.</span><span className="font-bold text-slate-700 dark:text-slate-200">{ts.attendanceRate}</span></div>
                  <div><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Rel.</span><span className="font-bold text-slate-700 dark:text-slate-200">{ts.reliabilityRate}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Accounts & Batches */}
          {activeBatches.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  <ListTree className="h-4 w-4 text-[#2F6798]" /> Active Accounts & Batches in Training
                </h3>
                <span className="text-[11px] font-medium text-slate-400">Click a batch to view trainees</span>
              </div>

              <div className="overflow-x-auto custom-horizontal-scrollbar touch-pan-x rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800">
                <table className="w-full text-xs text-left min-w-[750px]">
                  <thead className="bg-slate-50/90 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Assigned Trainer</th>
                      <th className="py-3 px-3 text-center">HC</th>
                      <th className="py-3 px-3 text-center">Ongoing</th>
                      <th className="py-3 px-3 text-center">Losses</th>
                      <th className="py-3 px-4 text-center">Attrition</th>
                      <th className="py-3 px-4 text-center">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {activeBatches.map((b, idx) => {
                      const cleanBatchNumber = b.batchName ? `${b.batchName}`.replace(/^(batch\s*|wave\s*|.*-\s*)/i, '').trim() || b.batchName : '1';
                      const attrVal = parseFloat(b.attritionRate) || 0;
                      const isSelected = selectedBatch?.accountName === b.accountName && selectedBatch?.batchName === b.batchName;

                      return (
                        <tr 
                          key={`${b.accountName}-${b.batchName}-${idx}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedBatch(b);
                            setBatchSearchQuery('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedBatch(b);
                              setBatchSearchQuery('');
                            }
                          }}
                          className={`cursor-pointer transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-700/40 focus:outline-none ${
                            isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                            {b.accountName.toUpperCase()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                              {cleanBatchNumber}
                              <ArrowRight className="w-3 h-3 text-slate-400 opacity-60 ml-0.5" />
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#2F6798] dark:text-blue-300 font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
                                {(b.trainer || 'T').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate max-w-[140px]">
                                {b.trainer || 'Unassigned'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {b.headcount}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-amber-600 dark:text-amber-500">
                            {b.ongoing}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-rose-600 dark:text-rose-500">
                            {b.losses}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center justify-center font-bold px-2.5 py-0.5 text-xs rounded-full border ${
                              attrVal > 0 
                                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50' 
                                : 'bg-blue-50 text-[#2F6798] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                            }`}>
                              {b.attritionRate}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                            {b.attendanceRate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Overall Departmental Trends (Unified Card matching Analytics page) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden relative">
            <div className="p-5 sm:p-6 pb-2">
              {/* Card Header: Full width title & subtitle */}
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Overall Departmental Trends
                </h2>
                <p className="text-xs font-bold text-[#2F6798] dark:text-blue-400 uppercase tracking-wide">
                  OVERALL DEPARTMENTAL TRENDS - {overallView.toUpperCase()} TRAJECTORY (ATTRITION % TREND)
                </p>
              </div>

              {/* Tab Switcher: Full row above the graph */}
              <div className="mt-4 mb-2 flex items-center justify-end">
                <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200/60 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setOverallView('quarterly')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      overallView === 'quarterly'
                        ? 'bg-white dark:bg-slate-700 text-[#2F6798] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Quarterly Trajectory
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverallView('monthly')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      overallView === 'monthly'
                        ? 'bg-white dark:bg-slate-700 text-[#2F6798] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Monthly Trajectory
                  </button>
                </div>
              </div>

              {/* Gold Gradient Area Chart with Laser Crosshair */}
              <div className="h-[240px] w-full mt-3 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={currentTrendData} 
                    margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="cryptoExecGoldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C8A54B" stopOpacity={0.4} />
                        <stop offset="60%" stopColor="#C8A54B" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#C8A54B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.7} />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} 
                      dy={6}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <RechartsTooltip 
                      content={<CustomTrajectoryTooltip />} 
                      cursor={{ stroke: '#C8A54B', strokeWidth: 1.5, strokeDasharray: 'none', opacity: 0.8 }} 
                    />
                    <Area 
                      type="linear" 
                      name={`Overall ${overallView === 'quarterly' ? 'Quarterly' : 'Monthly'}`} 
                      dataKey="attritionNum" 
                      stroke="#C8A54B" 
                      strokeWidth={3} 
                      fill="url(#cryptoExecGoldGrad)"
                      dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF', stroke: '#C8A54B' }} 
                      activeDot={{ r: 6.5, fill: '#C8A54B', stroke: '#FFFFFF', strokeWidth: 2 }} 
                      animationDuration={800} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Collapsible Data Table Breakdown matching Analytics Page */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowTableBreakdown(!showTableBreakdown)}
                className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <span className="uppercase tracking-wider">
                  {showTableBreakdown ? 'Hide Data Table Breakdown' : 'Show Data Table Breakdown'}
                </span>
                {showTableBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showTableBreakdown && (
                <div className="px-5 pb-5 overflow-x-auto custom-horizontal-scrollbar touch-pan-x">
                  <table className="w-full text-xs text-left min-w-[550px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">{overallView === 'quarterly' ? 'QUARTER PERIOD' : 'MONTH PERIOD'}</th>
                        <th className="px-4 py-2.5 text-center">Active HC</th>
                        <th className="px-4 py-2.5 text-center text-rose-600 dark:text-rose-400">Losses</th>
                        <th className="px-4 py-2.5 text-center">Attrition Rate</th>
                        <th className="px-4 py-2.5 text-center">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentTrendData.map((row: any, idx: number) => {
                        const attrNum = row.attritionNum ?? parseFloat(row.attritionRate) ?? 0;
                        const isBadAttr = attrNum > 15;
                        const isAttentionAttr = attrNum > 10 && attrNum <= 15;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{row.period}</td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{row.activeHC || row.headcount}</td>
                            <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">{row.losses}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                isBadAttr 
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
                                  : isAttentionAttr 
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {typeof row.attritionRate === 'number' ? `${row.attritionRate.toFixed(1)}%` : row.attritionRate}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {row.attendanceRate}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right-Side Popup Drawer for Batch Trainees */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedBatch(null)}
          />

          {/* Slide-over Panel on the Right */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* 1. Header Banner (Solid Deep Blue) */}
              <div className="bg-[#2F6798] px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-xs">
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  BATCH DETAILS
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="rounded-lg p-1 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* 2. Title Section */}
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedBatch.batchName.toLowerCase().includes('summary') 
                      ? selectedBatch.batchName 
                      : `${selectedBatch.batchName} Summary`}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Account: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedBatch.accountName}</span>
                  </p>
                </div>

                {/* 3. KPI Cards Row (HEADCOUNT & ATTRITION) */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Headcount Card */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-[#2F6798] shrink-0" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                          HEADCOUNT
                        </span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                          {selectedBatch.headcount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attrition Card */}
                  <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="w-6 h-6 text-rose-500 shrink-0" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 dark:text-rose-400 block">
                          ATTRITION
                        </span>
                        <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-0.5">
                          {selectedBatch.attritionRate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. BATCH PARAMETER & DETAILS Table */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs bg-white dark:bg-slate-800">
                  <div className="bg-[#2F6798] px-4 py-2.5 flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Info className="w-4 h-4" />
                      <span>BATCH PARAMETER</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4" />
                      <span>DETAILS</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Account</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{selectedBatch.accountName}</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Training Type</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{selectedBatch.trainingType.toUpperCase()}</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Trainer</span>
                      <span className="font-bold text-[#2F6798] dark:text-blue-400">{selectedBatch.trainer || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                {/* 5. TRAINEE LIST Section */}
                <div className="space-y-3 pt-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#2F6798] dark:text-blue-400">
                    TRAINEE LIST
                  </h4>

                  <div className="space-y-2.5">
                    {(selectedBatch.members || []).map((m: any, mIdx: number) => {
                      const trainee = {
                        ...m,
                        accountName: selectedBatch.accountName,
                        batchName: selectedBatch.batchName,
                        trainingType: selectedBatch.trainingType
                      } as DrawerTrainee;

                      const nameStr = (m.name || 'Trainee').trim();
                      const parts = nameStr.split(/\s+/);
                      const initials = parts.length >= 2 
                        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                        : nameStr.slice(0, 2).toUpperCase();

                      return (
                        <div
                          key={mIdx}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedTrainee(trainee)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedTrainee(trainee);
                            }
                          }}
                          className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-[#2F6798] dark:hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-[#2F6798] dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#2F6798] dark:group-hover:text-blue-400 transition-colors truncate">
                              {m.name}
                            </h5>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <TraineeDetailDrawer trainee={selectedTrainee} onClose={() => setSelectedTrainee(null)} />
    </div>
  );
}
