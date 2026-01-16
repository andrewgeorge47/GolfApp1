-- Migration: Add captain_override column to team_member_availability table
-- This allows captains to override player availability for lineup selection
-- without affecting the player's own availability submission

ALTER TABLE team_member_availability
ADD COLUMN IF NOT EXISTS captain_override BOOLEAN DEFAULT false;

COMMENT ON COLUMN team_member_availability.captain_override IS
'Boolean flag set by team captain to override player availability. When true, player can be added to lineup even if is_available is false or null.';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'team_member_availability' AND column_name = 'captain_override';
