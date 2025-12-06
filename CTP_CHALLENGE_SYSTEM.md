# CTP Challenge System - Cloud Sync Architecture

This document describes the system for syncing GSPro course data to a PostgreSQL cloud database and enabling remote CTP (Closest-to-Pin) challenge creation from a web portal.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB PORTAL                                      │
│  - Browse courses                                                           │
│  - Create CTP challenges (select course, holes, tee, pin day, attempts)     │
│  - View/manage saved challenges                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL DATABASE                                  │
│  - courses table (synced from sim PC)                                       │
│  - course_holes table (hole details, pins, tees)                            │
│  - ctp_challenges table (user-created challenges)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIM PC SERVICE                                     │
│  - Polls for new challenges OR receives webhook                             │
│  - Generates .crd file using generate-ctp-challenge.js                      │
│  - Saves to E:\Core\GSP\CustomRounds\                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PostgreSQL Schema

### 1. Courses Table

Stores course metadata for browsing/searching in the web portal.

```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    designer VARCHAR(255),

    -- Location
    location_full VARCHAR(500),
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    altitude DECIMAL(8, 2),

    -- Stats
    par INTEGER,
    holes_count INTEGER,
    difficulty_rating DECIMAL(3, 1),
    default_stimp INTEGER,
    max_stimp INTEGER,

    -- Tee box info (JSON for flexibility)
    tee_boxes JSONB,

    -- Features
    has_range BOOLEAN DEFAULT FALSE,
    is_mini_golf BOOLEAN DEFAULT FALSE,
    keywords TEXT[],

    -- Meta
    is_real BOOLEAN DEFAULT TRUE,
    has_gps BOOLEAN DEFAULT FALSE,
    has_par3_tees BOOLEAN DEFAULT FALSE,
    par3_hole_numbers INTEGER[],
    gk_version DECIMAL(4, 2),

    -- Timestamps
    last_modified_on_sim TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_courses_name ON courses(name);
CREATE INDEX idx_courses_country ON courses(country);
CREATE INDEX idx_courses_state ON courses(state);
CREATE INDEX idx_courses_has_par3_tees ON courses(has_par3_tees);
CREATE INDEX idx_courses_is_real ON courses(is_real);

-- Full-text search
CREATE INDEX idx_courses_search ON courses USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(city, '') || ' ' || COALESCE(state, '') || ' ' || COALESCE(country, ''))
);
```

### 2. Course Holes Table

Stores detailed hole data needed for CTP challenge generation.

```sql
CREATE TABLE course_holes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    course_key VARCHAR(255) NOT NULL,
    hole_number INTEGER NOT NULL,
    par INTEGER NOT NULL,
    hole_index INTEGER,

    -- Green center position
    green_center_x DECIMAL(12, 6),
    green_center_y DECIMAL(12, 6),
    green_center_z DECIMAL(12, 6),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_key, hole_number)
);

CREATE INDEX idx_course_holes_course ON course_holes(course_key);
CREATE INDEX idx_course_holes_par ON course_holes(par);
```

### 3. Hole Pins Table

Stores pin positions for each day.

```sql
CREATE TABLE hole_pins (
    id SERIAL PRIMARY KEY,
    course_hole_id INTEGER REFERENCES course_holes(id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL,  -- 'Thursday', 'Friday', 'Saturday', 'Sunday'
    position_x DECIMAL(12, 6) NOT NULL,
    position_y DECIMAL(12, 6) NOT NULL,
    position_z DECIMAL(12, 6) NOT NULL,

    UNIQUE(course_hole_id, day)
);

CREATE INDEX idx_hole_pins_hole ON hole_pins(course_hole_id);
```

### 4. Hole Tees Table

Stores tee positions for each tee type.

```sql
CREATE TABLE hole_tees (
    id SERIAL PRIMARY KEY,
    course_hole_id INTEGER REFERENCES course_holes(id) ON DELETE CASCADE,
    tee_type VARCHAR(20) NOT NULL,  -- 'Black', 'Blue', 'White', 'Yellow', 'Green', 'Red', 'Junior', 'Par3'
    distance INTEGER,  -- Distance in yards
    position_x DECIMAL(12, 6) NOT NULL,
    position_y DECIMAL(12, 6) NOT NULL,
    position_z DECIMAL(12, 6) NOT NULL,

    UNIQUE(course_hole_id, tee_type)
);

CREATE INDEX idx_hole_tees_hole ON hole_tees(course_hole_id);
CREATE INDEX idx_hole_tees_type ON hole_tees(tee_type);
```

### 5. CTP Challenges Table

Stores user-created CTP challenges to be synced to the sim PC.

```sql
CREATE TYPE challenge_status AS ENUM ('pending', 'synced', 'failed', 'deleted');
CREATE TYPE challenge_mode AS ENUM ('par3-holes', 'par3-tees');

CREATE TABLE ctp_challenges (
    id SERIAL PRIMARY KEY,
    challenge_guid UUID DEFAULT gen_random_uuid(),

    -- Challenge definition
    name VARCHAR(255) NOT NULL,
    course_key VARCHAR(255) NOT NULL REFERENCES courses(course_key),
    course_name VARCHAR(255) NOT NULL,
    mode challenge_mode DEFAULT 'par3-holes',
    tee_type VARCHAR(20) DEFAULT 'White',
    pin_day VARCHAR(20) DEFAULT 'Thursday',
    attempts_per_hole INTEGER DEFAULT 3,

    -- Selected holes (null = use all eligible based on mode)
    selected_holes INTEGER[],

    -- Generated data (populated after generation)
    total_holes INTEGER,
    total_shots INTEGER,
    holes_detail JSONB,  -- Array of {hole, par, distance} for display

    -- The actual .crd file content (generated on sync)
    crd_content JSONB,

    -- Sync status
    status challenge_status DEFAULT 'pending',
    synced_at TIMESTAMP,
    sync_error TEXT,

    -- Metadata
    created_by VARCHAR(255),  -- User ID or name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ctp_challenges_status ON ctp_challenges(status);
CREATE INDEX idx_ctp_challenges_course ON ctp_challenges(course_key);
CREATE INDEX idx_ctp_challenges_created_by ON ctp_challenges(created_by);
```

---

## Data Sync: Sim PC → PostgreSQL

### Sync Service (runs on sim PC)

The existing `courseWatcher.ts` and `courseDatabase.ts` can be extended to sync to PostgreSQL.

```typescript
// src/courseCloudSync.ts

import { Pool } from 'pg';
import { CourseData, HoleData } from './courseWatcher';

export class CourseCloudSync {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async syncCourse(course: CourseData): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Upsert course
      const courseResult = await client.query(`
        INSERT INTO courses (
          course_key, name, description, designer,
          location_full, city, state, country,
          latitude, longitude, altitude,
          par, holes_count, difficulty_rating, default_stimp, max_stimp,
          tee_boxes, has_range, is_mini_golf, keywords,
          is_real, has_gps, has_par3_tees, par3_hole_numbers,
          gk_version, last_modified_on_sim, updated_at, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (course_key) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          designer = EXCLUDED.designer,
          location_full = EXCLUDED.location_full,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          altitude = EXCLUDED.altitude,
          par = EXCLUDED.par,
          holes_count = EXCLUDED.holes_count,
          difficulty_rating = EXCLUDED.difficulty_rating,
          default_stimp = EXCLUDED.default_stimp,
          max_stimp = EXCLUDED.max_stimp,
          tee_boxes = EXCLUDED.tee_boxes,
          has_range = EXCLUDED.has_range,
          is_mini_golf = EXCLUDED.is_mini_golf,
          keywords = EXCLUDED.keywords,
          is_real = EXCLUDED.is_real,
          has_gps = EXCLUDED.has_gps,
          has_par3_tees = EXCLUDED.has_par3_tees,
          par3_hole_numbers = EXCLUDED.par3_hole_numbers,
          gk_version = EXCLUDED.gk_version,
          last_modified_on_sim = EXCLUDED.last_modified_on_sim,
          updated_at = CURRENT_TIMESTAMP,
          synced_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        course.courseKey,
        course.name,
        course.description,
        course.designer,
        course.location.full,
        course.location.city,
        course.location.state,
        course.location.country,
        course.location.latitude,
        course.location.longitude,
        course.location.altitude,
        course.stats.par,
        course.stats.holes,
        course.stats.difficultyRating,
        course.stats.defaultStimp,
        course.stats.maxStimp,
        JSON.stringify(course.teeBoxes),
        course.features.hasRange,
        course.features.isMiniGolf,
        course.features.keywords,
        course.meta.isReal,
        course.meta.hasGPS,
        course.holes.some(h => h.tees.some(t => t.type === 'Par3')),
        course.holes.filter(h => h.par === 3).map(h => h.number),
        course.meta.gkVersion,
        course.meta.lastModified
      ]);

      const courseId = courseResult.rows[0].id;

      // Sync holes
      for (const hole of course.holes) {
        await this.syncHole(client, courseId, course.courseKey, hole);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async syncHole(client: any, courseId: number, courseKey: string, hole: HoleData): Promise<void> {
    // Upsert hole
    const holeResult = await client.query(`
      INSERT INTO course_holes (
        course_id, course_key, hole_number, par, hole_index,
        green_center_x, green_center_y, green_center_z, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (course_key, hole_number) DO UPDATE SET
        par = EXCLUDED.par,
        hole_index = EXCLUDED.hole_index,
        green_center_x = EXCLUDED.green_center_x,
        green_center_y = EXCLUDED.green_center_y,
        green_center_z = EXCLUDED.green_center_z,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      courseId,
      courseKey,
      hole.number,
      hole.par,
      hole.index,
      hole.greenCenter?.x,
      hole.greenCenter?.y,
      hole.greenCenter?.z
    ]);

    const holeId = holeResult.rows[0].id;

    // Sync pins
    for (const pin of hole.pins) {
      await client.query(`
        INSERT INTO hole_pins (course_hole_id, day, position_x, position_y, position_z)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (course_hole_id, day) DO UPDATE SET
          position_x = EXCLUDED.position_x,
          position_y = EXCLUDED.position_y,
          position_z = EXCLUDED.position_z
      `, [holeId, pin.day, pin.position.x, pin.position.y, pin.position.z]);
    }

    // Sync tees
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
    }
  }
}
```

---

## CTP Challenge Sync: PostgreSQL → Sim PC

### Option A: Polling (Simple)

The sim PC service polls for pending challenges every N seconds.

```typescript
// src/ctpChallengeSync.ts

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const CUSTOM_ROUNDS_PATH = 'E:\\Core\\GSP\\CustomRounds';

interface CTPChallenge {
  id: number;
  challenge_guid: string;
  name: string;
  course_key: string;
  course_name: string;
  mode: 'par3-holes' | 'par3-tees';
  tee_type: string;
  pin_day: string;
  attempts_per_hole: number;
  selected_holes: number[] | null;
}

export class CTPChallengeSync {
  private pool: Pool;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async start(intervalMs: number = 10000): Promise<void> {
    console.log('[CTPChallengeSync] Starting poll for pending challenges...');

    // Initial check
    await this.processPendingChallenges();

    // Poll periodically
    this.pollInterval = setInterval(() => {
      this.processPendingChallenges();
    }, intervalMs);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async processPendingChallenges(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get pending challenges
      const result = await client.query(`
        SELECT * FROM ctp_challenges WHERE status = 'pending'
      `);

      for (const challenge of result.rows) {
        await this.processChallenge(client, challenge);
      }
    } catch (error) {
      console.error('[CTPChallengeSync] Error processing challenges:', error);
    } finally {
      client.release();
    }
  }

  private async processChallenge(client: any, challenge: CTPChallenge): Promise<void> {
    try {
      console.log(`[CTPChallengeSync] Processing: ${challenge.name}`);

      // Generate .crd content
      const crd = await this.generateCRD(client, challenge);

      // Save to file
      const filename = `${challenge.challenge_guid}-${challenge.name.replace(/[^a-zA-Z0-9 -]/g, '')}.crd`;
      const filepath = path.join(CUSTOM_ROUNDS_PATH, filename);
      fs.writeFileSync(filepath, JSON.stringify(crd, null, 2));

      // Update status
      await client.query(`
        UPDATE ctp_challenges
        SET status = 'synced',
            synced_at = CURRENT_TIMESTAMP,
            crd_content = $1,
            total_holes = $2,
            total_shots = $3,
            holes_detail = $4
        WHERE id = $5
      `, [
        JSON.stringify(crd),
        crd.shotCount,
        crd.totalAttempts,
        JSON.stringify(crd.shots.map((s: any) => ({
          hole: s.hole,
          distance: s._distance
        }))),
        challenge.id
      ]);

      console.log(`[CTPChallengeSync] Saved: ${filepath}`);
    } catch (error: any) {
      console.error(`[CTPChallengeSync] Failed: ${challenge.name}`, error);

      await client.query(`
        UPDATE ctp_challenges
        SET status = 'failed', sync_error = $1
        WHERE id = $2
      `, [error.message, challenge.id]);
    }
  }

  private async generateCRD(client: any, challenge: CTPChallenge): Promise<any> {
    // Get holes with pins and tees
    const holesResult = await client.query(`
      SELECT
        ch.hole_number, ch.par,
        hp.day as pin_day, hp.position_x as pin_x, hp.position_y as pin_y, hp.position_z as pin_z,
        ht.tee_type, ht.distance, ht.position_x as tee_x, ht.position_y as tee_y, ht.position_z as tee_z
      FROM course_holes ch
      LEFT JOIN hole_pins hp ON hp.course_hole_id = ch.id AND hp.day = $2
      LEFT JOIN hole_tees ht ON ht.course_hole_id = ch.id AND ht.tee_type = $3
      WHERE ch.course_key = $1
      ORDER BY ch.hole_number
    `, [challenge.course_key, challenge.pin_day, challenge.mode === 'par3-tees' ? 'Par3' : challenge.tee_type]);

    // Filter holes based on mode
    let eligibleHoles = holesResult.rows;

    if (challenge.mode === 'par3-holes') {
      eligibleHoles = eligibleHoles.filter(h => h.par === 3);
    }

    if (challenge.selected_holes && challenge.selected_holes.length > 0) {
      eligibleHoles = eligibleHoles.filter(h => challenge.selected_holes!.includes(h.hole_number));
    }

    // Build shots
    const shots = eligibleHoles
      .filter(h => h.tee_x && h.pin_x)  // Must have both tee and pin
      .map(h => {
        const dx = h.tee_x - h.pin_x;
        const dz = h.tee_z - h.pin_z;
        const distanceYards = Math.round(Math.sqrt(dx * dx + dz * dz) * 1.09361);

        return {
          StartPos: {
            x: h.tee_x, y: h.tee_y, z: h.tee_z,
            normalized: { x: 0, y: 0, z: 0, magnitude: 0, sqrMagnitude: 0 },
            magnitude: 0, sqrMagnitude: 0
          },
          TargetPos: {
            x: h.pin_x, y: h.pin_y, z: h.pin_z,
            normalized: { x: 0, y: 0, z: 0, magnitude: 0, sqrMagnitude: 0 },
            magnitude: 0, sqrMagnitude: 0
          },
          iSurface: 18,
          sSurface: "TVGtee",
          hole: h.hole_number,
          attempts: challenge.attempts_per_hole,
          _distance: distanceYards  // For metadata, removed before save
        };
      });

    return {
      RoundName: challenge.name,
      RoundGuid: challenge.challenge_guid,
      CourseName: challenge.course_name,
      CourseKey: challenge.course_key,
      CourseFullPathName: `E:/Core/GSP/Courses/${challenge.course_key}/${challenge.course_key}.gspcrse`,
      CourseVersion: 1.0,
      CourseSize: 0,
      shotCount: shots.length,
      totalAttempts: shots.length * challenge.attempts_per_hole,
      favorite: false,
      shots: shots.map(s => {
        const { _distance, ...shot } = s;
        return shot;
      })
    };
  }
}
```

### Option B: WebSocket/Webhook (Real-time)

For instant sync, the sim PC can listen for webhook calls from the web portal.

```typescript
// Add to existing webServer.ts or create new endpoint

import express from 'express';
import { CTPChallengeSync } from './ctpChallengeSync';

const app = express();
app.use(express.json());

// Webhook endpoint for immediate challenge sync
app.post('/api/challenges/sync', async (req, res) => {
  const { challengeId } = req.body;

  try {
    const sync = new CTPChallengeSync(process.env.DATABASE_URL!);
    await sync.processSingleChallenge(challengeId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to trigger full sync
app.post('/api/challenges/sync-all', async (req, res) => {
  try {
    const sync = new CTPChallengeSync(process.env.DATABASE_URL!);
    await sync.processPendingChallenges();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Web Portal API Endpoints

### Create Challenge

```typescript
// POST /api/challenges
{
  "name": "Saturday CTP Battle",
  "courseKey": "tobaccoroad_gsp",
  "mode": "par3-holes",  // or "par3-tees"
  "teeType": "White",
  "pinDay": "Saturday",
  "attemptsPerHole": 3,
  "selectedHoles": [3, 6, 8, 14, 17]  // optional, null = all eligible
}

// Response
{
  "id": 123,
  "challengeGuid": "abc-123-...",
  "status": "pending",
  "holesDetail": [
    { "hole": 3, "par": 3, "distance": 103 },
    { "hole": 6, "par": 3, "distance": 116 },
    ...
  ],
  "totalShots": 15
}
```

### Get Eligible Courses

```typescript
// GET /api/courses/ctp-eligible
// Returns courses with par 3 holes or Par3 tees

// Response
[
  {
    "courseKey": "tobaccoroad_gsp",
    "name": "Tobacco Road",
    "par3Holes": [3, 6, 8, 14, 17],
    "hasPar3Tees": true,
    "par3TeeHoleCount": 18
  },
  ...
]
```

### Get Course Holes for Challenge Builder

```typescript
// GET /api/courses/:courseKey/holes
// Returns hole details for building a challenge

// Response
{
  "courseKey": "tobaccoroad_gsp",
  "name": "Tobacco Road",
  "holes": [
    {
      "number": 3,
      "par": 3,
      "tees": [
        { "type": "Black", "distance": 145 },
        { "type": "White", "distance": 103 },
        { "type": "Par3", "distance": 95 }
      ],
      "pins": ["Thursday", "Friday", "Saturday", "Sunday"]
    },
    ...
  ]
}
```

---

## Environment Variables

```env
# Sim PC .env
DATABASE_URL=postgresql://user:pass@your-cloud-db.com:5432/gspro
CUSTOM_ROUNDS_PATH=E:\Core\GSP\CustomRounds
COURSES_PATH=E:\Core\GSP\Courses
CHALLENGE_POLL_INTERVAL=10000

# Web Portal .env
DATABASE_URL=postgresql://user:pass@your-cloud-db.com:5432/gspro
SIM_PC_WEBHOOK_URL=http://your-sim-pc:3000/api/challenges/sync
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create PostgreSQL database
- [ ] Run schema creation scripts
- [ ] Test connection from sim PC

### Phase 2: Course Sync (Sim PC → Cloud)
- [ ] Implement `CourseCloudSync` class
- [ ] Add to existing service startup
- [ ] Initial bulk sync of all courses
- [ ] Ongoing sync on course add/update/remove

### Phase 3: Challenge Sync (Cloud → Sim PC)
- [ ] Implement `CTPChallengeSync` class
- [ ] Add polling to service
- [ ] Test challenge generation from DB data

### Phase 4: Web Portal
- [ ] Course browsing UI
- [ ] Challenge builder UI
- [ ] Challenge management (list, delete)
- [ ] Real-time status updates

### Phase 5: Real-time (Optional)
- [ ] WebSocket connection between portal and sim PC
- [ ] Instant challenge deployment
- [ ] Live sync status

---

## File Locations Reference

| Component | Location |
|-----------|----------|
| Courses | `E:\Core\GSP\Courses\` |
| Custom Rounds | `E:\Core\GSP\CustomRounds\` |
| Local SQLite DB | `C:\Users\andre\Documents\gspro-shot-tracker\data\courses.db` |
| CTP Generator Script | `C:\Users\andre\Documents\gspro-shot-tracker\generate-ctp-challenge.js` |
| Service Entry Point | `C:\Users\andre\Documents\gspro-shot-tracker\src\index.ts` |
