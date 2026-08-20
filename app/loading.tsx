import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      {/* Page Title Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>

      {/* Global Filter Bar Skeleton */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr]">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Main Executive Summary View Skeleton */}
      <div className="mt-4">
        <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Left Column */}
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-none ring-0">
                <Skeleton className="h-5 w-64 mb-4" />
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-none ring-0">
                <Skeleton className="h-5 w-64 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </div>

            {/* Right Column (Charts) */}
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-none">
                <Skeleton className="h-5 w-64 mb-2" />
                {/* Chart 1 */}
                <div className="my-5">
                  <Skeleton className="h-4 w-48 mb-4" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
                {/* Chart 2 */}
                <div className="my-5">
                  <Skeleton className="h-4 w-48 mb-4" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
              </div>
              
              {/* Bottom Right Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-none ring-0">
                <Skeleton className="h-5 w-64 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}
