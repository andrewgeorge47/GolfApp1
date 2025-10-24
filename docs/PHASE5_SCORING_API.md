# Phase 5: Scoring API Documentation

## Overview
This document describes the scoring endpoints for the UAL hybrid format league system.

**Hybrid Format**:
- **Individual 9 holes** (holes 1-9): Each of 3 players plays their own ball on assigned holes
- **Alternate Shot 9 holes** (holes 10-18): Team plays alternate shot format

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/matchups/:matchupId/scores/individual` | Submit individual player scores | Captain/Player/Admin |
| POST | `/api/matchups/:matchupId/scores/alternate-shot` | Submit alternate shot team scores | Captain/Admin |
| GET | `/api/matchups/:matchupId/scores` | Get all scores for matchup | Public |
| PUT | `/api/matchups/:matchupId/scores/individual/:scoreId` | Update individual scores | Captain/Player/Admin |
| PUT | `/api/matchups/:matchupId/scores/alternate-shot/:scoreId` | Update alternate shot scores | Captain/Admin |
| POST | `/api/matchups/:matchupId/verify` | Verify/approve scores | Captain/Admin |
| POST | `/api/matchups/:matchupId/dispute` | Dispute scores | Captain |

---

## 1. Submit Individual Scores

**Endpoint**: `POST /api/matchups/:matchupId/scores/individual`

**Description**: Submit individual 9-hole scores for a player (holes 1-9)

**Authentication**: Required (Captain, Player themselves, or Admin)

**Request Body**:
```json
{
  "team_id": 123,
  "player_id": 456,
  "lineup_id": 789,
  "assigned_holes": [1, 2, 3],
  "hole_scores": {
    "1": { "gross": 4, "par": 4 },
    "2": { "gross": 5, "par": 4 },
    "3": { "gross": 3, "par": 3 }
  },
  "player_handicap": 12.5,
  "course_handicap": 14
}
```

**Field Descriptions**:
- `team_id` (required): Team ID
- `player_id` (required): Player ID (must be in lineup)
- `lineup_id` (required): Weekly lineup ID
- `assigned_holes` (optional): Array of hole numbers assigned to this player
- `hole_scores` (required): Object with hole numbers as keys
  - Each hole: `{ gross: number, par: number }`
- `player_handicap` (optional): Player's handicap at time of play
- `course_handicap` (optional): Course handicap for stroke allocation

**Response** (201 Created):
```json
{
  "message": "Individual scores submitted successfully",
  "score": {
    "id": 1,
    "matchup_id": 10,
    "lineup_id": 789,
    "team_id": 123,
    "player_id": 456,
    "assigned_holes": [1, 2, 3],
    "hole_scores": { "1": { "gross": 4, "par": 4 }, ... },
    "gross_total": 12,
    "player_handicap": 12.5,
    "course_handicap": 14,
    "submitted_at": "2025-01-15T10:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `403 Forbidden`: User not authorized
- `404 Not Found`: Matchup or lineup not found
- `500 Internal Server Error`: Database error

**Notes**:
- Gross total is automatically calculated from hole_scores
- Net scores will be calculated later with proper stroke allocation
- Can be resubmitted (upsert) - will update existing score
- Updates matchup status to 'in_progress' on first submission

---

## 2. Submit Alternate Shot Scores

**Endpoint**: `POST /api/matchups/:matchupId/scores/alternate-shot`

**Description**: Submit alternate shot 9-hole scores for a team (holes 10-18)

**Authentication**: Required (Captain or Admin only)

**Request Body**:
```json
{
  "team_id": 123,
  "lineup_id": 789,
  "hole_scores": {
    "10": { "gross": 4, "par": 4 },
    "11": { "gross": 5, "par": 5 },
    "12": { "gross": 4, "par": 4 },
    "13": { "gross": 3, "par": 3 },
    "14": { "gross": 5, "par": 4 },
    "15": { "gross": 4, "par": 4 },
    "16": { "gross": 3, "par": 3 },
    "17": { "gross": 5, "par": 5 },
    "18": { "gross": 4, "par": 4 }
  },
  "team_handicap": 10.5,
  "team_course_handicap": 12
}
```

**Field Descriptions**:
- `team_id` (required): Team ID
- `lineup_id` (required): Weekly lineup ID
- `hole_scores` (required): Object with hole numbers 10-18 as keys
  - Each hole: `{ gross: number, par: number }`
- `team_handicap` (optional): Team's average handicap (from lineup)
- `team_course_handicap` (optional): Team course handicap for stroke allocation

**Response** (201 Created):
```json
{
  "message": "Alternate shot scores submitted successfully",
  "score": {
    "id": 1,
    "matchup_id": 10,
    "lineup_id": 789,
    "team_id": 123,
    "hole_scores": { "10": { "gross": 4, "par": 4 }, ... },
    "gross_total": 37,
    "team_handicap": 10.5,
    "team_course_handicap": 12,
    "submitted_at": "2025-01-15T10:35:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `403 Forbidden`: User not authorized (must be captain or admin)
- `404 Not Found`: Matchup or lineup not found
- `500 Internal Server Error`: Database error

**Notes**:
- Only team captains can submit alternate shot scores
- Gross total is automatically calculated
- Can be resubmitted (upsert) - will update existing score

---

## 3. Get Matchup Scores

**Endpoint**: `GET /api/matchups/:matchupId/scores`

**Description**: Retrieve all scores for a matchup (both teams, both formats)

**Authentication**: Not required (public)

**Response** (200 OK):
```json
{
  "matchup": {
    "id": 10,
    "league_id": 1,
    "week_number": 3,
    "team1_id": 123,
    "team2_id": 456,
    "team1_name": "Team A",
    "team2_name": "Team B",
    "status": "in_progress",
    "course_name": "Pebble Beach",
    "hole_indexes": [10, 8, 14, ...],
    ...
  },
  "lineups": [
    {
      "id": 789,
      "team_id": 123,
      "team_name": "Team A",
      "player1_id": 11,
      "player1_name": "John Doe",
      "player1_holes": [1, 2, 3],
      "player2_id": 12,
      "player2_name": "Jane Smith",
      "player2_holes": [4, 5, 6],
      "player3_id": 13,
      "player3_name": "Bob Johnson",
      "player3_holes": [7, 8, 9],
      "team_handicap": 10.5,
      ...
    },
    ...
  ],
  "individualScores": [
    {
      "id": 1,
      "matchup_id": 10,
      "team_id": 123,
      "player_id": 11,
      "player_name": "John Doe",
      "team_name": "Team A",
      "assigned_holes": [1, 2, 3],
      "hole_scores": { ... },
      "gross_total": 12,
      "submitted_at": "2025-01-15T10:30:00Z"
    },
    ...
  ],
  "alternateShotScores": [
    {
      "id": 1,
      "matchup_id": 10,
      "team_id": 123,
      "team_name": "Team A",
      "hole_scores": { ... },
      "gross_total": 37,
      "submitted_at": "2025-01-15T10:35:00Z"
    },
    ...
  ]
}
```

**Error Responses**:
- `404 Not Found`: Matchup not found
- `500 Internal Server Error`: Database error

**Notes**:
- Returns complete matchup context including lineups
- Useful for displaying scorecards and comparing teams
- Public endpoint - no authentication required

---

## 4. Update Individual Scores

**Endpoint**: `PUT /api/matchups/:matchupId/scores/individual/:scoreId`

**Description**: Update individual player scores before verification

**Authentication**: Required (Captain, Player themselves, or Admin)

**Request Body** (all fields optional):
```json
{
  "hole_scores": {
    "1": { "gross": 5, "par": 4 },
    "2": { "gross": 4, "par": 4 },
    "3": { "gross": 3, "par": 3 }
  },
  "assigned_holes": [1, 2, 3],
  "player_handicap": 12.5,
  "course_handicap": 14
}
```

**Response** (200 OK):
```json
{
  "message": "Individual scores updated successfully",
  "score": { ... }
}
```

**Error Responses**:
- `400 Bad Request`: No fields to update, or scores already verified
- `403 Forbidden`: User not authorized
- `404 Not Found`: Score record not found
- `500 Internal Server Error`: Database error

**Notes**:
- Cannot update after matchup status is 'verified' or 'completed'
- Gross total is recalculated automatically when hole_scores changes

---

## 5. Update Alternate Shot Scores

**Endpoint**: `PUT /api/matchups/:matchupId/scores/alternate-shot/:scoreId`

**Description**: Update alternate shot team scores before verification

**Authentication**: Required (Captain or Admin only)

**Request Body** (all fields optional):
```json
{
  "hole_scores": {
    "10": { "gross": 5, "par": 4 },
    ...
  },
  "team_handicap": 10.5,
  "team_course_handicap": 12
}
```

**Response** (200 OK):
```json
{
  "message": "Alternate shot scores updated successfully",
  "score": { ... }
}
```

**Error Responses**:
- `400 Bad Request`: No fields to update, or scores already verified
- `403 Forbidden`: User not authorized (must be captain or admin)
- `404 Not Found`: Score record not found
- `500 Internal Server Error`: Database error

**Notes**:
- Cannot update after matchup status is 'verified' or 'completed'
- Only team captains and admins can update

---

## 6. Verify Scores

**Endpoint**: `POST /api/matchups/:matchupId/verify`

**Description**: Verify and approve all scores for a matchup (locks scores)

**Authentication**: Required (Captain of either team or Admin)

**Request Body** (optional):
```json
{
  "notes": "Scores verified and approved"
}
```

**Response** (200 OK):
```json
{
  "message": "Scores verified successfully",
  "matchup": {
    "id": 10,
    "status": "verified",
    "verified_at": "2025-01-15T12:00:00Z",
    "verified_by": 456,
    ...
  },
  "note": "Scores are now locked and ready for calculation"
}
```

**Error Responses**:
- `400 Bad Request`:
  - Already verified
  - Not all scores submitted (needs 6 individual + 2 alternate shot)
- `403 Forbidden`: User not authorized (must be captain or admin)
- `404 Not Found`: Matchup not found
- `500 Internal Server Error`: Database error

**Score Requirements for Verification**:
- **6 individual scores** (3 players × 2 teams)
- **2 alternate shot scores** (1 per team)

**Notes**:
- Both team captains can verify (doesn't require both)
- Once verified, scores cannot be updated
- Status changes from 'in_progress' to 'verified'
- Ready for calculation endpoint (to be implemented)

---

## 7. Dispute Scores

**Endpoint**: `POST /api/matchups/:matchupId/dispute`

**Description**: Dispute/flag scores for admin review

**Authentication**: Required (Captain of either team)

**Request Body**:
```json
{
  "reason": "Score discrepancy on hole 14 - believe gross should be 5 not 6"
}
```

**Response** (200 OK):
```json
{
  "message": "Scores have been disputed and flagged for admin review",
  "matchup": {
    "id": 10,
    "status": "disputed",
    ...
  },
  "reason": "Score discrepancy on hole 14 - believe gross should be 5 not 6"
}
```

**Error Responses**:
- `400 Bad Request`: Missing reason
- `403 Forbidden`: User not authorized (must be captain)
- `404 Not Found`: Matchup not found
- `500 Internal Server Error`: Database error

**Notes**:
- Changes matchup status to 'disputed'
- Admin intervention required to resolve
- Future enhancement: Store in disputes table and send notifications

---

## Database Schema Reference

### match_individual_scores
```sql
id SERIAL PRIMARY KEY
matchup_id INTEGER (FK to league_matchups)
lineup_id INTEGER (FK to weekly_lineups)
team_id INTEGER (FK to tournament_teams)
player_id INTEGER (FK to users)
assigned_holes INTEGER[] -- e.g., [1,2,3]
hole_scores JSONB -- {1: {gross, net, par}, ...}
gross_total INTEGER
net_total INTEGER (calculated later)
player_handicap DECIMAL(5,2)
course_handicap INTEGER
submitted_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE CONSTRAINT: (matchup_id, player_id)
```

### match_alternate_shot_scores
```sql
id SERIAL PRIMARY KEY
matchup_id INTEGER (FK to league_matchups)
lineup_id INTEGER (FK to weekly_lineups)
team_id INTEGER (FK to tournament_teams)
hole_scores JSONB -- {10: {gross, net, par}, ...}
gross_total INTEGER
net_total INTEGER (calculated later)
team_handicap DECIMAL(5,2)
team_course_handicap INTEGER
submitted_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE CONSTRAINT: (matchup_id, team_id)
```

---

## Matchup Status Flow

```
scheduled → lineup_submitted → in_progress → verified → completed
                                    ↓
                               disputed (requires admin intervention)
```

**Status Descriptions**:
- `scheduled`: Matchup created, lineups not submitted
- `lineup_submitted`: Both teams submitted lineups
- `in_progress`: Scores being entered
- `verified`: Scores verified by captain(s)
- `completed`: Calculation done, results final
- `disputed`: Scores disputed, needs admin review

---

## Migration Required

Before using these endpoints, run the migration:

```bash
psql -d your_database -f db/migrations/005_add_score_constraints.sql
```

This adds the unique constraint for `(matchup_id, player_id)` on `match_individual_scores`.

---

## Future Endpoints (To Be Implemented)

### Calculate Match Result
```
POST /api/matchups/:matchupId/calculate
```
- Calculate net scores with proper stroke allocation
- Determine match winner (lowest total net)
- Award points based on league rules
- Update team standings
- Update aggregate net scores for tiebreakers

### Get Standings
```
GET /api/leagues/:leagueId/standings
GET /api/leagues/:leagueId/standings/division/:divisionId
```
- Real-time standings with tiebreakers
- Division rankings
- Playoff qualification status

---

## Testing Checklist

- [ ] Submit individual scores (all 3 players for both teams)
- [ ] Submit alternate shot scores (both teams)
- [ ] Get scores (verify response includes all data)
- [ ] Update individual scores (before verification)
- [ ] Update alternate shot scores (before verification)
- [ ] Verify scores (check validation for incomplete scores)
- [ ] Dispute scores (check status change)
- [ ] Test authorization (captain, player, admin)
- [ ] Test error cases (missing fields, unauthorized, etc.)
- [ ] Test upsert behavior (resubmitting scores)

---

## Example Workflow

1. **Captain creates lineup**: `POST /api/matchups/:matchupId/lineup`
2. **Players submit individual scores**: `POST /api/matchups/:matchupId/scores/individual` (3 calls per team)
3. **Captain submits alternate shot scores**: `POST /api/matchups/:matchupId/scores/alternate-shot`
4. **Captain verifies scores**: `POST /api/matchups/:matchupId/verify`
5. **Admin calculates results**: `POST /api/matchups/:matchupId/calculate` (future)

---

**Last Updated**: January 2025
**Phase**: 5 - Scoring
**Status**: Implemented (Calculation endpoints pending)
