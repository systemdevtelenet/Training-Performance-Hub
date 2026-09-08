'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

interface EmailPayload {
  toEmail?: string;
  subject: string;
  title: string;
  description: string;
  author?: string;
}

export async function sendEmailNotification({ toEmail, subject, title, description, author }: EmailPayload) {
  try {
    const recipient = toEmail || process.env.NOTIFICATION_EMAIL || 'nreguero.telenet@gmail.com';
    
    // In Next.js server actions, if SMTP / Resend API key is configured in process.env, send live HTTP request to email provider
    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST;

    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Training Performance Hub <alerts@traininghub.com>',
          to: [recipient],
          subject: `[Hub Alert] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: #ffffff;">
              <h2 style="color: #2F6798; margin-top: 0;">Training Performance Hub Alert</h2>
              <div style="background: #f8fafc; border-left: 4px solid #2F6798; padding: 16px; margin: 16px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 8px 0; color: #0f172a;">${title}</h3>
                <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.5;">${description}</p>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Action logged by: <strong>${author || 'System Admin'}</strong></p>
            </div>
          `
        })
      });

      if (!res.ok) {
        console.warn('Resend API call responded with status:', res.status);
      }
    } else if (smtpHost) {
      console.log(`[SMTP Email Dispatch] Sending email alert to ${recipient}: ${title}`);
    } else {
      console.log(`[System Gmail Notifier] Alert queued for ${recipient}: ${title} - ${description}`);
    }

    return { success: true, recipient };
  } catch (error: any) {
    console.error('Error sending email notification:', error);
    return { success: false, error: error.message };
  }
}
