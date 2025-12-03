-- ============================================================
-- Migration: 005_add_score_constraints.sql
-- Purpose: Add unique constraints for score submission endpoints
-- Impact: ADDITIVE ONLY - Safe to run on production
--
-- What this does:
--   ✅ Adds unique constraint on match_individual_scores (matchup_id, player_id)
--   ✅ Ensures one score submission per player per matchup
--   ❌ Does NOT modify or delete any existing data
--   ❌ Does NOT change any existing column types
--
-- Rollback: See 005_rollback.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Add unique constraint to match_individual_scores
-- This allows ON CONFLICT in the score submission endpoint
-- ------------------------------------------------------------
ALTER TABLE match_individual_scores
  DROP CONSTRAINT IF EXISTS unique_matchup_player_score,
  ADD CONSTRAINT unique_matchup_player_score UNIQUE (matchup_id, player_id);

COMMENT ON CONSTRAINT unique_matchup_player_score ON match_individual_scores
  IS 'Ensures one score submission per player per matchup';

-- ------------------------------------------------------------
-- Validation
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_matchup_player_score'
    AND conrelid = 'match_individual_scores'::regclass
  ) THEN
    RAISE EXCEPTION 'Migration validation failed: unique_matchup_player_score constraint not created';
  END IF;

  RAISE NOTICE 'Migration validation passed: Unique constraints added successfully';
END $$;

COMMIT;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Summary:
-- ✅ Added unique constraint on match_individual_scores (matchup_id, player_id)
--
-- Next steps:
-- 1. Test score submission endpoints
-- 2. Verify ON CONFLICT behavior works correctly
-- ============================================================
