-- Migration: Fix league_lineups to reference league_schedule instead of league_matchups
-- This supports the division-based league system where teams compete per week, not in matchups

-- Drop the old foreign key constraint
ALTER TABLE league_lineups
DROP CONSTRAINT IF EXISTS league_lineups_matchup_id_fkey;

-- Rename the column to be more accurate
ALTER TABLE league_lineups
RENAME COLUMN matchup_id TO schedule_id;

-- Add new foreign key to league_schedule
ALTER TABLE league_lineups
ADD CONSTRAINT league_lineups_schedule_id_fkey
FOREIGN KEY (schedule_id) REFERENCES league_schedule(id) ON DELETE CASCADE;

-- Update the unique constraint
ALTER TABLE league_lineups
DROP CONSTRAINT IF EXISTS league_lineups_matchup_id_team_id_key;

ALTER TABLE league_lineups
ADD CONSTRAINT league_lineups_schedule_id_team_id_key
UNIQUE (schedule_id, team_id);

COMMENT ON COLUMN league_lineups.schedule_id IS 'References the league_schedule entry (week) for this lineup';
