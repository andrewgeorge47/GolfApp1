-- Migration: Signup System
-- Date: 2025-11-26
-- Description: First-class signup objects with payment tracking, decoupled from tournaments

-- ============================================================================
-- SIGNUPS TABLE - First-class signup objects independent of tournaments
-- ============================================================================
CREATE TABLE IF NOT EXISTS signups (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    slug VARCHAR(200) UNIQUE, -- For clean URLs: /signup/summer-league-2025

    -- Pricing
    entry_fee NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- Registration window
    registration_opens_at TIMESTAMP,
    registration_closes_at TIMESTAMP,

    -- Capacity
    max_registrations INTEGER, -- NULL = unlimited

    -- Payment settings
    stripe_enabled BOOLEAN DEFAULT true,
    venmo_url VARCHAR(500), -- Fallback payment option
    venmo_username VARCHAR(100),

    -- Display settings
    image_url VARCHAR(500),
    confirmation_message TEXT, -- Shown after successful signup

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),

    -- Metadata
    created_by INTEGER REFERENCES users(member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Soft delete
    deleted_at TIMESTAMP
);

-- Indexes for signups
CREATE INDEX IF NOT EXISTS idx_signups_status ON signups(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_signups_slug ON signups(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_signups_created_by ON signups(created_by);
CREATE INDEX IF NOT EXISTS idx_signups_registration_window ON signups(registration_opens_at, registration_closes_at);

-- Comments
COMMENT ON TABLE signups IS 'First-class signup objects that can be linked to tournaments';
COMMENT ON COLUMN signups.slug IS 'URL-friendly identifier for clean signup URLs';
COMMENT ON COLUMN signups.confirmation_message IS 'Custom message shown to user after successful registration';
COMMENT ON COLUMN signups.deleted_at IS 'Soft delete timestamp - NULL means active';

-- ============================================================================
-- SIGNUP REGISTRATIONS TABLE - User registrations for signups
-- ============================================================================
CREATE TABLE IF NOT EXISTS signup_registrations (
    id SERIAL PRIMARY KEY,
    signup_id INTEGER NOT NULL REFERENCES signups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(member_id),

    -- Registration data
    registration_data JSONB, -- Store form responses, preferences, etc.

    -- Payment tracking
    payment_required BOOLEAN DEFAULT true,
    payment_amount NUMERIC(10,2), -- Can override signup's entry_fee

    -- Status (automatically updated based on payment)
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),

    -- Timestamps
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate registrations
    UNIQUE(signup_id, user_id)
);

-- Indexes for signup_registrations
CREATE INDEX IF NOT EXISTS idx_signup_registrations_signup ON signup_registrations(signup_id);
CREATE INDEX IF NOT EXISTS idx_signup_registrations_user ON signup_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_registrations_status ON signup_registrations(status);
CREATE INDEX IF NOT EXISTS idx_signup_registrations_paid ON signup_registrations(signup_id, status) WHERE status = 'paid';

-- Comments
COMMENT ON TABLE signup_registrations IS 'User registrations for signups with payment tracking';
COMMENT ON COLUMN signup_registrations.registration_data IS 'JSONB field for storing custom form data and user preferences';
COMMENT ON COLUMN signup_registrations.payment_amount IS 'Overrides signup entry_fee if set, allows per-user pricing';
COMMENT ON COLUMN signup_registrations.status IS 'Registration status - automatically updated when payment completes';

-- ============================================================================
-- SIGNUP PAYMENTS TABLE - Payment tracking (mirrors challenge_payments pattern)
-- ============================================================================
CREATE TABLE IF NOT EXISTS signup_payments (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER NOT NULL REFERENCES signup_registrations(id) ON DELETE CASCADE,

    -- Payment details
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50), -- 'stripe', 'venmo', 'cash', 'check'
    payment_reference VARCHAR(255), -- Stripe payment_intent_id or Venmo username/note

    -- Status (syncs with Stripe webhooks)
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),

    -- Stripe-specific fields
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_client_secret VARCHAR(255),

    -- Manual verification (for Venmo, cash, check payments)
    verified_by INTEGER REFERENCES users(member_id),
    verified_at TIMESTAMP,
    admin_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for signup_payments
CREATE INDEX IF NOT EXISTS idx_signup_payments_registration ON signup_payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_signup_payments_status ON signup_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_signup_payments_stripe_intent ON signup_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_signup_payments_method ON signup_payments(payment_method);

-- Comments
COMMENT ON TABLE signup_payments IS 'Payment tracking for signup registrations - supports Stripe, Venmo, and manual payments';
COMMENT ON COLUMN signup_payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for webhook matching';
COMMENT ON COLUMN signup_payments.stripe_client_secret IS 'Client secret for Stripe payment confirmation on frontend';
COMMENT ON COLUMN signup_payments.verified_by IS 'Admin user who verified manual payment (Venmo, cash, check)';
COMMENT ON COLUMN signup_payments.admin_notes IS 'Admin notes about payment verification or issues';

-- ============================================================================
-- TOURNAMENT SIGNUP LINKS TABLE - Link tournaments to signups (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tournament_signup_links (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    signup_id INTEGER NOT NULL REFERENCES signups(id) ON DELETE CASCADE,

    -- Sync settings
    auto_sync BOOLEAN DEFAULT false, -- Auto-sync new paid registrations to tournament
    last_synced_at TIMESTAMP,
    synced_by INTEGER REFERENCES users(member_id),
    sync_count INTEGER DEFAULT 0, -- Track number of sync operations

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- One tournament can link to multiple signups, but prevent duplicate links
    UNIQUE(tournament_id, signup_id)
);

-- Indexes for tournament_signup_links
CREATE INDEX IF NOT EXISTS idx_tournament_signup_links_tournament ON tournament_signup_links(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_signup_links_signup ON tournament_signup_links(signup_id);
CREATE INDEX IF NOT EXISTS idx_tournament_signup_links_auto_sync ON tournament_signup_links(auto_sync) WHERE auto_sync = true;

-- Comments
COMMENT ON TABLE tournament_signup_links IS 'Links tournaments to signups - allows one signup to feed multiple tournaments';
COMMENT ON COLUMN tournament_signup_links.auto_sync IS 'If true, automatically add new paid registrations to tournament participation';
COMMENT ON COLUMN tournament_signup_links.sync_count IS 'Tracks how many times sync has been performed for audit purposes';

-- ============================================================================
-- OPTIONAL: Add signup tracking to participation table
-- ============================================================================
-- Track which signup sourced each tournament participant
ALTER TABLE participation ADD COLUMN IF NOT EXISTS signup_id INTEGER REFERENCES signups(id);
CREATE INDEX IF NOT EXISTS idx_participation_signup ON participation(signup_id) WHERE signup_id IS NOT NULL;

COMMENT ON COLUMN participation.signup_id IS 'References the signup that sourced this participant (if applicable)';

-- ============================================================================
-- PERMISSIONS - Add signup management permissions
-- ============================================================================
-- Insert signup permissions if they don't exist
INSERT INTO permissions (permission_key, permission_name, category, description)
VALUES
    ('manage_signups', 'Manage Signups', 'Signup Management', 'Create, edit, and delete signups')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO permissions (permission_key, permission_name, category, description)
VALUES
    ('verify_signup_payments', 'Verify Signup Payments', 'Signup Management', 'Verify manual signup payments (Venmo, cash, check)')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO permissions (permission_key, permission_name, category, description)
VALUES
    ('view_signup_analytics', 'View Signup Analytics', 'Signup Management', 'View signup revenue and analytics')
ON CONFLICT (permission_key) DO NOTHING;

-- Assign signup permissions to Admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE permission_key IN ('manage_signups', 'verify_signup_payments', 'view_signup_analytics')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign signup permissions to Club Pro role (role_id = 3) - if exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE permission_key IN ('manage_signups', 'verify_signup_payments')
ON CONFLICT (role_id, permission_id) DO NOTHING;

SELECT 'Signup system migration complete' as status;
