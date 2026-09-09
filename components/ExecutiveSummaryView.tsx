'use client';

import { useState } from 'react';
import { Card, Metric, Text } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { UsersRound, TrendingDown, Percent, LayoutDashboard, LineChart as LineChartIcon, ListTree, ChevronDown, ChevronUp } from 'lucide-react';
import { DrawerTrainee, TraineeDetailDrawer } from './TraineeDetailDrawer';

export function ExecutiveSummaryView({ data, rawData, filters }: { data: any; rawData: any; filters: any }) {
  const [selectedTrainee, setSelectedTrainee] = useState<DrawerTrainee | null>(null);
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

          activeBatches.push({
            accountName: displayAcc,
            batchName: bName,
            trainingType: type === 'inhouse' ? 'Inhouse Training' : 'PST Training',
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
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-100 uppercase tracking-wider">{label}</p>
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>Attrition Rate:</span>
            <span className="font-bold text-[#EAB308]">{dataPoint.attritionRate}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>Active Headcount:</span>
            <span className="font-bold text-slate-100">{dataPoint.activeHC || dataPoint.headcount}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>Losses:</span>
            <span className="font-bold text-rose-400">{dataPoint.losses}</span>
          </div>
          {dataPoint.attendanceRate && (
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Attendance Rate:</span>
              <span className="font-bold text-emerald-400">{dataPoint.attendanceRate}</span>
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

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Headcount</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-7 w-7 rounded-lg bg-[#2F6798]/10 dark:bg-[#2F6798]/20 flex items-center justify-center">
                    <UsersRound className="h-3.5 w-3.5 text-[#2F6798]" />
                  </div>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">{data.summary.totalHeadcount}</span>
                </div>
              </div>

              <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Losses</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400">{data.summary.totalLosses}</span>
                </div>
              </div>

              <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
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
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-1.5 block">TRAINERS CORPS</span>
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
              <h3 className="mb-3 flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                <ListTree className="h-4 w-4 text-[#2F6798]" /> Active Accounts & Batches in Training
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Account</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3">Trainee</th>
                      <th className="p-3 text-center">HC</th>
                      <th className="p-3 text-center">Ongoing</th>
                      <th className="p-3 text-center">Losses</th>
                      <th className="p-3 text-center">Attr %</th>
                      <th className="p-3 text-center">Att %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {activeBatches.flatMap((b) => b.members.map((m: any, mIdx: number) => {
                      const totalAttendance = (m.p || 0) + (m.a || 0);
                      const trainee = { ...m, accountName: b.accountName, batchName: b.batchName, trainingType: b.trainingType } as DrawerTrainee;
                      return (
                        <tr 
                          key={`${b.accountName}-${b.batchName}-${mIdx}`} 
                          role="button" 
                          tabIndex={0} 
                          onClick={() => setSelectedTrainee(trainee)} 
                          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTrainee(trainee); } }} 
                          className="cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700/40 focus:outline-none focus:bg-[#2F6798]/5"
                        >
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{b.accountName}</td>
                          <td className="p-3 font-bold text-[#2F6798] dark:text-blue-400">{b.batchName}</td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{m.name}</td>
                          <td className="p-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{b.headcount}</td>
                          <td className="p-3 text-center font-bold text-amber-600 dark:text-amber-400">{b.ongoing}</td>
                          <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400">{b.losses}</td>
                          <td className="p-3 text-center">
                            <span className={parseFloat(b.attritionRate) > 10 ? 'inline-flex justify-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 px-2.5 py-0.5 text-[10px] font-bold' : 'inline-flex justify-center rounded-full bg-[#2F6798]/10 text-[#2F6798] border border-[#2F6798]/20 dark:bg-[#2F6798]/20 dark:text-blue-300 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-bold'}>
                              {b.attritionRate}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">{totalAttendance ? `${((m.p / totalAttendance) * 100).toFixed(1)}%` : 'N/A'}</td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Overall Departmental Trends (Unified Card matching Analytics page) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
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
                <div className="inline-flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl shadow-inner border border-slate-200/60 dark:border-slate-700">
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

              {/* Overall Line Chart (Gold Line) */}
              <div className="h-[240px] w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={currentTrendData} 
                    margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} 
                      dy={6}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <RechartsTooltip content={<CustomTrajectoryTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                    <Line 
                      type="monotone" 
                      name={`Overall ${overallView === 'quarterly' ? 'Quarterly' : 'Monthly'}`} 
                      dataKey="attritionNum" 
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

            {/* Collapsible Data Table Breakdown matching Analytics Page */}
            <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowTableBreakdown(!showTableBreakdown)}
                className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                <span className="uppercase tracking-wider">
                  {showTableBreakdown ? 'Hide Data Table Breakdown' : 'Show Data Table Breakdown'}
                </span>
                {showTableBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showTableBreakdown && (
                <div className="px-5 pb-5 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">{overallView === 'quarterly' ? 'QUARTER PERIOD' : 'MONTH PERIOD'}</th>
                        <th className="px-4 py-2.5 text-center">Active HC</th>
                        <th className="px-4 py-2.5 text-center text-rose-600 dark:text-rose-400">Losses</th>
                        <th className="px-4 py-2.5 text-center">Attrition Rate</th>
                        <th className="px-4 py-2.5 text-center">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                      {currentTrendData.map((row: any, idx: number) => {
                        const attrNum = row.attritionNum ?? parseFloat(row.attritionRate) ?? 0;
                        const isBadAttr = attrNum > 15;
                        const isAttentionAttr = attrNum > 10 && attrNum <= 15;

                        return (
                          <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{row.period}</td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-semibold">{row.activeHC || row.headcount}</td>
                            <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">{row.losses}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${
                                isBadAttr 
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' 
                                  : isAttentionAttr 
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                                  : 'text-slate-800 dark:text-slate-200'
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
      <TraineeDetailDrawer trainee={selectedTrainee} onClose={() => setSelectedTrainee(null)} />
    </div>
  );
}
