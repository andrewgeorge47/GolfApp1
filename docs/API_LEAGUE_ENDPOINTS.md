# League API Endpoints Documentation

## Overview

This document describes the backend API endpoints for the League Management system (UAL Season 2).

**Base URL**: `http://localhost:3001/api`

**Authentication**: Most endpoints require JWT Bearer token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## League CRUD Operations

### Create League
**POST** `/leagues`

**Auth**: Required (Admin only)

**Request Body**:
```json
{
  "name": "UAL Season 2",
  "season": "Winter 2025",
  "description": "Unofficial Amateur League Season 2",
  "start_date": "2025-02-01",
  "end_date": "2025-05-01",
  "teams_per_division": 4,
  "divisions_count": 2,
  "weeks_per_season": 12,
  "playoff_format": "top_per_division",
  "points_for_win": 1.0,
  "points_for_tie": 0.5,
  "points_for_loss": 0.0,
  "format": "hybrid",
  "individual_holes": 9,
  "alternate_shot_holes": 9,
  "active_players_per_week": 3,
  "roster_size_min": 4,
  "roster_size_max": 5
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "name": "UAL Season 2",
  "season": "Winter 2025",
  "status": "draft",
  ...
}
```

---

### List All Leagues
**GET** `/leagues`

**Auth**: Not required

**Query Parameters**:
- `status` (optional): Filter by status (`draft`, `registration`, `active`, `playoffs`, `completed`)

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "UAL Season 2",
    "season": "Winter 2025",
    "status": "active",
    "created_by_name": "John Doe",
    "team_count": 8,
    "division_count": 2,
    ...
  }
]
```

---

### Get League Details
**GET** `/leagues/:id`

**Auth**: Not required

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "UAL Season 2",
  "season": "Winter 2025",
  "description": "...",
  "start_date": "2025-02-01",
  "end_date": "2025-05-01",
  "status": "active",
  "teams_per_division": 4,
  "divisions_count": 2,
  "weeks_per_season": 12,
  "team_count": 8,
  "division_count": 2,
  "weeks_scheduled": 12,
  "created_by_name": "John Doe",
  ...
}
```

---

### Update League
**PUT** `/leagues/:id`

**Auth**: Required (Admin only)

**Request Body** (all fields optional):
```json
{
  "name": "UAL Season 2 Updated",
  "status": "active",
  "teams_per_division": 5,
  ...
}
```

**Response**: `200 OK` (updated league object)

---

### Delete League
**DELETE** `/leagues/:id`

**Auth**: Required (Admin only)

**Response**: `200 OK`
```json
{
  "message": "League deleted successfully",
  "league": { ... }
}
```

---

## Division Management

### Create Division
**POST** `/leagues/:leagueId/divisions`

**Auth**: Required (Admin only)

**Request Body**:
```json
{
  "division_name": "Division A",
  "division_order": 1
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "league_id": 1,
  "division_name": "Division A",
  "division_order": 1,
  "created_at": "2025-01-23T..."
}
```

---

### List Divisions
**GET** `/leagues/:leagueId/divisions`

**Auth**: Not required

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "league_id": 1,
    "division_name": "Division A",
    "division_order": 1,
    "team_count": 4
  },
  {
    "id": 2,
    "league_id": 1,
    "division_name": "Division B",
    "division_order": 2,
    "team_count": 4
  }
]
```

---

### Update Division
**PUT** `/leagues/:leagueId/divisions/:divisionId`

**Auth**: Required (Admin only)

**Request Body**:
```json
{
  "division_name": "Division A - Updated",
  "division_order": 1
}
```

**Response**: `200 OK` (updated division)

---

### Delete Division
**DELETE** `/leagues/:leagueId/divisions/:divisionId`

**Auth**: Required (Admin only)

**Response**: `200 OK`
```json
{
  "message": "Division deleted successfully",
  "division": { ... }
}
```

**Note**: Cannot delete division with teams. Must reassign teams first.

---

## Team Management

### List League Teams
**GET** `/leagues/:leagueId/teams`

**Auth**: Not required

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Team Alpha",
    "captain_id": 5,
    "captain_name": "John Doe",
    "captain_email": "john@example.com",
    "division_id": 1,
    "division_name": "Division A",
    "league_id": 1,
    "league_points": 8.5,
    "aggregate_net_score": 145,
    "wins": 8,
    "losses": 2,
    "ties": 1,
    ...
  }
]
```

---

### Create Team
**POST** `/leagues/:leagueId/teams`

**Auth**: Required (Any authenticated user can create)

**Request Body**:
```json
{
  "name": "Team Alpha",
  "captain_id": 5,
  "division_id": 1,
  "color": "#3B82F6"
}
```

**Response**: `201 Created`
```json
{
  "id": 1,
  "name": "Team Alpha",
  "captain_id": 5,
  "league_id": 1,
  "division_id": 1,
  "color": "#3B82F6",
  ...
}
```

**Note**: Automatically creates team_members entry for captain and team_standings record.

---

### Update Team
**PUT** `/leagues/:leagueId/teams/:teamId`

**Auth**: Required (Team Captain or Admin)

**Request Body**:
```json
{
  "name": "Team Alpha Updated",
  "division_id": 2,
  "color": "#FF5733"
}
```

**Response**: `200 OK` (updated team)

**Note**: Only admins can change `captain_id`.

---

## Schedule Management

### Generate Schedule
**POST** `/leagues/:leagueId/schedule/generate`

**Auth**: Required (Admin only)

**Request Body**:
```json
{
  "weeks": 12,
  "start_date": "2025-02-03"
}
```

**Response**: `201 Created`
```json
{
  "message": "Generated 12 weeks of schedule",
  "schedule": [
    {
      "id": 1,
      "league_id": 1,
      "week_number": 1,
      "week_start_date": "2025-02-03",
      "week_end_date": "2025-02-09",
      "status": "scheduled",
      ...
    },
    ...
  ]
}
```

**Note**: Clears existing schedule before generating new one.

---

### Get Full Schedule
**GET** `/leagues/:leagueId/schedule`

**Auth**: Not required

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "league_id": 1,
    "week_number": 1,
    "week_start_date": "2025-02-03",
    "week_end_date": "2025-02-09",
    "status": "scheduled",
    "matchup_count": 4,
    ...
  },
  ...
]
```

---

### Get Specific Week
**GET** `/leagues/:leagueId/schedule/week/:weekNumber`

**Auth**: Not required

**Response**: `200 OK`
```json
{
  "id": 1,
  "league_id": 1,
  "week_number": 1,
  "week_start_date": "2025-02-03",
  "week_end_date": "2025-02-09",
  "status": "scheduled",
  ...
}
```

---

## Status Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - No authentication token provided
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate name)
- `500 Internal Server Error` - Server error

---

## Testing the Endpoints

### Example: Create a League (using curl)

```bash
# First, login to get a token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your_password"}'

# Response will include: {"token": "eyJhbGciOiJ...", "user": {...}}

# Create league with token
curl -X POST http://localhost:3001/api/leagues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "UAL Season 2",
    "season": "Winter 2025",
    "start_date": "2025-02-01",
    "end_date": "2025-05-01",
    "description": "Test league"
  }'
```

### Example: Create Divisions

```bash
# Create Division A
curl -X POST http://localhost:3001/api/leagues/1/divisions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"division_name": "Division A", "division_order": 1}'

# Create Division B
curl -X POST http://localhost:3001/api/leagues/1/divisions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"division_name": "Division B", "division_order": 2}'
```

### Example: Create a Team

```bash
curl -X POST http://localhost:3001/api/leagues/1/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Team Alpha",
    "captain_id": 5,
    "division_id": 1,
    "color": "#3B82F6"
  }'
```

### Example: Generate Schedule

```bash
curl -X POST http://localhost:3001/api/leagues/1/schedule/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "weeks": 12,
    "start_date": "2025-02-03"
  }'
```

---

## Next Steps

After setting up the league, divisions, teams, and schedule, you'll need to:
1. Generate matchups (Phase 3)
2. Set up availability tracking (Phase 4)
3. Implement lineup selection (Phase 4)
4. Add scoring endpoints (Phase 5)
5. Build leaderboards (Phase 6)

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common errors:
- Missing required fields
- Invalid data format
- Resource not found
- Permission denied
- Duplicate resource names

---

## Database Prerequisites

Before using these endpoints, make sure you've run the migration:

```bash
psql -U golfos_user -d your_database -f db/migrations/004_add_league_system.sql
```

---

## Support

For questions or issues with these endpoints:
1. Check server logs for detailed error messages
2. Verify database migration was successful
3. Ensure proper authentication tokens
4. Review request body format

---

**Created**: 2025-01-23
**Version**: 1.0
**Phase**: 2 - League Management
