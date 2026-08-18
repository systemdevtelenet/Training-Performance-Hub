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
      <p className="my-4 text-center text-sm text-slate-400">
        Not enough data matrix segments to map a timeline graph trajectory.
      </p>
    );
  }

  return (
    <div className="my-5 first:mt-3 last:mb-0">
      <div className="flex justify-between items-center mb-4">
        <Title className="text-xs uppercase font-bold text-slate-600 tracking-wider">
          {title} (Attrition % Trend)
        </Title>
      </div>
      <div className="h-48 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val: any) => [`${val}%`, 'Attrition Rate']}
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', borderColor: '#e2e8f0' }}
            />
            <Line
              type="monotone"
              dataKey="attritionNum"
              stroke="#2F6798"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#2F6798', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AnalyticsChart;
