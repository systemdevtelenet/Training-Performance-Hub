'use server';

import { createClient } from '@supabase/supabase-js';

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
    const file = formData.get('file') as File | null;
    const employeeId = (formData.get('employeeId') as string) || '1597';
    const email = (formData.get('email') as string) || '';
    const name = (formData.get('name') as string) || '';

    if (!file) {
      return { success: false, error: 'No image file provided' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitizedId = employeeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = file.name ? file.name.split('.').pop() || 'png' : 'png';
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

    // Sync avatar URL to database tables (trainers_profile & employees)
    try {
      if (email) {
        await supabase.from('trainers_profile').update({ profile_pic: publicUrl }).eq('gmail_account', email);
        await supabase.from('employees').update({ avatar_url: publicUrl }).eq('employee_email', email);
      }
      if (employeeId) {
        await supabase.from('trainers_profile').update({ profile_pic: publicUrl }).eq('employee_num', employeeId);
        await supabase.from('employees').update({ avatar_url: publicUrl }).eq('employee_code', employeeId);
      }
      if (name) {
        await supabase.from('trainers_profile').update({ profile_pic: publicUrl }).ilike('name', `%${name}%`);
        await supabase.from('employees').update({ avatar_url: publicUrl }).ilike('employee_name', `%${name}%`);
      }
      if (email?.includes('nreguero') || name?.toLowerCase().includes('nissi') || employeeId === '1597') {
        await supabase.from('trainers_profile').update({ profile_pic: publicUrl }).ilike('name', '%Nissi%');
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

export async function deleteAvatar(avatarUrl: string, employeeId?: string, email?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (avatarUrl) {
      const parts = avatarUrl.split('/avatar/');
      if (parts.length > 1) {
        const fileName = parts[1].split('?')[0];
        await supabase.storage.from('avatar').remove([fileName]);
      }
    }

    // Clear avatar from database records
    try {
      if (email) {
        await supabase.from('trainers_profile').update({ profile_pic: null }).eq('gmail_account', email);
        await supabase.from('employees').update({ avatar_url: null }).eq('employee_email', email);
      }
      if (employeeId) {
        await supabase.from('trainers_profile').update({ profile_pic: null }).eq('employee_num', employeeId);
        await supabase.from('employees').update({ avatar_url: null }).eq('employee_code', employeeId);
      }
      if (email?.includes('nreguero') || employeeId === '1597') {
        await supabase.from('trainers_profile').update({ profile_pic: null }).ilike('name', '%Nissi%');
      }
    } catch (clearErr) {
      console.warn('Could not clear avatar from database records:', clearErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteAvatar exception:', err);
    return { success: false, error: err.message || 'Failed to remove avatar' };
  }
}
