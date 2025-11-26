-- ============================================================
-- Weekly Hole-in-One Challenge Feature
-- Migration 006
-- ============================================================
-- This migration adds support for weekly hole-in-one challenges
-- with photo verification, growing pot logic, and payout tracking

-- Challenge Pot Tracking Table
-- This table tracks the accumulated pot that grows week over week
CREATE TABLE IF NOT EXISTS challenge_pot (
    id SERIAL PRIMARY KEY,
    current_amount NUMERIC(10,2) DEFAULT 0,
    total_contributions NUMERIC(10,2) DEFAULT 0,
    last_payout_amount NUMERIC(10,2) DEFAULT 0,
    last_payout_date TIMESTAMP,
    weeks_accumulated INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial pot record
INSERT INTO challenge_pot (current_amount, total_contributions, weeks_accumulated)
VALUES (0, 0, 0);

-- Weekly Challenges Table
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id SERIAL PRIMARY KEY,
    challenge_name VARCHAR(255) NOT NULL,
    designated_hole INTEGER NOT NULL CHECK (designated_hole BETWEEN 1 AND 18),
    entry_fee NUMERIC(10,2) NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

    -- Entry tracking
    total_entries INTEGER DEFAULT 0,
    total_entry_fees NUMERIC(10,2) DEFAULT 0,

    -- Pot and payout amounts
    starting_pot NUMERIC(10,2) DEFAULT 0, -- Pot at start of week (carried over from previous weeks)
    week_entry_contribution NUMERIC(10,2) DEFAULT 0, -- 50% of current week entries added to pot
    final_pot NUMERIC(10,2) DEFAULT 0, -- starting_pot + week_entry_contribution
    payout_amount NUMERIC(10,2) DEFAULT 0, -- Actual amount paid out
    rollover_amount NUMERIC(10,2) DEFAULT 0, -- Amount carried to next week

    -- Winner information
    has_hole_in_one BOOLEAN DEFAULT false,
    hole_in_one_winners INTEGER[] DEFAULT '{}', -- Array of user IDs if multiple winners
    closest_to_pin_winner_id INTEGER REFERENCES users(member_id),
    closest_distance_inches INTEGER,

    -- Payout tracking
    payout_completed BOOLEAN DEFAULT false,
    payout_notes TEXT,
    finalized_by INTEGER REFERENCES users(member_id),
    finalized_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(week_start_date)
);

-- Weekly Challenge Entries Table
CREATE TABLE IF NOT EXISTS weekly_challenge_entries (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    scorecard_id INTEGER REFERENCES weekly_scorecards(id) ON DELETE SET NULL,

    -- Payment tracking
    entry_paid BOOLEAN DEFAULT false,
    payment_method VARCHAR(50),
    payment_amount NUMERIC(10,2),
    payment_notes TEXT,
    payment_submitted_at TIMESTAMP,

    -- Challenge scoring
    hole_in_one BOOLEAN DEFAULT false,
    distance_from_pin_inches INTEGER,
    score_on_hole INTEGER,

    -- Photo verification
    photo_url VARCHAR(500), -- Google Cloud Storage URL
    photo_uploaded_at TIMESTAMP,
    photo_verified BOOLEAN DEFAULT false,
    photo_verified_by INTEGER REFERENCES users(member_id),
    photo_verified_at TIMESTAMP,

    -- Distance verification and admin override
    distance_verified BOOLEAN DEFAULT false,
    distance_verified_by INTEGER REFERENCES users(member_id),
    distance_verified_at TIMESTAMP,
    distance_override_reason TEXT,
    original_distance_inches INTEGER, -- Track if admin overrides

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'winner')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(challenge_id, user_id)
);

-- Challenge Payout History Table
CREATE TABLE IF NOT EXISTS challenge_payout_history (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
    payout_type VARCHAR(20) NOT NULL CHECK (payout_type IN ('hole_in_one', 'closest_to_pin')),
    winner_ids INTEGER[] NOT NULL, -- Array to support split prizes
    payout_amount_per_winner NUMERIC(10,2) NOT NULL,
    total_payout NUMERIC(10,2) NOT NULL,
    pot_after_payout NUMERIC(10,2) NOT NULL,
    payout_method VARCHAR(50),
    payout_notes TEXT,
    payout_completed BOOLEAN DEFAULT false,
    payout_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_challenges_week_date ON weekly_challenges(week_start_date DESC);
CREATE INDEX idx_challenges_status ON weekly_challenges(status);
CREATE INDEX idx_challenge_entries_challenge ON weekly_challenge_entries(challenge_id);
CREATE INDEX idx_challenge_entries_user ON weekly_challenge_entries(user_id);
CREATE INDEX idx_challenge_entries_status ON weekly_challenge_entries(status);
CREATE INDEX idx_challenge_entries_hole_in_one ON weekly_challenge_entries(hole_in_one) WHERE hole_in_one = true;
CREATE INDEX idx_challenge_entries_distance ON weekly_challenge_entries(distance_from_pin_inches) WHERE distance_from_pin_inches IS NOT NULL;
CREATE INDEX idx_payout_history_challenge ON challenge_payout_history(challenge_id);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_weekly_challenges_updated_at BEFORE UPDATE ON weekly_challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_challenge_entries_updated_at BEFORE UPDATE ON weekly_challenge_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_pot_updated_at BEFORE UPDATE ON challenge_pot
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE weekly_challenges IS 'Weekly hole-in-one challenges with pot tracking';
COMMENT ON TABLE weekly_challenge_entries IS 'Individual player entries for weekly challenges';
COMMENT ON TABLE challenge_pot IS 'Global pot that accumulates week over week';
COMMENT ON TABLE challenge_payout_history IS 'Historical record of all payouts';

COMMENT ON COLUMN weekly_challenges.starting_pot IS 'Pot amount carried over from previous weeks';
COMMENT ON COLUMN weekly_challenges.week_entry_contribution IS '50% of current week entry fees added to pot';
COMMENT ON COLUMN weekly_challenges.final_pot IS 'Total pot for the week (starting + contribution)';
COMMENT ON COLUMN weekly_challenges.payout_amount IS 'Amount paid to winner(s)';
COMMENT ON COLUMN weekly_challenges.rollover_amount IS 'Amount carried to next week (50% of entry fees if no hole-in-one)';

COMMENT ON COLUMN weekly_challenge_entries.original_distance_inches IS 'Original distance before admin override';
COMMENT ON COLUMN weekly_challenge_entries.distance_override_reason IS 'Reason for admin distance adjustment';
