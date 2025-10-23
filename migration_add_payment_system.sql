-- Migration: Add Payment System
-- This migration adds payment organizer fields to tournaments and payment tracking to participation

-- Start transaction
BEGIN;

-- Add payment organizer fields to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS payment_organizer ENUM('jeff', 'adam', 'other') NULL,
ADD COLUMN IF NOT EXISTS payment_organizer_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS payment_venmo_url VARCHAR(500) NULL;

-- Add payment fields to participation table
ALTER TABLE participation 
ADD COLUMN IF NOT EXISTS payment_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS payment_notes TEXT NULL,
ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMP NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_payment_organizer ON tournaments(payment_organizer);
CREATE INDEX IF NOT EXISTS idx_participation_payment_submitted ON participation(payment_submitted);
CREATE INDEX IF NOT EXISTS idx_participation_tournament_user ON participation(tournament_id, user_member_id);

-- Update existing tournaments with entry fees to have default payment organizers
-- This helps with backward compatibility
UPDATE tournaments 
SET payment_organizer = 'jeff' 
WHERE entry_fee > 0 
  AND payment_organizer IS NULL 
  AND (name ILIKE '%neighborhood%' OR name ILIKE '%national%' OR location ILIKE '%neighborhood%');

UPDATE tournaments 
SET payment_organizer = 'adam' 
WHERE entry_fee > 0 
  AND payment_organizer IS NULL 
  AND (name ILIKE '%no. 10%' OR name ILIKE '%no10%' OR location ILIKE '%no. 10%');

-- Set default payment organizer for remaining tournaments with entry fees
UPDATE tournaments 
SET payment_organizer = 'jeff' 
WHERE entry_fee > 0 
  AND payment_organizer IS NULL;

-- Commit the transaction
COMMIT;

-- Display migration summary
SELECT 
  'Migration completed successfully' as status,
  (SELECT COUNT(*) FROM tournaments WHERE payment_organizer IS NOT NULL) as tournaments_with_payment_organizer,
  (SELECT COUNT(*) FROM tournaments WHERE entry_fee > 0) as tournaments_with_entry_fees; 