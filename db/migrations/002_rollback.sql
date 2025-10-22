-- Rollback Script for Permission System Migration
-- Date: 2025-10-22
-- WARNING: This will delete all permission data. Use with caution!

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS user_permissions_view CASCADE;
DROP VIEW IF EXISTS role_permissions_view CASCADE;

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS permission_audit_log CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Remove role_id column from users table (optional - comment out if you want to keep it)
-- ALTER TABLE users DROP COLUMN IF EXISTS role_id;

-- Verify cleanup
SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('roles', 'permissions', 'role_permissions', 'permission_audit_log')
ORDER BY table_name;

-- If the above query returns no rows, cleanup was successful
