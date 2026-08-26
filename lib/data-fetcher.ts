import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import dummyPayload from '@/data/dashboard-mock.json'; // Fallback

// Create a standard client that doesn't access Next.js cookies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// We define a cache tag so we can revalidate on-demand if needed
export const getDashboardData = unstable_cache(
  async () => {
    // Fetch live data from the 'trainees' and 'trainers' tables
    const { data: trainees, error: traineesError } = await supabase
      .from('trainees')
      .select('*');

    const { data: trainers, error: trainersError } = await supabase
      .from('trainers')
      .select('*');

    if (traineesError || trainersError) {
      console.error('Error fetching data from Supabase:', traineesError || trainersError);
      // Fallback to dummy payload if DB fails or is empty for now
      return dummyPayload; 
    }

    if (!trainees || trainees.length === 0) {
       // If no data exists yet, return the dummy payload so the UI doesn't break
       // Once you migrate the CSV data to these tables, it will use the live data!
       return dummyPayload;
    }

    // TODO: Transform `trainees` and `trainers` into the nested shape expected by the Dashboard.
    // For now, if we have data, we'll try to map it, otherwise return dummy payload.
    // This is a basic transformation example based on your mock structure:
    const transformed = JSON.parse(JSON.stringify(dummyPayload)); // Deep copy as base
    
    // You will need to replace `transformed` with actual grouping logic based on `accountName` and `batchName`
    // Example:
    // const inhouseGroups = groupBy(trainees.filter(t => t.someInhouseCondition), 'accountName');
    
    return transformed;
  },
  ['dashboard-data-cache'], // Cache key
  {
    revalidate: 3600, // Cache for 1 hour (3600 seconds)
    tags: ['dashboard'], // Tag for on-demand revalidation
  }
);
