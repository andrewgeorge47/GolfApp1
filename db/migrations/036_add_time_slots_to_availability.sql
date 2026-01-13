-- Migration: Add time_slots column to team_member_availability table
-- Date: 2026-01-12
-- Description: Adds JSONB column to store hourly availability time slots

-- Add time_slots column if it doesn't exist
ALTER TABLE team_member_availability
ADD COLUMN IF NOT EXISTS time_slots JSONB;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN team_member_availability.time_slots IS
'Array of time slot objects with format: [{"day": "Monday", "start_time": "18:00", "end_time": "21:00"}]';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'team_member_availability' AND column_name = 'time_slots';
