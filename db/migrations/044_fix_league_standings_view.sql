-- Migration: Fix league_standings VIEW to reference ground truth data
--
-- Problem: league_standings was reading team_name, division_id, captain info from
-- team_standings table which contained stale/duplicate data. When teams were moved
-- between divisions, the VIEW showed incorrect assignments.
--
-- Solution: Make tournament_teams the base table (ground truth) and LEFT JOIN
-- team_standings only for calculated stats (wins, losses, points).

CREATE OR REPLACE VIEW league_standings AS
SELECT
  tt.league_id,
  tt.division_id,                                           -- ✅ Ground truth from tournament_teams
  ld.division_name,                                         -- ✅ From league_divisions via tournament_teams
  tt.id AS team_id,                                         -- ✅ Ground truth
  tt.name AS team_name,                                     -- ✅ Ground truth from tournament_teams
  tt.captain_id,                                            -- ✅ Ground truth from tournament_teams
  u.first_name || ' ' || u.last_name AS captain_name,      -- ✅ From users via tournament_teams
  COALESCE(ts.matches_played, 0) AS matches_played,        -- Calculated stat from team_standings
  COALESCE(ts.wins, 0) AS wins,                            -- Calculated stat
  COALESCE(ts.ties, 0) AS ties,                            -- Calculated stat
  COALESCE(ts.losses, 0) AS losses,                        -- Calculated stat
  COALESCE(ts.total_points, 0) AS total_points,           -- Calculated stat
  tt.league_points,                                        -- Stored in tournament_teams for quick access
  tt.aggregate_net_score,                                  -- Stored in tournament_teams for quick access
  tt.second_half_net_score,                               -- Stored in tournament_teams
  tt.final_week_net_score,                                -- Stored in tournament_teams
  COALESCE(ts.division_rank, 0) AS division_rank,         -- Calculated stat
  COALESCE(ts.playoff_qualified, false) AS playoff_qualified, -- Calculated stat
  ROW_NUMBER() OVER (
    PARTITION BY tt.league_id, tt.division_id
    ORDER BY
      tt.league_points DESC,           -- Tiebreaker 1: Most points
      tt.aggregate_net_score ASC,      -- Tiebreaker 2: Lowest aggregate net
      tt.second_half_net_score ASC,    -- Tiebreaker 3: Lowest second half
      tt.final_week_net_score ASC,     -- Tiebreaker 4: Lowest final week
      tt.name ASC                      -- Tiebreaker 5: Team name alphabetically
  ) AS rank_in_division
FROM tournament_teams tt                                    -- ✅ Ground truth is the base table
LEFT JOIN team_standings ts
  ON ts.team_id = tt.id AND ts.league_id = tt.league_id   -- LEFT JOIN for calculated stats only
LEFT JOIN league_divisions ld
  ON tt.division_id = ld.id                                -- ✅ Via tournament_teams division_id
LEFT JOIN users u
  ON tt.captain_id = u.member_id                           -- ✅ Via tournament_teams captain_id
WHERE tt.league_id IS NOT NULL
ORDER BY tt.league_id, tt.division_id, rank_in_division;

COMMENT ON VIEW league_standings IS 'Real-time league standings with tiebreakers applied. Uses tournament_teams as source of truth for team/division/captain data, and team_standings only for calculated stats.';
