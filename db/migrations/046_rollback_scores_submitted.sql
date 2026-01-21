-- ROLLBACK for migration 046: Remove scores_submitted column
--
-- WARNING: This will lose the distinction between lineup finalization and score submission
-- Use only if you need to rollback the two-flag system
--
-- To rollback, you would need to:
-- 1. Revert backend code to use is_finalized for both lineup AND scores
-- 2. Revert frontend code to use is_finalized for both states
-- 3. Run this migration

-- Before removing the column, you may want to migrate scores_submitted back to is_finalized
-- This sets is_finalized = true if EITHER the lineup was finalized OR scores were submitted
UPDATE league_lineups
SET is_finalized = true
WHERE is_finalized = true OR scores_submitted = true;

-- Remove the column
ALTER TABLE league_lineups
DROP COLUMN IF EXISTS scores_submitted;

-- Note: After rollback, the system will use is_finalized for both purposes again
COMMENT ON COLUMN league_lineups.is_finalized IS 'Whether the lineup has been finalized/saved by the captain (also indicates score submission in rolled back state)';
