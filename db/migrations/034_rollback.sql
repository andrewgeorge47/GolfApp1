-- Rollback Migration 034: Remove foreign key constraint from club_booking_settings
-- Date: 2025-12-19
-- Description: Removes the foreign key constraint between club_booking_settings and clubs

-- ============================================================================
-- REMOVE FOREIGN KEY CONSTRAINT
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_club_booking_settings_club'
        AND table_name = 'club_booking_settings'
    ) THEN
        ALTER TABLE club_booking_settings
        DROP CONSTRAINT fk_club_booking_settings_club;

        RAISE NOTICE 'Foreign key constraint fk_club_booking_settings_club removed successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_club_booking_settings_club does not exist';
    END IF;
END $$;
