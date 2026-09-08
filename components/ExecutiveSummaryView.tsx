'use client';

import { useState } from 'react';
import { Card, Metric, Text } from '@tremor/react';
import { AnalyticsChart } from './AnalyticsChart';
import { UsersRound, TrendingDown, Percent, LayoutDashboard, LineChart, ListTree, Table2 } from 'lucide-react';
import { DrawerTrainee, TraineeDetailDrawer } from './TraineeDetailDrawer';

export function ExecutiveSummaryView({ data, rawData, filters }: { data: any; rawData: any; filters: any }) {
  const [selectedTrainee, setSelectedTrainee] = useState<DrawerTrainee | null>(null);

  if (!data?.summary) return null;

  const ts = data.summary.trainersSummary || { headcount: 0, attendanceRate: '100.0%', reliabilityRate: '100.0%', attritionRate: '0.0%', totalLosses: 0 };
  const trendData = data.trendData;

  const activeBatches: any[] = [];
  ['inhouse', 'pst'].forEach(type => {
    if (!data[type]?.groups) return;
    for (const accName in data[type].groups) {
      const displayAcc = accName && accName.trim() !== "" ? accName.trim() : "General/Unassigned";
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

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
            <h3 className="mb-3 flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              <LineChart className="h-4 w-4 text-[#2F6798]" /> Performance Trajectory Charts
            </h3>
            <AnalyticsChart title="Quarterly Attrition Trajectory" data={trendData.overall.quarters} />
            <AnalyticsChart title="Monthly Attrition Trajectory" data={trendData.overall.months} />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
            <h3 className="mb-3 flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              <Table2 className="h-4 w-4 text-[#2F6798]" /> Quarterly Analytics Breakdown
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Period Title</th>
                    <th className="p-3">Active HC</th>
                    <th className="p-3 text-rose-600 dark:text-rose-400">Losses</th>
                    <th className="p-3">Attrition Rate</th>
                    <th className="p-3">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {trendData.overall.quarters.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{d.period}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">{d.headcount}</td>
                      <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{d.losses}</td>
                      <td className="p-3">
                        <span className={d.attritionNum > 10 ? 'inline-flex justify-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 px-2.5 py-0.5 text-[10px] font-bold' : 'inline-flex justify-center rounded-full bg-[#2F6798]/10 text-[#2F6798] border border-[#2F6798]/20 dark:bg-[#2F6798]/20 dark:text-blue-300 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-bold'}>
                          {d.attritionRate}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{d.attendanceRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <TraineeDetailDrawer trainee={selectedTrainee} onClose={() => setSelectedTrainee(null)} />
    </div>
  );
} 
