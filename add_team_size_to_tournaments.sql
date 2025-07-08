-- Add team_size, hole_count, and simulator settings columns to tournaments table
-- This migration adds support for team-based tournaments, specific hole configurations, and simulator settings

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS team_size integer,
ADD COLUMN IF NOT EXISTS hole_count character varying(20) DEFAULT '18',
ADD COLUMN IF NOT EXISTS tee character varying(20) DEFAULT 'Red',
ADD COLUMN IF NOT EXISTS pins character varying(20) DEFAULT 'Friday',
ADD COLUMN IF NOT EXISTS putting_gimme character varying(10) DEFAULT '8',
ADD COLUMN IF NOT EXISTS elevation character varying(20) DEFAULT 'Course',
ADD COLUMN IF NOT EXISTS stimp character varying(10) DEFAULT '11',
ADD COLUMN IF NOT EXISTS mulligan character varying(20) DEFAULT 'No',
ADD COLUMN IF NOT EXISTS game_play character varying(30) DEFAULT 'Force Realistic',
ADD COLUMN IF NOT EXISTS firmness character varying(20) DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS wind character varying(20) DEFAULT 'None',
ADD COLUMN IF NOT EXISTS handicap_enabled boolean DEFAULT false;

-- Add comments to explain the values
COMMENT ON COLUMN tournaments.hole_count IS 'Values: 18, 9_front, 9_back, 9';
COMMENT ON COLUMN tournaments.tee IS 'Tee box selection: Red, White, Blue, Black, Gold';
COMMENT ON COLUMN tournaments.pins IS 'Pin position: Friday, Saturday, Sunday, Easy, Hard';
COMMENT ON COLUMN tournaments.putting_gimme IS 'Putting gimme distance in feet';
COMMENT ON COLUMN tournaments.elevation IS 'Elevation setting: Course, Off, High, Low';
COMMENT ON COLUMN tournaments.stimp IS 'Green speed (stimp rating)';
COMMENT ON COLUMN tournaments.mulligan IS 'Mulligan settings: No, Yes, 1 per hole, 2 per round';
COMMENT ON COLUMN tournaments.game_play IS 'Game play mode: Force Realistic, Allow Unrealistic, Tournament Mode';
COMMENT ON COLUMN tournaments.firmness IS 'Fairway/Green firmness: Normal, Soft, Firm, Very Firm';
COMMENT ON COLUMN tournaments.wind IS 'Wind settings: None, Light, Moderate, Strong, Random';
COMMENT ON COLUMN tournaments.handicap_enabled IS 'Whether handicap adjustments are enabled';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournaments_team_size ON tournaments(team_size);
CREATE INDEX IF NOT EXISTS idx_tournaments_hole_count ON tournaments(hole_count);
CREATE INDEX IF NOT EXISTS idx_tournaments_tee ON tournaments(tee);
CREATE INDEX IF NOT EXISTS idx_tournaments_pins ON tournaments(pins); 