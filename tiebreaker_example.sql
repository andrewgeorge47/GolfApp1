-- =====================================================
-- TIEBREAKER SYSTEM EXAMPLE
-- Demonstrates how the tiebreaker system works for club championships
-- =====================================================

-- Example: Club Championship Group Results
-- Players: Alice, Bob, Charlie, David
-- Each plays 3 matches against the other 3 players

-- Sample match results:
-- Match 1: Alice vs Bob (Alice wins 3&2) = Alice gets 3 tiebreaker points
-- Match 2: Alice vs Charlie (Alice wins 2&1) = Alice gets 2 tiebreaker points  
-- Match 3: Alice vs David (Alice wins 4&3) = Alice gets 4 tiebreaker points
-- Total tiebreaker points for Alice: 3 + 2 + 4 = 9

-- Match 1: Bob vs Alice (Bob loses 3&2) = Bob gets 0 tiebreaker points
-- Match 2: Bob vs Charlie (Bob wins 1up) = Bob gets 1 tiebreaker point
-- Match 3: Bob vs David (Bob wins 2&1) = Bob gets 2 tiebreaker points
-- Total tiebreaker points for Bob: 0 + 1 + 2 = 3

-- Final standings would be:
-- 1. Alice: 3-0-0 record, 9 tiebreaker points
-- 2. Bob: 2-1-0 record, 3 tiebreaker points
-- 3. Charlie: 1-2-0 record, 2 tiebreaker points
-- 4. David: 0-3-0 record, 0 tiebreaker points

-- SQL Query to determine club champion with tiebreaker:
SELECT 
    ccp.user_id,
    u.first_name,
    u.last_name,
    u.club,
    ccp.club_group,
    ccp.match_wins,
    ccp.match_losses,
    ccp.match_ties,
    ccp.tiebreaker_points,
    ccp.net_holes,
    ccp.total_holes_won,
    ccp.total_holes_lost,
    ROW_NUMBER() OVER (
        PARTITION BY ccp.tournament_id, ccp.club_group 
        ORDER BY 
            ccp.match_wins DESC,
            ccp.match_ties DESC,
            ccp.tiebreaker_points DESC,
            ccp.net_holes DESC
    ) as group_rank
FROM club_championship_participants ccp
JOIN users u ON ccp.user_id = u.member_id
WHERE ccp.tournament_id = ? 
  AND ccp.club_group = ?
ORDER BY group_rank;

-- Update championship rank and determine group champion:
UPDATE club_championship_participants 
SET 
    championship_rank = subquery.group_rank,
    is_club_champion = (subquery.group_rank = 1),
    qualified_for_national = (subquery.group_rank = 1)
FROM (
    SELECT 
        user_id,
        ROW_NUMBER() OVER (
            PARTITION BY tournament_id, club_group 
            ORDER BY 
                match_wins DESC,
                match_ties DESC,
                tiebreaker_points DESC,
                net_holes DESC
        ) as group_rank
    FROM club_championship_participants
    WHERE tournament_id = ?
) subquery
WHERE club_championship_participants.user_id = subquery.user_id;

-- View to show final club championship standings:
CREATE OR REPLACE VIEW club_championship_standings AS
SELECT 
    ccp.tournament_id,
    ccp.club_group,
    ccp.user_id,
    u.first_name,
    u.last_name,
    u.club,
    ccp.match_wins,
    ccp.match_losses,
    ccp.match_ties,
    ccp.tiebreaker_points,
    ccp.net_holes,
    ccp.championship_rank,
    ccp.is_club_champion,
    ccp.qualified_for_national,
    t.name as tournament_name
FROM club_championship_participants ccp
JOIN users u ON ccp.user_id = u.member_id
JOIN tournaments t ON ccp.tournament_id = t.id
ORDER BY ccp.tournament_id, ccp.club_group, ccp.championship_rank;

-- Example usage:
-- SELECT * FROM club_championship_standings 
-- WHERE tournament_id = 123 AND club_group = 'Group A'
-- ORDER BY championship_rank;
