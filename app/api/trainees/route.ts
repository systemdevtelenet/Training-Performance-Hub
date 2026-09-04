import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// POST: Add new trainee
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, trainingType, batchName, accountName, assignedTrainer, status, month, quarter } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const isPst = trainingType === 'PST';
    const targetTable = isPst ? 'product_spec_training' : 'inhouse';

    let payload: any = {
      name,
      status: status || 'ACTIVE',
      month: month || 'January',
      quarter: quarter || 'Q1',
    };

    if (isPst) {
      payload.wave = batchName ? batchName.replace(/Wave\s*/i, '') : '1';
      payload.account = accountName || 'General';
      payload.assigned_trainer = assignedTrainer || 'Unassigned';
    } else {
      payload.batch = batchName ? parseInt(batchName.replace(/General\s*-\s*/i, '')) || 1 : 1;
      payload.acount = accountName || 'General';
    }

    const { data, error } = await supabase.from(targetTable).insert([payload]).select();

    if (error) {
      console.error('Error inserting trainee:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update existing trainee
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, trainingType, batchName, accountName, assignedTrainer, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Trainee ID is required' }, { status: 400 });
    }

    const isPst = trainingType === 'PST';
    const targetTable = isPst ? 'product_spec_training' : 'inhouse';

    let payload: any = {};
    if (name) payload.name = name;
    if (status) payload.status = status;

    if (isPst) {
      if (batchName) payload.wave = batchName.replace(/Wave\s*/i, '');
      if (accountName) payload.account = accountName;
      if (assignedTrainer) payload.assigned_trainer = assignedTrainer;
    } else {
      if (batchName) payload.batch = parseInt(batchName.replace(/General\s*-\s*/i, '')) || 1;
      if (accountName) payload.acount = accountName;
    }

    const { data, error } = await supabase
      .from(targetTable)
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating trainee:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove trainee
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) {
      return NextResponse.json({ error: 'Trainee ID is required' }, { status: 400 });
    }

    const targetTable = type === 'PST' ? 'product_spec_training' : 'inhouse';

    const { error } = await supabase.from(targetTable).delete().eq('id', id);

    if (error) {
      console.error('Error deleting trainee:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
