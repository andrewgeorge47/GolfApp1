-- Migration: Golf Simulator Recommendation System
-- Date: 2025-11-26
-- Description: Equipment database and recommendation engine for golf simulators

-- ============================================================================
-- LAUNCH MONITORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_launch_monitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    technology VARCHAR(50), -- Camera-based, Radar-based
    placement VARCHAR(50), -- Side, Behind
    min_ceiling_height NUMERIC(4,2), -- feet
    min_room_width NUMERIC(4,2), -- feet
    min_room_depth NUMERIC(4,2), -- feet
    distance_from_screen NUMERIC(4,2), -- feet
    purchase_url TEXT,
    rating NUMERIC(4,2),
    score NUMERIC(10,2), -- Quality score for ranking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for launch monitors
CREATE INDEX IF NOT EXISTS idx_launch_monitors_price ON simulator_launch_monitors(price);
CREATE INDEX IF NOT EXISTS idx_launch_monitors_ceiling ON simulator_launch_monitors(min_ceiling_height);
CREATE INDEX IF NOT EXISTS idx_launch_monitors_room_dims ON simulator_launch_monitors(min_room_width, min_room_depth);
CREATE INDEX IF NOT EXISTS idx_launch_monitors_score ON simulator_launch_monitors(score);

-- ============================================================================
-- PROJECTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_projectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    throw_ratio NUMERIC(4,2), -- 0.5 = short throw, 1.5 = standard throw
    max_image_size INTEGER, -- inches diagonal
    brightness INTEGER, -- lumens
    purchase_url TEXT,
    light_source VARCHAR(100), -- LED, Laser, Lamp
    resolution VARCHAR(50), -- 1080p, 4K, etc.
    lumens VARCHAR(50),
    achievable_aspect_ratio VARCHAR(50), -- 16:9, 16:10, etc.
    rating NUMERIC(4,2),
    score NUMERIC(10,2), -- Quality score for ranking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for projectors
CREATE INDEX IF NOT EXISTS idx_projectors_price ON simulator_projectors(price);
CREATE INDEX IF NOT EXISTS idx_projectors_score ON simulator_projectors(score);

-- ============================================================================
-- HITTING MATS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_hitting_mats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    dimensions VARCHAR(100), -- e.g., "5x5 feet"
    features TEXT,
    realistic_feel NUMERIC(4,2), -- Rating 0-10
    shock_absorption NUMERIC(4,2), -- Rating 0-10
    durability NUMERIC(4,2), -- Rating 0-10
    sliding NUMERIC(4,2), -- Rating 0-10
    use_on_concrete NUMERIC(4,2), -- Rating 0-10
    quality_metric NUMERIC(4,2), -- Overall quality metric
    rating NUMERIC(4,2), -- Overall rating
    purchase_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for hitting mats
CREATE INDEX IF NOT EXISTS idx_hitting_mats_price ON simulator_hitting_mats(price);
CREATE INDEX IF NOT EXISTS idx_hitting_mats_rating ON simulator_hitting_mats(rating);

-- ============================================================================
-- IMPACT SCREENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_impact_screens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    dimensions VARCHAR(100), -- e.g., "10x12 feet"
    material VARCHAR(100), -- Vinyl, Fabric, etc.
    min_room_width NUMERIC(4,2), -- feet
    min_room_height NUMERIC(4,2), -- feet
    impact_resistance NUMERIC(4,2), -- Rating 0-10
    image_quality NUMERIC(4,2), -- Rating 0-10
    durability NUMERIC(4,2), -- Rating 0-10
    rating NUMERIC(4,2), -- Overall rating
    score NUMERIC(10,2), -- Quality score for ranking
    purchase_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for impact screens
CREATE INDEX IF NOT EXISTS idx_impact_screens_price ON simulator_impact_screens(price);
CREATE INDEX IF NOT EXISTS idx_impact_screens_rating ON simulator_impact_screens(rating);
CREATE INDEX IF NOT EXISTS idx_impact_screens_score ON simulator_impact_screens(score);

-- ============================================================================
-- COMPUTERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_computers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    processor VARCHAR(100), -- e.g., "Intel i7-13700K"
    graphics_card VARCHAR(100), -- e.g., "NVIDIA RTX 4070"
    ram INTEGER, -- GB
    storage VARCHAR(100), -- e.g., "1TB SSD"
    form_factor VARCHAR(50), -- Desktop, Mini PC, Laptop
    performance_tier VARCHAR(50), -- Budget, Mid-Range, High-End, Professional
    rating NUMERIC(4,2), -- Overall rating
    score NUMERIC(10,2), -- Quality score for ranking
    purchase_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for computers
CREATE INDEX IF NOT EXISTS idx_computers_price ON simulator_computers(price);
CREATE INDEX IF NOT EXISTS idx_computers_rating ON simulator_computers(rating);
CREATE INDEX IF NOT EXISTS idx_computers_score ON simulator_computers(score);
CREATE INDEX IF NOT EXISTS idx_computers_performance_tier ON simulator_computers(performance_tier);

-- ============================================================================
-- SIMULATION SOFTWARE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_software (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL, -- One-time or annual subscription
    pricing_model VARCHAR(50), -- One-time, Monthly, Annual
    compatible_launch_monitors TEXT, -- JSON array or comma-separated
    features TEXT, -- Key features
    course_count INTEGER, -- Number of courses available
    game_modes TEXT, -- Practice, Tournament, Multiplayer, etc.
    rating NUMERIC(4,2), -- Overall rating
    score NUMERIC(10,2), -- Quality score for ranking
    purchase_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for software
CREATE INDEX IF NOT EXISTS idx_software_price ON simulator_software(price);
CREATE INDEX IF NOT EXISTS idx_software_rating ON simulator_software(rating);
CREATE INDEX IF NOT EXISTS idx_software_score ON simulator_software(score);
CREATE INDEX IF NOT EXISTS idx_software_pricing_model ON simulator_software(pricing_model);

-- ============================================================================
-- SIMULATOR CONFIGURATIONS TABLE (Saved User Setups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulator_configurations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    name VARCHAR(200), -- User-given name for their setup

    -- Room dimensions
    ceiling_height NUMERIC(4,2),
    room_width NUMERIC(4,2),
    room_depth NUMERIC(4,2),
    budget NUMERIC(10,2),

    -- Selected equipment (nullable - user may not have purchased everything yet)
    launch_monitor_id INTEGER REFERENCES simulator_launch_monitors(id) ON DELETE SET NULL,
    projector_id INTEGER REFERENCES simulator_projectors(id) ON DELETE SET NULL,
    hitting_mat_id INTEGER REFERENCES simulator_hitting_mats(id) ON DELETE SET NULL,
    impact_screen_id INTEGER REFERENCES simulator_impact_screens(id) ON DELETE SET NULL,
    computer_id INTEGER REFERENCES simulator_computers(id) ON DELETE SET NULL,
    software_id INTEGER REFERENCES simulator_software(id) ON DELETE SET NULL,

    -- Metadata
    total_price NUMERIC(10,2),
    total_rating NUMERIC(10,2),
    notes TEXT, -- User notes about their setup
    is_purchased BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for configurations
CREATE INDEX IF NOT EXISTS idx_simulator_configs_user_id ON simulator_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulator_configs_created_at ON simulator_configurations(created_at);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger function for updated_at (reuse existing if available)
CREATE OR REPLACE FUNCTION update_simulator_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all simulator tables
CREATE TRIGGER update_launch_monitors_updated_at
    BEFORE UPDATE ON simulator_launch_monitors
    FOR EACH ROW EXECUTE FUNCTION update_simulator_updated_at_column();

CREATE TRIGGER update_projectors_updated_at
    BEFORE UPDATE ON simulator_projectors
    FOR EACH ROW EXECUTE FUNCTION update_simulator_updated_at_column();

CREATE TRIGGER update_hitting_mats_updated_at
    BEFORE UPDATE ON simulator_hitting_mats
    FOR EACH ROW EXECUTE FUNCTION update_simulator_updated_at_column();

CREATE TRIGGER update_impact_screens_updated_at
    BEFORE UPDATE ON simulator_impact_screens
    FOR EACH ROW EXECUTE FUNCTION update_simulator_updated_at_column();

CREATE TRIGGER update_computers_updated_at
    BEFORE UPDATE ON simulator_computers
    FOR EACH ROW EXECUTE FUNCTION update_simulator_updated_at_column();

CREATE TRIGGER update_software_updated_at
    BEFORE UPDATE ON simulator_software
    FOR EACH ROW EXECUTE FUNCTION update_simulator_updated_at_column();

CREATE TRIGGER update_simulator_configs_updated_at
    BEFORE UPDATE ON simulator_configurations
    FOR EACH ROW EXECUTE FUNCTION update_simulator_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE simulator_launch_monitors IS 'Golf simulator launch monitor equipment with room requirements and quality ratings';
COMMENT ON TABLE simulator_projectors IS 'Projector equipment for golf simulators with throw ratios and brightness specs';
COMMENT ON TABLE simulator_hitting_mats IS 'Golf hitting mats with quality ratings for realism and durability';
COMMENT ON TABLE simulator_impact_screens IS 'Impact screens for golf simulators with size and material specifications';
COMMENT ON TABLE simulator_computers IS 'Computer systems for running golf simulator software';
COMMENT ON TABLE simulator_software IS 'Golf simulation software packages with pricing and feature details';
COMMENT ON TABLE simulator_configurations IS 'Saved golf simulator setups created by users';
