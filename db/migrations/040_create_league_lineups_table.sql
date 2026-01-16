-- Migration: Create league_lineups table for storing team lineups

CREATE TABLE IF NOT EXISTS league_lineups (
  id SERIAL PRIMARY KEY,
  matchup_id INTEGER NOT NULL REFERENCES league_matchups(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  player1_id INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  player2_id INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  player3_id INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
  player1_handicap DECIMAL(4,1),
  player2_handicap DECIMAL(4,1),
  player3_handicap DECIMAL(4,1),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(matchup_id, team_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_league_lineups_matchup ON league_lineups(matchup_id);
CREATE INDEX IF NOT EXISTS idx_league_lineups_team ON league_lineups(team_id);

COMMENT ON TABLE league_lineups IS 'Stores team lineups for league matchups with 3 active players per team';
