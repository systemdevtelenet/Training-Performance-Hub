import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Table structures for reference:
// trainees: { id, name, status, month, quarter, p, a, isEndorsed, isLoss, assignedTrainer, batchName, accountName }
// trainers: { id, name, status, pos, employeeNo, startDate, accounts, attRate, relRate, profilePic }
// trainer_attendance: { id, trainerName, traineeName, month, quarter, p, a }
// trainer_reliability: { id, trainerName, traineeName, month, quarter, p, a, losses }
