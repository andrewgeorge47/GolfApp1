-- Migration: Add week_start_date column to tournaments table
-- This ensures future tournaments store the correct week start date (Monday of tournament week)

-- Add the week_start_date column
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS week_start_date DATE;

-- Function to calculate Monday of the week containing a given date
CREATE OR REPLACE FUNCTION get_monday_of_week(input_date DATE)
RETURNS DATE AS $$
DECLARE
    day_of_week INTEGER;
    days_to_monday INTEGER;
    monday_date DATE;
BEGIN
    -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week := EXTRACT(DOW FROM input_date);
    
    -- Calculate days to Monday
    IF day_of_week = 0 THEN
        days_to_monday := -6; -- Sunday: go back 6 days to Monday
    ELSE
        days_to_monday := 1 - day_of_week; -- Other days: go back to Monday
    END IF;
    
    -- Calculate Monday date
    monday_date := input_date + days_to_monday;
    
    RETURN monday_date;
END;
$$ LANGUAGE plpgsql;

-- Update existing tournaments to have the correct week_start_date
UPDATE tournaments 
SET week_start_date = get_monday_of_week(start_date)
WHERE week_start_date IS NULL AND start_date IS NOT NULL;

-- Make the column NOT NULL for future tournaments
ALTER TABLE tournaments ALTER COLUMN week_start_date SET NOT NULL;

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_week_start_date ON tournaments(week_start_date);

-- Clean up the function
DROP FUNCTION IF EXISTS get_monday_of_week(DATE);

-- Display the results
SELECT 
    id, 
    name, 
    start_date, 
    week_start_date,
    CASE 
        WHEN week_start_date = get_monday_of_week(start_date) THEN '✓ Correct'
        ELSE '✗ Incorrect'
    END as status
FROM tournaments 
ORDER BY id; 