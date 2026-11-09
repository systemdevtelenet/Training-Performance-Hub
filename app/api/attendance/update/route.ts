import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { authorizeAdminRequest } from '@/lib/auth/access';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  const access = await authorizeAdminRequest();
  if (!access.ok) return access.response;
  try {
    const body = await request.json();
    const { attendance_id, status } = body;

    if (!attendance_id || !status) {
      return NextResponse.json({ error: 'Missing attendance_id or status' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .schema('training_system').from('trainer_attendance_strat')
      .update({ status: status.toUpperCase() })
      .eq('attendance_id', attendance_id);

    if (error) {
      console.error('Failed to update attendance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate the Next.js cache so it updates on next fetch
    revalidateTag('trainers');
    revalidateTag('dashboard');

    await logActivity({
      title: 'Trainer Attendance Updated',
      description: `Attendance record #${attendance_id} updated to status "${status.toUpperCase()}".`,
      iconType: 'trainer',
      author: 'Authorized Admin'
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/attendance/update:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
