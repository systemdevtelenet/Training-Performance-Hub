import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*');

  if (error) {
    console.error('Failed to load accounts:', error);
    return NextResponse.json({ error: 'Unable to load accounts.' }, { status: 500 });
  }

  const accounts = (data || []).map((row: any) => ({
    account_id: row.account_id,
    account_name: String(row.account_name ?? row.name ?? row.account ?? row.account_code ?? '').trim(),
  })).filter((row: any) => row.account_id != null && row.account_name);

  return NextResponse.json({ accounts });
}
