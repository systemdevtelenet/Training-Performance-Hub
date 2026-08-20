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
    <section className="rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-5 shadow-sm sm:p-6 transition-all duration-300">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left Column */}
      {/* Left Column */}
      <div className="flex flex-col gap-5">
        <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-none ring-0 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <h3 className="mb-5 flex items-center gap-2.5 border-b border-slate-100/80 dark:border-slate-700/80 pb-3 text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            <LayoutDashboard className="h-5 w-5 text-primary" /> Executive Performance Overview
          </h3>

          <div className="grid grid-cols-3 gap-3 mb-5 text-center">
            <div className="group flex flex-col items-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <Text className="text-[0.65rem] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Headcount</Text>
              <div className="mt-2 mb-1 h-8 w-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UsersRound className="h-4 w-4 text-primary" />
              </div>
              <Metric className="text-2xl font-black text-slate-800 dark:text-slate-100">{data.summary.totalHeadcount}</Metric>
            </div>
            <div className="group flex flex-col items-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <Text className="text-[0.65rem] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Losses</Text>
              <div className="mt-2 mb-1 h-8 w-8 rounded-full bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
              <Metric className="text-2xl font-black text-destructive">{data.summary.totalLosses}</Metric>
            </div>
            <div className="group flex flex-col items-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <Text className="text-[0.65rem] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Global Attrition</Text>
              <div className="mt-2 mb-1 h-8 w-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Percent className="h-4 w-4 text-primary" />
              </div>
              <Metric className="text-2xl font-black text-primary">{data.summary.globalRate}</Metric>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-primary border-t border-r border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-2 block">INHOUSE</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Headcount</span><span className="font-bold">{data.summary.inhouse.count}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Ongoing</span><span className="font-bold">{data.summary.inhouse.ongoing}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Losses</span><span className="font-bold text-destructive">{data.summary.inhouse.losses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Attrition</span><span className="font-bold text-primary">{data.summary.inhouse.rate}</span></div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-primary border-t border-r border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-2 block">PST</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Headcount</span><span className="font-bold">{data.summary.pst.count}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Ongoing</span><span className="font-bold">{data.summary.pst.ongoing}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Losses</span><span className="font-bold text-destructive">{data.summary.pst.losses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Attrition</span><span className="font-bold text-primary">{data.summary.pst.rate}</span></div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-secondary border-t border-r border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-2 block">TRAINERS</span>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Active</span><span className="font-bold">{ts.headcount}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Losses</span><span className="font-bold text-destructive">{ts.totalLosses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Attrition</span><span className="font-bold">{ts.attritionRate}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Att.</span><span className="font-bold">{ts.attendanceRate}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 dark:text-slate-500 block">Rel.</span><span className="font-bold">{ts.reliabilityRate}</span></div>
              </div>
            </div>
          </div>
        </Card>

        {activeBatches.length > 0 && (
          <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-none ring-0">
            <h3 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight"><ListTree className="h-5 w-5 text-primary" />Active Accounts & Batches in Training</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold text-[0.65rem]">
                  <tr>
                    <th className="p-2.5">Account</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5">Trainee</th>
                    <th className="p-2.5 text-center">HC</th>
                    <th className="p-2.5 text-center">Ongoing</th>
                    <th className="p-2.5 text-center">Losses</th>
                    <th className="p-2.5 text-center">Attr %</th>
                    <th className="p-2.5 text-center">Att %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {activeBatches.flatMap((b) => b.members.map((m: any, mIdx: number) => {
                    const totalAttendance = (m.p || 0) + (m.a || 0);
                    const trainee = { ...m, accountName: b.accountName, batchName: b.batchName, trainingType: b.trainingType } as DrawerTrainee;
                    return (
                      <tr key={`${b.accountName}-${b.batchName}-${mIdx}`} role="button" tabIndex={0} onClick={() => setSelectedTrainee(trainee)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTrainee(trainee); } }} className="cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus-visible:bg-[#2F6798]/5">
                        <td className="p-2.5 font-bold">{b.accountName}</td>
                        <td className="p-2.5 font-bold text-primary">{b.batchName}</td>
                        <td className="p-2.5"><span className="font-bold text-slate-800 dark:text-slate-100 transition-colors group-hover:text-primary">{m.name}</span></td>
                        <td className="p-2.5 text-center">{b.headcount}</td>
                        <td className="p-2.5 text-center font-bold text-amber-700">{b.ongoing}</td>
                        <td className="p-2.5 text-center font-bold text-destructive">{b.losses}</td>
                        <td className="p-2.5 text-center">
                          <span className={parseFloat(b.attritionRate) > 10 ? 'inline-flex min-w-12 justify-center rounded-full bg-destructive/10 px-2 py-1 text-[0.65rem] font-bold text-destructive' : 'inline-flex min-w-12 justify-center rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-bold text-primary'}>{b.attritionRate}</span>
                        </td>
                        <td className="p-2.5 text-center font-bold">{totalAttendance ? `${((m.p / totalAttendance) * 100).toFixed(1)}%` : 'N/A'}</td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-5">
        <section className="rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-none">
          <h3 className="mb-3 flex items-center gap-2.5 text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight"><LineChart className="h-5 w-5 text-primary" />Performance Trajectory Charts</h3>
          <AnalyticsChart title="Quarterly Attrition Trajectory" data={trendData.overall.quarters} />
          <AnalyticsChart title="Monthly Attrition Trajectory" data={trendData.overall.months} />
        </section>

        <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-none ring-0">
          <h3 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight"><Table2 className="h-5 w-5 text-secondary" />Quarterly Analytics Breakdown</h3>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold text-[0.65rem]">
              <tr>
                <th className="p-2.5">Period Title</th>
                <th className="p-2.5">Active HC</th>
                <th className="p-2.5 text-destructive">Losses</th>
                <th className="p-2.5">Attrition Rate</th>
                <th className="p-2.5">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {trendData.overall.quarters.map((d: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-2.5 font-bold">{d.period}</td>
                  <td className="p-2.5">{d.headcount}</td>
                  <td className="p-2.5 font-bold text-destructive">{d.losses}</td>
                  <td className="p-2.5"><span className={d.attritionNum > 10 ? 'inline-flex min-w-12 justify-center rounded-full bg-destructive/10 px-2 py-1 text-[0.65rem] font-bold text-destructive' : 'inline-flex min-w-12 justify-center rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-bold text-primary'}>{d.attritionRate}</span></td>
                  <td className="p-2.5 font-medium">{d.attendanceRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      </div>
      <TraineeDetailDrawer trainee={selectedTrainee} onClose={() => setSelectedTrainee(null)} />
    </section>
  );
} 
