-- ============================================================
-- Rollback: 005_rollback.sql
-- Purpose: Rollback migration 005_add_score_constraints.sql
-- ============================================================

BEGIN;

-- Remove unique constraint from match_individual_scores
ALTER TABLE match_individual_scores
  DROP CONSTRAINT IF EXISTS unique_matchup_player_score;

COMMIT;

-- ============================================================
-- ROLLBACK COMPLETE
-- ============================================================
