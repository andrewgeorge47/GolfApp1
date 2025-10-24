# Phase 6: Leaderboards & Standings API Documentation

## Overview
This document describes the leaderboards and standings endpoints for the UAL league system, including team and player statistics with comprehensive tiebreaker logic.

**Tiebreaker Priority**:
1. **Total Points** (most wins)
2. **Lowest Aggregate Net Score** (cumulative net for all matches)
3. **Lowest Second Half Aggregate Net** (second half of season)
4. **Lowest Final Week Net Score**
5. **Coin Flip** (admin determines)

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/leagues/:id/standings` | Overall league standings (all divisions) | No |
| GET | `/api/leagues/:id/standings/division/:divId` | Division-specific standings | No |
| GET | `/api/leagues/:id/standings/tiebreakers` | Show tiebreaker details | No |
| GET | `/api/teams/:teamId/stats` | Team statistics | No |
| GET | `/api/teams/:teamId/matches` | Team match history | No |
| GET | `/api/leagues/:id/player-stats/:userId` | Player performance within league | No |

---

## 1. Overall League Standings

**Endpoint**: `GET /api/leagues/:id/standings`

**Description**: Retrieve complete league standings for all divisions with tiebreaker application and playoff qualification status

**Authentication**: Not required

**Query Parameters**:
- `include_stats` (optional): Set to `"true"` to include recent form (last 5 matches)

**Response** (200 OK):
```json
{
  "league": {
    "id": 1,
    "name": "UAL Season 2 Winter 2025",
    "season": "Winter 2025",
    "playoff_format": "top_per_division",
    "divisions_count": 2,
    ...
  },
  "standings": [
    {
      "league_id": 1,
      "division_id": 1,
      "division_name": "Division A",
      "team_id": 10,
      "team_name": "Team Alpha",
      "captain_id": 45,
      "captain_name": "John Doe",
      "matches_played": 8,
      "wins": 5,
      "ties": 1,
      "losses": 2,
      "total_points": 11.5,
      "league_points": 11.5,
      "aggregate_net_score": 145,
      "second_half_net_score": 72,
      "final_week_net_score": 36,
      "division_rank": 1,
      "rank_in_division": 1,
      "playoff_qualified": true,
      "recent_form": "WWLWT" // If include_stats=true
    },
    ...
  ],
  "divisions": {
    "Division A": [
      { /* team standings */ },
      ...
    ],
    "Division B": [
      { /* team standings */ },
      ...
    ]
  },
  "playoff_format": "top_per_division"
}
```

**Playoff Qualification Logic**:
- `top_per_division`: Top 1 team from each division qualifies
- `top_overall`: Top N teams overall (N = divisions_count)
- `bracket`: Top 2 teams from each division qualify

**Error Responses**:
- `404 Not Found`: League not found
- `500 Internal Server Error`: Database error

**Notes**:
- Uses the `league_standings` database view with automatic tiebreaker sorting
- Playoff qualification is calculated dynamically based on league configuration
- Results grouped by division for easy display
- Optional recent form shows last 5 match results (W/L/T)

---

## 2. Division-Specific Standings

**Endpoint**: `GET /api/leagues/:id/standings/division/:divId`

**Description**: Retrieve detailed standings for a specific division including head-to-head matrix and all matchups

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "league": {
    "id": 1,
    "name": "UAL Season 2 Winter 2025",
    ...
  },
  "division": {
    "id": 1,
    "league_id": 1,
    "division_name": "Division A",
    "division_order": 1
  },
  "standings": [
    {
      "team_id": 10,
      "team_name": "Team Alpha",
      "rank_in_division": 1,
      "matches_played": 8,
      "wins": 5,
      "ties": 1,
      "losses": 2,
      "league_points": 11.5,
      ...
    },
    ...
  ],
  "matchups": [
    {
      "id": 50,
      "week_number": 1,
      "team1_id": 10,
      "team2_id": 11,
      "team1_name": "Team Alpha",
      "team2_name": "Team Beta",
      "winner_team_id": 10,
      "status": "completed",
      "week_start_date": "2025-01-08",
      "week_end_date": "2025-01-14",
      ...
    },
    ...
  ],
  "headToHead": {
    "10": {
      "11": "W",
      "12": "L",
      "13": "W"
    },
    "11": {
      "10": "L",
      "12": "W",
      "13": "T"
    },
    ...
  }
}
```

**Head-to-Head Matrix**:
- Keys are team IDs
- Values: `"W"` (win), `"L"` (loss), `"T"` (tie), `null` (not yet played)
- Shows results from team's perspective (e.g., `headToHead[10][11] = "W"` means team 10 beat team 11)

**Error Responses**:
- `404 Not Found`: League or division not found
- `500 Internal Server Error`: Database error

**Use Cases**:
- Division-specific leaderboard display
- Head-to-head comparison between teams
- Week-by-week division match results

---

## 3. Tiebreaker Details

**Endpoint**: `GET /api/leagues/:id/standings/tiebreakers`

**Description**: Show detailed tiebreaker information, identify tied teams, and display tiebreaker history

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "league": {
    "id": 1,
    "name": "UAL Season 2 Winter 2025",
    "tiebreaker_rules": {
      "1": "total_points",
      "2": "lowest_aggregate_net",
      "3": "lowest_second_half_aggregate",
      "4": "lowest_final_week",
      "5": "coin_flip"
    }
  },
  "tiebreaker_explanation": {
    "1": "Total Points (most wins)",
    "2": "Lowest Aggregate Net Score (cumulative net for all matches)",
    "3": "Lowest Second Half Aggregate Net (second half of season)",
    "4": "Lowest Final Week Net Score",
    "5": "Coin Flip (admin determines)"
  },
  "tied_teams": [
    {
      "division_id": 1,
      "division_name": "Division A",
      "points": 10.5,
      "teams": [
        {
          "team_id": 12,
          "team_name": "Team Gamma",
          "rank_in_division": 2,
          "league_points": 10.5,
          "aggregate_net_score": 152,
          "second_half_net_score": 75,
          "final_week_net_score": 38,
          "tiebreaker_applied": 2
        },
        {
          "team_id": 13,
          "team_name": "Team Delta",
          "rank_in_division": 3,
          "league_points": 10.5,
          "aggregate_net_score": 155,
          "second_half_net_score": 78,
          "final_week_net_score": 39,
          "tiebreaker_applied": 2
        }
      ]
    }
  ],
  "tiebreaker_history": [
    {
      "id": 1,
      "league_id": 1,
      "team1_id": 12,
      "team2_id": 13,
      "team1_name": "Team Gamma",
      "team2_name": "Team Delta",
      "tiebreaker_level": 2,
      "tiebreaker_method": "lowest_aggregate_net",
      "winner_team_id": 12,
      "winner_name": "Team Gamma",
      "details": {
        "team1_value": 152,
        "team2_value": 155
      },
      "applied_at": "2025-01-20T18:30:00Z"
    }
  ]
}
```

**Tiebreaker Applied Levels**:
- `null`: No tiebreaker needed (not tied)
- `1`: Points tiebreaker
- `2`: Aggregate net score tiebreaker
- `3`: Second half net tiebreaker
- `4`: Final week net tiebreaker
- `5`: Coin flip required (still tied after all automatic tiebreakers)

**Error Responses**:
- `404 Not Found`: League not found
- `500 Internal Server Error`: Database error

**Notes**:
- Shows only teams that are currently tied (2+ teams with same points in a division)
- Tiebreaker history tracks manual tiebreaker applications (useful for auditing)
- Automatically identifies which tiebreaker level resolved each tie

---

## 4. Team Statistics

**Endpoint**: `GET /api/teams/:teamId/stats`

**Description**: Retrieve comprehensive team statistics including match results, player performance, and standings

**Authentication**: Not required

**Query Parameters**:
- `league_id` (optional): Filter stats to specific league

**Response** (200 OK):
```json
{
  "team": {
    "id": 10,
    "name": "Team Alpha",
    "captain_id": 45,
    "captain_name": "John Doe",
    "league_id": 1,
    "league_name": "UAL Season 2 Winter 2025",
    "division_id": 1,
    "division_name": "Division A",
    "league_points": 11.5,
    "aggregate_net_score": 145,
    ...
  },
  "statistics": {
    "total_matches": 8,
    "wins": 5,
    "ties": 1,
    "losses": 2,
    "total_points": 11.5,
    "avg_total_net": 36.2,
    "best_total_net": 33,
    "worst_total_net": 40,
    "win_percentage": 68.8
  },
  "player_statistics": [
    {
      "member_id": 50,
      "player_name": "Alice Johnson",
      "matches_played": 6,
      "avg_gross": 12.5,
      "best_gross": 11,
      "avg_net": 10.8,
      "best_net": 9
    },
    ...
  ],
  "standings": {
    "team_id": 10,
    "rank_in_division": 1,
    "division_name": "Division A",
    "league_points": 11.5,
    "playoff_qualified": true,
    ...
  }
}
```

**Statistics Breakdown**:
- **Match stats**: Win/loss record, points earned, scoring averages
- **Player stats**: Individual player performance on the team
- **Standings**: Current league standing with playoff status
- **Win percentage**: (Wins + Ties × 0.5) / Total Matches × 100

**Error Responses**:
- `404 Not Found`: Team not found
- `500 Internal Server Error`: Database error

**Use Cases**:
- Team profile page
- Captain dashboard (detailed team performance)
- Player evaluation (who's performing best)

---

## 5. Team Match History

**Endpoint**: `GET /api/teams/:teamId/matches`

**Description**: Retrieve complete match history for a team with results and scores

**Authentication**: Not required

**Query Parameters**:
- `league_id` (optional): Filter to specific league
- `status` (optional): Filter by match status (`scheduled`, `completed`, etc.)
- `limit` (optional, default: 50): Maximum number of matches to return

**Response** (200 OK):
```json
{
  "team": {
    "id": 10,
    "name": "Team Alpha",
    ...
  },
  "matches": [
    {
      "id": 52,
      "league_id": 1,
      "week_number": 8,
      "opponent_name": "Team Beta",
      "opponent_id": 11,
      "team_score": 35,
      "opponent_score": 38,
      "result": "W",
      "course_name": "Pebble Beach",
      "status": "completed",
      "week_start_date": "2025-01-22",
      "week_end_date": "2025-01-28",
      "league_name": "UAL Season 2 Winter 2025",
      "division_name": "Division A",
      ...
    },
    ...
  ],
  "summary": {
    "total_matches": 8,
    "wins": 5,
    "ties": 1,
    "losses": 2,
    "pending": 0
  }
}
```

**Result Codes**:
- `W`: Win
- `L`: Loss
- `T`: Tie
- `-`: Not yet completed

**Error Responses**:
- `404 Not Found`: Team not found
- `500 Internal Server Error`: Database error

**Notes**:
- Results sorted by week number (most recent first)
- Includes both completed and pending matches
- Team score and opponent score shown from team's perspective

---

## 6. Player Performance (within league)

**Endpoint**: `GET /api/leagues/:id/player-stats/:userId`

**Description**: Retrieve detailed player performance statistics within a specific league, including hole-by-hole analysis

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "league": {
    "id": 1,
    "name": "UAL Season 2 Winter 2025",
    ...
  },
  "player": {
    "member_id": 50,
    "first_name": "Alice",
    "last_name": "Johnson",
    "email_address": "alice@example.com",
    "handicap": 12.5
  },
  "teams": [
    {
      "id": 10,
      "name": "Team Alpha",
      "captain_id": 45,
      "division_name": "Division A"
    }
  ],
  "statistics": {
    "individual_scoring": {
      "matches_played": 6,
      "weeks_played": 6,
      "total_holes_played": 18,
      "avg_gross_score": 12.5,
      "best_gross_score": 11,
      "worst_gross_score": 14,
      "avg_net_score": 10.8,
      "best_net_score": 9,
      "worst_net_score": 13,
      "avg_handicap": 12.5
    },
    "lineup_participation": {
      "times_selected": 6,
      "times_locked": 6
    },
    "availability": {
      "weeks_submitted": 8,
      "weeks_available": 6,
      "weeks_unavailable": 2
    },
    "hole_by_hole": [
      {
        "hole_number": 1,
        "times_played": 2,
        "gross_total": 8,
        "net_total": 7,
        "avg_gross": "4.00",
        "avg_net": "3.50",
        "pars": 1,
        "birdies": 1,
        "bogeys": 0,
        "double_bogeys_or_worse": 0
      },
      {
        "hole_number": 2,
        "times_played": 2,
        "gross_total": 10,
        "net_total": 8,
        "avg_gross": "5.00",
        "avg_net": "4.00",
        "pars": 1,
        "birdies": 0,
        "bogeys": 1,
        "double_bogeys_or_worse": 0
      },
      ...
    ]
  }
}
```

**Statistics Breakdown**:

### Individual Scoring
- Total matches/weeks played
- Holes played (3 holes per match in individual format)
- Average/best/worst gross and net scores
- Average handicap during league

### Lineup Participation
- How many times selected by captain
- How many lineups were locked (actually played)

### Availability
- Submission rate (weeks submitted availability)
- Weeks marked as available vs unavailable

### Hole-by-Hole Performance
- Detailed stats for each hole (1-9) played
- Average gross and net scores
- Scoring distribution (birdies, pars, bogeys, etc.)
- Useful for identifying strengths/weaknesses

**Error Responses**:
- `404 Not Found`: League, player, or player not part of league
- `500 Internal Server Error`: Database error

**Use Cases**:
- Player profile page within league
- Performance analysis
- Captain strategy (which holes to assign to each player)
- Player improvement tracking

---

## Database Schema Reference

### league_standings (VIEW)
```sql
SELECT
  ts.league_id,
  ts.division_id,
  ld.division_name,
  ts.team_id,
  tt.name AS team_name,
  tt.captain_id,
  u.first_name || ' ' || u.last_name AS captain_name,
  ts.matches_played,
  ts.wins, ts.ties, ts.losses,
  ts.total_points,
  tt.league_points,
  tt.aggregate_net_score,
  tt.second_half_net_score,
  tt.final_week_net_score,
  ts.division_rank,
  ts.playoff_qualified,
  ROW_NUMBER() OVER (
    PARTITION BY ts.league_id, ts.division_id
    ORDER BY
      tt.league_points DESC,           -- Tiebreaker 1
      tt.aggregate_net_score ASC,      -- Tiebreaker 2
      tt.second_half_net_score ASC,    -- Tiebreaker 3
      tt.final_week_net_score ASC      -- Tiebreaker 4
  ) AS rank_in_division
FROM team_standings ts
JOIN tournament_teams tt ON ts.team_id = tt.id
LEFT JOIN league_divisions ld ON ts.division_id = ld.id
LEFT JOIN users u ON tt.captain_id = u.member_id
WHERE ts.league_id IS NOT NULL
```

**Key Columns**:
- `rank_in_division`: Auto-calculated rank using tiebreakers
- `league_points`: Total points earned (from `tournament_teams`)
- `aggregate_net_score`: Cumulative net (tiebreaker 2)
- `second_half_net_score`: Second half net (tiebreaker 3)
- `final_week_net_score`: Final week net (tiebreaker 4)

---

## Tiebreaker Logic Deep Dive

### Automatic Tiebreakers (Levels 1-4)

The `league_standings` view automatically applies tiebreakers in this order:

```sql
ORDER BY
  tt.league_points DESC,           -- Level 1: Most points
  tt.aggregate_net_score ASC,      -- Level 2: Lowest total net
  tt.second_half_net_score ASC,    -- Level 3: Lowest second half net
  tt.final_week_net_score ASC      -- Level 4: Lowest final week net
```

### Manual Tiebreaker (Level 5)

If two teams are still tied after all 4 automatic tiebreakers:
1. Admin performs coin flip or other manual determination
2. Result logged in `tiebreaker_log` table
3. Admin manually updates standings if needed

### Tiebreaker Examples

**Example 1: Tied on Points, Resolved by Aggregate Net**
```
Team A: 10 points, 145 aggregate net
Team B: 10 points, 152 aggregate net
Winner: Team A (better aggregate net)
Tiebreaker Level: 2
```

**Example 2: Multiple Tiebreakers**
```
Team A: 10 points, 145 aggregate, 72 second half, 36 final week
Team B: 10 points, 145 aggregate, 75 second half, 38 final week
Winner: Team A (better second half net)
Tiebreaker Level: 3
```

**Example 3: Requires Coin Flip**
```
Team A: 10 points, 145 aggregate, 72 second half, 36 final week
Team B: 10 points, 145 aggregate, 72 second half, 36 final week
Winner: TBD (requires manual determination)
Tiebreaker Level: 5
```

---

## Performance Considerations

### Optimizations
- Uses database view for standings (pre-computed tiebreaker sorting)
- Indexes on key columns (`league_id`, `division_id`, `team_id`)
- Efficient joins with LEFT JOIN for optional relations
- Limit parameter on match history to prevent large result sets

### Response Times
- **Standings**: < 100ms (uses view)
- **Team Stats**: < 200ms (multiple aggregations)
- **Player Stats**: < 300ms (hole-by-hole analysis)
- **Division Details**: < 150ms (includes head-to-head matrix)

### Caching Recommendations
For production, consider caching:
- League standings (refresh every 5 minutes)
- Team stats (refresh after each match completion)
- Player stats (refresh daily or after match completion)

---

## Frontend Display Examples

### Standings Table
```
Rank | Team        | W-T-L | Points | Agg Net | Recent Form | Playoff
-----|-------------|-------|--------|---------|-------------|--------
  1  | Team Alpha  | 5-1-2 |  11.5  |   145   | WWLWT       |   ✓
  2  | Team Gamma  | 5-0-3 |  10.0  |   152   | WLWLW       |
  3  | Team Beta   | 4-2-2 |  10.0  |   155   | TWLWL       |
  4  | Team Delta  | 3-1-4 |   7.5  |   160   | LLWLT       |
```

### Tiebreaker Indicator
When displaying tied teams, show which tiebreaker was applied:
```
2. Team Gamma (10.0 pts, 152 net*) *Tied on points, separated by aggregate net
3. Team Beta (10.0 pts, 155 net*)
```

### Player Hole Performance Chart
Display hole-by-hole averages as a line chart or bar graph:
- X-axis: Hole numbers (1-9)
- Y-axis: Average score
- Show both gross and net lines
- Highlight best/worst performing holes

---

## Testing Checklist

- [ ] Get overall standings (verify tiebreaker sorting)
- [ ] Get division standings (verify head-to-head matrix)
- [ ] Get tiebreaker details (verify tied teams identified correctly)
- [ ] Get team stats (verify all aggregations correct)
- [ ] Get team matches (verify result calculations W/L/T)
- [ ] Get player stats (verify hole-by-hole aggregation)
- [ ] Test with different playoff formats (top_per_division, top_overall, bracket)
- [ ] Test with tied teams at various tiebreaker levels
- [ ] Test optional parameters (include_stats, league_id filters, limits)
- [ ] Verify performance with large datasets

---

## Example API Calls

### Get Overall Standings with Stats
```bash
GET /api/leagues/1/standings?include_stats=true
```

### Get Division Standings
```bash
GET /api/leagues/1/standings/division/2
```

### Get Tiebreaker Details
```bash
GET /api/leagues/1/standings/tiebreakers
```

### Get Team Stats for Specific League
```bash
GET /api/teams/10/stats?league_id=1
```

### Get Recent Team Matches
```bash
GET /api/teams/10/matches?league_id=1&status=completed&limit=10
```

### Get Player Stats
```bash
GET /api/leagues/1/player-stats/50
```

---

## Related Endpoints

From previous phases:
- `GET /api/leagues/:id` - Get league details
- `GET /api/leagues/:id/matchups` - Get all matchups
- `GET /api/matchups/:matchupId/scores` - Get match scores

---

**Last Updated**: January 2025
**Phase**: 6 - Leaderboards & Standings
**Status**: Implemented
