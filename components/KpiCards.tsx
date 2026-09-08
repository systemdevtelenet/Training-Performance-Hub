'use client';

import React, { useState, useEffect } from 'react';
import { Users, TrendingDown, UserCheck, LayoutTemplate } from 'lucide-react';

export default function KpiCards({ metrics }: { metrics?: any }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [metrics]);

  const traineesCount = metrics?.totalTrainees ?? 180;
  const attritionRate = metrics?.overallAttrition ?? '1.1%';
  const trainersCount = metrics?.activeTrainers ?? 16;
  const classesCount = metrics?.classesInSession ?? 92;

  const kpiData = [
    {
      id: 'trainees',
      label: 'Total Trainees',
      value: traineesCount.toString(),
      trend: 'Live Data',
      isPositive: true,
      icon: Users,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      id: 'attrition',
      label: 'Overall Attrition',
      value: attritionRate,
      trend: 'Optimal',
      isPositive: true,
      icon: TrendingDown,
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      id: 'trainers',
      label: 'Active Trainers',
      value: trainersCount.toString(),
      trend: 'Active',
      isPositive: true,
      icon: UserCheck,
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    {
      id: 'classes',
      label: 'Classes in Session',
      value: classesCount.toString(),
      trend: 'In Session',
      isPositive: null,
      icon: LayoutTemplate,
      color: 'bg-[#C8A54B]/10 text-[#C8A54B] dark:bg-[#C8A54B]/20',
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {kpiData.map((kpi) => (
        <div key={kpi.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/40 cursor-default">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              
              <div className="flex flex-col">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{kpi.label}</h3>
                {isLoading ? (
                  <div className="mt-1 h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
                ) : (
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{kpi.value}</p>
                )}
              </div>
            </div>
            
            {/* Trend Badge */}
            {isLoading ? (
              <div className="h-5 w-12 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
            ) : (
              <div className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                kpi.isPositive === true ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                kpi.isPositive === false ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' :
                'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
              }`}>
                {kpi.trend}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
