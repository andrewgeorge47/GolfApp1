-- ============================================================
-- Rollback Weekly Hole-in-One Challenge Feature
-- Migration 006 Rollback
-- ============================================================

-- Drop triggers
DROP TRIGGER IF EXISTS update_weekly_challenges_updated_at ON weekly_challenges;
DROP TRIGGER IF EXISTS update_weekly_challenge_entries_updated_at ON weekly_challenge_entries;
DROP TRIGGER IF EXISTS update_challenge_pot_updated_at ON challenge_pot;

-- Drop indexes
DROP INDEX IF EXISTS idx_challenges_week_date;
DROP INDEX IF EXISTS idx_challenges_status;
DROP INDEX IF EXISTS idx_challenge_entries_challenge;
DROP INDEX IF EXISTS idx_challenge_entries_user;
DROP INDEX IF EXISTS idx_challenge_entries_status;
DROP INDEX IF EXISTS idx_challenge_entries_hole_in_one;
DROP INDEX IF EXISTS idx_challenge_entries_distance;
DROP INDEX IF EXISTS idx_payout_history_challenge;

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS challenge_payout_history;
DROP TABLE IF EXISTS weekly_challenge_entries;
DROP TABLE IF EXISTS weekly_challenges;
DROP TABLE IF EXISTS challenge_pot;
