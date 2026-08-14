#!/usr/bin/env node
/**
 * Seeding script to populate Supabase from CSV file
 * Usage: npx ts-node scripts/seed-supabase.ts <csv_file_path>
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import csv from 'csv-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedSupabase(csvFilePath: string) {
  try {
    console.log(`📂 Reading CSV from: ${csvFilePath}`);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    const rows: any[] = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`✅ Loaded ${rows.length} rows from CSV`);

    // Categorize data based on CSV columns
    const trainees: any[] = [];
    const trainers: any[] = [];

    for (const row of rows) {
      // Detect if this is a trainee or trainer record based on columns
      if (row.trainee_name || row.name) {
        trainees.push({
          name: row.trainee_name || row.name,
          status: row.status || 'Ongoing',
          month: row.month || 'Unknown',
          quarter: row.quarter || 'Q1',
          p: parseInt(row.present || row.p || '0'),
          a: parseInt(row.absent || row.a || '0'),
          isEndorsed: row.endorsed === 'Yes' || row.isEndorsed === 'true',
          isLoss: row.loss === 'Yes' || row.isLoss === 'true',
          assignedTrainer: row.trainer || row.assigned_trainer || '',
          batchName: row.batch_name || row.batch || '',
          accountName: row.account || row.client_account || ''
        });
      }

      if (row.trainer_name || (row.position && row.trainer_status)) {
        trainers.push({
          name: row.trainer_name || row.name,
          status: row.trainer_status || row.status || 'Active',
          pos: row.position || '',
          employeeNo: row.employee_no || '',
          startDate: row.start_date || '',
          accounts: row.accounts || '',
          attRate: row.attendance_rate || '100%',
          relRate: row.reliability_rate || '100%',
          profilePic: row.profile_pic || ''
        });
      }
    }

    // Insert trainees
    if (trainees.length > 0) {
      console.log(`\n📤 Inserting ${trainees.length} trainees...`);
      const { error: traineeError } = await supabase.from('trainees').insert(trainees);
      if (traineeError) {
        console.error('❌ Error inserting trainees:', traineeError);
      } else {
        console.log('✅ Trainees inserted successfully');
      }
    }

    // Insert trainers
    if (trainers.length > 0) {
      console.log(`\n📤 Inserting ${trainers.length} trainers...`);
      const { error: trainerError } = await supabase.from('trainers').insert(trainers);
      if (trainerError) {
        console.error('❌ Error inserting trainers:', trainerError);
      } else {
        console.log('✅ Trainers inserted successfully');
      }
    }

    console.log('\n🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('❌ Please provide CSV file path as argument');
  console.error('Usage: npx ts-node scripts/seed-supabase.ts <csv_file_path>');
  process.exit(1);
}

seedSupabase(csvPath);
