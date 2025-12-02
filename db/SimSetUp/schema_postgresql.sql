-- PostgreSQL Schema for Golf Simulator Equipment Database
-- Created from SQLite migration

-- Launch Monitors Table
CREATE TABLE simulator_launch_monitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    technology VARCHAR(50),
    placement VARCHAR(50),
    min_ceiling_height DECIMAL(4,2),
    min_room_width DECIMAL(4,2),
    min_room_depth DECIMAL(4,2),
    distance_from_screen DECIMAL(4,2),
    purchase_url TEXT,
    rating DECIMAL(4,2),
    score DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projectors Table
CREATE TABLE simulator_projectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    throw_ratio DECIMAL(4,2),
    max_image_size INTEGER,
    brightness INTEGER,
    purchase_url TEXT,
    light_source VARCHAR(100),
    resolution VARCHAR(50),
    lumens VARCHAR(50),
    achievable_aspect_ratio VARCHAR(50),
    rating DECIMAL(4,2),
    score DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hitting Mats Table
CREATE TABLE simulator_hitting_mats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    dimensions VARCHAR(100),
    features TEXT,
    realistic_feel DECIMAL(4,2),
    shock_absorption DECIMAL(4,2),
    durability DECIMAL(4,2),
    sliding DECIMAL(4,2),
    use_on_concrete DECIMAL(4,2),
    quality_metric DECIMAL(4,2),
    rating DECIMAL(4,2),
    purchase_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_launch_monitors_price ON simulator_launch_monitors(price);
CREATE INDEX idx_launch_monitors_ceiling ON simulator_launch_monitors(min_ceiling_height);
CREATE INDEX idx_launch_monitors_room_dims ON simulator_launch_monitors(min_room_width, min_room_depth);

CREATE INDEX idx_projectors_price ON simulator_projectors(price);

CREATE INDEX idx_hitting_mats_price ON simulator_hitting_mats(price);
CREATE INDEX idx_hitting_mats_rating ON simulator_hitting_mats(rating);

-- Updated_at trigger function (PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_launch_monitors_updated_at BEFORE UPDATE ON simulator_launch_monitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projectors_updated_at BEFORE UPDATE ON simulator_projectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hitting_mats_updated_at BEFORE UPDATE ON simulator_hitting_mats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
