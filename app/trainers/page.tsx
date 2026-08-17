'use client';

import { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  RefreshCw, 
  Download, 
  Users, 
  CalendarCheck, 
  ShieldCheck 
} from 'lucide-react';

type TrainerTab = 'directory' | 'attendance' | 'reliability';

export default function TrainersPage() {
  const [activeTab, setActiveTab] = useState<TrainerTab>('directory');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trainers Management</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Real-time directory, automated attendance tracking, and reliability analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50/80 hover:border-slate-300 transition-all">
            <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" /> Refresh
          </button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50/80 hover:border-slate-300 transition-all">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-200/60 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Systems
          </span>
        </div>
      </div>

      {/* Pill Segmented Controls (Sub-Tabs) */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/60 max-w-md shadow-inner">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === 'directory'
              ? 'bg-[#2F6798] text-white shadow-xs ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Directory
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === 'attendance'
              ? 'bg-[#2F6798] text-white shadow-xs ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          Attendance
        </button>

        <button
          onClick={() => setActiveTab('reliability')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeTab === 'reliability'
              ? 'bg-[#2F6798] text-white shadow-xs ring-1 ring-black/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Reliability
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quarter</label>
          <div className="relative">
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
              <option>All Quarters</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Month</label>
          <div className="relative">
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
              <option>All Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Account</label>
          <div className="relative">
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
              <option>All Client Accounts</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Trainer or Batch..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Tab Content Views */}
      <div className="pt-2">
        {activeTab === 'directory' && <DirectoryView />}
        {activeTab === 'attendance' && <AttendanceView />}
        {activeTab === 'reliability' && <ReliabilityView />}
      </div>
    </div>
  );
}

{/* Master-Detail Directory Component */}
function DirectoryView() {
  const [selectedTrainer, setSelectedTrainer] = useState(0);

  const trainersList = [
    {
      id: '1597',
      name: 'Nissi-Jeh Reguero',
      role: 'HEAD OF TRAINING',
      status: 'ACTIVE',
      startDate: '1/3/2024',
      accounts: 'CORP',
      tasks: 'Supervision',
      attendanceRate: '100.0%',
      reliabilityRate: '89.7%',
      leaves: { absence: 0, sl: 4, vl: 3, bl: 0, med: 0, sus: 0, hol: 10, ml: 0, pl: 0 },
      overallSuccess: '66.7%',
      batches: [
        { dept: 'PST', account: 'FLEET', batch: '3', trainees: 1, losses: 1, attrition: '100.0%', success: '0.0%' },
        { dept: 'PST', account: 'FLEET', batch: '4', trainees: 1, losses: 0, attrition: '0.0%', success: '100.0%' },
        { dept: 'PST', account: 'FLEET', batch: '5', trainees: 1, losses: 0, attrition: '0.0%', success: '100.0%' },
      ],
    },
    {
      id: '1602',
      name: 'Jeremy Rigodon',
      role: 'TRAINING COORDINATOR',
      status: 'ACTIVE',
      startDate: '2/15/2024',
      accounts: 'CORP',
      tasks: 'Coordination',
      attendanceRate: '98.5%',
      reliabilityRate: '92.1%',
      leaves: { absence: 1, sl: 2, vl: 1, bl: 0, med: 0, sus: 0, hol: 10, ml: 0, pl: 0 },
      overallSuccess: '100.0%',
      batches: [
        { dept: 'PST', account: 'COVA', batch: '1', trainees: 2, losses: 0, attrition: '0.0%', success: '100.0%' },
      ],
    },
    { id: '1501', name: 'John Loi Gara', role: 'CORP-TR', status: 'RESIGNED' },
    { id: '1588', name: 'Bianca Kaye Ernestine Col...', role: 'CORP-TR', status: 'ACTIVE' },
    { id: '1422', name: 'Rohla Mie Baswa', role: 'CORP-TR', status: 'RESIGNED' },
    { id: '1611', name: 'Michelle Yncierto', role: 'CORP-TR', status: 'ACTIVE' },
    { id: '1612', name: 'Rommel Mendoza', role: 'CORP-TR', status: 'ACTIVE' },
    { id: '1615', name: 'Ronelyn Baguio', role: 'CORP-TR', status: 'ACTIVE' },
    { id: '1590', name: 'John Dhico Magalzo', role: 'CORP-TR', status: 'AWOL' },
    { id: '1601', name: 'Abdellah Nohreen Disomi...', role: 'PST - RM', status: 'LATERAL' },
    { id: '1605', name: 'Krisland Pepito', role: 'PST - RM', status: 'ACTIVE' },
  ];

  const active = trainersList[selectedTrainer] || trainersList[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'RESIGNED':
        return 'bg-rose-50 text-rose-500 border-rose-200';
      case 'AWOL':
      case 'LATERAL':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-800 tracking-wider">
        Trainers Directory ({trainersList.length})
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left List Pane */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2 max-h-[680px] overflow-y-auto space-y-1.5">
          {trainersList.map((trainer, index) => {
            const isSelected = selectedTrainer === index;
            return (
              <div
                key={trainer.id}
                onClick={() => setSelectedTrainer(index)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50/50 border-[#2F6798] shadow-xs'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <h3 className={`text-xs font-bold ${isSelected ? 'text-[#2F6798]' : 'text-slate-800'}`}>
                    {trainer.name}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                    {trainer.role}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(trainer.status)}`}>
                  {trainer.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2F6798] text-white flex items-center justify-center font-bold text-xl shadow-xs">
              {active.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{active.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(active.status)}`}>
                  {active.status}
                </span>
              </div>
              <span className="inline-block mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {active.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Employee ID</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{active.id}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{active.startDate || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Accounts</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{active.accounts || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Tasks</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{active.tasks || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
              <p className="text-xs font-bold text-[#2F6798] mt-0.5">{active.attendanceRate || '0.0%'}</p>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reliability Rate</span>
              <p className="text-xs font-bold text-[#2F6798] mt-0.5">{active.reliabilityRate || '0.0%'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>📋</span> Attendance & Leave Breakdown
              <span className="text-[10px] font-normal text-slate-400">(Recorded dates)</span>
            </h3>

            <div className="grid grid-cols-9 gap-2 text-center">
              {[
                { label: 'ABSENCE', val: active.leaves?.absence ?? 0, highlight: false },
                { label: 'SL', val: active.leaves?.sl ?? 0, highlight: true },
                { label: 'VL', val: active.leaves?.vl ?? 0, highlight: true },
                { label: 'BL', val: active.leaves?.bl ?? 0, highlight: false },
                { label: 'MED', val: active.leaves?.med ?? 0, highlight: false },
                { label: 'SUS', val: active.leaves?.sus ?? 0, highlight: false },
                { label: 'HOL', val: active.leaves?.hol ?? 0, highlight: true },
                { label: 'ML', val: active.leaves?.ml ?? 0, highlight: false },
                { label: 'PL', val: active.leaves?.pl ?? 0, highlight: false },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl border ${
                    item.highlight
                      ? 'bg-rose-50/50 border-rose-200 text-rose-600'
                      : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-[8px] font-bold block uppercase">{item.label}</span>
                  <span className="text-xs font-black block mt-0.5">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🎓</span> Handled Batches & Success Rates ({active.batches?.length || 0})
              </h3>
              {active.overallSuccess && (
                <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-[#2F6798] border border-blue-200/60 rounded-full">
                  Overall Batch Success: {active.overallSuccess}
                </span>
              )}
            </div>

            {active.batches && active.batches.length > 0 ? (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-2.5">DEPT</th>
                      <th className="p-2.5">ACCOUNT</th>
                      <th className="p-2.5">BATCH</th>
                      <th className="p-2.5 text-center">TRAINEES</th>
                      <th className="p-2.5 text-center">LOSSES</th>
                      <th className="p-2.5 text-center">ATTRITION RATE</th>
                      <th className="p-2.5 text-center">SUCCESS RATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {active.batches.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold">{row.dept}</td>
                        <td className="p-2.5">{row.account}</td>
                        <td className="p-2.5">{row.batch}</td>
                        <td className="p-2.5 text-center font-bold">{row.trainees}</td>
                        <td className="p-2.5 text-center font-bold text-rose-500">{row.losses}</td>
                        <td className="p-2.5 text-center">{row.attrition}</td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.success === '100.0%'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-rose-50 text-rose-500 border border-rose-200'
                            }`}
                          >
                            {row.success}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">No active batches assigned for this trainer.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

{/* Attendance View Component */}
function AttendanceView() {
  const attendanceData = [
    { name: 'Nina Joy Briones', present: 89, absent: 1, suspension: 0, rate: '98.9%' },
    { name: 'Michelle Yncierto', present: 137, absent: 11, suspension: 0, rate: '92.6%' },
    { name: 'Rohla Mie Baswa', present: 39, absent: 19, suspension: 0, rate: '67.2%' },
    { name: 'Vincent Luis Celdran', present: 148, absent: 0, suspension: 0, rate: '100.0%' },
    { name: 'Maegan Marie Cabardo', present: 50, absent: 1, suspension: 0, rate: '98.0%' },
    { name: 'Ronelyn Baguio', present: 134, absent: 9, suspension: 0, rate: '93.7%' },
    { name: 'Joven Aniñon', present: 83, absent: 10, suspension: 0, rate: '89.2%' },
    { name: 'Francisjell Yongco', present: 63, absent: 0, suspension: 0, rate: '100.0%' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-800 tracking-wide">
        Trainer Attendance (SUS counted as a loss) Breakdown
      </h2>

      <div className="space-y-2.5">
        {attendanceData.map((item, index) => {
          const rateNum = parseFloat(item.rate);
          let rateColorClass = 'text-[#2F6798]';
          
          if (rateNum < 80) {
            rateColorClass = 'text-rose-500 font-black';
          } else if (rateNum === 100) {
            rateColorClass = 'text-emerald-600 font-black';
          }

          return (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                {item.name}
              </h3>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 self-end sm:self-auto">
                <span>
                  Present: <strong className="text-slate-800 font-bold">{item.present}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Absent: <strong className={item.absent > 0 ? 'text-rose-500 font-bold' : 'text-slate-800 font-bold'}>{item.absent}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Suspension: <strong className="text-slate-800 font-bold">{item.suspension}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Rate: <strong className={rateColorClass}>{item.rate}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

{/* Reliability View Component */}
function ReliabilityView() {
  const reliabilityData = [
    { name: 'Nina Joy Briones', present: 89, absent: 1, losses: 4, rate: '94.7%' },
    { name: 'Michelle Yncierto', present: 137, absent: 11, losses: 13, rate: '85.1%' },
    { name: 'Rohla Mie Baswa', present: 39, absent: 19, losses: 66, rate: '31.5%' },
    { name: 'Vincent Luis Celdran', present: 148, absent: 0, losses: 14, rate: '91.4%' },
    { name: 'Maegan Marie Cabardo', present: 50, absent: 1, losses: 4, rate: '90.9%' },
    { name: 'Ronelyn Baguio', present: 134, absent: 9, losses: 21, rate: '81.7%' },
    { name: 'Joven Aniñon', present: 83, absent: 10, losses: 11, rate: '79.8%' },
    { name: 'Francisjell Yongco', present: 63, absent: 0, losses: 1, rate: '98.4%' },
    { name: 'Jeremy Rigodon', present: 144, absent: 3, losses: 15, rate: '88.9%' },
    { name: 'Nissi-Jeh Reguero', present: 148, absent: 0, losses: 17, rate: '89.7%' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-800 tracking-wide">
        Trainer Reliability (SL, VL, ML, PL, HOL, SUS, MED, BL counted as losses) Breakdown
      </h2>

      <div className="space-y-2.5">
        {reliabilityData.map((item, index) => {
          const rateNum = parseFloat(item.rate);
          let rateColorClass = 'text-[#2F6798]';

          if (rateNum < 80) {
            rateColorClass = 'text-rose-500 font-black';
          } else if (rateNum >= 95) {
            rateColorClass = 'text-emerald-600 font-black';
          }

          return (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                {item.name}
              </h3>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 self-end sm:self-auto">
                <span>
                  Present: <strong className="text-slate-800 font-bold">{item.present}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Absent: <strong className={item.absent > 0 ? 'text-rose-500 font-bold' : 'text-slate-800 font-bold'}>{item.absent}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Losses (SL/VL/etc): <strong className={item.losses > 0 ? 'text-rose-500 font-bold' : 'text-slate-800 font-bold'}>{item.losses}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Rate: <strong className={rateColorClass}>{item.rate}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}