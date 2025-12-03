-- Migration: Add payment organizer fields to signups table
-- Date: 2025-12-01
-- Description: Add payment_organizer fields to match tournament payment structure

-- Add payment organizer fields to signups table
ALTER TABLE signups
ADD COLUMN IF NOT EXISTS payment_organizer VARCHAR(20) CHECK (payment_organizer IN ('jeff', 'adam', 'other')),
ADD COLUMN IF NOT EXISTS payment_organizer_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS payment_venmo_url VARCHAR(500);

-- Add comments
COMMENT ON COLUMN signups.payment_organizer IS 'Quick select for common payment organizers (jeff, adam, or other)';
COMMENT ON COLUMN signups.payment_organizer_name IS 'Custom payment organizer name when payment_organizer is set to "other"';
COMMENT ON COLUMN signups.payment_venmo_url IS 'Venmo URL for payment organizer (overrides venmo_url when set)';

SELECT 'Payment organizer fields added to signups table' as status;
