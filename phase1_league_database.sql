-- Phase 1: League Database Schema
-- This script adds league functionality to the existing tournament system
-- Run this script manually to add league support

-- 1. Extend the existing tournaments table with league-specific fields
-- These are all optional fields that won't affect existing tournaments

-- Add league configuration column (JSONB for flexible league settings)
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS league_config JSONB;

-- Add league-specific fields
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS league_id INTEGER,
ADD COLUMN IF NOT EXISTS is_league_week BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS league_week_number INTEGER,
ADD COLUMN IF NOT EXISTS parent_league_id INTEGER REFERENCES tournaments(id);

-- Add indexes for league queries
CREATE INDEX IF NOT EXISTS idx_tournaments_league_id ON tournaments(league_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_parent_league_id ON tournaments(parent_league_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_is_league_week ON tournaments(is_league_week);

-- 2. Extend the existing league_settings table
-- Add new columns for enhanced league management

ALTER TABLE league_settings 
ADD COLUMN IF NOT EXISTS season_start_date DATE,
ADD COLUMN IF NOT EXISTS season_end_date DATE,
ADD COLUMN IF NOT EXISTS auto_progression BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_matches_per_week INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_matches_per_week INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS live_match_bonus DECIMAL(3,1) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS tie_break_rules VARCHAR(50) DEFAULT 'total_points',
ADD COLUMN IF NOT EXISTS week_start_day VARCHAR(20) DEFAULT 'monday',
ADD COLUMN IF NOT EXISTS scoring_deadline_hours INTEGER DEFAULT 72,
ADD COLUMN IF NOT EXISTS playoff_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS playoff_weeks INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS drop_worst_weeks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT 8;

-- 3. Create new league_weeks table for tracking individual weeks
CREATE TABLE IF NOT EXISTS league_weeks (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    tournament_id INTEGER REFERENCES tournaments(id), -- Links to the weekly tournament
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(league_id, week_number)
);

-- Add indexes for league_weeks
CREATE INDEX IF NOT EXISTS idx_league_weeks_league_id ON league_weeks(league_id);
CREATE INDEX IF NOT EXISTS idx_league_weeks_week_start_date ON league_weeks(week_start_date);
CREATE INDEX IF NOT EXISTS idx_league_weeks_status ON league_weeks(status);

-- 4. Create league_participants table (if it doesn't exist)
-- This extends the existing league_participants table with more fields

-- First, check if the table exists and create it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'league_participants') THEN
        CREATE TABLE league_participants (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(member_id),
            status VARCHAR(50) DEFAULT 'active',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Add new columns to existing league_participants table
ALTER TABLE league_participants 
ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS total_points DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_tied INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_lost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_week_score DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS worst_week_score DECIMAL(8,2) DEFAULT 999999,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for league_participants
CREATE INDEX IF NOT EXISTS idx_league_participants_league_id ON league_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_league_participants_user_id ON league_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_league_participants_status ON league_participants(status);

-- 5. Create league_standings table for season-long leaderboards
CREATE TABLE IF NOT EXISTS league_standings (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    
    -- Season totals
    total_points DECIMAL(8,2) DEFAULT 0,
    total_matches_played INTEGER DEFAULT 0,
    total_matches_won INTEGER DEFAULT 0,
    total_matches_tied INTEGER DEFAULT 0,
    total_matches_lost INTEGER DEFAULT 0,
    
    -- Week-by-week breakdown (JSONB for flexibility)
    weekly_scores JSONB DEFAULT '{}',
    
    -- Calculated fields
    win_percentage DECIMAL(5,2) DEFAULT 0,
    average_points_per_week DECIMAL(5,2) DEFAULT 0,
    
    -- Drop worst weeks calculation
    points_after_drops DECIMAL(8,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(league_id, user_id)
);

-- Add indexes for league_standings
CREATE INDEX IF NOT EXISTS idx_league_standings_league_id ON league_standings(league_id);
CREATE INDEX IF NOT EXISTS idx_league_standings_total_points ON league_standings(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_league_standings_user_id ON league_standings(user_id);

-- 6. Create league_week_results table for individual week results
CREATE TABLE IF NOT EXISTS league_week_results (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    
    -- Week-specific results
    week_points DECIMAL(8,2) DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_tied INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    
    -- Links to existing weekly scoring system
    scorecard_id INTEGER REFERENCES weekly_scorecards(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(league_id, week_number, user_id)
);

-- Add indexes for league_week_results
CREATE INDEX IF NOT EXISTS idx_league_week_results_league_week ON league_week_results(league_id, week_number);
CREATE INDEX IF NOT EXISTS idx_league_week_results_user_id ON league_week_results(user_id);
CREATE INDEX IF NOT EXISTS idx_league_week_results_scorecard_id ON league_week_results(scorecard_id);

-- 7. Add comments for documentation
COMMENT ON TABLE league_weeks IS 'Tracks individual weeks within a league season';
COMMENT ON TABLE league_standings IS 'Season-long standings for league participants';
COMMENT ON TABLE league_week_results IS 'Individual week results for league participants';
COMMENT ON COLUMN tournaments.league_config IS 'JSON configuration for league settings and rules';
COMMENT ON COLUMN tournaments.is_league_week IS 'Indicates if this tournament is a weekly league round';
COMMENT ON COLUMN tournaments.league_week_number IS 'Week number within the league season';
COMMENT ON COLUMN tournaments.parent_league_id IS 'References the main league tournament for weekly rounds';

-- 8. Create a view for easy league overview
CREATE OR REPLACE VIEW league_overview AS
SELECT 
    t.id as league_id,
    t.name as league_name,
    t.status as league_status,
    t.league_config,
    ls.season_start_date,
    ls.season_end_date,
    ls.auto_progression,
    COUNT(lp.id) as participant_count,
    COUNT(lw.id) as total_weeks,
    COUNT(CASE WHEN lw.status = 'completed' THEN 1 END) as completed_weeks,
    COUNT(CASE WHEN lw.status = 'active' THEN 1 END) as active_weeks
FROM tournaments t
LEFT JOIN league_settings ls ON t.league_config->>'name' = ls.name
LEFT JOIN league_participants lp ON t.id = lp.league_id
LEFT JOIN league_weeks lw ON t.id = lw.league_id
WHERE t.type = 'league'
GROUP BY t.id, t.name, t.status, t.league_config, ls.season_start_date, ls.season_end_date, ls.auto_progression;

-- 9. Grant permissions (adjust as needed for your database setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO golfos_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO golfos_user;

-- 10. Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 1 League Database Schema successfully created!';
    RAISE NOTICE 'New tables added: league_weeks, league_standings, league_week_results';
    RAISE NOTICE 'Existing tables extended: tournaments, league_settings, league_participants';
    RAISE NOTICE 'New view created: league_overview';
    RAISE NOTICE 'All existing tournament functionality remains intact.';
END $$; 