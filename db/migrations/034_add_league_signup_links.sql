-- Migration: League-Signup Integration
-- Date: 2025-12-19
-- Description: Add direct relationship between leagues and signups, similar to tournament-signup links

-- ============================================================================
-- LEAGUE SIGNUP LINKS TABLE - Link leagues to signups for registration
-- ============================================================================
CREATE TABLE IF NOT EXISTS league_signup_links (
    id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    signup_id INTEGER NOT NULL REFERENCES signups(id) ON DELETE CASCADE,

    -- Sync settings
    auto_sync BOOLEAN DEFAULT false, -- Auto-sync new paid registrations to league roster
    last_synced_at TIMESTAMP,
    synced_by INTEGER REFERENCES users(member_id),
    sync_count INTEGER DEFAULT 0, -- Track number of sync operations

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- One league can link to multiple signups, but prevent duplicate links
    UNIQUE(league_id, signup_id)
);

-- Indexes for league_signup_links
CREATE INDEX IF NOT EXISTS idx_league_signup_links_league ON league_signup_links(league_id);
CREATE INDEX IF NOT EXISTS idx_league_signup_links_signup ON league_signup_links(signup_id);
CREATE INDEX IF NOT EXISTS idx_league_signup_links_auto_sync ON league_signup_links(auto_sync) WHERE auto_sync = true;

-- Comments
COMMENT ON TABLE league_signup_links IS 'Links leagues to signups - allows leagues to pull registrations from signup events';
COMMENT ON COLUMN league_signup_links.auto_sync IS 'If true, automatically sync new paid registrations to league when managing teams';
COMMENT ON COLUMN league_signup_links.sync_count IS 'Tracks how many times sync has been performed for audit purposes';

-- ============================================================================
-- ADD SIGNUP TRACKING TO TEAM MEMBERS
-- ============================================================================
-- Track which signup sourced each team member
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS signup_id INTEGER REFERENCES signups(id);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS registration_data JSONB;

CREATE INDEX IF NOT EXISTS idx_team_members_signup ON team_members(signup_id) WHERE signup_id IS NOT NULL;

COMMENT ON COLUMN team_members.signup_id IS 'References the signup that sourced this team member (if applicable)';
COMMENT ON COLUMN team_members.registration_data IS 'Copy of registration_data from signup_registrations for quick access to preferences/availability';

SELECT 'League-signup integration migration complete' as status;
