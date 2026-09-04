import { Skeleton } from "@/components/ui/skeleton";

export default function TrafficLightsLoading() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
