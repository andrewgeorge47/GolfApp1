-- SQL script to prevent duplicate matches in the future
-- Run this after cleaning up existing duplicates

-- 1. First, let's check if there are any existing duplicates
SELECT 
  tournament_id, 
  week_start_date, 
  player1_id, 
  player2_id, 
  COUNT(*) as match_count
FROM weekly_matches 
GROUP BY tournament_id, week_start_date, player1_id, player2_id
HAVING COUNT(*) > 1
ORDER BY tournament_id, week_start_date, player1_id, player2_id;

-- 2. Add a unique constraint to prevent future duplicates
-- This will fail if duplicates exist, so run the cleanup script first
ALTER TABLE weekly_matches 
ADD CONSTRAINT unique_tournament_week_player_pair 
UNIQUE (tournament_id, week_start_date, player1_id, player2_id);

-- 3. Add a check constraint to ensure player1_id < player2_id to prevent duplicate pairs
-- This ensures that if we have a match between players A and B, we don't also create B vs A
ALTER TABLE weekly_matches 
ADD CONSTRAINT check_player_order 
CHECK (player1_id < player2_id);

-- 4. Create an index for better performance on the unique constraint
CREATE INDEX IF NOT EXISTS idx_weekly_matches_unique 
ON weekly_matches (tournament_id, week_start_date, player1_id, player2_id);

-- 5. Add a trigger to log any attempts to insert duplicates
CREATE OR REPLACE FUNCTION log_duplicate_match_attempt()
RETURNS TRIGGER AS $$
BEGIN
  RAISE LOG 'Attempt to insert duplicate match: tournament_id=%, week_start_date=%, player1_id=%, player2_id=%', 
    NEW.tournament_id, NEW.week_start_date, NEW.player1_id, NEW.player2_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_duplicate_match_attempt
  BEFORE INSERT ON weekly_matches
  FOR EACH ROW
  EXECUTE FUNCTION log_duplicate_match_attempt();

-- 6. Verify the constraints are in place
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'weekly_matches'::regclass
ORDER BY conname; 