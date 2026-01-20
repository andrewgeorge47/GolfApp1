-- Migration: Add playing_time to league_lineups for division-based leagues
-- In division-based leagues, each team sets their own playing time for the week

ALTER TABLE league_lineups
ADD COLUMN IF NOT EXISTS playing_time TIMESTAMP;

COMMENT ON COLUMN league_lineups.playing_time IS 'When this team plans to play during this week (division-based leagues)';
