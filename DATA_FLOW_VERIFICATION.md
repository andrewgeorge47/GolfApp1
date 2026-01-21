# Data Flow Verification: Standings Display

## Summary ✅
DivisionLeaderboard component is correctly using endpoints that read from the updated standings calculation.

## Data Flow Path

### 1. Admin Calculates Standings
```
Admin clicks "Calculate Standings" button
  ↓
POST /api/leagues/:leagueId/calculate-standings
  ↓
calculateDivisionLeagueStandings(leagueId)
  ↓
Updates tournament_teams table:
  - league_points (sum of weekly points)
  - aggregate_net_score (sum of weekly net scores)
```

### 2. Frontend Requests Standings

#### Season View (What DivisionLeaderboard uses):
```
DivisionLeaderboard.tsx
  ↓
getLeagueStandings(leagueId) API call
  ↓
GET /api/leagues/:leagueId/standings
  ↓
Queries league_standings VIEW
  ↓
VIEW reads from tournament_teams:
  - tt.league_points (line 24)
  - tt.aggregate_net_score (line 25)
  - Applies tiebreakers (lines 30-37)
  ↓
Returns divisions with teams sorted by:
  1. league_points DESC
  2. aggregate_net_score ASC
  ↓
Displayed in DivisionLeaderboard Season table
```

#### Weekly View (What DivisionLeaderboard uses):
```
DivisionLeaderboard.tsx
  ↓
getDivisionWeeklyLeaderboard(leagueId, divisionId, weekNumber)
  ↓
GET /api/leagues/:leagueId/divisions/:divisionId/leaderboard/:weekNumber
  ↓
Queries for week's scores:
  - Checks ll.scores_submitted = true (UPDATED)
  - Calculates net_total from scores
  - Awards weekly_points (1st=3, 2nd=2, 3rd=1)
  ↓
Returns teams sorted by net score
  ↓
Displayed in DivisionLeaderboard Weekly table
```

## Verification Checklist ✅

### Database Layer
- [x] `tournament_teams.league_points` field exists
- [x] `tournament_teams.aggregate_net_score` field exists
- [x] `league_standings` VIEW reads from `tournament_teams` (lines 24-25)
- [x] Tiebreaker logic uses these fields (lines 33-34)

### Backend Layer
- [x] `calculateDivisionLeagueStandings()` updates `tournament_teams` (server.js:16858-16863)
- [x] `/api/leagues/:leagueId/standings` queries `league_standings` VIEW (server.js:15604)
- [x] `/api/leagues/:leagueId/divisions/:divisionId/leaderboard/:weekNumber` uses `scores_submitted` flag (server.js:16469)
- [x] Admin endpoint exists: `POST /api/leagues/:leagueId/calculate-standings` (server.js:16710)

### Frontend Layer
- [x] `DivisionLeaderboard.tsx` uses `getLeagueStandings()` for season view (line 41)
- [x] `DivisionLeaderboard.tsx` uses `getDivisionWeeklyLeaderboard()` for weekly view (line 36)
- [x] Season table displays `total_points` (line 357)
- [x] Season table displays `aggregate_net_score` (line 362)
- [x] W-T-L column removed (no longer displayed)

### Admin UI Layer
- [x] "Calculate Standings" button exists in LeagueAdminPanel (line 206-213)
- [x] Button calls correct endpoint (line 142)
- [x] Shows success message with teams updated count (line 156)

## How to Verify It's Working

1. **Admin calculates standings**:
   - Go to League Admin Panel
   - Click "Calculate Standings"
   - Should see: "Standings calculated successfully! X teams updated"

2. **Check database was updated**:
   ```sql
   SELECT id, name, league_points, aggregate_net_score
   FROM tournament_teams
   WHERE league_id = <league_id>;
   ```
   Should show non-zero values for teams with submitted scores

3. **View standings in UI**:
   - Captain Dashboard > Standings Tab > Season View
   - Player Team View > Standings Tab > Season View
   - Should see correct Total Points and Aggregate Net values
   - Should NOT see W-T-L column

4. **Weekly leaderboard**:
   - Should show teams that submitted scores
   - Should award 3/2/1 points based on rank
   - Should blur scores if viewing team hasn't submitted

## Key Database Fields

### tournament_teams table
```sql
league_points INTEGER          -- Sum of all weekly points (admin calculated)
aggregate_net_score INTEGER    -- Sum of all weekly net scores (admin calculated)
second_half_net_score INTEGER  -- For future tiebreaker use
final_week_net_score INTEGER   -- For future tiebreaker use
```

### league_lineups table
```sql
is_finalized BOOLEAN           -- Lineup has been saved by captain
scores_submitted BOOLEAN       -- Actual scores entered after playing (NEW)
```

## What Updates Each Field

| Field | Updated By | When |
|-------|-----------|------|
| `league_points` | `calculateDivisionLeagueStandings()` | Admin clicks Calculate |
| `aggregate_net_score` | `calculateDivisionLeagueStandings()` | Admin clicks Calculate |
| `is_finalized` | Captain saves lineup | When clicking "Save Lineup" |
| `scores_submitted` | Score submission endpoint | When scores submitted |

## Important Notes

1. **league_points and aggregate_net_score are NOT automatically updated**
   - Must be manually calculated by admin
   - Or could add automation in future

2. **league_standings VIEW is read-only**
   - Reflects current state of tournament_teams
   - Applies tiebreaker logic on-the-fly
   - Used by all standings displays

3. **Weekly leaderboard is calculated on-demand**
   - Not stored, calculated from raw scores
   - Always shows current week's results
   - Awards points but doesn't store them (Calculate Standings does that)

4. **Two separate concepts**:
   - **Weekly Leaderboard**: Shows results for one week (dynamic)
   - **Season Standings**: Shows accumulated totals (updated by admin)

## Testing Recommendations

1. Have 3+ teams submit scores for week 1
2. Admin clicks "Calculate Standings"
3. Check tournament_teams shows points
4. Check standings displays correctly
5. Teams submit week 2 scores
6. Admin clicks "Calculate Standings" again
7. Verify points accumulate correctly
