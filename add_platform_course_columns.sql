-- Add platform-specific course columns to tournaments table
-- This migration adds support for separate GSPro and Trackman course selections

-- Add GSPro course columns
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS gspro_course character varying(255),
ADD COLUMN IF NOT EXISTS gspro_course_id integer;

-- Add Trackman course columns  
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS trackman_course character varying(255),
ADD COLUMN IF NOT EXISTS trackman_course_id integer;

-- Add foreign key constraints to reference the simulator_courses_combined table
-- Note: These are optional and can be added later if needed for data integrity
-- ALTER TABLE tournaments 
-- ADD CONSTRAINT fk_tournaments_gspro_course 
-- FOREIGN KEY (gspro_course_id) REFERENCES simulator_courses_combined(id);

-- ALTER TABLE tournaments 
-- ADD CONSTRAINT fk_tournaments_trackman_course 
-- FOREIGN KEY (trackman_course_id) REFERENCES simulator_courses_combined(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_gspro_course_id ON tournaments(gspro_course_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_trackman_course_id ON tournaments(trackman_course_id);

-- Add comments to document the new columns
COMMENT ON COLUMN tournaments.gspro_course IS 'Name of the selected GSPro course for this tournament';
COMMENT ON COLUMN tournaments.gspro_course_id IS 'ID of the selected GSPro course from simulator_courses_combined table';
COMMENT ON COLUMN tournaments.trackman_course IS 'Name of the selected Trackman course for this tournament';
COMMENT ON COLUMN tournaments.trackman_course_id IS 'ID of the selected Trackman course from simulator_courses_combined table';

