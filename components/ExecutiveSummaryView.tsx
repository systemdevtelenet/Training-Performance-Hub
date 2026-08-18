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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left Column */}
      <div className="flex flex-col gap-5">
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none ring-0">
          <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 text-base font-bold text-slate-800">
            <LayoutDashboard className="h-4 w-4 text-slate-400" /> Executive Performance Overview
          </h3>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border-b-2 border-[#2F6798]">
              <Text className="text-[0.65rem] uppercase font-bold text-slate-500">Headcount</Text>
              <UsersRound className="mt-1 h-3.5 w-3.5 text-slate-400" />
              <Metric className="text-xl font-bold text-slate-800">{data.summary.totalHeadcount}</Metric>
            </div>
            <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border-b-2 border-[#ED1C25]">
              <Text className="text-[0.65rem] uppercase font-bold text-slate-500">Losses</Text>
              <TrendingDown className="mt-1 h-3.5 w-3.5 text-slate-400" />
              <Metric className="text-xl font-bold text-[#ED1C25]">{data.summary.totalLosses}</Metric>
            </div>
            <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border-b-2 border-[#2F6798]">
              <Text className="text-[0.65rem] uppercase font-bold text-slate-500">Global Attrition</Text>
              <Percent className="mt-1 h-3.5 w-3.5 text-slate-400" />
              <Metric className="text-xl font-bold text-[#2F6798]">{data.summary.globalRate}</Metric>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-[#2F6798] border-t border-r border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800 mb-2 block">INHOUSE</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Headcount</span><span className="font-bold">{data.summary.inhouse.count}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Ongoing</span><span className="font-bold">{data.summary.inhouse.ongoing}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Losses</span><span className="font-bold text-[#ED1C25]">{data.summary.inhouse.losses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Attrition</span><span className="font-bold text-[#2F6798]">{data.summary.inhouse.rate}</span></div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-[#2F6798] border-t border-r border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800 mb-2 block">PST</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Headcount</span><span className="font-bold">{data.summary.pst.count}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Ongoing</span><span className="font-bold">{data.summary.pst.ongoing}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Losses</span><span className="font-bold text-[#ED1C25]">{data.summary.pst.losses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Attrition</span><span className="font-bold text-[#2F6798]">{data.summary.pst.rate}</span></div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-amber-500 border-t border-r border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800 mb-2 block">TRAINERS</span>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Active</span><span className="font-bold">{ts.headcount}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Losses</span><span className="font-bold text-[#ED1C25]">{ts.totalLosses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Attrition</span><span className="font-bold">{ts.attritionRate}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Att.</span><span className="font-bold">{ts.attendanceRate}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Rel.</span><span className="font-bold">{ts.reliabilityRate}</span></div>
              </div>
            </div>
          </div>
        </Card>

        {activeBatches.length > 0 && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none ring-0">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800"><ListTree className="h-4 w-4 text-slate-400" />Active Accounts & Batches in Training</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[0.65rem]">
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
                <tbody className="divide-y divide-slate-100">
                  {activeBatches.flatMap((b) => b.members.map((m: any, mIdx: number) => {
                    const totalAttendance = (m.p || 0) + (m.a || 0);
                    const trainee = { ...m, accountName: b.accountName, batchName: b.batchName, trainingType: b.trainingType } as DrawerTrainee;
                    return (
                      <tr key={`${b.accountName}-${b.batchName}-${mIdx}`} role="button" tabIndex={0} onClick={() => setSelectedTrainee(trainee)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTrainee(trainee); } }} className="cursor-pointer transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:bg-[#2F6798]/5">
                        <td className="p-2.5 font-bold">{b.accountName}</td>
                        <td className="p-2.5 font-bold text-[#2F6798]">{b.batchName}</td>
                        <td className="p-2.5"><span className="font-bold text-slate-800 transition-colors group-hover:text-[#2F6798]">{m.name}</span></td>
                        <td className="p-2.5 text-center">{b.headcount}</td>
                        <td className="p-2.5 text-center font-bold text-amber-700">{b.ongoing}</td>
                        <td className="p-2.5 text-center font-bold text-[#ED1C25]">{b.losses}</td>
                        <td className="p-2.5 text-center">
                          <span className={parseFloat(b.attritionRate) > 10 ? 'inline-flex min-w-12 justify-center rounded-full bg-[#ED1C25]/10 px-2 py-1 text-[0.65rem] font-bold text-[#ED1C25]' : 'inline-flex min-w-12 justify-center rounded-full bg-[#2F6798]/10 px-2 py-1 text-[0.65rem] font-bold text-[#2F6798]'}>{b.attritionRate}</span>
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
          <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800"><LineChart className="h-4 w-4 text-slate-400" />Performance Trajectory Charts</h3>
          <AnalyticsChart title="Quarterly Attrition Trajectory" data={trendData.overall.quarters} />
          <AnalyticsChart title="Monthly Attrition Trajectory" data={trendData.overall.months} />
        </section>

        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-none ring-0">
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800"><Table2 className="h-4 w-4 text-slate-400" />Quarterly Analytics Breakdown</h3>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[0.65rem]">
              <tr>
                <th className="p-2.5">Period Title</th>
                <th className="p-2.5">Active HC</th>
                <th className="p-2.5 text-[#ED1C25]">Losses</th>
                <th className="p-2.5">Attrition Rate</th>
                <th className="p-2.5">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trendData.overall.quarters.map((d: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-2.5 font-bold">{d.period}</td>
                  <td className="p-2.5">{d.headcount}</td>
                  <td className="p-2.5 font-bold text-[#ED1C25]">{d.losses}</td>
                  <td className="p-2.5"><span className={d.attritionNum > 10 ? 'inline-flex min-w-12 justify-center rounded-full bg-[#ED1C25]/10 px-2 py-1 text-[0.65rem] font-bold text-[#ED1C25]' : 'inline-flex min-w-12 justify-center rounded-full bg-[#2F6798]/10 px-2 py-1 text-[0.65rem] font-bold text-[#2F6798]'}>{d.attritionRate}</span></td>
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
