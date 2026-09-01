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
    const { data: trainers, error } = await supabaseAdmin
      .from('trainers_profile')
      .select('*');

    if (error) {
      console.error('Error fetching trainers_profile:', error);
      return [];
    }

    const { data: attendanceData, error: attError } = await supabaseAdmin
      .from('trainers_attendance_strat')
      .select('*');

    if (attError) {
      console.error('Error fetching trainers_attendance_strat:', attError);
    }
    
    const attendanceMap = new Map();
    if (attendanceData) {
      let currentHeader: any = null;
      const daysCols = [
        'thursday', 'friday', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday',
        'thursday_1', 'friday_1', 'saturday_1', 'sunday_1', 'monday_1', 'tuesday_1', 'wednesday_1',
        'thursday_2', 'friday_2', 'saturday_2', 'sunday_2', 'monday_2', 'tuesday_2', 'wednesday_2',
        'thursday_3', 'friday_3', 'saturday_3', 'sunday_3', 'monday_3', 'tuesday_3', 'wednesday_3',
        'thursday_4', 'friday_4', 'saturday_4'
      ];

      for (const row of attendanceData) {
        // Detect header row by checking if name is missing but thursday has a date-like string
        if (!row.name && row.thursday && typeof row.thursday === 'string' && row.thursday.trim().length > 0) {
          currentHeader = row;
        } else if (row.name) {
          const name = row.name.trim();
          if (!attendanceMap.has(name)) {
            attendanceMap.set(name, {
              absent: 0,
              suspension: 0,
              runningRates: [],
              timeline: [],
              records: { ABS: [], SL: [], VL: [], BL: [], MED: [], SUS: [], HOL: [], ML: [], PL: [], UND: [] }
            });
          }
          const current = attendanceMap.get(name);
          
          if (row.running && row.running.includes('%')) {
             current.runningRates.push(parseFloat(row.running));
          }

          if (currentHeader) {
            // Determine month from the first available day in the header
            let monthName = 'Unknown';
            let quarterName = 'Q1';
            const firstDate = currentHeader.thursday || currentHeader.monday || currentHeader.tuesday || '';
            if (firstDate && typeof firstDate === 'string') {
              const mMatch = firstDate.trim().toUpperCase().match(/^[A-Z]{3,}/);
              if (mMatch) {
                const mStr = mMatch[0];
                if (['JAN', 'FEB', 'MAR'].includes(mStr)) { quarterName = 'Q1'; }
                else if (['APR', 'MAY', 'JUN'].includes(mStr)) { quarterName = 'Q2'; }
                else if (['JUL', 'AUG', 'SEP'].includes(mStr)) { quarterName = 'Q3'; }
                else if (['OCT', 'NOV', 'DEC'].includes(mStr)) { quarterName = 'Q4'; }
                
                const monthMap: Record<string, string> = { JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April', MAY: 'May', JUN: 'June', JUL: 'July', AUG: 'August', SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December' };
                monthName = monthMap[mStr] || mStr;
              }
            }

            // Push to timeline for this row
            const pres = parseInt(row.actual || row.present) || 0;
            const abs = parseInt(row.absent) || 0;
            const sus = parseInt(row.suspension) || 0;
            current.timeline.push({
              name: name,
              month: monthName,
              quarter: quarterName,
              p: pres,
              a: abs,
              sus: sus,
              rate: row.running || '0%'
            });

            for (const col of daysCols) {
              const status = row[col];
              const dateText = currentHeader[col];
              if (status && dateText && typeof status === 'string') {
                const s = status.trim().toUpperCase();
                const dText = dateText.trim();
                
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
        }
      }
    }
    
    if (!trainers) return [];

    // Map DB rows to standard format
    const mapped = trainers.map(t => {
      const attRow = attendanceMap.get(t.name?.trim());
      
      let leaves = typeof t.leaves === 'string' ? JSON.parse(t.leaves) : (t.leaves || { absence: 0, sl: 0, vl: 0, bl: 0, med: 0, sus: 0, hol: 0, ml: 0, pl: 0, und: 0, records: {} });
      let attendanceRate = t.attendance_rate ? `${t.attendance_rate}%` : '0.0%';

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
        // For attendanceRate, fallback to trainers_profile if runningRates is empty
        if (attRow.runningRates.length > 0) {
           const avg = attRow.runningRates.reduce((a: number, b: number) => a + b, 0) / attRow.runningRates.length;
           attendanceRate = `${avg.toFixed(1)}%`;
        }
      }

      // Calculate present from timeline or fallback to 0
      let totalPresent = 0;
      let timeline = [];
      if (attRow) {
        timeline = attRow.timeline;
        totalPresent = attRow.timeline.reduce((sum: number, r: any) => sum + (r.p || 0), 0);
      }
      
      return {
        id: t.employee_num || Math.random().toString(),
        name: t.name || 'Unknown',
        email: t.gmail_account || '',
        role: t.position || 'UNASSIGNED',
        status: t.status || 'ACTIVE',
        startDate: t.start_date || 'N/A',
        accounts: t.accounts || '',
        tasks: t.assigned_task || '',
        attendanceRate: attendanceRate,
        reliabilityRate: t.reliability_rate ? `${t.reliability_rate}%` : '0.0%',
        overallSuccess: t.success_rate ? `${t.success_rate}%` : '0.0%',
        leaves: leaves,
        batches: typeof t.batches === 'string' ? JSON.parse(t.batches) : (t.batches || []),
        timeline: timeline,
        present: totalPresent
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
