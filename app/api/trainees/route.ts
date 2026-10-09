import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { getTraineesData } from '@/lib/data-fetcher';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Retrieve fresh trainee records across Inhouse and PST with trainer assignments
export async function GET() {
  try {
    const trainees = await getTraineesData();
    return NextResponse.json({
      success: true,
      count: trainees.length,
      data: trainees
    });
  } catch (err: any) {
    console.error('Error fetching trainees:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new trainee (supports both single & bulk entries)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reqRole = (body.role || body.userRole || '').toUpperCase();
    const isTrainerRequest = reqRole === 'TRAINER' || body.isTrainer === true;
    const rawAdmin = (body.actingAdmin || body.author || body.userName || body.trainerName || '').trim();
    
    // Check if bulk addition
    const rawList: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body.trainees)
      ? body.trainees
      : [body];

    if (!rawList || rawList.length === 0) {
      return NextResponse.json({ error: 'No trainee data provided' }, { status: 400 });
    }

    const firstItem = rawList[0];
    const firstTrainer = firstItem?.assignedTrainer && firstItem?.assignedTrainer !== 'Unassigned'
      ? firstItem.assignedTrainer.trim()
      : null;

    // Resolve author: If trainer or trainer request, use trainer's name dynamically.
    let actingAdmin = rawAdmin && rawAdmin !== 'Admin' && rawAdmin !== 'System'
      ? rawAdmin
      : null;

    if (!actingAdmin) {
      if (isTrainerRequest && firstTrainer) {
        actingAdmin = firstTrainer;
      } else if (firstTrainer && (isTrainerRequest || !rawAdmin)) {
        actingAdmin = firstTrainer;
      } else {
        actingAdmin = isTrainerRequest ? (firstTrainer || 'Trainer') : 'Admin';
      }
    }

    const inhousePayloads: any[] = [];
    const pstPayloads: any[] = [];
    const insertedRecords: any[] = [];
    const assignmentsToPersist: Array<{
      cleanName: string;
      cleanTrainer: string;
      cleanAccount: string;
      cleanBatch: string;
      isPst: boolean;
    }> = [];

    for (const item of rawList) {
      const { name, trainingType, batchName, accountName, assignedTrainer, status, month, quarter } = item;
      if (!name || !name.trim()) continue;

      const isPst = trainingType === 'PST';
      const cleanName = name.trim();
      const cleanStatus = status || 'ACTIVE';
      const cleanMonth = month || 'September';
      const cleanQuarter = quarter || 'Q3';
      const cleanTrainer = (assignedTrainer || '').trim() || 'Unassigned';
      const cleanAccount = (accountName || '').trim() || 'General';
      const cleanBatch = (batchName || '').trim() || (isPst ? 'Wave 1' : 'General -1');

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

      if (cleanTrainer && cleanTrainer !== 'Unassigned') {
        assignmentsToPersist.push({
          cleanName,
          cleanTrainer,
          cleanAccount,
          cleanBatch,
          isPst
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

    // Persist Trainee-Trainer Assignments to Supabase traffic_light_metrics & Notify Trainers
    for (const assign of assignmentsToPersist) {
      const sourceTable = `trainee_assign::${assign.cleanName.toLowerCase()}`;
      
      // Determine assignment author for this specific trainee
      const assignAuthor = isTrainerRequest
        ? (assign.cleanTrainer && assign.cleanTrainer !== 'Unassigned' ? assign.cleanTrainer : actingAdmin)
        : (actingAdmin || assign.cleanTrainer || 'Admin');

      // Remove any existing assignment record for this trainee
      await supabase
        .from('traffic_light_metrics')
        .delete()
        .eq('metric_group', 'trainee_trainer_assignment')
        .eq('source_table', sourceTable);

      // Insert fresh assignment record
      await supabase
        .from('traffic_light_metrics')
        .insert({
          metric_group: 'trainee_trainer_assignment',
          source_table: sourceTable,
          traffic_status: assign.cleanTrainer,
          remarks: JSON.stringify({
            traineeName: assign.cleanName,
            trainerName: assign.cleanTrainer,
            trainingType: assign.isPst ? 'PST' : 'INHOUSE',
            batchName: assign.cleanBatch,
            accountName: assign.cleanAccount,
            assignedBy: assignAuthor,
            assignedAt: new Date().toISOString()
          }),
          metric_date: new Date().toISOString().split('T')[0]
        });

      // NOTIFY THE ASSIGNED TRAINER IN-APP
      const notifyDesc = (isTrainerRequest || assignAuthor.toLowerCase() === assign.cleanTrainer.toLowerCase())
        ? `Trainee ${assign.cleanName} has been enrolled in ${assign.cleanBatch} (${assign.cleanAccount}) under Trainer ${assign.cleanTrainer}.`
        : `Trainee ${assign.cleanName} has been enrolled in ${assign.cleanBatch} (${assign.cleanAccount}) and assigned to Trainer ${assign.cleanTrainer}.`;

      await logActivity({
        title: `New Trainee Assigned: ${assign.cleanName}`,
        description: notifyDesc,
        iconType: 'user',
        author: assignAuthor,
        actionUrl: '/trainees'
      });

      // Trainer accounts are derived from trainee assignments and employee assignments.
    }

    const totalCount = inhousePayloads.length + pstPayloads.length;
    const isSingle = totalCount === 1;

    const enrollmentAuthor = isTrainerRequest
      ? (firstItem?.assignedTrainer && firstItem.assignedTrainer !== 'Unassigned' ? firstItem.assignedTrainer : actingAdmin)
      : (actingAdmin || firstItem?.assignedTrainer || 'Admin');

    // General Enrollment Log for Audit / History
    await logActivity({
      title: isSingle ? 'Trainee Enrolled' : `Bulk Trainees Enrolled (${totalCount})`,
      description: isSingle
        ? `Enrolled new trainee ${firstItem.name} into ${firstItem.batchName || firstItem.trainingType || 'Training'} (${firstItem.accountName || 'General'}).`
        : `Bulk enrolled ${totalCount} trainees across training cohorts with assigned trainers.`,
      iconType: 'user',
      author: enrollmentAuthor
    });

    try {
      revalidateTag('trainees');
      revalidateTag('dashboard');
      revalidatePath('/trainees');
      revalidatePath('/trainers');
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
    console.error('Error in trainee POST route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update existing trainee
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, originalName, name, trainingType, batchName, accountName, assignedTrainer, status, isEndorsed, actingAdmin: reqAdmin } = body;
    const targetName = originalName || name;
    const reqRole = (body.role || body.userRole || '').toUpperCase();
    const isTrainerRequest = reqRole === 'TRAINER' || body.isTrainer === true;
    const rawAdmin = (reqAdmin || body.author || body.userName || body.trainerName || '').trim();
    const cleanAssignedTrainer = (assignedTrainer || '').trim();
    const actingAdmin = rawAdmin && rawAdmin !== 'Admin' && rawAdmin !== 'System'
      ? rawAdmin
      : (isTrainerRequest && cleanAssignedTrainer && cleanAssignedTrainer !== 'Unassigned' ? cleanAssignedTrainer : (isTrainerRequest ? 'Trainer' : 'Admin'));

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
      console.error('Error updating trainee in DB:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Persist / update trainee trainer assignment in traffic_light_metrics
    if (assignedTrainer) {
      const cleanTrainer = assignedTrainer.trim();
      const cleanTraineeName = (name || targetName).trim();
      const sourceTable = `trainee_assign::${cleanTraineeName.toLowerCase()}`;

      await supabase
        .from('traffic_light_metrics')
        .delete()
        .eq('metric_group', 'trainee_trainer_assignment')
        .eq('source_table', sourceTable);

      if (cleanTrainer && cleanTrainer !== 'Unassigned') {
        await supabase
          .from('traffic_light_metrics')
          .insert({
            metric_group: 'trainee_trainer_assignment',
            source_table: sourceTable,
            traffic_status: cleanTrainer,
            remarks: JSON.stringify({
              traineeName: cleanTraineeName,
              trainerName: cleanTrainer,
              trainingType: isPst ? 'PST' : 'INHOUSE',
              batchName: batchName || '',
              accountName: accountName || '',
              assignedBy: actingAdmin,
              assignedAt: new Date().toISOString()
            }),
            metric_date: new Date().toISOString().split('T')[0]
          });

        // NOTIFY THE ASSIGNED TRAINER
        await logActivity({
          title: `Trainee Assigned to You: ${cleanTraineeName}`,
          description: `Trainee ${cleanTraineeName} has been assigned to Trainer ${cleanTrainer}.`,
          iconType: 'user',
          author: actingAdmin,
          actionUrl: '/trainees'
        });
      }
    }

    const logTitle = isNowEndorsed ? 'Trainee Endorsed' : 'Trainee Record Updated';
    const logDesc = isNowEndorsed 
      ? `Officially endorsed trainee ${name || targetName} to Operations / Next Cohort.` 
      : `Updated trainee record for ${name || targetName}${status ? ` (Status: ${status})` : ''}.`;

    await logActivity({
      title: logTitle,
      description: logDesc,
      iconType: isNowEndorsed ? 'success' : 'user',
      author: actingAdmin
    });

    try {
      revalidateTag('trainees');
      revalidateTag('dashboard');
      revalidatePath('/trainees');
      revalidatePath('/trainers');
      revalidatePath('/');
    } catch (e) {
      // Ignore in static/non-edge context
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err: any) {
    console.error('Error in trainee PUT route:', err);
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
      console.error('Error deleting trainee from table:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also remove from assignment records
    await supabase
      .from('traffic_light_metrics')
      .delete()
      .eq('metric_group', 'trainee_trainer_assignment')
      .eq('source_table', `trainee_assign::${cleanName.toLowerCase()}`);

    const authorParam = searchParams.get('author') || searchParams.get('userName');
    const authorName = authorParam && authorParam.trim() && authorParam.trim() !== 'Training Team' && authorParam.trim() !== 'Admin' ? authorParam.trim() : 'Admin';

    await logActivity({
      title: 'Trainee Removed',
      description: `Removed trainee ${cleanName} from ${type || (isPst ? 'PST Training' : 'Inhouse Training')}.`,
      iconType: 'alert',
      author: authorName
    });

    try {
      revalidateTag('trainees');
      revalidateTag('dashboard');
      revalidatePath('/trainees');
      revalidatePath('/trainers');
      revalidatePath('/');
    } catch (e) {
      // Non-blocking in static generation
    }

    return NextResponse.json({ success: true, name: cleanName });
  } catch (err: any) {
    console.error('Error in trainee DELETE route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
