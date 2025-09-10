-- =====================================================
-- MATCH PLAY SCORING SCHEMA UPDATE
-- Adds hole-by-hole scoring support for match play tournaments
-- =====================================================

-- 1. ADD HOLE INDEXES TO SIMULATOR COURSES
-- =====================================================

-- Add hole_indexes column to simulator_courses_combined if it doesn't exist
ALTER TABLE simulator_courses_combined 
ADD COLUMN IF NOT EXISTS hole_indexes JSONB;

-- Add comment
COMMENT ON COLUMN simulator_courses_combined.hole_indexes IS 'JSONB array of handicap indexes for each hole (1-18)';

-- 2. UPDATE CLUB CHAMPIONSHIP MATCHES TABLE
-- =====================================================

-- Add hole-by-hole scoring columns to club_championship_matches
ALTER TABLE club_championship_matches 
ADD COLUMN IF NOT EXISTS player1_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS player2_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS player1_net_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS player2_net_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES simulator_courses_combined(id),
ADD COLUMN IF NOT EXISTS teebox VARCHAR(100),
ADD COLUMN IF NOT EXISTS course_rating NUMERIC,
ADD COLUMN IF NOT EXISTS course_slope INTEGER;

-- Add comments
COMMENT ON COLUMN club_championship_matches.player1_hole_scores IS 'JSONB array of gross scores for each hole (1-18)';
COMMENT ON COLUMN club_championship_matches.player2_hole_scores IS 'JSONB array of gross scores for each hole (1-18)';
COMMENT ON COLUMN club_championship_matches.player1_net_hole_scores IS 'JSONB array of net scores (gross - handicap strokes) for each hole';
COMMENT ON COLUMN club_championship_matches.player2_net_hole_scores IS 'JSONB array of net scores (gross - handicap strokes) for each hole';

-- 3. CREATE MATCH PLAY SCORING HELPER FUNCTIONS
-- =====================================================

-- Function to calculate net score for a hole
CREATE OR REPLACE FUNCTION calculate_net_score(
    gross_score INTEGER,
    player_handicap NUMERIC,
    hole_index INTEGER
) RETURNS INTEGER AS $$
BEGIN
    -- Calculate how many handicap strokes the player gets on this hole
    DECLARE
        handicap_strokes INTEGER;
    BEGIN
        -- If hole_index is 0 or NULL, no handicap strokes
        IF hole_index IS NULL OR hole_index = 0 THEN
            RETURN gross_score;
        END IF;
        
        -- Calculate handicap strokes for this hole
        handicap_strokes := FLOOR(player_handicap / 18) + 
                           CASE WHEN (player_handicap % 18) >= hole_index THEN 1 ELSE 0 END;
        
        -- Return net score (gross - handicap strokes)
        RETURN GREATEST(1, gross_score - handicap_strokes);
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to determine match play result
CREATE OR REPLACE FUNCTION determine_match_result(
    player1_net_scores JSONB,
    player2_net_scores JSONB
) RETURNS TABLE(
    player1_holes_won INTEGER,
    player2_holes_won INTEGER,
    player1_holes_lost INTEGER,
    player2_holes_lost INTEGER,
    player1_net_holes INTEGER,
    player2_net_holes INTEGER,
    winner_id INTEGER
) AS $$
DECLARE
    hole_num INTEGER;
    p1_score INTEGER;
    p2_score INTEGER;
    p1_holes_won INTEGER := 0;
    p2_holes_won INTEGER := 0;
    p1_holes_lost INTEGER := 0;
    p2_holes_lost INTEGER := 0;
    p1_net_holes INTEGER := 0;
    p2_net_holes INTEGER := 0;
BEGIN
    -- Loop through holes 1-18
    FOR hole_num IN 1..18 LOOP
        -- Get scores for this hole (default to 0 if not found)
        p1_score := COALESCE((player1_net_scores->>(hole_num-1)::text)::INTEGER, 0);
        p2_score := COALESCE((player2_net_scores->>(hole_num-1)::text)::INTEGER, 0);
        
        -- Skip holes with no scores (0 or NULL)
        IF p1_score = 0 OR p2_score = 0 THEN
            CONTINUE;
        END IF;
        
        -- Determine hole winner
        IF p1_score < p2_score THEN
            p1_holes_won := p1_holes_won + 1;
            p2_holes_lost := p2_holes_lost + 1;
        ELSIF p2_score < p1_score THEN
            p2_holes_won := p2_holes_won + 1;
            p1_holes_lost := p1_holes_lost + 1;
        END IF;
        -- If scores are equal, no one wins the hole (halved)
    END LOOP;
    
    -- Calculate net holes (holes won - holes lost)
    p1_net_holes := p1_holes_won - p1_holes_lost;
    p2_net_holes := p2_holes_won - p2_holes_lost;
    
    -- Determine winner (NULL if tied)
    winner_id := CASE 
        WHEN p1_net_holes > p2_net_holes THEN 1
        WHEN p2_net_holes > p1_net_holes THEN 2
        ELSE NULL
    END;
    
    RETURN QUERY SELECT p1_holes_won, p2_holes_won, p1_holes_lost, p2_holes_lost, p1_net_holes, p2_net_holes, winner_id;
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE MATCH PLAY SCORING VIEW
-- =====================================================

CREATE OR REPLACE VIEW match_play_results AS
SELECT 
    cm.id as match_id,
    cm.tournament_id,
    cm.club_group,
    cm.player1_id,
    cm.player2_id,
    cm.match_number,
    u1.first_name || ' ' || u1.last_name as player1_name,
    u2.first_name || ' ' || u2.last_name as player2_name,
    cm.player1_hole_scores,
    cm.player2_hole_scores,
    cm.player1_net_hole_scores,
    cm.player2_net_hole_scores,
    cm.player1_holes_won,
    cm.player2_holes_won,
    cm.player1_holes_lost,
    cm.player2_holes_lost,
    cm.player1_net_holes,
    cm.player2_net_holes,
    cm.winner_id,
    CASE 
        WHEN cm.winner_id = cm.player1_id THEN u1.first_name || ' ' || u1.last_name
        WHEN cm.winner_id = cm.player2_id THEN u2.first_name || ' ' || u2.last_name
        ELSE 'Tied'
    END as winner_name,
    cm.match_status,
    cm.match_date,
    c.name as course_name,
    cm.teebox,
    cm.course_rating,
    cm.course_slope
FROM club_championship_matches cm
LEFT JOIN users u1 ON cm.player1_id = u1.member_id
LEFT JOIN users u2 ON cm.player2_id = u2.member_id
LEFT JOIN simulator_courses_combined c ON cm.course_id = c.id
ORDER BY cm.tournament_id, cm.club_group, cm.match_number;

-- 5. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MATCH PLAY SCORING SCHEMA UPDATE COMPLETED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Added columns:';
    RAISE NOTICE '- simulator_courses_combined.hole_indexes (handicap indexes)';
    RAISE NOTICE '- club_championship_matches.player1_hole_scores (gross scores)';
    RAISE NOTICE '- club_championship_matches.player2_hole_scores (gross scores)';
    RAISE NOTICE '- club_championship_matches.player1_net_hole_scores (net scores)';
    RAISE NOTICE '- club_championship_matches.player2_net_hole_scores (net scores)';
    RAISE NOTICE '- club_championship_matches.course_id (course reference)';
    RAISE NOTICE '- club_championship_matches.teebox (teebox used)';
    RAISE NOTICE '- club_championship_matches.course_rating (course rating)';
    RAISE NOTICE '- club_championship_matches.course_slope (course slope)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created functions:';
    RAISE NOTICE '- calculate_net_score() (handicap calculation)';
    RAISE NOTICE '- determine_match_result() (match play result)';
    RAISE NOTICE '';
    RAISE NOTICE 'Created view:';
    RAISE NOTICE '- match_play_results (comprehensive match data)';
    RAISE NOTICE '=====================================================';
END $$;

