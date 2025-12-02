-- Rollback Migration: Golf Simulator Recommendation System
-- Date: 2025-11-26
-- Description: Removes all simulator-related tables and functions

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS simulator_configurations CASCADE;
DROP TABLE IF EXISTS simulator_software CASCADE;
DROP TABLE IF EXISTS simulator_computers CASCADE;
DROP TABLE IF EXISTS simulator_impact_screens CASCADE;
DROP TABLE IF EXISTS simulator_hitting_mats CASCADE;
DROP TABLE IF EXISTS simulator_projectors CASCADE;
DROP TABLE IF EXISTS simulator_launch_monitors CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_simulator_updated_at_column() CASCADE;

-- Note: This will permanently delete all simulator equipment data and user configurations
