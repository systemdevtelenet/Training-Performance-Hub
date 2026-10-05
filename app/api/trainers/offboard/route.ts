import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { isTrainerMatch } from '@/lib/analytics-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LOSS_STATUSES = ['RESIGNED', 'TERMINATED', 'FAILED', 'AWOL', 'ACCOUNT REMOVED', 'LOSS', 'ATTRITION'];

// GET: Fetch list of trainers with their active trainee count and pending handovers
export async function GET() {
  try {
    const { data: tpList } = await supabase.from('trainers_profile').select('*');
    const { data: empList } = await supabase.from('employees').select('*');
    const { data: pstData } = await supabase.from('product_spec_training').select('name, wave, account, assigned_trainer, status');
    const { data: inhData } = await supabase.from('inhouse').select('name, batch, acount, account, status');
    const { data: asgData } = await supabase
      .from('traffic_light_metrics')
      .select('source_table, traffic_status')
      .eq('metric_group', 'trainee_trainer_assignment');
    const { data: offboardHistory } = await supabase
      .from('traffic_light_metrics')
      .select('*')
      .ilike('source_table', 'trainer_offboard::%')
      .order('metric_date', { ascending: false });

    // Assignment map
    const asgMap = new Map<string, string>();
    (asgData || []).forEach((row: any) => {
      if (row.source_table?.startsWith('assignment::') && row.traffic_status) {
        asgMap.set(row.source_table.replace('assignment::', '').trim().toLowerCase(), row.traffic_status.trim());
      }
    });

    // Helper to test if trainee is active (not a loss)
    const isTraineeActive = (status?: string) => {
      const s = (status || '').toUpperCase();
      return !LOSS_STATUSES.some(ls => s.includes(ls));
    };

    // Aggregate unique trainers
    const trainersMap = new Map<string, any>();

    (tpList || []).forEach(tp => {
      const name = (tp.name || '').trim();
      if (!name) return;
      const isResigned = (tp.status || '').toUpperCase() === 'RESIGNED';
      trainersMap.set(name.toLowerCase(), {
        name,
        email: tp.gmail_account && tp.gmail_account !== 'mail' ? tp.gmail_account : tp.thunderbird_account || '',
        status: isResigned ? 'RESIGNED' : (tp.status || 'ACTIVE').toUpperCase(),
        position: tp.position || 'Trainer',
        employeeNum: tp.employee_num || '',
        accounts: tp.accounts || '',
        activeTraineeCount: 0,
        activeBatches: new Set<string>()
      });
    });

    // Also check employees table for trainers
    (empList || []).forEach(emp => {
      const name = (emp.employee_name || '').trim();
      if (!name) return;
      const lower = name.toLowerCase();
      const isResigned = emp.status_id === 3 || (emp.status_name || '').toUpperCase() === 'RESIGNED';
      const existing = trainersMap.get(lower);
      if (existing) {
        if (!existing.email && emp.employee_email) existing.email = emp.employee_email;
        if (isResigned) existing.status = 'RESIGNED';
      } else {
        const isTrainerRole = emp.role_id === 10 || (emp.role_name || '').toUpperCase().includes('TRAIN');
        if (isTrainerRole) {
          trainersMap.set(lower, {
            name,
            email: emp.employee_email || '',
            status: isResigned ? 'RESIGNED' : 'ACTIVE',
            position: emp.role_name || 'Trainer',
            employeeNum: emp.employee_code || '',
            accounts: '',
            activeTraineeCount: 0,
            activeBatches: new Set<string>()
          });
        }
      }
    });

    // Count active trainees for each trainer in PST
    (pstData || []).forEach(p => {
      if (!isTraineeActive(p.status)) return;
      const cleanTrainee = (p.name || '').trim().toLowerCase();
      const trainer = asgMap.get(cleanTrainee) || (p.assigned_trainer || '').trim();
      if (!trainer) return;

      for (const [tKey, tObj] of Array.from(trainersMap.entries())) {
        if (isTrainerMatch(trainer, tObj.name)) {
          tObj.activeTraineeCount++;
          if (p.wave) tObj.activeBatches.add(`PST Wave ${p.wave} (${p.account || 'Gen'})`);
          break;
        }
      }
    });

    // Count active trainees for each trainer in Inhouse
    (inhData || []).forEach(inh => {
      if (!isTraineeActive(inh.status)) return;
      const cleanTrainee = (inh.name || '').trim().toLowerCase();
      const trainer = asgMap.get(cleanTrainee);
      if (!trainer) return;

      for (const [tKey, tObj] of Array.from(trainersMap.entries())) {
        if (isTrainerMatch(trainer, tObj.name)) {
          tObj.activeTraineeCount++;
          if (inh.batch) tObj.activeBatches.add(`In-House Batch ${inh.batch} (${inh.account || inh.acount || 'Gen'})`);
          break;
        }
      }
    });

    const allTrainersList = Array.from(trainersMap.values()).map(t => ({
      ...t,
      activeBatches: Array.from(t.activeBatches)
    }));

    const activeTrainers = allTrainersList.filter(t => t.status !== 'RESIGNED');
    const resignedTrainers = allTrainersList.filter(t => t.status === 'RESIGNED');

    // Parse offboard history logs
    const history = (offboardHistory || []).map((row: any) => {
      let parsed = {};
      try {
        parsed = JSON.parse(row.remarks || '{}');
      } catch (e) {
        parsed = { raw: row.remarks };
      }
      return {
        id: row.metric_id,
        trainerName: row.source_table?.replace('trainer_offboard::', '') || 'Unknown',
        date: row.metric_date,
        details: parsed
      };
    });

    return NextResponse.json({
      success: true,
      activeTrainers,
      resignedTrainers,
      allTrainers: allTrainersList,
      history
    });
  } catch (err: any) {
    console.error('Error in GET /api/trainers/offboard:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Execute trainer resignation and active batch/trainee handover
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      trainerName,
      trainerEmail,
      replacementTrainer,
      departureDate,
      reasonCategory,
      remarks,
      reassignActiveTrainees = true,
      revokeAccess = true,
      adminName = 'Super Admin'
    } = body;

    if (!trainerName || !trainerName.trim()) {
      return NextResponse.json({ success: false, error: 'Trainer name is required.' }, { status: 400 });
    }

    const cleanTrainer = trainerName.trim();
    const cleanReplacement = (replacementTrainer || '').trim();
    const today = new Date().toISOString().split('T')[0];
    const cleanDate = departureDate || today;
    const cleanReason = reasonCategory || 'Voluntary Resignation';
    const cleanRemarks = remarks || '';

    // 1. Identify active trainees currently mapped to this trainer
    let reassignedCount = 0;

    if (reassignActiveTrainees && cleanReplacement && cleanReplacement !== 'Unassigned') {
      // (a) Reassign in traffic_light_metrics assignment map
      const { data: assignments } = await supabase
        .from('traffic_light_metrics')
        .select('*')
        .eq('metric_group', 'trainee_trainer_assignment');

      const matchesToUpdate: any[] = [];
      (assignments || []).forEach((row: any) => {
        if (row.traffic_status && isTrainerMatch(row.traffic_status, cleanTrainer)) {
          matchesToUpdate.push(row);
        }
      });

      for (const m of matchesToUpdate) {
        await supabase
          .from('traffic_light_metrics')
          .update({
            traffic_status: cleanReplacement,
            remarks: JSON.stringify({
              previousTrainer: cleanTrainer,
              reassignedAt: new Date().toISOString(),
              reassignedBy: adminName,
              reason: `Trainer ${cleanTrainer} resigned`
            })
          })
          .eq('metric_id', m.metric_id);
        reassignedCount++;
      }

      // (b) Reassign in product_spec_training table
      const { data: pstRows } = await supabase
        .from('product_spec_training')
        .select('name, assigned_trainer, status');

      const pstToUpdate: string[] = [];
      (pstRows || []).forEach((p: any) => {
        const isLoss = LOSS_STATUSES.some(ls => (p.status || '').toUpperCase().includes(ls));
        if (!isLoss && p.assigned_trainer && isTrainerMatch(p.assigned_trainer, cleanTrainer)) {
          pstToUpdate.push(p.name);
        }
      });

      for (const name of pstToUpdate) {
        await supabase
          .from('product_spec_training')
          .update({ assigned_trainer: cleanReplacement })
          .eq('name', name);
        reassignedCount++;
      }

      // (c) Reassign in onboarding_trainees table (if exists)
      try {
        const { data: onbRows } = await supabase
          .from('onboarding_trainees')
          .select('name, assignedTrainer, isLoss');

        const onbToUpdate: string[] = [];
        (onbRows || []).forEach((o: any) => {
          if (!o.isLoss && o.assignedTrainer && isTrainerMatch(o.assignedTrainer, cleanTrainer)) {
            onbToUpdate.push(o.name);
          }
        });

        for (const name of onbToUpdate) {
          await supabase
            .from('onboarding_trainees')
            .update({ assignedTrainer: cleanReplacement })
            .eq('name', name);
        }
      } catch (e) {
        // Safe skip if table does not exist
      }
    }

    // 2. Update Trainer Profile Status to RESIGNED in trainers_profile
    try {
      await supabase
        .from('trainers_profile')
        .update({
          status: 'RESIGNED'
        })
        .ilike('name', `%${cleanTrainer}%`);
    } catch (e) {
      console.warn('Error updating trainers_profile status:', e);
    }

    // 3. Update in employees table (status_id = 3 is Resigned)
    try {
      await supabase
        .from('employees')
        .update({
          status_id: 3
        })
        .ilike('employee_name', `%${cleanTrainer}%`);
    } catch (e) {
      console.warn('Error updating employees status:', e);
    }

    // 4. Update in trainers table (if present)
    try {
      await supabase
        .from('trainers')
        .update({
          status: 'RESIGNED'
        })
        .ilike('name', `%${cleanTrainer}%`);
    } catch (e) {
      // Ignore if trainers table not populated
    }

    // 5. Revoke / Demote Role Access if requested
    const targetEmail = trainerEmail?.trim().toLowerCase();
    if (revokeAccess && targetEmail) {
      try {
        // Demote in user_roles so trainer loses privileged portal access
        await supabase
          .from('user_roles')
          .delete()
          .ilike('email', targetEmail);
      } catch (e) {
        console.warn('Error revoking user_roles access for trainer:', e);
      }
    }

    // 6. Record Archival in traffic_light_metrics
    const archiveKey = `trainer_offboard::${cleanTrainer.toLowerCase().replace(/\s+/g, '_')}`;
    const archivePayload = {
      trainerName: cleanTrainer,
      trainerEmail: targetEmail || null,
      departureDate: cleanDate,
      reasonCategory: cleanReason,
      remarks: cleanRemarks,
      replacementTrainer: cleanReplacement || 'None',
      reassignedCount,
      reassignActiveTrainees,
      revokeAccess,
      offboardedBy: adminName,
      offboardedAt: new Date().toISOString()
    };

    await supabase.from('traffic_light_metrics').upsert([{
      source_table: archiveKey,
      metric_group: 'trainer_offboard',
      traffic_status: 'RESIGNED',
      metric_date: cleanDate,
      account: 'Training Ops',
      remarks: JSON.stringify(archivePayload)
    }], { onConflict: 'source_table' });

    // 7. Audit Log in activity_logs
    await logActivity({
      title: 'Trainer Offboarded & Handover Complete',
      description: `Admin ${adminName} offboarded Trainer ${cleanTrainer} (Reason: ${cleanReason}). ${
        reassignedCount > 0 
          ? `Reassigned ${reassignedCount} active trainees/batches to ${cleanReplacement}.` 
          : 'No active trainees required reassignment.'
      } Status updated to RESIGNED.`,
      iconType: 'user',
      author: adminName
    });

    // 8. Revalidate all relevant cache tags and paths
    try {
      revalidateTag('employees');
      revalidateTag('trainees');
      revalidatePath('/employees');
      revalidatePath('/trainers');
      revalidatePath('/trainees');
      revalidatePath('/');
    } catch (e) {
      // safe ignore in static contexts
    }

    return NextResponse.json({
      success: true,
      message: `Trainer ${cleanTrainer} successfully offboarded and archived.`,
      reassignedCount,
      replacementTrainer: cleanReplacement || null
    });
  } catch (err: any) {
    console.error('Error in POST /api/trainers/offboard:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
