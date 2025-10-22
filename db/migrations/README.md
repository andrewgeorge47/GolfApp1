# Database Migrations

This directory contains database migration scripts for the GolfApp.

## Applying Migrations

To apply the role constraint migration, run the following command:

```bash
psql $DATABASE_URL -f db/migrations/001_add_role_constraint.sql
```

Or if you're using the pool connection in Node.js, you can run:

```javascript
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migration = fs.readFileSync('db/migrations/001_add_role_constraint.sql', 'utf8');
await pool.query(migration);
```

## Migration 001: Add Role Constraint

**Purpose**: Standardizes all role values in the database and adds a CHECK constraint to ensure only valid roles can be used going forward.

**Valid Roles**:
- `Member`
- `Admin`
- `Club Pro`
- `Ambassador`
- `Deactivated`

**What it does**:
1. Normalizes existing role values to proper case (e.g., "clubpro" → "Club Pro")
2. Adds a CHECK constraint to the users table
3. Creates an index on the role column for better query performance
4. Displays a summary of roles after migration

**Note**: This migration is idempotent and can be run multiple times safely.
