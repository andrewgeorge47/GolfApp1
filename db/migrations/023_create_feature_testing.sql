-- Migration: Feature Testing System
-- Date: 2025-12-02
-- Description: Admin feature testing tracking system for managing features in development, beta, and ready for testing

-- ============================================================================
-- FEATURE_TESTING TABLE - Track features for testing and development
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_testing (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'coming-soon' CHECK (status IN ('ready', 'beta', 'coming-soon')),

    -- Categorization
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Calendar',
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

    -- Assignment and timeline
    assigned_to VARCHAR(100), -- Team or person assigned (e.g., 'QA Team', 'Beta Users')
    target_date DATE, -- Expected completion/release date

    -- Metadata
    created_by INTEGER REFERENCES users(member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete
    deleted_at TIMESTAMP
);

-- Indexes for feature_testing
CREATE INDEX IF NOT EXISTS idx_feature_testing_status ON feature_testing(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feature_testing_category ON feature_testing(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feature_testing_priority ON feature_testing(priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feature_testing_created_by ON feature_testing(created_by);
CREATE INDEX IF NOT EXISTS idx_feature_testing_target_date ON feature_testing(target_date) WHERE deleted_at IS NULL AND target_date IS NOT NULL;

-- Comments
COMMENT ON TABLE feature_testing IS 'Admin feature testing tracking system for managing development pipeline';
COMMENT ON COLUMN feature_testing.status IS 'Feature status: ready (ready for testing), beta (in beta testing), coming-soon (in development)';
COMMENT ON COLUMN feature_testing.icon IS 'Icon identifier for UI display (e.g., Calendar, Settings, Trophy)';
COMMENT ON COLUMN feature_testing.assigned_to IS 'Team or person assigned to test/develop the feature';
COMMENT ON COLUMN feature_testing.target_date IS 'Expected completion or release date';
COMMENT ON COLUMN feature_testing.deleted_at IS 'Soft delete timestamp - NULL means active';

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_feature_testing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feature_testing_updated_at
    BEFORE UPDATE ON feature_testing
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_testing_updated_at();

-- ============================================================================
-- PERMISSIONS - Add feature testing management permissions
-- ============================================================================
-- Insert feature testing permissions if they don't exist
INSERT INTO permissions (permission_key, permission_name, category, description)
VALUES
    ('manage_feature_testing', 'Manage Feature Testing', 'Admin Tools', 'Create, edit, and delete feature testing entries')
ON CONFLICT (permission_key) DO NOTHING;

-- Assign feature testing permissions to Admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE permission_key = 'manage_feature_testing'
ON CONFLICT (role_id, permission_id) DO NOTHING;

SELECT 'Feature testing system migration complete' as status;
