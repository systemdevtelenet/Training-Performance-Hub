import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/auth/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await authorizeAdminRequest();
  if (!access.ok) return access.response;
  revalidateTag('trainers');
  revalidateTag('dashboard');
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
