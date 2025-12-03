-- Migration: Update Feature Testing System
-- Date: 2025-12-02
-- Description: Add route field and update status values for feature testing

-- ============================================================================
-- ADD ROUTE FIELD
-- ============================================================================
ALTER TABLE feature_testing
ADD COLUMN IF NOT EXISTS route VARCHAR(200);

COMMENT ON COLUMN feature_testing.route IS 'Optional app route path to navigate to the feature (e.g., /admin/users)';

CREATE INDEX IF NOT EXISTS idx_feature_testing_route ON feature_testing(route) WHERE deleted_at IS NULL AND route IS NOT NULL;

-- ============================================================================
-- UPDATE STATUS CONSTRAINT
-- ============================================================================
-- Drop old constraint
ALTER TABLE feature_testing
DROP CONSTRAINT IF EXISTS feature_testing_status_check;

-- Add new constraint with updated status values
ALTER TABLE feature_testing
ADD CONSTRAINT feature_testing_status_check
CHECK (status IN ('admin-testing', 'live-beta', 'coming-soon'));

-- Update default value
ALTER TABLE feature_testing
ALTER COLUMN status SET DEFAULT 'coming-soon';

-- ============================================================================
-- UPDATE EXISTING DATA (if any exists)
-- ============================================================================
-- Map old status values to new ones
UPDATE feature_testing
SET status = CASE
    WHEN status = 'ready' THEN 'admin-testing'
    WHEN status = 'beta' THEN 'live-beta'
    WHEN status = 'coming-soon' THEN 'coming-soon'
    ELSE status
END
WHERE status IN ('ready', 'beta', 'coming-soon');

SELECT 'Feature testing system update complete' as status;
