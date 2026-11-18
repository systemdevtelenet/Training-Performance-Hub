'use server';

import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { createClient } from '@supabase/supabase-js';
import { sendEmailNotification } from './email-notifier';
import { APP_PAGE_ROLES, ADMIN_PAGE_ROLES, requireActionRole } from '@/lib/auth/access';

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

const { url, key } = getSupabaseServerConfig();
const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
const training = supabaseAdmin.schema('trainingHub_system');

async function getActorEmployee(email: string) {
  const { data, error } = await supabaseAdmin.from('employees').select('id').ilike('employee_email', email).maybeSingle();
  if (error) throw error;
  return data;
}

export async function logActivity({ title, description, iconType, actionUrl, sendEmail, toEmail }: LogPayload) {
  try {
    const actor = await requireActionRole(APP_PAGE_ROLES);
    const employee = await getActorEmployee(actor.email);
    const now = new Date().toISOString();
    const computedActionUrl = actionUrl || (title.toLowerCase().includes('traffic') ? '/traffic-lights' : '/history');
    const finalDescription = description.includes(actor.name) ? description : `${description} (by ${actor.name})`;

    const { data: activity, error: activityError } = await training.from('activity_logs_api').insert({
      actor_employee_id: employee?.id ?? null,
      event_type: iconType || 'activity',
      summary: title,
      details: { title, description: finalDescription, icon_type: iconType || 'activity', author: actor.name },
      entity_type: 'training_hub',
      action_url: computedActionUrl,
      created_at: now,
    }).select('activity_id').single();
    if (activityError) throw activityError;

    const { data: event, error: eventError } = await training.from('notification_events_api').insert({
      activity_id: activity.activity_id,
      title,
      description: finalDescription,
      action_url: computedActionUrl,
      created_at: now,
    }).select('notification_event_id').single();
    if (eventError) throw eventError;

    if (employee) {
      const { data: roles } = await supabaseAdmin.from('roles').select('role_id, role_name');
      const adminRoleIds = (roles || []).filter((row: any) => /SUPER_ADMIN|HOT_ADMIN|QAS_ADMIN|VIEW_ADMIN|SUPER ADMIN|HOT ADMIN|QAS ADMIN|VIEW ADMIN/i.test(String(row.role_name || '').replace(/[ -]+/g, '_'))).map((row: any) => Number(row.role_id));
      const recipients = adminRoleIds.length
        ? await supabaseAdmin.from('employees').select('id').in('role_id', adminRoleIds)
        : { data: [], error: null };
      if (recipients.error) throw recipients.error;
      const recipientIds = Array.from(new Set((recipients.data || []).map((row: any) => Number(row.id)).filter(Boolean)));
      if (!recipientIds.includes(Number(employee.id))) recipientIds.push(Number(employee.id));
      if (recipientIds.length) {
        const { error } = await training.from('notifications_api').insert(recipientIds.map((recipient_employee_id) => ({ notification_event_id: event.notification_event_id, recipient_employee_id })));
        if (error) throw error;
      }
    }

    if ((sendEmail || iconType === 'alert') && ADMIN_PAGE_ROLES.includes(actor.role)) {
      try { await sendEmailNotification({ toEmail, subject: title, title, description, author: actor.name }); }
      catch (error) { console.error('Error dispatching email alert:', error); }
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error logging activity:', error);
    return { success: false, error: error.message };
  }
}

export async function getActivityLogs(limit = 10) {
  try {
    const actor = await requireActionRole(APP_PAGE_ROLES);
    const employee = await getActorEmployee(actor.email);
    if (!employee) return { data: [], error: null };
    const { data: notifications, error } = await training.from('notifications_api')
      .select('notification_id, notification_event_id, read_at, delivered_at')
      .eq('recipient_employee_id', employee.id)
      .order('delivered_at', { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 10, 1), 50));
    if (error) throw error;
    const eventIds = Array.from(new Set((notifications || []).map((row: any) => Number(row.notification_event_id))));
    if (!eventIds.length) return { data: [], error: null };
    const { data: events, error: eventError } = await training.from('notification_events_api')
      .select('notification_event_id, activity_id, title, description, action_url, created_at').in('notification_event_id', eventIds);
    if (eventError) throw eventError;
    const activityIds = Array.from(new Set((events || []).map((row: any) => Number(row.activity_id)).filter(Boolean)));
    const { data: activities, error: activityError } = activityIds.length
      ? await training.from('activity_logs_api').select('activity_id, event_type, summary, details, actor_employee_id, action_url').in('activity_id', activityIds)
      : { data: [], error: null };
    if (activityError) throw activityError;
    const eventById = new Map((events || []).map((row: any) => [Number(row.notification_event_id), row]));
    const activityById = new Map((activities || []).map((row: any) => [Number(row.activity_id), row]));
    return {
      data: (notifications || []).flatMap((notification: any) => {
        const event: any = eventById.get(Number(notification.notification_event_id));
        if (!event) return [];
        const activity: any = activityById.get(Number(event.activity_id));
        const details = activity?.details || {};
        return [{
          notification_id: notification.notification_id,
          read_at: notification.read_at,
          title: event.title || details.title || activity?.summary || 'Training update',
          description: event.description || details.description || '',
          action_url: event.action_url || activity?.action_url || '',
          created_at: event.created_at || notification.delivered_at,
          author: details.author || '',
          icon_type: details.icon_type || activity?.event_type || 'activity',
        }];
      }),
      error: null,
    };
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    return { data: [], error: error.message };
  }
}
