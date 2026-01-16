-- Migration: 042_add_playing_time_to_matchups.sql
-- Purpose: Add playing time fields for team captains to set when they plan to play
-- Impact: ADDITIVE ONLY - Safe to run

BEGIN;

-- Add playing_time columns to league_matchups
-- Each team can set their preferred playing time independently
ALTER TABLE league_matchups
  ADD COLUMN IF NOT EXISTS team1_playing_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS team2_playing_time TIMESTAMP;

COMMENT ON COLUMN league_matchups.team1_playing_time IS 'Team 1 captain-set playing time for the week';
COMMENT ON COLUMN league_matchups.team2_playing_time IS 'Team 2 captain-set playing time for the week';

COMMIT;
