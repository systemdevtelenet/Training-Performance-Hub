import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { fetchWorkforceAttendance } from '@/lib/workforce-attendance';
import { createClient as createAuthClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function hasAuthenticatedUser() {
  const authClient = await createAuthClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  return !error && Boolean(user);
}

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
  source?: 'TIME_TRACKER';
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

function normalizeTraineeName(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isEndorsed(status: unknown) {
  const value = String(status || '').trim().toUpperCase();
  return value === 'ENDORSED' || value === 'PASSED';
}

async function fetchEndorsedTraineeAttendance(
  manualRecords: Record<string, DailyAttendanceEntry>,
): Promise<Record<string, DailyAttendanceEntry>> {
  const [inhouseResult, pstResult, employeeResult, trackerEmployeeResult] = await Promise.all([
    supabase.from('inhouse').select('name, status, batch, acount'),
    supabase.from('product_spec_training').select('name, status, wave, account'),
    supabase.from('employees').select('employee_code, employee_name'),
    supabase.from('time_tracker_employees').select('"Employee ID"'),
  ]);
  const sourceError = inhouseResult.error || pstResult.error || employeeResult.error || trackerEmployeeResult.error;
  if (sourceError) {
    console.error('Unable to resolve endorsed trainees for time-tracker attendance:', sourceError);
    return {};
  }

  const roster = [
    ...(inhouseResult.data || []).filter((row: any) => isEndorsed(row.status)).map((row: any) => ({
      name: String(row.name || '').trim(),
      batchName: row.batch ? `Batch ${row.batch}` : '',
      accountName: String(row.account || row.acount || '').trim(),
      trainingType: 'INHOUSE',
    })),
    ...(pstResult.data || []).filter((row: any) => isEndorsed(row.status)).map((row: any) => ({
      name: String(row.name || '').trim(),
      batchName: row.wave ? `Batch ${row.wave}` : '',
      accountName: String(row.account || '').trim(),
      trainingType: 'PST',
    })),
  ].filter(row => row.name);

  const rosterByName = new Map<string, typeof roster>();
  roster.forEach(row => {
    const key = normalizeTraineeName(row.name);
    const matches = rosterByName.get(key) || [];
    matches.push(row);
    rosterByName.set(key, matches);
  });

  const employeesByName = new Map<string, any[]>();
  (employeeResult.data || []).forEach((employee: any) => {
    const key = normalizeTraineeName(employee.employee_name);
    if (!key || !/^\d+$/.test(String(employee.employee_code || '').trim())) return;
    const matches = employeesByName.get(key) || [];
    matches.push(employee);
    employeesByName.set(key, matches);
  });

  const identityMap = new Map<string, typeof roster[number]>();
  const trackerEmployeeIds = new Set((trackerEmployeeResult.data || [])
    .map((row: any) => String(row['Employee ID'] || '').trim())
    .filter((id: string) => /^\d+$/.test(id)));
  rosterByName.forEach((trainees, key) => {
    const employees = employeesByName.get(key) || [];
    if (trainees.length !== 1 || employees.length !== 1) return;
    const employeeCode = String(employees[0].employee_code).trim();
    if (trackerEmployeeIds.has(employeeCode)) identityMap.set(employeeCode, trainees[0]);
  });
  if (identityMap.size === 0) return {};

  const workforceRecords = await fetchWorkforceAttendance(supabase, Array.from(identityMap.keys()));
  const records: Record<string, DailyAttendanceEntry> = {};
  workforceRecords.forEach((employeeRecords, employeeCode) => {
    const trainee = identityMap.get(employeeCode);
    if (!trainee) return;

    employeeRecords.forEach(record => {
      const tag = record.status === 'A'
        ? 'A'
        : record.status === 'L'
          ? 'L'
          : record.status === 'UND' || record.status === 'L/UND'
            ? 'U'
            : record.status === 'P'
              ? 'P'
              : '';
      const key = getRecordKey(record.date, trainee.name);
      const manual = manualRecords[key];
      records[key] = {
        ...manual,
        date: record.date,
        traineeName: trainee.name,
        batchName: trainee.batchName || manual?.batchName,
        accountName: trainee.accountName || manual?.accountName,
        trainerName: manual?.trainerName,
        trainingType: trainee.trainingType,
        status: 'ENDORSED',
        attCode: tag,
        notes: manual?.notes || '',
        updatedBy: 'Time Tracker',
        source: 'TIME_TRACKER',
      };
    });
  });
  return records;
}

// GET: Retrieve attendance records for a specific date or range from Supabase
export async function GET(req: Request) {
  try {
    if (!(await hasAuthenticatedUser())) {
      return NextResponse.json({ error: 'Please sign in to view attendance.' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // e.g. 2026-09-18
    const trainer = searchParams.get('trainer');
    const batch = searchParams.get('batch');

    const allRecords = await fetchDbRecords();
    const trackerRecords = await fetchEndorsedTraineeAttendance(allRecords);
    Object.assign(allRecords, trackerRecords);
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
    if (!(await hasAuthenticatedUser())) {
      return NextResponse.json({ error: 'Please sign in to update attendance.' }, { status: 401 });
    }
    const body = await req.json();
    const { date, records, updatedBy, actionType } = body;

    const rawList: DailyAttendanceEntry[] = Array.isArray(records)
      ? records
      : Array.isArray(body)
      ? body
      : [body];

    if (!rawList || rawList.length === 0) {
      return NextResponse.json({ error: 'No attendance records provided' }, { status: 400 });
    }

    const currentRecords = await fetchDbRecords();
    const trackerRecords = await fetchEndorsedTraineeAttendance(currentRecords);
    const attemptsToOverrideTracker = rawList.some(item => {
      const itemDate = item.date || date || new Date().toISOString().split('T')[0];
      if (!item.traineeName) return false;
      const synced = trackerRecords[getRecordKey(itemDate, item.traineeName)];
      if (!synced) return false;
      return (item.attCode !== undefined && item.attCode !== synced.attCode) ||
        (item.status !== undefined && item.status !== synced.status);
    });
    if (attemptsToOverrideTracker) {
      return NextResponse.json({
        error: 'Attendance synced from the time tracker cannot be changed in the Training Hub. Notes may still be updated.'
      }, { status: 409 });
    }
    const timestamp = new Date().toISOString();
    const author = updatedBy || 'Trainer';
    const updatedEntries: DailyAttendanceEntry[] = [];
    const statusUpdatesToSync: Array<{ name: string; status: string; isPst: boolean; isEndorsed: boolean }> = [];
    const noteUpdatesToSync: Array<{ name: string; notes: string; isPst: boolean }> = [];

    const dbRowsToInsert: any[] = [];
    let initialExistingRecord: DailyAttendanceEntry | null = null;

    for (const item of rawList) {
      const itemDate = item.date || date || new Date().toISOString().split('T')[0];
      const traineeName = item.traineeName;
      if (!traineeName || !traineeName.trim()) continue;

      const cleanName = traineeName.trim();
      const key = getRecordKey(itemDate, cleanName);
      const existing = currentRecords[key] || {};
      if (!initialExistingRecord) initialExistingRecord = existing;

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
        traffic_status: updatedEntry.attCode || '',
        remarks: JSON.stringify(updatedEntry),
        metric_date: itemDate
      });

      // Track lifecycle status updates
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

      // Track reason note additions or updates
      if (item.notes !== undefined && item.notes !== existing.notes) {
        const isPst = (item.trainingType || '').toUpperCase() === 'PST';
        noteUpdatesToSync.push({
          name: cleanName,
          notes: item.notes,
          isPst
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

    // Sync status updates to Supabase (inhouse, product_spec_training, and trainees)
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

        // Also update standard trainees table
        try {
          await supabase
            .from('trainees')
            .update({
              status: update.status,
              isEndorsed: update.isEndorsed,
              isLoss: ['AWOL', 'EOC', 'RESIGNED', 'TERMINATED', 'FAIL', 'LOSS'].some(s => update.status.toUpperCase().includes(s))
            })
            .ilike('name', update.name);
        } catch (e) {
          // Gracefully continue
        }
      }
    }

    // Sync notes to Supabase tables if remarks/notes column is available
    if (noteUpdatesToSync.length > 0) {
      for (const noteUpdate of noteUpdatesToSync) {
        const targetTable = noteUpdate.isPst ? 'product_spec_training' : 'inhouse';
        try {
          await supabase
            .from(targetTable)
            .update({ remarks: noteUpdate.notes })
            .eq('name', noteUpdate.name);
        } catch (e) {
          // Non-fatal if column differs
        }
      }
    }

    // Log Activity & Dispatch Notification to Admins
    const TAG_LABELS: Record<string, string> = {
      P: 'Present (P)',
      L: 'Late (L)',
      U: 'Undertime (U)',
      A: 'Absent (A)',
      '': 'Untagged'
    };

    const count = updatedEntries.length;
    const first = updatedEntries[0];
    const tagLabel = TAG_LABELS[first?.attCode || ''] || 'Untagged';

    let notifTitle = 'Trainee Attendance Updated';
    let notifDesc = '';
    let notifIcon: 'attendance' | 'remark' | 'user' | 'alert' = 'attendance';

    if (actionType === 'note' || (count === 1 && first.notes && (!initialExistingRecord || initialExistingRecord.notes !== first.notes) && initialExistingRecord?.attCode === first.attCode)) {
      notifTitle = 'Trainee Reason Note Added';
      notifIcon = 'remark';
      notifDesc = `Reason note logged for ${first.traineeName} on ${first.date}: "${first.notes}" (Status: ${first.status || 'Ongoing'}, Tag: ${tagLabel})`;
    } else if (actionType === 'status' || (count === 1 && first.status && (!initialExistingRecord || initialExistingRecord.status !== first.status))) {
      notifTitle = 'Trainee Lifecycle Status Updated';
      notifIcon = 'user';
      notifDesc = `Status for ${first.traineeName} updated to ${first.status} on ${first.date}${first.notes ? ` (Note: "${first.notes}")` : ''}`;
    } else if (count === 1) {
      notifTitle = 'Trainee Attendance Tagged';
      notifIcon = 'attendance';
      notifDesc = `Marked ${first.traineeName} as ${tagLabel} for ${first.date}${first.notes ? ` (Note: "${first.notes}")` : ''}`;
    } else {
      notifTitle = `Daily Attendance Saved (${count})`;
      notifIcon = 'attendance';
      notifDesc = `Marked daily attendance for ${count} trainees on ${first?.date || date}.`;
    }

    await logActivity({
      title: notifTitle,
      description: notifDesc,
      iconType: notifIcon,
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
