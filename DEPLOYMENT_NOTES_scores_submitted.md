# Deployment Notes: Two-Flag Lineup System

## Summary
This deployment adds a new `scores_submitted` column to properly distinguish between:
1. **Lineup finalized** (`is_finalized`) - Captain has saved their roster
2. **Scores submitted** (`scores_submitted`) - Actual scores entered after playing

## Pre-Deployment Verification ✅

### Database State (Verified 2026-01-21)
```
Total lineups: 6
├─ Finalized lineups: 3 (is_finalized = true)
├─ With scores: 3 (scores_submitted = true)
└─ Auto-saved only: 3 (both flags false)
```

**All existing data verified correct:**
- ✅ All 3 lineups with scores properly marked as `scores_submitted = true`
- ✅ All 3 auto-saved lineups properly marked as both flags `false`
- ✅ No orphaned scores or incorrect states found

## Migration Impact: SAFE ✅

### What the Migration Does
1. Adds `scores_submitted` column (defaults to `false`)
2. Sets `scores_submitted = true` for 3 existing lineups that have actual scores
3. All other lineups remain `scores_submitted = false`

### Critical Systems Affected
1. **Weekly Division Leaderboard** - Now uses `scores_submitted` to award points
2. **Captain Dashboard** - Now uses `scores_submitted` to show "Scores submitted" badge
3. **League Admin Scores Tab** - Already fixed to use `scores_submitted`

### What WON'T Break
- ✅ Existing saved lineups will still work (is_finalized preserved)
- ✅ Existing submitted scores will still count in standings (migration marked them)
- ✅ Captains can still edit and submit scores normally
- ✅ No data loss or corruption

## Deployment Steps

1. **Push Code Changes**
   - Backend: server.js updated endpoints
   - Frontend: ImprovedLineupSelector.tsx, LeagueScoresManager.tsx
   - Migration: 046_add_scores_submitted_to_lineups.sql

2. **Migration Already Run** ✅
   - Migration executed successfully on production database
   - UPDATE 3 rows (all scores properly marked)

3. **Post-Deployment Verification**
   ```bash
   # Verify column exists and data is correct
   psql $DATABASE_URL -c "
   SELECT
     COUNT(*) as total,
     SUM(CASE WHEN is_finalized THEN 1 ELSE 0 END) as finalized,
     SUM(CASE WHEN scores_submitted THEN 1 ELSE 0 END) as with_scores
   FROM league_lineups;
   "
   # Expected: total=6, finalized=3, with_scores=3
   ```

4. **Verify Key Features Work**
   - [ ] Captain can save lineup (should set is_finalized = true)
   - [ ] Captain can submit scores (should set scores_submitted = true)
   - [ ] Weekly leaderboard shows correct teams with points
   - [ ] Captain dashboard shows correct "Scores submitted" status
   - [ ] Admin can edit existing scores

## Rollback Plan

If issues occur, rollback file available: `046_rollback_scores_submitted.sql`

**Steps to rollback:**
1. Revert code changes (git revert)
2. Run rollback migration (merges flags back to single is_finalized)
3. Restart services

**Note:** Rollback will lose the distinction between lineup save and score submission, but no data will be lost.

## User Impact

### For Captains
- **Before**: Saving lineup showed "Scores submitted" prematurely
- **After**: Saving lineup shows action buttons, only submitting scores shows completion

### For Admins
- **Before**: Admin scores tab didn't load existing scores in edit mode
- **After**: Admin can properly edit submitted scores

### For Standings
- **Before**: Teams that only saved lineup (didn't play) could appear in leaderboard
- **After**: Only teams with actual submitted scores count in standings

## Files Changed

### Database
- `db/migrations/046_add_scores_submitted_to_lineups.sql` (NEW)
- `db/migrations/046_rollback_scores_submitted.sql` (NEW - rollback plan)

### Backend (server.js)
- Line 16469: Weekly leaderboard endpoint
- Line 17524: Captain dashboard endpoint
- Line 17898: Score submission endpoint
- Line 16257-16278: Admin scores endpoint (already fixed)

### Frontend
- `client/src/components/ImprovedLineupSelector.tsx`
  - Lines 154, 260: Lineup save logic
  - Lines 193-197: Load and check both flags
  - Line 1092: Show completion card only when scores_submitted

- `client/src/components/LeagueScoresManager.tsx`
  - Line 419: Fixed scheduleId passing for admin edit

## Testing Checklist

- [x] Database migration runs successfully
- [x] Existing scores properly marked
- [x] No orphaned or incorrect states
- [x] Frontend builds without errors
- [ ] Manual testing: Captain lineup flow
- [ ] Manual testing: Captain score submission
- [ ] Manual testing: Weekly leaderboard displays correctly
- [ ] Manual testing: Admin score editing works

## Risk Assessment: LOW RISK ✅

- Migration is non-destructive (only adds column)
- Existing data verified correct
- Rollback plan available
- All changes are additive (new flag, old flag preserved)
- No breaking changes to data structures
