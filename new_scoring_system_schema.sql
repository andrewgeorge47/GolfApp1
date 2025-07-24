-- New Scoring System Database Schema
-- This implements the new 9-hole scoring format with rounds, matches, and live bonuses

-- 1. Create weekly_scorecards table for 9-hole scorecards
CREATE TABLE IF NOT EXISTS weekly_scorecards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL, -- Monday of the week
    hole_scores JSONB NOT NULL, -- Array of 9 scores [1,2,3,4,5,6,7,8,9]
    total_score INTEGER NOT NULL,
    is_live BOOLEAN DEFAULT false, -- Whether this was submitted during live play
    group_id VARCHAR(50), -- For grouping live matches
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tournament_id, week_start_date)
);

-- 2. Create weekly_matches table for head-to-head comparisons
CREATE TABLE IF NOT EXISTS weekly_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    player1_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    player2_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    player1_scorecard_id INTEGER REFERENCES weekly_scorecards(id) ON DELETE CASCADE,
    player2_scorecard_id INTEGER REFERENCES weekly_scorecards(id) ON DELETE CASCADE,
    
    -- Hole-level results (9 holes)
    hole_points_player1 DECIMAL(5,2) DEFAULT 0, -- Sum of hole wins (0.5 each)
    hole_points_player2 DECIMAL(5,2) DEFAULT 0,
    
    -- Round-level results (3 rounds of 3 holes each)
    round1_points_player1 DECIMAL(5,2) DEFAULT 0, -- Holes 1-3
    round1_points_player2 DECIMAL(5,2) DEFAULT 0,
    round2_points_player1 DECIMAL(5,2) DEFAULT 0, -- Holes 4-6
    round2_points_player2 DECIMAL(5,2) DEFAULT 0,
    round3_points_player1 DECIMAL(5,2) DEFAULT 0, -- Holes 7-9
    round3_points_player2 DECIMAL(5,2) DEFAULT 0,
    
    -- Match outcome
    match_winner_id INTEGER REFERENCES users(member_id), -- NULL for tie
    match_live_bonus_player1 DECIMAL(5,2) DEFAULT 0,
    match_live_bonus_player2 DECIMAL(5,2) DEFAULT 0,
    
    -- Total points for this match
    total_points_player1 DECIMAL(5,2) DEFAULT 0,
    total_points_player2 DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, week_start_date, player1_id, player2_id)
);

-- 3. Create weekly_leaderboards table for aggregated results
CREATE TABLE IF NOT EXISTS weekly_leaderboards (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    
    -- Total points across all opponents
    total_hole_points DECIMAL(5,2) DEFAULT 0,
    total_round_points DECIMAL(5,2) DEFAULT 0,
    total_match_bonus DECIMAL(5,2) DEFAULT 0,
    total_score DECIMAL(5,2) DEFAULT 0,
    
    -- Match statistics
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_tied INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    
    -- Live match tracking
    live_matches_played INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, week_start_date, user_id)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_scorecards_tournament_week ON weekly_scorecards(tournament_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_scorecards_user_week ON weekly_scorecards(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_matches_tournament_week ON weekly_matches(tournament_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboards_tournament_week ON weekly_leaderboards(tournament_id, week_start_date);

-- 5. Add scoring configuration to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS scoring_format VARCHAR(50) DEFAULT 'traditional',
ADD COLUMN IF NOT EXISTS live_match_bonus_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_live_matches_per_week INTEGER DEFAULT 3;

-- Comments for documentation
COMMENT ON TABLE weekly_scorecards IS '9-hole scorecards submitted by players each week';
COMMENT ON TABLE weekly_matches IS 'Head-to-head match results between all player pairs';
COMMENT ON TABLE weekly_leaderboards IS 'Aggregated weekly leaderboard standings';
COMMENT ON COLUMN weekly_scorecards.hole_scores IS 'JSON array of 9 hole scores [1,2,3,4,5,6,7,8,9]';
COMMENT ON COLUMN weekly_matches.hole_points_player1 IS 'Sum of hole wins (0.5 points per hole won)';
COMMENT ON COLUMN weekly_matches.round1_points_player1 IS 'Round 1 points (holes 1-3): 1 for win, 0.5 for tie, 0 for loss';
COMMENT ON COLUMN weekly_matches.match_live_bonus_player1 IS 'Live match bonus: 1 for win, 0.5 for tie, 0 for non-live'; 