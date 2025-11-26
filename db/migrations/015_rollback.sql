-- Rollback: Five-Shot Challenge System
-- Date: 2025-11-19

-- Drop views first
DROP VIEW IF EXISTS challenge_hole_in_ones;
DROP VIEW IF EXISTS challenge_user_best_shots;

-- Remove columns from weekly_challenges
ALTER TABLE weekly_challenges DROP COLUMN IF EXISTS challenge_type_id;
ALTER TABLE weekly_challenges DROP COLUMN IF EXISTS course_id;
ALTER TABLE weekly_challenges DROP COLUMN IF EXISTS required_distance_yards;
ALTER TABLE weekly_challenges DROP COLUMN IF EXISTS hio_jackpot_amount;
ALTER TABLE weekly_challenges DROP COLUMN IF EXISTS admin_fee_collected;
ALTER TABLE weekly_challenges DROP COLUMN IF EXISTS ctp_pot_amount;

-- Remove columns from weekly_challenge_entries
ALTER TABLE weekly_challenge_entries DROP COLUMN IF EXISTS groups_purchased;
ALTER TABLE weekly_challenge_entries DROP COLUMN IF EXISTS total_paid;

-- Drop new tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS challenge_shots;
DROP TABLE IF EXISTS challenge_shot_groups;
DROP TABLE IF EXISTS challenge_payments;
DROP TABLE IF EXISTS challenge_hio_jackpot;
DROP TABLE IF EXISTS challenge_types;

SELECT 'Rollback complete' as status;
