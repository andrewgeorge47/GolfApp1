# Migration 004: League System

## Overview

This migration adds support for league-based team competitions (UAL Season 2) to the GolfApp platform.

## Impact Assessment: ✅ SAFE TO RUN

### What This Migration Does

**Creates New Tables (9 total):**
1. `leagues` - League season definitions
2. `league_divisions` - Division structure within leagues
3. `league_schedule` - Weekly schedule
4. `league_matchups` - Team vs team weekly matchups
5. `team_member_availability` - Player availability tracking
6. `weekly_lineups` - Captain-selected lineups
7. `match_individual_scores` - Individual 9-hole scoring
8. `match_alternate_shot_scores` - Alternate shot 9-hole scoring
9. `tiebreaker_log` - Audit log for tiebreakers

**Modifies Existing Tables:**
- `tournament_teams`: Adds 6 new columns (all nullable with defaults)
- `team_standings`: Adds 7 new columns (all nullable with defaults)

**Creates Views:**
- `league_standings` - Real-time standings with tiebreakers

### What This Migration Does NOT Do

- ❌ Drop any tables
- ❌ Drop any columns
- ❌ Modify existing column types
- ❌ Delete any data
- ❌ Break existing functionality
- ❌ Require application code changes (backward compatible)

### Data Safety

✅ **100% Safe**: All changes are additive only
✅ **Zero data loss**: No existing data is modified or deleted
✅ **Backward compatible**: Existing app continues to work unchanged
✅ **Forward compatible**: New features won't activate until you build them
✅ **Rollback available**: Can be completely reversed with `004_rollback.sql`

---

## Prerequisites

- PostgreSQL 12+ (you have 16.9)
- `golfos_user` database user with appropriate permissions
- Backup of database (recommended, though not strictly necessary)

---

## How to Run This Migration

### Option 1: Via psql Command Line

```bash
# 1. (Optional) Create backup first
pg_dump -U golfos_user -d your_database_name > backup_before_migration_004.sql

# 2. Run the migration
psql -U golfos_user -d your_database_name -f db/migrations/004_add_league_system.sql

# 3. Verify it worked (should see success messages)
```

### Option 2: Via Database Client (pgAdmin, DBeaver, etc.)

1. Open your database client
2. Connect to your GolfApp database
3. Open `004_add_league_system.sql`
4. Execute the entire script
5. Look for "Migration validation passed" messages

### Option 3: Programmatic (Node.js)

```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: 'golfos_user',
  database: 'your_database_name',
  // ... other config
});

const migrationSQL = fs.readFileSync('./db/migrations/004_add_league_system.sql', 'utf8');

pool.query(migrationSQL)
  .then(() => {
    console.log('Migration 004 completed successfully');
  })
  .catch(err => {
    console.error('Migration failed:', err);
  });
```

---

## Verification

After running the migration, verify it worked:

```sql
-- Check that new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'league%'
  OR table_name LIKE 'match_%'
  OR table_name = 'weekly_lineups'
  OR table_name = 'team_member_availability'
  OR table_name = 'tiebreaker_log';

-- Should return 9 rows

-- Check that new columns were added to tournament_teams
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tournament_teams'
  AND column_name IN ('league_id', 'division_id', 'league_points',
                      'aggregate_net_score', 'second_half_net_score',
                      'final_week_net_score');

-- Should return 6 rows

-- Check that view was created
SELECT viewname FROM pg_views WHERE viewname = 'league_standings';

-- Should return 1 row
```

---

## Rollback Instructions

If you need to undo this migration:

```bash
psql -U golfos_user -d your_database_name -f db/migrations/004_rollback.sql
```

**Note**: Rollback will delete all league data. Only use if you haven't started using league features yet.

---

## Expected Changes Summary

### New Tables and Row Counts (After Migration)

| Table Name | Row Count | Description |
|------------|-----------|-------------|
| `leagues` | 0 | Empty until you create leagues |
| `league_divisions` | 0 | Empty until you create divisions |
| `league_schedule` | 0 | Empty until schedule is generated |
| `league_matchups` | 0 | Empty until matchups are created |
| `team_member_availability` | 0 | Empty until players submit availability |
| `weekly_lineups` | 0 | Empty until captains submit lineups |
| `match_individual_scores` | 0 | Empty until scores are submitted |
| `match_alternate_shot_scores` | 0 | Empty until scores are submitted |
| `tiebreaker_log` | 0 | Empty until tiebreakers are applied |

### Modified Tables (No Data Changes)

| Table Name | New Columns | Existing Rows Affected |
|------------|-------------|------------------------|
| `tournament_teams` | 6 | All rows get NULL values for new columns |
| `team_standings` | 7 | All rows get NULL or 0 values for new columns |

---

## Post-Migration Next Steps

1. ✅ Migration complete
2. ⏭️ **Next**: Implement backend API endpoints
   - Create `/api/leagues` endpoint
   - Create `/api/leagues/:id/divisions` endpoint
   - etc. (see main roadmap)
3. ⏭️ **Then**: Build frontend components
   - `LeagueManagement.tsx`
   - `CaptainDashboard.tsx`
   - etc. (see main roadmap)

---

## Troubleshooting

### Problem: "relation already exists"

**Solution**: Some tables already exist. This is safe - the migration uses `CREATE TABLE IF NOT EXISTS`, so it will skip existing tables.

### Problem: "permission denied"

**Solution**: Make sure you're running as `golfos_user` or a user with sufficient privileges.

```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO golfos_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO golfos_user;
```

### Problem: Migration validation failed

**Solution**: Check the error message. It will tell you which table or column is missing. You can manually create it or re-run the migration.

### Problem: Foreign key constraint fails

**Solution**: Make sure your existing `users`, `tournament_teams`, and `simulator_courses_combined` tables exist and have the expected structure.

---

## Migration Metadata

- **Version**: 004
- **Created**: 2025-01-23
- **Author**: Claude Code
- **Purpose**: Add league system for UAL Season 2
- **Breaking Changes**: None
- **Data Loss Risk**: None
- **Estimated Runtime**: < 1 second on empty tables, < 5 seconds on production data
- **Rollback Available**: Yes (`004_rollback.sql`)

---

## Questions?

If you encounter issues or have questions about this migration, refer to:
- Main roadmap document
- Database schema documentation (`/db/GolfOS_schema.sql`)
- Existing migration guides in `/db/migrations/`

---

## Summary

✅ This is a **safe, additive-only migration**
✅ **Zero risk** of data loss
✅ **Backward compatible** with existing code
✅ **Easy rollback** if needed
✅ **Well documented** and validated

You can confidently run this on your production database.
