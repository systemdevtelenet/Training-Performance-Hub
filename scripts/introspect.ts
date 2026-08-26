import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function introspect() {
  const tables = [
    'Boss Silver - Traffic Light',
    'Central Monitoring - Attendance',
    'General Attendance - PHO...', // We need to find the exact names or query information_schema
  ]
  
  // Actually, let's query the information_schema to get all tables and columns
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('table_name, column_name, data_type')
    .eq('table_schema', 'public')

  if (error) {
    console.error('Error fetching schema:', error)
    return
  }

  console.log(JSON.stringify(data, null, 2))
}

introspect()
