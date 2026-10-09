import type { SupabaseClient } from '@supabase/supabase-js';

export interface WorkforceAttendanceRecord {
  date: string;
  month: string;
  day: number;
  weekday: string;
  status: 'P' | 'L' | 'UND' | 'L/UND';
  source: 'WORKFORCE_PORTAL';
  clockIn: string | null;
  clockOut: string | null;
  punchCount: number;
}

interface ParsedPunch {
  employeeId: string;
  type: string;
  status: string;
  timestamp: string;
  date: string;
  epoch: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parsePunchTimestamp(rawValue: unknown) {
  const raw = String(rawValue || '').trim();
  const localMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (localMatch) {
    const [, monthText, dayText, yearText, hourText, minuteText, secondText = '0'] = localMatch;
    const month = Number(monthText);
    const day = Number(dayText);
    const year = Number(yearText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const date = `${yearText}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')}`;

    return {
      date,
      epoch: Date.UTC(year, month - 1, day, hour, minute, second),
    };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    epoch: parsed.getTime(),
  };
}

function normalizePunch(row: any): ParsedPunch | null {
  const employeeId = String(row?.['EMPLOYEE ID'] ?? row?.employee_id ?? '').trim();
  const parsedTimestamp = parsePunchTimestamp(row?.TIMESTAMP ?? row?.timestamp);
  if (!employeeId || !parsedTimestamp) return null;

  return {
    employeeId,
    type: String(row?.TYPE ?? row?.punch_type ?? row?.type ?? '').trim(),
    status: String(row?.STATUS ?? row?.status ?? '').trim(),
    timestamp: String(row?.TIMESTAMP ?? row?.timestamp ?? '').trim(),
    date: parsedTimestamp.date,
    epoch: parsedTimestamp.epoch,
  };
}

function isShiftStart(type: string) {
  const normalized = type.toUpperCase();
  return normalized.includes('SHIFT START') || normalized.includes('CLOCK IN') || normalized.includes('PUNCH IN');
}

function isShiftEnd(type: string) {
  const normalized = type.toUpperCase();
  return normalized.includes('SHIFT END') || normalized.includes('END SHIFT') || normalized.includes('CLOCK OUT') || normalized.includes('PUNCH OUT');
}

export async function fetchWorkforceAttendance(
  supabase: SupabaseClient,
  employeeIds: string[],
): Promise<Map<string, WorkforceAttendanceRecord[]>> {
  const normalizedIds = Array.from(new Set(
    employeeIds
      .map(id => String(id || '').trim())
      .filter(id => /^\d+$/.test(id)),
  ));
  const result = new Map<string, WorkforceAttendanceRecord[]>();
  if (normalizedIds.length === 0) return result;

  const queryIds = normalizedIds.map(Number);
  const rows: any[] = [];
  const pageSize = 1000;

  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from('time_tracker_logs')
      .select('*')
      .in('EMPLOYEE ID', queryIds)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching Workforce Portal attendance:', error);
      return result;
    }

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  const grouped = new Map<string, ParsedPunch[]>();
  rows.map(normalizePunch).filter((row): row is ParsedPunch => Boolean(row)).forEach(row => {
    const key = `${row.employeeId}___${row.date}`;
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  });

  grouped.forEach((punches, key) => {
    punches.sort((a, b) => a.epoch - b.epoch);
    const [employeeId, date] = key.split('___');
    const shiftStarts = punches.filter(punch => isShiftStart(punch.type));
    const shiftEnds = punches.filter(punch => isShiftEnd(punch.type));
    const isLate = shiftStarts.some(punch => punch.status.toUpperCase().includes('LATE'));
    const isUndertime = shiftEnds.some(punch => punch.status.toUpperCase().includes('UNDERTIME'));
    const status: WorkforceAttendanceRecord['status'] = isLate && isUndertime
      ? 'L/UND'
      : isUndertime
        ? 'UND'
        : isLate
          ? 'L'
          : 'P';

    const [year, month, day] = date.split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    const record: WorkforceAttendanceRecord = {
      date,
      month: MONTH_NAMES[month - 1] || 'Unknown',
      day,
      weekday: calendarDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      status,
      source: 'WORKFORCE_PORTAL',
      clockIn: shiftStarts[0]?.timestamp || null,
      clockOut: shiftEnds[shiftEnds.length - 1]?.timestamp || null,
      punchCount: punches.length,
    };

    const employeeRecords = result.get(employeeId) || [];
    employeeRecords.push(record);
    result.set(employeeId, employeeRecords);
  });

  result.forEach(records => records.sort((a, b) => a.date.localeCompare(b.date)));
  return result;
}
