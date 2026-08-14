#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase env values. Add them to .env.local first.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return String(value).trim();
}

function pickValue(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const direct = row[alias];
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
  }
  const normalizedMap = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value).trim()])
  );

  for (const alias of aliases) {
    const found = normalizedMap[normalizeHeader(alias)];
    if (found && found !== '') return found;
  }

  return '';
}

function countDailyMarks(row: Record<string, string>, preferredHeaders: string[]): { p: number; a: number } {
  let p = 0;
  let a = 0;

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    const isDailyKey = preferredHeaders.some((candidate) => normalizedKey.includes(candidate)) || normalizedKey.includes('day') || normalizedKey.includes('comms');
    if (!isDailyKey) continue;

    const marker = String(value).trim().toUpperCase();
    if (marker === 'P') p += 1;
    if (marker === 'A' || marker === 'ABSENT' || marker === 'L') a += 1;
  }

  return { p, a };
}

async function clearTable(tableName: string) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.warn(`⚠️  Could not clear ${tableName}: ${error.message}`);
  }
}

async function importWorkbook(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log(`📘 Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`);

  const trainees: any[] = [];
  const trainers: any[] = [];

  for (const sheetName of sheetNames) {
    const normalizedSheetName = normalizeHeader(sheetName);
    if (!normalizedSheetName || normalizedSheetName.startsWith('sheet')) {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    if (!rows.length) continue;

    const headerKeys = Object.keys(rows[0] ?? {});
    const normalizedHeaders = headerKeys.map(normalizeHeader);
    const isTrainerSheet = normalizedHeaders.some((h) =>
      ['position', 'employee no', 'gmail', 'thunderbird', 'profile picture', 'assigned tasks'].includes(h)
    );
    const isTraineeSheet = normalizedHeaders.some((h) =>
      ['batch', 'wave', 'name', 'status', 'month', 'quarter', 'account', 'nho', 'mesh', 'comms day 1', 'endorse date', 'start date'].includes(h)
    );

    for (const row of rows) {
      const normalizedRow: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanedKey = cleanValue(key);
        if (!cleanedKey) continue;
        normalizedRow[cleanedKey] = cleanValue(value);
      }

      const traineeName = pickValue(normalizedRow, ['NAME', 'Name', 'name', 'Trainee Name', 'Trainee Name ']);
      const trainerName = pickValue(normalizedRow, ['NAME', 'Name', 'name', 'Trainer Name', 'trainer name']);

      if (normalizedSheetName.includes('trainer') || isTrainerSheet) {
        if (!trainerName) continue;

        const position = pickValue(normalizedRow, ['POSITION', 'Position', 'position']);
        const employeeNo = pickValue(normalizedRow, ['EMPLOYEE NO', 'employee no', 'Employee No']);
        const startDate = pickValue(normalizedRow, ['START DATE', 'Start Date', 'start date']);
        const accountsValue = pickValue(normalizedRow, ['ACCOUNTS', 'Accounts', 'accounts', 'ACCOUNT', 'Account']);
        const status = pickValue(normalizedRow, ['STATUS', 'Status', 'status']);
        const profilePic = pickValue(normalizedRow, ['PROFILE PICTURE', 'Profile picture', 'profile picture', 'Profile Pic', 'profile pic']);

        trainers.push({
          name: trainerName,
          status: status || 'ACTIVE',
          pos: position || '',
          employeeNo: employeeNo || '',
          startDate: startDate || '',
          accounts: accountsValue ? accountsValue.split(',').map((s) => s.trim()).filter(Boolean) : [],
          attRate: 0,
          relRate: 0,
          profilePic: profilePic || ''
        });
        continue;
      }

      if (!isTraineeSheet || !traineeName) continue;

      const status = pickValue(normalizedRow, ['STATUS', 'Status', 'status']);
      const month = pickValue(normalizedRow, ['MONTH', 'Month', 'month']);
      const quarter = pickValue(normalizedRow, ['QUARTER', 'Quarter', 'quarter']);
      const dailyCounts = countDailyMarks(normalizedRow, ['comms day', 'day']);

      trainees.push({
        name: traineeName,
        status: status || 'ONGOING',
        month: month || '',
        quarter: quarter || '',
        p: dailyCounts.p,
        a: dailyCounts.a
      });
    }
  }

  console.log(`📊 Parsed rows: ${trainees.length} trainees and ${trainers.length} trainers.`);

  if (trainees.length) {
    await clearTable('trainees');
    const { error } = await supabase.from('trainees').insert(trainees);
    if (error) throw error;
    console.log('✅ Trainees inserted to Supabase');
  }

  if (trainers.length) {
    await clearTable('trainers');
    const { error } = await supabase.from('trainers').insert(trainers);
    if (error) throw error;
    console.log('✅ Trainers inserted to Supabase');
  }
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: npx ts-node scripts/import-excel-to-supabase.ts <path-to-excel-file>');
    process.exit(1);
  }

  const resolved = path.resolve(input);
  console.log(`📂 Importing workbook: ${resolved}`);

  await importWorkbook(resolved);
  console.log('🎉 Import completed successfully.');
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
