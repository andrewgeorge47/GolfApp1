-- ============================================================
-- Rollback: 004_rollback.sql
-- Purpose: Rollback the league system migration (004_add_league_system.sql)
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: DROP VIEWS
-- ============================================================

DROP VIEW IF EXISTS league_standings CASCADE;

-- ============================================================
-- SECTION 2: REMOVE COLUMNS FROM EXISTING TABLES
-- ============================================================

-- Remove columns from tournament_teams
ALTER TABLE tournament_teams
  DROP COLUMN IF EXISTS league_id,
  DROP COLUMN IF EXISTS division_id,
  DROP COLUMN IF EXISTS league_points,
  DROP COLUMN IF EXISTS aggregate_net_score,
  DROP COLUMN IF EXISTS second_half_net_score,
  DROP COLUMN IF EXISTS final_week_net_score;

-- Remove columns from team_standings
ALTER TABLE team_standings
  DROP COLUMN IF EXISTS league_id,
  DROP COLUMN IF EXISTS division_id,
  DROP COLUMN IF EXISTS division_rank,
  DROP COLUMN IF EXISTS aggregate_net_total,
  DROP COLUMN IF EXISTS second_half_aggregate,
  DROP COLUMN IF EXISTS final_week_score,
  DROP COLUMN IF EXISTS playoff_qualified;

-- ============================================================
-- SECTION 3: DROP NEW TABLES (IN REVERSE DEPENDENCY ORDER)
-- ============================================================

DROP TABLE IF EXISTS tiebreaker_log CASCADE;
DROP TABLE IF EXISTS match_alternate_shot_scores CASCADE;
DROP TABLE IF EXISTS match_individual_scores CASCADE;
DROP TABLE IF EXISTS weekly_lineups CASCADE;
DROP TABLE IF EXISTS team_member_availability CASCADE;
DROP TABLE IF EXISTS league_matchups CASCADE;
DROP TABLE IF EXISTS league_schedule CASCADE;
DROP TABLE IF EXISTS league_divisions CASCADE;
DROP TABLE IF EXISTS leagues CASCADE;

COMMIT;

-- ============================================================
-- ROLLBACK COMPLETE
-- ============================================================

RAISE NOTICE 'Rollback complete: All league system changes have been reverted';
