-- Rollback: Feature Testing System
-- Date: 2025-12-02

-- ============================================================================
-- REMOVE PERMISSIONS
-- ============================================================================
-- Remove role_permissions assignments
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE permission_key = 'manage_feature_testing'
);

-- Remove permission definitions
DELETE FROM permissions
WHERE permission_key = 'manage_feature_testing';

-- ============================================================================
-- DROP TRIGGER AND FUNCTION
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_feature_testing_updated_at ON feature_testing;
DROP FUNCTION IF EXISTS update_feature_testing_updated_at();

-- ============================================================================
-- DROP TABLE
-- ============================================================================
DROP TABLE IF EXISTS feature_testing;

SELECT 'Feature testing system rollback complete' as status;
