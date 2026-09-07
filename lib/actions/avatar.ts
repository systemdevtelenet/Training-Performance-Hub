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
    const employeeId = (formData.get('employeeId') as string) || 'CTN-80429';

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

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    console.error('uploadAvatar exception:', err);
    return { success: false, error: err.message || 'Failed to upload avatar' };
  }
}

export async function deleteAvatar(avatarUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!avatarUrl) return { success: true };

    const parts = avatarUrl.split('/avatar/');
    if (parts.length > 1) {
      const fileName = parts[1].split('?')[0];
      await supabase.storage.from('avatar').remove([fileName]);
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteAvatar exception:', err);
    return { success: false, error: err.message || 'Failed to remove avatar' };
  }
}
