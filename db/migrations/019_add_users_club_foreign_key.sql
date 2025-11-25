-- Migration: Add foreign key constraint to users.club column
-- Date: 2025-11-25
-- Description: Links users.club to clubs.club_name to ensure data integrity and enable club-based functionality

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT
-- ============================================================================
-- Add foreign key only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_club'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT fk_users_club
        FOREIGN KEY (club) REFERENCES clubs(club_name) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- UPDATE NULL CLUBS TO DEFAULT
-- ============================================================================
-- For any users without a club assigned, set to 'No. 5' (default/flagship location)
UPDATE users
SET club = 'No. 5'
WHERE club IS NULL OR club = '';

-- ============================================================================
-- ADD INDEX FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_club ON users(club);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN users.club IS 'User''s home club location - references clubs table';
