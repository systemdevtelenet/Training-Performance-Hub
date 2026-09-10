'use client';

import { useState } from 'react';
import { Card, Badge } from '@tremor/react';
import { Camera, Calendar, Award, ClipboardList } from 'lucide-react';
import { isTrainerMatch } from '@/lib/analytics-utils';
import { useRole } from '@/components/providers/RoleProvider';

export function TrainersDirectoryView({ rawData, filters }: { rawData: any; filters: any }) {
  const { avatarUrl, userName, email } = useRole();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const trainers = rawData.trainers || [];
  const filteredTrainers = trainers.filter((t: any) => {
    const matchesSearch = !filters.search || 
      t.name.toLowerCase().includes(filters.search.toLowerCase()) || 
      (t.pos && t.pos.toLowerCase().includes(filters.search.toLowerCase()));
    const matchesAcc = filters.account === 'ALL' || (t.accounts && t.accounts.includes(filters.account));
    return matchesSearch && matchesAcc;
  });

  const trainer = filteredTrainers[selectedIndex] || filteredTrainers[0];

  if (!trainer) {
    return <Card className="p-8 text-center text-slate-500">No trainers found matching the search criteria.</Card>;
  }

  const isCurrentMatch = trainer && ((trainer.name && userName && trainer.name.toLowerCase().includes(userName.toLowerCase())) ||
    (trainer.email && email && trainer.email.toLowerCase() === email.toLowerCase()) ||
    (trainer.name && trainer.name.toLowerCase().includes('nissi')));
  const effectivePhoto = trainer.profilePic || (isCurrentMatch ? avatarUrl : null);

  const tagCounts: Record<string, number> = { ABSENCE: 0, SL: 0, VL: 0, BL: 0, MED: 0, SUS: 0, HOL: 0, ML: 0, PL: 0 };
  const tagDates: Record<string, string[]> = { ABSENCE: [], SL: [], VL: [], BL: [], MED: [], SUS: [], HOL: [], ML: [], PL: [] };

  const reliabilityGroups = rawData.trainerReliability?.groups || {};
  for (const gName in reliabilityGroups) {
    if (isTrainerMatch(gName, trainer.name)) {
      reliabilityGroups[gName].members.forEach((m: any) => {
        const mMatch = filters.month === 'ALL' || m.month === filters.month;
        const qMatch = filters.quarter === 'ALL' || m.quarter === filters.quarter;
        
        if (mMatch && qMatch) {
          const tag = String(m.tag || '').toUpperCase().trim();
          const dateStr = m.date || 'Unknown Date';

          if (tag === 'A' || tag === 'ABSENT') { tagCounts.ABSENCE++; tagDates.ABSENCE.push(dateStr); }
          else if (tagCounts[tag] !== undefined) { tagCounts[tag]++; tagDates[tag].push(dateStr); }
        }
      });
    }
  }

  const handledBatches: any[] = [];
  ['inhouse', 'pst'].forEach(deptType => {
    const groups = rawData[deptType]?.groups || {};
    for (const accName in groups) {
      for (const bName in groups[accName]) {
        const group = groups[accName][bName];
        if (!group.members) continue;

        const assignedMembers = group.members.filter((m: any) => isTrainerMatch(m.assignedTrainer, trainer.name));

        if (assignedMembers.length > 0) {
          const hc = assignedMembers.length;
          const losses = assignedMembers.filter((m: any) => m.isLoss).length;
          const attrNum = hc > 0 ? (losses / hc) * 100 : 0;
          const successNum = 100 - attrNum;

          handledBatches.push({
            department: deptType.toUpperCase(),
            account: accName,
            batch: bName,
            headcount: hc,
            losses,
            attritionRate: attrNum.toFixed(1) + '%',
            successRate: successNum.toFixed(1) + '%',
            successNum,
            members: assignedMembers
          });
        }
      }
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
      <Card className="p-3 max-h-[720px] overflow-y-auto space-y-2">
        {filteredTrainers.map((t: any, idx: number) => (
          <div
            key={idx}
            onClick={() => { setSelectedIndex(idx); setActiveTag(null); }}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
              selectedIndex === idx ? 'bg-blue-50/80 border-[#2F6798] shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{t.name}</p>
              <p className="text-[0.7rem] font-semibold uppercase text-slate-400">{t.pos || 'Trainer'}</p>
            </div>
            <Badge size="xs" color="emerald">{t.status || 'ACTIVE'}</Badge>
          </div>
        ))}
      </Card>

      <Card className="p-6 border border-slate-200">
        <div className="flex items-center gap-5 border-b border-slate-100 pb-5 mb-5">
          <div className="relative group cursor-pointer w-20 h-20 rounded-full bg-[#2F6798] text-white text-3xl font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-md ring-2 ring-[#2F6798]/20">
            {effectivePhoto ? (
              <img src={effectivePhoto} alt={trainer.name} className="w-full h-full object-cover" />
            ) : (
              <span>{trainer.name.charAt(0).toUpperCase()}</span>
            )}
            <div className="absolute inset-0 bg-slate-900/60 text-white flex flex-col items-center justify-center text-[0.65rem] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 mb-0.5" />
              <span>Upload</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">{trainer.name}</h2>
              <Badge color="emerald">{trainer.status || 'ACTIVE'}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{trainer.pos || 'Trainer'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase block mb-1">Employee ID</span>
            <span className="text-sm font-semibold text-slate-800">{trainer.employeeNo || 'N/A'}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase block mb-1">Start Date</span>
            <span className="text-sm font-semibold text-slate-800">{trainer.startDate || 'N/A'}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase block mb-1">Assigned Accounts</span>
            <span className="text-sm font-semibold text-slate-800">{trainer.accounts || 'Unassigned'}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase block mb-1">Attendance / Reliability</span>
            <span className="text-sm font-bold text-[#2F6798]">{trainer.attRate || 'N/A'} / {trainer.relRate || 'N/A'}</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 mb-6">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
            <ClipboardList className="w-4 h-4" /> Attendance & Leave Breakdown
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {Object.keys(tagCounts).map(tagKey => {
              const count = tagCounts[tagKey];
              return (
                <div
                  key={tagKey}
                  onClick={() => setActiveTag(activeTag === tagKey ? null : tagKey)}
                  className={`p-2 text-center rounded-lg border cursor-pointer transition-all ${
                    count > 0 ? 'bg-red-50/60 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                  } ${activeTag === tagKey ? 'ring-2 ring-[#2F6798]' : ''}`}
                >
                  <span className="text-[0.6rem] font-bold uppercase block mb-0.5">{tagKey}</span>
                  <span className="text-base font-bold">{count}</span>
                </div>
              );
            })}
          </div>

          {activeTag && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-800">{activeTag} Recorded Dates ({tagDates[activeTag]?.length || 0})</span>
                <button onClick={() => setActiveTag(null)} className="text-slate-400 font-bold hover:text-slate-600">&times;</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tagDates[activeTag]?.length ? (
                  tagDates[activeTag].map((d, dIdx) => (
                    <span key={dIdx} className="bg-white border border-slate-200 text-slate-700 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> {d}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No recorded dates found.</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
            <Award className="w-4 h-4" /> Handled Batches & Success Rates ({handledBatches.length})
          </h4>
          <div className="overflow-x-auto custom-horizontal-scrollbar touch-pan-x rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left min-w-[550px]">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[0.65rem]">
                <tr>
                  <th className="p-2">Dept</th>
                  <th className="p-2">Account</th>
                  <th className="p-2">Batch</th>
                  <th className="p-2 text-center">Trainees</th>
                  <th className="p-2 text-center">Losses</th>
                  <th className="p-2 text-center">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handledBatches.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-bold">{b.department}</td>
                    <td className="p-2 font-semibold">{b.account}</td>
                    <td className="p-2 text-[#2F6798] font-bold">{b.batch}</td>
                    <td className="p-2 text-center">{b.headcount}</td>
                    <td className="p-2 text-center font-bold text-red-600">{b.losses}</td>
                    <td className="p-2 text-center">
                      <Badge color={b.successNum >= 90 ? 'emerald' : 'red'}>{b.successRate}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}