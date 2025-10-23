-- SQL script to add constraints for weekly_matches table
-- This prevents duplicate match generation and ensures proper player ordering

-- 1. Add check constraint to ensure player1_id < player2_id
-- This enforces canonical player order in the database
ALTER TABLE weekly_matches
ADD CONSTRAINT weekly_matches_player_order_chk
CHECK (player1_id < player2_id);

-- 2. Add unique constraint to prevent duplicate matches
-- This ensures only one match per player pair per tournament week
ALTER TABLE weekly_matches
ADD CONSTRAINT weekly_matches_unique_pair
UNIQUE (tournament_id, week_start_date, player1_id, player2_id);

-- 3. Add unique constraint to prevent multiple scorecards per user per week
-- This ensures one scorecard per user per tournament week
ALTER TABLE weekly_scorecards
ADD CONSTRAINT uniq_scorecard_per_week
UNIQUE (tournament_id, week_start_date, user_id);

-- 4. Create indexes for better performance on the constraints
CREATE INDEX IF NOT EXISTS idx_weekly_matches_canonical_order 
ON weekly_matches (tournament_id, week_start_date, player1_id, player2_id);

CREATE INDEX IF NOT EXISTS idx_weekly_scorecards_unique_week 
ON weekly_scorecards (tournament_id, week_start_date, user_id);

-- 5. Verify the constraints are in place
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid IN (
  'weekly_matches'::regclass,
  'weekly_scorecards'::regclass
)
AND conname IN (
  'weekly_matches_player_order_chk',
  'weekly_matches_unique_pair',
  'uniq_scorecard_per_week'
)
ORDER BY conrelid, conname;

-- 6. Test the constraints (optional - run these to verify they work)
-- This will fail if there are existing violations:

-- Test player order constraint
-- SELECT * FROM weekly_matches WHERE player1_id >= player2_id;

-- Test unique pair constraint
-- SELECT tournament_id, week_start_date, player1_id, player2_id, COUNT(*)
-- FROM weekly_matches 
-- GROUP BY tournament_id, week_start_date, player1_id, player2_id
-- HAVING COUNT(*) > 1;

-- Test unique scorecard constraint
-- SELECT tournament_id, week_start_date, user_id, COUNT(*)
-- FROM weekly_scorecards 
-- GROUP BY tournament_id, week_start_date, user_id
-- HAVING COUNT(*) > 1; 