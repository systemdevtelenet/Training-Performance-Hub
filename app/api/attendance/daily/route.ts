import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface DailyAttendanceEntry {
  date: string; // YYYY-MM-DD
  traineeName: string;
  batchName?: string;
  accountName?: string;
  trainerName?: string;
  trainingType?: string; // 'INHOUSE' | 'PST'
  attCode?: 'P' | 'L' | 'U' | 'A' | ''; // Present, Late, Undertime, Absent
  status?: string; // 'ONGOING' | 'ENDORSED' | 'EOC' | 'AWOL'
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Generate unique key for a trainee on a specific date
function getRecordKey(date: string, traineeName: string): string {
  return `${date}___${traineeName.trim().toLowerCase()}`;
}

// Read persistent records directly from Supabase traffic_light_metrics
async function fetchDbRecords(): Promise<Record<string, DailyAttendanceEntry>> {
  try {
    const { data, error } = await supabase
      .from('traffic_light_metrics')
      .select('source_table, traffic_status, remarks, metric_date')
      .eq('metric_group', 'daily_attendance');

    if (error) {
      console.error('Error fetching daily attendance from database:', error);
      return {};
    }

    const map: Record<string, DailyAttendanceEntry> = {};
    (data || []).forEach(row => {
      try {
        let entry: DailyAttendanceEntry;
        if (row.remarks && row.remarks.startsWith('{')) {
          entry = JSON.parse(row.remarks);
        } else {
          let tName = '';
          if (row.source_table && row.source_table.includes('::')) {
            tName = row.source_table.split('::')[1];
          }
          entry = {
            date: row.metric_date,
            traineeName: tName,
            attCode: row.traffic_status as any,
            notes: row.remarks || ''
          };
        }
        if (entry.date && entry.traineeName) {
          map[getRecordKey(entry.date, entry.traineeName)] = entry;
        }
      } catch (parseErr) {
        // Skip malformed rows
      }
    });

    return map;
  } catch (e) {
    console.error('fetchDbRecords catch error:', e);
    return {};
  }
}

// GET: Retrieve attendance records for a specific date or range from Supabase
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // e.g. 2026-09-18
    const trainer = searchParams.get('trainer');
    const batch = searchParams.get('batch');

    const allRecords = await fetchDbRecords();
    let recordsList = Object.values(allRecords);

    if (date) {
      recordsList = recordsList.filter(r => r.date === date);
    }
    if (trainer && trainer !== 'All') {
      const qTrainer = trainer.toLowerCase();
      recordsList = recordsList.filter(r => (r.trainerName || '').toLowerCase().includes(qTrainer));
    }
    if (batch && batch !== 'All') {
      const qBatch = batch.toLowerCase();
      recordsList = recordsList.filter(r => (r.batchName || '').toLowerCase().includes(qBatch));
    }

    return NextResponse.json({
      success: true,
      count: recordsList.length,
      data: recordsList,
      map: allRecords
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save or update attendance records, status, and reason notes in Supabase
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, records, updatedBy } = body;

    const rawList: DailyAttendanceEntry[] = Array.isArray(records)
      ? records
      : Array.isArray(body)
      ? body
      : [body];

    if (!rawList || rawList.length === 0) {
      return NextResponse.json({ error: 'No attendance records provided' }, { status: 400 });
    }

    const currentRecords = await fetchDbRecords();
    const timestamp = new Date().toISOString();
    const author = updatedBy || 'Trainer';
    const updatedEntries: DailyAttendanceEntry[] = [];
    const statusUpdatesToSync: Array<{ name: string; status: string; isPst: boolean; isEndorsed: boolean }> = [];

    const dbRowsToInsert: any[] = [];

    for (const item of rawList) {
      const itemDate = item.date || date || new Date().toISOString().split('T')[0];
      const traineeName = item.traineeName;
      if (!traineeName || !traineeName.trim()) continue;

      const cleanName = traineeName.trim();
      const key = getRecordKey(itemDate, cleanName);
      const existing = currentRecords[key] || {};

      const updatedEntry: DailyAttendanceEntry = {
        ...existing,
        ...item,
        date: itemDate,
        traineeName: cleanName,
        updatedAt: timestamp,
        updatedBy: author
      };

      currentRecords[key] = updatedEntry;
      updatedEntries.push(updatedEntry);

      const sourceTable = `${itemDate}::${cleanName.toLowerCase()}`;
      dbRowsToInsert.push({
        metric_group: 'daily_attendance',
        source_table: sourceTable,
        traffic_status: updatedEntry.attCode || 'P',
        remarks: JSON.stringify(updatedEntry),
        metric_date: itemDate
      });

      // If status changed to a lifecycle status, queue DB sync
      if (item.status && item.status !== existing.status) {
        const isPst = (item.trainingType || '').toUpperCase() === 'PST';
        const isEndorsed = (item.status || '').toUpperCase() === 'ENDORSED';
        statusUpdatesToSync.push({
          name: cleanName,
          status: item.status,
          isPst,
          isEndorsed
        });
      }
    }

    // Persist directly to Supabase traffic_light_metrics
    for (const row of dbRowsToInsert) {
      // Delete any prior record for this date and trainee
      await supabase
        .from('traffic_light_metrics')
        .delete()
        .eq('metric_group', 'daily_attendance')
        .eq('source_table', row.source_table);

      // Insert updated record
      const { error: insErr } = await supabase
        .from('traffic_light_metrics')
        .insert(row);

      if (insErr) {
        console.error('Error inserting daily attendance to Supabase:', insErr);
      }
    }

    // Sync status updates to Supabase (inhouse & product_spec_training)
    if (statusUpdatesToSync.length > 0) {
      for (const update of statusUpdatesToSync) {
        const targetTable = update.isPst ? 'product_spec_training' : 'inhouse';
        const payload: any = { status: update.status };
        if (update.isEndorsed) {
          payload.endorsed_date = new Date().toISOString().split('T')[0];
        }

        await supabase
          .from(targetTable)
          .update(payload)
          .eq('name', update.name);
      }
    }

    // Log Activity
    const count = updatedEntries.length;
    const first = updatedEntries[0];
    const logDesc = count === 1
      ? `Updated attendance for ${first.traineeName} on ${first.date} (Tag: ${first.attCode || 'N/A'}, Status: ${first.status || 'Ongoing'}${first.notes ? `, Note: "${first.notes}"` : ''}).`
      : `Marked daily attendance for ${count} trainees on ${first?.date || date}.`;

    await logActivity({
      title: count === 1 ? 'Trainee Attendance Tagged' : `Daily Attendance Saved (${count})`,
      description: logDesc,
      iconType: 'user',
      author: author,
      actionUrl: '/trainers?tab=calendar'
    });

    try {
      revalidateTag('trainees');
      revalidateTag('dashboard');
      revalidatePath('/trainers');
      revalidatePath('/trainees');
    } catch (e) {
      // Non-blocking in static generation
    }

    return NextResponse.json({
      success: true,
      count,
      data: updatedEntries
    });
  } catch (err: any) {
    console.error('Error in daily attendance API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
