-- Migration 051: Add shots_per_group column to weekly_challenges
-- Allows admins to override the default shots per group per challenge

ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS shots_per_group INTEGER;

COMMENT ON COLUMN weekly_challenges.shots_per_group IS 'Override shots per group for this challenge. If NULL, uses shots_per_group from challenge_types';

-- Set existing challenges to use their challenge type's default
UPDATE weekly_challenges wc
SET shots_per_group = ct.shots_per_group
FROM challenge_types ct
WHERE wc.challenge_type_id = ct.id
  AND wc.shots_per_group IS NULL;

-- Verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_challenges' AND column_name = 'shots_per_group'
    ) THEN
        RAISE EXCEPTION 'Column shots_per_group not added to weekly_challenges';
    END IF;

    RAISE NOTICE 'Migration 051 completed successfully!';
END $$;
