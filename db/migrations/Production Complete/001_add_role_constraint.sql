-- Migration: Add role constraint to enforce valid role values
-- Date: 2025-10-22
-- Description: Adds a CHECK constraint to the users table to ensure only valid roles are allowed

-- First, normalize any existing 'clubpro' or lowercase variants to proper case
UPDATE users
SET role = 'Club Pro'
WHERE LOWER(role) IN ('clubpro', 'club pro') AND role != 'Club Pro';

UPDATE users
SET role = 'Admin'
WHERE LOWER(role) IN ('admin', 'super admin', 'super_admin') AND role != 'Admin';

UPDATE users
SET role = 'Member'
WHERE LOWER(role) = 'member' AND role != 'Member';

UPDATE users
SET role = 'Ambassador'
WHERE LOWER(role) = 'ambassador' AND role != 'Ambassador';

UPDATE users
SET role = 'Deactivated'
WHERE LOWER(role) = 'deactivated' AND role != 'Deactivated';

-- Add constraint to ensure only valid roles can be used
ALTER TABLE users
DROP CONSTRAINT IF EXISTS valid_role_check;

ALTER TABLE users
ADD CONSTRAINT valid_role_check
CHECK (role IN ('Member', 'Admin', 'Club Pro', 'Ambassador', 'Deactivated'));

-- Create an index on the role column for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Verify the changes
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;
