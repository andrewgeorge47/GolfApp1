-- Migration 030: Add reup_fee column to weekly_challenges
-- Allows admins to override the default re-up fee per challenge

ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS reup_fee NUMERIC(10,2);

COMMENT ON COLUMN weekly_challenges.reup_fee IS 'Override re-up fee for this challenge. If NULL, uses default_reup_fee from challenge_types';

-- Set existing challenges to use their challenge type's default
UPDATE weekly_challenges wc
SET reup_fee = ct.default_reup_fee
FROM challenge_types ct
WHERE wc.challenge_type_id = ct.id
  AND wc.reup_fee IS NULL;

-- Verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_challenges' AND column_name = 'reup_fee'
    ) THEN
        RAISE EXCEPTION 'Column reup_fee not added to weekly_challenges';
    END IF;

    RAISE NOTICE 'Migration 030 completed successfully!';
END $$;
