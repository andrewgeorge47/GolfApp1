-- =====================================================
-- NATIONAL CHAMPIONSHIP ENHANCEMENTS
-- Adds course selection per round and match storage for national championships
-- =====================================================

-- Add course columns to tournaments table for per-round course selection
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS round_1_course VARCHAR(255),
ADD COLUMN IF NOT EXISTS round_1_course_id INTEGER REFERENCES simulator_courses_combined(id),
ADD COLUMN IF NOT EXISTS round_2_course VARCHAR(255),
ADD COLUMN IF NOT EXISTS round_2_course_id INTEGER REFERENCES simulator_courses_combined(id),
ADD COLUMN IF NOT EXISTS round_3_course VARCHAR(255),
ADD COLUMN IF NOT EXISTS round_3_course_id INTEGER REFERENCES simulator_courses_combined(id);

-- Add columns to store round-specific teebox
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS round_1_teebox VARCHAR(50),
ADD COLUMN IF NOT EXISTS round_2_teebox VARCHAR(50),
ADD COLUMN IF NOT EXISTS round_3_teebox VARCHAR(50);

-- Add comment columns for admin notes per round
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS round_1_notes TEXT,
ADD COLUMN IF NOT EXISTS round_2_notes TEXT,
ADD COLUMN IF NOT EXISTS round_3_notes TEXT;

-- Ensure club_championship_matches supports national championship matches
-- Add columns for storing match details if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'club_championship_matches' 
                   AND column_name = 'player1_hole_scores') THEN
        ALTER TABLE club_championship_matches 
        ADD COLUMN player1_hole_scores JSONB,
        ADD COLUMN player2_hole_scores JSONB,
        ADD COLUMN player1_net_hole_scores JSONB,
        ADD COLUMN player2_net_hole_scores JSONB,
        ADD COLUMN course_id INTEGER REFERENCES simulator_courses_combined(id),
        ADD COLUMN teebox VARCHAR(50),
        ADD COLUMN player1_scorecard_photo_url TEXT,
        ADD COLUMN player2_scorecard_photo_url TEXT;
    END IF;
END $$;

-- Add round_number column separately
ALTER TABLE club_championship_matches 
ADD COLUMN IF NOT EXISTS round_number INTEGER;

-- Add index for round_number on club_championship_matches
CREATE INDEX IF NOT EXISTS idx_club_championship_matches_round ON club_championship_matches(round_number);

-- Add a national championship matches table if needed
CREATE TABLE IF NOT EXISTS national_championship_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    player2_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES simulator_courses_combined(id),
    teebox VARCHAR(50),
    -- Match results
    player1_holes_won INTEGER DEFAULT 0,
    player2_holes_won INTEGER DEFAULT 0,
    player1_holes_lost INTEGER DEFAULT 0,
    player2_holes_lost INTEGER DEFAULT 0,
    player1_net_holes INTEGER DEFAULT 0,
    player2_net_holes INTEGER DEFAULT 0,
    winner_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    match_status VARCHAR(50) DEFAULT 'pending',
    match_date DATE,
    -- Hole-by-hole scores
    player1_hole_scores JSONB,
    player2_hole_scores JSONB,
    player1_net_hole_scores JSONB,
    player2_net_hole_scores JSONB,
    player1_scorecard_photo_url TEXT,
    player2_scorecard_photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, round_number, match_number)
);

-- Add indexes for national championship matches
CREATE INDEX IF NOT EXISTS idx_national_championship_matches_tournament ON national_championship_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_national_championship_matches_round ON national_championship_matches(round_number);
CREATE INDEX IF NOT EXISTS idx_national_championship_matches_player1 ON national_championship_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_national_championship_matches_player2 ON national_championship_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_national_championship_matches_winner ON national_championship_matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_national_championship_matches_status ON national_championship_matches(match_status);

-- Add manual champion override field to club_championship_participants
ALTER TABLE club_championship_participants
ADD COLUMN IF NOT EXISTS manually_selected_champion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS champion_selection_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_club_championship_participants_manually_selected ON club_championship_participants(manually_selected_champion);

-- Add success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'NATIONAL CHAMPIONSHIP ENHANCEMENTS COMPLETED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Added columns to tournaments:';
    RAISE NOTICE '- round_1/2/3_course';
    RAISE NOTICE '- round_1/2/3_course_id';
    RAISE NOTICE '- round_1/2/3_teebox';
    RAISE NOTICE '- round_1/2/3_notes';
    RAISE NOTICE '';
    RAISE NOTICE 'Enhanced club_championship_matches table';
    RAISE NOTICE 'Created national_championship_matches table';
    RAISE NOTICE 'Added manually_selected_champion field';
    RAISE NOTICE '=====================================================';
END $$;

