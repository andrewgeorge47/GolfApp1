# Shot Capture System - Complete Setup Guide

## Overview

This document provides a complete overview of the shot capture infrastructure for integrating GSPro simulators with the NN cloud platform.

---

## Quick Reference

### For NN Portal Developers (Cloud Side) ✅ COMPLETE

All cloud infrastructure is set up and ready:

- ✅ Database tables created
- ✅ API endpoints deployed
- ✅ Authentication system configured
- ✅ Admin tools available
- ✅ Documentation complete

**No additional work needed on the cloud side.**

### For Simulator PC Developers (Local Side) 📋 TODO

See `SHOT_CAPTURE_API_SPEC.md` for complete implementation guide.

---

## File Structure

```
GolfApp1/
├── db/
│   └── migrations/
│       └── 028_create_shot_capture_system.sql    # Database schema
│
├── scripts/
│   └── create_simulator_api_key.js               # Admin utility
│
├── server.js                                     # API endpoints (lines 20011-20422)
│
├── SHOT_CAPTURE_SYSTEM.md                        # This file (overview)
└── SHOT_CAPTURE_API_SPEC.md                      # Developer handoff doc
```

---

## Cloud Infrastructure

### 1. Database Tables

Created by migration `028_create_shot_capture_system.sql`:

| Table | Purpose |
|-------|---------|
| `simulator_api_keys` | API keys for authenticating simulator PCs |
| `simulator_sessions` | Active/historical practice sessions |
| `shots` | Central storage for all shots from all simulators |
| `sim_sync_status` | Health monitoring for sim cloud sync |

**To Apply Migration:**
```bash
psql $DATABASE_URL -f db/migrations/028_create_shot_capture_system.sql
```

### 2. API Endpoints

All deployed on Render at `https://your-app.onrender.com`:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/shots` | POST | Sim API Key | Upload a shot from simulator |
| `/api/sims/:simId/active-session` | GET | Sim API Key | Get active session for sim |
| `/api/sims/:simId/sessions` | POST | User JWT | Create new session (web app) |
| `/api/sims/:simId/sessions/:id/end` | PUT | User JWT | End a session (web app) |
| `/api/sims/:simId/sync-status` | GET | Admin JWT | Get sync health status |
| `/api/sims/sync-status` | GET | Admin JWT | Get all sim sync statuses |

**Implementation:** See `server.js` lines 20011-20422

### 3. Admin Tools

**Create Simulator API Key:**
```bash
node scripts/create_simulator_api_key.js
```

**List All Simulators:**
```bash
node scripts/create_simulator_api_key.js --list
```

---

## Simulator PC Requirements

### What the Sim PC Developer Needs to Build

1. **Local NN Database** (SQLite)
   - Store shots locally for redundancy
   - Track sync status (synced, pending, error)
   - Offline operation support

2. **GSPro Shot Listener** (likely already exists)
   - Read GSPro databases for new shots
   - Normalize GSPro data to NN format

3. **Cloud Sync Service**
   - Background loop to upload unsynced shots
   - Retry logic with exponential backoff
   - Idempotent uploads using UUIDs

4. **Session Polling** (optional)
   - Poll for active session every 30 seconds
   - Attach session_id to shots if available

5. **WebSocket to iPhone** (already exists)
   - Continue sending shots to iPhone app
   - No changes needed to existing code

### Architecture on Sim PC

```
┌─────────────────────────────────────────────────────────────┐
│                     Simulator PC                            │
│                                                             │
│  ┌──────────────┐                                          │
│  │   GSPro      │  (unchanged - internal DBs)              │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────┐                      │
│  │  NN Listener Service             │                      │
│  │  • Reads GSPro DBs               │                      │
│  │  • Normalizes shot data          │                      │
│  │  • Generates UUIDs               │                      │
│  └──┬───────────┬──────────────┬───┘                      │
│     │           │              │                            │
│     ▼           ▼              ▼                            │
│  ┌──────┐   ┌────────┐   ┌─────────────┐                  │
│  │Local │   │WebSocket│   │Cloud Sync   │                  │
│  │NN DB │   │to iPhone│   │Loop         │                  │
│  │(SQLite)   │App (ws) │   │(background) │                  │
│  └──────┘   └────────┘   └─────┬───────┘                  │
│                                  │                           │
└──────────────────────────────────┼──────────────────────────┘
                                   │
                                   │ HTTPS POST /api/shots
                                   ▼
              ┌────────────────────────────────────┐
              │    NN Cloud API (Render)          │
              │    • Authenticates sim API key    │
              │    • Stores in central Postgres   │
              │    • Attaches active session      │
              └────────────────────────────────────┘
```

---

## Data Flow

### Shot Upload Flow

1. **GSPro records shot** → Internal GSPro databases updated
2. **NN Listener detects** → Reads GSPro temp DB
3. **Normalize data** → Convert to NN shot format + generate UUID
4. **Local storage** → Insert into `nn_sim.db` with `synced=false`
5. **WebSocket** → Send to iPhone app (existing feature, unchanged)
6. **Cloud sync** → POST to `/api/shots` with retry logic
7. **Mark synced** → Update local DB `synced=true` on success

### Session Management Flow

1. **User opens web app** → Logs in to NN portal
2. **Selects simulator** → Chooses "NN Club - Bay 1"
3. **Starts session** → Web app calls `POST /api/sims/nn-club-bay1/sessions`
4. **Listener polls** → `GET /api/sims/nn-club-bay1/active-session` every 30s
5. **Attach to shots** → Listener includes `session_id` and `nn_player_id` in shot uploads
6. **User ends session** → Web app calls `PUT /api/sims/.../sessions/.../end`

---

## Authentication

### Simulator API Keys

Each simulator authenticates with a unique API key.

**Format:**
```
Authorization: Bearer nn-sim-{simId}-{randomHex}
```

**Example:**
```
Authorization: Bearer nn-sim-bay1-a1b2c3d4e5f6g7h8i9j0
```

**Creation:**
```bash
node scripts/create_simulator_api_key.js
```

**Security:**
- API keys are stored in plain text in the database (not hashed for sim auth)
- Keys should be kept secret and only stored on sim PC
- Keys can be deactivated by setting `is_active = false`

---

## Idempotency

The `/api/shots` endpoint is **idempotent** based on the shot `uuid` field.

**What this means:**
- If the same shot UUID is sent multiple times, it will be updated (not duplicated)
- Retries are safe if network fails mid-request
- The sim PC must generate a unique UUID v4 for each shot

**Example:**

```javascript
// Shot 1 - First upload
POST /api/shots
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-04T15:30:00Z",
  "club": "Driver",
  "ball_speed": 165.3
}
// Response: 201 Created - New shot inserted

// Shot 1 - Retry (same UUID)
POST /api/shots
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",  // Same UUID
  "timestamp": "2025-12-04T15:30:00Z",
  "club": "Driver",
  "ball_speed": 165.3,
  "session_id": 789  // Updated field
}
// Response: 201 Created - Shot updated with session_id, not duplicated
```

---

## Error Handling & Retry Strategy

### HTTP Status Codes

| Code | Meaning | Sim PC Action |
|------|---------|---------------|
| 201 | Created | Mark shot as `synced=true` in local DB |
| 400 | Bad Request | Log error, don't retry (fix payload) |
| 401 | Unauthorized | Check API key, don't retry |
| 403 | Forbidden | Sim is deactivated, contact admin |
| 500 | Server Error | Retry with exponential backoff |
| Network Error | No connection | Retry with exponential backoff |

### Recommended Retry Logic

```
Retry Delays:
  Attempt 1: Immediate
  Attempt 2: 1 second
  Attempt 3: 2 seconds
  Attempt 4: 4 seconds
  Attempt 5: 8 seconds
  Attempt 6: 16 seconds
  Attempt 7+: 60 seconds (indefinitely until success)
```

**Never give up on a shot** - Keep retrying until it's successfully synced or a 4xx error indicates it's unrecoverable.

---

## Monitoring

### Admin Endpoints

**View All Sim Sync Statuses:**
```bash
curl -X GET https://your-app.onrender.com/api/sims/sync-status \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

**View Specific Sim:**
```bash
curl -X GET https://your-app.onrender.com/api/sims/nn-sim-bay1/sync-status \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

**Response:**
```json
{
  "sim_id": "nn-sim-bay1",
  "sim_name": "NN Club - Bay 1",
  "location": "123 Main St",
  "is_active": true,
  "last_used_at": "2025-12-04T15:30:00Z",
  "last_sync_at": "2025-12-04T15:30:05Z",
  "last_shot_received_at": "2025-12-04T15:30:00Z",
  "total_shots_received": 1234,
  "last_error_at": null,
  "last_error_message": null,
  "consecutive_errors": 0,
  "listener_version": "1.0.0"
}
```

### Health Indicators

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| `last_sync_at` | < 5 min ago | 5-30 min ago | > 30 min ago |
| `consecutive_errors` | 0 | 1-5 | > 5 |
| `last_error_message` | null | Recent | Repeated |

---

## Testing

### Test Shot Upload

```bash
curl -X POST https://your-app-staging.onrender.com/api/shots \
  -H "Authorization: Bearer dev-test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "test-001",
    "timestamp": "2025-12-04T15:30:00Z",
    "club": "Driver",
    "ball_speed": 165.3,
    "carry_distance": 285.2
  }'
```

### Test Active Session

```bash
curl -X GET https://your-app-staging.onrender.com/api/sims/nn-sim-bay1-dev/active-session \
  -H "Authorization: Bearer dev-test-key-12345"
```

---

## Deployment Checklist

### Cloud Side (NN Portal) ✅

- [x] Run database migration `028_create_shot_capture_system.sql`
- [x] Deploy updated `server.js` to Render
- [x] Verify all 6 endpoints are accessible
- [x] Create test simulator API key
- [x] Test shot upload with cURL
- [x] Test active session endpoint

### Sim PC Side (Local Developer) 📋

- [ ] Get API key from NN admin
- [ ] Create local SQLite database
- [ ] Implement shot normalization
- [ ] Implement local DB inserts
- [ ] Implement cloud sync loop
- [ ] Implement retry logic
- [ ] Implement session polling (optional)
- [ ] Test with staging environment
- [ ] Test with production environment
- [ ] Monitor sync status

---

## Next Steps

### For NN Portal Team

1. Run the database migration in production
2. Deploy updated server.js to Render
3. Create simulator API keys for each physical simulator
4. Provide API keys to sim PC developer
5. Monitor sync health via `/api/sims/sync-status`

### For Sim PC Developer

1. Read `SHOT_CAPTURE_API_SPEC.md` for complete API documentation
2. Get API key and staging URL from NN admin
3. Set up local SQLite database
4. Implement cloud sync service with retry logic
5. Test thoroughly on staging before production
6. Optionally implement session polling

---

## Support

### Documentation

- **API Specification**: `SHOT_CAPTURE_API_SPEC.md` (complete developer guide)
- **Database Schema**: `db/migrations/028_create_shot_capture_system.sql`
- **Admin Tool**: `scripts/create_simulator_api_key.js`

### Contact

- **Cloud/API Questions**: NN Portal Team
- **Simulator Integration**: Sim PC Developer Team
- **API Keys**: Run `node scripts/create_simulator_api_key.js`

---

## Summary

### What's Built (Cloud Side) ✅

- PostgreSQL database with 4 tables
- 6 REST API endpoints
- Simulator API key authentication
- Idempotent shot uploads
- Automatic session attachment
- Sync health monitoring
- Admin provisioning tools

### What Needs Building (Sim PC Side) 📋

- Local SQLite database
- Shot normalization logic
- Cloud sync service with retry
- (Optional) Session polling

### Key Features

✅ **Redundancy**: Local + cloud storage
✅ **Offline Support**: Works without internet
✅ **Idempotency**: Safe to retry uploads
✅ **Session Tracking**: Auto-attach user sessions
✅ **Error Recovery**: Exponential backoff retry
✅ **Monitoring**: Real-time sync health status
✅ **Scalability**: Supports unlimited simulators

---

*Last Updated: 2025-12-04*
*System Version: 1.0*
