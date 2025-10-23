-- Add payment fields to participation table
ALTER TABLE participation 
ADD COLUMN payment_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN payment_method VARCHAR(50) NULL,
ADD COLUMN payment_amount DECIMAL(10,2) NULL,
ADD COLUMN payment_notes TEXT NULL,
ADD COLUMN payment_submitted_at TIMESTAMP NULL;

-- Add index for payment queries
CREATE INDEX idx_participation_payment_submitted ON participation(payment_submitted);
CREATE INDEX idx_participation_tournament_user ON participation(tournament_id, user_member_id); 