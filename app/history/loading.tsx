import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-48 rounded-xl" />
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
