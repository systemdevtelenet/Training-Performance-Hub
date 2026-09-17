import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// POST: Add new trainee (supports both single & bulk entries)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Check if bulk addition
    const rawList: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body.trainees)
      ? body.trainees
      : [body];

    if (!rawList || rawList.length === 0) {
      return NextResponse.json({ error: 'No trainee data provided' }, { status: 400 });
    }

    const inhousePayloads: any[] = [];
    const pstPayloads: any[] = [];
    const insertedRecords: any[] = [];

    for (const item of rawList) {
      const { name, trainingType, batchName, accountName, assignedTrainer, status, month, quarter } = item;
      if (!name || !name.trim()) continue;

      const isPst = trainingType === 'PST';
      const cleanName = name.trim();
      const cleanStatus = status || 'ACTIVE';
      const cleanMonth = month || 'September';
      const cleanQuarter = quarter || 'Q3';
      const cleanTrainer = assignedTrainer || 'Unassigned';
      const cleanAccount = accountName || 'General';

      if (isPst) {
        const rawWave = batchName ? `${batchName}`.replace(/Wave\s*/i, '').replace(/.*-\s*/, '').replace(/[^0-9]/g, '').trim() : '1';
        const cleanWave = parseInt(rawWave, 10) || 1;
        pstPayloads.push({
          name: cleanName,
          status: cleanStatus,
          month: cleanMonth,
          quarter: cleanQuarter,
          wave: cleanWave,
          account: cleanAccount,
          assigned_trainer: cleanTrainer
        });
      } else {
        const rawBatch = batchName ? `${batchName}`.replace(/General\s*-\s*/i, '').replace(/[^0-9]/g, '').trim() : '1';
        const parsedBatch = parseInt(rawBatch, 10) || 1;
        inhousePayloads.push({
          name: cleanName,
          status: cleanStatus,
          month: cleanMonth,
          quarter: cleanQuarter,
          batch: parsedBatch,
          acount: cleanAccount
        });
      }
    }

    if (inhousePayloads.length === 0 && pstPayloads.length === 0) {
      return NextResponse.json({ error: 'Valid trainee name is required for all entries' }, { status: 400 });
    }

    // Insert Inhouse Trainees
    if (inhousePayloads.length > 0) {
      const { data, error } = await supabase.from('inhouse').insert(inhousePayloads).select();
      if (error) {
        console.error('Error inserting inhouse trainees:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (data) insertedRecords.push(...data);
    }

    // Insert PST Trainees
    if (pstPayloads.length > 0) {
      const { data, error } = await supabase.from('product_spec_training').insert(pstPayloads).select();
      if (error) {
        console.error('Error inserting PST trainees:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (data) insertedRecords.push(...data);
    }

    const totalCount = inhousePayloads.length + pstPayloads.length;
    const isSingle = totalCount === 1;
    const firstItem = rawList[0];

    await logActivity({
      title: isSingle ? 'Trainee Enrolled' : `Bulk Trainees Enrolled (${totalCount})`,
      description: isSingle
        ? `Enrolled new trainee ${firstItem.name} into ${firstItem.batchName || firstItem.trainingType || 'Training'} (${firstItem.accountName || 'General'}).`
        : `Bulk enrolled ${totalCount} trainees across training cohorts with assigned trainers.`,
      iconType: 'user',
      author: isSingle && firstItem.assignedTrainer && firstItem.assignedTrainer !== 'Unassigned'
        ? firstItem.assignedTrainer
        : 'Training Team'
    });

    try {
      revalidateTag('trainees');
      revalidatePath('/trainees');
      revalidatePath('/');
    } catch (e) {
      // Ignore in static/non-edge context
    }

    return NextResponse.json({
      success: true,
      count: totalCount,
      data: isSingle ? insertedRecords[0] : insertedRecords
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update existing trainee
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, originalName, name, trainingType, batchName, accountName, assignedTrainer, status, isEndorsed } = body;
    const targetName = originalName || name;

    if (!targetName && !id) {
      return NextResponse.json({ error: 'Trainee name or ID is required' }, { status: 400 });
    }

    const isPst = trainingType === 'PST';
    const targetTable = isPst ? 'product_spec_training' : 'inhouse';

    let payload: any = {};
    if (name) payload.name = name;
    if (status) payload.status = status;

    const isNowEndorsed = isEndorsed !== undefined ? Boolean(isEndorsed) : (status || '').toUpperCase() === 'ENDORSED';

    if (isPst) {
      if (batchName) payload.wave = batchName.replace(/Wave\s*/i, '').replace(/.*-\s*/, '').trim();
      if (accountName) payload.account = accountName;
      if (assignedTrainer) payload.assigned_trainer = assignedTrainer;
      if (isNowEndorsed) payload.endorsed_date = new Date().toISOString().split('T')[0];
    } else {
      if (batchName) payload.batch = parseInt(batchName.replace(/General\s*-\s*/i, '')) || 1;
      if (accountName) payload.acount = accountName;
      if (isNowEndorsed) payload.endorsed_date = new Date().toISOString().split('T')[0];
    }

    let query = supabase.from(targetTable).update(payload);
    query = query.eq('name', targetName);

    const { data, error } = await query.select();

    if (error) {
      console.error('Error updating trainee:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logTitle = isNowEndorsed ? 'Trainee Endorsed' : 'Trainee Record Updated';
    const logDesc = isNowEndorsed 
      ? `Officially endorsed trainee ${name || targetName} to Operations / Next Cohort.` 
      : `Updated trainee record for ${name || targetName}${status ? ` (Status: ${status})` : ''}.`;

    await logActivity({
      title: logTitle,
      description: logDesc,
      iconType: isNowEndorsed ? 'success' : 'user',
      author: assignedTrainer && assignedTrainer !== 'Unassigned' ? assignedTrainer : 'Training Team'
    });

    try {
      revalidateTag('trainees');
      revalidatePath('/trainees');
      revalidatePath('/');
    } catch (e) {
      // Ignore in static/non-edge context
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove trainee
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const rawName = searchParams.get('name') || id;
    const type = searchParams.get('type') || '';
    const batch = searchParams.get('batch') || '';
    const account = searchParams.get('account') || '';

    if (!rawName) {
      return NextResponse.json({ error: 'Trainee identifier is required' }, { status: 400 });
    }

    const cleanName = rawName.trim();
    const isPst = type.toUpperCase().includes('PST') || type.toUpperCase().includes('PRODUCT');
    const targetTable = isPst ? 'product_spec_training' : 'inhouse';

    let query = supabase.from(targetTable).delete().eq('name', cleanName);

    if (isPst) {
      if (batch) {
        const cleanWave = parseInt(`${batch}`.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(cleanWave)) query = query.eq('wave', cleanWave);
      }
      if (account && account !== 'All' && account !== 'General') {
        query = query.ilike('account', `%${account.trim()}%`);
      }
    } else {
      if (batch) {
        const parsedBatch = parseInt(`${batch}`.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsedBatch)) query = query.eq('batch', parsedBatch);
      }
      if (account && account !== 'All' && account !== 'General') {
        query = query.ilike('acount', `%${account.trim()}%`);
      }
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting trainee:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
      title: 'Trainee Removed',
      description: `Removed trainee ${cleanName} from ${type || (isPst ? 'PST Training' : 'Inhouse Training')}.`,
      iconType: 'alert',
      author: 'Training Team'
    });

    try {
      revalidateTag('trainees');
      revalidateTag('dashboard');
      revalidatePath('/trainees');
      revalidatePath('/');
    } catch (e) {
      // Non-blocking in static generation
    }

    return NextResponse.json({ success: true, name: cleanName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
