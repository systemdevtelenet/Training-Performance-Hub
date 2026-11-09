'use server';

import { createClient } from '@supabase/supabase-js';
import { APP_PAGE_ROLES, requireActionRole } from '@/lib/auth/access';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (e) {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});

export async function uploadAvatar(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const actor = await requireActionRole(APP_PAGE_ROLES);
    const file = formData.get('file') as File | null;
    const employeeId = actor.employeeCode;
    const email = actor.email;

    if (!employeeId) return { success: false, error: 'Your profile is not linked to an employee record.' };

    if (!file) {
      return { success: false, error: 'No image file provided' };
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Choose a PNG, JPEG, or WebP image smaller than 5 MB.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
    const fileName = `avatar-${sanitizedId}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('avatar')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('Supabase avatar upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('avatar')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Employees is the single avatar source.
    try {
      if (email) {
        await supabase.from('employees').update({ avatar_url: publicUrl }).eq('employee_email', email);
      }
    } catch (syncErr) {
      console.warn('Could not sync avatar to database records:', syncErr);
    }

    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('uploadAvatar exception:', err);
    return { success: false, error: err.message || 'Failed to upload avatar' };
  }
}

export async function deleteAvatar(avatarUrl: string, _employeeId?: string, email?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireActionRole(APP_PAGE_ROLES);
    const ownEmployeeId = actor.employeeCode;
    if (!ownEmployeeId || (email && email.trim().toLowerCase() !== actor.email)) {
      return { success: false, error: 'You can only remove your own profile photo.' };
    }
    if (avatarUrl) {
      const parsedUrl = new URL(avatarUrl);
      const bucketPrefix = '/storage/v1/object/public/avatar/';
      const fileName = parsedUrl.pathname.includes(bucketPrefix)
        ? decodeURIComponent(parsedUrl.pathname.split(bucketPrefix)[1] || '')
        : '';
      if (fileName && fileName.startsWith(`avatar-${ownEmployeeId}-`)) {
        await supabase.storage.from('avatar').remove([fileName]);
      }
    }

    // Clear avatar from database records
    try {
      await supabase.from('employees').update({ avatar_url: null }).eq('employee_email', actor.email);
    } catch (clearErr) {
      console.warn('Could not clear avatar from database records:', clearErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteAvatar exception:', err);
    return { success: false, error: err.message || 'Failed to remove avatar' };
  }
}
