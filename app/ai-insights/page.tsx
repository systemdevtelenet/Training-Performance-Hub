import { ExecutiveAIReport } from '@/components/ExecutiveAIReport';

export const dynamic = 'force-dynamic';

export default function AIInsightsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[0.65rem] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">INTELLIGENCE</span>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">AI Insights</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ExecutiveAIReport />
      </div>

    </div>
  );
}
