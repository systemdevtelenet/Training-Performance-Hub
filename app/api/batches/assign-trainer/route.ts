import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batchName, accountName, trainingType, newTrainer, authorName } = body;

    if (!newTrainer) {
      return NextResponse.json({ error: 'New trainer name is required' }, { status: 400 });
    }

    if (!accountName && !batchName) {
      return NextResponse.json({ error: 'Account or batch identifier is required' }, { status: 400 });
    }

    const cleanTrainer = newTrainer.trim();
    let updatedCount = 0;

    // 1. Update in product_spec_training if applicable
    if (!trainingType || trainingType.toUpperCase().includes('PST') || trainingType.toUpperCase().includes('PRODUCT')) {
      let query = supabase.from('product_spec_training').update({ assigned_trainer: cleanTrainer });
      
      if (accountName && accountName !== 'All') {
        query = query.ilike('account', `%${accountName.trim()}%`);
      }
      
      if (batchName) {
        const rawWave = `${batchName}`.replace(/^(wave\s*|batch\s*|.*-\s*)/i, '').trim();
        if (rawWave) {
          query = query.or(`wave.eq.${rawWave},wave.ilike.%${rawWave}%`);
        }
      }

      const { data: pstUpdated, error: pstError } = await query.select();
      if (!pstError && pstUpdated) {
        updatedCount += pstUpdated.length;
      } else if (pstError) {
        console.warn('PST assign trainer warning:', pstError.message);
      }
    }

    // 2. Update in inhouse if applicable
    if (!trainingType || trainingType.toUpperCase().includes('INHOUSE') || trainingType.toUpperCase().includes('DEPT 1')) {
      let query = supabase.from('inhouse').update({ assigned_trainer: cleanTrainer });
      
      if (accountName && accountName !== 'All' && accountName !== 'General') {
        query = query.or(`account.ilike.%${accountName.trim()}%,acount.ilike.%${accountName.trim()}%`);
      }
      
      if (batchName) {
        const parsedBatch = parseInt(`${batchName}`.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsedBatch)) {
          query = query.eq('batch', parsedBatch);
        }
      }

      const { data: inhouseUpdated, error: inhouseError } = await query.select();
      if (!inhouseError && inhouseUpdated) {
        updatedCount += inhouseUpdated.length;
      } else if (inhouseError) {
        console.warn('Inhouse assign trainer warning:', inhouseError.message);
      }
    }

    // 3. Log Activity
    const batchLabel = batchName ? `${accountName || 'Cohort'} - ${batchName}` : (accountName || 'Training Batch');
    await logActivity({
      title: 'Trainer Assigned',
      description: `Assigned trainer ${cleanTrainer} to ${batchLabel}.`,
      iconType: 'user',
      author: authorName || 'Training Admin'
    });

    // 4. Revalidate cache tags and pages
    try {
      revalidateTag('dashboard');
      revalidateTag('trainees');
      revalidateTag('trainers');
      revalidatePath('/');
      revalidatePath('/trainees');
      revalidatePath('/trainers');
    } catch (e) {
      // Non-blocking in static generation
    }

    return NextResponse.json({
      success: true,
      newTrainer: cleanTrainer,
      batchName,
      accountName,
      updatedCount
    });
  } catch (err: any) {
    console.error('Error in assign-trainer route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
