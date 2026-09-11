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
  actionUrl?: string;
  sendEmail?: boolean;
  toEmail?: string;
}

/**
 * Distinguishes Training Performance Hub activities from QA Tool evaluations/events
 * since both systems share the same centralized database and notifications table.
 */
function isTrainingLog(row: any): boolean {
  if (!row) return false;
  const title = (row.title || '').toLowerCase();
  const desc = (row.description || '').toLowerCase();
  const url = (row.action_url || '').toLowerCase();

  // 1. Explicitly exclude ALL QA system events, evaluations, and QA employee mutations
  if (
    title.includes('evaluation') ||
    title.includes('calibration') ||
    title.includes('qa ') ||
    title.startsWith('qa') ||
    desc.includes('evaluation for') ||
    desc.includes('submitted by qa') ||
    desc.includes('removed by qas') ||
    desc.includes('added by qas') ||
    desc.includes('qas ray') ||
    desc.includes('qa stephen') ||
    desc.includes('qa josefura') ||
    desc.includes('qa janine') ||
    desc.includes('qa jordan') ||
    url.includes('/evaluation/') ||
    url.includes('guideline=') ||
    url.startsWith('/accounts/')
  ) {
    return false;
  }

  // 2. Explicitly include Training Performance Hub events
  const isTrainingUrl = 
    url.startsWith('/traffic-lights') ||
    url.startsWith('/trainees') ||
    url.startsWith('/trainers') ||
    url.startsWith('/history') ||
    url.startsWith('/settings') ||
    url.startsWith('/analytics') ||
    url === '/';

  const isTrainingContent =
    title.includes('traffic light') ||
    title.includes('login') ||
    title.includes('trainee') ||
    title.includes('trainer') ||
    title.includes('remark') ||
    title.includes('attendance') ||
    title.includes('reliability') ||
    title.includes('export') ||
    title.includes('hub') ||
    title.includes('training') ||
    title.includes('employee profile');

  return isTrainingUrl || isTrainingContent;
}

/**
 * Automatically purges older Training Performance Hub notifications from the database
 * keeping only the latest 10 rows to prevent database bloat.
 */
async function pruneOldLogs() {
  try {
    const { data: allNotifs } = await supabaseAdmin
      .from('notifications')
      .select('notification_id, title, action_url, description, created_at')
      .order('created_at', { ascending: false });

    const trainingNotifs = (allNotifs || []).filter(isTrainingLog);

    if (trainingNotifs.length > 10) {
      const excessIds = trainingNotifs.slice(10).map(r => r.notification_id);
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
}

export async function logActivity({ title, description, iconType, author, actionUrl, sendEmail, toEmail }: LogPayload) {
  try {
    const authorStr = author || 'Authorized Manager';
    const computedActionUrl = actionUrl || (title.toLowerCase().includes('traffic') ? '/traffic-lights' : '/history');

    // 1. Insert into notifications table
    try {
      const { error: notifError } = await supabaseAdmin.from('notifications').insert([
        {
          recipient_employee_id: 516,
          title,
          description: description.includes(authorStr) ? description : `${description} (by ${authorStr})`,
          action_url: computedActionUrl
        }
      ]);
      if (notifError) console.warn('Notification log insert warning:', notifError.message);
    } catch (e: any) {
      console.warn('Notification log error:', e.message);
    }

    // 2. AUTO-PRUNE: Immediately enforce 10-log maximum limit in the database
    await pruneOldLogs();

    // 3. Automatically send email notification to Gmail if marked as alert or explicitly requested
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
    // 1. Auto-prune database logs beyond 10 items
    await pruneOldLogs();

    // 2. Fetch latest notifications
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error in getActivityLogs:', error);
      return { data: [], error: error.message };
    }

    // 3. Strictly filter to Training Performance Hub activities only (never QA evaluations/logs)
    const trainingLogs = (data || []).filter(isTrainingLog).slice(0, Math.min(limit, 10));

    return { data: trainingLogs, error: null };
  } catch (e: any) {
    console.error('Error in getActivityLogs catch:', e);
    return { data: [], error: e.message };
  }
}

