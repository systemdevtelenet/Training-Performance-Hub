'use client';

import { useState } from 'react';
import { Card, Metric, Text, Badge } from '@tremor/react';
import { AnalyticsChart } from './AnalyticsChart';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function ExecutiveSummaryView({ data, rawData, filters }: { data: any; rawData: any; filters: any }) {
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="flex flex-col gap-5">
        <Card className="p-5 border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
            Executive Performance Overview
          </h3>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-slate-50 p-3 rounded-xl border-b-2 border-[#2F6798]">
              <Text className="text-[0.65rem] uppercase font-bold text-slate-500">Headcount</Text>
              <Metric className="text-xl font-bold text-slate-800">{data.summary.totalHeadcount}</Metric>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border-b-2 border-red-500">
              <Text className="text-[0.65rem] uppercase font-bold text-slate-500">Losses</Text>
              <Metric className="text-xl font-bold text-red-600">{data.summary.totalLosses}</Metric>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border-b-2 border-[#2F6798]">
              <Text className="text-[0.65rem] uppercase font-bold text-slate-500">Global Attrition</Text>
              <Metric className="text-xl font-bold text-[#2F6798]">{data.summary.globalRate}</Metric>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-[#2F6798] border-t border-r border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800 mb-2 block">INHOUSE</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Headcount</span><span className="font-bold">{data.summary.inhouse.count}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Ongoing</span><span className="font-bold">{data.summary.inhouse.ongoing}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Losses</span><span className="font-bold text-red-600">{data.summary.inhouse.losses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Attrition</span><span className="font-bold text-[#2F6798]">{data.summary.inhouse.rate}</span></div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-[#2F6798] border-t border-r border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800 mb-2 block">PST</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Headcount</span><span className="font-bold">{data.summary.pst.count}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Ongoing</span><span className="font-bold">{data.summary.pst.ongoing}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Losses</span><span className="font-bold text-red-600">{data.summary.pst.losses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Attrition</span><span className="font-bold text-[#2F6798]">{data.summary.pst.rate}</span></div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-amber-500 border-t border-r border-b border-slate-200">
              <span className="font-bold text-xs text-slate-800 mb-2 block">TRAINERS</span>
              <div className="grid grid-cols-5 gap-2 text-xs">
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Active</span><span className="font-bold">{ts.headcount}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Losses</span><span className="font-bold text-red-600">{ts.totalLosses}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Attrition</span><span className="font-bold">{ts.attritionRate}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Att.</span><span className="font-bold">{ts.attendanceRate}</span></div>
                <div><span className="text-[0.6rem] uppercase text-slate-400 block">Rel.</span><span className="font-bold">{ts.reliabilityRate}</span></div>
              </div>
            </div>
          </div>
        </Card>

        {activeBatches.length > 0 && (
          <Card className="p-5 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-3">Active Accounts & Batches in Training</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[0.65rem]">
                  <tr>
                    <th className="p-2.5">Account</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5 text-center">HC</th>
                    <th className="p-2.5 text-center">Ongoing</th>
                    <th className="p-2.5 text-center">Losses</th>
                    <th className="p-2.5 text-center">Attr %</th>
                    <th className="p-2.5 text-center">Att %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBatches.map((b, idx) => (
                    <>
                      <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedBatch(expandedBatch === idx ? null : idx)}>
                        <td className="p-2.5 font-bold flex items-center gap-1">
                          {expandedBatch === idx ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                          {b.accountName}
                        </td>
                        <td className="p-2.5 font-bold text-[#2F6798]">{b.batchName}</td>
                        <td className="p-2.5 text-center">{b.headcount}</td>
                        <td className="p-2.5 text-center font-bold text-amber-700">{b.ongoing}</td>
                        <td className="p-2.5 text-center font-bold text-red-600">{b.losses}</td>
                        <td className="p-2.5 text-center">
                          <Badge color={parseFloat(b.attritionRate) > 10 ? 'red' : 'blue'} size="xs">{b.attritionRate}</Badge>
                        </td>
                        <td className="p-2.5 text-center font-bold">{b.attendanceRate}</td>
                      </tr>
                      {expandedBatch === idx && (
                        <tr key={`expanded-${idx}`} className="bg-slate-50">
                          <td colSpan={7} className="p-3">
                            <div className="max-h-48 overflow-y-auto bg-white rounded border border-slate-200">
                              <table className="w-full text-[0.72rem]">
                                <thead className="bg-slate-100 font-bold text-slate-600">
                                  <tr>
                                    <th className="p-1.5 text-left">Trainee Name</th>
                                    <th className="p-1.5 text-left">Status</th>
                                    <th className="p-1.5 text-center">P</th>
                                    <th className="p-1.5 text-center">A</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {b.members.map((m: any, mIdx: number) => (
                                    <tr key={mIdx}>
                                      <td className="p-1.5 font-semibold">{m.name}</td>
                                      <td className="p-1.5">
                                        <span className="text-[0.65rem] px-2 py-0.5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          {m.status}
                                        </span>
                                      </td>
                                      <td className="p-1.5 text-center">{m.p}</td>
                                      <td className="p-1.5 text-center font-bold text-red-600">{m.a}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-5">
        <Card className="p-5 border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 mb-2">Performance Trajectory Charts</h3>
          <AnalyticsChart title="Quarterly Attrition Trajectory" data={trendData.overall.quarters} />
          <AnalyticsChart title="Monthly Attrition Trajectory" data={trendData.overall.months} />
        </Card>

        <Card className="p-5 border border-slate-200">
          <h3 className="text-base font-bold text-slate-800 mb-3">Quarterly Analytics Breakdown</h3>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[0.65rem]">
              <tr>
                <th className="p-2.5">Period Title</th>
                <th className="p-2.5">Active HC</th>
                <th className="p-2.5 text-red-600">Losses</th>
                <th className="p-2.5">Attrition Rate</th>
                <th className="p-2.5">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trendData.overall.quarters.map((d: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-2.5 font-bold">{d.period}</td>
                  <td className="p-2.5">{d.headcount}</td>
                  <td className="p-2.5 text-red-600 font-bold">{d.losses}</td>
                  <td className="p-2.5"><Badge color={d.attritionNum > 10 ? 'red' : 'blue'}>{d.attritionRate}</Badge></td>
                  <td className="p-2.5 font-medium">{d.attendanceRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
} 