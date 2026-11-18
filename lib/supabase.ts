import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerConfig } from '@/lib/supabase/server-env';

const { url: supabaseUrl, key: supabaseKey } = getSupabaseServerConfig();

export const supabase = createClient(supabaseUrl, supabaseKey);

// Table structures for reference:
// trainees: { id, name, status, month, quarter, p, a, isEndorsed, isLoss, assignedTrainer, batchName, accountName }
// trainers: { id, name, status, pos, employeeNo, startDate, accounts, attRate, relRate, profilePic }
// trainer_attendance: { id, trainerName, traineeName, month, quarter, p, a }
// trainer_reliability: { id, trainerName, traineeName, month, quarter, p, a, losses }
