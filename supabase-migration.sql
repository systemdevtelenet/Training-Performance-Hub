-- ==============================================================================
-- SUPABASE CSV TO SCHEMA MIGRATION SCRIPT
-- ==============================================================================
-- This script migrates your raw imported CSV tables into the structured 
-- `trainees` and `trainers` tables expected by the dashboard application.
-- 
-- INSTRUCTIONS:
-- 1. Open the SQL Editor in your Supabase Dashboard.
-- 2. Paste this entire script into the editor.
-- 3. Replace the table names inside double quotes (e.g., "General Attendance - ...") 
--    with the EXACT names of your imported CSV tables.
-- 4. Verify that the column names in the SELECT match your CSV columns.
-- 5. Run the script!
-- ==============================================================================

-- 1. Insert Trainees from your CSV (Adjust table name and column names as needed)
INSERT INTO public.trainees (
    name, 
    status, 
    month, 
    quarter, 
    p, 
    a, 
    "isEndorsed", 
    "isLoss", 
    "assignedTrainer", 
    "batchName", 
    "accountName"
)
SELECT 
    "Name", -- Replace with exact CSV column name
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
FROM public."General Attendance - ReplaceWithExactName"; -- Replace table name

-- 2. Insert Trainers from your CSV (Adjust table name and column names as needed)
INSERT INTO public.trainers (
    name, 
    status, 
    pos, 
    "employeeNo", 
    "startDate", 
    "attRate", 
    "relRate"
)
SELECT 
    "Trainer Name", -- Replace with exact CSV column name
    "Status",
    "Position",
    "Employee No",
    "Start Date",
    CAST("Attendance Rate" AS DOUBLE PRECISION),
    CAST("Reliability Rate" AS DOUBLE PRECISION)
FROM public."Trainers Profile - ReplaceWithExactName"; -- Replace table name

-- Note: Depending on how many CSV files you uploaded, you may need to 
-- duplicate the INSERT INTO blocks above to combine data from multiple tables.
