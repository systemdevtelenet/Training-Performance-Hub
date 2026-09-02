import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  revalidateTag('trainers');
  revalidateTag('dashboard');
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
