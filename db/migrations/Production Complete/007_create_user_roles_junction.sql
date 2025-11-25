-- Migration: Add columns to user_roles for multi-role support
-- Date: 2025-11-19
-- Description: Enables users to have multiple roles with permissions that sum together

-- ============================================================================
-- ADD COLUMNS FOR MULTI-ROLE SUPPORT
-- ============================================================================
-- Add is_primary column if it doesn't exist
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Add tracking columns
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(member_id);

-- Create index for primary role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(user_id, is_primary);

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================
-- Populate user_roles from existing users.role_id column
INSERT INTO user_roles (user_id, role_id, is_primary)
SELECT member_id, role_id, TRUE
FROM users
WHERE role_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Set existing assignments as primary if not already set
UPDATE user_roles SET is_primary = TRUE WHERE is_primary IS NULL OR is_primary = FALSE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Show migration results
SELECT
    COUNT(DISTINCT u.member_id) as total_users,
    COUNT(ur.id) as total_role_assignments,
    COUNT(CASE WHEN ur.is_primary THEN 1 END) as primary_roles
FROM users u
LEFT JOIN user_roles ur ON u.member_id = ur.user_id;
