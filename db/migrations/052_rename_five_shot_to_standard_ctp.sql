-- Migration 052: Rename Five-Shot Challenge to Standard CTP
-- Updates the challenge type name and description to be more generic

UPDATE challenge_types
SET
  type_name = 'Standard CTP',
  description = 'Weekly challenge with configurable shot groups. Compete for Closest-to-Pin and Hole-in-One jackpot.'
WHERE type_key = 'five_shot';

-- Verification
DO $$
DECLARE
  updated_name TEXT;
BEGIN
  SELECT type_name INTO updated_name
  FROM challenge_types
  WHERE type_key = 'five_shot';

  IF updated_name = 'Standard CTP' THEN
    RAISE NOTICE 'Migration 052 completed successfully! Challenge type renamed to Standard CTP';
  ELSE
    RAISE EXCEPTION 'Migration 052 failed - Challenge type not renamed';
  END IF;
END $$;
