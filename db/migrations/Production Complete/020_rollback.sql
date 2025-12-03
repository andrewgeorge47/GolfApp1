-- Rollback: Signup System
-- Date: 2025-11-26

-- ============================================================================
-- REMOVE PERMISSIONS
-- ============================================================================
-- Remove role_permissions assignments
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE permission_key IN ('manage_signups', 'verify_signup_payments', 'view_signup_analytics')
);

-- Remove permission definitions
DELETE FROM permissions
WHERE permission_key IN ('manage_signups', 'verify_signup_payments', 'view_signup_analytics');

-- ============================================================================
-- REMOVE COLUMN FROM PARTICIPATION TABLE
-- ============================================================================
ALTER TABLE participation DROP COLUMN IF EXISTS signup_id;

-- ============================================================================
-- DROP TABLES (in correct order due to foreign keys)
-- ============================================================================
-- Drop tournament_signup_links first (references tournaments and signups)
DROP TABLE IF EXISTS tournament_signup_links;

-- Drop signup_payments (references signup_registrations)
DROP TABLE IF EXISTS signup_payments;

-- Drop signup_registrations (references signups)
DROP TABLE IF EXISTS signup_registrations;

-- Drop signups last (no dependencies)
DROP TABLE IF EXISTS signups;

SELECT 'Signup system rollback complete' as status;
