import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRAINER_NAMES = [
  "Jeremy Rigodon",
  "John Loi Gara",
  "Bianca Kaye Ernestine Colonia",
  "Rohla Mie Baswa",
  "Michelle Yncierto",
  "Rommel Mendoza",
  "Ronelyn Baguio",
  "John Dhico Magalzo",
  "Abdellah Nohreen Disomimba",
  "Krisland Pepito",
  "Niño Elijah R. Reyes",
  "Francisjell Yongco",
  "Kier Ariola",
  "Joven Aniñon",
  "Vincent Luis Celdran",
  "Nina Joy Briones",
  "Matt Riner Balaba",
  "Maegan Marie Cabardo",
  "Charles Espinosa"
];

async function seedTable(tableName: string) {
  console.log(`Seeding ${tableName}...`);
  for (const name of TRAINER_NAMES) {
    const { error } = await supabase.from(tableName).upsert({ 'TRAINERS': name }, { onConflict: 'id' }); // Assuming we just insert
    // actually without a unique constraint on TRAINERS, upsert might fail or just duplicate.
    // let's do a select first
    const { data: existing } = await supabase.from(tableName).select('id').eq('TRAINERS', name).single();
    if (!existing) {
       const { error: insertErr } = await supabase.from(tableName).insert({ 'TRAINERS': name });
       if (insertErr) console.error(`Error inserting ${name} into ${tableName}:`, insertErr);
    }
  }
  console.log(`Finished seeding ${tableName}.`);
}

async function main() {
  await seedTable('traffic_light_mon_trainers_q1');
  await seedTable('traffic_light_mon_trainers_q2');
  await seedTable('traffic_light_mon_trainers_q3');
  await seedTable('traffic_light_mon_trainers_q4');
}

main();
