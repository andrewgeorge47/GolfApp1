# Matchup Generation & Availability API Documentation

## Overview

This document covers Phase 3 (Matchup Generation) and Phase 4 (Availability & Lineup Management) API endpoints for the League system.

**Base URL**: `http://localhost:3001/api`

---

## Matchup Generation & Management

### Generate Matchups (Round-Robin)
**POST** `/leagues/:leagueId/matchups/generate`

**Auth**: Required (Admin only)

**Description**: Automatically generates round-robin matchups for all divisions in the league. Clears existing matchups before generating new ones.

**Prerequisites**:
- League must have divisions created
- League must have schedule generated
- Teams must be assigned to divisions

**Response**: `201 Created`
```json
{
  "message": "Generated 48 matchups across 2 divisions",
  "matchupsCreated": 48
}
```

**Algorithm**: Uses standard round-robin rotation where:
- Each team plays every other team in their division
- If odd number of teams, rotation includes "bye" weeks
- Schedule repeats if more weeks than needed for one round-robin cycle

---

### List All Matchups
**GET** `/leagues/:leagueId/matchups`

**Auth**: Not required

**Query Parameters**:
- `week_number` (optional): Filter by specific week
- `division_id` (optional): Filter by division
- `status` (optional): Filter by status (`scheduled`, `lineup_submitted`, `in_progress`, `completed`, etc.)

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "league_id": 1,
    "schedule_id": 1,
    "week_number": 1,
    "division_id": 1,
    "division_name": "Division A",
    "team1_id": 1,
    "team1_name": "Team Alpha",
    "team1_captain_id": 5,
    "team1_captain_name": "John Doe",
    "team2_id": 2,
    "team2_name": "Team Beta",
    "team2_captain_id": 6,
    "team2_captain_name": "Jane Smith",
    "course_id": 10,
    "course_name": "Pebble Beach",
    "status": "scheduled",
    "week_start_date": "2025-02-03",
    "week_end_date": "2025-02-09",
    ...
  }
]
```

---

### Get Week Matchups
**GET** `/leagues/:leagueId/matchups/week/:weekNumber`

**Auth**: Not required

**Response**: `200 OK` (same structure as list all matchups, filtered by week)

---

### Get Matchup Details
**GET** `/matchups/:matchupId`

**Auth**: Not required

**Response**: `200 OK`
```json
{
  "id": 1,
  "league_id": 1,
  "week_number": 1,
  "team1_id": 1,
  "team1_name": "Team Alpha",
  "team1_captain_name": "John Doe",
  "team2_id": 2,
  "team2_name": "Team Beta",
  "team2_captain_name": "Jane Smith",
  "course_id": 10,
  "course_name": "Pebble Beach",
  "course_rating": 73.5,
  "course_slope": 135,
  "course_par": 72,
  "hole_indexes": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  "status": "scheduled",
  "team1_individual_net": null,
  "team2_individual_net": null,
  "team1_alternate_shot_net": null,
  "team2_alternate_shot_net": null,
  "team1_total_net": null,
  "team2_total_net": null,
  ...
}
```

---

### Update Matchup
**PUT** `/matchups/:matchupId`

**Auth**: Required (Admin only)

**Request Body** (all fields optional):
```json
{
  "course_id": 10,
  "course_name": "Pebble Beach",
  "course_rating": 73.5,
  "course_slope": 135,
  "course_par": 72,
  "hole_indexes": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  "match_date": "2025-02-05T18:00:00Z",
  "status": "scheduled"
}
```

**Response**: `200 OK` (updated matchup)

**Use Cases**:
- Assign course to matchup
- Set hole handicap indexes for stroke allocation
- Change match date/time
- Update status

---

### Delete Matchup
**DELETE** `/matchups/:matchupId`

**Auth**: Required (Admin only)

**Response**: `200 OK`
```json
{
  "message": "Matchup deleted successfully",
  "matchup": { ... }
}
```

---

## Availability Tracking

### Submit Availability
**POST** `/teams/:teamId/availability`

**Auth**: Required (Must be team member)

**Request Body**:
```json
{
  "league_id": 1,
  "week_number": 1,
  "is_available": true,
  "availability_notes": "Available Tuesday and Thursday evenings"
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "team_id": 1,
  "user_id": 5,
  "league_id": 1,
  "week_number": 1,
  "is_available": true,
  "availability_notes": "Available Tuesday and Thursday evenings",
  "submitted_at": "2025-01-23T...",
  "updated_at": "2025-01-23T..."
}
```

**Notes**:
- Uses UPSERT - will update if already exists for this week
- Only team members can submit
- Defaults to `is_available: true` if not specified

---

### Get Team Availability for Week
**GET** `/teams/:teamId/availability/week/:weekNumber`

**Auth**: Required

**Query Parameters**:
- `league_id` (required): League ID

**Response**: `200 OK`
```json
[
  {
    "user_member_id": 5,
    "first_name": "John",
    "last_name": "Doe",
    "email_address": "john@example.com",
    "handicap": 10.5,
    "is_captain": true,
    "is_available": true,
    "availability_notes": "Available anytime",
    "submitted_at": "2025-01-23T...",
    "updated_at": "2025-01-23T..."
  },
  {
    "user_member_id": 6,
    "first_name": "Jane",
    "last_name": "Smith",
    "email_address": "jane@example.com",
    "handicap": 12.0,
    "is_captain": false,
    "is_available": false,
    "availability_notes": "Out of town this week",
    "submitted_at": "2025-01-23T...",
    "updated_at": null
  },
  {
    "user_member_id": 7,
    "first_name": "Bob",
    "last_name": "Johnson",
    "email_address": "bob@example.com",
    "handicap": 8.5,
    "is_captain": false,
    "is_available": null,
    "availability_notes": null,
    "submitted_at": null,
    "updated_at": null
  }
]
```

**Notes**:
- Returns ALL team members, even if they haven't submitted availability
- `is_available: null` means not yet submitted
- Ordered by captain first, then alphabetically

---

### Get Availability Record
**GET** `/availability/:availabilityId`

**Auth**: Required

**Response**: `200 OK` (availability object)

---

### Update Availability
**PUT** `/availability/:availabilityId`

**Auth**: Required (Must be owner)

**Request Body**:
```json
{
  "is_available": false,
  "availability_notes": "Changed plans - not available"
}
```

**Response**: `200 OK` (updated availability)

**Note**: Can only update your own availability

---

## Lineup Management

### Submit Lineup
**POST** `/matchups/:matchupId/lineup`

**Auth**: Required (Captain or Admin)

**Request Body**:
```json
{
  "team_id": 1,
  "player1_id": 5,
  "player2_id": 6,
  "player3_id": 7,
  "player1_holes": [1, 2, 3],
  "player2_holes": [4, 5, 6],
  "player3_holes": [7, 8, 9]
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "matchup_id": 1,
  "team_id": 1,
  "league_id": 1,
  "week_number": 1,
  "player1_id": 5,
  "player2_id": 6,
  "player3_id": 7,
  "player1_holes": [1, 2, 3],
  "player2_holes": [4, 5, 6],
  "player3_holes": [7, 8, 9],
  "player1_handicap": 10.5,
  "player2_handicap": 12.0,
  "player3_handicap": 8.5,
  "team_handicap": 10.33,
  "team_course_handicap": 12,
  "locked": false,
  "submitted_by": 5,
  ...
}
```

**Features**:
- Automatically calculates team handicap (average of 3 players)
- Calculates team course handicap based on slope/rating
- Validates all players are team members
- Validates team is part of the matchup
- Uses UPSERT - will update if lineup already exists for this week

**Hole Assignment**: For UAL format
- Player 1: Holes 1-3 (individual play)
- Player 2: Holes 4-6 (individual play)
- Player 3: Holes 7-9 (individual play)
- All 3: Holes 10-18 (alternate shot)

---

### Get Matchup Lineups
**GET** `/matchups/:matchupId/lineups`

**Auth**: Not required

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "team_id": 1,
    "team_name": "Team Alpha",
    "player1_id": 5,
    "player1_name": "John Doe",
    "player1_handicap": 10.5,
    "player1_holes": [1, 2, 3],
    "player2_id": 6,
    "player2_name": "Jane Smith",
    "player2_handicap": 12.0,
    "player2_holes": [4, 5, 6],
    "player3_id": 7,
    "player3_name": "Bob Johnson",
    "player3_handicap": 8.5,
    "player3_holes": [7, 8, 9],
    "team_handicap": 10.33,
    "team_course_handicap": 12,
    "locked": false,
    "submitted_by_name": "John Doe",
    ...
  },
  {
    "id": 2,
    "team_id": 2,
    "team_name": "Team Beta",
    ...
  }
]
```

**Note**: Returns lineups for both teams in the matchup

---

### Get Team Lineups
**GET** `/teams/:teamId/lineups`

**Auth**: Required

**Query Parameters**:
- `league_id` (optional): Filter by league

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "team_id": 1,
    "week_number": 1,
    "matchup_status": "scheduled",
    "opponent_name": "Team Beta",
    "player1_id": 5,
    "player2_id": 6,
    "player3_id": 7,
    "locked": false,
    ...
  }
]
```

**Note**: Returns all lineups for the team, ordered by week (newest first)

---

### Lock Lineup
**POST** `/lineups/:lineupId/lock`

**Auth**: Required (Captain or Admin)

**Response**: `200 OK`
```json
{
  "id": 1,
  "locked": true,
  "locked_at": "2025-01-23T12:00:00Z",
  ...
}
```

**Note**: Once locked, lineup cannot be edited (prevents changes after deadline)

---

### Update Lineup
**PUT** `/lineups/:lineupId`

**Auth**: Required (Captain or Admin)

**Request Body** (all fields optional):
```json
{
  "player1_id": 8,
  "player2_id": 6,
  "player3_id": 7,
  "player1_holes": [1, 2, 3]
}
```

**Response**: `200 OK` (updated lineup)

**Restrictions**:
- Cannot update if lineup is locked
- Only captain or admin can update
- Must be a valid team member

---

## Captain Dashboard

### Get Captain Dashboard
**GET** `/captain/team/:teamId/dashboard`

**Auth**: Required (Captain or Admin)

**Query Parameters**:
- `league_id` (required): League ID

**Response**: `200 OK`
```json
{
  "team": {
    "id": 1,
    "name": "Team Alpha",
    "captain_id": 5,
    "league_id": 1,
    "division_id": 1,
    "league_points": 8.5,
    "aggregate_net_score": 145,
    ...
  },
  "roster": [
    {
      "user_member_id": 5,
      "first_name": "John",
      "last_name": "Doe",
      "email_address": "john@example.com",
      "handicap": 10.5,
      "is_captain": true
    },
    ...
  ],
  "upcomingMatches": [
    {
      "id": 1,
      "week_number": 1,
      "week_start_date": "2025-02-03",
      "week_end_date": "2025-02-09",
      "opponent_name": "Team Beta",
      "status": "scheduled",
      ...
    }
  ],
  "standings": {
    "team_id": 1,
    "wins": 8,
    "losses": 2,
    "ties": 1,
    "total_points": 8.5,
    "aggregate_net_total": 145,
    ...
  }
}
```

**Use Case**: Single endpoint to get all data needed for captain's main dashboard

---

## Workflow Example

### Complete Weekly Flow

**1. Admin sets up league**
```bash
# Create league
POST /api/leagues

# Create divisions
POST /api/leagues/1/divisions (Division A)
POST /api/leagues/1/divisions (Division B)

# Generate schedule (12 weeks)
POST /api/leagues/1/schedule/generate

# Generate matchups
POST /api/leagues/1/matchups/generate
```

**2. Players submit availability (Monday-Wednesday)**
```bash
# Each player submits
POST /api/teams/1/availability
{
  "league_id": 1,
  "week_number": 1,
  "is_available": true
}
```

**3. Captain reviews availability (Wednesday)**
```bash
# Check team availability
GET /api/teams/1/availability/week/1?league_id=1

# View captain dashboard
GET /api/captain/team/1/dashboard?league_id=1
```

**4. Captain submits lineup (Thursday)**
```bash
# Get matchup ID for the week
GET /api/leagues/1/matchups/week/1

# Submit lineup
POST /api/matchups/1/lineup
{
  "team_id": 1,
  "player1_id": 5,
  "player2_id": 6,
  "player3_id": 7
}

# Lock lineup (optional, prevents changes)
POST /api/lineups/1/lock
```

**5. Match played and scored (Weekend)**
```bash
# (Phase 5 - Scoring endpoints - coming next)
```

---

## Testing Examples

### Test Round-Robin Generation

```bash
# Setup: Create league with 2 divisions, 4 teams per division, 12-week schedule

# Generate matchups
curl -X POST http://localhost:3001/api/leagues/1/matchups/generate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected result: 48 matchups
# - Division A: 4 teams = 2 matchups/week × 12 weeks = 24 matchups
# - Division B: 4 teams = 2 matchups/week × 12 weeks = 24 matchups
# - Total = 48 matchups

# View week 1 matchups
curl http://localhost:3001/api/leagues/1/matchups/week/1
```

### Test Availability Flow

```bash
# Player 1 submits availability
curl -X POST http://localhost:3001/api/teams/1/availability \
  -H "Authorization: Bearer PLAYER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "league_id": 1,
    "week_number": 1,
    "is_available": true,
    "availability_notes": "Available any day"
  }'

# Player 2 submits (not available)
curl -X POST http://localhost:3001/api/teams/1/availability \
  -H "Authorization: Bearer PLAYER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "league_id": 1,
    "week_number": 1,
    "is_available": false,
    "availability_notes": "Out of town"
  }'

# Captain checks availability
curl http://localhost:3001/api/teams/1/availability/week/1?league_id=1 \
  -H "Authorization: Bearer CAPTAIN_TOKEN"
```

### Test Lineup Submission

```bash
# Captain submits lineup
curl -X POST http://localhost:3001/api/matchups/1/lineup \
  -H "Authorization: Bearer CAPTAIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": 1,
    "player1_id": 5,
    "player2_id": 6,
    "player3_id": 7,
    "player1_holes": [1, 2, 3],
    "player2_holes": [4, 5, 6],
    "player3_holes": [7, 8, 9]
  }'

# Lock lineup
curl -X POST http://localhost:3001/api/lineups/1/lock \
  -H "Authorization: Bearer CAPTAIN_TOKEN"
```

---

## Status Codes

Same as Phase 2:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - No auth token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Next Phase

**Phase 5: Scoring Endpoints**
- Individual 9-hole score submission
- Alternate shot score submission
- Match result calculation
- Score verification workflow

---

**Created**: 2025-01-23
**Version**: 1.0
**Phases**: 3 & 4 - Matchup Generation + Availability/Lineup Management
