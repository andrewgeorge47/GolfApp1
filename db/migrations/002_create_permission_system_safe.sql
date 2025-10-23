-- Migration: Create dynamic role and permission management system (SAFE VERSION)
-- Date: 2025-10-22
-- Description: Adds tables for flexible role and permission management
-- This version handles existing tables and partial migrations safely

-- ============================================================================
-- DROP EXISTING TABLES IF NEEDED (OPTIONAL - UNCOMMENT TO START FRESH)
-- ============================================================================
-- WARNING: Only run this if you want to start completely fresh
-- DROP TABLE IF EXISTS permission_audit_log CASCADE;
-- DROP TABLE IF EXISTS role_permissions CASCADE;
-- DROP TABLE IF EXISTS permissions CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
-- Check if roles table needs to be recreated
DO $$
BEGIN
    -- Check if role_key column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'role_key'
    ) THEN
        -- Table exists but has wrong schema, need to drop and recreate
        DROP TABLE IF EXISTS roles CASCADE;

        CREATE TABLE roles (
            id SERIAL PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE NOT NULL,
            role_key VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            is_system_role BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Create roles table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_key VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_roles_key ON roles(role_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- SEED DEFAULT PERMISSIONS
-- ============================================================================
INSERT INTO permissions (permission_key, permission_name, description, category) VALUES
-- User Management
('manage_users', 'Manage Users', 'Create, edit, and delete user accounts', 'users'),
('view_users', 'View Users', 'View user list and profiles', 'users'),
('assign_roles', 'Assign Roles', 'Assign roles to users', 'users'),
('deactivate_users', 'Deactivate Users', 'Deactivate user accounts', 'users'),

-- Tournament Management
('manage_tournaments', 'Manage Tournaments', 'Create, edit, and delete tournaments', 'tournaments'),
('view_tournaments', 'View Tournaments', 'View tournament information', 'tournaments'),
('manage_scores', 'Manage Scores', 'Edit and delete scores', 'tournaments'),
('submit_scores', 'Submit Scores', 'Submit own scores', 'tournaments'),

-- Course Management
('manage_courses', 'Manage Courses', 'Add, edit, and delete courses', 'courses'),
('view_courses', 'View Courses', 'View course information', 'courses'),
('edit_course_data', 'Edit Course Data', 'Edit course details and metadata', 'courses'),

-- Analytics & Reporting
('view_analytics', 'View Analytics', 'Access user tracking and analytics', 'analytics'),
('view_reports', 'View Reports', 'Generate and view reports', 'analytics'),
('export_data', 'Export Data', 'Export data to files', 'analytics'),

-- Club Pro Features
('view_club_handicaps', 'View Club Handicaps', 'View handicaps for club members', 'club'),
('manage_club_members', 'Manage Club Members', 'Manage members within own club', 'club'),

-- Admin Features
('view_as_user', 'View As User', 'Use view-as mode to see app as different roles', 'admin'),
('manage_permissions', 'Manage Permissions', 'Manage role permissions', 'admin'),
('access_admin_panel', 'Access Admin Panel', 'Access administrative interface', 'admin'),

-- Content Management
('create_content', 'Create Content', 'Create new content', 'content'),
('edit_content', 'Edit Content', 'Edit existing content', 'content'),
('delete_content', 'Delete Content', 'Delete content', 'content')
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================================
-- SEED DEFAULT ROLES
-- ============================================================================
INSERT INTO roles (role_name, role_key, description, is_system_role, is_active) VALUES
('Member', 'member', 'Standard member with basic access', TRUE, TRUE),
('Admin', 'admin', 'Full system administrator', TRUE, TRUE),
('Club Pro', 'club_pro', 'Club professional with club management access', TRUE, TRUE),
('Ambassador', 'ambassador', 'Community ambassador with extended privileges', TRUE, TRUE),
('Deactivated', 'deactivated', 'Deactivated user with no access', TRUE, TRUE)
ON CONFLICT (role_key) DO NOTHING;

-- ============================================================================
-- ASSIGN DEFAULT PERMISSIONS TO ROLES
-- ============================================================================

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE role_key = 'admin'),
    id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Club Pro permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE role_key = 'club_pro'),
    id
FROM permissions
WHERE permission_key IN (
    'view_users',
    'view_tournaments',
    'manage_scores',
    'submit_scores',
    'view_courses',
    'edit_course_data',
    'view_club_handicaps',
    'manage_club_members',
    'view_reports'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ambassador permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE role_key = 'ambassador'),
    id
FROM permissions
WHERE permission_key IN (
    'view_users',
    'view_tournaments',
    'submit_scores',
    'view_courses',
    'edit_course_data',
    'create_content',
    'edit_content'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member permissions (basic access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE role_key = 'member'),
    id
FROM permissions
WHERE permission_key IN (
    'view_tournaments',
    'submit_scores',
    'view_courses'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Deactivated has no permissions (empty)

-- ============================================================================
-- ADD ROLE_ID COLUMN TO USERS TABLE
-- ============================================================================
-- Add a new column to link users to the roles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
    END IF;
END $$;

-- Create index on role_id
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Populate role_id based on existing role column
UPDATE users SET role_id = (
    CASE
        WHEN role = 'Admin' THEN (SELECT id FROM roles WHERE role_key = 'admin')
        WHEN role = 'Club Pro' THEN (SELECT id FROM roles WHERE role_key = 'club_pro')
        WHEN role = 'Ambassador' THEN (SELECT id FROM roles WHERE role_key = 'ambassador')
        WHEN role = 'Deactivated' THEN (SELECT id FROM roles WHERE role_key = 'deactivated')
        ELSE (SELECT id FROM roles WHERE role_key = 'member')
    END
)
WHERE role_id IS NULL;

-- ============================================================================
-- UTILITY VIEWS
-- ============================================================================

-- Drop views if they exist (to recreate them)
DROP VIEW IF EXISTS role_permissions_view CASCADE;
DROP VIEW IF EXISTS user_permissions_view CASCADE;

-- View: Get all permissions for a role
CREATE VIEW role_permissions_view AS
SELECT
    r.id as role_id,
    r.role_name,
    r.role_key,
    p.id as permission_id,
    p.permission_key,
    p.permission_name,
    p.description as permission_description,
    p.category
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = TRUE
ORDER BY r.role_name, p.category, p.permission_name;

-- View: Get user with all their permissions
CREATE VIEW user_permissions_view AS
SELECT
    u.member_id,
    u.first_name,
    u.last_name,
    u.email_address,
    r.role_name,
    r.role_key,
    p.permission_key,
    p.permission_name,
    p.category
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = TRUE;

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    admin_user_id INTEGER REFERENCES users(member_id),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_created ON permission_audit_log(created_at DESC);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all roles with permission counts
SELECT
    r.role_name,
    r.role_key,
    r.description,
    r.is_system_role,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.role_name, r.role_key, r.description, r.is_system_role
ORDER BY r.role_name;

-- Show permissions by category
SELECT
    category,
    COUNT(*) as permission_count
FROM permissions
GROUP BY category
ORDER BY category;

-- Show sample of users with their role_id
SELECT
    member_id,
    first_name,
    last_name,
    role as old_role_column,
    role_id,
    (SELECT role_name FROM roles WHERE id = users.role_id) as new_role_name
FROM users
LIMIT 10;
