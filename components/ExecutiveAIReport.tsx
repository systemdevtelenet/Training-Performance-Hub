'use client';

import { useState } from 'react';
import { 
  Bot, 
  BarChart3, 
  Calendar, 
  CalendarDays, 
  History,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Award,
  CheckCircle2,
  Download,
  Copy,
  Send
} from 'lucide-react';

type Timeframe = 'Quarterly' | 'Monthly' | 'MTD' | 'PastMonthMTD' | null;

export function ExecutiveAIReport() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleTimeframeSelect = (timeframe: Timeframe) => {
    setIsGenerating(true);
    setSelectedTimeframe(timeframe);
    // Simulate AI generation delay
    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm sm:p-6 mb-4">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          <Bot className="h-6 w-6 text-primary" />
          Executive AI Analytics Report
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select a timeframe to generate dynamic insights on trainer performance and ongoing batch training metrics.
        </p>
      </div>

      {/* Timeframe Selectors */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button 
          onClick={() => handleTimeframeSelect('Quarterly')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
            selectedTimeframe === 'Quarterly' 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Quarterly
        </button>
        <button 
          onClick={() => handleTimeframeSelect('Monthly')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
            selectedTimeframe === 'Monthly' 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" /> Monthly
        </button>
        <button 
          onClick={() => handleTimeframeSelect('MTD')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
            selectedTimeframe === 'MTD' 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarDays className="h-4 w-4" /> Month to Date (MTD)
        </button>
        <button 
          onClick={() => handleTimeframeSelect('PastMonthMTD')}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
            selectedTimeframe === 'PastMonthMTD' 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="h-4 w-4" /> Past Month & MTD
        </button>
      </div>

      {/* Content Area */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden min-h-[250px]">
        
        {/* Empty State */}
        {!selectedTimeframe && !isGenerating && (
          <div className="flex h-[250px] items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">
            Select a report timeframe above to generate AI insights.
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex h-[250px] flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-primary"></div>
            <p className="text-sm font-bold text-primary animate-pulse">Generating AI Executive Report...</p>
          </div>
        )}

        {/* Generated Report State */}
        {selectedTimeframe && !isGenerating && (
          <div className="flex flex-col">
            
            {/* 1. Executive Summary Bar (Top Banner) */}
            <div className="bg-gradient-to-r from-[#2F6798]/10 to-[#2F6798]/5 dark:from-[#2F6798]/20 dark:to-transparent border-b border-[#2F6798]/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase text-primary border border-primary/20">
                  <span>✨</span> AI Summary
                </span>
                <span className="text-[0.65rem] font-medium text-slate-400 dark:text-slate-500">
                  Generated just now based on live system data
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
                <strong className="text-slate-900 dark:text-white">Q3 training performance shows a 4.2% drop in attrition compared to Q2</strong>, driven by strong retention in PST batches. However, <span className="font-bold text-destructive">Inhouse General -10 requires immediate intervention</span> due to a 100% loss rate.
              </p>
            </div>

            <div className="p-5 space-y-6">
              {/* 2. Key Findings & Alerts Grid (2-Column Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Card — Critical Risks & Anomalies */}
                <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-800 p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
                  <h3 className="mb-4 text-xs font-bold uppercase text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Critical Risks & Anomalies
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex rounded-md bg-destructive/10 px-1.5 py-0.5 text-[0.65rem] font-bold text-destructive">High Attrition</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Batch General -10</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
                        <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        Reached 100% loss rate (1/1 HC). Immediate intervention required.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[0.65rem] font-bold text-amber-600 dark:text-amber-500">Attendance Risk</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Rohla Mie Baswa</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        Trainer hit a 31.5% reliability rate due to unexcused absences.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Card — Positive Highlights */}
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-slate-800 p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <h3 className="mb-4 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" /> Positive Highlights
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-500">Top Performing</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Batch 4 (FLEET-PST)</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        Achieved 0.0% attrition with 100% success rate.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-500">Most Reliable</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Vincent Luis Celdran</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        Maintained 100% attendance across 148 shifts.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Actionable AI Recommendations */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">Actionable Recommendations</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">1</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">Reassign General -10</strong> curriculum review to Head of Training immediately.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">2</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">Audit holiday logging logic</strong> under Trainer Reliability (currently misclassifying HOL as losses).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">3</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">Schedule a performance check-in</strong> for batches with low headcount (HC ≤ 2) to consolidate resources.</span>
                  </li>
                </ul>
              </div>

              {/* Interactive UI Features (Bottom Actions & Input) */}
              <div className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-700 pt-5 mt-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <Copy className="h-3.5 w-3.5" /> Copy Narrative
                    </button>
                    <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <Download className="h-3.5 w-3.5" /> Export PDF
                    </button>
                  </div>
                  
                  <div className="flex-1 min-w-[250px] max-w-md relative">
                    <input 
                      type="text" 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ask AI about this report... (e.g., 'Why is Inhouse attrition spiking?')"
                      className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 py-2 pl-4 pr-10 text-xs text-slate-700 dark:text-slate-200 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400"
                    />
                    <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary p-1.5 text-white hover:bg-primary/90 transition-colors">
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
