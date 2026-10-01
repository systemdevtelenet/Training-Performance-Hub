import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: List all pending offboarding requests for Admins
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('traffic_light_metrics')
      .select('*')
      .ilike('source_table', 'offboard_pending::%')
      .order('metric_date', { ascending: false });

    if (error) {
      console.error('Error fetching offboarding requests:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const requests = (data || []).map((row: any) => {
      let parsedRemarks: any = {};
      try {
        parsedRemarks = JSON.parse(row.remarks || '{}');
      } catch (e) {
        parsedRemarks = { raw: row.remarks };
      }

      return {
        id: row.metric_id,
        sourceKey: row.source_table,
        traineeName: parsedRemarks.traineeName || row.source_table.replace('offboard_pending::', ''),
        trainingType: parsedRemarks.trainingType || 'PST',
        batchName: parsedRemarks.batchName || '',
        accountName: parsedRemarks.accountName || row.account || 'General',
        assignedTrainer: parsedRemarks.assignedTrainer || parsedRemarks.requestedBy || 'Trainer',
        status: parsedRemarks.status || 'RESIGNED',
        departureDate: parsedRemarks.departureDate || row.metric_date,
        reasonCategory: parsedRemarks.reasonCategory || 'Standard separation',
        remarks: parsedRemarks.remarks || '',
        requestedBy: parsedRemarks.requestedBy || parsedRemarks.assignedTrainer || 'Trainer',
        requestedAt: parsedRemarks.requestedAt || row.metric_date
      };
    });

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Submit offboarding request (Trainer) or execute immediate offboarding (Admin)
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
      isTrainerRequest,
      author
    } = body;

    if (!traineeName || !traineeName.trim()) {
      return NextResponse.json({ error: 'Trainee name is required' }, { status: 400 });
    }

    const cleanName = traineeName.trim();
    const cleanStatus = status || 'RESIGNED';
    const isPst = (trainingType || '').toUpperCase().includes('PST');
    const targetTable = isPst ? 'product_spec_training' : 'inhouse';
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanDeparture = departureDate || todayStr;
    const trainerName = assignedTrainer && assignedTrainer !== 'Unassigned' ? assignedTrainer : (author || 'Trainer');

    // 1. IF REQUESTED BY TRAINER: Route for Admin Approval
    if (isTrainerRequest) {
      const sourceKey = `offboard_pending::${cleanName.toLowerCase().replace(/\s+/g, '_')}`;
      const payloadDetails = {
        traineeName: cleanName,
        trainingType: isPst ? 'PST' : 'INHOUSE',
        batchName: batchName || '',
        accountName: accountName || 'General',
        assignedTrainer: trainerName,
        status: cleanStatus,
        departureDate: cleanDeparture,
        reasonCategory: reasonCategory || 'Standard separation',
        remarks: remarks || '',
        requestedBy: trainerName,
        requestedAt: new Date().toISOString()
      };

      // 1. Delete any existing pending request for this trainee
      await supabase.from('traffic_light_metrics').delete().eq('source_table', sourceKey);

      // 2. Insert new pending request record
      const { error: reqError } = await supabase.from('traffic_light_metrics').insert({
        source_table: sourceKey,
        metric_group: 'offboard_pending',
        metric_date: cleanDeparture,
        traffic_status: 'Pending Approval',
        remarks: JSON.stringify(payloadDetails)
      });

      if (reqError) {
        console.error('Error saving pending offboard request:', reqError);
        return NextResponse.json({ error: reqError.message }, { status: 500 });
      }

      // Log notification specifically alerting Administration
      await logActivity({
        title: `Offboarding Approval Requested: ${cleanName}`,
        description: `Trainer ${trainerName} requested offboarding for ${cleanName} (${cleanStatus} - ${reasonCategory || 'Separation'}). Admin approval required.`,
        iconType: 'alert',
        author: trainerName,
        actionUrl: '/trainees'
      });

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: `Offboarding request for ${cleanName} submitted to Administration for approval.`
      });
    }

    // 2. IF DIRECT ADMIN ACTION: Immediately finalize offboarding
    const fullRemarks = [
      remarks?.trim() ? `[Offboarding]: ${remarks.trim()}` : `[Offboarding]: Trainee separated (${cleanStatus})`,
      reasonCategory ? `Reason: ${reasonCategory}` : null,
      departureDate ? `Effective Date: ${cleanDeparture}` : null
    ].filter(Boolean).join(' | ');

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

    const { error: traineeError } = await updateQuery;
    if (traineeError) {
      console.error('Error updating trainee status on direct offboard:', traineeError);
    }

    // Clean up any pending request from traffic_light_metrics
    const pendingKey = `offboard_pending::${cleanName.toLowerCase().replace(/\s+/g, '_')}`;
    await supabase.from('traffic_light_metrics').delete().eq('source_table', pendingKey);

    // Update traffic_light_metrics offboard status
    try {
      const formattedMetricStatus = cleanStatus === 'TERMINATED' ? 'Terminated' :
                                    cleanStatus === 'RESIGNED' ? 'Resigned' :
                                    cleanStatus === 'ACCOUNT REMOVED' ? 'Account Removed' :
                                    cleanStatus === 'FAILED' ? 'Terminated' : 'Resigned';

      const accountGroup = (accountName || 'general').toLowerCase().trim();
      const currentYear = new Date().getFullYear();
      const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${currentYear}`;
      const sourceKey = `${accountGroup}::${currentQuarter.toLowerCase().replace(' ', '')}::${cleanName}::offboard_status`;

      await supabase.from('traffic_light_metrics').delete().eq('source_table', sourceKey);
      await supabase.from('traffic_light_metrics').insert({
        source_table: sourceKey,
        metric_group: accountGroup,
        metric_date: cleanDeparture,
        traffic_status: formattedMetricStatus,
        remarks: fullRemarks
      });
    } catch (metricErr) {
      console.error('Error updating traffic_light_metrics for offboarding:', metricErr);
    }

    // Log Activity by Admin
    const adminAuthor = (author && author !== 'Training Team') ? author : 'Nissi';
    await logActivity({
      title: `Trainee Offboarded: ${cleanName}`,
      description: `Offboarded as ${cleanStatus} (${reasonCategory || 'Standard separation'}). Effective: ${cleanDeparture}.`,
      iconType: 'alert',
      author: adminAuthor
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
      pendingApproval: false,
      data: {
        name: cleanName,
        status: cleanStatus,
        departureDate: cleanDeparture,
        reasonCategory,
        remarks: fullRemarks
      }
    });
  } catch (err: any) {
    console.error('Offboard error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Admin Approves or Declines a pending offboarding request
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action, traineeName, adminName, requestData } = body;
    const actingAdmin = adminName || 'Admin';

    if (!traineeName) {
      return NextResponse.json({ error: 'Trainee name is required' }, { status: 400 });
    }

    const cleanName = traineeName.trim();
    const pendingKey = `offboard_pending::${cleanName.toLowerCase().replace(/\s+/g, '_')}`;
    const dataToApply = requestData || {};
    const requestedTrainer = dataToApply.requestedBy || dataToApply.assignedTrainer || 'Trainer';

    if (action === 'decline') {
      await supabase.from('traffic_light_metrics').delete().eq('source_table', pendingKey);

      await logActivity({
        title: `Offboarding Declined: ${cleanName}`,
        description: `Offboarding request for ${cleanName} submitted by Trainer ${requestedTrainer} was reviewed and declined by ${actingAdmin}.`,
        iconType: 'alert',
        author: actingAdmin,
        actionUrl: '/trainees'
      });

      return NextResponse.json({
        success: true,
        message: `Offboarding request for ${cleanName} has been declined.`
      });
    }

    // Action: Approve
    const trainingType = dataToApply.trainingType || 'PST';
    const isPst = (trainingType || '').toUpperCase().includes('PST');
    const targetTable = isPst ? 'product_spec_training' : 'inhouse';
    const cleanStatus = dataToApply.status || 'RESIGNED';
    const cleanDeparture = dataToApply.departureDate || new Date().toISOString().split('T')[0];

    // 1. Update Trainee Table
    const updatePayload: any = { status: cleanStatus };
    let updateQuery = supabase.from(targetTable).update(updatePayload).eq('name', cleanName);
    if (isPst && dataToApply.batchName) {
      const cleanWave = parseInt(`${dataToApply.batchName}`.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(cleanWave)) updateQuery = updateQuery.eq('wave', cleanWave);
    }
    await updateQuery;

    // 2. Remove pending request
    await supabase.from('traffic_light_metrics').delete().eq('source_table', pendingKey);

    // 3. Log Activity notifying trainer and team
    await logActivity({
      title: `Offboarding Approved: ${cleanName}`,
      description: `Offboarding request for ${cleanName} submitted by Trainer ${requestedTrainer} has been approved and finalized (${cleanStatus} - ${dataToApply.reasonCategory || 'Standard separation'}) by ${actingAdmin}.`,
      iconType: 'alert',
      author: actingAdmin,
      actionUrl: '/trainees'
    });

    try {
      revalidateTag('trainees');
      revalidateTag('dashboard');
      revalidatePath('/trainees');
      revalidatePath('/traffic-lights');
      revalidatePath('/');
    } catch (e) {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Offboarding for ${cleanName} approved and finalized by ${actingAdmin}.`
    });
  } catch (err: any) {
    console.error('Error approving/declining offboarding:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

