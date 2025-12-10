-- Migration 032: Add challenge instructions, settings, and prize images
-- Allows admins to configure gameplay settings and add prize images

-- Add instructions field
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS instructions TEXT;

COMMENT ON COLUMN weekly_challenges.instructions IS 'General instructions or notes for the challenge';

-- Add platform settings
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT ARRAY['GSPro', 'Trackman'];

COMMENT ON COLUMN weekly_challenges.platforms IS 'Supported simulator platforms for this challenge';

-- Add GSPro settings
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS gspro_settings JSONB DEFAULT '{
  "pins": "Friday",
  "putting": "No Gimme",
  "elevation": "Course",
  "stimp": "11",
  "mulligan": "No",
  "gameplay": "Force Realistic",
  "fairway_firmness": "Normal",
  "green_firmness": "Normal",
  "wind": "None"
}'::jsonb;

COMMENT ON COLUMN weekly_challenges.gspro_settings IS 'GSPro-specific gameplay settings as JSON';

-- Add Trackman settings
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS trackman_settings JSONB DEFAULT '{
  "pins": "Medium",
  "putting": "No Gimme",
  "stimp": "11",
  "fairway_firmness": "Medium",
  "green_firmness": "Medium",
  "wind": "Calm"
}'::jsonb;

COMMENT ON COLUMN weekly_challenges.trackman_settings IS 'Trackman-specific gameplay settings as JSON';

-- Add prize image URLs
ALTER TABLE weekly_challenges
ADD COLUMN IF NOT EXISTS prize_1st_image_url TEXT,
ADD COLUMN IF NOT EXISTS prize_2nd_image_url TEXT,
ADD COLUMN IF NOT EXISTS prize_3rd_image_url TEXT;

COMMENT ON COLUMN weekly_challenges.prize_1st_image_url IS 'Image URL for 1st place prize';
COMMENT ON COLUMN weekly_challenges.prize_2nd_image_url IS 'Image URL for 2nd place prize';
COMMENT ON COLUMN weekly_challenges.prize_3rd_image_url IS 'Image URL for 3rd place prize';

-- Verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_challenges' AND column_name = 'instructions'
    ) THEN
        RAISE EXCEPTION 'Column instructions not added to weekly_challenges';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_challenges' AND column_name = 'platforms'
    ) THEN
        RAISE EXCEPTION 'Column platforms not added to weekly_challenges';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_challenges' AND column_name = 'gspro_settings'
    ) THEN
        RAISE EXCEPTION 'Column gspro_settings not added to weekly_challenges';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weekly_challenges' AND column_name = 'trackman_settings'
    ) THEN
        RAISE EXCEPTION 'Column trackman_settings not added to weekly_challenges';
    END IF;

    RAISE NOTICE 'Migration 032 completed successfully!';
END $$;
