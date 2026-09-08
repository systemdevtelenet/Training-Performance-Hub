import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import dummyPayload from '@/data/dashboard-mock.json'; // Fallback

// Create a standard client that doesn't access Next.js cookies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create an admin client to bypass RLS if needed for server-side fetching
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

// We define a cache tag so we can revalidate on-demand if needed
export const getDashboardData = unstable_cache(
  async () => {
    try {
      // Fetch live data from Supabase tables
      const { data: inhouseData, error: inhouseError } = await supabaseAdmin
        .from('inhouse')
        .select('*');

      const { data: pstData, error: pstError } = await supabaseAdmin
        .from('product_spec_training')
        .select('*');

      const { data: trainersData } = await supabaseAdmin
        .from('trainers')
        .select('*');

      const inhouseList = inhouseData || [];
      const pstList = pstData || [];
      const trainersList = trainersData || [];

      const totalTrainees = inhouseList.length + pstList.length;
      const activeTrainers = trainersList.filter(t => (t.status || '').toUpperCase() === 'ACTIVE' || !t.status).length || trainersList.length;
      const lossStatuses = ['FAILED', 'RESIGNED', 'TERMINATED', 'AWOL', 'RED', 'ACCOUNT REMOVED', 'LOSS', 'ATTRITION', 'EOC'];

      let totalLosses = 0;
      const accountsSet = new Set<string>();

      // Grouping for Inhouse
      const inhouseGroups: any = {};
      inhouseList.forEach(item => {
        const accountName = (item.account || item.acount || 'General').trim();
        const batchName = item.batch ? `Batch ${item.batch}` : 'Unassigned Batch';
        if (accountName) accountsSet.add(accountName);

        if (!inhouseGroups[accountName]) inhouseGroups[accountName] = {};
        if (!inhouseGroups[accountName][batchName]) inhouseGroups[accountName][batchName] = { members: [] };

        const statusUpper = (item.status || '').toUpperCase();
        const isLoss = lossStatuses.some(ls => statusUpper.includes(ls));
        if (isLoss) totalLosses++;

        inhouseGroups[accountName][batchName].members.push({
          id: item.id || item.name,
          name: item.name,
          status: item.status || 'ACTIVE',
          accountName,
          batchName,
          month: item.month || 'January',
          quarter: item.quarter || 'Q1',
          isLoss,
          p: 5,
          a: isLoss ? 1 : 0
        });
      });

      // Grouping for PST
      const pstGroups: any = {};
      pstList.forEach(item => {
        const accountName = (item.account || item.accountName || 'General').trim();
        const rawWave = item.wave ? `${item.wave}`.replace(/^(wave\s*)/i, '').trim() : '';
        const batchName = rawWave ? `Batch ${rawWave}` : (item.batch ? `Batch ${item.batch}` : item.batchName || 'Unassigned Batch');
        if (accountName) accountsSet.add(accountName);

        if (!pstGroups[accountName]) pstGroups[accountName] = {};
        if (!pstGroups[accountName][batchName]) pstGroups[accountName][batchName] = { members: [] };

        const statusUpper = (item.status || '').toUpperCase();
        const isLoss = lossStatuses.some(ls => statusUpper.includes(ls));
        if (isLoss) totalLosses++;

        pstGroups[accountName][batchName].members.push({
          id: item.id || item.name,
          name: item.name,
          status: item.status || 'ACTIVE',
          accountName,
          batchName,
          month: item.month || 'January',
          quarter: item.quarter || 'Q1',
          isLoss,
          p: 5,
          a: isLoss ? 1 : 0
        });
      });

      const batchSet = new Set();
      Object.keys(inhouseGroups).forEach(acc => Object.keys(inhouseGroups[acc]).forEach(b => batchSet.add(`IH-${acc}-${b}`)));
      Object.keys(pstGroups).forEach(acc => Object.keys(pstGroups[acc]).forEach(b => batchSet.add(`PST-${acc}-${b}`)));

      const overallAttrition = totalTrainees > 0 ? ((totalLosses / totalTrainees) * 100).toFixed(1) + '%' : '0.0%';

      const transformed = JSON.parse(JSON.stringify(dummyPayload));
      transformed.metrics = {
        totalTrainees,
        overallAttrition,
        activeTrainers,
        classesInSession: batchSet.size
      };
      transformed.allAccounts = Array.from(accountsSet).sort();
      transformed.inhouse.groups = inhouseGroups;
      transformed.pst.groups = pstGroups;
      transformed.summary.trainersSummary = {
        headcount: totalTrainees,
        attendanceRate: '98.5%',
        reliabilityRate: '97.2%',
        attritionRate: overallAttrition,
        totalLosses
      };

      return transformed;
    } catch (err) {
      console.error('Error in getDashboardData:', err);
      return dummyPayload;
    }
  },
  ['dashboard-data-cache-v9'],
  {
    revalidate: 60,
    tags: ['dashboard'],
  }
);

export const getTrainersData = unstable_cache(
  async () => {
    const { data: trainers, error: trainersError } = await supabaseAdmin
      .from('trainers')
      .select('*');

    if (trainersError) {
      console.error('Error fetching trainers:', trainersError);
      return [];
    }

    const { data: trainersProfile, error: profileError } = await supabaseAdmin
      .from('trainers_profile')
      .select('*');

    if (profileError) {
      console.error('Error fetching trainers_profile:', profileError);
    }
    
    // Map employee_num to trainers_profile row to get name, etc.
    const profileMap = new Map();
    if (trainersProfile) {
      for (const p of trainersProfile) {
        if (p.employee_num) {
          profileMap.set(p.employee_num, p);
        }
      }
    }

    // Fetch all attendance records using pagination (Supabase 1000 row limit)
    let allAttendanceData: any[] = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
      const { data, error: attError } = await supabaseAdmin
        .from('trainer_attendance_strat')
        .select('*')
        .order('attendance_date', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (attError) {
        console.error('Error fetching trainer_attendance_strat:', attError);
        break;
      }

      if (data && data.length > 0) {
        allAttendanceData = allAttendanceData.concat(data);
        page++;
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    // Build map using trainer_id as key
    const attendanceMap = new Map();
    if (allAttendanceData.length > 0) {
      for (const row of allAttendanceData) {
        const tId = row.trainer_id;
        if (!tId) continue;

        if (!attendanceMap.has(tId)) {
          attendanceMap.set(tId, {
            timeline: [],
            records: { ABS: [], SL: [], VL: [], BL: [], MED: [], SUS: [], HOL: [], ML: [], PL: [], UND: [] }
          });
        }
        const current = attendanceMap.get(tId);
        
        // Month names
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let monthName = 'Unknown';
        if (row.attendance_month) {
          monthName = monthNames[row.attendance_month - 1] || 'Unknown';
        } else if (row.attendance_date) {
          monthName = monthNames[new Date(row.attendance_date).getMonth()] || 'Unknown';
        }

        // Push record to timeline
        current.timeline.push({
          attendance_id: row.attendance_id,
          trainer_id: tId,
          date: row.attendance_date,
          month: monthName,
          day: row.attendance_day,
          weekday: row.weekday_name,
          status: row.status
        });

        if (row.status && typeof row.status === 'string') {
          const s = row.status.trim().toUpperCase();
          const dText = row.attendance_date;
          
          if (s === 'A' || s.includes('ABS')) current.records.ABS.push(dText);
          else if (s.includes('SL')) current.records.SL.push(dText);
          else if (s.includes('VL')) current.records.VL.push(dText);
          else if (s.includes('BL')) current.records.BL.push(dText);
          else if (s.includes('MED')) current.records.MED.push(dText);
          else if (s.includes('SUS')) current.records.SUS.push(dText);
          else if (s.includes('HOL')) current.records.HOL.push(dText);
          else if (s.includes('ML')) current.records.ML.push(dText);
          else if (s.includes('PL')) current.records.PL.push(dText);
          else if (s.includes('UND') || s.includes('UT')) current.records.UND.push(dText);
        }
      }
    }
    
    if (!trainers) return [];

    // Map DB rows to standard format
    const mapped = trainers.map(t => {
      const profile = profileMap.get(t.employee_num) || {};
      const attRow = attendanceMap.get(t.trainer_id);
      
      let leaves = { absence: 0, sl: 0, vl: 0, bl: 0, med: 0, sus: 0, hol: 0, ml: 0, pl: 0, und: 0, records: {} };
      let attendanceRate = '0.0%';

      if (attRow) {
        leaves = {
          absence: attRow.records.ABS.length,
          sl: attRow.records.SL.length,
          vl: attRow.records.VL.length,
          bl: attRow.records.BL.length,
          med: attRow.records.MED.length,
          sus: attRow.records.SUS.length,
          hol: attRow.records.HOL.length,
          ml: attRow.records.ML.length,
          pl: attRow.records.PL.length,
          und: attRow.records.UND.length,
          records: attRow.records
        };
      }

      // Calculate present, absent, sus, and total losses from true timeline
      let totalPresent = 0;
      let totalLosses = 0;
      let totalAbsent = 0;
      let totalSus = 0;
      let timeline = [];
      let calculatedReliabilityRate = '100.0%';

      if (attRow) {
        timeline = attRow.timeline;
        totalPresent = attRow.timeline.filter((r: any) => (r.status || '').toUpperCase() === 'P').length;
        
        const lossCodes = ['SL', 'VL', 'ML', 'PL', 'SUS', 'MED', 'BL', 'ABS', 'A', 'UND', 'UT'];
        totalLosses = attRow.timeline.filter((r: any) => {
          const s = (r.status || '').toUpperCase();
          return lossCodes.some(lc => s.includes(lc));
        }).length;

        totalAbsent = leaves.absence;
        totalSus = leaves.sus;
        
        // Calculate true attendance rate (Excused leaves like VL, SL, HOL do NOT penalize Attendance Rate)
        const workingDays = attRow.timeline.filter((r: any) => !['RD', 'HOL'].includes((r.status || '').toUpperCase())).length;
        if (workingDays > 0) {
           attendanceRate = `${(((workingDays - leaves.absence) / workingDays) * 100).toFixed(1)}%`;
        }

        const totalEvaluated = totalPresent + totalLosses;
        if (totalEvaluated > 0) {
          calculatedReliabilityRate = `${((totalPresent / totalEvaluated) * 100).toFixed(1)}%`;
        }
      }
      
      const batches = typeof profile.batches === 'string' ? JSON.parse(profile.batches) : (profile.batches || []);

      return {
        id: t.employee_num || Math.random().toString(),
        trainer_id: t.trainer_id,
        name: profile.name || 'Unknown',
        email: profile.gmail_account || '',
        role: t.position || 'UNASSIGNED',
        status: t.status || 'ACTIVE',
        startDate: profile.start_date || t.start_date || 'N/A',
        accounts: profile.accounts || '',
        tasks: t.assigned_task || '',
        attendanceRate: attendanceRate,
        reliabilityRate: calculatedReliabilityRate,
        overallSuccess: (batches && batches.length > 0 && profile.success_rate !== undefined && profile.success_rate !== null) ? `${profile.success_rate}%` : 'N/A',
        leaves: leaves,
        batches: batches,
        timeline: timeline,
        present: totalPresent,
        absent: totalAbsent,
        losses: totalLosses,
        suspension: totalSus
      };
    });

    // Sequence defined by the user
    const roleOrder = [
      'HEAD OF TRAINING',
      'TRAINING COORDINATOR',
      'CORP-TR',
      'PST-RM',
      'PST-BF',
      'SYS-DEV'
    ];

    mapped.sort((a, b) => {
      const idxA = roleOrder.indexOf(a.role.toUpperCase());
      const idxB = roleOrder.indexOf(b.role.toUpperCase());
      
      // If both are in the order list, sort by order
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // If only A is in the list, it comes first
      if (idxA !== -1) return -1;
      // If only B is in the list, it comes first
      if (idxB !== -1) return 1;
      // Otherwise, alphabetical
      return a.role.localeCompare(b.role);
    });

    return mapped;
  },
  ['trainers-data-v4'],
  {
    revalidate: 3600,
    tags: ['trainers']
  }
);
