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
  ShieldCheck,
  ClipboardList,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  Clock,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import { createClient } from '@/utils/supabase/client';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { isTrainerMatch, MONTH_ORDER } from '@/lib/analytics-utils';
import { getTrainerTraineeNames } from '@/lib/actions/traffic-lights';

export function TrainerDashboardView({ initialData }: { initialData: any }) {
  const { userName, email, userMeta } = useRole();
  const supabase = createClient();

  const [selectedQuarter, setSelectedQuarter] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rosterPage, setRosterPage] = useState<number>(1);
  const [rosterPageSize, setRosterPageSize] = useState<number>(10);
  
  // Trainer's own reliability data
  const [trainerReliability, setTrainerReliability] = useState<{
    rate: string;
    present: number;
    absent: number;
    status: string;
  }>({
    rate: '100.0%',
    present: 0,
    absent: 0,
    status: 'Excellent'
  });

  // Traffic lights data for trainer's trainees
  const [trafficLightsMap, setTrafficLightsMap] = useState<Record<string, { status: string; remarks: string; date: string }>>({});
  const [isTrafficLoading, setIsTrafficLoading] = useState(true);

  // 1. Filter Trainees specifically assigned to this trainer
  const trainerData = useMemo(() => {
    if (!initialData) return { trainees: [], batches: [], accounts: [] };

    const cleanUser = (userName || '').toLowerCase().trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    const userHandle = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');

    const traineeList: any[] = [];
    const batchMap = new Map<string, { type: string; account: string; batch: string; count: number; active: number; losses: number; p: number; a: number }>();
    const accountSet = new Set<string>();

    ['inhouse', 'pst'].forEach(type => {
      if (!initialData[type]?.groups) return;

      for (const acc in initialData[type].groups) {
        for (const batch in initialData[type].groups[acc]) {
          const group = initialData[type].groups[acc][batch];
          const members = group?.members || [];

          const batchTrainerMatches = isTrainerMatch(group?.trainer, userName || '') ||
                                      (group?.trainer && cleanUser && group.trainer.toLowerCase().includes(cleanUser));

          members.forEach((m: any) => {
            const assigned = m.assignedTrainer || group?.trainer || '';
            const matchesTrainer = batchTrainerMatches ||
              isTrainerMatch(assigned, userName || '') ||
              (cleanUser && assigned.toLowerCase().includes(cleanUser)) ||
              (userHandle && assigned.toLowerCase().includes(userHandle));

            if (matchesTrainer) {
              const traineeObj = {
                ...m,
                trainingType: type === 'inhouse' ? 'Inhouse Training' : 'Product Specific Training (PST)',
                typeKey: type,
                accountName: acc,
                batchName: batch
              };
              traineeList.push(traineeObj);
              accountSet.add(acc);

              const batchKey = `${type}-${acc}-${batch}`;
              if (!batchMap.has(batchKey)) {
                batchMap.set(batchKey, {
                  type: type === 'inhouse' ? 'Inhouse' : 'PST',
                  account: acc,
                  batch: batch,
                  count: 0,
                  active: 0,
                  losses: 0,
                  p: 0,
                  a: 0
                });
              }
              const bInfo = batchMap.get(batchKey)!;
              bInfo.count += 1;
              if (m.isLoss) bInfo.losses += 1;
              else bInfo.active += 1;
              bInfo.p += (m.p || 0);
              bInfo.a += (m.a || 0);
            }
          });
        }
      }
    });

    return {
      trainees: traineeList,
      batches: Array.from(batchMap.values()),
      accounts: Array.from(accountSet)
    };
  }, [initialData, userName, email]);

  // 2. Fetch Trainer's own reliability from trainer_attendance_strat
  useEffect(() => {
    async function fetchTrainerAttendance() {
      try {
        const cleanName = (userName || email?.split('@')[0] || '').trim();
        const { data } = await supabase
          .from('trainer_attendance_strat')
          .select('*')
          .ilike('name', `%${cleanName}%`);

        if (data && data.length > 0) {
          let p = 0;
          let a = 0;
          data.forEach((row: any) => {
            const val = (row.status || row.attendance_status || '').toUpperCase().trim();
            if (val === 'P' || val === 'PRESENT' || val === 'ON TIME') p++;
            else if (val === 'A' || val === 'ABSENT' || val === 'SL' || val === 'VL') a++;
            else p++; // Default standard attendance log
          });
          const total = p + a;
          const rateNum = total > 0 ? (p / total) * 100 : 100;
          const status = rateNum >= 95 ? 'Excellent' : rateNum >= 90 ? 'Good' : rateNum >= 80 ? 'Needs Attention' : 'Critical';

          setTrainerReliability({
            rate: `${rateNum.toFixed(1)}%`,
            present: p,
            absent: a,
            status
          });
        }
      } catch (err) {
        console.error('Error fetching trainer reliability:', err);
      }
    }
    fetchTrainerAttendance();
  }, [userName, email]);

  // 3. Fetch Traffic Light statuses for trainees in trainer's classes
  useEffect(() => {
    async function fetchTrafficLights() {
      setIsTrafficLoading(true);
      try {
        const { data } = await supabase
          .from('traffic_lights_rm')
          .select('*');

        if (data) {
          const map: Record<string, { status: string; remarks: string; date: string }> = {};
          data.forEach((row: any) => {
            const rawName = (row.name || row.teams || '').toLowerCase().trim();
            if (!rawName) return;

            const nonDateKeys = ['id', 'created_at', 'teams', 'name', 'account', 'position', 'trainer', 'remarks', 'remark', 'notes'];
            const dateKeys = Object.keys(row).filter(k => !nonDateKeys.includes(k.toLowerCase()));
            
            let latestDate = 'Current';
            let status = 'Okay';
            if (dateKeys.length > 0) {
              latestDate = dateKeys[dateKeys.length - 1];
              status = row[latestDate] || 'Okay';
            }

            const remarks = row.remarks || row.remark || row.notes || '';
            map[rawName] = { status, remarks, date: latestDate };
          });
          setTrafficLightsMap(map);
        }
      } catch (err) {
        console.error('Error fetching traffic lights:', err);
      } finally {
        setIsTrafficLoading(false);
      }
    }
    fetchTrafficLights();
  }, []);

  // Filter trainees by period/month/search
  const filteredTrainees = useMemo(() => {
    return trainerData.trainees.filter(t => {
      const qMatch = selectedQuarter === 'ALL' || t.quarter === selectedQuarter;
      const mMatch = selectedMonth === 'ALL' || t.month === selectedMonth;
      const sMatch = !searchQuery || 
        (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.batchName && t.batchName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.accountName && t.accountName.toLowerCase().includes(searchQuery.toLowerCase()));
      return qMatch && mMatch && sMatch;
    });
  }, [trainerData.trainees, selectedQuarter, selectedMonth, searchQuery]);

  // Pagination for Assigned Trainee Roster (10 items per page)
  useEffect(() => {
    setRosterPage(1);
  }, [selectedQuarter, selectedMonth, searchQuery]);

  const totalRosterPages = Math.ceil(filteredTrainees.length / rosterPageSize) || 1;
  const paginatedRosterTrainees = useMemo(() => {
    const start = (rosterPage - 1) * rosterPageSize;
    return filteredTrainees.slice(start, start + rosterPageSize);
  }, [filteredTrainees, rosterPage, rosterPageSize]);

  // Aggregate Metrics for Trainer's Classroom
  const metrics = useMemo(() => {
    const totalTrainees = filteredTrainees.length;
    let totalP = 0;
    let totalA = 0;
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;
    let lossesCount = 0;

    filteredTrainees.forEach(t => {
      totalP += (t.p || 0);
      totalA += (t.a || 0);
      if (t.isLoss) lossesCount++;

      const cleanTName = (t.name || '').toLowerCase().trim();
      const tl = trafficLightsMap[cleanTName];
      const statusUpper = (tl?.status || 'OKAY').toUpperCase();

      if (statusUpper.includes('OKAY') || statusUpper.includes('GREEN')) {
        greenCount++;
      } else if (statusUpper.includes('SHAKY') || statusUpper.includes('AMBER') || statusUpper.includes('YELLOW')) {
        amberCount++;
      } else if (statusUpper.includes('RED') || statusUpper.includes('TERMINATED') || statusUpper.includes('RESIGNED') || statusUpper.includes('ACCOUNT REMOVED')) {
        redCount++;
      } else {
        greenCount++;
      }
    });

    const totalDays = totalP + totalA;
    const classAttendanceRate = totalDays > 0 ? ((totalP / totalDays) * 100).toFixed(1) + '%' : '100.0%';

    return {
      totalTrainees,
      activeTrainees: totalTrainees - lossesCount,
      lossesCount,
      classAttendanceRate,
      totalP,
      totalA,
      greenCount,
      amberCount,
      redCount,
      activeBatchesCount: trainerData.batches.length
    };
  }, [filteredTrainees, trafficLightsMap, trainerData.batches]);

  // At-Risk Watchlist (Amber / Red Trainees)
  const atRiskList = useMemo(() => {
    return filteredTrainees.filter(t => {
      const cleanTName = (t.name || '').toLowerCase().trim();
      const tl = trafficLightsMap[cleanTName];
      const statusUpper = (tl?.status || '').toUpperCase();
      return (
        statusUpper.includes('SHAKY') ||
        statusUpper.includes('AMBER') ||
        statusUpper.includes('YELLOW') ||
        statusUpper.includes('RED') ||
        statusUpper.includes('TERMINATED') ||
        statusUpper.includes('RESIGNED') ||
        t.isLoss
      );
    }).map(t => {
      const cleanTName = (t.name || '').toLowerCase().trim();
      const tl = trafficLightsMap[cleanTName];
      return {
        ...t,
        trafficStatus: tl?.status || (t.isLoss ? 'Terminated' : 'Shaky'),
        remarks: tl?.remarks || 'Requires 1-on-1 coaching or attendance remediation.'
      };
    });
  }, [filteredTrainees, trafficLightsMap]);

  return (
    <div className="space-y-5 text-[#363435] dark:text-slate-200">
      
      {/* 1. Page Header with Trainer Greeting & Quick Action Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              TRAINER DASHBOARD
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2F6798]/10 text-[#2F6798] dark:bg-blue-950/60 dark:text-blue-300 border border-[#2F6798]/20">
              Operations Classroom Hub
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
            Welcome back, {userName || 'Trainer'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor your assigned cohorts, trainee attendance, traffic light flags, and coaching remarks.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <Link
            href="/traffic-lights"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2F6798] text-white text-xs font-semibold shadow-xs hover:bg-[#24527a] transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-white" />
            <span>Update Traffic Lights</span>
          </Link>
          <Link
            href="/trainees"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:border-[#2F6798]/40 hover:text-[#2F6798] transition-all"
          >
            <Users className="w-3.5 h-3.5 text-[#2F6798]" />
            <span>Manage Trainees</span>
          </Link>
          <Link
            href="/trainers?tab=attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:border-[#2F6798]/40 hover:text-[#2F6798] transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-[#2F6798]" />
            <span>My Reliability</span>
          </Link>
        </div>
      </div>

      {/* 2. Top KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: My Trainees Headcount */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/50 hover:shadow-md group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Assigned Trainees
                </h3>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {metrics.totalTrainees}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
              {metrics.activeTrainees} Active
            </div>
          </div>
        </div>

        {/* Card 2: Classroom Attendance Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/50 hover:shadow-md group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Class Attendance
                </h3>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {metrics.classAttendanceRate}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
              {metrics.totalP} P • {metrics.totalA} A
            </div>
          </div>
        </div>

        {/* Card 3: Traffic Lights Breakdown */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/50 hover:shadow-md group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Traffic Light Health
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">🟢 {metrics.greenCount}</span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">🟡 {metrics.amberCount}</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">🔴 {metrics.redCount}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
              {metrics.amberCount + metrics.redCount === 0 ? 'All Good' : `${metrics.amberCount + metrics.redCount} Need Action`}
            </div>
          </div>
        </div>

        {/* Card 4: Personal Trainer Reliability */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs transition-all hover:border-[#2F6798]/50 hover:shadow-md group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Trainer Reliability
                </h3>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {trainerReliability.rate}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400">
              {trainerReliability.status}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Filter Bar (Quarter, Month, Search) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-20">
        <div>
          <label htmlFor="trainer-quarter" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <Calendar className="h-3.5 w-3.5 text-[#2F6798]" />Evaluation Quarter
          </label>
          <CustomSelect 
            id="trainer-quarter" 
            value={selectedQuarter} 
            onChange={(val) => setSelectedQuarter(val)} 
            options={[
              { value: 'ALL', label: 'All Quarters' },
              { value: 'Q1', label: 'Quarter 1 (Q1)' },
              { value: 'Q2', label: 'Quarter 2 (Q2)' },
              { value: 'Q3', label: 'Quarter 3 (Q3)' },
              { value: 'Q4', label: 'Quarter 4 (Q4)' },
            ]}
          />
        </div>

        <div>
          <label htmlFor="trainer-month" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            <Clock className="h-3.5 w-3.5 text-[#2F6798]" />Month
          </label>
          <CustomSelect 
            id="trainer-month" 
            value={selectedMonth} 
            onChange={(val) => setSelectedMonth(val)} 
            options={[
              { value: 'ALL', label: 'All Months' },
              ...MONTH_ORDER.map(m => ({ value: m, label: m }))
            ]}
          />
        </div>

        <div>
          <label htmlFor="trainer-search" className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            Search Trainee / Batch / Account
          </label>
          <div className="relative group">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
            <input 
              id="trainer-search" 
              type="search" 
              placeholder="Filter by name or batch..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-2 pl-10 pr-4 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/20" 
            />
          </div>
        </div>
      </div>

      {/* 4. At-Risk / Coaching Watchlist */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                At-Risk Trainee Watchlist &amp; Coaching Queue
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Trainees flagged as Shaky / Red or requiring 1-on-1 coaching interventions
              </p>
            </div>
          </div>
          <Link
            href="/traffic-lights"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6798] hover:underline"
          >
            <span>Open Traffic Lights Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {atRiskList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {atRiskList.map((t, idx) => {
              const isRed = t.trafficStatus.toLowerCase().includes('red') || t.trafficStatus.toLowerCase().includes('term') || t.isLoss;
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    isRed 
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50' 
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.accountName} • {t.batchName} ({t.trainingType})
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      isRed 
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                    }`}>
                      {t.trafficStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] truncate flex-1">{t.remarks}</span>
                    <Link
                      href="/traffic-lights"
                      className="text-[10px] font-bold text-[#2F6798] hover:underline shrink-0 ml-1"
                    >
                      Update
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              All Trainees On Track (Green / Okay)
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              No at-risk or critical flags found for your active cohorts in the selected evaluation period.
            </p>
          </div>
        )}
      </div>

      {/* 5. Assigned Cohorts & Active Trainee Roster Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Assigned Trainee Roster ({filteredTrainees.length})
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Active students enrolled in your classroom cohorts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Rows:</span>
              <select
                value={rosterPageSize >= 10000 ? 'all' : rosterPageSize}
                onChange={e => {
                  setRosterPageSize(e.target.value === 'all' ? 100000 : Number(e.target.value));
                  setRosterPage(1);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
            </div>
            <Link
              href="/trainees"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6798] hover:underline"
            >
              <span>Full Trainee Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {filteredTrainees.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Trainee Name</th>
                  <th className="py-3.5 px-4">Account &amp; Batch</th>
                  <th className="py-3.5 px-4">Program Track</th>
                  <th className="py-3.5 px-4 text-center">Attendance</th>
                  <th className="py-3.5 px-4 text-center">Traffic Light</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRosterTrainees.map((t, idx) => {
                  const cleanTName = (t.name || '').toLowerCase().trim();
                  const tl = trafficLightsMap[cleanTName];
                  const status = tl?.status || (t.isLoss ? 'Terminated' : 'Okay');
                  const sUpper = status.toUpperCase();

                  const totalDays = (t.p || 0) + (t.a || 0);
                  const attRate = totalDays > 0 ? `${(((t.p || 0) / totalDays) * 100).toFixed(0)}%` : '100%';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {t.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{t.accountName}</span>
                        <span className="text-slate-400 dark:text-slate-500 ml-1">· {t.batchName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {t.trainingType}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                          {attRate}
                          <span className="text-[10px] text-slate-400 font-normal">({t.p || 0}P / {t.a || 0}A)</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sUpper.includes('OKAY') || sUpper.includes('GREEN')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : sUpper.includes('SHAKY') || sUpper.includes('AMBER') || sUpper.includes('YELLOW')
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            sUpper.includes('OKAY') || sUpper.includes('GREEN') ? 'bg-emerald-500' :
                            sUpper.includes('SHAKY') || sUpper.includes('AMBER') || sUpper.includes('YELLOW') ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href="/trainees"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F6798] hover:underline"
                        >
                          <span>Profile</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredTrainees.length > 0 && (
              <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-100">{(rosterPage - 1) * rosterPageSize + 1}</span> to <span className="font-bold text-slate-800 dark:text-slate-100">{Math.min(rosterPage * rosterPageSize, filteredTrainees.length)}</span> of <span className="font-bold text-slate-800 dark:text-slate-100">{filteredTrainees.length}</span> trainees
                </div>

                <div className="flex items-center gap-1.5 self-center sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setRosterPage(p => Math.max(p - 1, 1))}
                    disabled={rosterPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalRosterPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalRosterPages <= 5) return true;
                        if (page === 1 || page === totalRosterPages) return true;
                        if (Math.abs(page - rosterPage) <= 1) return true;
                        return false;
                      })
                      .reduce<(number | string)[]>((acc, page, idx, arr) => {
                        if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((item, idx) => {
                        if (item === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-1.5 py-0.5 text-slate-400 font-bold">
                              ...
                            </span>
                          );
                        }
                        const pageNum = item as number;
                        const isActive = pageNum === rosterPage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setRosterPage(pageNum)}
                            className={`w-7 h-7 rounded-lg font-black text-xs transition-all ${
                              isActive
                                ? 'bg-[#2F6798] text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setRosterPage(p => Math.min(p + 1, totalRosterPages))}
                    disabled={rosterPage === totalRosterPages}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
              <ClipboardList className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              No assigned trainees found for this period
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Try changing the evaluation quarter filter or search term above.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
