-- Migration: Update foreign key constraints to reference league_lineups instead of weekly_lineups
-- This allows match scores to reference league lineups for league format matches

-- Update match_individual_scores foreign key
ALTER TABLE match_individual_scores
DROP CONSTRAINT IF EXISTS match_individual_scores_lineup_id_fkey;

ALTER TABLE match_individual_scores
ADD CONSTRAINT match_individual_scores_lineup_id_fkey
FOREIGN KEY (lineup_id) REFERENCES league_lineups(id);

-- Update match_alternate_shot_scores foreign key
ALTER TABLE match_alternate_shot_scores
DROP CONSTRAINT IF EXISTS match_alternate_shot_scores_lineup_id_fkey;

ALTER TABLE match_alternate_shot_scores
ADD CONSTRAINT match_alternate_shot_scores_lineup_id_fkey
FOREIGN KEY (lineup_id) REFERENCES league_lineups(id);

-- Verify the constraints were updated
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname IN (
  'match_individual_scores_lineup_id_fkey',
  'match_alternate_shot_scores_lineup_id_fkey'
);
