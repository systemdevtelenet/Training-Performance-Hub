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

type IconType = 'alert' | 'export' | 'user' | 'success' | 'system';

interface LogPayload {
  title: string;
  description: string;
  iconType: IconType;
  author: string;
}

export async function logActivity({ title, description, iconType, author }: LogPayload) {
  try {
    const { error } = await supabaseAdmin.from('activity_logs').insert([
      {
        title,
        description,
        icon_type: iconType,
        author,
      }
    ]);

    if (error) {
      console.error('Failed to log activity:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error logging activity:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
