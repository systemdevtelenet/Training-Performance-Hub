'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  GraduationCap, 
  Building2, 
  UserCheck, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  Clock,
  FileText,
  CalendarDays,
  Search,
  Filter,
  TrendingUp,
  Award
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import { createClient } from '@/utils/supabase/client';
import { CustomSelect } from '@/components/ui/CustomSelect';

export function EmployeeDashboardView({ rawData }: { rawData: any }) {
  const { userName, email, assignedTrainer, userMeta } = useRole();
  const supabase = createClient();
  const [trafficStatus, setTrafficStatus] = useState<string>('Okay');
  const [latestDate, setLatestDate] = useState<string>('Current Period');
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [remarksText, setRemarksText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');

  // Search through inhouse & PST rawData to find this employee's matching record
  const myRecord = useMemo(() => {
    if (!rawData) return null;
    const cleanUser = (userName || '').toLowerCase().trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    const userHandle = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');

    let found: any = null;

    ['inhouse', 'pst'].forEach(type => {
      if (found || !rawData[type]?.groups) return;
      for (const acc in rawData[type].groups) {
        for (const batch in rawData[type].groups[acc]) {
          const members = rawData[type].groups[acc][batch]?.members || [];
          for (const m of members) {
            const mName = (m.name || '').toLowerCase().trim();
            if (
              (cleanUser && (mName === cleanUser || mName.includes(cleanUser) || cleanUser.includes(mName))) ||
              (cleanEmail && cleanEmail.includes(mName.replace(/\s+/g, ''))) ||
              (userHandle && mName.includes(userHandle))
            ) {
              found = {
                ...m,
                accountName: acc,
                batchName: batch,
                trainingType: type === 'inhouse' ? 'Inhouse Training' : 'Product Specific Training (PST)'
              };
              return;
            }
          }
        }
      }
    });

    return found;
  }, [rawData, userName, email]);

  // Fetch personal traffic light status and historical evaluations
  useEffect(() => {
    async function fetchMyStatus() {
      try {
        const cleanName = (userName || email?.split('@')[0] || '').trim();
        const { data } = await supabase
          .from('traffic_lights_rm')
          .select('*')
          .ilike('name', `%${cleanName}%`)
          .limit(1)
          .maybeSingle();

        if (data) {
          const nonDateKeys = ['id', 'created_at', 'teams', 'name', 'account', 'position', 'trainer', 'remarks', 'remark', 'notes'];
          const dateKeys = Object.keys(data).filter(k => !nonDateKeys.includes(k.toLowerCase()));
          
          if (dateKeys.length > 0) {
            const lastKey = dateKeys[dateKeys.length - 1];
            setLatestDate(lastKey);
            setTrafficStatus(data[lastKey] || 'Okay');

            const history = dateKeys.map(k => ({
              period: k,
              status: data[k] || 'Okay',
              trainer: data.trainer || data.teams || myRecord?.assignedTrainer || assignedTrainer || 'Training Team',
              remarks: data.remarks || data.remark || data.notes || 'Weekly evaluation recorded and monitored.'
            })).reverse();
            setHistoryRows(history);
            if (data.remarks || data.remark) {
              setRemarksText(data.remarks || data.remark);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching traffic light status:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyStatus();
  }, [userName, email, myRecord, assignedTrainer]);

  const totalP = myRecord?.p ?? 0;
  const totalA = myRecord?.a ?? 0;
  const totalDays = totalP + totalA;
  const attendanceRate = totalDays > 0 ? ((totalP / totalDays) * 100).toFixed(1) + '%' : '100.0%';

  const isGreen = ['OKAY', 'GREEN'].includes((trafficStatus || '').toUpperCase());
  const isYellow = ['SHAKY', 'YELLOW', 'AMBER'].includes((trafficStatus || '').toUpperCase());
  const isRed = ['RED', 'TERMINATED', 'RESIGNED', 'FAILED'].includes((trafficStatus || '').toUpperCase());

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (['OKAY', 'GREEN'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Okay / Green
        </span>
      );
    }
    if (['SHAKY', 'YELLOW', 'AMBER'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Shaky / Amber
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        Critical / Red
      </span>
    );
  };

  const filteredHistory = useMemo(() => {
    if (selectedPeriodFilter === 'ALL') return historyRows;
    return historyRows.filter(r => r.period.toLowerCase().includes(selectedPeriodFilter.toLowerCase()));
  }, [historyRows, selectedPeriodFilter]);

  return (
    <div className="space-y-5 text-[#363435] dark:text-slate-200">
      
      {/* 1. Page Title Header (Matches Admin Dashboard Structure) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            DASHBOARD
          </span>
          <div className="flex items-center gap-2.5 mt-0.5">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Personal Performance Overview
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2F6798]/10 text-[#2F6798] dark:bg-blue-950/60 dark:text-blue-300 border border-[#2F6798]/20">
              Employee Portal
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings?tab=profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:border-[#2F6798]/40 hover:text-[#2F6798] transition-all"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#2F6798]" />
            <span>Profile Details</span>
          </Link>
          <Link
            href="/traffic-lights"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2F6798] text-white text-xs font-semibold shadow-xs hover:bg-[#24527a] transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-white" />
            <span>Traffic Lights Log</span>
          </Link>
        </div>
      </div>

      {/* 2. Top KPI Cards Row (Matches Admin KpiCards.tsx 3-4 Column Grid Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Traffic Light Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/40 cursor-default">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isGreen ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                isYellow ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              }`}>
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Traffic Light Status
                </h3>
                <p className={`text-2xl font-black mt-0.5 ${
                  isGreen ? 'text-emerald-600 dark:text-emerald-400' :
                  isYellow ? 'text-amber-600 dark:text-amber-400' :
                  'text-rose-600 dark:text-rose-400'
                }`}>
                  {trafficStatus || 'Okay'}
                </p>
              </div>
            </div>
            <div className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isGreen ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' :
              isYellow ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' :
              'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400'
            }`}>
              {latestDate}
            </div>
          </div>
        </div>

        {/* Card 2: Attendance Rate */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/40 cursor-default">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  My Attendance Rate
                </h3>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {attendanceRate}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
              {totalP} Present • {totalA} Absent
            </div>
          </div>
        </div>

        {/* Card 3: Active Training Batch */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/40 cursor-default">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Active Batch
                </h3>
                <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5 leading-snug break-words">
                  {myRecord?.batchName || 'General Wave'}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
              {myRecord?.accountName || 'Fleet'}
            </div>
          </div>
        </div>

        {/* Card 4: Assigned Trainer */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/40 cursor-default">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Assigned Trainer
                </h3>
                <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5 leading-snug break-words">
                  {myRecord?.assignedTrainer || assignedTrainer || 'Operations Trainer'}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400">
              {myRecord?.trainingType === 'Product Specific Training (PST)' ? 'PST' : 'Inhouse'}
            </div>
          </div>
        </div>

      </div>

      {/* 3. External White Container for Filters, Program Status, and Evaluation History (Matches Executive Dashboard Layout) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-6">
        
        {/* A. Global Information / Filter Bar */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.5fr] gap-4 relative z-20">
          <div>
            <label htmlFor="period-filter" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <CalendarDays className="h-3.5 w-3.5 text-[#2F6798]" />Evaluation Period Filter
            </label>
            <CustomSelect 
              id="period-filter" 
              value={selectedPeriodFilter} 
              onChange={(val) => setSelectedPeriodFilter(val)} 
              options={[
                { value: 'ALL', label: 'All Evaluation Periods' },
                { value: 'Q1', label: 'Quarter 1 (Q1)' },
                { value: 'Q2', label: 'Quarter 2 (Q2)' },
                { value: 'Q3', label: 'Quarter 3 (Q3)' },
                { value: 'Q4', label: 'Quarter 4 (Q4)' },
              ]}
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <Building2 className="h-3.5 w-3.5 text-[#2F6798]" />Assigned Account
            </label>
            <div className="h-10 px-3.5 flex items-center justify-between rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span>{myRecord?.accountName || 'Fleet Account'}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#2F6798]/10 text-[#2F6798] dark:text-blue-300">Active</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2F6798]" />Program Track
            </label>
            <div className="h-10 px-3.5 flex items-center justify-between rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              <span className="truncate">{myRecord?.trainingType || 'Inhouse Performance Program'}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 shrink-0 ml-2">Ongoing</span>
            </div>
          </div>
        </div>

        {/* B. Main Program Status Details Card */}
        <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2F6798]/10 text-[#2F6798] dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  My Training Program Status
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Verified enrollment, account assignment, and trainer support details
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Status:</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
                {myRecord?.status || 'Active & Ongoing'}
              </span>
            </div>
          </div>

          {/* 4 Info Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Program & Track
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {myRecord?.trainingType || 'Inhouse Performance Program'}
              </p>
              <p className="text-xs text-slate-500">
                {myRecord?.batchName || 'General Wave'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Account & Period
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {myRecord?.accountName || 'Fleet'}
              </p>
              <p className="text-xs text-slate-500">
                {myRecord?.quarter || 'Q2'} • {myRecord?.month || 'Current Month'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Employee ID & Role
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {userMeta?.employeeId || '2237'}
              </p>
              <p className="text-xs text-slate-500">
                {userMeta?.systemRole || 'Employee'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Assigned Trainer
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {myRecord?.assignedTrainer || assignedTrainer || 'Operations Trainer'}
              </p>
              <p className="text-xs text-slate-500">
                For queries, contact supervisor
              </p>
            </div>
          </div>
        </div>

        {/* C. Weekly Traffic Light Evaluation History Table Card */}
        <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Weekly Traffic Light Evaluation History
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Evaluation flags, performance ratings, and trainer coaching remarks
                </p>
              </div>
            </div>
            <Link
              href="/traffic-lights"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6798] hover:text-[#24527a] transition-colors"
            >
              <span>Full evaluation matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Evaluation Period</th>
                    <th className="py-3.5 px-4">Performance Flag</th>
                    <th className="py-3.5 px-4">Trainer Evaluator</th>
                    <th className="py-3.5 px-4">Coaching Remarks / Notes</th>
                    <th className="py-3.5 px-4 text-right">Matrix View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHistory.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {row.period}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {row.trainer}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {row.remarks}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href="/traffic-lights"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F6798] hover:underline"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                <ClipboardList className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                No evaluation records found
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Weekly traffic light records are posted by your assigned trainer after each monitoring cycle.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
