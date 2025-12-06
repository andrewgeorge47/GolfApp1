-- Migration 031: Simulator Course Availability Tracking
-- Tracks which courses are installed/synced at each simulator location

-- ============================================================================
-- CREATE SIMULATOR_COURSE_AVAILABILITY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS simulator_course_availability (
    id SERIAL PRIMARY KEY,
    sim_id VARCHAR(100) NOT NULL REFERENCES simulator_api_keys(sim_id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES simulator_courses_combined(id) ON DELETE CASCADE,

    -- Tracking
    first_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hole_details_synced BOOLEAN DEFAULT FALSE,

    -- Status
    is_available BOOLEAN DEFAULT TRUE,

    -- Metadata
    gspro_course_name VARCHAR(255), -- Actual filename in GSPro
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure each course is only listed once per simulator
    UNIQUE(sim_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sim_course_avail_sim ON simulator_course_availability(sim_id);
CREATE INDEX IF NOT EXISTS idx_sim_course_avail_course ON simulator_course_availability(course_id);
CREATE INDEX IF NOT EXISTS idx_sim_course_avail_available ON simulator_course_availability(sim_id, is_available) WHERE is_available = TRUE;

-- Comments
COMMENT ON TABLE simulator_course_availability IS 'Tracks which courses are installed and available at each simulator location';
COMMENT ON COLUMN simulator_course_availability.sim_id IS 'Which simulator has this course';
COMMENT ON COLUMN simulator_course_availability.course_id IS 'Which course is available';
COMMENT ON COLUMN simulator_course_availability.hole_details_synced IS 'TRUE if detailed tee/pin data has been synced from .gspcrse file';
COMMENT ON COLUMN simulator_course_availability.is_available IS 'FALSE if course was removed from GSPro';
COMMENT ON COLUMN simulator_course_availability.gspro_course_name IS 'Actual course filename in GSPro directory';

-- ============================================================================
-- UPDATE EXISTING CTP ENDPOINTS QUERY
-- ============================================================================

-- Modify the GET /api/courses/ctp-eligible endpoint to filter by simulator
-- This will be done in the application code, but we can create a helper view

CREATE OR REPLACE VIEW ctp_courses_by_simulator AS
SELECT
    sca.sim_id,
    sc.id as course_id,
    sc.name as course_name,
    sc.location,
    sc.designer,
    sc.par_values,
    CASE
        WHEN sc.hole_details IS NOT NULL AND jsonb_array_length(sc.hole_details) > 0
        THEN TRUE
        ELSE FALSE
    END as has_hole_details,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(sc.par_values) AS p(value)
        WHERE (p.value)::text::int = 3
    ) as par3_hole_count,
    (
        SELECT array_agg((idx + 1)::int ORDER BY idx)
        FROM jsonb_array_elements(sc.par_values) WITH ORDINALITY arr(value, idx)
        WHERE (arr.value)::text::int = 3
    ) as par3_hole_numbers,
    sca.last_synced_at,
    sca.hole_details_synced,
    sca.gspro_course_name
FROM simulator_course_availability sca
JOIN simulator_courses_combined sc ON sc.id = sca.course_id
WHERE sca.is_available = TRUE
ORDER BY sc.name;

COMMENT ON VIEW ctp_courses_by_simulator IS 'Shows all available CTP courses per simulator with sync status';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON simulator_course_availability TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE simulator_course_availability_id_seq TO PUBLIC;
GRANT SELECT ON ctp_courses_by_simulator TO PUBLIC;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'simulator_course_availability'
    ) THEN
        RAISE EXCEPTION 'Table simulator_course_availability not created';
    END IF;

    RAISE NOTICE 'Migration 031 completed successfully!';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT
    'Migration 031: Simulator Course Availability' as migration,
    'SUCCESS' as status,
    '1 new table created (simulator_course_availability)' as tables_created,
    '1 view created (ctp_courses_by_simulator)' as views_created;
