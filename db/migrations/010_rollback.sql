-- Rollback: Remove enhanced columns from trackman_courses

ALTER TABLE trackman_courses
    DROP COLUMN IF EXISTS location,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS platform_version,
    DROP COLUMN IF EXISTS release_month,
    DROP COLUMN IF EXISTS is_championship,
    DROP COLUMN IF EXISTS is_links,
    DROP COLUMN IF EXISTS is_par3,
    DROP COLUMN IF EXISTS is_resort,
    DROP COLUMN IF EXISTS is_country_club,
    DROP COLUMN IF EXISTS is_major_venue,
    DROP COLUMN IF EXISTS holes,
    DROP COLUMN IF EXISTS updated_at;

ALTER TABLE trackman_courses
    DROP CONSTRAINT IF EXISTS trackman_courses_name_unique;

DROP INDEX IF EXISTS idx_trackman_courses_country;
DROP INDEX IF EXISTS idx_trackman_courses_platform;
DROP INDEX IF EXISTS idx_trackman_courses_location;
