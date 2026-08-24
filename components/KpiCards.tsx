'use client';

import React, { useState, useEffect } from 'react';
import { Users, TrendingDown, UserCheck, LayoutTemplate } from 'lucide-react';

const kpiData = [
  {
    id: 'trainees',
    label: 'Total Trainees',
    value: '842',
    trend: '+12.5%',
    isPositive: true,
    icon: Users,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    id: 'attrition',
    label: 'Overall Attrition',
    value: '18.4%',
    trend: '-2.1%',
    isPositive: true, // Lower attrition is good
    icon: TrendingDown,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    id: 'trainers',
    label: 'Active Trainers',
    value: '45',
    trend: '+2',
    isPositive: true,
    icon: UserCheck,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    id: 'classes',
    label: 'Classes in Session',
    value: '12',
    trend: 'Same',
    isPositive: null,
    icon: LayoutTemplate,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  }
];

export default function KpiCards() {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {kpiData.map((kpi) => (
        <div key={kpi.id} className="rounded-2xl border border-slate-200/60 bg-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] transition-all hover:scale-[1.02] cursor-default">
          <div className="flex items-center justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${kpi.color}`}>
              <kpi.icon className="h-6 w-6" />
            </div>
            
            {/* Trend Badge */}
            {isLoading ? (
              <div className="h-5 w-12 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
            ) : (
              <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                kpi.isPositive === true ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                kpi.isPositive === false ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {kpi.trend}
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{kpi.label}</h3>
            {isLoading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
            ) : (
              <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{kpi.value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
