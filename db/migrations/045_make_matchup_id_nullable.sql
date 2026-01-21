-- Migration: Make matchup_id nullable for division-based league scores
-- Division-based leagues use schedule-based scoring without matchups

-- Make matchup_id nullable in match_individual_scores
ALTER TABLE match_individual_scores
ALTER COLUMN matchup_id DROP NOT NULL;

-- Make matchup_id nullable in match_alternate_shot_scores
ALTER TABLE match_alternate_shot_scores
ALTER COLUMN matchup_id DROP NOT NULL;

-- Verify the changes
SELECT
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('match_individual_scores', 'match_alternate_shot_scores')
  AND column_name = 'matchup_id';
