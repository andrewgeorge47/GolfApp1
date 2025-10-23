# Duplicate Matches Issue - Fix Guide

## Problem Description

The weekly scoring system was creating duplicate matches when:
1. The first 3 players submit scores (creates matches correctly)
2. A 4th player submits scores later (triggers recalculation)
3. The system recalculates matches for all possible week dates
4. This creates duplicate matches for the first 3 players

## Root Cause

The issue was caused by two main problems in the weekly scoring system:

### 1. Incorrect Tournament Week Start Date Calculation

The `getWeekStartFromDate()` function was incorrectly calculating the Monday of the week:
- **Tournament dates**: `2025-08-10` to `2025-08-16` (Sunday to Saturday)
- **Incorrect calculation**: Set `week_start_date` to `2025-08-04` (Monday of previous week)
- **Should be**: `2025-08-11` (Monday of tournament week)

This caused players to submit scores with different week references, leading to duplicate matches.

### 2. Over-processing in calculateWeeklyMatches Function

The `calculateWeeklyMatches` function was also problematic:
- **Date Handling**: Used `getPossibleWeekStartDates()` which returned all distinct week start dates from the database
- **Over-processing**: When recalculating, it processed scorecards from ALL dates instead of just the specific week
- **Cache Issues**: The caching mechanism wasn't properly preventing duplicate calculations

## Fixes Applied

### 1. Fixed Tournament Week Start Date Calculation

- **Corrected Logic**: Fixed `getWeekStartFromDate()` to properly calculate Monday of the tournament week
- **Weekend Handling**: For tournaments starting on Saturday/Sunday, now correctly calculates Monday of the NEXT week
- **Consistent References**: All players in a tournament now use the same week reference

### 2. Fixed `calculateWeeklyMatches` Function

- **Limited Scope**: Now only processes scorecards for the specific `week_start_date` parameter
- **Removed Multi-date Processing**: No longer uses `getPossibleWeekStartDates()` for match calculation
- **Better Conflict Resolution**: Improved the `ON CONFLICT` clause in the INSERT statement

### 3. Improved Scorecard Submission

- **Consistent Week Dates**: Always uses the tournament's `week_start_date` instead of allowing client-provided dates
- **Prevents Date Mismatches**: Ensures all players in the same tournament use the same week reference

### 4. Added Cleanup and Fix Tools

- **Cleanup Endpoint**: `POST /api/tournaments/:id/cleanup-duplicates`
- **Week Date Fix Endpoint**: `POST /api/tournaments/:id/fix-week-date`
- **Standalone Scripts**: 
  - `cleanup_duplicate_matches.js` - Clean up duplicate matches
  - `fix_tournament_week_dates.js` - Fix incorrect tournament week dates
- **Database Constraints**: `prevent_duplicate_matches.sql`

## How to Fix Existing Issues

### Step 1: Fix Tournament Week Start Dates

**Option A: Use the API Endpoint**
```bash
curl -X POST http://localhost:3000/api/tournaments/19/fix-week-date
```

**Option B: Use the Standalone Script**
```bash
# Install dependencies if needed
npm install pg

# Run the week date fix script
node fix_tournament_week_dates.js
```

### Step 2: Clean Up Duplicate Matches

**Option A: Use the API Endpoint**
```bash
curl -X POST http://localhost:3000/api/tournaments/19/cleanup-duplicates
```

**Option B: Use the Standalone Script**
```bash
# Run the cleanup script
node cleanup_duplicate_matches.js 19
```

### Step 3: Add Database Constraints (Optional)

```bash
# Connect to your database and run:
psql -d your_database_name -f prevent_duplicate_matches.sql
```

## Prevention Measures

### 1. Database Constraints

The SQL script adds:
- Unique constraint on `(tournament_id, week_start_date, player1_id, player2_id)`
- Check constraint ensuring `player1_id < player2_id`
- Index for better performance

### 2. Code Improvements

- Better caching mechanism
- Strict date handling
- Improved conflict resolution

### 3. Monitoring

- Added logging for duplicate match attempts
- Cache invalidation on errors
- Better error handling

## Testing the Fix

1. **Clean up existing duplicates** using one of the methods above
2. **Submit new scorecards** to verify no duplicates are created
3. **Check the logs** for any duplicate match attempts
4. **Verify the leaderboard** shows correct match counts

## Files Modified

- `server.js` - Fixed `calculateWeeklyMatches` function, scorecard submission, and `getWeekStartFromDate` function
- `cleanup_duplicate_matches.js` - Standalone cleanup script
- `fix_tournament_week_dates.js` - Script to fix incorrect tournament week dates
- `prevent_duplicate_matches.sql` - Database constraints and triggers

## API Endpoints Added

- `POST /api/tournaments/:id/cleanup-duplicates` - Clean up existing duplicates
- `POST /api/tournaments/:id/fix-week-date` - Fix incorrect tournament week start date

## Important Notes

- **Always backup your database** before running cleanup scripts
- **Run cleanup during low-traffic periods** to minimize impact
- **Test the fix** with a small tournament first
- **Monitor logs** for any new duplicate attempts

## Future Prevention

The system now:
- Uses consistent week dates for all players in a tournament
- Processes only the specific week when calculating matches
- Has database-level constraints to prevent duplicates
- Includes better caching and error handling 