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
    
    if (!trainers) return [];

    // Map DB rows to standard format
    const mapped = trainers.map(t => ({
      id: t.employee_num || Math.random().toString(),
      name: t.name || 'Unknown',
      role: t.position || 'UNASSIGNED',
      status: t.status || 'ACTIVE',
      startDate: t.start_date || 'N/A',
      accounts: t.accounts || '',
      tasks: t.assigned_task || '',
      attendanceRate: t.attendance_rate ? `${t.attendance_rate}%` : '0.0%',
      reliabilityRate: t.reliability_rate ? `${t.reliability_rate}%` : '0.0%',
      overallSuccess: t.success_rate ? `${t.success_rate}%` : '0.0%',
      // We will parse leaves/batches if they exist, or provide defaults
      leaves: typeof t.leaves === 'string' ? JSON.parse(t.leaves) : (t.leaves || { absence: 0, sl: 0, vl: 0, bl: 0, med: 0, sus: 0, hol: 0, ml: 0, pl: 0 }),
      batches: typeof t.batches === 'string' ? JSON.parse(t.batches) : (t.batches || [])
    }));

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
  ['trainers-data-v3'],
  {
    revalidate: 3600,
    tags: ['trainers']
  }
);
