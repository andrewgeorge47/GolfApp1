-- Migration: Five-Shot Challenge System
-- Date: 2025-11-19
-- Description: Generalizable challenge system with n-shot groups, payments, and dual competitions

-- ============================================================================
-- CHALLENGE TYPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_types (
    id SERIAL PRIMARY KEY,
    type_key VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    shots_per_group INTEGER NOT NULL DEFAULT 5,
    max_reups INTEGER, -- NULL = unlimited
    default_entry_fee NUMERIC(10,2) NOT NULL,
    default_reup_fee NUMERIC(10,2) NOT NULL,
    payout_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_challenge_types_key ON challenge_types(type_key);
CREATE INDEX IF NOT EXISTS idx_challenge_types_active ON challenge_types(is_active);

-- ============================================================================
-- CHALLENGE PAYMENTS TABLE (Abstracted for Stripe integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_payments (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('entry', 'reup')),
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50), -- 'venmo', 'cash', 'stripe', etc.
    payment_reference VARCHAR(255), -- user's reference or Stripe payment_intent_id
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by INTEGER REFERENCES users(member_id),
    verified_at TIMESTAMP,
    covers_group_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_challenge_payments_entry ON challenge_payments(entry_id);
CREATE INDEX IF NOT EXISTS idx_challenge_payments_status ON challenge_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_challenge_payments_type ON challenge_payments(payment_type);

-- ============================================================================
-- CHALLENGE SHOT GROUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_shot_groups (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL,
    payment_id INTEGER REFERENCES challenge_payments(id),
    group_number INTEGER NOT NULL,
    group_screenshot_url VARCHAR(500),
    screenshot_date DATE, -- for admin validation against payment timestamp
    status VARCHAR(20) DEFAULT 'purchased' CHECK (status IN ('purchased', 'submitted', 'verified', 'disqualified')),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entry_id, group_number)
);

CREATE INDEX IF NOT EXISTS idx_challenge_shot_groups_entry ON challenge_shot_groups(entry_id);
CREATE INDEX IF NOT EXISTS idx_challenge_shot_groups_status ON challenge_shot_groups(status);

-- ============================================================================
-- CHALLENGE SHOTS TABLE (Individual shots within groups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_shots (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES challenge_shot_groups(id) ON DELETE CASCADE,
    shot_number INTEGER NOT NULL,
    distance_from_pin_inches INTEGER,
    is_hole_in_one BOOLEAN DEFAULT FALSE,
    detail_screenshot_url VARCHAR(500),
    submitted_at TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(member_id),
    verified_at TIMESTAMP,
    override_distance_inches INTEGER, -- if admin overrides
    override_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, shot_number)
);

CREATE INDEX IF NOT EXISTS idx_challenge_shots_group ON challenge_shots(group_id);
CREATE INDEX IF NOT EXISTS idx_challenge_shots_hio ON challenge_shots(is_hole_in_one) WHERE is_hole_in_one = TRUE;
CREATE INDEX IF NOT EXISTS idx_challenge_shots_distance ON challenge_shots(distance_from_pin_inches);

-- ============================================================================
-- MODIFY WEEKLY_CHALLENGES TABLE
-- ============================================================================
-- Add challenge type reference
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS challenge_type_id INTEGER REFERENCES challenge_types(id);

-- Add course reference (using combined courses table)
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES simulator_courses_combined(id);

-- Add required distance for the challenge
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS required_distance_yards INTEGER;

-- Separate HIO jackpot tracking (30% goes here)
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS hio_jackpot_amount NUMERIC(10,2) DEFAULT 0;

-- Track admin fee collected (20%)
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS admin_fee_collected NUMERIC(10,2) DEFAULT 0;

-- CTP pot for this week (50%)
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS ctp_pot_amount NUMERIC(10,2) DEFAULT 0;

-- ============================================================================
-- MODIFY WEEKLY_CHALLENGE_ENTRIES TABLE
-- ============================================================================
-- Track how many groups this user has purchased
ALTER TABLE weekly_challenge_entries
ADD COLUMN IF NOT EXISTS groups_purchased INTEGER DEFAULT 0;

-- Track total amount paid by this user
ALTER TABLE weekly_challenge_entries
ADD COLUMN IF NOT EXISTS total_paid NUMERIC(10,2) DEFAULT 0;

-- Add foreign key from payments to entries
ALTER TABLE challenge_payments
ADD CONSTRAINT fk_challenge_payments_entry
FOREIGN KEY (entry_id) REFERENCES weekly_challenge_entries(id) ON DELETE CASCADE;

-- Add foreign key from shot_groups to entries
ALTER TABLE challenge_shot_groups
ADD CONSTRAINT fk_challenge_shot_groups_entry
FOREIGN KEY (entry_id) REFERENCES weekly_challenge_entries(id) ON DELETE CASCADE;

-- ============================================================================
-- GLOBAL HIO JACKPOT TABLE (Rolling jackpot separate from CTP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenge_hio_jackpot (
    id SERIAL PRIMARY KEY,
    current_amount NUMERIC(10,2) DEFAULT 0,
    total_contributions NUMERIC(10,2) DEFAULT 0,
    last_won_amount NUMERIC(10,2),
    last_won_date TIMESTAMP,
    last_winner_id INTEGER REFERENCES users(member_id),
    weeks_accumulated INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize jackpot if not exists
INSERT INTO challenge_hio_jackpot (current_amount, total_contributions, weeks_accumulated)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM challenge_hio_jackpot);

-- ============================================================================
-- SEED FIVE-SHOT CHALLENGE TYPE
-- ============================================================================
INSERT INTO challenge_types (
    type_key,
    type_name,
    description,
    shots_per_group,
    max_reups,
    default_entry_fee,
    default_reup_fee,
    payout_config
) VALUES (
    'five_shot',
    'Five-Shot Challenge',
    'Weekly challenge with 5-shot groups. Compete for Closest-to-Pin and Hole-in-One jackpot.',
    5,
    NULL, -- unlimited reups
    5.00,
    3.00,
    '{
        "ctp": {
            "enabled": true,
            "pot_percentage": 50,
            "payout_split": [50, 30, 20],
            "description": "Top 3 closest shots split 50% of weekly pot"
        },
        "hio": {
            "enabled": true,
            "pot_percentage": 30,
            "rolling_jackpot": true,
            "description": "30% goes to rolling HIO jackpot, winner takes all"
        },
        "admin_fee_percentage": 20
    }'::jsonb
) ON CONFLICT (type_key) DO UPDATE SET
    payout_config = EXCLUDED.payout_config,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for user's best shot in a challenge (for CTP leaderboard)
CREATE OR REPLACE VIEW challenge_user_best_shots AS
SELECT DISTINCT ON (e.challenge_id, e.user_id)
    e.challenge_id,
    e.user_id,
    e.id as entry_id,
    s.id as shot_id,
    s.group_id,
    s.shot_number,
    COALESCE(s.override_distance_inches, s.distance_from_pin_inches) as distance_inches,
    s.is_hole_in_one,
    s.submitted_at,
    s.verified
FROM weekly_challenge_entries e
JOIN challenge_shot_groups g ON g.entry_id = e.id
JOIN challenge_shots s ON s.group_id = g.id
WHERE s.distance_from_pin_inches IS NOT NULL
ORDER BY
    e.challenge_id,
    e.user_id,
    s.is_hole_in_one DESC,
    COALESCE(s.override_distance_inches, s.distance_from_pin_inches) ASC,
    s.submitted_at ASC;

-- View for all hole-in-ones in a challenge
CREATE OR REPLACE VIEW challenge_hole_in_ones AS
SELECT
    e.challenge_id,
    e.user_id,
    e.id as entry_id,
    s.id as shot_id,
    g.group_number,
    s.shot_number,
    s.submitted_at,
    s.verified,
    s.detail_screenshot_url
FROM weekly_challenge_entries e
JOIN challenge_shot_groups g ON g.entry_id = e.id
JOIN challenge_shots s ON s.group_id = g.id
WHERE s.is_hole_in_one = TRUE
ORDER BY s.submitted_at ASC;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Challenge types created' as status, COUNT(*) as count FROM challenge_types;
SELECT 'HIO jackpot initialized' as status, current_amount FROM challenge_hio_jackpot LIMIT 1;

