# Club Event Coordinator Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for creating a club-level event management role in GolfApp1. The new "Club Event Coordinator" role will enable designated users at each club to create and manage tournaments, leagues, and challenges exclusively for their club members, without requiring full admin access.

**Estimated Timeline:** 2-3 weeks
**Complexity:** Medium
**Dependencies:** Existing permission system, club infrastructure, event management systems

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Goals & Requirements](#goals--requirements)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Database Changes](#database-changes)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Security Considerations](#security-considerations)
9. [Testing Plan](#testing-plan)
10. [Migration Strategy](#migration-strategy)
11. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### ✅ Existing Infrastructure (Strengths)

1. **Robust Permission System**
   - Multi-role support with role-permission mapping
   - 24 permissions across 8 categories
   - Both frontend and backend permission checks
   - Location: `db/migrations/Production Complete/002_create_permission_system.sql`

2. **Club Architecture**
   - Users associated with clubs via `users.club` column
   - Club table with comprehensive metadata
   - Club-specific leaderboards and dashboards
   - Location: `db/migrations/Production Complete/018_create_clubs_table.sql`

3. **Event Management Systems**
   - Tournaments: Full CRUD with registration, scoring, brackets
   - Leagues: Team-based play with schedules and standings
   - Challenges: Weekly challenges with prize pools
   - Location: `server.js` (lines 1806+, 13769+, 15997+)

4. **Admin Hub Pattern**
   - Well-structured hub with navigation
   - Modular component architecture
   - Protected routes with permission checks
   - Location: `client/src/components/AdminLanding.tsx`

### ❌ Gaps to Address

1. **No Club-Scoped Event Management**
   - Events are currently global or have weak club restrictions
   - `club_restriction` field exists but not enforced
   - No filtering by club in event queries

2. **Security Vulnerabilities**
   - Tournament creation endpoint lacks authentication (`POST /api/tournaments`)
   - Missing authorization checks on update/delete operations
   - No validation that users can only manage their club's events

3. **Missing Club Event Coordinator Role**
   - No role exists between "Member" and "Admin"
   - Club Pros have broad permissions not specific to event management
   - Need dedicated role with scoped permissions

4. **No Club Event Hub**
   - No dedicated interface for club-level event management
   - Club event coordinators would need admin access
   - No way to view only club-specific events

---

## Goals & Requirements

### Primary Goals

1. **Enable Club-Level Event Management**
   - Allow designated users to create tournaments, leagues, and challenges for their club
   - Restrict access to only their club's events and members
   - Provide dedicated management interface

2. **Maintain Data Isolation**
   - Club event coordinators see only their club's data
   - Cannot modify events from other clubs
   - Admins retain global access

3. **Preserve Admin Capabilities**
   - Admins can still manage all events across all clubs
   - View-as mode continues to work
   - No regression in existing functionality

### Functional Requirements

- **FR-1:** Club event coordinators can create tournaments for their club
- **FR-2:** Club event coordinators can create leagues for their club
- **FR-3:** Club event coordinators can create challenges for their club
- **FR-4:** Club event coordinators can edit/delete events they created
- **FR-5:** Club event coordinators can view their club's member roster
- **FR-6:** Club event coordinators can view their club's event analytics
- **FR-7:** Club event coordinators cannot access other clubs' events
- **FR-8:** Admins can manage events for all clubs
- **FR-9:** Events are clearly labeled with their club association
- **FR-10:** Global events (open to all clubs) remain supported

### Non-Functional Requirements

- **NFR-1:** All event creation requires authentication
- **NFR-2:** All event modification requires authorization
- **NFR-3:** Response time for club-filtered queries < 500ms
- **NFR-4:** UI clearly indicates club scope vs global scope
- **NFR-5:** Backward compatible with existing events

---

## Technical Architecture

### Role Definition

**Role Name:** Club Event Coordinator
**Role Key:** `club_event_coordinator`
**Description:** Manages tournaments, leagues, and challenges for their home club only

### Permissions Matrix

| Permission | Club Event Coordinator | Club Pro | Admin | Member |
|------------|----------------------|----------|-------|--------|
| `manage_tournaments` | ✅ (own club only) | ✅ | ✅ | ❌ |
| `manage_challenges` | ✅ (own club only) | ✅ | ✅ | ❌ |
| `manage_scores` | ✅ (own club only) | ✅ | ✅ | ❌ |
| `view_club_handicaps` | ✅ (own club only) | ✅ | ✅ | ❌ |
| `manage_club_members` | ✅ (own club only) | ✅ | ✅ | ❌ |
| `view_analytics` | ✅ (own club only) | ✅ | ✅ | ❌ |
| `access_admin_panel` | ✅ (club hub) | ✅ | ✅ | ❌ |
| `manage_permissions` | ❌ | ❌ | ✅ | ❌ |
| `manage_users` | ❌ | ❌ | ✅ | ❌ |

### Data Model Changes

```
tournaments
├── id (existing)
├── name (existing)
├── club (NEW) ───────→ clubs.club_name
├── created_by (existing)
└── club_restriction (existing, deprecated)

leagues
├── id (existing)
├── name (existing)
├── club (NEW) ───────→ clubs.club_name
└── created_by (existing)

weekly_challenges
├── id (existing)
├── challenge_name (existing)
├── club (NEW) ───────→ clubs.club_name
└── created_by (existing)
```

### Component Architecture

```
ClubEventHub (main hub)
├── ClubTournamentManagement
│   ├── TournamentForm (reuse with club pre-fill)
│   └── TournamentList (filtered by club)
├── ClubLeagueManagement
│   ├── LeagueManagement (reuse with club filter)
│   └── LeagueList (filtered by club)
├── ClubChallengeManagement
│   ├── WeeklyChallengeAdmin (reuse with club filter)
│   └── ChallengeList (filtered by club)
└── ClubMembersDashboard
    └── ClubProDashboard (reuse)
```

---

## Implementation Phases

### Phase 1: Database & Permission Setup (2-3 days)

**Objectives:**
- Create new role and assign permissions
- Add club scoping columns to event tables
- Create indexes for performance
- Backfill existing data

**Deliverables:**
- Migration file: `XXX_create_club_event_coordinator_role.sql`
- Migration file: `XXX_add_club_scoping_to_events.sql`
- Migration file: `XXX_backfill_event_clubs.sql`

**Success Criteria:**
- [ ] New role exists in database
- [ ] All event tables have `club` column
- [ ] Indexes created and performant
- [ ] Existing events have club assigned

### Phase 2: Backend API Security & Scoping (3-4 days)

**Objectives:**
- Add authentication to all event creation endpoints
- Add authorization checks based on club
- Create club-filtered query endpoints
- Update existing endpoints

**Deliverables:**
- Updated `server.js` with authentication
- Club scoping middleware functions
- New GET endpoints for club-filtered events
- Updated authorization logic

**Success Criteria:**
- [ ] All POST endpoints require authentication
- [ ] Club event coordinators can only create for their club
- [ ] Club event coordinators can only edit their club's events
- [ ] New endpoints return club-filtered results
- [ ] Admins retain global access

### Phase 3: Frontend Components (4-5 days)

**Objectives:**
- Create Club Event Hub
- Create club-scoped event management components
- Add protected routes
- Update navigation

**Deliverables:**
- `ClubEventHub.tsx` component
- `ClubTournamentManagement.tsx` component
- `ClubLeagueManagement.tsx` component
- `ClubChallengeManagement.tsx` component
- `ClubMembersDashboard.tsx` component
- Updated routing in `App.tsx`
- Updated navigation component

**Success Criteria:**
- [ ] Club event coordinators see dedicated hub
- [ ] Hub shows only their club's events
- [ ] Can create events with club pre-filled
- [ ] Cannot access other clubs' events
- [ ] UI clearly shows club scope

### Phase 4: Testing & QA (2-3 days)

**Objectives:**
- Unit test permission checks
- Integration test API endpoints
- End-to-end test user flows
- Security testing

**Deliverables:**
- Test suite for permissions
- Test suite for API endpoints
- E2E test scenarios
- Security audit results

**Success Criteria:**
- [ ] All tests pass
- [ ] No security vulnerabilities
- [ ] Performance requirements met
- [ ] No regressions in existing features

### Phase 5: Documentation & Deployment (1-2 days)

**Objectives:**
- Document new role and permissions
- Create user guide for club event coordinators
- Update admin documentation
- Deploy to production

**Deliverables:**
- Role documentation
- User guide
- Admin guide
- Deployment checklist

**Success Criteria:**
- [ ] Documentation complete
- [ ] Deployment successful
- [ ] Monitoring in place
- [ ] Rollback plan ready

---

## Database Changes

### Migration 1: Create Club Event Coordinator Role

**File:** `db/migrations/XXX_create_club_event_coordinator_role.sql`

```sql
-- Create new role
INSERT INTO roles (role_name, role_key, description, is_system_role, is_active)
VALUES (
  'Club Event Coordinator',
  'club_event_coordinator',
  'Manages tournaments, leagues, and challenges for their home club only',
  true,
  true
);

-- Assign permissions to the role
WITH new_role AS (
  SELECT id FROM roles WHERE role_key = 'club_event_coordinator'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM new_role),
  p.id
FROM permissions p
WHERE p.permission_key IN (
  -- Event management (club-scoped)
  'manage_tournaments',
  'manage_challenges',
  'manage_scores',

  -- Club member visibility
  'view_club_handicaps',
  'manage_club_members',

  -- Analytics for their club
  'view_analytics',

  -- Access to management interface
  'access_admin_panel'
);

-- Verify the role was created
SELECT r.role_name, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.role_key = 'club_event_coordinator'
GROUP BY r.role_name;
```

### Migration 2: Add Club Scoping to Event Tables

**File:** `db/migrations/XXX_add_club_scoping_to_events.sql`

```sql
-- Add club column to tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS club VARCHAR(100);

-- Add foreign key constraint
ALTER TABLE tournaments
  ADD CONSTRAINT fk_tournaments_club
  FOREIGN KEY (club) REFERENCES clubs(club_name) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_club ON tournaments(club);

-- Add club column to leagues
ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS club VARCHAR(100);

ALTER TABLE leagues
  ADD CONSTRAINT fk_leagues_club
  FOREIGN KEY (club) REFERENCES clubs(club_name) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leagues_club ON leagues(club);

-- Add club column to weekly_challenges
ALTER TABLE weekly_challenges
  ADD COLUMN IF NOT EXISTS club VARCHAR(100);

ALTER TABLE weekly_challenges
  ADD CONSTRAINT fk_weekly_challenges_club
  FOREIGN KEY (club) REFERENCES clubs(club_name) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_challenges_club ON weekly_challenges(club);

-- Add comments for documentation
COMMENT ON COLUMN tournaments.club IS 'Club that owns this tournament. NULL for global tournaments.';
COMMENT ON COLUMN leagues.club IS 'Club that owns this league. NULL for global leagues.';
COMMENT ON COLUMN weekly_challenges.club IS 'Club that owns this challenge. NULL for global challenges.';
```

### Migration 3: Backfill Existing Event Clubs

**File:** `db/migrations/XXX_backfill_event_clubs.sql`

```sql
-- Backfill tournaments with creator's club
UPDATE tournaments t
SET club = u.club
FROM users u
WHERE t.created_by = u.member_id
  AND t.club IS NULL
  AND u.club IS NOT NULL;

-- Backfill leagues with creator's club
UPDATE leagues l
SET club = u.club
FROM users u
WHERE l.created_by = u.member_id
  AND l.club IS NULL
  AND u.club IS NOT NULL;

-- Backfill challenges with creator's club
UPDATE weekly_challenges wc
SET club = u.club
FROM users u
WHERE wc.created_by = u.member_id
  AND wc.club IS NULL
  AND u.club IS NOT NULL;

-- Report on backfill results
SELECT
  'Tournaments' as event_type,
  COUNT(*) FILTER (WHERE club IS NOT NULL) as with_club,
  COUNT(*) FILTER (WHERE club IS NULL) as global,
  COUNT(*) as total
FROM tournaments
UNION ALL
SELECT
  'Leagues',
  COUNT(*) FILTER (WHERE club IS NOT NULL),
  COUNT(*) FILTER (WHERE club IS NULL),
  COUNT(*)
FROM leagues
UNION ALL
SELECT
  'Challenges',
  COUNT(*) FILTER (WHERE club IS NOT NULL),
  COUNT(*) FILTER (WHERE club IS NULL),
  COUNT(*)
FROM weekly_challenges;
```

---

## Backend Implementation

### 1. Add Club Context Middleware

**Location:** `server.js` (after line 541 - permission middleware)

```javascript
/**
 * Middleware to add club context to request
 * Determines if user can access requested club's data
 */
async function requireClubAccess(req, res, next) {
  const requestedClub = req.params.clubName || req.query.club || req.body.club;
  const userClub = req.userDetails.club;
  const userId = req.userDetails.member_id;

  // Check if user is admin
  const isAdmin = await userHasPermission(userId, 'manage_permissions');

  // Admins can access any club
  if (isAdmin) {
    req.clubContext = {
      club: requestedClub || userClub,
      isAdmin: true,
      canAccessAllClubs: true
    };
    return next();
  }

  // Non-admins can only access their own club
  if (requestedClub && requestedClub !== userClub) {
    return res.status(403).json({
      error: 'You can only access data for your own club'
    });
  }

  req.clubContext = {
    club: userClub,
    isAdmin: false,
    canAccessAllClubs: false
  };

  next();
}
```

### 2. Update Tournament Creation Endpoint

**Location:** `server.js` (line 1806)

**BEFORE:**
```javascript
app.post('/api/tournaments', async (req, res) => {
  // No authentication!
  // Insert tournament...
});
```

**AFTER:**
```javascript
app.post('/api/tournaments',
  authenticateToken,
  requireAnyPermission('manage_tournaments'),
  async (req, res) => {
    try {
      const userClub = req.userDetails.club;
      const userId = req.userDetails.member_id;
      const isAdmin = await userHasPermission(userId, 'manage_permissions');

      // Extract club from request
      let tournamentClub = req.body.club;

      // Club Event Coordinators can only create for their own club
      if (!isAdmin && tournamentClub && tournamentClub !== userClub) {
        return res.status(403).json({
          error: 'You can only create tournaments for your own club'
        });
      }

      // Default to user's club if not specified
      if (!tournamentClub) {
        tournamentClub = userClub;
      }

      // Validate club exists
      if (tournamentClub) {
        const clubExists = await pool.query(
          'SELECT 1 FROM clubs WHERE club_name = $1',
          [tournamentClub]
        );
        if (clubExists.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid club' });
        }
      }

      // Insert tournament with club
      const result = await pool.query(`
        INSERT INTO tournaments (
          name, description, start_date, end_date, club, created_by,
          tournament_format, status, registration_open, max_participants,
          entry_fee, course, rules, notes, type, hole_configuration,
          tee, pins, wind_speed, wind_direction, green_speed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `, [
        req.body.name,
        req.body.description,
        req.body.start_date,
        req.body.end_date,
        tournamentClub,  // NEW: Club field
        userId,          // Creator
        req.body.tournament_format || 'match_play',
        req.body.status || 'draft',
        req.body.registration_open !== false,
        req.body.max_participants,
        req.body.entry_fee || 0,
        req.body.course,
        req.body.rules,
        req.body.notes,
        req.body.type || 'tournament',
        req.body.hole_configuration || '18',
        req.body.tee || 'Red',
        req.body.pins || 'Friday',
        req.body.wind_speed,
        req.body.wind_direction,
        req.body.green_speed
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  }
);
```

### 3. Update Tournament Update Endpoint

**Location:** `server.js` (line 1894)

**BEFORE:**
```javascript
app.put('/api/tournaments/:id', async (req, res) => {
  // No authentication or authorization!
});
```

**AFTER:**
```javascript
app.put('/api/tournaments/:id',
  authenticateToken,
  requireAnyPermission('manage_tournaments'),
  async (req, res) => {
    try {
      const tournamentId = req.params.id;
      const userId = req.userDetails.member_id;
      const userClub = req.userDetails.club;

      // Get existing tournament
      const existing = await pool.query(
        'SELECT club, created_by FROM tournaments WHERE id = $1',
        [tournamentId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = existing.rows[0];
      const isAdmin = await userHasPermission(userId, 'manage_permissions');
      const isCreator = tournament.created_by === userId;
      const sameClub = tournament.club === userClub;

      // Authorization check: Allow if admin OR (creator AND same club)
      if (!isAdmin && !(isCreator && sameClub)) {
        return res.status(403).json({
          error: 'You can only edit tournaments from your own club'
        });
      }

      // Prevent changing club unless admin
      if (!isAdmin && req.body.club && req.body.club !== tournament.club) {
        return res.status(403).json({
          error: 'You cannot change the club of a tournament'
        });
      }

      // Update tournament
      const result = await pool.query(`
        UPDATE tournaments
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          max_participants = COALESCE($5, max_participants),
          registration_open = COALESCE($6, registration_open),
          status = COALESCE($7, status),
          course = COALESCE($8, course),
          rules = COALESCE($9, rules),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `, [
        req.body.name,
        req.body.description,
        req.body.start_date,
        req.body.end_date,
        req.body.max_participants,
        req.body.registration_open,
        req.body.status,
        req.body.course,
        req.body.rules,
        tournamentId
      ]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  }
);
```

### 4. Add Club-Filtered Query Endpoints

**Location:** `server.js` (after tournament endpoints, around line 2100)

```javascript
/**
 * Get tournaments for a specific club
 * Accessible by club event coordinators for their club, admins for all clubs
 */
app.get('/api/tournaments/club/:clubName',
  authenticateToken,
  requireClubAccess,
  async (req, res) => {
    try {
      const { clubName } = req.params;
      const { status, includeGlobal } = req.query;

      let query = `
        SELECT
          t.*,
          u.first_name || ' ' || u.last_name as creator_name,
          COUNT(DISTINCT p.user_member_id) as participant_count
        FROM tournaments t
        LEFT JOIN users u ON t.created_by = u.member_id
        LEFT JOIN participation p ON t.id = p.tournament_id
        WHERE (t.club = $1 ${includeGlobal === 'true' ? 'OR t.club IS NULL' : ''})
      `;

      const params = [clubName];

      if (status) {
        query += ` AND t.status = $${params.length + 1}`;
        params.push(status);
      }

      query += `
        GROUP BY t.id, u.first_name, u.last_name
        ORDER BY t.created_at DESC
      `;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching club tournaments:', error);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  }
);

/**
 * Get leagues for a specific club
 */
app.get('/api/leagues/club/:clubName',
  authenticateToken,
  requireClubAccess,
  async (req, res) => {
    try {
      const { clubName } = req.params;
      const { includeGlobal } = req.query;

      const query = `
        SELECT
          l.*,
          u.first_name || ' ' || u.last_name as creator_name,
          COUNT(DISTINCT tt.id) as team_count
        FROM leagues l
        LEFT JOIN users u ON l.created_by = u.member_id
        LEFT JOIN tournament_teams tt ON l.id = tt.league_id
        WHERE (l.club = $1 ${includeGlobal === 'true' ? 'OR l.club IS NULL' : ''})
        GROUP BY l.id, u.first_name, u.last_name
        ORDER BY l.created_at DESC
      `;

      const result = await pool.query(query, [clubName]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching club leagues:', error);
      res.status(500).json({ error: 'Failed to fetch leagues' });
    }
  }
);

/**
 * Get challenges for a specific club
 */
app.get('/api/challenges/club/:clubName',
  authenticateToken,
  requireClubAccess,
  async (req, res) => {
    try {
      const { clubName } = req.params;
      const { status, includeGlobal } = req.query;

      let query = `
        SELECT
          wc.*,
          u.first_name || ' ' || u.last_name as creator_name,
          COUNT(DISTINCT wce.id) as entry_count
        FROM weekly_challenges wc
        LEFT JOIN users u ON wc.created_by = u.member_id
        LEFT JOIN weekly_challenge_entries wce ON wc.id = wce.challenge_id
        WHERE (wc.club = $1 ${includeGlobal === 'true' ? 'OR wc.club IS NULL' : ''})
      `;

      const params = [clubName];

      if (status === 'active') {
        query += ` AND wc.week_end_date >= CURRENT_DATE`;
      }

      query += `
        GROUP BY wc.id, u.first_name, u.last_name
        ORDER BY wc.created_at DESC
      `;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching club challenges:', error);
      res.status(500).json({ error: 'Failed to fetch challenges' });
    }
  }
);
```

### 5. Update League Creation Endpoint

**Location:** `server.js` (line 13769)

Add club scoping logic similar to tournaments:

```javascript
app.post('/api/leagues',
  authenticateToken,
  requirePermission('manage_tournaments'),
  async (req, res) => {
    try {
      const userClub = req.userDetails.club;
      const userId = req.userDetails.member_id;
      const isAdmin = await userHasPermission(userId, 'manage_permissions');

      let leagueClub = req.body.club;

      // Club Event Coordinators can only create for their own club
      if (!isAdmin && leagueClub && leagueClub !== userClub) {
        return res.status(403).json({
          error: 'You can only create leagues for your own club'
        });
      }

      if (!leagueClub) {
        leagueClub = userClub;
      }

      // Insert league with club
      const result = await pool.query(`
        INSERT INTO leagues (
          name, season, description, start_date, end_date,
          teams_per_division, divisions_count, club, created_by,
          points_for_win, points_for_tie, points_for_loss,
          format, individual_holes, alternate_shot_holes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        req.body.name,
        req.body.season,
        req.body.description,
        req.body.start_date,
        req.body.end_date,
        req.body.teams_per_division,
        req.body.divisions_count,
        leagueClub,  // NEW: Club field
        userId,
        req.body.points_for_win || 3,
        req.body.points_for_tie || 1,
        req.body.points_for_loss || 0,
        req.body.format || 'hybrid',
        req.body.individual_holes || '1-9',
        req.body.alternate_shot_holes || '10-18'
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating league:', error);
      res.status(500).json({ error: 'Failed to create league' });
    }
  }
);
```

### 6. Update Challenge Creation Endpoint

**Location:** `server.js` (line 15997)

Add club scoping logic:

```javascript
app.post('/api/challenges',
  authenticateToken,
  requirePermission('manage_tournaments'),
  async (req, res) => {
    try {
      const userClub = req.userDetails.club;
      const userId = req.userDetails.member_id;
      const isAdmin = await userHasPermission(userId, 'manage_permissions');

      let challengeClub = req.body.club;

      // Club Event Coordinators can only create for their own club
      if (!isAdmin && challengeClub && challengeClub !== userClub) {
        return res.status(403).json({
          error: 'You can only create challenges for your own club'
        });
      }

      if (!challengeClub) {
        challengeClub = userClub;
      }

      // Insert challenge with club
      const result = await pool.query(`
        INSERT INTO weekly_challenges (
          challenge_name, designated_hole, entry_fee, reup_fee,
          week_start_date, week_end_date, challenge_type_id,
          course_id, club, created_by, instructions,
          is_ctp_challenge, ctp_mode, ctp_tee_type, ctp_pin_day
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        req.body.challenge_name,
        req.body.designated_hole,
        req.body.entry_fee || 0,
        req.body.reup_fee || 0,
        req.body.week_start_date,
        req.body.week_end_date,
        req.body.challenge_type_id,
        req.body.course_id,
        challengeClub,  // NEW: Club field
        userId,
        req.body.instructions,
        req.body.is_ctp_challenge || false,
        req.body.ctp_mode,
        req.body.ctp_tee_type,
        req.body.ctp_pin_day
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating challenge:', error);
      res.status(500).json({ error: 'Failed to create challenge' });
    }
  }
);
```

---

## Frontend Implementation

### 1. Create Club Event Hub Component

**File:** `client/src/components/ClubEventHub.tsx`

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Trophy, Users, Target, BarChart3, Building2 } from 'lucide-react';
import { PageContainer, PageHeader, PageContent } from './ui/PageLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface Section {
  title: string;
  icon: React.ElementType;
  description: string;
  features: string[];
  route: string;
}

export const ClubEventHub: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const sections: Section[] = [
    {
      title: 'Tournaments',
      icon: Trophy,
      description: `Create and manage tournaments for ${user?.club}`,
      features: [
        'Create club tournaments',
        'Manage registrations',
        'Track scores and brackets',
        'View tournament history'
      ],
      route: '/club-hub/tournaments'
    },
    {
      title: 'Leagues',
      icon: Users,
      description: 'Organize seasonal leagues for your club',
      features: [
        'Create club leagues',
        'Manage teams and divisions',
        'Track standings',
        'Generate weekly schedules'
      ],
      route: '/club-hub/leagues'
    },
    {
      title: 'Challenges',
      icon: Target,
      description: 'Run weekly challenges and competitions',
      features: [
        'Create weekly challenges',
        'Set prize pools',
        'Track entries and submissions',
        'Verify and award winners'
      ],
      route: '/club-hub/challenges'
    },
    {
      title: 'Club Members',
      icon: Users,
      description: 'View and manage your club roster',
      features: [
        'View member handicaps',
        'Track member activity',
        'Monitor event participation',
        'View club leaderboard'
      ],
      route: '/club-hub/members'
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={Building2}
        title={`${user?.club} Event Management`}
        subtitle="Create and manage tournaments, leagues, and challenges for your club members"
      />

      <PageContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                    <p className="text-gray-400 mb-4">{section.description}</p>
                    <ul className="space-y-2 mb-4">
                      {section.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-300 flex items-center">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => navigate(section.route)}
                      variant="outline-neon"
                      className="w-full"
                    >
                      Manage {section.title}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </PageContent>
    </PageContainer>
  );
};
```

### 2. Create Club Tournament Management Component

**File:** `client/src/components/ClubTournamentManagement.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { getClubTournaments, createTournament, updateTournament, deleteTournament } from '../services/api';
import { PageContainer, PageHeader, PageContent } from './ui/PageLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { TournamentForm } from './TournamentForm';
import { Modal } from './ui/modal';
import { Badge } from './ui/badge';
import { Trophy, Plus, Edit, Trash2, Users, Calendar } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface Tournament {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  club: string;
  status: string;
  participant_count: number;
  creator_name: string;
}

export const ClubTournamentManagement: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const canManage = hasPermission('manage_tournaments');

  useEffect(() => {
    loadTournaments();
  }, [user?.club]);

  const loadTournaments = async () => {
    if (!user?.club) return;

    try {
      setLoading(true);
      const response = await getClubTournaments(user.club, true); // includeGlobal
      setTournaments(response.data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (data: any) => {
    try {
      await createTournament({
        ...data,
        club: user?.club // Auto-set club
      });
      setShowCreateModal(false);
      loadTournaments();
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  };

  const handleUpdateTournament = async (id: number, data: any) => {
    try {
      await updateTournament(id, data);
      setEditingTournament(null);
      loadTournaments();
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw error;
    }
  };

  const handleDeleteTournament = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;

    try {
      await deleteTournament(id);
      loadTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
      draft: 'info',
      active: 'success',
      completed: 'warning',
      cancelled: 'danger'
    };
    return <Badge variant={variants[status] || 'info'}>{status}</Badge>;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <PageContainer>
      <PageHeader
        icon={Trophy}
        title={`${user?.club} Tournaments`}
        subtitle="Manage tournaments for your club members"
        action={
          canManage ? (
            <Button onClick={() => setShowCreateModal(true)} variant="neon">
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          ) : undefined
        }
      />

      <PageContent>
        {tournaments.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">No Tournaments Yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first tournament to get started
            </p>
            {canManage && (
              <Button onClick={() => setShowCreateModal(true)} variant="neon">
                <Plus className="w-4 h-4 mr-2" />
                Create Tournament
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{tournament.name}</h3>
                  {getStatusBadge(tournament.status)}
                </div>

                {tournament.club && (
                  <Badge variant="info" className="mb-3">
                    {tournament.club}
                  </Badge>
                )}

                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {tournament.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-300">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <Users className="w-4 h-4 mr-2" />
                    {tournament.participant_count} participants
                  </div>
                </div>

                {canManage && tournament.club === user?.club && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setEditingTournament(tournament)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteTournament(tournament.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </PageContent>

      {/* Create Tournament Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Tournament"
      >
        <TournamentForm
          onSubmit={handleCreateTournament}
          onCancel={() => setShowCreateModal(false)}
          defaultClub={user?.club}
          clubReadOnly={!hasPermission('manage_permissions')}
        />
      </Modal>

      {/* Edit Tournament Modal */}
      <Modal
        isOpen={!!editingTournament}
        onClose={() => setEditingTournament(null)}
        title="Edit Tournament"
      >
        {editingTournament && (
          <TournamentForm
            tournament={editingTournament}
            onSubmit={(data) => handleUpdateTournament(editingTournament.id, data)}
            onCancel={() => setEditingTournament(null)}
            defaultClub={user?.club}
            clubReadOnly={!hasPermission('manage_permissions')}
          />
        )}
      </Modal>
    </PageContainer>
  );
};
```

### 3. Update TournamentForm to Support Club Pre-fill

**File:** `client/src/components/TournamentForm.tsx`

Add new props:

```typescript
interface TournamentFormProps {
  tournament?: Tournament;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  defaultClub?: string;        // NEW: Pre-fill club
  clubReadOnly?: boolean;      // NEW: Prevent club changes
}

export const TournamentForm: React.FC<TournamentFormProps> = ({
  tournament,
  onSubmit,
  onCancel,
  defaultClub,
  clubReadOnly = false
}) => {
  const [formData, setFormData] = useState({
    club: tournament?.club || defaultClub || '',
    // ... other fields
  });

  // ... rest of component

  return (
    <form onSubmit={handleSubmit}>
      {/* Club field - hidden if clubReadOnly */}
      {!clubReadOnly && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Club</label>
          <input
            type="text"
            value={formData.club}
            onChange={(e) => setFormData({ ...formData, club: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      )}

      {/* Show club as read-only badge if clubReadOnly */}
      {clubReadOnly && formData.club && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Club</label>
          <Badge variant="info">{formData.club}</Badge>
        </div>
      )}

      {/* ... rest of form fields */}
    </form>
  );
};
```

### 4. Create Protected Route for Club Event Hub

**File:** `client/src/App.tsx`

Add new route protection component:

```typescript
// Club Event Protected Route Component
const ClubEventProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { hasAnyPermission, hasPermission } = usePermissions();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has event management permissions
  const canManageEvents = hasAnyPermission([
    'manage_tournaments',
    'manage_challenges'
  ]);

  if (!canManageEvents) {
    return <Navigate to="/" replace />;
  }

  // If user is full admin, redirect to admin hub instead
  if (hasPermission('manage_permissions')) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

// Add routes
function App() {
  return (
    <Router>
      <Routes>
        {/* ... existing routes ... */}

        {/* Club Event Hub Routes */}
        <Route
          path="/club-hub"
          element={
            <ClubEventProtectedRoute>
              <ClubEventHub />
            </ClubEventProtectedRoute>
          }
        />
        <Route
          path="/club-hub/tournaments"
          element={
            <ClubEventProtectedRoute>
              <ClubTournamentManagement />
            </ClubEventProtectedRoute>
          }
        />
        <Route
          path="/club-hub/leagues"
          element={
            <ClubEventProtectedRoute>
              <ClubLeagueManagement />
            </ClubEventProtectedRoute>
          }
        />
        <Route
          path="/club-hub/challenges"
          element={
            <ClubEventProtectedRoute>
              <ClubChallengeManagement />
            </ClubEventProtectedRoute>
          }
        />
        <Route
          path="/club-hub/members"
          element={
            <ClubEventProtectedRoute>
              <ClubMembersDashboard />
            </ClubEventProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
```

### 5. Update Navigation to Show Club Hub Link

**File:** Update your navigation component (Header, Sidebar, etc.)

```typescript
import { usePermissions } from '../hooks/usePermissions';

export const Navigation = () => {
  const { hasAnyPermission, hasPermission } = usePermissions();

  // Show club hub for event coordinators (but not full admins)
  const showClubHub = hasAnyPermission(['manage_tournaments', 'manage_challenges'])
                      && !hasPermission('manage_permissions');

  const showAdminHub = hasPermission('access_admin_panel');

  return (
    <nav>
      {/* ... other nav items ... */}

      {showClubHub && (
        <NavLink to="/club-hub">
          <Building2 className="w-5 h-5 mr-2" />
          Club Events
        </NavLink>
      )}

      {showAdminHub && (
        <NavLink to="/admin">
          <Shield className="w-5 h-5 mr-2" />
          Admin
        </NavLink>
      )}
    </nav>
  );
};
```

### 6. Update API Service

**File:** `client/src/services/api.ts`

Add new functions:

```typescript
// Get tournaments for a specific club
export const getClubTournaments = (clubName: string, includeGlobal: boolean = false) => {
  return api.get(`/tournaments/club/${encodeURIComponent(clubName)}`, {
    params: { includeGlobal }
  });
};

// Get leagues for a specific club
export const getClubLeagues = (clubName: string, includeGlobal: boolean = false) => {
  return api.get(`/leagues/club/${encodeURIComponent(clubName)}`, {
    params: { includeGlobal }
  });
};

// Get challenges for a specific club
export const getClubChallenges = (clubName: string, includeGlobal: boolean = false) => {
  return api.get(`/challenges/club/${encodeURIComponent(clubName)}`, {
    params: { includeGlobal }
  });
};

// Create tournament (update to include club)
export const createTournament = (data: TournamentCreateRequest) => {
  return api.post('/tournaments', data);
};

// Update tournament
export const updateTournament = (id: number, data: TournamentUpdateRequest) => {
  return api.put(`/tournaments/${id}`, data);
};

// Delete tournament
export const deleteTournament = (id: number) => {
  return api.delete(`/tournaments/${id}`);
};
```

---

## Security Considerations

### Critical Security Issues to Fix

1. **Tournament Creation Authentication**
   - **Current State:** POST `/api/tournaments` has NO authentication
   - **Risk:** Anyone can create tournaments, even unauthenticated users
   - **Fix:** Add `authenticateToken` middleware
   - **Priority:** CRITICAL - Fix immediately

2. **Tournament Modification Authorization**
   - **Current State:** PUT `/api/tournaments/:id` has NO authorization
   - **Risk:** Any user can modify any tournament
   - **Fix:** Add ownership/club checks
   - **Priority:** CRITICAL - Fix immediately

3. **League & Challenge Endpoints**
   - **Current State:** Some endpoints lack proper authorization
   - **Risk:** Unauthorized modifications
   - **Fix:** Add permission checks and club scoping
   - **Priority:** HIGH

### Security Best Practices

1. **Defense in Depth**
   - Frontend permission checks (UX)
   - Backend authentication (who are you?)
   - Backend authorization (what can you do?)
   - Database constraints (data integrity)

2. **Club Validation**
   - Always validate club exists before associating
   - Prevent club changes unless admin
   - Log club changes for audit trail

3. **Input Validation**
   - Sanitize all user inputs
   - Validate date ranges
   - Check participant limits
   - Prevent SQL injection

4. **Audit Logging**
   - Log all event creation
   - Log all modifications
   - Log permission changes
   - Track who accessed what data

### Implementation Checklist

- [ ] Add authentication to ALL event creation endpoints
- [ ] Add authorization checks to ALL event modification endpoints
- [ ] Validate club exists before creating events
- [ ] Prevent non-admins from changing event clubs
- [ ] Add rate limiting to prevent abuse
- [ ] Implement audit logging for sensitive operations
- [ ] Add input validation and sanitization
- [ ] Test for SQL injection vulnerabilities
- [ ] Test for authorization bypass attempts
- [ ] Review and test all permission checks

---

## Testing Plan

### Unit Tests

**Backend Permission Tests**
```javascript
describe('Club Event Coordinator Permissions', () => {
  test('can create tournament for own club', async () => {});
  test('cannot create tournament for other club', async () => {});
  test('can edit own club tournament', async () => {});
  test('cannot edit other club tournament', async () => {});
  test('admin can edit any tournament', async () => {});
});
```

**Frontend Component Tests**
```typescript
describe('ClubEventHub', () => {
  test('renders for event coordinator', () => {});
  test('does not render for regular member', () => {});
  test('shows correct club name', () => {});
  test('navigates to correct sections', () => {});
});
```

### Integration Tests

**API Endpoint Tests**
```javascript
describe('POST /api/tournaments', () => {
  test('requires authentication', async () => {});
  test('requires manage_tournaments permission', async () => {});
  test('sets club to user club by default', async () => {});
  test('rejects other club for non-admin', async () => {});
  test('allows any club for admin', async () => {});
});

describe('GET /api/tournaments/club/:clubName', () => {
  test('returns only club tournaments', async () => {});
  test('includes global tournaments when requested', async () => {});
  test('rejects access to other club for non-admin', async () => {});
  test('allows access to any club for admin', async () => {});
});
```

### End-to-End Tests

**User Flow: Club Event Coordinator Creates Tournament**
1. User logs in as club event coordinator
2. Navigates to club hub
3. Clicks "Manage Tournaments"
4. Clicks "Create Tournament"
5. Fills out form (club pre-filled)
6. Submits form
7. Tournament appears in list
8. Tournament is scoped to their club

**User Flow: Authorization Enforcement**
1. Coordinator A creates tournament for Club 1
2. Coordinator B (from Club 2) attempts to edit
3. Request is rejected with 403 error
4. Admin attempts to edit
5. Edit succeeds

### Manual Testing Checklist

- [ ] Club event coordinator can access club hub
- [ ] Regular member cannot access club hub
- [ ] Coordinator can create tournament for own club
- [ ] Coordinator cannot create tournament for other club
- [ ] Coordinator can view own club's tournaments
- [ ] Coordinator cannot view other club's tournaments
- [ ] Coordinator can edit own club's tournaments
- [ ] Coordinator cannot edit other club's tournaments
- [ ] Admin can view all tournaments
- [ ] Admin can edit all tournaments
- [ ] View-as mode works correctly
- [ ] Club filtering works in all event types
- [ ] Global events show correctly
- [ ] UI clearly shows club scope
- [ ] Navigation shows correct links based on permissions

---

## Migration Strategy

### Pre-Migration Preparation

1. **Database Backup**
   ```bash
   pg_dump golfapp1_production > backup_pre_club_coordinator_$(date +%Y%m%d).sql
   ```

2. **Notify Users**
   - Send email about upcoming role changes
   - Explain new club event coordinator role
   - Provide timeline for migration

3. **Identify Candidates**
   - Query users who should become club event coordinators
   - Typically: Club Pros who manage events but don't need full admin

### Migration Steps

**Step 1: Deploy Database Changes**
```bash
# Run migrations in order
psql golfapp1_production < db/migrations/XXX_create_club_event_coordinator_role.sql
psql golfapp1_production < db/migrations/XXX_add_club_scoping_to_events.sql
psql golfapp1_production < db/migrations/XXX_backfill_event_clubs.sql
```

**Step 2: Verify Database Changes**
```sql
-- Verify role created
SELECT * FROM roles WHERE role_key = 'club_event_coordinator';

-- Verify permissions assigned
SELECT r.role_name, COUNT(rp.permission_id) as perm_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.role_key = 'club_event_coordinator'
GROUP BY r.role_name;

-- Verify club columns added
SELECT COUNT(*) FROM tournaments WHERE club IS NOT NULL;
SELECT COUNT(*) FROM leagues WHERE club IS NOT NULL;
SELECT COUNT(*) FROM weekly_challenges WHERE club IS NOT NULL;
```

**Step 3: Deploy Backend Code**
```bash
# Deploy updated server.js
git pull origin main
npm install
pm2 restart golfapp1-server
```

**Step 4: Deploy Frontend Code**
```bash
# Build and deploy frontend
cd client
npm install
npm run build
# Deploy build to hosting
```

**Step 5: Assign Roles to Users**
```sql
-- Example: Assign club event coordinator role to specific users
WITH new_role AS (
  SELECT id FROM roles WHERE role_key = 'club_event_coordinator'
)
INSERT INTO user_roles (user_id, role_id, is_primary)
SELECT
  u.member_id,
  (SELECT id FROM new_role),
  false  -- Not primary, they may have other roles
FROM users u
WHERE u.email_address IN (
  'coordinator1@club.com',
  'coordinator2@club.com'
  -- Add more emails
);
```

**Step 6: Verify User Access**
- Test login as club event coordinator
- Verify club hub is accessible
- Verify can create events
- Verify cannot access other clubs

**Step 7: Monitor for Issues**
- Check error logs
- Monitor failed authentication attempts
- Track user feedback
- Monitor performance metrics

### Post-Migration Validation

**Data Integrity Checks**
```sql
-- Check for orphaned events (no club association)
SELECT COUNT(*) FROM tournaments WHERE created_by IS NOT NULL AND club IS NULL;
SELECT COUNT(*) FROM leagues WHERE created_by IS NOT NULL AND club IS NULL;
SELECT COUNT(*) FROM weekly_challenges WHERE created_by IS NOT NULL AND club IS NULL;

-- Check for invalid club references
SELECT COUNT(*) FROM tournaments t
LEFT JOIN clubs c ON t.club = c.club_name
WHERE t.club IS NOT NULL AND c.club_name IS NULL;
```

**Permission Checks**
```sql
-- Verify club event coordinators have correct permissions
SELECT
  u.email_address,
  u.club,
  r.role_name,
  COUNT(DISTINCT p.permission_key) as permission_count
FROM users u
JOIN user_roles ur ON u.member_id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.role_key = 'club_event_coordinator'
GROUP BY u.email_address, u.club, r.role_name;
```

### Rollback Plan

If critical issues are discovered:

**Step 1: Revert Frontend**
```bash
# Deploy previous version
git revert <commit-hash>
cd client && npm run build
# Deploy previous build
```

**Step 2: Revert Backend**
```bash
# Revert server code
git revert <commit-hash>
pm2 restart golfapp1-server
```

**Step 3: Database Rollback (if needed)**
```sql
-- Remove club event coordinator roles from users
DELETE FROM user_roles
WHERE role_id IN (SELECT id FROM roles WHERE role_key = 'club_event_coordinator');

-- Remove the role (optional - can leave in place)
-- DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE role_key = 'club_event_coordinator');
-- DELETE FROM roles WHERE role_key = 'club_event_coordinator';

-- Keep club columns (no harm in leaving them)
-- Data can be cleaned up later if needed
```

**Step 4: Restore from Backup (last resort)**
```bash
# Only if catastrophic failure
psql golfapp1_production < backup_pre_club_coordinator_YYYYMMDD.sql
```

---

## Success Metrics

### Technical Metrics
- [ ] All API endpoints require authentication
- [ ] Authorization checks enforce club scoping
- [ ] Database queries use indexes (< 100ms)
- [ ] No security vulnerabilities detected
- [ ] All tests pass (100% coverage on new code)

### User Metrics
- [ ] Club event coordinators can create events
- [ ] Club event coordinators report satisfaction with hub
- [ ] Reduced admin workload for event management
- [ ] Increased event creation across clubs
- [ ] No unauthorized access incidents

### Business Metrics
- [ ] More clubs running their own events
- [ ] Increased member engagement
- [ ] Reduced time from event idea to launch
- [ ] Higher event participation rates

---

## Timeline

### Week 1: Database & Backend
- **Day 1-2:** Create and test database migrations
- **Day 3-4:** Implement backend API changes
- **Day 5:** Security testing and fixes

### Week 2: Frontend
- **Day 1-2:** Create Club Event Hub component
- **Day 3-4:** Create event management components
- **Day 5:** Integration and styling

### Week 3: Testing & Deployment
- **Day 1-2:** Comprehensive testing (unit, integration, E2E)
- **Day 3:** User acceptance testing with beta users
- **Day 4:** Documentation and deployment prep
- **Day 5:** Production deployment and monitoring

---

## Next Steps

1. **Review and Approve Plan**
   - Review with stakeholders
   - Get approval for role name and permissions
   - Confirm timeline

2. **Set Up Development Environment**
   - Create feature branch
   - Set up local test database
   - Configure test users

3. **Begin Implementation**
   - Start with Phase 1 (Database)
   - Follow implementation phases in order
   - Commit frequently with descriptive messages

4. **Schedule Checkpoints**
   - Daily standups during development
   - Weekly demos to stakeholders
   - Beta testing with select club event coordinators

---

## Appendix

### A. Database Schema Diagrams

```
users (member_id, club) ──┐
                          │
tournaments ──────────────┼─→ clubs (club_name)
  ├── id                  │
  ├── name                │
  ├── club ───────────────┘
  └── created_by ─→ users.member_id

leagues ──────────────────┼─→ clubs (club_name)
  ├── id                  │
  ├── name                │
  ├── club ───────────────┘
  └── created_by ─→ users.member_id

weekly_challenges ────────┼─→ clubs (club_name)
  ├── id                  │
  ├── challenge_name      │
  ├── club ───────────────┘
  └── created_by ─→ users.member_id
```

### B. Permission Hierarchy

```
Admin (manage_permissions)
├── Full access to all clubs
├── Can view/edit/delete any event
├── Can assign roles
└── Can use view-as mode

Club Event Coordinator
├── Access to own club only
├── Can create events for own club
├── Can edit own club's events
├── Can view club members
└── Cannot access other clubs

Club Pro (existing)
├── Similar to Club Event Coordinator
├── Additional handicap management
└── May need both roles

Member
├── Can view events
├── Can register for events
└── Cannot create or manage events
```

### C. UI Wireframes

```
Club Event Hub Layout:
┌────────────────────────────────────┐
│ [Back] No. 5 Event Management      │
├────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Tournaments  │ │ Leagues      │ │
│ │ • Create     │ │ • Create     │ │
│ │ • Manage     │ │ • Teams      │ │
│ │ • Scores     │ │ • Schedule   │ │
│ └──────────────┘ └──────────────┘ │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Challenges   │ │ Members      │ │
│ │ • Weekly     │ │ • Roster     │ │
│ │ • Prizes     │ │ • Handicaps  │ │
│ │ • Winners    │ │ • Activity   │ │
│ └──────────────┘ └──────────────┘ │
└────────────────────────────────────┘
```

### D. API Reference Quick Guide

**Tournament Endpoints:**
- `GET /api/tournaments/club/:clubName` - Get club tournaments
- `POST /api/tournaments` - Create tournament (requires auth)
- `PUT /api/tournaments/:id` - Update tournament (requires auth)
- `DELETE /api/tournaments/:id` - Delete tournament (requires auth)

**League Endpoints:**
- `GET /api/leagues/club/:clubName` - Get club leagues
- `POST /api/leagues` - Create league (requires auth)
- `PUT /api/leagues/:id` - Update league (requires auth)
- `DELETE /api/leagues/:id` - Delete league (requires auth)

**Challenge Endpoints:**
- `GET /api/challenges/club/:clubName` - Get club challenges
- `POST /api/challenges` - Create challenge (requires auth)
- `PUT /api/challenges/:id` - Update challenge (requires auth)
- `DELETE /api/challenges/:id` - Delete challenge (requires auth)

---

## Document Control

**Version:** 1.0
**Date:** 2025-12-12
**Author:** Claude Code
**Status:** Draft - Awaiting Approval

**Change Log:**
- 2025-12-12: Initial version created

**Approvals Required:**
- [ ] Technical Lead
- [ ] Product Owner
- [ ] Security Team
- [ ] Database Administrator
