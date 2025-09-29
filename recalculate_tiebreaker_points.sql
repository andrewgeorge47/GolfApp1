-- =====================================================
-- RECALCULATE TIEBREAKER POINTS FOR EXISTING MATCHES
-- This script applies the new traditional match play scoring logic
-- to previously scored club championship matches
-- =====================================================

-- First, let's see what we're working with
SELECT 
    t.name as tournament_name,
    COUNT(ccm.id) as completed_matches,
    COUNT(DISTINCT ccp.user_id) as participants
FROM tournaments t
JOIN club_championship_matches ccm ON t.id = ccm.tournament_id
JOIN club_championship_participants ccp ON t.id = ccp.tournament_id
WHERE ccm.match_status = 'completed'
GROUP BY t.id, t.name
ORDER BY t.id;

-- Create a temporary table to store the recalculated tiebreaker points
CREATE TEMP TABLE temp_tiebreaker_recalc AS
SELECT 
    ccp.tournament_id,
    ccp.user_id,
    ccp.club_group,
    -- Calculate new tiebreaker points using traditional match play logic
    COALESCE(SUM(
        CASE 
            WHEN ccm.winner_id = ccp.user_id THEN 
                GREATEST(1, CASE 
                    WHEN ccm.player1_id = ccp.user_id THEN ccm.player1_net_holes 
                    ELSE ccm.player2_net_holes 
                END)
            ELSE 0 
        END
    ), 0) as new_tiebreaker_points,
    -- Recalculate match record
    COUNT(CASE WHEN ccm.winner_id = ccp.user_id THEN 1 END) as new_match_wins,
    COUNT(CASE WHEN ccm.winner_id != ccp.user_id AND ccm.winner_id IS NOT NULL THEN 1 END) as new_match_losses,
    COUNT(CASE WHEN ccm.winner_id IS NULL AND ccm.match_status = 'completed' THEN 1 END) as new_match_ties
FROM club_championship_participants ccp
LEFT JOIN club_championship_matches ccm ON (
    ccp.tournament_id = ccm.tournament_id 
    AND (ccm.player1_id = ccp.user_id OR ccm.player2_id = ccp.user_id)
    AND ccm.match_status = 'completed'
)
GROUP BY ccp.tournament_id, ccp.user_id, ccp.club_group;

-- Show the changes that will be made
SELECT 
    u.first_name,
    u.last_name,
    t.name as tournament_name,
    ttr.club_group,
    ccp.tiebreaker_points as old_tiebreaker_points,
    ttr.new_tiebreaker_points,
    (ttr.new_tiebreaker_points - ccp.tiebreaker_points) as tiebreaker_change,
    ccp.match_wins as old_wins,
    ttr.new_match_wins,
    ccp.match_losses as old_losses,
    ttr.new_match_losses,
    ccp.match_ties as old_ties,
    ttr.new_match_ties
FROM temp_tiebreaker_recalc ttr
JOIN club_championship_participants ccp ON (
    ttr.tournament_id = ccp.tournament_id 
    AND ttr.user_id = ccp.user_id
)
JOIN users u ON ttr.user_id = u.member_id
JOIN tournaments t ON ttr.tournament_id = t.id
ORDER BY t.id, ttr.club_group, ttr.new_tiebreaker_points DESC;

-- Uncomment the following lines to actually perform the update
-- WARNING: This will modify existing data!

/*
-- Update the club_championship_participants table with recalculated values
UPDATE club_championship_participants 
SET 
    tiebreaker_points = ttr.new_tiebreaker_points,
    match_wins = ttr.new_match_wins,
    match_losses = ttr.new_match_losses,
    match_ties = ttr.new_match_ties,
    updated_at = CURRENT_TIMESTAMP
FROM temp_tiebreaker_recalc ttr
WHERE club_championship_participants.tournament_id = ttr.tournament_id
  AND club_championship_participants.user_id = ttr.user_id;

-- Verify the updates
SELECT 
    u.first_name,
    u.last_name,
    t.name as tournament_name,
    ccp.club_group,
    ccp.tiebreaker_points,
    ccp.match_wins,
    ccp.match_losses,
    ccp.match_ties
FROM club_championship_participants ccp
JOIN users u ON ccp.user_id = u.member_id
JOIN tournaments t ON ccp.tournament_id = t.id
WHERE ccp.tournament_id IN (SELECT DISTINCT tournament_id FROM temp_tiebreaker_recalc)
ORDER BY t.id, ccp.club_group, ccp.tiebreaker_points DESC;
*/

-- Clean up
DROP TABLE temp_tiebreaker_recalc;
