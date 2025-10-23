-- Add scorecard photo URL columns to club_championship_matches table
ALTER TABLE club_championship_matches 
ADD COLUMN IF NOT EXISTS player1_scorecard_photo_url TEXT,
ADD COLUMN IF NOT EXISTS player2_scorecard_photo_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN club_championship_matches.player1_scorecard_photo_url IS 'URL of the scorecard photo uploaded by player 1';
COMMENT ON COLUMN club_championship_matches.player2_scorecard_photo_url IS 'URL of the scorecard photo uploaded by player 2';
