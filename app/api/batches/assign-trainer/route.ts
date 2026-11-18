import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { authorizeAdminRequest } from '@/lib/auth/access';
import { getTrainingTraineeRecords } from '@/lib/training-data';

const { url, key } = getSupabaseServerConfig();
const supabase = createClient(url, key, { auth: { persistSession: false } });
const training = supabase.schema('trainingHub_system');
const normalize = (value: unknown) => String(value || '').toLowerCase().replace(/^batch\s*/i, '').replace(/[^a-z0-9]/g, '');

export async function POST(req: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const batchName = String(body.batchName || '').trim();
    const accountName = String(body.accountName || '').trim();
    const trainerName = String(body.newTrainer || '').trim();
    if (!batchName || !trainerName) return NextResponse.json({ error: 'Batch and trainer are required.' }, { status: 400 });
    const { data: trainer, error: trainerError } = await supabase.from('employees').select('id, employee_name').ilike('employee_name', trainerName).maybeSingle();
    if (trainerError) throw trainerError;
    if (!trainer) return NextResponse.json({ error: `Trainer "${trainerName}" was not found.` }, { status: 404 });

    const roster = await getTrainingTraineeRecords(supabase);
    const track = String(body.trainingType || '').toUpperCase().includes('PST') ? 'PST' : 'INHOUSE';
    const rows = roster.filter((row) => normalize(row.batchName) === normalize(batchName)
      && normalize(row.accountName) === normalize(accountName)
      && row.trainingType === track);
    if (!rows.length) return NextResponse.json({ error: 'No active trainee enrollments matched that batch and account.' }, { status: 404 });

    const now = new Date().toISOString();
    for (const row of rows) {
      const { error: endError } = await training.from('trainer_assignments_api').update({ ended_at: now }).eq('enrollment_id', row.enrollmentId).is('ended_at', null);
      if (endError) throw endError;
      const { error: insertError } = await training.from('trainer_assignments_api').insert({ enrollment_id: row.enrollmentId, trainer_employee_id: trainer.id });
      if (insertError) throw insertError;
    }
    revalidatePath('/');
    revalidatePath('/trainees');
    revalidatePath('/trainers');
    return NextResponse.json({ success: true, assignedCount: rows.length, trainer: trainer.employee_name });
  } catch (error: any) {
    console.error('Batch trainer assignment failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to assign trainer.' }, { status: 400 });
  }
}
