# Permission System Migration Fix Guide

## Problem

You're getting this error when running the migration:
```
ERROR: column "role_key" does not exist
```

This means the `roles` table already exists from a previous attempt but doesn't have the correct schema.

---

## Solution Options

### Option 1: Use the Safe Migration (RECOMMENDED)

This migration will safely handle the existing table:

```bash
psql $DATABASE_URL -f db/migrations/002_create_permission_system_safe.sql
```

**What it does:**
- Checks if `role_key` column exists
- If not, drops and recreates the `roles` table with correct schema
- Creates all other tables safely
- Seeds default permissions and roles
- No data loss on other tables

---

### Option 2: Complete Rollback and Fresh Start

If you want to start completely fresh:

**Step 1: Rollback**
```bash
psql $DATABASE_URL -f db/migrations/002_rollback.sql
```

**Step 2: Run original migration**
```bash
psql $DATABASE_URL -f db/migrations/002_create_permission_system.sql
```

**⚠️ Warning:** This will delete all permission-related data if any exists.

---

### Option 3: Manual Fix (If you know what you're doing)

If the roles table has data you want to preserve:

```sql
-- 1. Check what's in the roles table
SELECT * FROM roles;

-- 2. If it's empty or you don't need the data, drop it
DROP TABLE IF EXISTS roles CASCADE;

-- 3. Then run the original migration
-- Run: db/migrations/002_create_permission_system.sql
```

---

## Verification

After running the migration, verify it worked:

```bash
psql $DATABASE_URL -c "SELECT role_name, role_key, permission_count FROM (
    SELECT r.role_name, r.role_key, COUNT(rp.permission_id) as permission_count
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id, r.role_name, r.role_key
) AS role_summary ORDER BY role_name;"
```

You should see output like:
```
   role_name   |   role_key   | permission_count
---------------+--------------+------------------
 Admin         | admin        |               20
 Ambassador    | ambassador   |                7
 Club Pro      | club_pro     |                9
 Deactivated   | deactivated  |                0
 Member        | member       |                3
```

---

## Check Users Have Been Migrated

```bash
psql $DATABASE_URL -c "SELECT
    COUNT(*) as total_users,
    COUNT(role_id) as users_with_role_id,
    COUNT(*) - COUNT(role_id) as users_missing_role_id
FROM users;"
```

All users should have a `role_id`.

---

## Troubleshooting

### Error: relation "roles" already exists
**Solution:** Use the safe migration (Option 1)

### Error: permission denied
**Solution:** Make sure you're using a database user with CREATE TABLE privileges

### Error: foreign key constraint violation
**Solution:** Run the rollback script first, then the migration

### Users don't have role_id
**Solution:** Run this update:
```sql
UPDATE users SET role_id = (
    CASE
        WHEN role = 'Admin' THEN (SELECT id FROM roles WHERE role_key = 'admin')
        WHEN role = 'Club Pro' THEN (SELECT id FROM roles WHERE role_key = 'club_pro')
        WHEN role = 'Ambassador' THEN (SELECT id FROM roles WHERE role_key = 'ambassador')
        WHEN role = 'Deactivated' THEN (SELECT id FROM roles WHERE role_key = 'deactivated')
        ELSE (SELECT id FROM roles WHERE role_key = 'member')
    END
)
WHERE role_id IS NULL;
```

---

## Post-Migration Checklist

- [ ] All 5 default roles exist
- [ ] All 20+ permissions exist
- [ ] Admin role has all permissions
- [ ] All users have role_id populated
- [ ] Views created successfully
- [ ] Audit log table exists
- [ ] Can access `/admin/permissions` UI

---

## Need Help?

Check the database state:
```bash
# List all permission-related tables
psql $DATABASE_URL -c "\dt" | grep -E "(roles|permissions|audit)"

# Show role structure
psql $DATABASE_URL -c "\d roles"

# Show permissions structure
psql $DATABASE_URL -c "\d permissions"
```
