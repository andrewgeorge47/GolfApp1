-- =====================================================
-- CLEAN CHAMPIONSHIP DATABASE SCHEMA
-- Consolidates and cleans up the championship system tables
-- =====================================================

-- 1. DROP DUPLICATE/CONFLICTING TABLES
-- =====================================================

-- Drop tables that are duplicates or not needed
DROP TABLE IF EXISTS championship_matches CASCADE;
DROP TABLE IF EXISTS championship_rounds CASCADE;
DROP TABLE IF EXISTS national_tournament_seeding CASCADE;

-- 2. UPDATE TOURNAMENTS TABLE
-- =====================================================

-- Add championship-specific columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS tournament_series VARCHAR(100),
ADD COLUMN IF NOT EXISTS parent_tournament_id INTEGER REFERENCES tournaments(id),
ADD COLUMN IF NOT EXISTS is_club_championship BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_national_tournament BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS championship_round VARCHAR(50),
ADD COLUMN IF NOT EXISTS championship_club VARCHAR(100),
ADD COLUMN IF NOT EXISTS championship_type VARCHAR(50) DEFAULT 'single_club',
ADD COLUMN IF NOT EXISTS participating_clubs TEXT,
ADD COLUMN IF NOT EXISTS min_club_participants INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS auto_group_clubs BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_seed_champions BOOLEAN DEFAULT false;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_championship_type ON tournaments(championship_type);
CREATE INDEX IF NOT EXISTS idx_tournaments_parent ON tournaments(parent_tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_club_championship ON tournaments(is_club_championship);
CREATE INDEX IF NOT EXISTS idx_tournaments_national ON tournaments(is_national_tournament);

-- 3. CREATE CHAMPIONSHIP GROUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS championship_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    championship_type VARCHAR(50) NOT NULL, -- 'club_championship', 'national_championship'
    parent_group_id INTEGER REFERENCES championship_groups(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_championship_groups_type ON championship_groups(championship_type);
CREATE INDEX IF NOT EXISTS idx_championship_groups_parent ON championship_groups(parent_group_id);

-- 4. CREATE CLUB GROUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS club_groups (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    group_name VARCHAR(255) NOT NULL,
    participating_clubs TEXT[] NOT NULL, -- Array of club names
    min_participants INTEGER DEFAULT 4,
    max_participants INTEGER,
    participant_count INTEGER DEFAULT 0, -- Actual number of participants in this group
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, group_name)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_club_groups_tournament ON club_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_club_groups_clubs ON club_groups USING gin(participating_clubs);

-- 5. CREATE CLUB CHAMPIONSHIP PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS club_championship_participants (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    club VARCHAR(100) NOT NULL,
    club_group VARCHAR(100),
    total_score INTEGER DEFAULT 0,
    championship_rank INTEGER,
    is_club_champion BOOLEAN DEFAULT false,
    group_rank INTEGER,
    qualified_for_national BOOLEAN DEFAULT false,
    -- Match play tracking
    match_wins INTEGER DEFAULT 0,
    match_losses INTEGER DEFAULT 0,
    match_ties INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    -- Tiebreaker tracking
    tiebreaker_points INTEGER DEFAULT 0,
    total_holes_won INTEGER DEFAULT 0,
    total_holes_lost INTEGER DEFAULT 0,
    net_holes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_club_championship_tournament ON club_championship_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_club_championship_user ON club_championship_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_club_championship_club ON club_championship_participants(club);
CREATE INDEX IF NOT EXISTS idx_club_championship_group ON club_championship_participants(club_group);
CREATE INDEX IF NOT EXISTS idx_club_championship_qualified ON club_championship_participants(qualified_for_national);

-- 6. CREATE CHAMPIONSHIP MATCHES TABLE (CONSOLIDATED)
-- =====================================================

-- Drop the existing club_championship_matches table if it exists
DROP TABLE IF EXISTS club_championship_matches CASCADE;

-- Create a consolidated championship_matches table
CREATE TABLE championship_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    match_type VARCHAR(50) NOT NULL, -- 'club_championship', 'national_championship', 'regular'
    club_group VARCHAR(100), -- Only for club championships
    player1_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    player2_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    match_number INTEGER NOT NULL, -- 1, 2, 3 for club championships, round number for nationals
    -- Match results
    player1_holes_won INTEGER DEFAULT 0,
    player2_holes_won INTEGER DEFAULT 0,
    player1_holes_lost INTEGER DEFAULT 0,
    player2_holes_lost INTEGER DEFAULT 0,
    player1_net_holes INTEGER DEFAULT 0, -- holes_won - holes_lost
    player2_net_holes INTEGER DEFAULT 0, -- holes_won - holes_lost
    winner_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    match_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, in_progress
    match_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, match_type, club_group, player1_id, player2_id, match_number)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_championship_matches_tournament ON championship_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_championship_matches_type ON championship_matches(match_type);
CREATE INDEX IF NOT EXISTS idx_championship_matches_group ON championship_matches(club_group);
CREATE INDEX IF NOT EXISTS idx_championship_matches_player1 ON championship_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_championship_matches_player2 ON championship_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_championship_matches_winner ON championship_matches(winner_id);
CREATE INDEX IF NOT EXISTS idx_championship_matches_status ON championship_matches(match_status);

-- 7. CREATE CHAMPIONSHIP PROGRESSION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS championship_progression (
    id SERIAL PRIMARY KEY,
    club_championship_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    national_championship_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    club_group VARCHAR(100) NOT NULL,
    club_champion_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    seed_number INTEGER,
    progression_status VARCHAR(50) DEFAULT 'pending', -- pending, qualified, eliminated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_championship_id, club_group)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_championship_progression_club ON championship_progression(club_championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_progression_national ON championship_progression(national_championship_id);
CREATE INDEX IF NOT EXISTS idx_championship_progression_champion ON championship_progression(club_champion_id);
CREATE INDEX IF NOT EXISTS idx_championship_progression_status ON championship_progression(progression_status);

-- 8. CREATE USEFUL VIEWS
-- =====================================================

-- Club participant counts view
CREATE OR REPLACE VIEW club_participant_counts AS
SELECT 
    t.id as tournament_id,
    t.name as tournament_name,
    u.club,
    COUNT(p.user_member_id) as participant_count
FROM tournaments t
JOIN participation p ON t.id = p.tournament_id
JOIN users u ON p.user_member_id = u.member_id
WHERE t.is_club_championship = true
GROUP BY t.id, t.name, u.club
ORDER BY t.id, participant_count DESC;

-- Championship hierarchy view
CREATE OR REPLACE VIEW championship_hierarchy AS
SELECT 
    cg.id as group_id,
    cg.name as group_name,
    cg.championship_type,
    cg.parent_group_id,
    parent.name as parent_group_name,
    COUNT(t.id) as tournament_count,
    COUNT(CASE WHEN t.is_club_championship THEN 1 END) as club_championships,
    COUNT(CASE WHEN t.is_national_tournament THEN 1 END) as national_championships
FROM championship_groups cg
LEFT JOIN championship_groups parent ON cg.parent_group_id = parent.id
LEFT JOIN tournaments t ON t.championship_type = cg.championship_type
GROUP BY cg.id, cg.name, cg.championship_type, cg.parent_group_id, parent.name
ORDER BY cg.parent_group_id, cg.id;

-- Club champion qualifications view
CREATE OR REPLACE VIEW club_champion_qualifications AS
SELECT 
    ccp.tournament_id,
    ccp.club_group,
    ccp.user_id,
    u.first_name,
    u.last_name,
    u.club,
    ccp.total_score,
    ccp.championship_rank,
    ccp.is_club_champion,
    ccp.qualified_for_national,
    t.name as tournament_name,
    t.is_club_championship,
    t.is_national_tournament
FROM club_championship_participants ccp
JOIN users u ON ccp.user_id = u.member_id
JOIN tournaments t ON ccp.tournament_id = t.id
WHERE ccp.is_club_champion = true
ORDER BY ccp.tournament_id, ccp.championship_rank;

-- 9. INSERT SAMPLE DATA
-- =====================================================

-- Insert sample championship groups
INSERT INTO championship_groups (name, description, championship_type) VALUES
('2024 Club Championships', 'All club championship tournaments for 2024', 'club_championship'),
('2024 National Championship', 'National championship tournament for 2024', 'national_championship')
ON CONFLICT DO NOTHING;

-- 10. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'CLEAN CHAMPIONSHIP SCHEMA COMPLETED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Consolidated tables:';
    RAISE NOTICE '- championship_groups (championship hierarchy)';
    RAISE NOTICE '- club_groups (club grouping for tournaments)';
    RAISE NOTICE '- club_championship_participants (participant tracking)';
    RAISE NOTICE '- championship_matches (unified match tracking)';
    RAISE NOTICE '- championship_progression (advancement tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed duplicate tables:';
    RAISE NOTICE '- championship_matches (old)';
    RAISE NOTICE '- championship_rounds';
    RAISE NOTICE '- national_tournament_seeding';
    RAISE NOTICE '- club_championship_matches (consolidated)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created useful views:';
    RAISE NOTICE '- club_participant_counts';
    RAISE NOTICE '- championship_hierarchy';
    RAISE NOTICE '- club_champion_qualifications';
    RAISE NOTICE '=====================================================';
END $$;

