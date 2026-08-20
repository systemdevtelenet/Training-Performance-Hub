import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, RefreshCw, Download, Printer } from 'lucide-react';

export default function TraineesLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm opacity-70">
            <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" /> Refresh Data
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm opacity-70">
            <Download className="w-3.5 h-3.5 text-[#2F6798]" /> Export Summary
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm opacity-70">
            <Printer className="w-3.5 h-3.5 text-[#2F6798]" /> Print / PDF
          </button>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-200 opacity-70">
            Live Systems
          </span>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Quarter Filter</label>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Month Filter</label>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Client Account</label>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Search Trainee / Batch / Trainer</label>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* 3-Column Department Breakdown Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Inhouse Training */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> INHOUSE TRAINING
            </h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">DEPT 1</span>
          </div>
          <div className="p-3 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
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
          <div className="p-3 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
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
          <div className="p-3 space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

      </div>

    </div>
  );
}
