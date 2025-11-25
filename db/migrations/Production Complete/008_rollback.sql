-- Rollback: Remove permission views
-- Run this to undo migration 008

DROP VIEW IF EXISTS user_permission_summary;
DROP VIEW IF EXISTS user_roles_view;
DROP VIEW IF EXISTS user_all_permissions;
