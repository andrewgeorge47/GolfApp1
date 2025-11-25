-- Migration: Add club_name to simulator_bookings for multi-club support
-- Date: 2025-11-21
-- Description: Associates bookings with specific clubs to enable per-club booking controls

-- Add club_name column to simulator_bookings
ALTER TABLE simulator_bookings
ADD COLUMN IF NOT EXISTS club_name VARCHAR(100) DEFAULT 'No. 5';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_simulator_bookings_club ON simulator_bookings(club_name);

-- Update existing bookings to have default club (if any exist)
UPDATE simulator_bookings SET club_name = 'No. 5' WHERE club_name IS NULL;
