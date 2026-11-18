import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { authorizeAdminRequest } from '@/lib/auth/access';

const { url, key } = getSupabaseServerConfig();
const training = createClient(url, key, { auth: { persistSession: false } }).schema('trainingHub_system');

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const id = Number(body.attendance_id);
    const value = String(body.status || '').trim().toUpperCase();
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'A valid attendance ID is required.' }, { status: 400 });
    const mapping: Record<string, { status: string; code: string }> = {
      P: { status: 'PRESENT', code: 'P' }, PRESENT: { status: 'PRESENT', code: 'P' },
      A: { status: 'ABSENT', code: 'A' }, ABS: { status: 'ABSENT', code: 'A' }, ABSENT: { status: 'ABSENT', code: 'A' },
      L: { status: 'PRESENT', code: 'L' }, LATE: { status: 'PRESENT', code: 'L' },
      U: { status: 'PRESENT', code: 'U' }, UNDERTIME: { status: 'PRESENT', code: 'U' },
      SUS: { status: 'SUSPENDED', code: 'SUS' }, SUSPENDED: { status: 'SUSPENDED', code: 'SUS' },
      RD: { status: 'REST_DAY', code: 'RD' }, HOL: { status: 'HOLIDAY', code: 'HOL' },
      EXCUSED: { status: 'EXCUSED', code: 'EXCUSED' },
    };
    const update = mapping[value];
    if (!update) return NextResponse.json({ error: 'Unsupported attendance status.' }, { status: 400 });
    const { data, error } = await training.from('trainer_attendance_api').update({ status: update.status, attendance_code: update.code })
      .eq('trainer_attendance_id', id).select('trainer_attendance_id').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
    revalidatePath('/trainers');
    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Trainer attendance update failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to update attendance.' }, { status: 400 });
  }
}
