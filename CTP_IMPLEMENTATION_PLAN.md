# CTP Challenge System - GolfApp1 Implementation Plan

## Executive Summary

This plan outlines the implementation of a Closest-to-Pin (CTP) challenge system for GolfApp1 that allows:
- **Admins** to create CTP challenges in the web portal
- **Challenges** to automatically sync to the simulator PC
- **Users** to sign up and activate challenge sessions in the PWA
- **Simulator** to capture shots during active challenge sessions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WEB ADMIN PORTAL                                 │
│  • Browse courses (with hole/tee/pin details)                       │
│  • Create CTP challenge (select holes, tee, pin day, attempts)      │
│  • Preview challenge (distances, hole list)                         │
│  • Click "Go Live" → status changes to 'live'                       │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL DATABASE (Render)                     │
│  • simulator_courses_combined (existing)                            │
│  • course_holes (NEW - hole details, green centers)                 │
│  • hole_pins (NEW - pin positions per day)                          │
│  • hole_tees (NEW - tee positions with x/y/z coordinates)           │
│  • ctp_challenges (NEW - challenge definitions)                     │
│  • challenge_participants (NEW - user signups)                      │
│  • challenge_sessions (NEW - active user sessions)                  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     SIM PC SERVICE (Windows)                         │
│  • Course data sync (reads .gspcrse files, uploads to cloud)        │
│  • Challenge polling (checks for 'live' challenges every 10s)       │
│  • .crd file generation (creates GSPro custom round file)           │
│  • Session polling (checks for active challenge sessions)           │
│  • Shot capture (attaches challenge_session_id to shots)            │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     MOBILE PWA (play.nngolf.co)                      │
│  • Browse available challenges                                      │
│  • Sign up for challenge                                            │
│  • Activate session (tells sim to listen)                           │
│  • View live results during session                                 │
│  • View challenge leaderboard                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Schema (Cloud - GolfApp1)
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Status:** Not Started

#### 1.1 Create Migration File
**File:** `db/migrations/029_create_ctp_challenge_system.sql`

**Tables to Create:**

**A. course_holes**
- Links to `simulator_courses_combined` table
- Stores detailed hole information needed for CTP challenges
- Includes green center positions (x, y, z from GSPro coordinates)

```sql
CREATE TABLE course_holes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES simulator_courses_combined(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL,
    par INTEGER NOT NULL,
    hole_index INTEGER, -- Handicap index

    -- Green center position (from GSPro .gspcrse file)
    green_center_x DECIMAL(12, 6),
    green_center_y DECIMAL(12, 6),
    green_center_z DECIMAL(12, 6),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, hole_number)
);
```

**B. hole_pins**
- Stores pin positions for each day (Thursday/Friday/Saturday/Sunday)
- x, y, z coordinates from GSPro

```sql
CREATE TABLE hole_pins (
    id SERIAL PRIMARY KEY,
    course_hole_id INTEGER REFERENCES course_holes(id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL CHECK (day IN ('Thursday', 'Friday', 'Saturday', 'Sunday')),
    position_x DECIMAL(12, 6) NOT NULL,
    position_y DECIMAL(12, 6) NOT NULL,
    position_z DECIMAL(12, 6) NOT NULL,

    UNIQUE(course_hole_id, day)
);
```

**C. hole_tees**
- Stores tee positions for each tee type
- Includes distance in yards

```sql
CREATE TABLE hole_tees (
    id SERIAL PRIMARY KEY,
    course_hole_id INTEGER REFERENCES course_holes(id) ON DELETE CASCADE,
    tee_type VARCHAR(20) NOT NULL, -- 'Black', 'Blue', 'White', 'Yellow', 'Green', 'Red', 'Junior', 'Par3'
    distance INTEGER, -- Distance in yards from this tee
    position_x DECIMAL(12, 6) NOT NULL,
    position_y DECIMAL(12, 6) NOT NULL,
    position_z DECIMAL(12, 6) NOT NULL,

    UNIQUE(course_hole_id, tee_type)
);
```

**D. ctp_challenges**
- Main challenge definition table
- Status: 'draft', 'live', 'completed', 'cancelled'

```sql
CREATE TYPE challenge_status AS ENUM ('draft', 'live', 'completed', 'cancelled');
CREATE TYPE challenge_mode AS ENUM ('par3-holes', 'par3-tees');

CREATE TABLE ctp_challenges (
    id SERIAL PRIMARY KEY,
    challenge_uuid UUID DEFAULT gen_random_uuid() UNIQUE,

    -- Challenge definition
    name VARCHAR(255) NOT NULL,
    description TEXT,
    course_id INTEGER REFERENCES simulator_courses_combined(id) ON DELETE CASCADE,
    mode challenge_mode DEFAULT 'par3-holes',
    tee_type VARCHAR(20) DEFAULT 'White', -- Which tee to use
    pin_day VARCHAR(20) DEFAULT 'Thursday', -- Which pin position to use
    attempts_per_hole INTEGER DEFAULT 3,

    -- Selected holes (NULL = all eligible holes based on mode)
    selected_holes INTEGER[],

    -- Generated data (populated when status changes to 'live')
    total_holes INTEGER,
    total_shots INTEGER,
    holes_detail JSONB, -- Array of {hole, par, distance, tee_x, tee_y, tee_z, pin_x, pin_y, pin_z}

    -- The actual .crd file content (generated by sim PC, stored back to cloud)
    crd_content JSONB,
    crd_filename VARCHAR(255), -- Filename of the .crd file on sim PC

    -- Sync status
    status challenge_status DEFAULT 'draft',
    synced_to_sim_at TIMESTAMP, -- When sim PC downloaded this challenge
    sim_id VARCHAR(100), -- Which sim this challenge is for

    -- Metadata
    created_by INTEGER REFERENCES users(member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP, -- When admin clicked "Go Live"
    ended_at TIMESTAMP -- When challenge was completed or cancelled
);

CREATE INDEX idx_ctp_challenges_status ON ctp_challenges(status);
CREATE INDEX idx_ctp_challenges_course ON ctp_challenges(course_id);
CREATE INDEX idx_ctp_challenges_sim ON ctp_challenges(sim_id);
```

**E. challenge_participants**
- Tracks which users signed up for which challenges

```sql
CREATE TABLE challenge_participants (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES ctp_challenges(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,

    -- Participation status
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'completed', 'withdrawn')),

    -- Results (computed from shots)
    total_shots_taken INTEGER DEFAULT 0,
    best_shot_distance DECIMAL(6, 2), -- Closest shot in yards
    average_distance DECIMAL(6, 2),
    completed_holes INTEGER DEFAULT 0,

    -- Timestamps
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP, -- First shot taken
    completed_at TIMESTAMP, -- Last shot taken

    UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_status ON challenge_participants(status);
```

**F. challenge_sessions**
- Tracks active sessions for challenge participants
- Links to simulator_sessions for shot tracking

```sql
CREATE TABLE challenge_sessions (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES ctp_challenges(id) ON DELETE CASCADE,
    participant_id INTEGER REFERENCES challenge_participants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    sim_id VARCHAR(100) REFERENCES simulator_api_keys(sim_id),

    -- Session linkage (extends simulator_sessions for challenges)
    simulator_session_id INTEGER REFERENCES simulator_sessions(id),

    -- Session state
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,

    -- Progress tracking
    current_hole_index INTEGER DEFAULT 0, -- Which hole in the challenge they're on
    shots_taken INTEGER DEFAULT 0,

    -- Results for this session
    session_best_distance DECIMAL(6, 2),
    session_avg_distance DECIMAL(6, 2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_challenge_sessions_challenge ON challenge_sessions(challenge_id);
CREATE INDEX idx_challenge_sessions_participant ON challenge_sessions(participant_id);
CREATE INDEX idx_challenge_sessions_sim ON challenge_sessions(sim_id);
CREATE INDEX idx_challenge_sessions_status ON challenge_sessions(status);

-- Only one active challenge session per sim
CREATE UNIQUE INDEX idx_challenge_sessions_active_sim
    ON challenge_sessions(sim_id)
    WHERE status = 'active';
```

#### 1.2 Run Migration
```bash
psql $DATABASE_URL -f db/migrations/029_create_ctp_challenge_system.sql
```

#### 1.3 Verify Tables
```bash
psql $DATABASE_URL -c "\dt *challenge*"
psql $DATABASE_URL -c "\dt *hole*"
```

**Deliverables:**
- [x] Migration file created: `029_create_ctp_challenge_system.sql`
- [ ] Migration applied to production database
- [ ] Tables verified

---

### Phase 2: Course Data Sync API (Cloud - GolfApp1)
**Priority:** HIGH
**Estimated Time:** 4-5 hours
**Status:** Not Started

This API allows the sim PC to upload detailed course data (holes, pins, tees) to the cloud.

#### 2.1 API Endpoint: Upload Course Data
**Endpoint:** `POST /api/sim/courses/sync`
**Auth:** Simulator API Key (Bearer token)
**Purpose:** Sim PC uploads complete course data including hole details

**Request Body:**
```json
{
  "courseKey": "tobaccoroad_gsp",
  "courseName": "Tobacco Road",
  "courseId": 123, // ID from simulator_courses_combined
  "holes": [
    {
      "holeNumber": 3,
      "par": 3,
      "holeIndex": 15,
      "greenCenter": { "x": 100.5, "y": 10.2, "z": -50.3 },
      "pins": [
        { "day": "Thursday", "position": { "x": 98.2, "y": 10.5, "z": -48.1 } },
        { "day": "Friday", "position": { "x": 102.1, "y": 10.3, "z": -52.4 } },
        { "day": "Saturday", "position": { "x": 101.0, "y": 10.4, "z": -49.8 } },
        { "day": "Sunday", "position": { "x": 99.5, "y": 10.2, "z": -51.2 } }
      ],
      "tees": [
        { "type": "Black", "distance": 145, "position": { "x": 50.0, "y": 8.0, "z": 0.0 } },
        { "type": "White", "distance": 103, "position": { "x": 60.0, "y": 8.0, "z": 5.0 } },
        { "type": "Par3", "distance": 95, "position": { "x": 65.0, "y": 8.0, "z": 8.0 } }
      ]
    }
    // ... more holes
  ]
}
```

**Response:**
```json
{
  "success": true,
  "courseId": 123,
  "holesUpserted": 18,
  "pinsUpserted": 72,
  "teesUpserted": 126,
  "message": "Course data synced successfully"
}
```

**Implementation Location:** `server.js` (add around line 20400, near shot capture endpoints)

```javascript
// POST /api/sim/courses/sync - Sync course data from sim PC
app.post('/api/sim/courses/sync', authenticateSimulator, async (req, res) => {
  const { courseId, holes } = req.body;
  const simId = req.simId; // From authenticateSimulator middleware

  // Validation
  if (!courseId || !holes || !Array.isArray(holes)) {
    return res.status(400).json({ error: 'Invalid course data' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Upsert holes, pins, tees for each hole
    let holesUpserted = 0;
    let pinsUpserted = 0;
    let teesUpserted = 0;

    for (const hole of holes) {
      // Upsert hole
      const holeResult = await client.query(`
        INSERT INTO course_holes (
          course_id, hole_number, par, hole_index,
          green_center_x, green_center_y, green_center_z, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (course_id, hole_number) DO UPDATE SET
          par = EXCLUDED.par,
          hole_index = EXCLUDED.hole_index,
          green_center_x = EXCLUDED.green_center_x,
          green_center_y = EXCLUDED.green_center_y,
          green_center_z = EXCLUDED.green_center_z,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        courseId, hole.holeNumber, hole.par, hole.holeIndex,
        hole.greenCenter.x, hole.greenCenter.y, hole.greenCenter.z
      ]);

      const holeId = holeResult.rows[0].id;
      holesUpserted++;

      // Upsert pins
      if (hole.pins && Array.isArray(hole.pins)) {
        for (const pin of hole.pins) {
          await client.query(`
            INSERT INTO hole_pins (course_hole_id, day, position_x, position_y, position_z)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (course_hole_id, day) DO UPDATE SET
              position_x = EXCLUDED.position_x,
              position_y = EXCLUDED.position_y,
              position_z = EXCLUDED.position_z
          `, [holeId, pin.day, pin.position.x, pin.position.y, pin.position.z]);
          pinsUpserted++;
        }
      }

      // Upsert tees
      if (hole.tees && Array.isArray(hole.tees)) {
        for (const tee of hole.tees) {
          await client.query(`
            INSERT INTO hole_tees (course_hole_id, tee_type, distance, position_x, position_y, position_z)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (course_hole_id, tee_type) DO UPDATE SET
              distance = EXCLUDED.distance,
              position_x = EXCLUDED.position_x,
              position_y = EXCLUDED.position_y,
              position_z = EXCLUDED.position_z
          `, [holeId, tee.type, tee.distance, tee.position.x, tee.position.y, tee.position.z]);
          teesUpserted++;
        }
      }
    }

    await client.query('COMMIT');

    // Update sync status
    await client.query(`
      INSERT INTO sim_sync_status (sim_id, last_sync_at, updated_at)
      VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (sim_id) DO UPDATE SET
        last_sync_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [simId]);

    res.json({
      success: true,
      courseId,
      holesUpserted,
      pinsUpserted,
      teesUpserted,
      message: 'Course data synced successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Course sync error:', error);
    res.status(500).json({ error: 'Failed to sync course data' });
  } finally {
    client.release();
  }
});
```

#### 2.2 API Endpoint: Get CTP-Eligible Courses
**Endpoint:** `GET /api/courses/ctp-eligible`
**Auth:** JWT (admin or user)
**Purpose:** Get list of courses suitable for CTP challenges

**Response:**
```json
[
  {
    "id": 123,
    "name": "Tobacco Road",
    "location": "North Carolina",
    "par3HoleCount": 5,
    "par3HoleNumbers": [3, 6, 8, 14, 17],
    "hasPar3Tees": true,
    "hasHoleData": true
  }
]
```

#### 2.3 API Endpoint: Get Course Hole Details
**Endpoint:** `GET /api/courses/:courseId/holes`
**Auth:** JWT (admin or user)
**Purpose:** Get detailed hole information for challenge builder

**Response:**
```json
{
  "courseId": 123,
  "courseName": "Tobacco Road",
  "holes": [
    {
      "holeNumber": 3,
      "par": 3,
      "availableTees": [
        { "type": "Black", "distance": 145 },
        { "type": "White", "distance": 103 },
        { "type": "Par3", "distance": 95 }
      ],
      "availablePins": ["Thursday", "Friday", "Saturday", "Sunday"]
    }
  ]
}
```

**Deliverables:**
- [ ] `POST /api/sim/courses/sync` implemented
- [ ] `GET /api/courses/ctp-eligible` implemented
- [ ] `GET /api/courses/:courseId/holes` implemented
- [ ] Middleware `authenticateSimulator` verified
- [ ] Error handling tested
- [ ] Documentation updated

---

### Phase 3: Challenge Management API (Cloud - GolfApp1)
**Priority:** HIGH
**Estimated Time:** 6-8 hours
**Status:** Not Started

Admin API endpoints for creating and managing challenges.

#### 3.1 API Endpoints

**A. Create Challenge (Draft)**
```
POST /api/challenges
Auth: JWT (admin only)
Body: {
  "name": "Saturday CTP Battle",
  "description": "Test your accuracy!",
  "courseId": 123,
  "mode": "par3-holes",
  "teeType": "White",
  "pinDay": "Saturday",
  "attemptsPerHole": 3,
  "selectedHoles": [3, 6, 8, 14, 17], // null = all eligible
  "simId": "nn-sim-bay1"
}
Response: { "id": 456, "status": "draft", "uuid": "abc-123...", ... }
```

**B. Update Challenge**
```
PUT /api/challenges/:id
Auth: JWT (admin only)
Body: { "name": "Updated name", ... }
```

**C. Go Live (Admin clicks "Go Live")**
```
PUT /api/challenges/:id/go-live
Auth: JWT (admin only)
Purpose: Changes status to 'live', triggers sim PC to download
Response: { "success": true, "status": "live", "startedAt": "2025-12-05..." }
```

**D. Get Challenge Details**
```
GET /api/challenges/:id
Auth: JWT (admin or participant)
Response: Full challenge details including holes, participants, leaderboard
```

**E. List Challenges**
```
GET /api/challenges
Auth: JWT
Query: ?status=live&simId=nn-sim-bay1
Response: Array of challenges
```

**F. Cancel Challenge**
```
PUT /api/challenges/:id/cancel
Auth: JWT (admin only)
```

**Implementation:**
- Admin role check middleware
- Challenge validation logic
- Compute holes_detail when going live
- Calculate distances for each hole

**Deliverables:**
- [ ] All 6 endpoints implemented
- [ ] Admin-only middleware created
- [ ] Challenge validation logic
- [ ] Error handling

---

### Phase 4: Challenge Sync for Sim PC (Cloud API)
**Priority:** HIGH
**Estimated Time:** 3-4 hours
**Status:** Not Started

API endpoints for sim PC to poll for new challenges and confirm sync.

#### 4.1 API Endpoints

**A. Poll for Pending Challenges**
```
GET /api/sim/challenges/pending
Auth: Simulator API Key
Purpose: Sim PC polls every 10 seconds for challenges with status='live' and synced_to_sim_at IS NULL
Response: [
  {
    "id": 456,
    "uuid": "abc-123...",
    "name": "Saturday CTP Battle",
    "courseId": 123,
    "courseName": "Tobacco Road",
    "mode": "par3-holes",
    "teeType": "White",
    "pinDay": "Saturday",
    "attemptsPerHole": 3,
    "holesDetail": [
      {
        "hole": 3,
        "par": 3,
        "distance": 103,
        "teePos": { "x": 60.0, "y": 8.0, "z": 5.0 },
        "pinPos": { "x": 101.0, "y": 10.4, "z": -49.8 }
      }
    ]
  }
]
```

**B. Confirm Challenge Synced**
```
PUT /api/sim/challenges/:id/synced
Auth: Simulator API Key
Body: {
  "crdFilename": "abc-123-Saturday-CTP-Battle.crd",
  "crdContent": { ... } // The generated .crd file content
}
Purpose: Sim PC confirms .crd file was created successfully
Response: { "success": true }
```

**C. Report Sync Error**
```
PUT /api/sim/challenges/:id/sync-error
Auth: Simulator API Key
Body: { "error": "Failed to read course file" }
```

**Deliverables:**
- [ ] `GET /api/sim/challenges/pending` implemented
- [ ] `PUT /api/sim/challenges/:id/synced` implemented
- [ ] `PUT /api/sim/challenges/:id/sync-error` implemented
- [ ] Tested with sim PC polling

---

### Phase 5: User Challenge Participation API (Cloud + PWA)
**Priority:** MEDIUM
**Estimated Time:** 6-8 hours
**Status:** Not Started

API and UI for users to browse, sign up, and activate challenge sessions.

#### 5.1 API Endpoints

**A. Browse Available Challenges**
```
GET /api/challenges/available
Auth: JWT
Purpose: Get list of 'live' challenges user can participate in
Response: Array of challenges with participant counts, user signup status
```

**B. Sign Up for Challenge**
```
POST /api/challenges/:id/signup
Auth: JWT
Purpose: User registers for a challenge
Response: { "participantId": 789, "status": "registered" }
```

**C. Activate Challenge Session**
```
POST /api/challenges/:id/activate-session
Auth: JWT
Body: { "simId": "nn-sim-bay1" }
Purpose: User tells system they're about to start playing
Creates challenge_session with status='active'
Creates simulator_session linked to challenge_session
Response: {
  "sessionId": 999,
  "challengeId": 456,
  "participantId": 789,
  "status": "active",
  "crdFilename": "abc-123-Saturday-CTP-Battle.crd",
  "message": "Session activated. Load CRD file in GSPro."
}
```

**D. Get Active Challenge Session**
```
GET /api/challenges/my-active-session
Auth: JWT
Purpose: Check if user has an active challenge session
Response: { ... } or null
```

**E. End Challenge Session**
```
PUT /api/challenges/:id/end-session
Auth: JWT
Purpose: User finishes their challenge attempt
Response: { "success": true, "results": { ... } }
```

**F. Get Challenge Leaderboard**
```
GET /api/challenges/:id/leaderboard
Auth: JWT
Response: [
  {
    "rank": 1,
    "userId": 123,
    "userName": "John Doe",
    "bestDistance": 2.5,
    "avgDistance": 8.3,
    "shotsTaken": 15,
    "completedHoles": 5
  }
]
```

#### 5.2 PWA UI Components (client/src)

**A. Challenge Browser Page**
- Location: `client/src/pages/ChallengeBrowser.jsx`
- Features:
  - List of available challenges
  - Filter by status, course
  - Show participant count
  - "Sign Up" button

**B. Challenge Details Page**
- Location: `client/src/pages/ChallengeDetails.jsx`
- Features:
  - Challenge info (course, holes, tee, pin, attempts)
  - Hole list with distances
  - Participant list
  - Leaderboard
  - "Activate Session" button (if signed up)

**C. Active Session Component**
- Location: `client/src/components/ActiveChallengeSession.jsx`
- Features:
  - Shows current challenge session
  - Progress indicator (holes completed / total holes)
  - Live shot tracking
  - Best distance so far
  - "End Session" button

**Deliverables:**
- [ ] All 6 API endpoints implemented
- [ ] PWA pages created
- [ ] UI components styled
- [ ] Navigation added to main menu
- [ ] Mobile-responsive design

---

### Phase 6: Admin Challenge Builder UI (Cloud - React)
**Priority:** MEDIUM
**Estimated Time:** 8-10 hours
**Status:** Not Started

Admin interface for creating and managing challenges.

#### 6.1 Admin UI Components (client/src)

**A. Challenge Builder Page**
- Location: `client/src/pages/admin/ChallengeBuilder.jsx`
- Features:
  - Step 1: Select Course
    - Dropdown of CTP-eligible courses
    - Shows course info (location, par 3 holes)
  - Step 2: Configure Challenge
    - Challenge name and description
    - Mode: Par 3 Holes or Par 3 Tees
    - Select tee type
    - Select pin day
    - Attempts per hole
    - Select specific holes or "All"
  - Step 3: Preview
    - Show hole list with distances
    - Total holes / total shots
    - Confirm details
  - Step 4: Save as Draft or Go Live
    - "Save Draft" button
    - "Go Live" button (makes challenge active immediately)

**B. Challenge Management Dashboard**
- Location: `client/src/pages/admin/ChallengeDashboard.jsx`
- Features:
  - List all challenges (draft, live, completed)
  - Filter by status, course, sim
  - Actions: Edit (draft only), View, Cancel, Go Live (draft only)
  - Show participant count per challenge
  - Show sync status for live challenges

**C. Challenge Results View**
- Location: `client/src/pages/admin/ChallengeResults.jsx`
- Features:
  - Full leaderboard
  - Individual participant results
  - Shot-by-shot details
  - Export to CSV

**Deliverables:**
- [ ] Admin pages created
- [ ] Challenge builder form implemented
- [ ] Course selection with preview
- [ ] Hole distance calculations (client-side preview)
- [ ] Management dashboard
- [ ] Results view
- [ ] Admin-only route protection

---

### Phase 7: Sim PC Service Extensions (Documentation for Sim PC Developer)
**Priority:** HIGH
**Estimated Time:** 1-2 hours (documentation only)
**Status:** Not Started

Create comprehensive guide for sim PC developer to implement their side.

#### 7.1 Sim PC Requirements Document

**File:** `SIM_PC_CTP_INTEGRATION_GUIDE.md`

**Contents:**
1. **Course Data Sync**
   - How to read .gspcrse files
   - Parse hole data (par, index, green center, pins, tees)
   - POST to `/api/sim/courses/sync`
   - Run on startup and when courses change

2. **Challenge Polling**
   - Poll `GET /api/sim/challenges/pending` every 10 seconds
   - Generate .crd file using challenge data
   - Save to `E:\Core\GSP\CustomRounds\`
   - POST to `/api/sim/challenges/:id/synced` when done

3. **Session Polling**
   - Poll for active challenge sessions
   - Endpoint: `GET /api/sim/active-challenge-session` (new endpoint needed)
   - Attach `challenge_session_id` to shots

4. **Shot Capture Integration**
   - When shot is captured, check for active challenge session
   - Add `challenge_session_id` field to shot upload
   - Existing `/api/shots` endpoint will handle it

5. **.crd File Generation**
   - Format specifications
   - Example code
   - GSPro custom round structure

6. **Error Handling**
   - Retry logic
   - Logging
   - Health monitoring

**Deliverables:**
- [ ] Complete integration guide created
- [ ] API examples provided
- [ ] .crd generation code snippet
- [ ] Error handling recommendations
- [ ] Testing checklist

---

### Phase 8: Shot Tracking Integration (Cloud - Extend Existing)
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours
**Status:** Not Started

Extend existing shot capture system to support challenge shots.

#### 8.1 Extend shots Table
Add column to existing `shots` table:
```sql
ALTER TABLE shots ADD COLUMN challenge_session_id INTEGER REFERENCES challenge_sessions(id);
CREATE INDEX idx_shots_challenge_session ON shots(challenge_session_id);
```

#### 8.2 Update Shot Upload Endpoint
Modify `POST /api/shots` to accept optional `challenge_session_id`:
```javascript
// In existing shot upload handler
if (req.body.challenge_session_id) {
  // Validate challenge session exists and is active
  const sessionCheck = await pool.query(
    'SELECT id FROM challenge_sessions WHERE id = $1 AND status = $\'active\'',
    [req.body.challenge_session_id]
  );

  if (sessionCheck.rows.length > 0) {
    shotData.challenge_session_id = req.body.challenge_session_id;
  }
}
```

#### 8.3 Challenge Session Stats Update
Create trigger to update challenge session stats when shots are added:
```sql
CREATE OR REPLACE FUNCTION update_challenge_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.challenge_session_id IS NOT NULL THEN
    UPDATE challenge_sessions
    SET shots_taken = shots_taken + 1,
        session_best_distance = LEAST(
          COALESCE(session_best_distance, 999999),
          COALESCE(NEW.carry_distance, 999999)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.challenge_session_id;

    -- Also update participant stats
    UPDATE challenge_participants cp
    SET total_shots_taken = total_shots_taken + 1,
        best_shot_distance = LEAST(
          COALESCE(best_shot_distance, 999999),
          COALESCE(NEW.carry_distance, 999999)
        )
    FROM challenge_sessions cs
    WHERE cs.id = NEW.challenge_session_id
      AND cp.id = cs.participant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_challenge_session_stats
    AFTER INSERT ON shots
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_session_stats();
```

**Deliverables:**
- [ ] shots table column added
- [ ] Shot upload endpoint updated
- [ ] Trigger function created
- [ ] Stats calculation verified

---

### Phase 9: Testing & Documentation
**Priority:** HIGH
**Estimated Time:** 4-6 hours
**Status:** Not Started

End-to-end testing and documentation.

#### 9.1 Testing Checklist

**Database Tests:**
- [ ] All migrations run successfully
- [ ] Indexes created properly
- [ ] Triggers fire correctly
- [ ] Constraints enforced

**API Tests:**
- [ ] Course sync API works
- [ ] Challenge CRUD operations work
- [ ] Challenge go-live flow works
- [ ] Sim PC polling gets pending challenges
- [ ] User signup and session activation works
- [ ] Shot capture with challenge_session_id works
- [ ] Leaderboard calculations correct

**UI Tests:**
- [ ] Admin can create challenge
- [ ] Admin can preview challenge before going live
- [ ] User can browse challenges
- [ ] User can sign up
- [ ] User can activate session
- [ ] Active session UI updates with shots
- [ ] Leaderboard displays correctly

**Integration Tests:**
- [ ] Full flow: Admin creates → Sim downloads → User plays → Shots tracked → Leaderboard updates

#### 9.2 Documentation

**Files to Create/Update:**
- [ ] `CTP_SYSTEM_OVERVIEW.md` - High-level system overview
- [ ] `SIM_PC_CTP_INTEGRATION_GUIDE.md` - Detailed sim PC developer guide
- [ ] `API_DOCUMENTATION.md` - All API endpoints documented
- [ ] `ADMIN_USER_GUIDE.md` - How to create and manage challenges
- [ ] `USER_GUIDE.md` - How to participate in challenges
- [ ] Update `README.md` with CTP system info

---

## Implementation Timeline

### Week 1: Core Infrastructure
- Day 1-2: Phase 1 (Database Schema)
- Day 3-4: Phase 2 (Course Data Sync API)
- Day 5: Phase 4 (Challenge Sync for Sim PC)

### Week 2: Challenge Management
- Day 1-3: Phase 3 (Challenge Management API)
- Day 4-5: Phase 6 (Admin Challenge Builder UI)

### Week 3: User Features
- Day 1-3: Phase 5 (User Participation API + PWA)
- Day 4: Phase 8 (Shot Tracking Integration)
- Day 5: Phase 9 (Testing & Documentation)

### Week 4: Sim PC Integration & Testing
- Day 1-2: Phase 7 (Sim PC integration with provided guide)
- Day 3-5: End-to-end testing and bug fixes

**Total Estimated Time:** 3-4 weeks

---

## Key Decisions & Assumptions

1. **Course Data Source:** Sim PC will read .gspcrse files and sync to cloud
2. **Challenge Sync Method:** Polling (every 10 seconds) - simpler than webhooks
3. **Admin Permissions:** Use existing role system (users.role = 'Admin')
4. **Mobile App:** PWA at play.nngolf.co (existing React app)
5. **Challenge Modes:** Both par3-holes and par3-tees supported
6. **CRD File Storage:** Sim PC stores locally, optionally uploads JSON back to cloud
7. **Session Activation:** User activates via PWA, sim PC polls for active sessions
8. **Shot Attribution:** Sim PC includes `challenge_session_id` when uploading shots

---

## API Authentication Summary

| Endpoint Category | Auth Method | Token Type |
|-------------------|-------------|------------|
| Course Sync | Simulator API Key | Bearer (from simulator_api_keys) |
| Challenge CRUD (Admin) | JWT | User token (role=Admin) |
| Challenge Participation | JWT | User token |
| Sim Challenge Polling | Simulator API Key | Bearer |
| Shot Upload | Simulator API Key | Bearer |

---

## Database Relationships

```
simulator_courses_combined
  ↓ (1:many)
course_holes
  ↓ (1:many)
hole_pins
hole_tees

ctp_challenges
  ↓ (1:many)
challenge_participants
  ↓ (1:many)
challenge_sessions
  ↓ (1:many)
shots
```

---

## Next Steps

1. **Review this plan** with the team
2. **Create Phase 1 migration file** (database schema)
3. **Run migration** on staging database
4. **Begin Phase 2** (Course Sync API)
5. **Coordinate with sim PC developer** on their timeline

---

## Questions for Team

1. Which simulator(s) will support CTP challenges initially?
2. Do we need challenge templates (pre-defined popular challenges)?
3. Should users be able to create their own custom challenges, or admin-only?
4. Do we want challenge prizes/rewards tracking?
5. Should challenges have start/end dates, or be always available?
6. Do we need challenge categories (e.g., "Beginner", "Advanced", "Pro")?

---

*Last Updated: 2025-12-05*
*Document Version: 1.0*
