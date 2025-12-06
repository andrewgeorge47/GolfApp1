# CTP Challenge System - Revised Implementation Plan
**Building on Existing GolfApp1 Infrastructure**

## Executive Summary

After reviewing the existing weekly challenges system, this revised plan integrates CTP (Closest-to-Pin) challenges into the current infrastructure with **minimal new tables** and **maximum code reuse**.

### Key Findings

**Existing Infrastructure (Reusable):**
- ✅ `weekly_challenges` - challenge definitions
- ✅ `challenge_types` - challenge type metadata
- ✅ `weekly_challenge_entries` - user participation
- ✅ `challenge_payments` - payment tracking
- ✅ `challenge_shot_groups` - shot groupings
- ✅ `simulator_courses_combined` - course data
- ✅ `simulator_api_keys`, `simulator_sessions`, `shots` - sim PC integration
- ✅ WeeklyChallengeAdmin.tsx - admin UI for challenge creation
- ✅ Sim PC shot capture infrastructure (nn-no5)

**What Makes CTP Different:**
1. **Auto-generation** - .crd files generated automatically vs manual screenshot submissions
2. **Detailed course data** - Need tee/pin x/y/z coordinates for .crd generation
3. **Session activation** - User activates via PWA → Sim PC listens → Shots auto-captured
4. **Real-time leaderboard** - Updates automatically from shot data

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WEB ADMIN PORTAL (existing)                      │
│  WeeklyChallengeAdmin.tsx                                           │
│  • Create CTP challenge (extends existing create flow)              │
│  • Select: Course, Holes, Tee Type, Pin Day, Attempts               │
│  • Click "Go Live" → status='active'                                │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL (existing tables + extensions)        │
│  • simulator_courses_combined (ADD: hole_details JSONB)             │
│  • weekly_challenges (ADD: CTP-specific columns)                    │
│  • weekly_challenge_entries (REUSE as-is)                           │
│  • ctp_active_sessions (NEW: slim table for active sessions)        │
│  • shots (ADD: challenge_entry_id FK)                               │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     SIM PC SERVICE (nn-no5)                          │
│  • Course data sync → uploads hole_details to cloud                 │
│  • CTP polling → checks for challenges with status='active'         │
│  • .crd generation → creates GSPro custom round file                │
│  • Session polling → checks for active CTP sessions                 │
│  • Shot capture → attaches challenge_entry_id to shots              │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     MOBILE PWA (play.nngolf.co)                      │
│  • Browse CTP challenges (extends existing challenges UI)           │
│  • Enter challenge (reuse existing entry flow + payment)            │
│  • "Activate Session" button → creates ctp_active_sessions row      │
│  • View live leaderboard                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Extend Database Schema
**Time:** 1-2 hours
**Priority:** HIGH

#### 1.1 Add hole_details to simulator_courses_combined

```sql
-- Migration: 029_add_ctp_course_details.sql

-- Add hole_details JSONB column to store detailed tee/pin positions
ALTER TABLE simulator_courses_combined
ADD COLUMN hole_details JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN simulator_courses_combined.hole_details IS 'Detailed hole data for CTP challenges: tees, pins, green center positions with x/y/z coordinates';

CREATE INDEX idx_simulator_courses_hole_details ON simulator_courses_combined USING GIN (hole_details);
```

**hole_details structure:**
```json
[
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
```

#### 1.2 Extend weekly_challenges for CTP

```sql
-- Add CTP-specific columns to existing weekly_challenges table
ALTER TABLE weekly_challenges
ADD COLUMN is_ctp_challenge BOOLEAN DEFAULT FALSE,
ADD COLUMN ctp_mode VARCHAR(20) CHECK (ctp_mode IN ('par3-holes', 'par3-tees', NULL)),
ADD COLUMN ctp_tee_type VARCHAR(20),
ADD COLUMN ctp_pin_day VARCHAR(20) CHECK (ctp_pin_day IN ('Thursday', 'Friday', 'Saturday', 'Sunday', NULL)),
ADD COLUMN ctp_selected_holes INTEGER[],
ADD COLUMN ctp_attempts_per_hole INTEGER DEFAULT 3,
ADD COLUMN ctp_holes_config JSONB,
ADD COLUMN crd_filename VARCHAR(255),
ADD COLUMN crd_content JSONB,
ADD COLUMN synced_to_sim_at TIMESTAMP,
ADD COLUMN sim_id VARCHAR(100) DEFAULT 'nn-no5';

COMMENT ON COLUMN weekly_challenges.is_ctp_challenge IS 'TRUE for auto-CTP challenges, FALSE for manual screenshot challenges';
COMMENT ON COLUMN weekly_challenges.ctp_holes_config IS 'Pre-computed hole details for .crd generation: [{hole, par, distance, teePos, pinPos}]';

-- Add FK to simulator
ALTER TABLE weekly_challenges
ADD CONSTRAINT fk_weekly_challenges_sim_id
FOREIGN KEY (sim_id) REFERENCES simulator_api_keys(sim_id);

CREATE INDEX idx_weekly_challenges_is_ctp ON weekly_challenges(is_ctp_challenge);
CREATE INDEX idx_weekly_challenges_sim_status ON weekly_challenges(sim_id, status) WHERE is_ctp_challenge = TRUE;
```

#### 1.3 Create ctp_active_sessions table

```sql
-- Slim table for tracking active CTP sessions (user activated on PWA)
CREATE TABLE ctp_active_sessions (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES weekly_challenges(id) ON DELETE CASCADE,
    entry_id INTEGER REFERENCES weekly_challenge_entries(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(member_id) ON DELETE CASCADE,
    sim_id VARCHAR(100) REFERENCES simulator_api_keys(sim_id),

    -- Link to existing simulator_sessions (for shot tracking)
    simulator_session_id INTEGER REFERENCES simulator_sessions(id),

    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),

    -- Progress tracking
    current_hole_index INTEGER DEFAULT 0,
    shots_taken INTEGER DEFAULT 0,
    best_distance_yards DECIMAL(6,2),

    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ctp_active_sessions_challenge ON ctp_active_sessions(challenge_id);
CREATE INDEX idx_ctp_active_sessions_entry ON ctp_active_sessions(entry_id);
CREATE INDEX idx_ctp_active_sessions_sim_status ON ctp_active_sessions(sim_id, status);

-- Only one active CTP session per sim at a time
CREATE UNIQUE INDEX idx_ctp_active_sessions_unique_sim
    ON ctp_active_sessions(sim_id)
    WHERE status = 'active';

-- Function to get active CTP session for sim
CREATE OR REPLACE FUNCTION get_active_ctp_session_for_sim(p_sim_id VARCHAR)
RETURNS TABLE (
    session_id INTEGER,
    challenge_id INTEGER,
    entry_id INTEGER,
    user_id INTEGER,
    user_name VARCHAR,
    challenge_name VARCHAR,
    current_hole_index INTEGER,
    shots_taken INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.challenge_id,
        cs.entry_id,
        cs.user_id,
        u.full_name,
        wc.challenge_name,
        cs.current_hole_index,
        cs.shots_taken
    FROM ctp_active_sessions cs
    JOIN users u ON u.member_id = cs.user_id
    JOIN weekly_challenges wc ON wc.id = cs.challenge_id
    WHERE cs.sim_id = p_sim_id
      AND cs.status = 'active'
    ORDER BY cs.started_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

#### 1.4 Extend shots table

```sql
-- Add FK to weekly_challenge_entries for CTP shot tracking
ALTER TABLE shots
ADD COLUMN challenge_entry_id INTEGER REFERENCES weekly_challenge_entries(id);

CREATE INDEX idx_shots_challenge_entry ON shots(challenge_entry_id);

-- Trigger to update entry stats when CTP shots are captured
CREATE OR REPLACE FUNCTION update_ctp_entry_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_best_distance DECIMAL(6,2);
BEGIN
    IF NEW.challenge_entry_id IS NOT NULL THEN
        -- Calculate best distance for this entry
        SELECT MIN(carry_distance)
        INTO v_best_distance
        FROM shots
        WHERE challenge_entry_id = NEW.challenge_entry_id
          AND carry_distance IS NOT NULL;

        -- Update entry record
        UPDATE weekly_challenge_entries
        SET distance_from_pin_inches = ROUND(v_best_distance * 36), -- Convert yards to inches
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.challenge_entry_id;

        -- Update active session progress
        UPDATE ctp_active_sessions
        SET shots_taken = shots_taken + 1,
            best_distance_yards = LEAST(
                COALESCE(best_distance_yards, 999999),
                COALESCE(NEW.carry_distance, 999999)
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE entry_id = NEW.challenge_entry_id
          AND status = 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ctp_entry_stats
    AFTER INSERT ON shots
    FOR EACH ROW
    EXECUTE FUNCTION update_ctp_entry_stats();
```

**Deliverables:**
- [ ] Migration file created
- [ ] Migration tested on staging
- [ ] Migration applied to production

---

### Phase 2: Course Data Sync API (Sim PC → Cloud)
**Time:** 3-4 hours
**Priority:** HIGH

#### 2.1 Endpoint: Sync Course Hole Details

```javascript
// POST /api/sim/courses/:courseId/hole-details
// Sim PC uploads detailed hole data for CTP challenges
app.post('/api/sim/courses/:courseId/hole-details', authenticateSimulator, async (req, res) => {
  const courseId = req.params.courseId;
  const { holeDetails } = req.body;
  const simId = req.simId;

  try {
    // Validate course exists
    const courseCheck = await pool.query(
      'SELECT id FROM simulator_courses_combined WHERE id = $1',
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Upsert hole_details
    await pool.query(
      `UPDATE simulator_courses_combined
       SET hole_details = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(holeDetails), courseId]
    );

    // Update sync status
    await pool.query(
      `INSERT INTO sim_sync_status (sim_id, last_sync_at, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (sim_id) DO UPDATE SET
         last_sync_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [simId]
    );

    res.json({
      success: true,
      courseId: parseInt(courseId),
      holesUpdated: holeDetails.length,
      message: 'Course hole details updated successfully'
    });

  } catch (error) {
    console.error('Course hole details sync error:', error);
    res.status(500).json({ error: 'Failed to sync course hole details' });
  }
});
```

#### 2.2 Endpoint: Get CTP-Eligible Courses

```javascript
// GET /api/courses/ctp-eligible
// Returns courses with detailed hole data suitable for CTP challenges
app.get('/api/courses/ctp-eligible', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        location,
        designer,
        par_values,
        hole_details,
        CASE
          WHEN hole_details IS NOT NULL AND jsonb_array_length(hole_details) > 0
          THEN TRUE
          ELSE FALSE
        END as has_hole_details,
        (
          SELECT COUNT(*)
          FROM jsonb_array_elements(par_values) AS p(value)
          WHERE (p.value)::text::int = 3
        ) as par3_hole_count,
        (
          SELECT array_agg((idx + 1)::int ORDER BY idx)
          FROM jsonb_array_elements(par_values) WITH ORDINALITY arr(value, idx)
          WHERE (arr.value)::text::int = 3
        ) as par3_hole_numbers
      FROM simulator_courses_combined
      WHERE par_values IS NOT NULL
      ORDER BY name
    `);

    res.json(result.rows.filter(course =>
      course.has_hole_details && course.par3_hole_count > 0
    ));

  } catch (error) {
    console.error('Error fetching CTP-eligible courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});
```

**Deliverables:**
- [ ] POST /api/sim/courses/:courseId/hole-details implemented
- [ ] GET /api/courses/ctp-eligible implemented
- [ ] Tested with sim PC dev

---

### Phase 3: CTP Challenge Management API (Admin)
**Time:** 4-5 hours
**Priority:** HIGH

Extend existing `/api/challenges` endpoints to support CTP mode.

#### 3.1 Modify existing createChallenge endpoint

```javascript
// Extend POST /api/challenges to support CTP mode
// Add to existing challenge creation logic:

if (req.body.is_ctp_challenge) {
  const { ctp_mode, ctp_tee_type, ctp_pin_day, ctp_selected_holes, ctp_attempts_per_hole } = req.body;

  // Fetch course hole details
  const courseResult = await pool.query(
    'SELECT hole_details, par_values FROM simulator_courses_combined WHERE id = $1',
    [req.body.course_id]
  );

  if (!courseResult.rows[0].hole_details) {
    return res.status(400).json({
      error: 'Course does not have detailed hole data. Please sync from sim PC first.'
    });
  }

  const holeDetails = courseResult.rows[0].hole_details;
  const parValues = courseResult.rows[0].par_values;

  // Filter eligible holes based on mode
  let eligibleHoles = holeDetails;
  if (ctp_mode === 'par3-holes') {
    eligibleHoles = holeDetails.filter((h, idx) => parValues[idx] === 3);
  }

  // If specific holes selected, filter further
  if (ctp_selected_holes && ctp_selected_holes.length > 0) {
    eligibleHoles = eligibleHoles.filter(h => ctp_selected_holes.includes(h.hole));
  }

  // Pre-compute hole config for .crd generation
  const ctpHolesConfig = eligibleHoles.map(hole => {
    const teePos = hole.tees[ctp_tee_type] || hole.tees['White'];
    const pinPos = hole.pins[ctp_pin_day] || hole.pins['Thursday'];

    // Calculate distance (simplified - sim PC will do accurate calculation)
    const dx = teePos.x - pinPos.x;
    const dz = teePos.z - pinPos.z;
    const distanceYards = Math.round(Math.sqrt(dx * dx + dz * dz) * 1.09361);

    return {
      hole: hole.hole,
      par: hole.par,
      distance: distanceYards,
      teePos,
      pinPos
    };
  });

  // Add CTP fields to challenge insert
  insertQuery += `, is_ctp_challenge, ctp_mode, ctp_tee_type, ctp_pin_day,
                   ctp_selected_holes, ctp_attempts_per_hole, ctp_holes_config`;
  insertValues.push(
    true,
    ctp_mode,
    ctp_tee_type,
    ctp_pin_day,
    ctp_selected_holes,
    ctp_attempts_per_hole,
    JSON.stringify(ctpHolesConfig)
  );
}
```

#### 3.2 New endpoint: Go Live (triggers sim PC sync)

```javascript
// PUT /api/challenges/:id/go-live
// Admin marks CTP challenge as live, triggers sim PC to download and generate .crd
app.put('/api/challenges/:id/go-live', authenticateToken, requireAdmin, async (req, res) => {
  const challengeId = req.params.id;

  try {
    // Verify challenge exists and is CTP
    const challenge = await pool.query(
      'SELECT * FROM weekly_challenges WHERE id = $1 AND is_ctp_challenge = TRUE',
      [challengeId]
    );

    if (challenge.rows.length === 0) {
      return res.status(404).json({ error: 'CTP challenge not found' });
    }

    if (challenge.rows[0].status === 'active') {
      return res.status(400).json({ error: 'Challenge is already live' });
    }

    // Update status to active
    await pool.query(
      `UPDATE weekly_challenges
       SET status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [challengeId]
    );

    res.json({
      success: true,
      status: 'active',
      message: 'Challenge is now live. Sim PC will sync within 10 seconds.'
    });

  } catch (error) {
    console.error('Error making challenge live:', error);
    res.status(500).json({ error: 'Failed to make challenge live' });
  }
});
```

**Deliverables:**
- [ ] Extend POST /api/challenges for CTP mode
- [ ] Add PUT /api/challenges/:id/go-live
- [ ] Add admin authorization middleware
- [ ] Test challenge creation flow

---

### Phase 4: Sim PC Sync APIs
**Time:** 3-4 hours
**Priority:** HIGH

#### 4.1 Endpoint: Poll for Pending CTP Challenges

```javascript
// GET /api/sim/ctp-challenges/pending
// Sim PC polls every 10 seconds for active CTPs that haven't been synced yet
app.get('/api/sim/ctp-challenges/pending', authenticateSimulator, async (req, res) => {
  const simId = req.simId;

  try {
    const result = await pool.query(`
      SELECT
        wc.*,
        sc.name as course_name,
        sc.location as course_location
      FROM weekly_challenges wc
      JOIN simulator_courses_combined sc ON sc.id = wc.course_id
      WHERE wc.sim_id = $1
        AND wc.is_ctp_challenge = TRUE
        AND wc.status = 'active'
        AND wc.synced_to_sim_at IS NULL
      ORDER BY wc.created_at ASC
    `, [simId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching pending CTP challenges:', error);
    res.status(500).json({ error: 'Failed to fetch pending challenges' });
  }
});
```

#### 4.2 Endpoint: Confirm Challenge Synced

```javascript
// PUT /api/sim/ctp-challenges/:id/synced
// Sim PC confirms .crd file was generated and saved successfully
app.put('/api/sim/ctp-challenges/:id/synced', authenticateSimulator, async (req, res) => {
  const challengeId = req.params.id;
  const { crdFilename, crdContent } = req.body;
  const simId = req.simId;

  try {
    await pool.query(`
      UPDATE weekly_challenges
      SET synced_to_sim_at = CURRENT_TIMESTAMP,
          crd_filename = $1,
          crd_content = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND sim_id = $4
    `, [crdFilename, JSON.stringify(crdContent), challengeId, simId]);

    res.json({ success: true, message: 'Challenge sync confirmed' });

  } catch (error) {
    console.error('Error confirming challenge sync:', error);
    res.status(500).json({ error: 'Failed to confirm sync' });
  }
});
```

#### 4.3 Endpoint: Get Active CTP Session

```javascript
// GET /api/sim/active-ctp-session
// Sim PC polls to check if a user has activated a CTP session
app.get('/api/sim/active-ctp-session', authenticateSimulator, async (req, res) => {
  const simId = req.simId;

  try {
    const result = await pool.query(
      'SELECT * FROM get_active_ctp_session_for_sim($1)',
      [simId]
    );

    if (result.rows.length === 0) {
      return res.json({ active_session: null });
    }

    res.json({ active_session: result.rows[0] });

  } catch (error) {
    console.error('Error fetching active CTP session:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});
```

**Deliverables:**
- [ ] GET /api/sim/ctp-challenges/pending
- [ ] PUT /api/sim/ctp-challenges/:id/synced
- [ ] GET /api/sim/active-ctp-session
- [ ] Tested with sim PC polling

---

### Phase 5: User CTP Participation API
**Time:** 4-5 hours
**Priority:** MEDIUM

#### 5.1 Browse CTP Challenges

```javascript
// GET /api/challenges/ctp
// Users browse available CTP challenges
app.get('/api/challenges/ctp', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        wc.*,
        sc.name as course_name,
        sc.location as course_location,
        COUNT(DISTINCT wce.id) as participant_count,
        EXISTS(
          SELECT 1 FROM weekly_challenge_entries wce2
          WHERE wce2.challenge_id = wc.id
            AND wce2.user_id = $1
        ) as user_entered
      FROM weekly_challenges wc
      JOIN simulator_courses_combined sc ON sc.id = wc.course_id
      LEFT JOIN weekly_challenge_entries wce ON wce.challenge_id = wc.id
      WHERE wc.is_ctp_challenge = TRUE
        AND wc.status = 'active'
      GROUP BY wc.id, sc.name, sc.location
      ORDER BY wc.week_start_date DESC
    `, [req.userId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching CTP challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});
```

#### 5.2 Activate CTP Session

```javascript
// POST /api/challenges/:id/activate-session
// User activates their CTP session on the sim
app.post('/api/challenges/:id/activate-session', authenticateToken, async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.userId;
  const { simId } = req.body; // User selects which sim (if multiple)

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify challenge exists and user has entered
    const entryCheck = await client.query(
      `SELECT wce.id, wc.challenge_name, wc.crd_filename
       FROM weekly_challenge_entries wce
       JOIN weekly_challenges wc ON wc.id = wce.challenge_id
       WHERE wce.challenge_id = $1 AND wce.user_id = $2`,
      [challengeId, userId]
    );

    if (entryCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You must enter the challenge first' });
    }

    const entry = entryCheck.rows[0];

    // Check if sim already has an active CTP session
    const activeCheck = await client.query(
      'SELECT id FROM ctp_active_sessions WHERE sim_id = $1 AND status = $\'active\'',
      [simId]
    );

    if (activeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Another user has an active session on this simulator'
      });
    }

    // Create simulator_session first (for shot tracking)
    const simSessionResult = await client.query(
      `INSERT INTO simulator_sessions
       (sim_id, nn_player_id, status, session_type, course_name, started_at)
       VALUES ($1, $2, 'active', 'ctp_challenge', $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [simId, userId, entry.course_name]
    );

    const simSessionId = simSessionResult.rows[0].id;

    // Create CTP active session
    const ctpSessionResult = await client.query(
      `INSERT INTO ctp_active_sessions
       (challenge_id, entry_id, user_id, sim_id, simulator_session_id, status, started_at)
       VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP)
       RETURNING id`,
      [challengeId, entry.id, userId, simId, simSessionId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      sessionId: ctpSessionResult.rows[0].id,
      simSessionId: simSessionId,
      challengeName: entry.challenge_name,
      crdFilename: entry.crd_filename,
      message: `Session activated! Load "${entry.crd_filename}" in GSPro and start playing.`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error activating CTP session:', error);
    res.status(500).json({ error: 'Failed to activate session' });
  } finally {
    client.release();
  }
});
```

#### 5.3 Get CTP Leaderboard

```javascript
// GET /api/challenges/:id/leaderboard
// Real-time leaderboard from shot data
app.get('/api/challenges/:id/leaderboard', authenticateToken, async (req, res) => {
  const challengeId = req.params.id;

  try {
    const result = await pool.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY wce.distance_from_pin_inches ASC NULLS LAST) as rank,
        u.member_id as user_id,
        u.full_name as user_name,
        u.avatar,
        wce.distance_from_pin_inches,
        ROUND(wce.distance_from_pin_inches / 36.0, 1) as distance_yards,
        COUNT(s.id) as shots_taken,
        wce.status,
        wce.created_at as entered_at
      FROM weekly_challenge_entries wce
      JOIN users u ON u.member_id = wce.user_id
      LEFT JOIN shots s ON s.challenge_entry_id = wce.id
      WHERE wce.challenge_id = $1
      GROUP BY wce.id, u.member_id, u.full_name, u.avatar
      ORDER BY wce.distance_from_pin_inches ASC NULLS LAST
    `, [challengeId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching CTP leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
```

**Deliverables:**
- [ ] GET /api/challenges/ctp
- [ ] POST /api/challenges/:id/activate-session
- [ ] GET /api/challenges/:id/leaderboard
- [ ] End session endpoint
- [ ] Tested activation flow

---

### Phase 6: Extend Admin UI
**Time:** 3-4 hours
**Priority:** MEDIUM

Extend `WeeklyChallengeAdmin.tsx` to support CTP challenge creation.

#### 6.1 Add CTP Challenge Type Toggle

```typescript
// In create challenge form
const [isCTPChallenge, setIsCTPChallenge] = useState(false);
const [ctpConfig, setCtpConfig] = useState({
  mode: 'par3-holes',
  teeType: 'White',
  pinDay: 'Thursday',
  attemptsPerHole: 3,
  selectedHoles: []
});

// Toggle between manual and CTP challenge
<div className="form-group">
  <label>Challenge Type</label>
  <select
    value={isCTPChallenge ? 'ctp' : 'manual'}
    onChange={(e) => setIsCTPChallenge(e.target.value === 'ctp')}
  >
    <option value="manual">Manual Screenshot Submission</option>
    <option value="ctp">Auto CTP (Simulator)</option>
  </select>
</div>

{isCTPChallenge && (
  <>
    <div className="form-group">
      <label>Mode</label>
      <select value={ctpConfig.mode} onChange={...}>
        <option value="par3-holes">Par 3 Holes Only</option>
        <option value="par3-tees">All Holes from Par 3 Tees</option>
      </select>
    </div>

    <div className="form-group">
      <label>Tee Type</label>
      <select value={ctpConfig.teeType} onChange={...}>
        <option value="Black">Black Tees</option>
        <option value="Blue">Blue Tees</option>
        <option value="White">White Tees</option>
        <option value="Yellow">Yellow Tees</option>
        <option value="Par3">Par 3 Tees</option>
      </select>
    </div>

    <div className="form-group">
      <label>Pin Position</label>
      <select value={ctpConfig.pinDay} onChange={...}>
        <option value="Thursday">Thursday</option>
        <option value="Friday">Friday</option>
        <option value="Saturday">Saturday</option>
        <option value="Sunday">Sunday</option>
      </select>
    </div>

    <div className="form-group">
      <label>Attempts Per Hole</label>
      <input
        type="number"
        value={ctpConfig.attemptsPerHole}
        onChange={...}
        min="1"
        max="10"
      />
    </div>

    {/* Hole selection UI */}
    <div className="form-group">
      <label>Select Holes (leave empty for all eligible)</label>
      <HoleSelector
        courseId={selectedCourse?.id}
        mode={ctpConfig.mode}
        selectedHoles={ctpConfig.selectedHoles}
        onChange={(holes) => setCtpConfig({...ctpConfig, selectedHoles: holes})}
      />
    </div>
  </>
)}
```

#### 6.2 Add "Go Live" Button

```typescript
// In challenge list, add action button for draft CTP challenges
{challenge.is_ctp_challenge && challenge.status === 'completed' && !challenge.synced_to_sim_at && (
  <Button
    onClick={() => handleGoLive(challenge.id)}
    variant="primary"
  >
    Go Live
  </Button>
)}
```

**Deliverables:**
- [ ] Extend WeeklyChallengeAdmin with CTP fields
- [ ] Add course hole preview
- [ ] Add "Go Live" button
- [ ] Test admin creation flow

---

### Phase 7: User PWA UI
**Time:** 3-4 hours
**Priority:** MEDIUM

Extend existing challenge components to support CTP.

#### 7.1 Extend ChallengesList Component

```typescript
// Show CTP challenges with "Activate Session" button
{challenge.is_ctp_challenge && challenge.user_entered && (
  <Button
    onClick={() => handleActivateSession(challenge.id)}
    variant="primary"
    disabled={hasActiveSession}
  >
    {hasActiveSession ? 'Session Active' : 'Activate Session'}
  </Button>
)}
```

#### 7.2 Extend ChallengeLeaderboard Component

```typescript
// Real-time leaderboard for CTP challenges
// Poll every 5 seconds while user has active session
useEffect(() => {
  if (challenge.is_ctp_challenge && hasActiveSession) {
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5000);
    return () => clearInterval(interval);
  }
}, [hasActiveSession]);
```

**Deliverables:**
- [ ] Extend ChallengesList for CTP
- [ ] Add session activation button
- [ ] Update ChallengeLeaderboard for real-time
- [ ] Test on mobile PWA

---

### Phase 8: Sim PC Integration Guide
**Time:** 2 hours
**Priority:** HIGH

Create comprehensive guide for sim PC developer.

**File:** `SIM_PC_CTP_DEVELOPER_GUIDE.md`

**Contents:**
1. Course data sync (read .gspcrse files, POST to /api/sim/courses/:id/hole-details)
2. CTP challenge polling (GET /api/sim/ctp-challenges/pending every 10s)
3. .crd file generation (using ctp_holes_config from challenge)
4. Session polling (GET /api/sim/active-ctp-session every 10s)
5. Shot capture with challenge_entry_id
6. Example code snippets
7. Testing procedures

**Deliverables:**
- [ ] Complete integration guide
- [ ] .crd generation example
- [ ] Testing checklist
- [ ] Handoff to sim PC dev

---

## Summary of Changes

### New Tables: 1
- `ctp_active_sessions` (slim table, ~6 columns)

### Extended Tables: 3
- `simulator_courses_combined` (+1 column: hole_details JSONB)
- `weekly_challenges` (+10 columns for CTP fields)
- `shots` (+1 column: challenge_entry_id FK)

### New API Endpoints: 8
- POST /api/sim/courses/:courseId/hole-details
- GET /api/courses/ctp-eligible
- PUT /api/challenges/:id/go-live
- GET /api/sim/ctp-challenges/pending
- PUT /api/sim/ctp-challenges/:id/synced
- GET /api/sim/active-ctp-session
- GET /api/challenges/ctp
- POST /api/challenges/:id/activate-session

### Extended Endpoints: 1
- POST /api/challenges (add CTP mode support)

### Extended UI Components: 2
- WeeklyChallengeAdmin.tsx (add CTP fields)
- ChallengesList.tsx (add session activation)

---

## Timeline

**Week 1: Backend Foundation**
- Day 1: Phase 1 (Database schema)
- Day 2: Phase 2 (Course sync API)
- Day 3: Phase 3 (Challenge management API)
- Day 4-5: Phase 4 (Sim PC sync APIs)

**Week 2: User Features & Sim PC**
- Day 1-2: Phase 5 (User participation API)
- Day 3: Phase 6 (Admin UI)
- Day 4: Phase 7 (User PWA UI)
- Day 5: Phase 8 (Sim PC guide) + Testing

**Total: 2 weeks**

---

## Key Decisions

1. **Reuse weekly_challenges** - Add CTP-specific columns rather than new table
2. **Extend simulator_courses_combined** - Add hole_details JSONB rather than separate tables
3. **Reuse weekly_challenge_entries** - Same entry/payment flow for both challenge types
4. **Slim ctp_active_sessions** - Only for active session state, minimal fields
5. **Sim PC: nn-no5** - Single sim initially, can expand later
6. **Polling: 10 seconds** - Sim PC polls for challenges and sessions
7. **Real-time leaderboard** - Auto-updates from shots table via triggers

---

## Next Steps

1. Review this revised plan
2. Create Phase 1 migration
3. Test on staging database
4. Begin API implementation
5. Coordinate with sim PC developer

---

*Last Updated: 2025-12-05*
*Document Version: 2.0 (Revised)*
