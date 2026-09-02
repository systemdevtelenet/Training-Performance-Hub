import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const trainerNameLike = '%Brix%Lamp%';
  const { data: trainers, error: trainerErr } = await supabase
    .from('trainers')
    .select('*')
    .ilike('name', trainerNameLike);

  if (trainerErr) {
    console.error('Error fetching trainer:', trainerErr);
    return;
  }

  if (!trainers || trainers.length === 0) {
    console.log('Trainer Brix Lampogo not found.');
    return;
  }

  for (const trainer of trainers) {
    console.log(`Found trainer: ${trainer.name} (ID: ${trainer.id})`);
    
    // Find trainees for this trainer
    const { data: trainees, error: traineesErr } = await supabase
      .from('trainees')
      .select('p, a')
      .eq('assignedTrainer', trainer.name);

    if (traineesErr) {
      console.error('Error fetching trainees:', traineesErr);
      continue;
    }

    if (!trainees || trainees.length === 0) {
      console.log(`No trainees found for trainer ${trainer.name}`);
      continue;
    }

    let totalP = 0;
    let totalA = 0;
    for (const t of trainees) {
      totalP += t.p || 0;
      totalA += t.a || 0;
    }

    const totalDays = totalP + totalA;
    const attRate = totalDays > 0 ? (totalP / totalDays) * 100 : 0;

    console.log(`Total P: ${totalP}, Total A: ${totalA}, Attendance Rate: ${attRate}%`);

    // Update the trainer's attendance rate
    const { error: updateErr } = await supabase
      .from('trainers')
      .update({ attRate: attRate })
      .eq('id', trainer.id);

    if (updateErr) {
      console.error('Error updating trainer:', updateErr);
    } else {
      console.log(`Successfully updated ${trainer.name}'s attendance rate to ${attRate}%`);
    }
  }
}

main();
