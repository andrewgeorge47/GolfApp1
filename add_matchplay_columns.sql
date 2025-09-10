-- Add match play scoring columns to club_championship_matches table
ALTER TABLE club_championship_matches 
ADD COLUMN IF NOT EXISTS player1_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS player2_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS player1_net_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS player2_net_hole_scores JSONB,
ADD COLUMN IF NOT EXISTS player1_holes_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_holes_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_holes_lost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_holes_lost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_net_holes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_net_holes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS course_id INTEGER,
ADD COLUMN IF NOT EXISTS teebox VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN club_championship_matches.player1_hole_scores IS 'JSON array of gross scores for each hole for player 1';
COMMENT ON COLUMN club_championship_matches.player2_hole_scores IS 'JSON array of gross scores for each hole for player 2';
COMMENT ON COLUMN club_championship_matches.player1_net_hole_scores IS 'JSON array of net scores for each hole for player 1 (after handicap)';
COMMENT ON COLUMN club_championship_matches.player2_net_hole_scores IS 'JSON array of net scores for each hole for player 2 (after handicap)';
COMMENT ON COLUMN club_championship_matches.player1_holes_won IS 'Total holes won by player 1';
COMMENT ON COLUMN club_championship_matches.player2_holes_won IS 'Total holes won by player 2';
COMMENT ON COLUMN club_championship_matches.player1_holes_lost IS 'Total holes lost by player 1';
COMMENT ON COLUMN club_championship_matches.player2_holes_lost IS 'Total holes lost by player 2';
COMMENT ON COLUMN club_championship_matches.player1_net_holes IS 'Net holes won by player 1 (holes_won - holes_lost)';
COMMENT ON COLUMN club_championship_matches.player2_net_holes IS 'Net holes won by player 2 (holes_won - holes_lost)';
COMMENT ON COLUMN club_championship_matches.course_id IS 'ID of the course where the match was played';
COMMENT ON COLUMN club_championship_matches.teebox IS 'Teebox used for the match';

-- Add foreign key constraint for course_id
ALTER TABLE club_championship_matches 
ADD CONSTRAINT fk_club_championship_matches_course 
FOREIGN KEY (course_id) REFERENCES simulator_courses_combined(id);

