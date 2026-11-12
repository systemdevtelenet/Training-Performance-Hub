import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/logger';
import { fetchWorkforceAttendance } from '@/lib/workforce-attendance';
import { authorizeAuthenticatedRequest, authorizeTrainerOrAdminRequest } from '@/lib/auth/access';
import { isTrainerMatch } from '@/lib/analytics-utils';
import { getTraineesData } from '@/lib/data-fetcher';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

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
      .schema('training_system').from('traffic_light_metrics')
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
    supabase.schema('training_system').from('inhouse').select('name, status, batch, acount'),
    supabase.schema('training_system').from('product_spec_training').select('name, status, wave, account'),
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
  return Response.json({ records: [], trainees: [], attendance: [] });
}

// POST: Save or update attendance records, status, and reason notes in Supabase
export async function POST(req: Request) {
  return Response.json({ error: "Data storage is temporarily disabled while the schema is being replaced." }, { status: 503 });
}
