-- Rollback: Update Feature Testing System
-- Date: 2025-12-02

-- ============================================================================
-- REVERT STATUS VALUES IN DATA
-- ============================================================================
UPDATE feature_testing
SET status = CASE
    WHEN status = 'admin-testing' THEN 'ready'
    WHEN status = 'live-beta' THEN 'beta'
    WHEN status = 'coming-soon' THEN 'coming-soon'
    ELSE status
END
WHERE status IN ('admin-testing', 'live-beta', 'coming-soon');

-- ============================================================================
-- REVERT STATUS CONSTRAINT
-- ============================================================================
ALTER TABLE feature_testing
DROP CONSTRAINT IF EXISTS feature_testing_status_check;

ALTER TABLE feature_testing
ADD CONSTRAINT feature_testing_status_check
CHECK (status IN ('ready', 'beta', 'coming-soon'));

ALTER TABLE feature_testing
ALTER COLUMN status SET DEFAULT 'coming-soon';

-- ============================================================================
-- REMOVE ROUTE FIELD
-- ============================================================================
DROP INDEX IF EXISTS idx_feature_testing_route;

ALTER TABLE feature_testing
DROP COLUMN IF EXISTS route;

SELECT 'Feature testing system rollback complete' as status;
