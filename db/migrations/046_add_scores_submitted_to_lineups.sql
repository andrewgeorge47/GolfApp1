-- Migration: Add scores_submitted column to distinguish lineup finalization from score submission
-- This separates two distinct states:
-- 1. is_finalized = true: Captain has saved their lineup and is ready to play
-- 2. scores_submitted = true: Actual scores have been entered after playing

ALTER TABLE league_lineups
ADD COLUMN IF NOT EXISTS scores_submitted BOOLEAN DEFAULT false;

COMMENT ON COLUMN league_lineups.scores_submitted IS 'Whether actual scores have been submitted (not just lineup saved)';

-- Update existing records where scores exist to set scores_submitted = true
-- A lineup has submitted scores if it has individual scores in match_individual_scores
UPDATE league_lineups ll
SET scores_submitted = true
WHERE EXISTS (
  SELECT 1 FROM match_individual_scores mis
  WHERE mis.lineup_id = ll.id
  AND mis.gross_total > 0
);
