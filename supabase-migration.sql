-- ==============================================================================
-- SUPABASE CSV TO SCHEMA MIGRATION SCRIPT
-- ==============================================================================
-- This script migrates your raw imported CSV tables (`INHOUSE` and `PST`)
-- into the standard `trainees` table expected by the dashboard application.
-- 
-- INSTRUCTIONS:
-- 1. Make sure you have run the `supabase-schema.sql` script first so the `trainees` table exists!
-- 2. Open the SQL Editor in your Supabase Dashboard.
-- 3. Paste this entire script into the editor.
-- 4. Run the script!
-- ==============================================================================

-- 1. Insert Trainees from your INHOUSE table
INSERT INTO public.trainees (
    name, 
    status, 
    month, 
    quarter, 
    p, 
    a, 
    isEndorsed, 
    isLoss, 
    assignedTrainer, 
    batchName, 
    accountName
)
SELECT 
    "Name", 
    "Status", 
    "Month", 
    "Quarter", 
    CAST("P" AS INTEGER), 
    CAST("A" AS INTEGER), 
    CAST("Is Endorsed" AS BOOLEAN), 
    CAST("Is Loss" AS BOOLEAN), 
    "Assigned Trainer", 
    "Batch Name", 
    "Account Name"
FROM public."INHOUSE";

-- 2. Insert Trainees from your PST table
INSERT INTO public.trainees (
    name, 
    status, 
    month, 
    quarter, 
    p, 
    a, 
    isEndorsed, 
    isLoss, 
    assignedTrainer, 
    batchName, 
    accountName
)
SELECT 
    "Name", 
    "Status", 
    "Month", 
    "Quarter", 
    CAST("P" AS INTEGER), 
    CAST("A" AS INTEGER), 
    CAST("Is Endorsed" AS BOOLEAN), 
    CAST("Is Loss" AS BOOLEAN), 
    "Assigned Trainer", 
    "Batch Name", 
    "Account Name"
FROM public."PST";
