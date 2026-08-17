'use client';

import { Search, ChevronDown, RefreshCw, Download, Printer } from 'lucide-react';

const inhouseBatches = [
  { name: 'General -1', hc: 15, attr: '20.0%' },
  { name: 'General -2', hc: 1, attr: '0.0%' },
  { name: 'General -3', hc: 5, attr: '0.0%' },
  { name: 'General -4', hc: 11, attr: '9.1%' },
  { name: 'General -5', hc: 2, attr: '0.0%' },
  { name: 'General -6', hc: 5, attr: '0.0%' },
  { name: 'General -10', hc: 1, attr: '100.0%' },
  { name: 'General -12', hc: 1, attr: '0.0%' },
  { name: 'General -14', hc: 1, attr: '0.0%' },
  { name: 'General -15', hc: 2, attr: '0.0%' },
  { name: 'General -16', hc: 1, attr: '0.0%' },
];

const pstBatches = [
  { name: 'HAMMERHEAD -1', trainer: 'TR NINA', hc: 10, attr: '30.0%' },
  { name: 'HAMMERHEAD -2', trainer: 'TR NINA', hc: 6, attr: '16.7%' },
  { name: 'CTS -1', trainer: 'TR MAEGAN', hc: 3, attr: '0.0%' },
  { name: 'COVA -1', trainer: 'Mitch', hc: 2, attr: '0.0%' },
  { name: 'COVA -2', trainer: 'Mitch', hc: 1, attr: '0.0%' },
  { name: 'COVA -3', trainer: 'Mitch', hc: 1, attr: '0.0%' },
  { name: 'XPN-CXL -79', trainer: 'TR JOVEN', hc: 1, attr: '0.0%' },
  { name: 'XPN - NEGO -70', trainer: 'TR VINCENT', hc: 3, attr: '0.0%' },
  { name: 'FLEXAR - T1 -1', trainer: 'TR BIANCA', hc: 10, attr: '20.0%' },
  { name: 'FLEXAR - T1 -2', trainer: 'TR BIANCA', hc: 2, attr: '0.0%' },
  { name: 'FLEXAR - T1 -3', trainer: 'TR BIANCA', hc: 2, attr: '50.0%' },
];

const clientAccounts = [
  { name: 'COVA', hc: 4, attr: '0.0%' },
  { name: 'CTS', hc: 3, attr: '0.0%' },
  { name: 'DEFERIT', hc: 20, attr: '20.0%' },
  { name: 'FLEET', hc: 9, attr: '33.3%' },
  { name: 'FLEXAR - T1', hc: 18, attr: '16.7%' },
  { name: 'FLEXAR - T2', hc: 13, attr: '15.4%' },
  { name: 'General', hc: 77, attr: '6.5%' },
  { name: 'HAMMERHEAD', hc: 16, attr: '25.0%' },
  { name: 'ONO', hc: 2, attr: '50.0%' },
  { name: 'RM-CXL', hc: 3, attr: '33.3%' },
  { name: 'RM-NEGO', hc: 4, attr: '25.0%' },
];

export default function TraineesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" /> Refresh Data
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export Summary
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <Printer className="w-3.5 h-3.5 text-[#2F6798]" /> Print / PDF
          </button>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-200">
            Live Systems
          </span>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quarter Filter</label>
          <div className="relative">
            <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]">
              <option>All Quarters</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Month Filter</label>
          <div className="relative">
            <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]">
              <option>All Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Client Account</label>
          <div className="relative">
            <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]">
              <option>All Client Accounts</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search Trainee / Batch / Trainer</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Type name or batch..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            />
          </div>
        </div>
      </div>

      {/* 3-Column Department Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Inhouse Training */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> INHOUSE TRAINING
            </h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">DEPT 1</span>
          </div>
          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {inhouseBatches.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all">
                <span className="text-xs font-bold text-[#2F6798]">{item.name}</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: PST Training */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> PST TRAINING
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">DEPT 2</span>
          </div>
          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {pstBatches.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{item.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {item.trainer}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Client Accounts Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span> CLIENT ACCOUNTS
            </h3>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">SUMMARY</span>
          </div>
          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {clientAccounts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all">
                <span className="text-xs font-bold text-slate-800">{item.name}</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}