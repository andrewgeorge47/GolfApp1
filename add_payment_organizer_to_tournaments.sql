-- Add payment organizer fields to tournaments table
ALTER TABLE tournaments 
ADD COLUMN payment_organizer ENUM('jeff', 'adam', 'other') NULL,
ADD COLUMN payment_organizer_name VARCHAR(255) NULL,
ADD COLUMN payment_venmo_url VARCHAR(500) NULL;

-- Add index for payment organizer queries
CREATE INDEX idx_tournaments_payment_organizer ON tournaments(payment_organizer); 