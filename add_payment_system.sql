-- Add payment system to tournaments and participation tables
-- This migration adds payment organizer fields to tournaments and payment tracking to participation

-- Add payment organizer fields to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS payment_organizer character varying(10),
ADD COLUMN IF NOT EXISTS payment_organizer_name character varying(255),
ADD COLUMN IF NOT EXISTS payment_venmo_url character varying(500);

-- Add payment fields to participation table
ALTER TABLE participation 
ADD COLUMN IF NOT EXISTS payment_submitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method character varying(50),
ADD COLUMN IF NOT EXISTS payment_amount decimal(10,2),
ADD COLUMN IF NOT EXISTS payment_notes text,
ADD COLUMN IF NOT EXISTS payment_submitted_at timestamp;

-- Add comments to explain the values
COMMENT ON COLUMN tournaments.payment_organizer IS 'Payment organizer: jeff, adam, other';
COMMENT ON COLUMN tournaments.payment_organizer_name IS 'Custom organizer name for other option';
COMMENT ON COLUMN tournaments.payment_venmo_url IS 'Custom Venmo URL for other option';
COMMENT ON COLUMN participation.payment_submitted IS 'Whether payment has been submitted';
COMMENT ON COLUMN participation.payment_method IS 'Payment method: venmo, etc.';
COMMENT ON COLUMN participation.payment_amount IS 'Payment amount in dollars';
COMMENT ON COLUMN participation.payment_notes IS 'User notes about payment';
COMMENT ON COLUMN participation.payment_submitted_at IS 'Timestamp when payment was submitted';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournaments_payment_organizer ON tournaments(payment_organizer);
CREATE INDEX IF NOT EXISTS idx_participation_payment_submitted ON participation(payment_submitted);
CREATE INDEX IF NOT EXISTS idx_participation_tournament_user ON participation(tournament_id, user_member_id);

-- Update existing tournaments with entry fees to have default payment organizers
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