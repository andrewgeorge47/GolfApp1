-- Migration: Add hole assignments and back 9 order to league_lineups

ALTER TABLE league_lineups
ADD COLUMN IF NOT EXISTS hole_assignments JSONB,
ADD COLUMN IF NOT EXISTS back9_player_order JSONB,
ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;

COMMENT ON COLUMN league_lineups.hole_assignments IS 'JSON mapping of holes (1-9) to player IDs for individual play';
COMMENT ON COLUMN league_lineups.back9_player_order IS 'JSON array of player IDs in teeing order for back 9 alternate shot';
COMMENT ON COLUMN league_lineups.is_finalized IS 'Whether the lineup has been finalized/saved by the captain';
