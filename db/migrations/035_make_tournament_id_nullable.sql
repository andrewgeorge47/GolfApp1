-- Migration: Make tournament_id nullable for league teams
-- Date: 2025-12-19
-- Description: Allow tournament_teams to be used for league teams without requiring a tournament

-- Make tournament_id nullable in tournament_teams
ALTER TABLE tournament_teams
  ALTER COLUMN tournament_id DROP NOT NULL;

-- Make tournament_id nullable in team_members
ALTER TABLE team_members
  ALTER COLUMN tournament_id DROP NOT NULL;

-- Make tournament_id nullable in team_standings (if it has NOT NULL constraint)
ALTER TABLE team_standings
  ALTER COLUMN tournament_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN tournament_teams.tournament_id IS 'Tournament ID - NULL for league-only teams, required for tournament teams';
COMMENT ON COLUMN team_members.tournament_id IS 'Tournament ID - NULL for league team members';
COMMENT ON COLUMN team_standings.tournament_id IS 'Tournament ID - NULL for league standings';

SELECT 'Tournament ID made nullable for league teams' as status;
