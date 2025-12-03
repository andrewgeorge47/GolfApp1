-- Migration: Create clubs table for club location and facility management
-- Date: 2025-11-25
-- Description: Stores club information including facility details, equipment, hours, and pro assignments

-- ============================================================================
-- CLUBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clubs (
    id SERIAL PRIMARY KEY,
    club_name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "No. 10", "No. 05"

    -- Pro Information
    pro_first_name VARCHAR(100),
    pro_last_name VARCHAR(100),
    pro_member_id INTEGER REFERENCES users(member_id) ON DELETE SET NULL,
    pro_email VARCHAR(255),

    -- Location Information
    club_address TEXT NOT NULL,
    club_type VARCHAR(50) CHECK (club_type IN ('Residential', 'Commercial')),

    -- Facility Details
    number_of_bays INTEGER DEFAULT 1 CHECK (number_of_bays > 0),
    has_bathroom BOOLEAN DEFAULT FALSE,

    -- Equipment Information
    monitor_oem TEXT, -- Can be multiple, e.g., "Trackman, Bushnell"
    monitor_model TEXT, -- Can be multiple, e.g., "iO (Trackman), LPi (Bushnell)"
    software TEXT, -- Can be multiple, e.g., "Trackman, GSPro"

    -- Operating Hours
    hour_open TIME,
    hour_close TIME,

    -- Status and Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Add constraint to ensure valid hours
    CONSTRAINT valid_hours CHECK (hour_open IS NULL OR hour_close IS NULL OR hour_open < hour_close)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clubs_club_name ON clubs(club_name);
CREATE INDEX IF NOT EXISTS idx_clubs_pro_member_id ON clubs(pro_member_id);
CREATE INDEX IF NOT EXISTS idx_clubs_club_type ON clubs(club_type);
CREATE INDEX IF NOT EXISTS idx_clubs_is_active ON clubs(is_active);

-- ============================================================================
-- TRIGGER TO UPDATE updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_clubs_timestamp ON clubs;
CREATE TRIGGER update_clubs_timestamp
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_clubs_updated_at();

-- ============================================================================
-- UPDATE EXISTING REFERENCES
-- ============================================================================
-- Update foreign key constraints in related tables to reference clubs table
-- Note: This references the club_name column used in existing tables

-- Add foreign key to simulator_bookings if it doesn't already have one
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_simulator_bookings_club'
    ) THEN
        ALTER TABLE simulator_bookings
        ADD CONSTRAINT fk_simulator_bookings_club
        FOREIGN KEY (club_name) REFERENCES clubs(club_name) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key to user_onboarding if it doesn't already have one
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_user_onboarding_club'
    ) THEN
        ALTER TABLE user_onboarding
        ADD CONSTRAINT fk_user_onboarding_club
        FOREIGN KEY (club_name) REFERENCES clubs(club_name) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE clubs IS 'Stores club location information including facility details, equipment, and operational hours';
COMMENT ON COLUMN clubs.club_name IS 'Unique identifier for the club (e.g., "No. 05", "No. 10")';
COMMENT ON COLUMN clubs.pro_member_id IS 'References the users table member_id for the club pro';
COMMENT ON COLUMN clubs.number_of_bays IS 'Number of simulator bays available at the club';
COMMENT ON COLUMN clubs.monitor_oem IS 'Launch monitor manufacturer(s) - can be comma-separated for multiple';
COMMENT ON COLUMN clubs.monitor_model IS 'Launch monitor model(s) - can be comma-separated for multiple';
COMMENT ON COLUMN clubs.software IS 'Golf simulation software available - can be comma-separated for multiple';
