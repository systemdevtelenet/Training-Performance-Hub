'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

// Data mock matching screenshot trends
const quarterlyData = [
  { quarter: 'Q1', attrition: 33 },
  { quarter: 'Q2', attrition: 0 },
];

const monthlyData = [
  { month: 'Jan', attrition: 52 },
  { month: 'Feb', attrition: 2 },
  { month: 'Mar', attrition: 22 },
  { month: 'Apr', attrition: 0 },
  { month: 'May', attrition: 8 },
];

const chartConfig = {
  attrition: {
    label: 'Attrition %',
    color: '#2F6798',
  },
};

export default function PerformanceCharts() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-slate-800 tracking-wider">
        Performance Trajectory Charts
      </h3>

      {/* Quarterly Attrition Trajectory */}
      <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-xs font-bold text-slate-600 tracking-wider uppercase">
            QUARTERLY ATTRITION TRAJECTORY (ATTRITION % TREND)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ChartContainer config={chartConfig} className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quarterlyData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="quarter" tickLine={false} axisLine={false} tickMargin={8} className="text-xs text-slate-400 font-medium" />
                <YAxis domain={[0, 36]} ticks={[0, 9, 18, 27, 36]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} className="text-xs text-slate-400 font-medium" />
                <Tooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
                <Line
                  type="monotone"
                  dataKey="attrition"
                  stroke="#2F6798"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2F6798', strokeWidth: 2, stroke: '#FFFFFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Attrition Trajectory */}
      <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-xs font-bold text-slate-600 tracking-wider uppercase">
            MONTHLY ATTRITION TRAJECTORY (ATTRITION % TREND)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ChartContainer config={chartConfig} className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs text-slate-400 font-medium" />
                <YAxis domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} className="text-xs text-slate-400 font-medium" />
                <Tooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
                <Line
                  type="natural"
                  dataKey="attrition"
                  stroke="#2F6798"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2F6798', strokeWidth: 2, stroke: '#FFFFFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}