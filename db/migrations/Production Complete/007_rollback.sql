-- Rollback: Remove user_roles junction table
-- Run this to undo migration 007

DROP INDEX IF EXISTS idx_user_roles_member;
DROP INDEX IF EXISTS idx_user_roles_role;
DROP INDEX IF EXISTS idx_user_roles_primary;
DROP TABLE IF EXISTS user_roles;
