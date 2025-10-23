# Permission Management System Guide

**Date**: 2025-10-22
**Branch**: `claude/multi-role-permissions-011CUNtUTL1J15sYHd1XzJzY`

## Overview

The GolfApp now includes a comprehensive, dynamic role and permission management system that allows administrators to:
- Create custom roles
- Assign granular permissions to roles
- Manage existing roles and their permissions
- Track all permission changes via audit log

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Permission Categories](#permission-categories)
4. [Using the Admin UI](#using-the-admin-ui)
5. [API Endpoints](#api-endpoints)
6. [Migration Guide](#migration-guide)
7. [Future Integration](#future-integration)

---

## System Architecture

### Key Components

1. **Database Tables**
   - `roles`: Stores role definitions
   - `permissions`: Stores available permissions
   - `role_permissions`: Junction table linking roles to permissions
   - `permission_audit_log`: Tracks all permission changes

2. **Backend API**
   - RESTful endpoints for CRUD operations on roles
   - Permission assignment/management endpoints
   - Audit log endpoint

3. **Frontend UI**
   - `AdminPermissionsManager` component
   - Intuitive permission matrix interface
   - Role creation and editing modals

---

## Database Schema

### Roles Table
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_key VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Permissions Table
```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Role Permissions Junction Table
```sql
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);
```

---

## Permission Categories

Permissions are organized into logical categories:

| Category | Description | Example Permissions |
|----------|-------------|-------------------|
| **users** | User management | manage_users, view_users, assign_roles |
| **tournaments** | Tournament operations | manage_tournaments, manage_scores |
| **courses** | Course management | manage_courses, edit_course_data |
| **analytics** | Analytics and reports | view_analytics, export_data |
| **club** | Club-specific features | view_club_handicaps, manage_club_members |
| **admin** | Administrative | view_as_user, manage_permissions |
| **content** | Content management | create_content, edit_content |

---

## Using the Admin UI

### Accessing the Permission Manager

1. Navigate to **`/admin/permissions`** (Admin-only route)
2. The interface shows all roles with their permission counts

### Creating a New Role

1. Click **"Create Role"** button
2. Fill in:
   - **Role Name**: Display name (e.g., "Tournament Director")
   - **Role Key**: Unique identifier (e.g., "tournament_director")
   - **Description**: What this role can do
3. Click **"Create Role"**
4. After creation, manage permissions by clicking **"Permissions"**

### Managing Permissions for a Role

1. Click the **"Permissions"** button on any role card
2. Check/uncheck permissions by category or individually
3. Use category headers to select/deselect all in that category
4. Click **"Save Permissions"** to apply changes

### Editing a Role

1. Click the **Edit** icon on a role card
2. Modify:
   - Role Name
   - Description
3. **Note**: System roles can be edited but not deleted

### Deleting a Role

1. Click the **Trash** icon on a role card
2. Confirm deletion
3. **Restrictions**:
   - Cannot delete system roles (Admin, Club Pro, etc.)
   - Cannot delete roles with assigned users

---

## API Endpoints

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/roles` | List all roles |
| GET | `/api/admin/roles/:id` | Get role with permissions |
| POST | `/api/admin/roles` | Create new role |
| PUT | `/api/admin/roles/:id` | Update role details |
| DELETE | `/api/admin/roles/:id` | Delete role |

### Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/permissions` | List all permissions |
| PUT | `/api/admin/roles/:id/permissions` | Update role permissions |

### Audit Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/permission-audit-log` | Get audit log |

---

## Migration Guide

### Step 1: Run Database Migration

```bash
psql $DATABASE_URL -f db/migrations/002_create_permission_system.sql
```

This migration:
- Creates new tables for roles/permissions
- Seeds default permissions
- Creates default roles with appropriate permissions
- Adds `role_id` column to users table
- Migrates existing role data

### Step 2: Verify Migration

```sql
-- Check roles
SELECT * FROM roles;

-- Check permissions
SELECT category, COUNT(*) FROM permissions GROUP BY category;

-- Check role-permission mappings
SELECT r.role_name, COUNT(rp.permission_id) as perm_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.role_name;

-- Check users have role_id populated
SELECT role_id, role, COUNT(*) FROM users GROUP BY role_id, role;
```

### Step 3: Test the UI

1. Log in as admin
2. Navigate to `/admin/permissions`
3. Verify all roles are displayed
4. Test creating a new role
5. Test managing permissions

---

## Default Permissions

### Admin Role
Has ALL permissions in the system

### Club Pro Role
- view_users
- view_tournaments
- manage_scores
- submit_scores
- view_courses
- edit_course_data
- view_club_handicaps
- manage_club_members
- view_reports

### Ambassador Role
- view_users
- view_tournaments
- submit_scores
- view_courses
- edit_course_data
- create_content
- edit_content

### Member Role
- view_tournaments
- submit_scores
- view_courses

### Deactivated Role
NO permissions (empty)

---

## Future Integration

### Implementing Permission Checks

While the system is now in place, you can enhance authorization by checking permissions:

#### Backend Example
```javascript
// Check if user has specific permission
async function hasPermission(userId, permissionKey) {
  const { rows } = await pool.query(`
    SELECT 1
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.member_id = $1 AND p.permission_key = $2
  `, [userId, permissionKey]);

  return rows.length > 0;
}

// Middleware example
async function requirePermission(permissionKey) {
  return async (req, res, next) => {
    const hasPermGranted = await hasPermission(req.user.member_id, permissionKey);
    if (!hasPermGranted) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

// Usage
app.delete('/api/tournaments/:id',
  authenticateToken,
  requirePermission('manage_tournaments'),
  async (req, res) => {
    // Delete tournament logic
  }
);
```

#### Frontend Example
```typescript
// In your roleUtils.ts or new permissionUtils.ts
export async function userHasPermission(permissionKey: string): Promise<boolean> {
  try {
    const response = await api.get(`/api/user/permissions/${permissionKey}`);
    return response.data.has_permission;
  } catch {
    return false;
  }
}

// In components
const canManageTournaments = await userHasPermission('manage_tournaments');
if (canManageTournaments) {
  // Show management UI
}
```

### Adding New Permissions

To add new permissions to the system:

```sql
INSERT INTO permissions (permission_key, permission_name, description, category) VALUES
('new_permission_key', 'Permission Display Name', 'What this allows users to do', 'category_name');
```

Then assign it to roles via the Admin UI.

---

## Audit Log

All permission changes are logged:

- Role created
- Role updated
- Role deleted
- Permissions updated

View the audit log via the API:
```bash
GET /api/admin/permission-audit-log?limit=50
```

---

## Best Practices

1. **Use Descriptive Role Names**: Make it clear what the role is for
2. **Document Role Purpose**: Add detailed descriptions
3. **Test Permissions**: Always test new roles before assigning to users
4. **Regular Audits**: Review permission assignments periodically
5. **Least Privilege**: Start with minimal permissions, add as needed
6. **Backup Before Changes**: Always backup before major permission changes

---

## Troubleshooting

### Issue: Users can't access features after migration
**Solution**: Ensure `role_id` is populated for all users:
```sql
UPDATE users SET role_id = (SELECT id FROM roles WHERE role_key = 'member')
WHERE role_id IS NULL;
```

### Issue: Permission changes not taking effect
**Solution**:
1. Check role_permissions table
2. Verify user's role_id
3. Clear any frontend caching

### Issue: Can't delete a role
**Reasons**:
- Role is a system role (is_system_role = true)
- Role has users assigned to it

---

## Security Notes

- ✅ All endpoints require admin authentication
- ✅ System roles are protected from deletion
- ✅ All changes are audit logged
- ✅ Role keys are automatically slugified
- ✅ Permission assignments use transactions
- ✅ Cascading deletes for role_permissions

---

## Support

For issues or questions:
1. Check audit log for changes
2. Verify database migration completed
3. Review console logs
4. Check network requests in DevTools

---

**Updated**: 2025-10-22
**Version**: 1.0.0
**Maintainer**: Development Team
