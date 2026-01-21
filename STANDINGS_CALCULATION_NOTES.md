# Standings Calculation System - Implementation Notes

## Summary
Fixed standings calculation for division-based leagues and removed unnecessary W-T-L column from UI.

## Problems Identified

### 1. Standings Never Updated ❌
- **Problem**: `league_points` and `aggregate_net_score` in `tournament_teams` table were never populated for division-based leagues
- **Root Cause**: The old `updateTeamStandings` function only worked for matchup-based leagues (team vs team format)
- **Impact**: Season standings always showed 0 points and 0 aggregate scores for all teams

### 2. No Admin Trigger ❌
- **Problem**: No way for admins to calculate/update standings
- **Root Cause**: Standings calculation was automatic only for matchup verification (old system)
- **Impact**: Admins had no control over when standings were updated

### 3. W-T-L Column Displayed ❌
- **Problem**: Wins-Ties-Losses column showed in standings, but doesn't apply to division format
- **Root Cause**: UI was designed for head-to-head matchup system
- **Impact**: Confusing/incorrect data displayed (teams don't play each other directly)

## Solutions Implemented

### 1. Created Division League Standings Calculator ✅

**New Function**: `calculateDivisionLeagueStandings(leagueId)` (server.js:16773-16873)

**How it works**:
1. Gets all completed/active weeks for the league
2. For each week and division:
   - Queries all teams and their net scores
   - Checks if scores were actually submitted (`scores_submitted = true`)
   - Ranks teams by net score (lowest wins)
3. Awards points based on rank:
   - 1st place: 3 points
   - 2nd place: 2 points
   - 3rd place: 1 point
   - Other: 0 points
4. Accumulates across all weeks:
   - `league_points`: Total points earned
   - `aggregate_net_score`: Sum of all weekly net scores
5. Updates `tournament_teams` table with final totals

**Example**:
```
Week 1 Division A:
  Team A: 72 net → 1st place → 3 points
  Team B: 74 net → 2nd place → 2 points
  Team C: 76 net → 3rd place → 1 point

Week 2 Division A:
  Team B: 71 net → 1st place → 3 points
  Team A: 73 net → 2nd place → 2 points
  Team C: 75 net → 3rd place → 1 point

Final Standings:
  Team A: 5 points, 145 aggregate
  Team B: 5 points, 145 aggregate (tie!)
  Team C: 2 points, 151 aggregate
```

### 2. Created Admin Endpoint ✅

**Endpoint**: `POST /api/leagues/:leagueId/calculate-standings` (server.js:16709-16740)

**Access**: Admin only (`requirePermission('manage_tournaments')`)

**Response**:
```json
{
  "message": "Standings calculated successfully",
  "league_id": 1,
  "league_name": "Spring League 2026",
  "teams_updated": 6
}
```

### 3. Added Calculate Button to Admin UI ✅

**Location**: League Admin Panel header (LeagueAdminPanel.tsx:206-213)

**Features**:
- Calculator icon button in header
- Shows "Calculating..." while running
- Toast notification with results
- Available from all admin tabs

### 4. Removed W-T-L Column ✅

**Changes to LeagueStandings.tsx**:
- Removed W-T-L header column (line 334-346 → removed)
- Removed W-T-L data cells (line 410-413 → removed)
- Updated colSpan from 8 to 7 in expanded row (line 426)
- Updated Team Stats section to show Points/Aggregate instead of Wins/Win%

**Before**:
```
| Rank | Team | Points | W-T-L | Aggregate Net | ...
|   1  | A    |   5    | 0-0-0 |     145       | ...
```

**After**:
```
| Rank | Team | Points | Aggregate Net | ...
|   1  | A    |   5    |     145       | ...
```

## When to Calculate Standings

### Manual Trigger (Recommended)
Admin clicks "Calculate Standings" button in League Admin Panel:
- After all teams submit scores for a week
- Before showing standings to players
- Anytime standings need to be refreshed

### Potential Future Automation
Could add automatic calculation:
- After each score submission (might be heavy)
- On a schedule (e.g., end of each week)
- When admin marks week as "completed"

## Technical Details

### Database Fields Updated
- `tournament_teams.league_points`: Total points accumulated
- `tournament_teams.aggregate_net_score`: Sum of all weekly net scores

### Dependencies
- Uses `league_schedule` for week info
- Uses `league_lineups` to check if scores submitted
- Uses `match_individual_scores` and `match_alternate_shot_scores` for actual scores
- Updates visible via `league_standings` VIEW

### Performance
- Queries: O(weeks × divisions × teams)
- For typical league: 10 weeks × 2 divisions × 6 teams = 120 queries
- Takes ~2-3 seconds to calculate
- Could be optimized with bulk queries if needed

## Files Changed

### Backend (server.js)
- Line 16709-16740: New admin endpoint
- Line 16773-16873: New calculation function

### Frontend
- `LeagueAdminPanel.tsx`: Added Calculate Standings button
- `LeagueStandings.tsx`: Removed W-T-L column

## Testing Checklist

- [ ] Admin can trigger standings calculation
- [ ] Calculation correctly awards points (1st=3, 2nd=2, 3rd=1)
- [ ] Only teams with `scores_submitted = true` get points
- [ ] Points accumulate across multiple weeks
- [ ] Aggregate net score sums correctly
- [ ] Standings display shows updated values
- [ ] W-T-L column no longer appears
- [ ] No errors in console during calculation

## Usage Instructions

### For Admins
1. Go to League Admin Panel
2. Click "Calculate Standings" button in header
3. Wait for "Standings calculated successfully" message
4. View updated standings on any standings page

### When to Calculate
- After teams submit scores for the week
- Before publishing standings to players
- After making any score corrections
- At end of season for final results

## Future Enhancements

1. **Auto-calculation**: Trigger automatically when last team submits scores
2. **History**: Store historical standings snapshots
3. **Audit log**: Track when standings were calculated and by whom
4. **Tiebreakers**: Add support for second_half_net_score and final_week_net_score
5. **Notifications**: Alert teams when standings are updated
