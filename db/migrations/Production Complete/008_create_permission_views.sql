-- Migration: Create views for multi-role permission queries
-- Date: 2025-11-19
-- Description: Helper views for efficient permission lookups

-- ============================================================================
-- VIEW: Get all permissions for a user (aggregate from all roles)
-- ============================================================================
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
JOIN user_roles ur ON u.member_id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = TRUE;

-- ============================================================================
-- VIEW: Get all roles for a user with primary role flagged
-- ============================================================================
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
JOIN user_roles ur ON u.member_id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.is_active = TRUE
ORDER BY u.member_id, ur.is_primary DESC, r.role_name;

-- ============================================================================
-- VIEW: Permission summary by user
-- ============================================================================
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
-- Test the views
SELECT 'user_all_permissions' as view_name, COUNT(*) as row_count FROM user_all_permissions
UNION ALL
SELECT 'user_roles_view', COUNT(*) FROM user_roles_view
UNION ALL
SELECT 'user_permission_summary', COUNT(*) FROM user_permission_summary;
