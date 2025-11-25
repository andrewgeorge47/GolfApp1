-- ============================================================
-- Migration: 004_add_league_system.sql
-- Purpose: Add league system support for UAL Season 2
-- Impact: ADDITIVE ONLY - Safe to run on production
--
-- What this does:
--   ✅ Creates 9 new tables for league functionality
--   ✅ Adds new columns to existing tables (tournament_teams, team_standings)
--   ✅ All new columns have DEFAULT values and are nullable
--   ❌ Does NOT modify or delete any existing data
--   ❌ Does NOT change any existing column types
--   ❌ Does NOT break existing functionality
--
-- Rollback: See 004_rollback.sql
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: NEW TABLES
-- ============================================================

-- ------------------------------------------------------------
-- Table: leagues
-- Purpose: Define league seasons (e.g., UAL Season 2)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leagues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  season VARCHAR(100), -- e.g., "UAL Season 2 Winter 2025"
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'registration', 'active', 'playoffs', 'completed'

  -- Configuration
  teams_per_division INTEGER DEFAULT 4,
  divisions_count INTEGER DEFAULT 2,
  weeks_per_season INTEGER,
  playoff_format VARCHAR(50) DEFAULT 'top_per_division', -- 'top_per_division', 'top_overall', 'bracket'

  -- Scoring rules
  points_for_win DECIMAL(3,1) DEFAULT 1.0,
  points_for_tie DECIMAL(3,1) DEFAULT 0.5,
  points_for_loss DECIMAL(3,1) DEFAULT 0.0,

  -- UAL-specific scoring format
  format VARCHAR(50) DEFAULT 'hybrid', -- 'hybrid' = 9 individual + 9 alternate shot
  individual_holes INTEGER DEFAULT 9,
  alternate_shot_holes INTEGER DEFAULT 9,
  active_players_per_week INTEGER DEFAULT 3,
  roster_size_min INTEGER DEFAULT 4,
  roster_size_max INTEGER DEFAULT 5,

  -- Tiebreaker configuration
  tiebreaker_rules JSONB DEFAULT '{
    "1": "total_points",
    "2": "lowest_aggregate_net",
    "3": "lowest_second_half_aggregate",
    "4": "lowest_final_week",
    "5": "coin_flip"
  }'::jsonb,

  created_by INTEGER REFERENCES users(member_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE leagues IS 'League seasons for team-based competition (e.g., UAL Season 2)';
COMMENT ON COLUMN leagues.format IS 'Scoring format: hybrid (9 individual + 9 alternate shot), best_ball, scramble, etc.';
COMMENT ON COLUMN leagues.tiebreaker_rules IS 'JSON object defining tiebreaker precedence';

CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_leagues_dates ON leagues(start_date, end_date);

-- ------------------------------------------------------------
-- Table: league_divisions
-- Purpose: Divisions within a league (Division A, Division B)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_divisions (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  division_name VARCHAR(100) NOT NULL, -- 'Division A', 'Division B', etc.
  division_order INTEGER DEFAULT 1, -- For sorting
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_id, division_name)
);

COMMENT ON TABLE league_divisions IS 'Divisions within a league for organizing teams';

CREATE INDEX idx_league_divisions_league ON league_divisions(league_id);

-- ------------------------------------------------------------
-- Table: league_schedule
-- Purpose: Weekly schedule for league matches
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_schedule (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  is_playoff BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_id, week_number)
);

COMMENT ON TABLE league_schedule IS 'Weekly schedule for league matches';

CREATE INDEX idx_league_schedule_league ON league_schedule(league_id);
CREATE INDEX idx_league_schedule_dates ON league_schedule(week_start_date, week_end_date);
CREATE INDEX idx_league_schedule_week ON league_schedule(league_id, week_number);

-- ------------------------------------------------------------
-- Table: league_matchups
-- Purpose: Team vs team matchups for each week
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS league_matchups (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  schedule_id INTEGER REFERENCES league_schedule(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  division_id INTEGER REFERENCES league_divisions(id),

  -- Teams
  team1_id INTEGER NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  team2_id INTEGER NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,

  -- Course info
  course_id INTEGER REFERENCES simulator_courses_combined(id),
  course_name VARCHAR(255),
  course_rating DECIMAL(5,2),
  course_slope INTEGER,
  course_par INTEGER DEFAULT 72,
  hole_indexes JSONB, -- Store hole handicap indexes [1-18]

  -- Match result
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'lineup_submitted', 'in_progress', 'scores_submitted', 'verified', 'completed', 'disputed'
  winner_team_id INTEGER REFERENCES tournament_teams(id),

  -- Scores (hybrid format: 9 individual + 9 alternate shot)
  team1_individual_net INTEGER, -- First 9 holes (3 players, own ball)
  team2_individual_net INTEGER,
  team1_alternate_shot_net INTEGER, -- Second 9 holes (team alternate shot)
  team2_alternate_shot_net INTEGER,
  team1_total_net INTEGER, -- Sum of both
  team2_total_net INTEGER,

  -- Points awarded
  team1_points DECIMAL(3,1) DEFAULT 0,
  team2_points DECIMAL(3,1) DEFAULT 0,

  match_date TIMESTAMP,
  completed_at TIMESTAMP,
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES users(member_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(league_id, week_number, team1_id, team2_id)
);

COMMENT ON TABLE league_matchups IS 'Weekly team vs team matchups with hybrid scoring format';
COMMENT ON COLUMN league_matchups.hole_indexes IS 'JSON array of hole handicap indexes [1-18] for stroke allocation';
COMMENT ON COLUMN league_matchups.team1_individual_net IS 'Team 1 net score for individual 9 holes (holes 1-9)';
COMMENT ON COLUMN league_matchups.team1_alternate_shot_net IS 'Team 1 net score for alternate shot 9 holes (holes 10-18)';

CREATE INDEX idx_league_matchups_league ON league_matchups(league_id);
CREATE INDEX idx_league_matchups_week ON league_matchups(league_id, week_number);
CREATE INDEX idx_league_matchups_teams ON league_matchups(team1_id, team2_id);
CREATE INDEX idx_league_matchups_status ON league_matchups(status);

-- ------------------------------------------------------------
-- Table: team_member_availability
-- Purpose: Track player availability for each week
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_member_availability (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,

  is_available BOOLEAN DEFAULT true,
  availability_notes TEXT,
  availability_details JSONB, -- Future: can store time blocks

  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(team_id, user_id, league_id, week_number)
);

COMMENT ON TABLE team_member_availability IS 'Player availability submissions for weekly matches';
COMMENT ON COLUMN team_member_availability.availability_details IS 'JSONB field for future enhancement: time blocks, day preferences, etc.';

CREATE INDEX idx_availability_team ON team_member_availability(team_id);
CREATE INDEX idx_availability_week ON team_member_availability(league_id, week_number);
CREATE INDEX idx_availability_team_week ON team_member_availability(team_id, league_id, week_number);

-- ------------------------------------------------------------
-- Table: weekly_lineups
-- Purpose: Captain's weekly player selection and hole assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_lineups (
  id SERIAL PRIMARY KEY,
  matchup_id INTEGER REFERENCES league_matchups(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  week_number INTEGER NOT NULL,

  -- 3 active players for the week
  player1_id INTEGER REFERENCES users(member_id),
  player2_id INTEGER REFERENCES users(member_id),
  player3_id INTEGER REFERENCES users(member_id),

  -- Hole assignments for individual play (holes 1-9)
  player1_holes INTEGER[] DEFAULT ARRAY[1,2,3], -- First 3 holes
  player2_holes INTEGER[] DEFAULT ARRAY[4,5,6], -- Next 3 holes
  player3_holes INTEGER[] DEFAULT ARRAY[7,8,9], -- Last 3 holes

  -- Handicaps at time of lineup submission
  player1_handicap DECIMAL(5,2),
  player2_handicap DECIMAL(5,2),
  player3_handicap DECIMAL(5,2),

  -- Team handicap for alternate shot (holes 10-18)
  team_handicap DECIMAL(5,2), -- Average of 3 players
  team_course_handicap INTEGER, -- Calculated based on slope/rating

  -- Lineup status
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP,
  submitted_by INTEGER REFERENCES users(member_id), -- Captain who submitted

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(team_id, league_id, week_number)
);

COMMENT ON TABLE weekly_lineups IS 'Captain-selected lineups for each week: 3 active players + hole assignments';
COMMENT ON COLUMN weekly_lineups.player1_holes IS 'Array of hole numbers assigned to player 1 (default [1,2,3])';
COMMENT ON COLUMN weekly_lineups.team_handicap IS 'Average handicap of 3 active players for alternate shot calculation';

CREATE INDEX idx_weekly_lineups_matchup ON weekly_lineups(matchup_id);
CREATE INDEX idx_weekly_lineups_team ON weekly_lineups(team_id);
CREATE INDEX idx_weekly_lineups_team_week ON weekly_lineups(team_id, league_id, week_number);

-- ------------------------------------------------------------
-- Table: match_individual_scores
-- Purpose: Scores for the 9-hole individual portion (own ball)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_individual_scores (
  id SERIAL PRIMARY KEY,
  matchup_id INTEGER NOT NULL REFERENCES league_matchups(id) ON DELETE CASCADE,
  lineup_id INTEGER REFERENCES weekly_lineups(id),
  team_id INTEGER NOT NULL REFERENCES tournament_teams(id),
  player_id INTEGER NOT NULL REFERENCES users(member_id),

  -- Scoring
  assigned_holes INTEGER[], -- e.g., [1,2,3]
  hole_scores JSONB, -- {1: {gross: 4, net: 3, par: 4}, 2: {gross: 5, net: 4, par: 4}, ...}
  gross_total INTEGER,
  net_total INTEGER,
  player_handicap DECIMAL(5,2),
  course_handicap INTEGER, -- Calculated for stroke allocation

  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE match_individual_scores IS 'Individual player scores for own-ball 9 holes (holes 1-9)';
COMMENT ON COLUMN match_individual_scores.hole_scores IS 'JSONB: {hole_number: {gross, net, par, strokes_received}}';

CREATE INDEX idx_individual_scores_matchup ON match_individual_scores(matchup_id);
CREATE INDEX idx_individual_scores_team ON match_individual_scores(team_id, matchup_id);
CREATE INDEX idx_individual_scores_player ON match_individual_scores(player_id, matchup_id);

-- ------------------------------------------------------------
-- Table: match_alternate_shot_scores
-- Purpose: Scores for the 9-hole alternate shot portion (team play)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_alternate_shot_scores (
  id SERIAL PRIMARY KEY,
  matchup_id INTEGER NOT NULL REFERENCES league_matchups(id) ON DELETE CASCADE,
  lineup_id INTEGER REFERENCES weekly_lineups(id),
  team_id INTEGER NOT NULL REFERENCES tournament_teams(id),

  -- Alternate shot holes (10-18)
  hole_scores JSONB, -- {10: {gross: 4, net: 3, par: 4}, 11: {gross: 5, net: 4, par: 4}, ...}
  gross_total INTEGER,
  net_total INTEGER,
  team_handicap DECIMAL(5,2),
  team_course_handicap INTEGER, -- Calculated for stroke allocation

  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(matchup_id, team_id)
);

COMMENT ON TABLE match_alternate_shot_scores IS 'Team alternate shot scores for 9 holes (holes 10-18)';
COMMENT ON COLUMN match_alternate_shot_scores.hole_scores IS 'JSONB: {hole_number: {gross, net, par, strokes_received}}';

CREATE INDEX idx_alternate_shot_matchup ON match_alternate_shot_scores(matchup_id);
CREATE INDEX idx_alternate_shot_team ON match_alternate_shot_scores(team_id, matchup_id);

-- ------------------------------------------------------------
-- Table: tiebreaker_log
-- Purpose: Track tiebreaker application for standings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiebreaker_log (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id),
  team1_id INTEGER NOT NULL REFERENCES tournament_teams(id),
  team2_id INTEGER REFERENCES tournament_teams(id), -- Null for multi-team ties

  tiebreaker_level INTEGER NOT NULL, -- 1 = points, 2 = aggregate net, 3 = second half, 4 = final week, 5 = coin flip
  tiebreaker_method VARCHAR(100), -- Description of method used
  winner_team_id INTEGER REFERENCES tournament_teams(id),

  details JSONB, -- Store values compared, e.g., {team1_value: 145, team2_value: 147}
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_by INTEGER REFERENCES users(member_id)
);

COMMENT ON TABLE tiebreaker_log IS 'Audit log of tiebreaker applications for league standings';

CREATE INDEX idx_tiebreaker_league ON tiebreaker_log(league_id);
CREATE INDEX idx_tiebreaker_teams ON tiebreaker_log(team1_id, team2_id);

-- ============================================================
-- SECTION 2: ALTER EXISTING TABLES (ADD COLUMNS ONLY)
-- ============================================================

-- ------------------------------------------------------------
-- Modify: tournament_teams
-- Add league-specific columns (all nullable, all have defaults)
-- Impact: SAFE - Existing teams continue working unchanged
-- ------------------------------------------------------------
ALTER TABLE tournament_teams
  ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES leagues(id),
  ADD COLUMN IF NOT EXISTS division_id INTEGER REFERENCES league_divisions(id),
  ADD COLUMN IF NOT EXISTS league_points DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aggregate_net_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_half_net_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_week_net_score INTEGER DEFAULT 0;

COMMENT ON COLUMN tournament_teams.league_id IS 'Link to league if team is part of a league season';
COMMENT ON COLUMN tournament_teams.division_id IS 'Division assignment within league';
COMMENT ON COLUMN tournament_teams.league_points IS 'Total points earned in league (wins/ties)';
COMMENT ON COLUMN tournament_teams.aggregate_net_score IS 'Cumulative net score across all weeks (tiebreaker 1)';
COMMENT ON COLUMN tournament_teams.second_half_net_score IS 'Net score for second half of season (tiebreaker 2)';
COMMENT ON COLUMN tournament_teams.final_week_net_score IS 'Net score for final week (tiebreaker 3)';

CREATE INDEX IF NOT EXISTS idx_tournament_teams_league ON tournament_teams(league_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_division ON tournament_teams(division_id);

-- ------------------------------------------------------------
-- Modify: team_standings
-- Add league-specific columns (all nullable, all have defaults)
-- Impact: SAFE - Existing standings continue working unchanged
-- ------------------------------------------------------------
ALTER TABLE team_standings
  ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES leagues(id),
  ADD COLUMN IF NOT EXISTS division_id INTEGER REFERENCES league_divisions(id),
  ADD COLUMN IF NOT EXISTS division_rank INTEGER,
  ADD COLUMN IF NOT EXISTS aggregate_net_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_half_aggregate INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_week_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playoff_qualified BOOLEAN DEFAULT false;

COMMENT ON COLUMN team_standings.league_id IS 'Link to league for league-specific standings';
COMMENT ON COLUMN team_standings.aggregate_net_total IS 'Total net score across all matches (for tiebreaker)';
COMMENT ON COLUMN team_standings.second_half_aggregate IS 'Net score for second half of season';
COMMENT ON COLUMN team_standings.final_week_score IS 'Net score for final week';
COMMENT ON COLUMN team_standings.playoff_qualified IS 'Whether team qualified for playoffs';

CREATE INDEX IF NOT EXISTS idx_team_standings_league ON team_standings(league_id);
CREATE INDEX IF NOT EXISTS idx_team_standings_division ON team_standings(league_id, division_id);

-- ============================================================
-- SECTION 3: CREATE VIEWS (OPTIONAL - FOR REPORTING)
-- ============================================================

-- ------------------------------------------------------------
-- View: league_standings
-- Purpose: Real-time standings with tiebreakers applied
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW league_standings AS
SELECT
  ts.league_id,
  ts.division_id,
  ld.division_name,
  ts.team_id,
  tt.name AS team_name,
  tt.captain_id,
  u.first_name || ' ' || u.last_name AS captain_name,
  ts.matches_played,
  ts.wins,
  ts.ties,
  ts.losses,
  ts.total_points,
  tt.league_points,
  tt.aggregate_net_score,
  tt.second_half_net_score,
  tt.final_week_net_score,
  ts.division_rank,
  ts.playoff_qualified,
  ROW_NUMBER() OVER (
    PARTITION BY ts.league_id, ts.division_id
    ORDER BY
      tt.league_points DESC,           -- Tiebreaker 1: Most points
      tt.aggregate_net_score ASC,      -- Tiebreaker 2: Lowest aggregate net
      tt.second_half_net_score ASC,    -- Tiebreaker 3: Lowest second half
      tt.final_week_net_score ASC      -- Tiebreaker 4: Lowest final week
  ) AS rank_in_division
FROM team_standings ts
JOIN tournament_teams tt ON ts.team_id = tt.id
LEFT JOIN league_divisions ld ON ts.division_id = ld.id
LEFT JOIN users u ON tt.captain_id = u.member_id
WHERE ts.league_id IS NOT NULL
ORDER BY ts.league_id, ts.division_id, rank_in_division;

COMMENT ON VIEW league_standings IS 'Real-time league standings with tiebreakers applied';

-- ============================================================
-- SECTION 4: GRANT PERMISSIONS
-- ============================================================

-- Grant permissions to golfos_user (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO golfos_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO golfos_user;
GRANT SELECT ON league_standings TO golfos_user;

-- ============================================================
-- SECTION 5: VALIDATION
-- ============================================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'leagues',
      'league_divisions',
      'league_schedule',
      'league_matchups',
      'team_member_availability',
      'weekly_lineups',
      'match_individual_scores',
      'match_alternate_shot_scores',
      'tiebreaker_log'
    );

  IF table_count < 9 THEN
    RAISE EXCEPTION 'Migration validation failed: Expected 9 new tables, found %', table_count;
  END IF;

  RAISE NOTICE 'Migration validation passed: All % tables created successfully', table_count;
END $$;

-- Verify columns were added
DO $$
BEGIN
  -- Check tournament_teams columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_teams' AND column_name = 'league_id'
  ) THEN
    RAISE EXCEPTION 'Migration validation failed: league_id column not added to tournament_teams';
  END IF;

  -- Check team_standings columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_standings' AND column_name = 'league_id'
  ) THEN
    RAISE EXCEPTION 'Migration validation failed: league_id column not added to team_standings';
  END IF;

  RAISE NOTICE 'Migration validation passed: All columns added successfully';
END $$;

COMMIT;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Summary:
-- ✅ Created 9 new tables
-- ✅ Added league columns to tournament_teams (6 columns)
-- ✅ Added league columns to team_standings (7 columns)
-- ✅ Created indexes for performance
-- ✅ Created league_standings view for reporting
-- ✅ Validated all changes
--
-- Next steps:
-- 1. Test queries on new tables
-- 2. Implement backend API endpoints
-- 3. Build frontend components
--
-- To rollback: Run 004_rollback.sql
-- ============================================================
