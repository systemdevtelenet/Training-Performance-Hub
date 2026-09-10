'use client';

import { Title } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ChartProps {
  title: string;
  data: Array<{ period: string; attritionNum: number; attritionRate: string }>;
}

export function AnalyticsChart({ title, data }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="my-4 text-center text-sm text-slate-400 dark:text-slate-500">
        Not enough data matrix segments to map a timeline graph trajectory.
      </p>
    );
  }

  const displayTitle = title.toUpperCase().includes('ATTRITION % TREND')
    ? title.toUpperCase()
    : `${title.toUpperCase()} (ATTRITION % TREND)`;

  return (
    <div className="my-5 first:mt-3 last:mb-0">
      <div className="flex justify-between items-center mb-3">
        <Title className="text-xs uppercase font-bold text-slate-700 dark:text-slate-200 tracking-wider">
          {displayTitle}
        </Title>
      </div>
      <div className="h-48 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 p-3 shadow-2xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val: any) => [`${val}%`, 'Attrition Rate']}
              contentStyle={{ backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: '10px', borderColor: '#334155', fontSize: '12px', fontWeight: 'bold' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Line
              type="linear"
              dataKey="attritionNum"
              stroke="#EAB308"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#EAB308', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#EAB308' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AnalyticsChart;
