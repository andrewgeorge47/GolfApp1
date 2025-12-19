-- Migration: Add foreign key constraint from club_booking_settings to clubs
-- Date: 2025-12-19
-- Description: Enforces referential integrity between booking settings and clubs table
--              Ensures booking settings cannot exist without a parent club

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key constraint if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_club_booking_settings_club'
        AND table_name = 'club_booking_settings'
    ) THEN
        ALTER TABLE club_booking_settings
        ADD CONSTRAINT fk_club_booking_settings_club
        FOREIGN KEY (club_name)
        REFERENCES clubs(club_name)
        ON DELETE CASCADE;

        RAISE NOTICE 'Foreign key constraint fk_club_booking_settings_club added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_club_booking_settings_club already exists';
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON CONSTRAINT fk_club_booking_settings_club ON club_booking_settings IS
    'Ensures booking settings reference a valid club. Cascade delete removes booking settings when club is deleted.';
