import TraineesClient from './TraineesClient';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TraineesPage() {
  // Use a random cache buster or order to prevent Next.js from caching empty arrays from earlier
  const timestamp = Date.now();
  const { data: inhouseData, error: err1 } = await supabase.from('INHOUSE').select('*').order('NAME', { ascending: true });
  const { data: pstData, error: err2 } = await supabase.from('PST').select('*').order('NAME', { ascending: true });

  if (err1) console.error('Error fetching INHOUSE:', err1);
  if (err2) console.error('Error fetching PST:', err2);

  // Map INHOUSE rows to Trainee type
  const mappedInhouse = (inhouseData || []).map((row: any) => ({
    id: row.id || Math.random().toString(),
    name: row.NAME || 'Unknown',
    status: row.STATUS || 'Inhouse',
    month: row.MONTH || '',
    quarter: row.QUARTER || '',
    p: 0, // Calculate later based on days
    a: 0,
    isEndorsed: row['ENDORSED DATE'] ? true : false,
    isLoss: row.STATUS === 'LOSS' || row.STATUS === 'ATTRITION',
    assignedTrainer: 'Unassigned',
    batchName: row.BATCH ? `Batch ${row.BATCH}` : 'Inhouse Batch',
    accountName: row.ACCOUNT || 'General',
    trainingType: 'INHOUSE' as const
  }));

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

    return {
      id: row.id || Math.random().toString(),
      name: row.NAME || 'Unknown',
      status: row.STATUS || 'PST',
      month: row.MONTH || '',
      quarter: row.QUARTER || '',
      p: pCount,
      a: aCount,
      isEndorsed: row['ENDORSED DATE'] ? true : false,
      isLoss: row.STATUS === 'LOSS' || row.STATUS === 'ATTRITION',
      assignedTrainer: row['ASSIGNED TRAINER'] || 'Unassigned',
      batchName: row.WAVE ? `Wave ${row.WAVE}` : 'PST Wave',
      accountName: row.ACCOUNT || 'PST Account',
      trainingType: 'PST' as const
    };
  });

  const combinedTrainees = [...mappedInhouse, ...mappedPst];

  return <TraineesClient initialTrainees={combinedTrainees} />;
}
