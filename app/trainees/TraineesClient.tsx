'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, RefreshCw, Download, Printer } from 'lucide-react';
import { DrawerTrainee, TraineeDetailDrawer } from '@/components/TraineeDetailDrawer';

export type Trainee = {
  id: string;
  name: string;
  status: string;
  month: string;
  quarter: string;
  p: number;
  a: number;
  isEndorsed: boolean;
  isLoss: boolean;
  assignedTrainer: string;
  batchName: string;
  accountName: string;
  trainingType?: 'INHOUSE' | 'PST';
};

export default function TraineesPage({ initialTrainees = [] }: { initialTrainees?: Trainee[] }) {
  const [selectedCard, setSelectedCard] = useState<any | null>(null);

  const { inhouseBatches, pstBatches, clientAccounts } = useMemo(() => {
    const inhouseMap: Record<string, any> = {};
    const pstMap: Record<string, any> = {};
    const accountMap: Record<string, any> = {};

    initialTrainees.forEach((t) => {
      const acctName = t.accountName || 'Unknown Account';
      // Client Accounts Aggregation
      if (!accountMap[acctName]) {
        accountMap[acctName] = { name: acctName, hc: 0, lossCount: 0, members: [] };
      }
      accountMap[acctName].hc += 1;
      if (t.isLoss) accountMap[acctName].lossCount += 1;
      accountMap[acctName].members.push(t);

      // Inhouse vs PST
      const isInhouse = t.trainingType === 'INHOUSE';
      
      const targetMap = isInhouse ? inhouseMap : pstMap;
      const batchKey = t.batchName || 'Unknown Batch';
      
      if (!targetMap[batchKey]) {
        targetMap[batchKey] = {
          name: batchKey,
          trainer: t.assignedTrainer || 'Unassigned',
          hc: 0,
          lossCount: 0,
          members: []
        };
      }
      targetMap[batchKey].hc += 1;
      if (t.isLoss) targetMap[batchKey].lossCount += 1;
      targetMap[batchKey].members.push(t);
      
      if (targetMap[batchKey].trainer === 'Unassigned' && t.assignedTrainer) {
         targetMap[batchKey].trainer = t.assignedTrainer;
      }
    });

    const formatAttr = (lossCount: number, hc: number) => {
      if (hc === 0) return '0.0%';
      return ((lossCount / hc) * 100).toFixed(1) + '%';
    };

    const inhouse = Object.values(inhouseMap).map(b => ({
      ...b,
      attr: formatAttr(b.lossCount, b.hc)
    }));

    const pst = Object.values(pstMap).map(b => ({
      ...b,
      attr: formatAttr(b.lossCount, b.hc)
    }));

    const clients = Object.values(accountMap).map(c => ({
      ...c,
      attr: formatAttr(c.lossCount, c.hc)
    }));

    // Sort by name alphabetically
    const sortByName = (a: any, b: any) => a.name.localeCompare(b.name);
    
    return { 
      inhouseBatches: inhouse.sort(sortByName), 
      pstBatches: pst.sort(sortByName), 
      clientAccounts: clients.sort(sortByName) 
    };
  }, [initialTrainees]);

  const openCard = (item: any, contextLabel: string, trainingType: string, accountName: string, trainer?: string) => {
    setSelectedCard({ 
      isBatch: true,
      name: item.name, 
      batchName: item.name, 
      accountName, 
      trainingType, 
      assignedTrainer: trainer, 
      headcount: item.hc, 
      attritionRate: item.attr, 
      contextLabel,
      members: item.members 
    });
  };

  const renderStatusBadge = (status?: string, isEndorsed?: boolean, isLoss?: boolean) => {
    const displayStatus = status || (isEndorsed ? 'ENDORSED' : isLoss ? 'LOSS' : 'ONGOING');
    const upperStatus = displayStatus.toUpperCase();
    
    if (upperStatus === 'ENDORSED') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 text-emerald-600 bg-emerald-50">ENDORSED</span>;
    }
    if (upperStatus === 'ONGOING' || upperStatus === 'ACTIVE') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 text-amber-600 bg-amber-50">{upperStatus}</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 text-slate-600 bg-slate-50">{upperStatus}</span>;
  };

  // Helper removed as we are not rendering tables here anymore

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
            <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" /> Refresh Data
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export Summary
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">
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
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Quarter Filter</label>
          <div className="relative">
            <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]">
              <option>All Quarters</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Month Filter</label>
          <div className="relative">
            <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]">
              <option>All Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Client Account</label>
          <div className="relative">
            <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F6798]">
              <option>All Client Accounts</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Search Trainee / Batch / Trainer</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Type name or batch..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
            />
          </div>
        </div>
      </div>

      {/* 3-Column Department Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Inhouse Training */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> INHOUSE TRAINING
            </h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">DEPT 1</span>
          </div>
          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {inhouseBatches.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1 mb-2">
                <button type="button" onClick={() => openCard(item, 'DEPT 1', 'INHOUSE TRAINING', 'General', item.trainer)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
                  <span className="text-xs font-bold text-[#2F6798]">{item.name}</span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: PST Training */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> PST TRAINING
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">DEPT 2</span>
          </div>
          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {pstBatches.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1 mb-2">
                <button type="button" onClick={() => openCard(item, 'DEPT 2', 'PST TRAINING', item.accountName || 'PST Account', item.trainer)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                      {item.trainer}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Client Accounts Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span> CLIENT ACCOUNTS
            </h3>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">SUMMARY</span>
          </div>
          <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {clientAccounts.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1 mb-2">
                <button type="button" onClick={() => openCard(item, 'SUMMARY', 'CLIENT ACCOUNTS', item.name, undefined)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    HC: <strong className="text-slate-800">{item.hc}</strong> | Attr: <strong className={item.attr !== '0.0%' ? 'text-red-500' : 'text-blue-600'}>{item.attr}</strong>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
      <TraineeDetailDrawer trainee={selectedCard} onClose={() => setSelectedCard(null)} />

    </div>
  );
}
