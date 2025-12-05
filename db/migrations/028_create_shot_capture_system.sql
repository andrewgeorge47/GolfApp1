-- Migration 028: Shot Capture System for GSPro Integration
-- Creates tables for storing shots from simulator PCs and managing sim authentication

-- ============================================================================
-- 1. SIMULATOR API KEYS
-- Stores API keys for each simulator to authenticate shot uploads
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_api_keys (
    id SERIAL PRIMARY KEY,
    sim_id VARCHAR(100) NOT NULL UNIQUE, -- Unique identifier for each simulator PC
    api_key VARCHAR(255) NOT NULL UNIQUE, -- API key for authentication (hashed)
    sim_name VARCHAR(255), -- Friendly name for the simulator
    location VARCHAR(255), -- Physical location (e.g., "NN Club - Bay 1")
    is_active BOOLEAN DEFAULT true, -- Whether this sim can upload shots

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(member_id),
    last_used_at TIMESTAMP, -- Last time this API key was used
    notes TEXT, -- Admin notes about this simulator

    -- Constraints
    CONSTRAINT valid_sim_id CHECK (LENGTH(sim_id) > 0),
    CONSTRAINT valid_api_key CHECK (LENGTH(api_key) > 0)
);

CREATE INDEX idx_simulator_api_keys_sim_id ON simulator_api_keys(sim_id);
CREATE INDEX idx_simulator_api_keys_active ON simulator_api_keys(is_active);

-- ============================================================================
-- 2. SIMULATOR SESSIONS
-- Tracks active and historical sessions for each simulator
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_sessions (
    id SERIAL PRIMARY KEY,
    session_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    sim_id VARCHAR(100) NOT NULL REFERENCES simulator_api_keys(sim_id),

    -- User/Player info
    nn_player_id INTEGER REFERENCES users(member_id), -- NN member playing
    player_name VARCHAR(255), -- Name if not an NN member

    -- Session details
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,

    -- Session context
    session_type VARCHAR(50), -- 'practice', 'tournament', 'challenge', 'social', etc.
    course_name VARCHAR(255), -- Course being played

    -- Statistics (computed from shots)
    total_shots INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulator_sessions_sim_id ON simulator_sessions(sim_id);
CREATE INDEX idx_simulator_sessions_player_id ON simulator_sessions(nn_player_id);
CREATE INDEX idx_simulator_sessions_status ON simulator_sessions(status);
CREATE INDEX idx_simulator_sessions_started ON simulator_sessions(started_at DESC);
CREATE INDEX idx_simulator_sessions_uuid ON simulator_sessions(session_uuid);

-- Index for finding active session for a sim
CREATE UNIQUE INDEX idx_simulator_sessions_active_sim
    ON simulator_sessions(sim_id)
    WHERE status = 'active';

-- ============================================================================
-- 3. SHOTS TABLE
-- Central storage for all shots from all simulators
-- ============================================================================
CREATE TABLE IF NOT EXISTS shots (
    id SERIAL PRIMARY KEY,
    shot_uuid UUID NOT NULL UNIQUE, -- Globally unique shot ID from sim PC

    -- Source identification
    sim_id VARCHAR(100) NOT NULL REFERENCES simulator_api_keys(sim_id),
    session_id INTEGER REFERENCES simulator_sessions(id),
    nn_player_id INTEGER REFERENCES users(member_id),

    -- Timing
    shot_timestamp TIMESTAMP NOT NULL, -- When the shot was hit (from GSPro)
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When we received it

    -- Shot data (normalized from GSPro)
    club VARCHAR(50), -- e.g., "Driver", "7 Iron", "Pitching Wedge"
    ball_speed NUMERIC(6,2), -- mph
    club_speed NUMERIC(6,2), -- mph
    smash_factor NUMERIC(4,3), -- ball speed / club speed

    launch_angle NUMERIC(5,2), -- degrees
    launch_direction NUMERIC(6,2), -- degrees (+ is right, - is left)

    spin_rate INTEGER, -- rpm
    spin_axis INTEGER, -- degrees

    carry_distance NUMERIC(6,2), -- yards
    total_distance NUMERIC(6,2), -- yards
    offline NUMERIC(6,2), -- yards (+ is right, - is left)

    apex_height NUMERIC(6,2), -- yards
    descent_angle NUMERIC(5,2), -- degrees

    -- Additional context
    hole_number INTEGER, -- If playing a course
    shot_number INTEGER, -- Shot number in the round/session
    course_name VARCHAR(255),

    -- Raw data preservation
    raw_gspro_data JSONB, -- Complete GSPro shot payload for debugging

    -- Metadata
    source VARCHAR(50) DEFAULT 'gspro', -- Source system (future: trackman, etc.)
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_shots_uuid ON shots(shot_uuid);
CREATE INDEX idx_shots_sim_id ON shots(sim_id);
CREATE INDEX idx_shots_session_id ON shots(session_id);
CREATE INDEX idx_shots_player_id ON shots(nn_player_id);
CREATE INDEX idx_shots_timestamp ON shots(shot_timestamp DESC);
CREATE INDEX idx_shots_received ON shots(received_at DESC);
CREATE INDEX idx_shots_club ON shots(club);

-- Composite index for session queries
CREATE INDEX idx_shots_session_timestamp ON shots(session_id, shot_timestamp DESC);

-- Index for player statistics queries
CREATE INDEX idx_shots_player_timestamp ON shots(nn_player_id, shot_timestamp DESC)
    WHERE nn_player_id IS NOT NULL;

-- GIN index for searching raw JSON data
CREATE INDEX idx_shots_raw_data ON shots USING GIN (raw_gspro_data);

-- ============================================================================
-- 4. SYNC STATUS TRACKING (for monitoring cloud sync health)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sim_sync_status (
    id SERIAL PRIMARY KEY,
    sim_id VARCHAR(100) NOT NULL REFERENCES simulator_api_keys(sim_id),

    -- Sync health metrics
    last_sync_at TIMESTAMP,
    last_shot_received_at TIMESTAMP,
    total_shots_received INTEGER DEFAULT 0,

    -- Error tracking
    last_error_at TIMESTAMP,
    last_error_message TEXT,
    consecutive_errors INTEGER DEFAULT 0,

    -- Version info
    listener_version VARCHAR(50), -- Version of the listener service on sim PC

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_sim_sync UNIQUE(sim_id)
);

CREATE INDEX idx_sim_sync_status_sim_id ON sim_sync_status(sim_id);
CREATE INDEX idx_sim_sync_status_last_sync ON sim_sync_status(last_sync_at DESC);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get active session for a simulator
CREATE OR REPLACE FUNCTION get_active_session_for_sim(p_sim_id VARCHAR)
RETURNS TABLE (
    session_id INTEGER,
    session_uuid UUID,
    nn_player_id INTEGER,
    player_name VARCHAR,
    started_at TIMESTAMP,
    session_type VARCHAR,
    course_name VARCHAR,
    total_shots INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.id,
        ss.session_uuid,
        ss.nn_player_id,
        ss.player_name,
        ss.started_at,
        ss.session_type,
        ss.course_name,
        ss.total_shots
    FROM simulator_sessions ss
    WHERE ss.sim_id = p_sim_id
      AND ss.status = 'active'
    ORDER BY ss.started_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update session shot count
CREATE OR REPLACE FUNCTION update_session_shot_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_id IS NOT NULL THEN
        UPDATE simulator_sessions
        SET total_shots = total_shots + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session shot counts
CREATE TRIGGER trigger_update_session_shot_count
    AFTER INSERT ON shots
    FOR EACH ROW
    EXECUTE FUNCTION update_session_shot_count();

-- ============================================================================
-- 6. SAMPLE DATA (for testing)
-- ============================================================================

-- Insert a sample simulator API key (you'll replace this with real ones)
INSERT INTO simulator_api_keys (sim_id, api_key, sim_name, location, created_by)
VALUES (
    'nn-sim-bay1-dev',
    -- This is a bcrypt hash of 'dev-test-key-12345' - replace with real hashed keys
    '$2b$10$YourHashedAPIKeyHere',
    'Development Simulator - Bay 1',
    'NN Development Lab',
    NULL
) ON CONFLICT (sim_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON shots TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON simulator_sessions TO PUBLIC;
GRANT SELECT ON simulator_api_keys TO PUBLIC;
GRANT SELECT, UPDATE ON sim_sync_status TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE simulator_api_keys IS 'API keys for authenticating simulator PCs that upload shots';
COMMENT ON TABLE simulator_sessions IS 'Active and historical practice/play sessions on simulators';
COMMENT ON TABLE shots IS 'Central storage for all golf shots from all simulators';
COMMENT ON TABLE sim_sync_status IS 'Health monitoring for simulator cloud sync';

COMMENT ON COLUMN shots.shot_uuid IS 'Globally unique ID generated by sim PC for idempotent uploads';
COMMENT ON COLUMN shots.raw_gspro_data IS 'Complete GSPro payload stored as JSON for debugging and future parsing';
COMMENT ON COLUMN simulator_sessions.session_uuid IS 'UUID for session used by sim PC and mobile app';
