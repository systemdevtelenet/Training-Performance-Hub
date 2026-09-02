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
    // Fetch live data from the 'inhouse' and 'product_spec_training' tables
    const { data: inhouseData, error: inhouseError } = await supabase
      .from('inhouse')
      .select('*');

    const { data: pstData, error: pstError } = await supabase
      .from('product_spec_training')
      .select('*');

    if (inhouseError || pstError) {
      console.error('Error fetching data from Supabase:', inhouseError || pstError);
      // Fallback to dummy payload if DB fails
      return dummyPayload; 
    }

    // Deep copy as base
    const transformed = JSON.parse(JSON.stringify(dummyPayload)); 
    
    // Grouping for Inhouse (Account is "General", Batch is "-1", "-2", etc. based on the 'batch' column)
    if (inhouseData && inhouseData.length > 0) {
      const groups: any = {};
      for (const item of inhouseData) {
        const accountName = 'General';
        const batchName = item.batch ? `-${item.batch}` : '-Unassigned';
        
        if (!groups[accountName]) {
          groups[accountName] = {};
        }
        if (!groups[accountName][batchName]) {
          groups[accountName][batchName] = { members: [] };
        }
        groups[accountName][batchName].members.push(item);
      }
      transformed.inhouse.groups = groups;
    } else {
      transformed.inhouse.groups = {};
    }

    // Grouping for PST (Leaving it as is for now, using item.accountName and item.batchName)
    if (pstData && pstData.length > 0) {
      const groups: any = {};
      for (const item of pstData) {
        const accountName = item.accountName || 'Unassigned Account';
        const batchName = item.batchName || 'Unassigned Batch';
        
        if (!groups[accountName]) {
          groups[accountName] = {};
        }
        if (!groups[accountName][batchName]) {
          groups[accountName][batchName] = { members: [] };
        }
        groups[accountName][batchName].members.push(item);
      }
      transformed.pst.groups = groups;
    } else {
      transformed.pst.groups = {};
    }
    
    return transformed;
  },
  ['dashboard-data-cache-v6'],
  {
    revalidate: 3600,
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

      // Calculate present, absent, sus from true timeline
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalSus = 0;
      let timeline = [];
      if (attRow) {
        timeline = attRow.timeline;
        totalPresent = attRow.timeline.filter((r: any) => r.status?.toUpperCase() === 'P').length;
        totalAbsent = leaves.absence;
        totalSus = leaves.sus;
        
        // Calculate true attendance rate
        const workingDays = attRow.timeline.filter((r: any) => !['RD', 'HOL'].includes(r.status?.toUpperCase())).length;
        if (workingDays > 0) {
           attendanceRate = `${((totalPresent / workingDays) * 100).toFixed(1)}%`;
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
        startDate: t.start_date || 'N/A',
        accounts: profile.accounts || '',
        tasks: t.assigned_task || '',
        attendanceRate: attendanceRate,
        reliabilityRate: profile.reliability_rate ? `${profile.reliability_rate}%` : '0.0%',
        overallSuccess: profile.success_rate ? `${profile.success_rate}%` : '0.0%',
        leaves: leaves,
        batches: batches,
        timeline: timeline,
        present: totalPresent,
        absent: totalAbsent,
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
