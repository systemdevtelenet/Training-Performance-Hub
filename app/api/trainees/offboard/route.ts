import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { authorizeAdminRequest, authorizeManagementReadRequest, authorizeTrainerOrAdminRequest } from '@/lib/auth/access';
import { getTraineesData } from '@/lib/data-fetcher';
import { isTrainerMatch } from '@/lib/analytics-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: List all pending offboarding requests for Admins
export async function GET() {
  return Response.json({ trainees: [] });
}

// POST: Submit offboarding request (Trainer) or execute immediate offboarding (Admin)
export async function POST(req: Request) {
  return Response.json({ error: "Data storage is temporarily disabled while the schema is being replaced." }, { status: 503 });
}

// PUT: Admin Approves or Declines a pending offboarding request
export async function PUT(req: Request) {
  return Response.json({ error: "Data storage is temporarily disabled while the schema is being replaced." }, { status: 503 });
}

