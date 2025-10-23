# Tournament Week Date Fix - Complete Solution

## Problem Summary

Your tournament with dates `2025-08-10` to `2025-08-16` (Sunday to Saturday) was incorrectly setting `week_start_date` to `2025-08-04` (Monday of the previous week). This caused:

1. **Date Mismatches**: Players submitting scores with different week references
2. **Duplicate Matches**: System creating matches for different "weeks" 
3. **Inconsistent Leaderboards**: Scores appearing in wrong periods

## Root Cause Analysis

### The `getWeekStartFromDate()` Function Bug

**Before (Incorrect):**
```javascript
// For Sunday (day === 0), it was doing:
diff = date.getDate() - day + (-6)  // Going BACK 6 days to previous Monday
// Result: 2025-08-10 (Sunday) → 2025-08-04 (Previous Monday) ❌
```

**After (Correct):**
```javascript
// For Sunday (day === 0), now does:
diff = 1  // Going FORWARD 1 day to next Monday
// Result: 2025-08-10 (Sunday) → 2025-08-11 (Next Monday) ✅
```

### The Logic Now

- **Saturday start**: Go forward 2 days to next Monday
- **Sunday start**: Go forward 1 day to next Monday  
- **Monday-Friday start**: Go back to Monday of current week

## Complete Fix Applied

### 1. Fixed Core Function
- ✅ Corrected `getWeekStartFromDate()` in `server.js`
- ✅ Now properly calculates Monday of tournament week

### 2. Fixed Match Calculation
- ✅ Limited `calculateWeeklyMatches()` to specific week only
- ✅ Removed multi-date processing that caused duplicates

### 3. Added Fix Tools
- ✅ API endpoint: `POST /api/tournaments/:id/fix-week-date`
- ✅ Script: `fix_tournament_week_dates.js`
- ✅ Cleanup endpoint: `POST /api/tournaments/:id/cleanup-duplicates`

## How to Fix Your Tournament

### Step 1: Fix the Week Start Date

```bash
# Option A: API endpoint
curl -X POST http://localhost:3000/api/tournaments/19/fix-week-date

# Option B: Script
node fix_tournament_week_dates.js
```

**Expected Result:**
- Current: `week_start_date = 2025-08-04` ❌
- Fixed: `week_start_date = 2025-08-11` ✅

### Step 2: Clean Up Duplicate Matches

```bash
# Clean up any duplicates created by the date mismatch
curl -X POST http://localhost:3000/api/tournaments/19/cleanup-duplicates
```

### Step 3: Verify the Fix

1. **Check tournament dates**: Should now show `2025-08-11` as week start
2. **Submit new scores**: Should create matches for the correct week
3. **Check leaderboard**: Should show consistent match counts

## What This Prevents

- ✅ **No more date mismatches** between players
- ✅ **No more duplicate matches** when new players join
- ✅ **Consistent week references** across all tournament data
- ✅ **Proper match calculations** for the actual tournament period

## Testing the Fix

1. **Fix the week date** using one of the methods above
2. **Submit a test scorecard** to verify matches are created correctly
3. **Check the logs** to confirm the correct week is being used
4. **Verify leaderboard** shows the expected results

## Future Prevention

- ✅ **Correct week calculation** for all new tournaments
- ✅ **Database constraints** prevent duplicate matches
- ✅ **Better error handling** and logging
- ✅ **Consistent date handling** across the system

## Files to Check

- `server.js` - Core fixes applied
- `fix_tournament_week_dates.js` - Script to fix existing tournaments
- `cleanup_duplicate_matches.js` - Script to clean up duplicates
- `DUPLICATE_MATCHES_FIX.md` - Complete documentation

## Important Notes

- **Backup your database** before running fixes
- **Fix week dates first**, then clean up duplicates
- **Test with a small tournament** before applying to production
- **Monitor logs** for any new issues

The fix ensures that your tournament with dates `2025-08-10` to `2025-08-16` will now correctly use `2025-08-11` (Monday) as the week start date, preventing the duplicate match issues you were experiencing. 