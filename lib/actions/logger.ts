'use server';

import { createClient } from '@supabase/supabase-js';

// We use the service role key to bypass RLS for logging system actions,
// ensuring users can't tamper with or delete logs if RLS is enabled later.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});

import { sendEmailNotification } from './email-notifier';

type IconType = 'alert' | 'export' | 'user' | 'success' | 'system' | 'trainer';

interface LogPayload {
  title: string;
  description: string;
  iconType: IconType;
  author: string;
  sendEmail?: boolean;
  toEmail?: string;
}

export async function logActivity({ title, description, iconType, author, sendEmail, toEmail }: LogPayload) {
  try {
    const authorStr = author || 'Authorized Manager';

    // 1. Insert into notifications table (active event table in Supabase)
    try {
      const { error: notifError } = await supabaseAdmin.from('notifications').insert([
        {
          recipient_employee_id: 516,
          title,
          description: description.includes(authorStr) ? description : `${description} (by ${authorStr})`,
          action_url: title.toLowerCase().includes('traffic') ? '/traffic-lights' : '/history'
        }
      ]);
      if (notifError) console.warn('Notification log insert warning:', notifError.message);
    } catch (e: any) {
      console.warn('Notification log error:', e.message);
    }

    // 2. Also try writing to activity_logs if table exists
    try {
      await supabaseAdmin.from('activity_logs').insert([
        {
          title,
          description,
          icon_type: iconType,
          author: authorStr,
        }
      ]);
    } catch (_) {}

    // 3. AUTO-PRUNE OLD LOGS: Keep strictly only the latest 10 rows in notifications database
    try {
      const { data: allNotifs } = await supabaseAdmin
        .from('notifications')
        .select('notification_id')
        .order('created_at', { ascending: false });

      if (allNotifs && allNotifs.length > 10) {
        const excessIds = allNotifs.slice(10).map(r => r.notification_id);
        if (excessIds.length > 0) {
          await supabaseAdmin
            .from('notifications')
            .delete()
            .in('notification_id', excessIds);
        }
      }
    } catch (pruneErr) {
      console.warn('Auto-prune old notifications warning:', pruneErr);
    }

    // 4. Automatically send email notification to Gmail if marked as alert or explicitly requested
    if (sendEmail || iconType === 'alert') {
      try {
        await sendEmailNotification({
          toEmail,
          subject: title,
          title,
          description,
          author: authorStr
        });
      } catch (emailErr) {
        console.error('Error dispatching email alert:', emailErr);
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('Error logging activity:', e);
    return { success: false, error: e.message };
  }
}

export async function getActivityLogs(limit = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error in getActivityLogs:', error);
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (e: any) {
    console.error('Error in getActivityLogs catch:', e);
    return { data: [], error: e.message };
  }
}
