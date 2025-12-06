# Course Availability Tracking Per Simulator

## Overview
Each club/simulator can have different courses installed in GSPro. The `simulator_course_availability` table tracks which courses are available at each simulator location and their sync status.

## Database Schema

### Table: `simulator_course_availability`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `sim_id` | VARCHAR(100) | Which simulator (e.g., 'nn-no5') |
| `course_id` | INTEGER | Reference to simulator_courses_combined |
| `first_synced_at` | TIMESTAMP | When this course was first reported |
| `last_synced_at` | TIMESTAMP | When last updated |
| `hole_details_synced` | BOOLEAN | TRUE if detailed tee/pin data synced |
| `is_available` | BOOLEAN | FALSE if course removed from GSPro |
| `gspro_course_name` | VARCHAR(255) | Actual filename in GSPro |
| `notes` | TEXT | Optional notes |

### View: `ctp_courses_by_simulator`
Convenience view showing all available CTP courses per simulator with par 3 info and sync status.

## Sim PC Integration

### 1. Lookup Course ID by Name
Before reporting or syncing courses, the sim PC needs to find the course ID in the database:

**Endpoint:** `GET /api/sim/courses/lookup?name=Pebble Beach Golf Links`

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
      "designer": "Jack Neville, Douglas Grant",
      "holes": 18,
      "similarity": 0.95
    },
    {
      "id": 456,
      "name": "Pebble Beach - The Links",
      "location": "Pebble Beach, CA",
      "designer": "Jack Neville",
      "holes": 18,
      "similarity": 0.85
    }
  ],
  "message": "Multiple courses found. Please use the most appropriate course ID."
}
```

**Response (Not Found):**
```json
{
  "error": "Course not found",
  "searchedName": "Unknown Course",
  "suggestion": "Try searching with partial name or check spelling"
}
```

**Usage:**
1. Strip `.gspcrse` extension from filename
2. Query: `GET /api/sim/courses/lookup?name=Pebble Beach Golf Links`
3. Use returned `course.id` for subsequent API calls

### 2. Report Available Courses
Sim PC should call this on startup and periodically (e.g., hourly) to report which courses are installed:

**Endpoint:** `POST /api/sim/courses/report-available`

**Request:**
```json
{
  "courses": [
    {
      "courseId": 123,
      "gsproCourseName": "Pebble Beach Golf Links.gspcrse"
    },
    {
      "courseId": 456,
      "gsproCourseName": "Augusta National Golf Club.gspcrse"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "simId": "nn-no5",
  "coursesReported": 2,
  "message": "Course availability updated successfully"
}
```

**Behavior:**
- Marks all previously available courses as `is_available = FALSE`
- Sets reported courses to `is_available = TRUE`
- This ensures removed courses are properly tracked

### 2. Sync Course Hole Details
When syncing detailed hole data, include the GSPro course filename:

**Endpoint:** `POST /api/sim/courses/:courseId/hole-details`

**Updated Request:**
```json
{
  "gsproCourseName": "Pebble Beach Golf Links.gspcrse",
  "holeDetails": [
    {
      "hole": 1,
      "par": 4,
      "index": 1,
      "greenCenter": { "x": 150.5, "y": 10.2, "z": 300.8 },
      "pins": {
        "Thursday": { "x": 148.2, "y": 10.3, "z": 298.5 },
        "Friday": { "x": 152.1, "y": 10.1, "z": 302.3 },
        "Saturday": { "x": 149.8, "y": 10.4, "z": 299.7 },
        "Sunday": { "x": 151.5, "y": 10.2, "z": 301.2 }
      },
      "tees": {
        "Black": { "x": 0.0, "y": 5.0, "z": 0.0, "distance": 425 },
        "Blue": { "x": 10.0, "y": 5.0, "z": 15.0, "distance": 405 },
        "White": { "x": 20.0, "y": 5.0, "z": 30.0, "distance": 380 },
        // ... other tee types
      }
    }
    // ... all 18 holes
  ]
}
```

**Behavior:**
- Updates `hole_details` in `simulator_courses_combined`
- Creates/updates record in `simulator_course_availability` with:
  - `hole_details_synced = TRUE`
  - `is_available = TRUE`
  - `gspro_course_name = <provided name>`

## Frontend Integration

### Admin: Filter Courses by Simulator
When creating CTP challenges, admins can see which courses are available at the target simulator:

**Endpoint:** `GET /api/courses/ctp-eligible?sim_id=nn-no5`

**Response:**
```json
[
  {
    "id": 123,
    "name": "Pebble Beach Golf Links",
    "location": "Pebble Beach, CA",
    "par3_hole_count": 4,
    "par3_hole_numbers": [5, 7, 12, 17],
    "ctp_ready": true,
    "last_synced_at": "2025-12-05T10:30:00Z",
    "gspro_course_name": "Pebble Beach Golf Links.gspcrse",
    "sim_id": "nn-no5"
  }
]
```

**Without `sim_id` parameter:** Returns all courses from database (backward compatible)

## Typical Workflow

### Initial Setup (One-time per course)
1. **Sim PC starts up** → Scans GSPro courses directory
2. **Looks up course IDs** → `GET /api/sim/courses/lookup?name=...` (for each .gspcrse file)
   - Strips `.gspcrse` extension from filename
   - Finds matching course ID in database
   - Handles fuzzy matching if exact name doesn't match
3. **Reports available courses** → `POST /api/sim/courses/report-available`
   - Marks courses as available but `hole_details_synced = FALSE`
4. **Reads .gspcrse files** → Extracts tee/pin positions
5. **Syncs hole details** → `POST /api/sim/courses/:id/hole-details` (one per course)
   - Sets `hole_details_synced = TRUE`
   - Course becomes "CTP ready"

### Ongoing Maintenance
- **Hourly:** Report available courses (detects new/removed courses)
- **Daily:** Re-sync hole details (catches course updates in GSPro)
- **On course download:** Immediately report + sync that course

## Benefits

1. **Multi-Club Support:** Each club can have different courses
2. **Accurate UI:** Admin only sees courses available at target simulator
3. **Sync Status:** Track which courses need hole detail sync
4. **Change Detection:** Automatically detect when courses are added/removed
5. **Filename Tracking:** Know the exact GSPro filename for troubleshooting

## Database View for Reporting

```sql
-- See all courses by simulator with sync status
SELECT * FROM ctp_courses_by_simulator WHERE sim_id = 'nn-no5';

-- Find courses needing sync
SELECT sim_id, course_name, is_available, hole_details_synced
FROM ctp_courses_by_simulator
WHERE is_available = TRUE AND hole_details_synced = FALSE;

-- Course availability summary
SELECT
  sim_id,
  COUNT(*) as total_courses,
  SUM(CASE WHEN hole_details_synced THEN 1 ELSE 0 END) as ctp_ready_courses
FROM simulator_course_availability
WHERE is_available = TRUE
GROUP BY sim_id;
```

## Migration Applied

✅ Migration 031: `simulator_course_availability` table created
✅ View `ctp_courses_by_simulator` created
✅ Endpoints updated to track/query course availability
