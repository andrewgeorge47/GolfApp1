-- Rollback: Drop clubs table and related constraints
-- Date: 2025-11-25
-- Description: Removes clubs table and foreign key constraints added in migration 018

-- ============================================================================
-- REMOVE FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Remove foreign key from simulator_bookings
ALTER TABLE IF EXISTS simulator_bookings
DROP CONSTRAINT IF EXISTS fk_simulator_bookings_club;

-- Remove foreign key from user_onboarding
ALTER TABLE IF EXISTS user_onboarding
DROP CONSTRAINT IF EXISTS fk_user_onboarding_club;

-- ============================================================================
-- DROP TRIGGER AND FUNCTION
-- ============================================================================
DROP TRIGGER IF EXISTS update_clubs_timestamp ON clubs;
DROP FUNCTION IF EXISTS update_clubs_updated_at();

-- ============================================================================
-- DROP INDEXES
-- ============================================================================
DROP INDEX IF EXISTS idx_clubs_club_name;
DROP INDEX IF EXISTS idx_clubs_pro_member_id;
DROP INDEX IF EXISTS idx_clubs_club_type;
DROP INDEX IF EXISTS idx_clubs_is_active;

-- ============================================================================
-- DROP TABLE
-- ============================================================================
DROP TABLE IF EXISTS clubs CASCADE;
