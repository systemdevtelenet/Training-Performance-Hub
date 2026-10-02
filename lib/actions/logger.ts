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

type IconType = 'alert' | 'export' | 'user' | 'success' | 'system' | 'trainer' | 'remark' | 'attendance' | 'traffic' | 'login' | 'activity';

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
    title.includes('offboard') ||
    title.includes('approval') ||
    title.includes('remark') ||
    title.includes('note') ||
    title.includes('reason') ||
    title.includes('attendance') ||
    title.includes('reliability') ||
    title.includes('export') ||
    title.includes('hub') ||
    title.includes('training') ||
    title.includes('employee profile') ||
    desc.includes('attendance') ||
    desc.includes('note') ||
    desc.includes('reason');

  return isTrainingUrl || isTrainingContent;
}

/**
 * Automatically purges older Training Performance Hub notifications from the database
 * keeping latest logs to prevent database bloat.
 */
async function pruneOldLogs() {
  try {
    const { data: allNotifs } = await supabaseAdmin
      .from('notifications')
      .select('notification_id, title, action_url, description, created_at')
      .order('created_at', { ascending: false });

    const trainingNotifs = (allNotifs || []).filter(isTrainingLog);

    if (trainingNotifs.length > 50) {
      const excessIds = trainingNotifs.slice(50).map(r => r.notification_id);
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
    const authorStr = author && author !== 'Admin' && author !== 'System' && author !== 'Authorized Manager' && author !== 'Authorized User'
      ? author
      : 'Admin';
    const computedActionUrl = actionUrl || (title.toLowerCase().includes('traffic') ? '/traffic-lights' : '/trainers?tab=calendar');

    // Dynamically resolve all Admin recipient employee IDs without hardcoding
    let recipientIds: number[] = [];
    try {
      // 1. Fetch admin emails from user_roles
      const { data: adminRoles } = await supabaseAdmin
        .from('user_roles')
        .select('email, role')
        .in('role', ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN']);

      const adminEmails = (adminRoles || [])
        .map(r => r.email?.toLowerCase().trim())
        .filter(Boolean);

      if (adminEmails.length > 0) {
        const { data: emps } = await supabaseAdmin
          .from('employees')
          .select('employee_id, employee_email')
          .in('employee_email', adminEmails);

        (emps || []).forEach(e => {
          const id = Number(e.employee_id);
          if (!isNaN(id) && id > 0 && !recipientIds.includes(id)) {
            recipientIds.push(id);
          }
        });
      }

      // 2. Also check employees table directly for admin role_ids (e.g. 5, 9)
      const { data: directAdmins } = await supabaseAdmin
        .from('employees')
        .select('employee_id')
        .in('role_id', [5, 9]);

      if (directAdmins && directAdmins.length > 0) {
        directAdmins.forEach(e => {
          const id = Number(e.employee_id);
          if (!isNaN(id) && id > 0 && !recipientIds.includes(id)) {
            recipientIds.push(id);
          }
        });
      }
    } catch (adminFetchErr) {
      console.warn('Dynamic admin lookup warning:', adminFetchErr);
    }

    // 3. Fallback: dynamically pick existing recipient_employee_id from notifications or employees table
    if (recipientIds.length === 0) {
      try {
        const { data: fallbackNotif } = await supabaseAdmin
          .from('notifications')
          .select('recipient_employee_id')
          .not('recipient_employee_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fallbackNotif && fallbackNotif.length > 0 && fallbackNotif[0].recipient_employee_id) {
          recipientIds.push(Number(fallbackNotif[0].recipient_employee_id));
        } else {
          const { data: anyEmp } = await supabaseAdmin
            .from('employees')
            .select('employee_id')
            .limit(1);
          if (anyEmp && anyEmp[0]?.employee_id) {
            recipientIds.push(Number(anyEmp[0].employee_id));
          }
        }
      } catch (fbErr) {}
    }

    const finalDescription = description.includes(authorStr)
      ? description
      : `${description} (by ${authorStr})`;

    // 1. Insert into notifications table for each resolved admin
    if (recipientIds.length > 0) {
      const notifRows = recipientIds.map(rId => ({
        recipient_employee_id: rId,
        title,
        description: finalDescription,
        action_url: computedActionUrl
      }));

      try {
        const { error: notifError } = await supabaseAdmin.from('notifications').insert(notifRows);
        if (notifError) console.warn('Notification log insert warning:', notifError.message);
      } catch (e: any) {
        console.warn('Notification log error:', e.message);
      }
    }

    // 2. Also insert into activity_logs table for realtime event subscribers and history log
    try {
      await supabaseAdmin.from('activity_logs').insert([
        {
          title,
          description: finalDescription,
          icon_type: iconType || 'attendance',
          author: authorStr
        }
      ]);
    } catch (actErr: any) {
      // Non-fatal if table schema differs
    }

    // 3. AUTO-PRUNE: Keep database clean
    await pruneOldLogs();

    // 4. Automatically send email notification if alert or explicitly requested
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
    const trainingLogs = (data || []).filter(isTrainingLog).slice(0, Math.min(limit, 50));

    return { data: trainingLogs, error: null };
  } catch (e: any) {
    console.error('Error in getActivityLogs catch:', e);
    return { data: [], error: e.message };
  }
}

