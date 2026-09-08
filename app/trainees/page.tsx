import TraineesClient from './TraineesClient';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TraineesPage() {
  // Use a random cache buster or order to prevent Next.js from caching empty arrays from earlier
  const timestamp = Date.now();
  const { data: inhouseData, error: err1 } = await supabase.from('inhouse').select('*').order('name', { ascending: true });
  const { data: pstData, error: err2 } = await supabase.from('product_spec_training').select('*').order('name', { ascending: true });

  if (err1) console.error('Error fetching INHOUSE:', err1);
  if (err2) console.error('Error fetching PST:', err2);

  const isLossStatus = (st?: string) => {
    if (!st) return false;
    const s = st.toUpperCase().trim();
    return ['LOSS', 'ATTRITION', 'EOC', 'AWOL', 'FAILED', 'RESIGNED', 'TERMINATED', 'RED', 'ACCOUNT REMOVED'].some(code => s.includes(code));
  };

  // Map INHOUSE rows to Trainee type
  const mappedInhouse = (inhouseData || []).map((row: any) => {
    const inhouseAttCols = ['NHO', 'MESH', 'comms_day_1', 'comms_day_2', 'comms_day_3'];
    let pCount = 0;
    let aCount = 0;
    for (const col of inhouseAttCols) {
      const val = (row[col] || '').trim().toUpperCase();
      if (val === 'P') pCount++;
      if (val === 'A') aCount++;
    }

    const isLoss = isLossStatus(row.status);

    return {
      id: row.name || Math.random().toString(),
      name: row.name || 'Unknown',
      status: row.status || 'ACTIVE',
      month: row.month || '',
      quarter: row.quarter || '',
      p: pCount,
      a: aCount,
      isEndorsed: row.endorsed_date ? true : (row.status || '').toUpperCase() === 'ENDORSED',
      isLoss,
      assignedTrainer: 'Unassigned',
      batchName: row.batch ? `General -${row.batch}` : 'General -Unassigned',
      accountName: row.account || row.acount || 'General',
      trainingType: 'INHOUSE' as const
    };
  });

  // Map PST rows to Trainee type
  const mappedPst = (pstData || []).map((row: any) => {
    // Count P and A from att_status_day_1 to 62
    let pCount = 0;
    let aCount = 0;
    for (let i = 1; i <= 62; i++) {
      const val = row[`att_status_day_${i}`];
      if (val === 'P') pCount++;
      if (val === 'A') aCount++;
    }

    const acct = (row.account || row.acount || 'PST Account').trim();
    const rawWave = row.wave ? `${row.wave}`.replace(/^(wave\s*)/i, '').trim() : '1';
    const batchName = `${acct} -${rawWave || '1'}`;
    const isLoss = isLossStatus(row.status);

    return {
      id: row.name || Math.random().toString(),
      name: row.name || 'Unknown',
      status: row.status || 'ACTIVE',
      month: row.month || '',
      quarter: row.quarter || '',
      p: pCount,
      a: aCount,
      isEndorsed: row.endorsed_date ? true : (row.status || '').toUpperCase() === 'ENDORSED',
      isLoss,
      assignedTrainer: row.assigned_trainer || 'Unassigned',
      batchName: batchName,
      accountName: acct,
      trainingType: 'PST' as const
    };
  });

  const combinedTrainees = [...mappedInhouse, ...mappedPst];

  return <TraineesClient initialTrainees={combinedTrainees} />;
}
