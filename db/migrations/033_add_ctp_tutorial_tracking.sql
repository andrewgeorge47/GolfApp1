-- Migration: Add CTP Tutorial Tracking
-- Date: 2025-12-13
-- Description: Adds fields to track whether users have completed the CTP challenge tutorial

-- ============================================================================
-- ADD CTP TUTORIAL TRACKING TO USER_ONBOARDING
-- ============================================================================

-- Add CTP tutorial tracking fields
ALTER TABLE user_onboarding
ADD COLUMN IF NOT EXISTS ctp_tutorial_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ctp_tutorial_completed_at TIMESTAMP;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_onboarding_ctp_tutorial ON user_onboarding(ctp_tutorial_completed);

-- Comment the columns for documentation
COMMENT ON COLUMN user_onboarding.ctp_tutorial_completed IS 'Whether the user has completed the CTP challenge tutorial/onboarding';
COMMENT ON COLUMN user_onboarding.ctp_tutorial_completed_at IS 'Timestamp when the user completed the CTP challenge tutorial';
