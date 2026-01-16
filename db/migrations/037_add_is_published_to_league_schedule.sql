-- Add is_published column to league_schedule table
-- This allows admins to lock/publish a week's schedule, preventing further edits

ALTER TABLE league_schedule
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add comment to document the column
COMMENT ON COLUMN league_schedule.is_published IS 'When true, the week schedule is locked and published to players/captains. No further edits allowed.';

-- Create index for faster queries filtering by published status
CREATE INDEX IF NOT EXISTS idx_league_schedule_published ON league_schedule(league_id, is_published);
