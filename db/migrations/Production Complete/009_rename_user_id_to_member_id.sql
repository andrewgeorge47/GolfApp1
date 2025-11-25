-- Migration: Rename user_id to member_id in user_roles table
-- Date: 2025-11-19
-- Description: Standardize naming convention to use member_id consistently

-- ============================================================================
-- RENAME COLUMN
-- ============================================================================
ALTER TABLE user_roles RENAME COLUMN user_id TO member_id;

-- ============================================================================
-- UPDATE INDEXES
-- ============================================================================
-- Drop old indexes
DROP INDEX IF EXISTS idx_user_roles_user_id;
DROP INDEX IF EXISTS idx_user_roles_primary;

-- Create new indexes with correct column name
CREATE INDEX IF NOT EXISTS idx_user_roles_member_id ON user_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(member_id, is_primary);

-- ============================================================================
-- UPDATE UNIQUE CONSTRAINT
-- ============================================================================
-- Drop old constraint and create new one
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_id_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_member_id_role_id_key UNIQUE (member_id, role_id);

-- ============================================================================
-- RECREATE VIEWS WITH NEW COLUMN NAME
-- ============================================================================

-- View: Get all permissions for a user (aggregate from all roles)
CREATE OR REPLACE VIEW user_all_permissions AS
SELECT DISTINCT
    u.member_id,
    u.first_name,
    u.last_name,
    u.email_address,
    p.permission_key,
    p.permission_name,
    p.description as permission_description,
    p.category
FROM users u
JOIN user_roles ur ON u.member_id = ur.member_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = TRUE;

-- View: Get all roles for a user with primary role flagged
CREATE OR REPLACE VIEW user_roles_view AS
SELECT
    u.member_id,
    u.first_name,
    u.last_name,
    u.email_address,
    r.id as role_id,
    r.role_name,
    r.role_key,
    r.description as role_description,
    ur.is_primary,
    ur.assigned_at,
    ur.assigned_by
FROM users u
JOIN user_roles ur ON u.member_id = ur.member_id
JOIN roles r ON ur.role_id = r.id
WHERE r.is_active = TRUE
ORDER BY u.member_id, ur.is_primary DESC, r.role_name;

-- View: Permission summary by user
CREATE OR REPLACE VIEW user_permission_summary AS
SELECT
    member_id,
    first_name,
    last_name,
    email_address,
    COUNT(DISTINCT permission_key) as total_permissions,
    array_agg(DISTINCT permission_key ORDER BY permission_key) as permission_list,
    array_agg(DISTINCT category ORDER BY category) as categories
FROM user_all_permissions
GROUP BY member_id, first_name, last_name, email_address;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'user_roles column renamed' as status;
\d user_roles
