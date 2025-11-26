-- Migration: Seed role permissions for multi-role system
-- Date: 2025-11-19
-- Description: Assign default permissions to each role

-- ============================================================================
-- ADMIN ROLE - FULL ACCESS
-- ============================================================================
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE role_key = 'admin'),
  p.id
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- CLUB PRO ROLE
-- ============================================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE role_key = 'club_pro'),
  p.id
FROM permissions p
WHERE p.permission_key IN (
  'access_admin_panel',
  'view_club_handicaps',
  'manage_club_members',
  'manage_tournaments',
  'manage_scores',
  'view_analytics',
  'manage_challenges'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- AMBASSADOR ROLE
-- ============================================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE role_key = 'ambassador'),
  p.id
FROM permissions p
WHERE p.permission_key IN (
  'access_admin_panel',
  'view_club_handicaps',
  'manage_tournaments',
  'manage_scores',
  'manage_challenges'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- MEMBER ROLE - BASIC ACCESS
-- ============================================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE role_key = 'member'),
  p.id
FROM permissions p
WHERE p.permission_key IN (
  'view_own_profile',
  'submit_scores'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- DEACTIVATED ROLE - NO PERMISSIONS
-- ============================================================================
-- Deactivated users get no permissions (nothing to insert)

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT
  r.role_name,
  r.role_key,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.role_name, r.role_key
ORDER BY
  CASE r.role_key
    WHEN 'admin' THEN 1
    WHEN 'club_pro' THEN 2
    WHEN 'ambassador' THEN 3
    WHEN 'member' THEN 4
    WHEN 'deactivated' THEN 5
    ELSE 6
  END;
