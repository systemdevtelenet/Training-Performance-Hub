import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, RefreshCcw } from 'lucide-react';

export default function AnalyticsLoading() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* 1. Header & Filters (Loads immediately) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Analytics &amp; AI Insights</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Showing: <span className="text-slate-700 dark:text-slate-300 font-bold">Jan–Aug 2026 &middot; All Accounts</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 opacity-70">
          <div className="relative">
            <select className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <option>All Quarters</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <option>All Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <option>All Client Accounts</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search..."
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs font-semibold w-48"
              disabled
            />
          </div>
          <button className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 p-2 rounded-lg" disabled>
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* 3. Department Performance Chart Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-8">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-64 rounded-lg" />
          </div>
          {/* Chart wave placeholder */}
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </div>

        {/* 4. Period Breakdown Table Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
