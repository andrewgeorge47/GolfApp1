-- Migration 029: CTP Challenge System
-- Extends existing weekly_challenges infrastructure to support automated CTP challenges
-- with simulator integration

-- ============================================================================
-- 1. EXTEND SIMULATOR_COURSES_COMBINED - Add detailed hole data
-- ============================================================================

-- Add hole_details JSONB column to store tee/pin positions with x/y/z coordinates
ALTER TABLE simulator_courses_combined
ADD COLUMN IF NOT EXISTS hole_details JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN simulator_courses_combined.hole_details IS 'Detailed hole data for CTP challenges: tees, pins, green center positions with x/y/z coordinates. Structure: [{hole, par, index, greenCenter: {x,y,z}, pins: {Thursday:{x,y,z}, Friday:{x,y,z},...}, tees: {Black:{x,y,z,distance}, White:{x,y,z,distance},...}}]';

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_simulator_courses_hole_details ON simulator_courses_combined USING GIN (hole_details);

-- ============================================================================
-- 2. EXTEND WEEKLY_CHALLENGES - Add CTP-specific fields
-- ============================================================================

-- Add CTP challenge mode fields
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS is_ctp_challenge BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ctp_mode VARCHAR(20) CHECK (ctp_mode IN ('par3-holes', 'par3-tees', NULL)),
ADD COLUMN IF NOT EXISTS ctp_tee_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS ctp_pin_day VARCHAR(20) CHECK (ctp_pin_day IN ('Thursday', 'Friday', 'Saturday', 'Sunday', NULL)),
ADD COLUMN IF NOT EXISTS ctp_selected_holes INTEGER[],
ADD COLUMN IF NOT EXISTS ctp_attempts_per_hole INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS ctp_holes_config JSONB,
ADD COLUMN IF NOT EXISTS crd_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS crd_content JSONB,
ADD COLUMN IF NOT EXISTS synced_to_sim_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sim_id VARCHAR(100) DEFAULT 'nn-no5';

-- Add comments
COMMENT ON COLUMN weekly_challenges.is_ctp_challenge IS 'TRUE for automated CTP challenges with simulator integration, FALSE for manual screenshot submission challenges';
COMMENT ON COLUMN weekly_challenges.ctp_mode IS 'CTP challenge mode: par3-holes (only par 3 holes) or par3-tees (all holes from par 3 tee box)';
COMMENT ON COLUMN weekly_challenges.ctp_tee_type IS 'Which tee to use for CTP challenge (Black, Blue, White, Yellow, Green, Red, Junior, Par3)';
COMMENT ON COLUMN weekly_challenges.ctp_pin_day IS 'Which pin position to use (Thursday, Friday, Saturday, Sunday)';
COMMENT ON COLUMN weekly_challenges.ctp_selected_holes IS 'Array of specific hole numbers to include. NULL = all eligible holes based on mode';
COMMENT ON COLUMN weekly_challenges.ctp_attempts_per_hole IS 'Number of shots allowed per hole in the CTP challenge';
COMMENT ON COLUMN weekly_challenges.ctp_holes_config IS 'Pre-computed hole details for .crd generation: [{hole, par, distance, teePos:{x,y,z}, pinPos:{x,y,z}}]';
COMMENT ON COLUMN weekly_challenges.crd_filename IS 'Filename of the generated .crd file on simulator PC';
COMMENT ON COLUMN weekly_challenges.crd_content IS 'Full .crd file content (JSON format)';
COMMENT ON COLUMN weekly_challenges.synced_to_sim_at IS 'Timestamp when sim PC downloaded and generated the .crd file';
COMMENT ON COLUMN weekly_challenges.sim_id IS 'Which simulator this challenge is for (default: nn-no5)';

-- Add foreign key to simulator
ALTER TABLE weekly_challenges
DROP CONSTRAINT IF EXISTS fk_weekly_challenges_sim_id;

ALTER TABLE weekly_challenges
ADD CONSTRAINT fk_weekly_challenges_sim_id
FOREIGN KEY (sim_id) REFERENCES simulator_api_keys(sim_id);

-- Create indexes for CTP queries
CREATE INDEX IF NOT EXISTS idx_weekly_challenges_is_ctp ON weekly_challenges(is_ctp_challenge);
CREATE INDEX IF NOT EXISTS idx_weekly_challenges_sim_status ON weekly_challenges(sim_id, status) WHERE is_ctp_challenge = TRUE;
CREATE INDEX IF NOT EXISTS idx_weekly_challenges_ctp_pending_sync ON weekly_challenges(status, synced_to_sim_at) WHERE is_ctp_challenge = TRUE;

-- ============================================================================
-- 3. CREATE CTP_ACTIVE_SESSIONS - Track active user sessions
-- ============================================================================

-- Slim table for tracking when users activate their CTP session on the simulator
CREATE TABLE IF NOT EXISTS ctp_active_sessions (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
    entry_id INTEGER NOT NULL REFERENCES weekly_challenge_entries(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    sim_id VARCHAR(100) NOT NULL REFERENCES simulator_api_keys(sim_id),

    -- Link to existing simulator_sessions (for shot tracking)
    simulator_session_id INTEGER REFERENCES simulator_sessions(id),

    -- Session state
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),

    -- Progress tracking
    current_hole_index INTEGER DEFAULT 0,
    shots_taken INTEGER DEFAULT 0,
    best_distance_yards DECIMAL(6,2),

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ctp_active_sessions_challenge ON ctp_active_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_ctp_active_sessions_entry ON ctp_active_sessions(entry_id);
CREATE INDEX IF NOT EXISTS idx_ctp_active_sessions_user ON ctp_active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ctp_active_sessions_sim_status ON ctp_active_sessions(sim_id, status);
CREATE INDEX IF NOT EXISTS idx_ctp_active_sessions_started ON ctp_active_sessions(started_at DESC);

-- Only one active CTP session per sim at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ctp_active_sessions_unique_sim
    ON ctp_active_sessions(sim_id)
    WHERE status = 'active';

-- Comments
COMMENT ON TABLE ctp_active_sessions IS 'Tracks active CTP challenge sessions when users activate via PWA';
COMMENT ON COLUMN ctp_active_sessions.simulator_session_id IS 'Links to simulator_sessions for shot tracking';
COMMENT ON COLUMN ctp_active_sessions.current_hole_index IS 'Which hole in the challenge sequence the user is currently on';
COMMENT ON COLUMN ctp_active_sessions.best_distance_yards IS 'Best shot distance so far in this session';

-- ============================================================================
-- 4. EXTEND SHOTS TABLE - Link shots to challenge entries
-- ============================================================================

-- Add foreign key to weekly_challenge_entries for CTP shot tracking
ALTER TABLE shots
ADD COLUMN IF NOT EXISTS challenge_entry_id INTEGER REFERENCES weekly_challenge_entries(id);

-- Create index for shot queries by challenge entry
CREATE INDEX IF NOT EXISTS idx_shots_challenge_entry ON shots(challenge_entry_id);

COMMENT ON COLUMN shots.challenge_entry_id IS 'Links shot to a CTP challenge entry for automated leaderboard updates';

-- ============================================================================
-- 5. FUNCTIONS - Helper functions for CTP operations
-- ============================================================================

-- Function to get active CTP session for a simulator
CREATE OR REPLACE FUNCTION get_active_ctp_session_for_sim(p_sim_id VARCHAR)
RETURNS TABLE (
    session_id INTEGER,
    challenge_id INTEGER,
    entry_id INTEGER,
    user_id INTEGER,
    user_name VARCHAR,
    challenge_name VARCHAR,
    crd_filename VARCHAR,
    current_hole_index INTEGER,
    shots_taken INTEGER,
    best_distance_yards DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.challenge_id,
        cs.entry_id,
        cs.user_id,
        u.full_name,
        wc.challenge_name,
        wc.crd_filename,
        cs.current_hole_index,
        cs.shots_taken,
        cs.best_distance_yards
    FROM ctp_active_sessions cs
    JOIN users u ON u.member_id = cs.user_id
    JOIN weekly_challenges wc ON wc.id = cs.challenge_id
    WHERE cs.sim_id = p_sim_id
      AND cs.status = 'active'
    ORDER BY cs.started_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_ctp_session_for_sim IS 'Returns the currently active CTP session for a simulator (used by sim PC polling)';

-- ============================================================================
-- 6. TRIGGERS - Auto-update stats when CTP shots are captured
-- ============================================================================

-- Trigger function to update entry and session stats when CTP shots are recorded
CREATE OR REPLACE FUNCTION update_ctp_entry_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_best_distance_yards DECIMAL(6,2);
    v_best_distance_inches INTEGER;
BEGIN
    IF NEW.challenge_entry_id IS NOT NULL THEN
        -- Calculate best distance for this entry (carry_distance is in yards)
        SELECT MIN(carry_distance)
        INTO v_best_distance_yards
        FROM shots
        WHERE challenge_entry_id = NEW.challenge_entry_id
          AND carry_distance IS NOT NULL;

        -- Convert to inches for storage in entry table
        v_best_distance_inches := ROUND(v_best_distance_yards * 36);

        -- Update weekly_challenge_entries record
        UPDATE weekly_challenge_entries
        SET distance_from_pin_inches = v_best_distance_inches,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.challenge_entry_id;

        -- Update active CTP session progress (if exists)
        UPDATE ctp_active_sessions
        SET shots_taken = shots_taken + 1,
            best_distance_yards = LEAST(
                COALESCE(best_distance_yards, 999999),
                COALESCE(NEW.carry_distance, 999999)
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE entry_id = NEW.challenge_entry_id
          AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_ctp_entry_stats ON shots;

-- Create trigger on shots table
CREATE TRIGGER trigger_update_ctp_entry_stats
    AFTER INSERT ON shots
    FOR EACH ROW
    EXECUTE FUNCTION update_ctp_entry_stats();

COMMENT ON FUNCTION update_ctp_entry_stats IS 'Auto-updates challenge entry and session stats when CTP shots are recorded';

-- ============================================================================
-- 7. SAMPLE DATA - Create a CTP challenge type
-- ============================================================================

-- Insert CTP challenge type if it doesn't exist
INSERT INTO challenge_types (
    type_key,
    type_name,
    description,
    shots_per_group,
    max_reups,
    default_entry_fee,
    default_reup_fee,
    payout_config,
    is_active
) VALUES (
    'ctp-auto',
    'Automated CTP Challenge',
    'Closest-to-Pin challenge with automatic shot capture from simulator',
    3, -- Default attempts per hole
    NULL, -- No re-ups for CTP challenges
    5.00,
    0.00, -- No re-ups
    '{"ctp_split": {"1st": 0.50, "2nd": 0.30, "3rd": 0.20}, "hio_percent": 0.30, "admin_fee": 0.20}'::jsonb,
    TRUE
) ON CONFLICT (type_key) DO NOTHING;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on new table
GRANT SELECT, INSERT, UPDATE ON ctp_active_sessions TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE ctp_active_sessions_id_seq TO PUBLIC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns exist
DO $$
BEGIN
    -- Check simulator_courses_combined
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'simulator_courses_combined' AND column_name = 'hole_details'
    ) THEN
        RAISE EXCEPTION 'Column hole_details not added to simulator_courses_combined';
    END IF;

    -- Check weekly_challenges
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_challenges' AND column_name = 'is_ctp_challenge'
    ) THEN
        RAISE EXCEPTION 'Column is_ctp_challenge not added to weekly_challenges';
    END IF;

    -- Check shots
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'shots' AND column_name = 'challenge_entry_id'
    ) THEN
        RAISE EXCEPTION 'Column challenge_entry_id not added to shots';
    END IF;

    -- Check table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ctp_active_sessions'
    ) THEN
        RAISE EXCEPTION 'Table ctp_active_sessions not created';
    END IF;

    RAISE NOTICE 'Migration 029 completed successfully!';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Display summary
SELECT
    'Migration 029: CTP Challenge System' as migration,
    'SUCCESS' as status,
    '1 new table created (ctp_active_sessions)' as tables_created,
    '3 tables extended (simulator_courses_combined, weekly_challenges, shots)' as tables_extended,
    '1 challenge type added (ctp-auto)' as data_added,
    '2 functions created (get_active_ctp_session_for_sim, update_ctp_entry_stats)' as functions,
    '1 trigger created (trigger_update_ctp_entry_stats)' as triggers;
