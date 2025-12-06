# Sim PC - CTP Challenge Integration Guide
**For nn-no5 Simulator**

## Overview

This guide explains how to integrate CTP (Closest-to-Pin) challenge functionality into your existing shot capture system on the nn-no5 simulator.

The CTP system adds three new responsibilities to your sim PC service:
1. **Course data sync** - Upload detailed hole/tee/pin data to cloud
2. **Challenge polling** - Check for new CTP challenges and generate .crd files
3. **Session tracking** - Detect active CTP sessions and attach shots to challenges

---

## Prerequisites

You already have:
- ✅ Shot capture system running (POST /api/shots)
- ✅ Simulator API key: `nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af`
- ✅ Base URL: `https://golfapp1.onrender.com`
- ✅ GSPro installed with courses at `E:\Core\GSP\Courses\`

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   GSPro (Unchanged)                        │
│  Courses: E:\Core\GSP\Courses\{course_key}\{course_key}.gspcrse
│  Custom Rounds: E:\Core\GSP\CustomRounds\*.crd            │
└────────────────────────────────────────────────────────────┘
                    ↓ (read)         ↑ (write .crd)
┌────────────────────────────────────────────────────────────┐
│              NN Listener Service (Extended)                │
│                                                            │
│  1. Course Data Sync (one-time setup + on changes)        │
│     - Read .gspcrse files                                  │
│     - Extract hole/tee/pin positions                       │
│     - POST to /api/sim/courses/:id/hole-details           │
│                                                            │
│  2. CTP Challenge Polling (every 10 seconds)              │
│     - GET /api/sim/ctp-challenges/pending                 │
│     - Generate .crd file from ctp_holes_config            │
│     - Save to E:\Core\GSP\CustomRounds\                   │
│     - PUT /api/sim/ctp-challenges/:id/synced              │
│                                                            │
│  3. Session Polling (every 10 seconds)                    │
│     - GET /api/sim/active-ctp-session                     │
│     - Store active session in memory                       │
│                                                            │
│  4. Shot Capture (on each shot)                           │
│     - If active CTP session exists:                        │
│       - Add challenge_entry_id to shot payload            │
│     - POST to /api/shots (existing)                       │
└────────────────────────────────────────────────────────────┘
                    ↓ (HTTPS)
┌────────────────────────────────────────────────────────────┐
│           NN Cloud API (golfapp1.onrender.com)             │
│  - Stores course hole details                             │
│  - Stores CTP challenges                                  │
│  - Tracks active sessions                                 │
│  - Updates leaderboards automatically                     │
└────────────────────────────────────────────────────────────┘
```

---

## Part 1: Course Data Sync

### 1.1 Looking Up Course IDs

Before syncing course data, you need to find the course ID in the cloud database for each .gspcrse file:

**Endpoint:** `GET /api/sim/courses/lookup?name={courseName}`

**Headers:**
```
X-Sim-API-Key: nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af
```

**Example Request:**
```typescript
const courseName = 'Pebble Beach Golf Links'; // Stripped from "Pebble Beach Golf Links.gspcrse"
const response = await fetch(
  `https://golfapp1.onrender.com/api/sim/courses/lookup?name=${encodeURIComponent(courseName)}`,
  {
    headers: {
      'X-Sim-API-Key': 'nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af'
    }
  }
);
const data = await response.json();

if (data.found && data.exact) {
  const courseId = data.course.id; // Use this for syncing
  console.log(`Found course: ${data.course.name} (ID: ${courseId})`);
} else if (data.found && !data.exact) {
  // Multiple matches - pick the best one or log for manual review
  console.log('Multiple courses found:', data.matches);
  const courseId = data.matches[0].id; // Take first match
} else {
  console.error(`Course not found in database: ${courseName}`);
}
```

**Response (Exact Match):**
```json
{
  "found": true,
  "exact": true,
  "course": {
    "id": 123,
    "name": "Pebble Beach Golf Links",
    "location": "Pebble Beach, CA",
    "designer": "Jack Neville, Douglas Grant",
    "holes": 18
  }
}
```

**Response (Multiple Matches):**
```json
{
  "found": true,
  "exact": false,
  "matches": [
    {
      "id": 123,
      "name": "Pebble Beach Golf Links",
      "location": "Pebble Beach, CA",
      "similarity": 0.95
    },
    {
      "id": 456,
      "name": "Pebble Beach - The Links",
      "location": "Pebble Beach, CA",
      "similarity": 0.85
    }
  ],
  "message": "Multiple courses found. Please use the most appropriate course ID."
}
```

### 1.2 Reading .gspcrse Files

GSPro course files are JSON files located at:
```
E:\Core\GSP\Courses\{course_key}\{course_key}.gspcrse
```

Example: `E:\Core\GSP\Courses\tobaccoroad_gsp\tobaccoroad_gsp.gspcrse`

**Key data to extract:**
- Hole number, par, handicap index
- Green center position (x, y, z)
- Pin positions for each day (Thursday, Friday, Saturday, Sunday)
- Tee positions for each tee type (Black, Blue, White, Yellow, Green, Red, Junior, Par3)

### 1.2 Sample .gspcrse Structure

```json
{
  "CourseName": "Tobacco Road",
  "Holes": [
    {
      "Number": 3,
      "Par": 3,
      "HandicapIndex": 15,
      "GreenCentre": {
        "x": 100.5,
        "y": 10.2,
        "z": -50.3
      },
      "Pins": {
        "Thursday": { "x": 98.2, "y": 10.5, "z": -48.1 },
        "Friday": { "x": 102.1, "y": 10.3, "z": -52.4 },
        "Saturday": { "x": 101.0, "y": 10.4, "z": -49.8 },
        "Sunday": { "x": 99.5, "y": 10.2, "z": -51.2 }
      },
      "TeeSets": [
        {
          "Name": "Black",
          "Position": { "x": 50.0, "y": 8.0, "z": 0.0 },
          "Distance": 145
        },
        {
          "Name": "White",
          "Position": { "x": 60.0, "y": 8.0, "z": 5.0 },
          "Distance": 103
        },
        {
          "Name": "Par3",
          "Position": { "x": 65.0, "y": 8.0, "z": 8.0 },
          "Distance": 95
        }
      ]
    }
  ]
}
```

### 1.3 API Endpoint: Upload Course Hole Details

**Endpoint:** `POST /api/sim/courses/:courseId/hole-details`

**Authentication:** Simulator API Key (Bearer token)

**Request Body:**
```json
{
  "gsproCourseName": "Tobacco Road.gspcrse",
  "holeDetails": [
    {
      "hole": 3,
      "par": 3,
      "index": 15,
      "greenCenter": { "x": 100.5, "y": 10.2, "z": -50.3 },
      "pins": {
        "Thursday": { "x": 98.2, "y": 10.5, "z": -48.1 },
        "Friday": { "x": 102.1, "y": 10.3, "z": -52.4 },
        "Saturday": { "x": 101.0, "y": 10.4, "z": -49.8 },
        "Sunday": { "x": 99.5, "y": 10.2, "z": -51.2 }
      },
      "tees": {
        "Black": { "x": 50.0, "y": 8.0, "z": 0.0, "distance": 145 },
        "White": { "x": 60.0, "y": 8.0, "z": 5.0, "distance": 103 },
        "Par3": { "x": 65.0, "y": 8.0, "z": 8.0, "distance": 95 }
      }
    }
  ]
}
```

**Note:** The `gsproCourseName` field is used to track which GSPro course file this data came from, helping to identify courses across different simulators.

**Example Code (Node.js/TypeScript):**
```typescript
async function syncCourseHoleDetails(
  courseId: number,
  gsproCourseName: string,
  holeDetails: any[]
) {
  const response = await fetch(
    `https://golfapp1.onrender.com/api/sim/courses/${courseId}/hole-details`,
    {
      method: 'POST',
      headers: {
        'X-Sim-API-Key': 'nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gsproCourseName,
        holeDetails
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to sync course data: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`[CTP] Synced ${result.holesUpdated} holes for ${result.courseName}`);
}

// Usage:
await syncCourseHoleDetails(
  123,
  'Tobacco Road.gspcrse',
  parsedHoleDetails
);
```

### 1.4 When to Sync

**Initial sync:** Run once for all courses when first setting up CTP system

**Ongoing sync:** Re-sync when:
- New course is installed
- Course is updated (detect file modification timestamp change)
- Admin manually triggers re-sync

---

## Part 2: CTP Challenge Polling

### 2.1 Poll for Pending Challenges

**Endpoint:** `GET /api/sim/ctp-challenges/pending`

**Frequency:** Every 10 seconds

**Response:**
```json
[
  {
    "id": 123,
    "challenge_name": "Saturday CTP Challenge",
    "course_id": 45,
    "course_name": "Tobacco Road",
    "ctp_mode": "par3-holes",
    "ctp_tee_type": "White",
    "ctp_pin_day": "Saturday",
    "ctp_attempts_per_hole": 3,
    "ctp_holes_config": [
      {
        "hole": 3,
        "par": 3,
        "distance": 103,
        "teePos": { "x": 60.0, "y": 8.0, "z": 5.0 },
        "pinPos": { "x": 101.0, "y": 10.4, "z": -49.8 }
      },
      {
        "hole": 6,
        "par": 3,
        "distance": 116,
        "teePos": { "x": 45.2, "y": 9.1, "z": 12.3 },
        "pinPos": { "x": 92.8, "y": 11.2, "z": -38.5 }
      }
    ],
    "week_start_date": "2025-12-09",
    "week_end_date": "2025-12-15"
  }
]
```

### 2.2 Generate .crd File

When you receive a pending challenge, generate a GSPro custom round file:

**Filename format:** `{challenge_id}-{challenge_name}.crd`

Example: `123-Saturday-CTP-Challenge.crd`

**Location:** `E:\Core\GSP\CustomRounds\`

**File Structure:**
```json
{
  "RoundName": "Saturday CTP Challenge",
  "RoundGuid": "abc-123-def-456",
  "CourseName": "Tobacco Road",
  "CourseKey": "tobaccoroad_gsp",
  "CourseFullPathName": "E:/Core/GSP/Courses/tobaccoroad_gsp/tobaccoroad_gsp.gspcrse",
  "CourseVersion": 1.0,
  "CourseSize": 0,
  "shotCount": 5,
  "totalAttempts": 15,
  "favorite": false,
  "shots": [
    {
      "StartPos": {
        "x": 60.0,
        "y": 8.0,
        "z": 5.0,
        "normalized": { "x": 0, "y": 0, "z": 0, "magnitude": 0, "sqrMagnitude": 0 },
        "magnitude": 0,
        "sqrMagnitude": 0
      },
      "TargetPos": {
        "x": 101.0,
        "y": 10.4,
        "z": -49.8,
        "normalized": { "x": 0, "y": 0, "z": 0, "magnitude": 0, "sqrMagnitude": 0 },
        "magnitude": 0,
        "sqrMagnitude": 0
      },
      "iSurface": 18,
      "sSurface": "TVGtee",
      "hole": 3,
      "attempts": 3
    }
  ]
}
```

**Example Code:**
```typescript
function generateCRDFile(challenge: any): any {
  const shots = challenge.ctp_holes_config.map((hole: any) => ({
    StartPos: {
      x: hole.teePos.x,
      y: hole.teePos.y,
      z: hole.teePos.z,
      normalized: { x: 0, y: 0, z: 0, magnitude: 0, sqrMagnitude: 0 },
      magnitude: 0,
      sqrMagnitude: 0
    },
    TargetPos: {
      x: hole.pinPos.x,
      y: hole.pinPos.y,
      z: hole.pinPos.z,
      normalized: { x: 0, y: 0, z: 0, magnitude: 0, sqrMagnitude: 0 },
      magnitude: 0,
      sqrMagnitude: 0
    },
    iSurface: 18,
    sSurface: "TVGtee",
    hole: hole.hole,
    attempts: challenge.ctp_attempts_per_hole
  }));

  return {
    RoundName: challenge.challenge_name,
    RoundGuid: `challenge-${challenge.id}`,
    CourseName: challenge.course_name,
    CourseKey: `${challenge.course_name.toLowerCase().replace(/\s/g, '')}_gsp`,
    CourseFullPathName: `E:/Core/GSP/Courses/${challenge.course_name.toLowerCase().replace(/\s/g, '')}_gsp/${challenge.course_name.toLowerCase().replace(/\s/g, '')}_gsp.gspcrse`,
    CourseVersion: 1.0,
    CourseSize: 0,
    shotCount: shots.length,
    totalAttempts: shots.length * challenge.ctp_attempts_per_hole,
    favorite: false,
    shots: shots
  };
}
```

### 2.3 Confirm Sync to Cloud

After successfully generating and saving the .crd file, confirm to the cloud:

**Endpoint:** `PUT /api/sim/ctp-challenges/:id/synced`

**Request Body:**
```json
{
  "crdFilename": "123-Saturday-CTP-Challenge.crd",
  "crdContent": { /* full .crd JSON */ }
}
```

**Example Code:**
```typescript
async function confirmChallengeSync(challengeId: number, filename: string, crdContent: any) {
  const response = await fetch(
    `https://golfapp1.onrender.com/api/sim/ctp-challenges/${challengeId}/synced`,
    {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        crdFilename: filename,
        crdContent: crdContent
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to confirm sync: ${response.statusText}`);
  }

  console.log(`[CTP] Challenge ${challengeId} synced successfully`);
}
```

---

## Part 3: Session Polling

### 3.1 Check for Active CTP Session

**Endpoint:** `GET /api/sim/active-ctp-session`

**Frequency:** Every 10 seconds

**Response (when session exists):**
```json
{
  "active_session": {
    "session_id": 456,
    "challenge_id": 123,
    "entry_id": 789,
    "user_id": 42,
    "user_name": "John Doe",
    "challenge_name": "Saturday CTP Challenge",
    "crd_filename": "123-Saturday-CTP-Challenge.crd",
    "current_hole_index": 0,
    "shots_taken": 0
  }
}
```

**Response (when no active session):**
```json
{
  "active_session": null
}
```

### 3.2 Store Active Session in Memory

```typescript
let activeCTPSession: any = null;

async function pollForActiveCTPSession() {
  const response = await fetch(
    'https://golfapp1.onrender.com/api/sim/active-ctp-session',
    {
      headers: {
        'Authorization': 'Bearer nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af'
      }
    }
  );

  const data = await response.json();
  activeCTPSession = data.active_session;

  if (activeCTPSession) {
    console.log(`[CTP] Active session: ${activeCTPSession.user_name} playing ${activeCTPSession.challenge_name}`);
  }
}

// Run every 10 seconds
setInterval(pollForActiveCTPSession, 10000);
```

---

## Part 4: Shot Capture Integration

### 4.1 Attach challenge_entry_id to Shots

When capturing a shot, check if there's an active CTP session. If yes, add the `challenge_entry_id` to the shot payload.

**Modified Shot Capture Code:**
```typescript
async function captureShot(shotData: any) {
  // Existing shot normalization logic...
  const normalizedShot = {
    uuid: generateUUID(),
    timestamp: new Date().toISOString(),
    club: shotData.Club,
    ball_speed: shotData.BallSpeed,
    carry_distance: shotData.CarryDistance,
    // ... other fields
  };

  // NEW: Add challenge_entry_id if active CTP session
  if (activeCTPSession) {
    normalizedShot.challenge_entry_id = activeCTPSession.entry_id;
    console.log(`[CTP] Attaching shot to challenge entry ${activeCTPSession.entry_id}`);
  }

  // Upload to cloud (existing)
  const response = await fetch('https://golfapp1.onrender.com/api/shots', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(normalizedShot)
  });

  // Existing logic...
}
```

**That's it!** The cloud will automatically:
- Update the challenge entry's best distance
- Update the active session stats
- Refresh the leaderboard in real-time

---

## Complete Service Integration Example

```typescript
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://golfapp1.onrender.com';
const API_KEY = 'Bearer nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af';
const CRD_PATH = 'E:\\Core\\GSP\\CustomRounds';

let activeCTPSession: any = null;

// 1. Challenge Polling Loop
async function ctpChallengePoller() {
  try {
    const response = await fetch(`${API_BASE}/api/sim/ctp-challenges/pending`, {
      headers: { 'Authorization': API_KEY }
    });

    const challenges = await response.json();

    for (const challenge of challenges) {
      await processPendingChallenge(challenge);
    }
  } catch (error) {
    console.error('[CTP] Challenge poll error:', error);
  }
}

async function processPendingChallenge(challenge: any) {
  console.log(`[CTP] Processing challenge: ${challenge.challenge_name}`);

  // Generate .crd file
  const crd = generateCRDFile(challenge);
  const filename = `${challenge.id}-${challenge.challenge_name.replace(/[^a-zA-Z0-9]/g, '-')}.crd`;
  const filepath = path.join(CRD_PATH, filename);

  fs.writeFileSync(filepath, JSON.stringify(crd, null, 2));
  console.log(`[CTP] Saved .crd file: ${filename}`);

  // Confirm sync to cloud
  await fetch(`${API_BASE}/api/sim/ctp-challenges/${challenge.id}/synced`, {
    method: 'PUT',
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      crdFilename: filename,
      crdContent: crd
    })
  });

  console.log(`[CTP] Challenge ${challenge.id} synced to cloud`);
}

// 2. Session Polling Loop
async function ctpSessionPoller() {
  try {
    const response = await fetch(`${API_BASE}/api/sim/active-ctp-session`, {
      headers: { 'Authorization': API_KEY }
    });

    const data = await response.json();
    activeCTPSession = data.active_session;
  } catch (error) {
    console.error('[CTP] Session poll error:', error);
  }
}

// 3. Start Pollers
setInterval(ctpChallengePoller, 10000); // Every 10 seconds
setInterval(ctpSessionPoller, 10000);   // Every 10 seconds

// 4. Export active session for shot capture
export function getActiveCTPSession() {
  return activeCTPSession;
}
```

---

## Testing

### Test Course Data Sync

```bash
curl -X POST "https://golfapp1.onrender.com/api/sim/courses/23/hole-details" \
  -H "Authorization: Bearer nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af" \
  -H "Content-Type: application/json" \
  -d '{
    "holeDetails": [
      {
        "hole": 3,
        "par": 3,
        "index": 15,
        "greenCenter": {"x": 100, "y": 10, "z": -50},
        "pins": {
          "Thursday": {"x": 98, "y": 10, "z": -48}
        },
        "tees": {
          "White": {"x": 60, "y": 8, "z": 5, "distance": 103}
        }
      }
    ]
  }'
```

### Test Challenge Polling

```bash
curl -X GET "https://golfapp1.onrender.com/api/sim/ctp-challenges/pending" \
  -H "Authorization: Bearer nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af"
```

### Test Session Polling

```bash
curl -X GET "https://golfapp1.onrender.com/api/sim/active-ctp-session" \
  -H "Authorization: Bearer nn-sim-nn-no5-3a11134c18c31b06c9d73277fcf4a9af"
```

---

## Deployment Checklist

- [ ] Course data sync implemented
- [ ] Initial course data uploaded for all courses
- [ ] Challenge polling loop running (every 10s)
- [ ] .crd file generation working
- [ ] .crd files saving to correct location
- [ ] Sync confirmation working
- [ ] Session polling loop running (every 10s)
- [ ] Shot capture includes challenge_entry_id
- [ ] End-to-end test: Create challenge → Generate .crd → User activates → Shots captured
- [ ] Monitor logs for errors

---

## Support

**Questions?**
- API Docs: See `CTP_IMPLEMENTATION_PLAN_REVISED.md`
- Database Schema: `db/migrations/029_add_ctp_challenge_system.sql`

**Monitoring:**
- Check sim sync status: `GET /api/sims/nn-no5/sync-status`

---

*Last Updated: 2025-12-05*
*Sim ID: nn-no5*
