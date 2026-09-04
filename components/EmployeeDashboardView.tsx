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
  Clock,
  Sparkles,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import { createClient } from '@/utils/supabase/client';

export function EmployeeDashboardView({ rawData }: { rawData: any }) {
  const { userName, email, assignedTrainer } = useRole();
  const supabase = createClient();
  const [trafficStatus, setTrafficStatus] = useState<string>('Okay');
  const [latestDate, setLatestDate] = useState<string>('Current Period');
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch latest traffic light status from database
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
          const keys = Object.keys(data).filter(k => !['id', 'created_at', 'teams', 'name', 'account', 'position'].includes(k.toLowerCase()));
          if (keys.length > 0) {
            const lastKey = keys[keys.length - 1];
            setLatestDate(lastKey);
            setTrafficStatus(data[lastKey] || 'Okay');
          }
        }
      } catch (err) {
        console.error('Error fetching traffic light status:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyStatus();
  }, [userName, email]);

  const totalDays = (myRecord?.p || 0) + (myRecord?.a || 0);
  const attendanceRate = totalDays > 0 ? ((myRecord.p / totalDays) * 100).toFixed(1) + '%' : '100.0%';

  const isGreen = ['OKAY', 'GREEN'].includes((trafficStatus || '').toUpperCase());
  const isYellow = ['SHAKY', 'YELLOW', 'AMBER'].includes((trafficStatus || '').toUpperCase());
  const isRed = ['RED', 'TERMINATED', 'RESIGNED', 'FAILED'].includes((trafficStatus || '').toUpperCase());

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2F6798] via-[#24527a] to-[#1a3d5d] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Personal Trainee Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {userName || email?.split('@')[0] || 'Trainee'}!
            </h1>
            <p className="text-sm text-blue-100/90 font-medium max-w-xl">
              Track your daily attendance, weekly traffic light monitoring flags, and training progress all in one place.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/trainees"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#2F6798] rounded-xl text-xs font-bold shadow-md hover:bg-blue-50 transition-all hover:scale-105"
            >
              <GraduationCap className="w-4 h-4" />
              My Trainee Profile
            </Link>
            <Link
              href="/traffic-lights"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold backdrop-blur-md transition-all hover:scale-105"
            >
              <Activity className="w-4 h-4" />
              Traffic Light History
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Traffic Light Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Traffic Light Status
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isGreen ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60' :
              isYellow ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60' :
              'bg-rose-50 text-rose-600 dark:bg-rose-950/60'
            }`}>
              {isGreen && <CheckCircle2 className="w-4 h-4" />}
              {isYellow && <AlertTriangle className="w-4 h-4" />}
              {isRed && <XCircle className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${
                isGreen ? 'text-emerald-600 dark:text-emerald-400' :
                isYellow ? 'text-amber-600 dark:text-amber-400' :
                'text-rose-600 dark:text-rose-400'
              }`}>
                {trafficStatus || 'Okay'}
              </span>
              <span className="text-xl">{isGreen ? '🟢' : isYellow ? '🟡' : '🔴'}</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
              Latest Evaluation: {latestDate}
            </p>
          </div>
        </div>

        {/* 2. Attendance Rate Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              My Attendance
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2F6798] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {attendanceRate}
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
              Present: {myRecord?.p ?? totalDays ?? 0} days • Absent: {myRecord?.a ?? 0} days
            </p>
          </div>
        </div>

        {/* 3. Batch / Account Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Training Batch
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">
              {myRecord?.batchName || 'Active Batch'}
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 truncate">
              Account: {myRecord?.accountName || 'Fleet / General'}
            </p>
          </div>
        </div>

        {/* 4. Assigned Trainer Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Trainer
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">
              {myRecord?.assignedTrainer || assignedTrainer || 'Training Team'}
            </div>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
              {myRecord?.trainingType || 'Inhouse Training'}
            </p>
          </div>
        </div>

      </div>

      {/* Main Trainee Details Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2F6798]" />
              My Current Training Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personal progress overview and daily activity
            </p>
          </div>
          <Link
            href="/trainees"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6798] hover:text-[#24527a] transition-colors"
          >
            <span>View full scorecard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account & Period</span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {myRecord?.accountName || 'Fleet'} • {myRecord?.quarter || 'Q2 2026'}
            </p>
            <p className="text-xs text-slate-500">{myRecord?.month || 'Current Month'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Training Track</span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {myRecord?.trainingType || 'Inhouse Performance Program'}
            </p>
            <p className="text-xs text-slate-500">Status: {myRecord?.status || 'Active & Ongoing'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Trainer Support</span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {myRecord?.assignedTrainer || assignedTrainer || 'Operations Trainer'}
            </p>
            <p className="text-xs text-slate-500">For inquiries, contact your assigned trainer</p>
          </div>
        </div>
      </div>

    </div>
  );
}
