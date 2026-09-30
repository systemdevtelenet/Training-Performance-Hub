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
    const {
      traineeName,
      trainingType,
      batchName,
      accountName,
      assignedTrainer,
      status,
      departureDate,
      reasonCategory,
      remarks,
      clearanceChecked
    } = body;

    if (!traineeName || !traineeName.trim()) {
      return NextResponse.json({ error: 'Trainee name is required' }, { status: 400 });
    }

    const cleanName = traineeName.trim();
    const cleanStatus = status || 'RESIGNED';
    const isPst = (trainingType || '').toUpperCase().includes('PST');
    const targetTable = isPst ? 'product_spec_training' : 'inhouse';

    const fullRemarks = [
      remarks?.trim() ? `[Offboarding]: ${remarks.trim()}` : `[Offboarding]: Trainee separated (${cleanStatus})`,
      reasonCategory ? `Reason: ${reasonCategory}` : null,
      departureDate ? `Effective Date: ${departureDate}` : null
    ].filter(Boolean).join(' | ');

    // 1. Update Inhouse / PST table status and notes
    const updatePayload: any = {
      status: cleanStatus
    };

    let updateQuery = supabase.from(targetTable).update(updatePayload).eq('name', cleanName);

    if (isPst && batchName) {
      const cleanWave = parseInt(`${batchName}`.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(cleanWave)) updateQuery = updateQuery.eq('wave', cleanWave);
    } else if (!isPst && batchName) {
      const parsedBatch = parseInt(`${batchName}`.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedBatch)) updateQuery = updateQuery.eq('batch', parsedBatch);
    }

    const { data: updatedTrainee, error: traineeError } = await updateQuery.select();

    if (traineeError) {
      console.error('Error updating trainee status on offboard:', traineeError);
    }

    // 2. Automatically synchronize status into traffic_light_metrics so Traffic Lights immediately reflects it
    try {
      const formattedMetricStatus = cleanStatus === 'TERMINATED' ? 'Terminated' :
                                    cleanStatus === 'RESIGNED' ? 'Resigned' :
                                    cleanStatus === 'ACCOUNT REMOVED' ? 'Account Removed' :
                                    cleanStatus === 'FAILED' ? 'Terminated' : 'Resigned';

      const accountGroup = (accountName || 'general').toLowerCase().trim();
      const currentYear = new Date().getFullYear();
      const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${currentYear}`;
      const sourceKey = `${accountGroup}::${currentQuarter.toLowerCase().replace(' ', '')}::${cleanName}::offboard_status`;

      // Log metric or remark
      await supabase.from('traffic_light_metrics').upsert({
        account: accountGroup,
        quarter: currentQuarter,
        source_table: sourceKey,
        metric_group: accountGroup,
        value: formattedMetricStatus,
        remarks: fullRemarks
      }, { onConflict: 'source_table' });
    } catch (metricErr) {
      console.error('Error updating traffic_light_metrics for offboarding:', metricErr);
    }

    // 3. Log Activity
    await logActivity({
      title: `Trainee Offboarded: ${cleanName}`,
      description: `Offboarded as ${cleanStatus} (${reasonCategory || 'Standard separation'}). Effective: ${departureDate || 'Today'}.`,
      iconType: 'alert',
      author: assignedTrainer && assignedTrainer !== 'Unassigned' ? assignedTrainer : 'Training Operations'
    });

    try {
      revalidateTag('trainees');
      revalidateTag('dashboard');
      revalidatePath('/trainees');
      revalidatePath('/traffic-lights');
      revalidatePath('/');
    } catch (e) {
      // Non-blocking in static generation
    }

    return NextResponse.json({
      success: true,
      data: {
        name: cleanName,
        status: cleanStatus,
        departureDate,
        reasonCategory,
        remarks: fullRemarks
      }
    });
  } catch (err: any) {
    console.error('Offboard error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
