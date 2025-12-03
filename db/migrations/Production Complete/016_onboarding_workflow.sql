-- Migration: Create onboarding workflow system for booking access
-- Date: 2025-11-21
-- Description: Tracks user onboarding progress (welcome video quiz + waiver) for booking access

-- ============================================================================
-- USER ONBOARDING TABLE
-- ============================================================================
-- Tracks user progress through onboarding steps
CREATE TABLE IF NOT EXISTS user_onboarding (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    club_name VARCHAR(100) NOT NULL DEFAULT 'No. 5',

    -- Step 1: Club Welcome Video + Quiz
    welcome_completed BOOLEAN DEFAULT FALSE,
    welcome_completed_at TIMESTAMP,
    quiz_score INTEGER, -- Number of correct answers (must be 3/3)

    -- Step 2: Waiver Acknowledgement
    waiver_acknowledged BOOLEAN DEFAULT FALSE,
    waiver_acknowledged_at TIMESTAMP,
    waiver_ip_address VARCHAR(45), -- For legal record keeping

    -- Overall status
    onboarding_complete BOOLEAN GENERATED ALWAYS AS (welcome_completed AND waiver_acknowledged) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, club_name)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_club ON user_onboarding(club_name);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_complete ON user_onboarding(onboarding_complete);

-- ============================================================================
-- ADD BOOKING ACCESS PERMISSION
-- ============================================================================
INSERT INTO permissions (permission_key, permission_name, description, category)
VALUES ('access_booking', 'Access Simulator Booking', 'Can access the simulator bay booking system (requires onboarding completion)', 'booking')
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================================
-- TRIGGER TO UPDATE updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_onboarding_timestamp ON user_onboarding;
CREATE TRIGGER update_user_onboarding_timestamp
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_user_onboarding_updated_at();
