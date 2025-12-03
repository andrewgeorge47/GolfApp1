-- Migration: Enhance trackman_courses table with tagging and metadata
-- This allows intelligent categorization similar to gspro_courses

-- Add new columns to trackman_courses
ALTER TABLE trackman_courses
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS platform_version VARCHAR(50),  -- 'Virtual Golf 2' or 'Virtual Golf 3'
    ADD COLUMN IF NOT EXISTS release_month VARCHAR(50),      -- e.g., 'November 2024'
    ADD COLUMN IF NOT EXISTS is_championship BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_links BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_par3 BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_resort BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_country_club BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_major_venue BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS holes INTEGER,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraint on name to support upsert
ALTER TABLE trackman_courses
    DROP CONSTRAINT IF EXISTS trackman_courses_name_unique;
ALTER TABLE trackman_courses
    ADD CONSTRAINT trackman_courses_name_unique UNIQUE (name);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_trackman_courses_country ON trackman_courses(country);
CREATE INDEX IF NOT EXISTS idx_trackman_courses_platform ON trackman_courses(platform_version);
CREATE INDEX IF NOT EXISTS idx_trackman_courses_location ON trackman_courses(location);

COMMENT ON TABLE trackman_courses IS 'TrackMan TPS virtual golf courses with intelligent tagging';
