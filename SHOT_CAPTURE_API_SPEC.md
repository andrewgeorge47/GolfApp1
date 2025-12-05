# Shot Capture API Specification - Developer Handoff

## Overview

This document provides complete API specifications for integrating simulator PCs with the NN cloud backend. All endpoints are deployed on Render and ready to receive shot data from your local simulator listener service.

---

## Table of Contents

1. [Base URLs](#base-urls)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Upload Shot](#1-upload-shot)
   - [Get Active Session](#2-get-active-session)
   - [Create Session](#3-create-session)
   - [End Session](#4-end-session)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Local Database Schema](#local-database-schema)
7. [Implementation Guide](#implementation-guide)
8. [Testing](#testing)
9. [Example Payloads](#example-payloads)

---

## Base URLs

### Production
```
https://your-app.onrender.com
```

### Staging (for development/testing)
```
https://your-app-staging.onrender.com
```

**Note**: Replace with your actual Render URLs. Contact admin for exact URLs.

---

## Authentication

### Simulator Authentication

Each simulator PC authenticates using an API key provided in the `Authorization` header.

#### Header Format
```
Authorization: Bearer <SIM_API_KEY>
```

#### Example
```
Authorization: Bearer nn-sim-bay1-prod-a1b2c3d4e5f6
```

### Getting Your API Key

1. Contact NN admin to provision an API key for your simulator
2. You will receive:
   - `sim_id`: Unique identifier for your simulator (e.g., `nn-sim-bay1-prod`)
   - `api_key`: Authentication token for API calls
   - `sim_name`: Friendly name (e.g., "NN Club - Bay 1")
   - `location`: Physical location

### Test API Key (Development Only)

For local development and testing:
```
sim_id: nn-sim-bay1-dev
api_key: dev-test-key-12345-REPLACE-WITH-REAL-KEY
```

**⚠️ WARNING**: Never commit API keys to source control!

---

## API Endpoints

### 1. Upload Shot

Upload a single shot from the simulator to the cloud.

#### Endpoint
```
POST /api/shots
```

#### Authentication
Simulator API Key (required)

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | string (UUID) | **Yes** | Globally unique shot ID (generate on sim PC) |
| `timestamp` | string (ISO 8601) | **Yes** | When the shot was hit (e.g., "2025-12-04T15:30:00Z") |
| `club` | string | No | Club used (e.g., "Driver", "7 Iron", "Pitching Wedge") |
| `ball_speed` | number | No | Ball speed in mph |
| `club_speed` | number | No | Club speed in mph |
| `smash_factor` | number | No | Smash factor (ball_speed / club_speed) |
| `launch_angle` | number | No | Launch angle in degrees |
| `launch_direction` | number | No | Launch direction in degrees (+ is right, - is left) |
| `spin_rate` | integer | No | Spin rate in rpm |
| `spin_axis` | integer | No | Spin axis in degrees |
| `carry_distance` | number | No | Carry distance in yards |
| `total_distance` | number | No | Total distance in yards |
| `offline` | number | No | Offline distance in yards (+ is right, - is left) |
| `apex_height` | number | No | Apex height in yards |
| `descent_angle` | number | No | Descent angle in degrees |
| `hole_number` | integer | No | Hole number if playing a course |
| `shot_number` | integer | No | Shot number in the session |
| `course_name` | string | No | Course name if playing a course |
| `session_id` | integer | No | Session ID (if known, otherwise API auto-attaches) |
| `nn_player_id` | integer | No | NN member ID (if known, otherwise API auto-attaches) |
| `raw_gspro_data` | object | No | Complete GSPro payload as JSON for debugging |
| `source` | string | No | Source system (default: "gspro") |

#### Example Request
```bash
curl -X POST https://your-app.onrender.com/api/shots \
  -H "Authorization: Bearer nn-sim-bay1-dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-12-04T15:30:00Z",
    "club": "Driver",
    "ball_speed": 165.3,
    "club_speed": 112.5,
    "smash_factor": 1.47,
    "launch_angle": 12.5,
    "launch_direction": 2.3,
    "spin_rate": 2450,
    "spin_axis": 5,
    "carry_distance": 285.2,
    "total_distance": 295.8,
    "offline": 8.5,
    "apex_height": 32.1,
    "descent_angle": 42.5,
    "hole_number": 1,
    "shot_number": 1,
    "course_name": "Pebble Beach",
    "raw_gspro_data": {
      "Player": "John Doe",
      "Club": "1W",
      "BallSpeed": 165.3,
      "... full GSPro payload ..."
    }
  }'
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Shot recorded successfully",
  "shot_id": 12345,
  "shot_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": 789,
  "nn_player_id": 456
}
```

#### Error Responses

**400 Bad Request** - Missing required fields
```json
{
  "error": "Missing required field: uuid"
}
```

**401 Unauthorized** - Invalid API key
```json
{
  "error": "Invalid API key"
}
```

**500 Internal Server Error** - Server error
```json
{
  "error": "Failed to record shot",
  "details": "Database connection failed"
}
```

#### Idempotency

- The endpoint is **idempotent** based on the `uuid` field
- If the same `uuid` is sent multiple times, the shot will be updated (not duplicated)
- This makes retries safe if network fails mid-request
- Always use a proper UUID v4 for each shot

---

### 2. Get Active Session

Get the currently active session for your simulator (if any).

#### Endpoint
```
GET /api/sims/:simId/active-session
```

#### Authentication
Simulator API Key (required)

#### URL Parameters
- `simId`: Your simulator ID (e.g., `nn-sim-bay1-prod`)

#### Example Request
```bash
curl -X GET https://your-app.onrender.com/api/sims/nn-sim-bay1-prod/active-session \
  -H "Authorization: Bearer nn-sim-bay1-dev-api-key"
```

#### Success Response (200 OK)

**With active session:**
```json
{
  "active_session": {
    "session_id": 789,
    "session_uuid": "660f9511-f3ac-52e5-b827-557766551111",
    "nn_player_id": 456,
    "player_name": "John Doe",
    "player_email": "john@example.com",
    "started_at": "2025-12-04T15:00:00Z",
    "session_type": "practice",
    "course_name": "Pebble Beach",
    "total_shots": 25
  }
}
```

**No active session:**
```json
{
  "active_session": null
}
```

#### Use Case

Your listener service can periodically call this endpoint (e.g., every 30 seconds) to check if someone has started a session via the web app. If a session exists, attach the `session_id` and `nn_player_id` to subsequent shots.

---

### 3. Create Session

Create a new session (called by web app, not by simulator PC).

**Note**: This endpoint is primarily for the web app to call when a user starts a session. Your simulator listener service typically only needs to **read** active sessions, not create them.

#### Endpoint
```
POST /api/sims/:simId/sessions
```

#### Authentication
User JWT Token (required)

---

### 4. End Session

End an active session (called by web app, not by simulator PC).

**Note**: This endpoint is primarily for the web app to call when a user ends their session. Your simulator listener service typically only needs to **read** active sessions, not end them.

#### Endpoint
```
PUT /api/sims/:simId/sessions/:sessionId/end
```

#### Authentication
User JWT Token (required)

---

## Data Models

### Shot Object

```typescript
interface Shot {
  // Identifiers
  uuid: string;              // UUID v4
  sim_id: string;
  session_id?: number | null;
  nn_player_id?: number | null;

  // Timing
  timestamp: string;         // ISO 8601 format

  // Shot Data
  club?: string;
  ball_speed?: number;       // mph
  club_speed?: number;       // mph
  smash_factor?: number;     // calculated

  launch_angle?: number;     // degrees
  launch_direction?: number; // degrees

  spin_rate?: number;        // rpm
  spin_axis?: number;        // degrees

  carry_distance?: number;   // yards
  total_distance?: number;   // yards
  offline?: number;          // yards

  apex_height?: number;      // yards
  descent_angle?: number;    // degrees

  // Context
  hole_number?: number;
  shot_number?: number;
  course_name?: string;

  // Raw Data
  raw_gspro_data?: object;   // Full GSPro payload
  source?: string;           // Default: "gspro"
}
```

### Active Session Object

```typescript
interface ActiveSession {
  session_id: number;
  session_uuid: string;      // UUID v4
  nn_player_id?: number | null;
  player_name?: string | null;
  player_email?: string | null;
  started_at: string;        // ISO 8601 format
  session_type?: string;     // "practice", "tournament", "challenge", etc.
  course_name?: string | null;
  total_shots: number;
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue normally |
| 201 | Created | Shot was recorded successfully |
| 400 | Bad Request | Check request payload, fix missing/invalid fields |
| 401 | Unauthorized | Check API key is correct |
| 403 | Forbidden | Simulator is deactivated, contact admin |
| 404 | Not Found | Endpoint or resource doesn't exist |
| 500 | Server Error | Retry with exponential backoff |

### Retry Strategy

For **failed shot uploads** (500 errors or network failures):

1. **Immediate Retry**: Wait 1 second, retry once
2. **Exponential Backoff**: If still failing, retry with increasing delays:
   - 2 seconds
   - 4 seconds
   - 8 seconds
   - 16 seconds
   - 30 seconds
   - 60 seconds
   - Then retry every 60 seconds indefinitely

3. **Never Give Up**: Keep retrying until the shot is marked as `synced = true` in your local database
4. **Error Logging**: Log each failure in your local `nn_shots` table for debugging

### Example Retry Logic (Pseudocode)

```javascript
async function uploadShotWithRetry(shot) {
  let retryCount = 0;
  let delay = 1000; // Start with 1 second

  while (true) {
    try {
      const response = await fetch('/api/shots', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shot)
      });

      if (response.ok) {
        // Success! Mark as synced in local DB
        await markShotSynced(shot.uuid);
        return;
      }

      if (response.status >= 400 && response.status < 500) {
        // Client error (4xx) - don't retry, log error
        await logShotError(shot.uuid, await response.text());
        return;
      }

      // Server error (5xx) - retry with backoff
      throw new Error(`Server error: ${response.status}`);

    } catch (error) {
      retryCount++;
      console.error(`Upload failed (attempt ${retryCount}):`, error.message);

      // Log error in local database
      await logShotError(shot.uuid, error.message);

      // Wait before retry (exponential backoff, max 60 seconds)
      await sleep(Math.min(delay, 60000));
      delay = Math.min(delay * 2, 60000);
    }
  }
}
```

---

## Local Database Schema

### Recommended SQLite Schema

Store shots locally on the sim PC for redundancy and offline operation.

```sql
CREATE TABLE nn_shots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identifiers
    uuid TEXT NOT NULL UNIQUE,
    sim_id TEXT NOT NULL,

    -- Shot data (same as API payload)
    timestamp TEXT NOT NULL,
    club TEXT,
    ball_speed REAL,
    club_speed REAL,
    smash_factor REAL,
    launch_angle REAL,
    launch_direction REAL,
    spin_rate INTEGER,
    spin_axis INTEGER,
    carry_distance REAL,
    total_distance REAL,
    offline REAL,
    apex_height REAL,
    descent_angle REAL,
    hole_number INTEGER,
    shot_number INTEGER,
    course_name TEXT,

    -- Session info
    session_id INTEGER,
    nn_player_id INTEGER,

    -- Raw GSPro payload (as JSON text)
    raw_gspro_data TEXT,

    -- Sync status
    synced BOOLEAN DEFAULT 0,          -- 0 = not synced, 1 = successfully synced
    sync_attempted_at TEXT,            -- Last sync attempt timestamp
    sync_succeeded_at TEXT,            -- When sync succeeded
    sync_error_message TEXT,           -- Last error message if failed
    sync_retry_count INTEGER DEFAULT 0, -- Number of retry attempts

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nn_shots_uuid ON nn_shots(uuid);
CREATE INDEX idx_nn_shots_synced ON nn_shots(synced);
CREATE INDEX idx_nn_shots_timestamp ON nn_shots(timestamp DESC);
```

### Database File Location

Recommended path on Windows:
```
C:\NN\nn_sim.db
```

On development machine:
```
.\nn_sim_dev.db
```

---

## Implementation Guide

### Step-by-Step Implementation

#### 1. Set Up Local Database

```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:\\NN\\nn_sim.db');

// Create table on startup
db.run(`CREATE TABLE IF NOT EXISTS nn_shots (...)`);
```

#### 2. Listen to GSPro Database

Your existing listener already reads GSPro's databases. When a new shot is detected:

```javascript
function onNewShotFromGSPro(gsprosh_shot) {
  // Normalize GSPro data to NN format
  const nnShot = {
    uuid: generateUUID(),
    sim_id: SIM_ID,
    timestamp: new Date().toISOString(),
    club: normalizeClubName(gsproShot.Club),
    ball_speed: gsproShot.BallSpeed,
    club_speed: gsproShot.ClubSpeed,
    // ... map all fields
    raw_gspro_data: gsproShot // preserve original
  };

  // 1. Insert into local NN database
  await insertShotToLocalDB(nnShot);

  // 2. Send to iPhone app via WebSocket (existing code)
  websocket.send(JSON.stringify(nnShot));

  // 3. Trigger cloud sync (non-blocking)
  cloudSyncQueue.enqueue(nnShot);
}
```

#### 3. Cloud Sync Loop

Run a background loop that continuously syncs unsynced shots:

```javascript
async function cloudSyncLoop() {
  while (true) {
    // Get unsynced shots from local DB
    const unsyncedShots = await db.all(
      'SELECT * FROM nn_shots WHERE synced = 0 ORDER BY timestamp ASC LIMIT 10'
    );

    for (const shot of unsyncedShots) {
      await uploadShotWithRetry(shot);
    }

    // Wait before next batch
    await sleep(5000); // 5 seconds
  }
}

// Start sync loop on app startup
cloudSyncLoop();
```

#### 4. Session Polling

Periodically check for active sessions:

```javascript
async function pollActiveSession() {
  while (true) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/sims/${SIM_ID}/active-session`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          }
        }
      );

      const data = await response.json();

      if (data.active_session) {
        // Store current session info
        currentSession = data.active_session;
        console.log('Active session:', currentSession);
      } else {
        currentSession = null;
      }

    } catch (error) {
      console.error('Failed to poll active session:', error);
    }

    await sleep(30000); // Poll every 30 seconds
  }
}

// Start polling on app startup
pollActiveSession();
```

---

## Testing

### Test with cURL

#### 1. Upload a Test Shot

```bash
curl -X POST https://your-app-staging.onrender.com/api/shots \
  -H "Authorization: Bearer dev-test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "test-shot-001",
    "timestamp": "2025-12-04T15:30:00Z",
    "club": "Driver",
    "ball_speed": 165.3,
    "carry_distance": 285.2
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Shot recorded successfully",
  "shot_id": 1,
  "shot_uuid": "test-shot-001",
  "session_id": null,
  "nn_player_id": null
}
```

#### 2. Check Active Session

```bash
curl -X GET https://your-app-staging.onrender.com/api/sims/nn-sim-bay1-dev/active-session \
  -H "Authorization: Bearer dev-test-key-12345"
```

Expected response (if no active session):
```json
{
  "active_session": null
}
```

### Testing Checklist

- [ ] Can authenticate with API key
- [ ] Can upload a shot successfully
- [ ] Shot appears in central database
- [ ] Can handle duplicate UUIDs (idempotency)
- [ ] Can retrieve active session
- [ ] Retry logic works when API is unreachable
- [ ] Local database persists shots correctly
- [ ] Sync status is updated correctly

---

## Example Payloads

### Minimal Shot (only required fields)

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-04T15:30:00Z"
}
```

### Complete Shot (all fields)

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-04T15:30:00.123Z",
  "session_id": 789,
  "nn_player_id": 456,

  "club": "Driver",
  "ball_speed": 165.3,
  "club_speed": 112.5,
  "smash_factor": 1.47,

  "launch_angle": 12.5,
  "launch_direction": 2.3,

  "spin_rate": 2450,
  "spin_axis": 5,

  "carry_distance": 285.2,
  "total_distance": 295.8,
  "offline": 8.5,

  "apex_height": 32.1,
  "descent_angle": 42.5,

  "hole_number": 1,
  "shot_number": 1,
  "course_name": "Pebble Beach",

  "raw_gspro_data": {
    "Player": "John Doe",
    "Club": "1W",
    "BallSpeed": 165.3,
    "ClubSpeed": 112.5,
    "LaunchAngle": 12.5,
    "LaunchDirection": 2.3,
    "SpinRate": 2450,
    "SpinAxis": 5,
    "CarryDistance": 285.2,
    "TotalDistance": 295.8,
    "Offline": 8.5,
    "ApexHeight": 32.1,
    "DescentAngle": 42.5
  },

  "source": "gspro"
}
```

### Raw GSPro Data Structure (Example)

This is what you might receive from GSPro and should pass through in `raw_gspro_data`:

```json
{
  "ShotNumber": 1,
  "Player": {
    "Name": "John Doe",
    "Handicap": 12
  },
  "Club": {
    "Name": "Driver",
    "Type": "1W",
    "Loft": 10.5
  },
  "BallData": {
    "Speed": 165.3,
    "LaunchAngle": 12.5,
    "LaunchDirection": 2.3,
    "SpinRate": 2450,
    "SpinAxis": 5,
    "CarryDistance": 285.2,
    "TotalDistance": 295.8,
    "Offline": 8.5,
    "ApexHeight": 32.1,
    "DescentAngle": 42.5
  },
  "ClubData": {
    "Speed": 112.5,
    "Path": 1.2,
    "FaceAngle": 0.8,
    "AttackAngle": -1.5,
    "ImpactPoint": {
      "X": 0.2,
      "Y": -0.1
    }
  },
  "Environment": {
    "Temperature": 72,
    "Humidity": 65,
    "Pressure": 29.92,
    "Wind": {
      "Speed": 5,
      "Direction": 90
    }
  },
  "Timestamp": "2025-12-04T15:30:00.123Z"
}
```

---

## Support

### Contact

- **NN Admin**: For API keys, sim provisioning, and production access
- **Technical Issues**: Check server logs, verify API key, test with staging URL
- **Database Questions**: Review migration file `028_create_shot_capture_system.sql`

### Debugging

1. **Check API key**: Make sure it's in the `Authorization: Bearer` header
2. **Verify sim_id**: Must match the one provisioned for your API key
3. **Validate UUIDs**: Must be valid UUID v4 format
4. **Check timestamps**: Must be valid ISO 8601 format
5. **Test with staging**: Always test on staging before production
6. **Check local logs**: Your listener service should log all API responses

---

## Summary

**What you need to do:**

1. ✅ Get API key from NN admin
2. ✅ Create local SQLite database (`nn_sim.db`)
3. ✅ When GSPro records a shot:
   - Normalize to NN format
   - Generate UUID
   - Insert into local DB
   - Send to iPhone WebSocket (existing code)
4. ✅ Run background sync loop:
   - Query local DB for unsynced shots
   - POST to `/api/shots`
   - Mark as synced on success
   - Retry on failure with exponential backoff
5. ✅ Optionally poll for active sessions:
   - GET `/api/sims/:simId/active-session` every 30 seconds
   - Attach `session_id` and `nn_player_id` to shots if session exists

**What NN provides:**

- ✅ Database tables (shots, sessions, api keys, sync status)
- ✅ API endpoints (POST /api/shots, GET active session)
- ✅ Idempotent shot upload (safe to retry)
- ✅ Automatic session attachment if you don't provide session_id
- ✅ Error tracking and sync monitoring

---

*Last Updated: 2025-12-04*
*API Version: 1.0*
