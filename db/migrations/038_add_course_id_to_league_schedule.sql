-- Add course_id column to league_schedule table
-- This allows admins to assign a specific course for each week

ALTER TABLE league_schedule
ADD COLUMN IF NOT EXISTS course_id INTEGER;

-- Add foreign key constraint to simulator_courses_combined
ALTER TABLE league_schedule
ADD CONSTRAINT league_schedule_course_id_fkey
FOREIGN KEY (course_id)
REFERENCES simulator_courses_combined(id)
ON DELETE SET NULL;

-- Create index for faster course lookups
CREATE INDEX IF NOT EXISTS idx_league_schedule_course ON league_schedule(course_id);

-- Add comment to document the column
COMMENT ON COLUMN league_schedule.course_id IS 'References the simulator course assigned to this week';
