-- Rollback: Remove seeded role permissions
-- Date: 2025-11-19

-- Remove all role_permissions (this will reset to empty)
-- Be careful: this removes ALL permission assignments
TRUNCATE role_permissions;

-- Verification
SELECT 'role_permissions truncated' as status, COUNT(*) as remaining FROM role_permissions;
