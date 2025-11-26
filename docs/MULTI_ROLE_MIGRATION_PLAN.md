# Multi-Role Permission Migration Plan

**Date**: 2025-11-07
**Goal**: Transform from one-role-per-user to multi-role-per-user with permissions that sum together

---

## Current State Analysis

Your codebase has **two parallel permission systems**:

1. **Simple Role-Based System (Currently Active)**
   - Single role per user: Member, Admin, Club Pro, Ambassador, Deactivated
   - Role stored in `users.role` column (string)
   - Authorization via role checking utilities (`isAdmin()`, `isClubPro()`, etc.)

2. **Dynamic Permission System (Built but Not Enforced)**
   - Full infrastructure exists: `roles`, `permissions`, `role_permissions` tables
   - 94 permissions across 7 categories
   - Admin UI for managing roles and permissions
   - **Gap**: Not actually used for authorization checks in endpoints

### Migration Goal

Transform from **one role per user** → **multiple roles per user** with permissions that sum together to create their full permission set.

---

## Implementation Plan

### Phase 1: Database Schema Changes (Foundation)

**Objective**: Enable users to have multiple roles while maintaining backward compatibility.

#### 1.1 Create User-Roles Junction Table

**File**: `db/migrations/003_create_user_roles_junction.sql`

```sql
-- Migration: Create user_roles junction table for multi-role support
-- Date: 2025-11-07
-- Description: Enables users to have multiple roles with permissions that sum together

-- ============================================================================
-- USER_ROLES JUNCTION TABLE
-- ============================================================================
-- Many-to-many relationship: users can have multiple roles
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES users(member_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(member_id),
    is_primary BOOLEAN DEFAULT FALSE,
    UNIQUE(member_id, role_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_member ON user_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(member_id, is_primary);

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================
-- Populate user_roles from existing users.role_id column
INSERT INTO user_roles (member_id, role_id, is_primary)
SELECT member_id, role_id, TRUE
FROM users
WHERE role_id IS NOT NULL
ON CONFLICT (member_id, role_id) DO NOTHING;

-- Verify migration
SELECT
    COUNT(DISTINCT u.member_id) as total_users,
    COUNT(ur.id) as total_role_assignments,
    COUNT(CASE WHEN ur.is_primary THEN 1 END) as primary_roles
FROM users u
LEFT JOIN user_roles ur ON u.member_id = ur.member_id;
```

#### 1.2 Create Helper Views

**File**: `db/migrations/004_create_permission_views.sql`

```sql
-- Migration: Create views for multi-role permission queries
-- Date: 2025-11-07
-- Description: Helper views for efficient permission lookups

-- ============================================================================
-- VIEW: Get all permissions for a user (aggregate from all roles)
-- ============================================================================
CREATE OR REPLACE VIEW user_all_permissions AS
SELECT DISTINCT
    u.member_id,
    u.first_name,
    u.last_name,
    u.email_address,
    p.permission_key,
    p.permission_name,
    p.description as permission_description,
    p.category
FROM users u
JOIN user_roles ur ON u.member_id = ur.member_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = TRUE;

-- ============================================================================
-- VIEW: Get all roles for a user with primary role flagged
-- ============================================================================
CREATE OR REPLACE VIEW user_roles_view AS
SELECT
    u.member_id,
    u.first_name,
    u.last_name,
    u.email_address,
    r.id as role_id,
    r.role_name,
    r.role_key,
    r.description as role_description,
    ur.is_primary,
    ur.assigned_at,
    ur.assigned_by
FROM users u
JOIN user_roles ur ON u.member_id = ur.member_id
JOIN roles r ON ur.role_id = r.id
WHERE r.is_active = TRUE
ORDER BY u.member_id, ur.is_primary DESC, r.role_name;

-- ============================================================================
-- VIEW: Permission summary by user
-- ============================================================================
CREATE OR REPLACE VIEW user_permission_summary AS
SELECT
    member_id,
    first_name,
    last_name,
    email_address,
    COUNT(DISTINCT permission_key) as total_permissions,
    array_agg(DISTINCT permission_key ORDER BY permission_key) as permission_list,
    array_agg(DISTINCT category ORDER BY category) as categories
FROM user_all_permissions
GROUP BY member_id, first_name, last_name, email_address;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_all_permissions_member
    ON user_all_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_user_all_permissions_permission
    ON user_all_permissions(permission_key);
```

---

### Phase 2: Backend Permission Checking System

**Objective**: Implement permission-based authorization middleware.

#### 2.1 Create Permission Checking Functions

**File**: `server.js` (add after existing middleware, around line 155)

```javascript
// ============================================================================
// PERMISSION CHECKING FUNCTIONS
// ============================================================================

/**
 * Fetch all permissions for a user from database
 * @param {number} userId - The user's member_id
 * @returns {Promise<string[]>} Array of permission keys
 */
async function getUserPermissions(userId) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT permission_key
       FROM user_all_permissions
       WHERE member_id = $1`,
      [userId]
    );
    return result.rows.map(row => row.permission_key);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

/**
 * Check if user has specific permission
 * @param {number} userId - The user's member_id
 * @param {string} permissionKey - Permission to check (e.g., 'manage_users')
 * @returns {Promise<boolean>}
 */
async function userHasPermission(userId, permissionKey) {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionKey);
}

/**
 * Check if user has ANY of the specified permissions
 * @param {number} userId - The user's member_id
 * @param {string[]} permissionKeys - Array of permission keys
 * @returns {Promise<boolean>}
 */
async function userHasAnyPermission(userId, permissionKeys) {
  const permissions = await getUserPermissions(userId);
  return permissionKeys.some(key => permissions.includes(key));
}

/**
 * Check if user has ALL of the specified permissions
 * @param {number} userId - The user's member_id
 * @param {string[]} permissionKeys - Array of permission keys
 * @returns {Promise<boolean>}
 */
async function userHasAllPermissions(userId, permissionKeys) {
  const permissions = await getUserPermissions(userId);
  return permissionKeys.every(key => permissions.includes(key));
}

/**
 * Get all roles for a user
 * @param {number} userId - The user's member_id
 * @returns {Promise<Object[]>} Array of role objects
 */
async function getUserRoles(userId) {
  try {
    const result = await pool.query(
      `SELECT role_id, role_name, role_key, is_primary
       FROM user_roles_view
       WHERE member_id = $1`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
}
```

#### 2.2 Create Permission Middleware

**File**: `server.js` (add after permission checking functions)

```javascript
// ============================================================================
// PERMISSION MIDDLEWARE
// ============================================================================

/**
 * Middleware: Require specific permission
 * @param {string} permissionKey - Required permission (e.g., 'manage_users')
 */
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user.member_id;
      const hasPermission = await userHasPermission(userId, permissionKey);

      if (!hasPermission) {
        console.log(`Access denied: User ${userId} lacks permission '${permissionKey}'`);
        return res.status(403).json({
          error: 'Access denied',
          required_permission: permissionKey,
          message: `You do not have the '${permissionKey}' permission`
        });
      }

      // Attach permissions to request for later use (avoid repeated queries)
      if (!req.userPermissions) {
        req.userPermissions = await getUserPermissions(userId);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware: Require ANY of the specified permissions
 * @param {...string} permissionKeys - One or more permission keys
 */
function requireAnyPermission(...permissionKeys) {
  return async (req, res, next) => {
    try {
      const userId = req.user.member_id;
      const hasAny = await userHasAnyPermission(userId, permissionKeys);

      if (!hasAny) {
        console.log(`Access denied: User ${userId} lacks any of: ${permissionKeys.join(', ')}`);
        return res.status(403).json({
          error: 'Access denied',
          required_permissions: permissionKeys,
          message: `You need at least one of these permissions: ${permissionKeys.join(', ')}`
        });
      }

      if (!req.userPermissions) {
        req.userPermissions = await getUserPermissions(userId);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware: Require ALL of the specified permissions
 * @param {...string} permissionKeys - One or more permission keys
 */
function requireAllPermissions(...permissionKeys) {
  return async (req, res, next) => {
    try {
      const userId = req.user.member_id;
      const hasAll = await userHasAllPermissions(userId, permissionKeys);

      if (!hasAll) {
        console.log(`Access denied: User ${userId} lacks all of: ${permissionKeys.join(', ')}`);
        return res.status(403).json({
          error: 'Access denied',
          required_permissions: permissionKeys,
          message: `You need all of these permissions: ${permissionKeys.join(', ')}`
        });
      }

      if (!req.userPermissions) {
        req.userPermissions = await getUserPermissions(userId);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}
```

#### 2.3 Apply Permission Middleware to Endpoints

**Replace role-based middleware with permission-based:**

```javascript
// ============================================================================
// EXAMPLE: Update existing endpoints to use permission middleware
// ============================================================================

// OLD:
// app.get('/api/admin/users', requireAdmin, async (req, res) => { ... });

// NEW:
app.get('/api/admin/users',
  authenticateToken,
  requirePermission('manage_users'),
  async (req, res) => {
    // Endpoint logic remains the same
  }
);

// User Management Endpoints
app.get('/api/admin/user-tracking-stats',
  authenticateToken,
  requirePermission('view_analytics'),
  async (req, res) => { /* ... */ }
);

app.get('/api/admin/user-tracking-details',
  authenticateToken,
  requirePermission('view_analytics'),
  async (req, res) => { /* ... */ }
);

// Tournament Management Endpoints
app.post('/api/tournaments',
  authenticateToken,
  requirePermission('manage_tournaments'),
  async (req, res) => { /* ... */ }
);

app.put('/api/tournaments/:id',
  authenticateToken,
  requirePermission('manage_tournaments'),
  async (req, res) => { /* ... */ }
);

app.delete('/api/tournaments/:id',
  authenticateToken,
  requirePermission('manage_tournaments'),
  async (req, res) => { /* ... */ }
);

// Score Management Endpoints
app.post('/api/tournaments/:id/strokeplay-scorecards',
  authenticateToken,
  requireAnyPermission('submit_scores', 'manage_scores'),
  async (req, res) => { /* ... */ }
);

app.delete('/api/tournaments/:id/admin/strokeplay-scorecards/:scorecardId',
  authenticateToken,
  requirePermission('manage_scores'),
  async (req, res) => { /* ... */ }
);

// Course Management Endpoints
app.post('/api/courses',
  authenticateToken,
  requirePermission('manage_courses'),
  async (req, res) => { /* ... */ }
);

app.put('/api/courses/:id',
  authenticateToken,
  requirePermission('edit_course_data'),
  async (req, res) => { /* ... */ }
);

// Club Pro Endpoints
app.get('/api/club-pro/handicaps',
  authenticateToken,
  requirePermission('view_club_handicaps'),
  async (req, res) => { /* ... */ }
);

app.get('/api/club-pro/player-tournaments',
  authenticateToken,
  requireAnyPermission('manage_club_members', 'view_club_handicaps'),
  async (req, res) => { /* ... */ }
);

// Admin Panel Access
app.get('/api/admin/view-as-data',
  authenticateToken,
  requirePermission('view_as_user'),
  async (req, res) => { /* ... */ }
);

app.get('/api/admin/permission-audit-log',
  authenticateToken,
  requirePermission('manage_permissions'),
  async (req, res) => { /* ... */ }
);
```

---

### Phase 3: Frontend Permission Integration

**Objective**: Update frontend to work with multi-role permissions.

#### 3.1 Update User Type Definition

**File**: `client/src/types/user.ts` (create if doesn't exist)

```typescript
import { Role } from './permissions';

export interface User {
  member_id: number;
  first_name: string;
  last_name: string;
  email_address: string;
  club: string;

  // Backward compatibility
  role: string; // Primary role name (deprecated)

  // Multi-role support
  roles?: Role[]; // Array of all user roles
  permissions?: string[]; // Array of permission keys
  primary_role?: string; // Primary role name

  handicap: number | null;
  profile_photo_url: string | null;
  created_at: string;
}
```

#### 3.2 Update Auth Context to Fetch Permissions

**File**: `client/src/AuthContext.tsx`

```typescript
// Add new function to fetch user permissions
const fetchUserPermissions = async (userId: number) => {
  try {
    const response = await fetch(`/api/users/${userId}/permissions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch user permissions');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return null;
  }
};

// Update login function to fetch permissions
const login = async (email: string, password: string) => {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);

    // Fetch user's permissions and roles
    const permissionsData = await fetchUserPermissions(data.user.member_id);

    setUser({
      ...data.user,
      roles: permissionsData?.roles ?? [],
      permissions: permissionsData?.permissions ?? [],
      primary_role: permissionsData?.primary_role ?? data.user.role
    });

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Update refreshUser function similarly
const refreshUser = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/api/verify-token', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      logout();
      return;
    }

    const data = await response.json();

    // Fetch permissions
    const permissionsData = await fetchUserPermissions(data.user.member_id);

    setUser({
      ...data.user,
      roles: permissionsData?.roles ?? [],
      permissions: permissionsData?.permissions ?? [],
      primary_role: permissionsData?.primary_role ?? data.user.role
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    logout();
  }
};
```

#### 3.3 Create Permission Checking Hook

**File**: `client/src/hooks/usePermissions.ts` (NEW)

```typescript
import { useAuth } from '../AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permissionKey: string): boolean => {
    return user?.permissions?.includes(permissionKey) ?? false;
  };

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    if (!user?.permissions) return false;
    return permissionKeys.some(key => user.permissions!.includes(key));
  };

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    if (!user?.permissions) return false;
    return permissionKeys.every(key => user.permissions!.includes(key));
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (roleKey: string): boolean => {
    return user?.roles?.some(r => r.role_key === roleKey) ?? false;
  };

  /**
   * Check if user has ANY of the specified roles
   */
  const hasAnyRole = (roleKeys: string[]): boolean => {
    if (!user?.roles) return false;
    return roleKeys.some(key => user.roles!.some(r => r.role_key === key));
  };

  /**
   * Get user's primary role
   */
  const getPrimaryRole = (): string => {
    return user?.primary_role ?? user?.role ?? 'Member';
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    getPrimaryRole,
    permissions: user?.permissions ?? [],
    roles: user?.roles ?? []
  };
}

// Convenience exports for common checks
export const PermissionKeys = {
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  ASSIGN_ROLES: 'assign_roles',
  DEACTIVATE_USERS: 'deactivate_users',

  // Tournament Management
  MANAGE_TOURNAMENTS: 'manage_tournaments',
  VIEW_TOURNAMENTS: 'view_tournaments',
  MANAGE_SCORES: 'manage_scores',
  SUBMIT_SCORES: 'submit_scores',

  // Course Management
  MANAGE_COURSES: 'manage_courses',
  VIEW_COURSES: 'view_courses',
  EDIT_COURSE_DATA: 'edit_course_data',

  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',

  // Club Features
  VIEW_CLUB_HANDICAPS: 'view_club_handicaps',
  MANAGE_CLUB_MEMBERS: 'manage_club_members',

  // Admin
  VIEW_AS_USER: 'view_as_user',
  MANAGE_PERMISSIONS: 'manage_permissions',
  ACCESS_ADMIN_PANEL: 'access_admin_panel',

  // Content
  CREATE_CONTENT: 'create_content',
  EDIT_CONTENT: 'edit_content',
  DELETE_CONTENT: 'delete_content'
} as const;
```

#### 3.4 Update Components to Use Permissions

**Example: Update `SimulatorCourses.tsx`**

```tsx
// OLD:
import { canEditCourses } from '../utils/roleUtils';
{canEditCourses(user) && <button>Edit</button>}

// NEW:
import { usePermissions, PermissionKeys } from '../hooks/usePermissions';

function SimulatorCourses() {
  const { hasPermission } = usePermissions();

  return (
    <>
      {hasPermission(PermissionKeys.EDIT_COURSE_DATA) && (
        <button>Edit Course</button>
      )}
    </>
  );
}
```

**Example: Update `UserTrackingWidget.tsx`**

```tsx
import { usePermissions, PermissionKeys } from '../hooks/usePermissions';

function UserTrackingWidget() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  // Show analytics only to users with permission
  if (!hasPermission(PermissionKeys.VIEW_ANALYTICS)) {
    return <div>Access denied</div>;
  }

  return (
    <div>
      <h2>User Analytics</h2>

      {hasPermission(PermissionKeys.MANAGE_USERS) && (
        <button>Manage Users</button>
      )}

      {hasAnyPermission([
        PermissionKeys.EXPORT_DATA,
        PermissionKeys.VIEW_REPORTS
      ]) && (
        <button>Export Report</button>
      )}
    </div>
  );
}
```

#### 3.5 Create Protected Route Component

**File**: `client/src/components/ProtectedRoute.tsx` (NEW)

```tsx
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallbackPath = '/'
}: ProtectedRouteProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = false;

  if (requiredPermission) {
    hasAccess = hasPermission(requiredPermission);
  } else if (requiredPermissions) {
    hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
  } else {
    hasAccess = true; // No specific permission required
  }

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
```

**Update `App.tsx` to use ProtectedRoute:**

```tsx
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionKeys } from './hooks/usePermissions';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredPermission={PermissionKeys.MANAGE_USERS}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/club-pro"
        element={
          <ProtectedRoute
            requiredPermissions={[
              PermissionKeys.VIEW_CLUB_HANDICAPS,
              PermissionKeys.MANAGE_CLUB_MEMBERS
            ]}
          >
            <ClubProDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user-tracking"
        element={
          <ProtectedRoute requiredPermission={PermissionKeys.VIEW_ANALYTICS}>
            <UserTracking />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

---

### Phase 4: User Role Management UI

**Objective**: Allow admins to assign multiple roles to users.

#### 4.1 Create Multi-Role Assignment Component

**File**: `client/src/components/UserRoleManager.tsx` (NEW)

```tsx
import React, { useState, useEffect } from 'react';
import { Role } from '../types/permissions';
import { User } from '../types/user';

interface UserRoleManagerProps {
  user: User;
  onUpdate: () => void;
  onCancel: () => void;
}

export function UserRoleManager({ user, onUpdate, onCancel }: UserRoleManagerProps) {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [primaryRoleId, setPrimaryRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableRoles();

    // Initialize selected roles from user data
    if (user.roles) {
      const roleIds = user.roles.map(r => r.id);
      setSelectedRoles(roleIds);

      const primary = user.roles.find(r => r.is_primary);
      if (primary) {
        setPrimaryRoleId(primary.id);
      }
    }
  }, [user]);

  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch roles');

      const data = await response.json();
      setAvailableRoles(data.roles);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to load roles');
    }
  };

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        // Removing role
        const newRoles = prev.filter(id => id !== roleId);

        // If removing primary role, clear primary selection
        if (roleId === primaryRoleId) {
          setPrimaryRoleId(newRoles.length > 0 ? newRoles[0] : null);
        }

        return newRoles;
      } else {
        // Adding role
        const newRoles = [...prev, roleId];

        // If first role, make it primary
        if (newRoles.length === 1) {
          setPrimaryRoleId(roleId);
        }

        return newRoles;
      }
    });
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      setError('User must have at least one role');
      return;
    }

    if (!primaryRoleId) {
      setError('Please select a primary role');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.member_id}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          role_ids: selectedRoles,
          primary_role_id: primaryRoleId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update roles');
      }

      onUpdate();
    } catch (err) {
      console.error('Error updating roles:', err);
      setError('Failed to update user roles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-role-manager">
      <h3>Manage Roles for {user.first_name} {user.last_name}</h3>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="role-selection">
        <p className="instruction">
          Select one or more roles. The primary role determines the user's default access level.
        </p>

        <div className="role-list">
          {availableRoles
            .filter(role => role.is_active)
            .map(role => (
              <div key={role.id} className="role-item">
                <label className="role-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                  />
                  <div className="role-info">
                    <strong>{role.role_name}</strong>
                    <span className="role-description">{role.description}</span>
                    <span className="permission-count">
                      {role.permission_count} permissions
                    </span>
                  </div>
                </label>

                {selectedRoles.includes(role.id) && (
                  <label className="primary-radio">
                    <input
                      type="radio"
                      name="primary"
                      checked={primaryRoleId === role.id}
                      onChange={() => setPrimaryRoleId(role.id)}
                    />
                    <span>Primary</span>
                  </label>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="actions">
        <button
          onClick={handleSave}
          disabled={loading || selectedRoles.length === 0}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Save Roles'}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>

      {user.roles && user.roles.length > 0 && (
        <div className="current-permissions">
          <h4>Current Permissions ({user.permissions?.length ?? 0})</h4>
          <div className="permission-list">
            {user.permissions?.map(perm => (
              <span key={perm} className="permission-badge">
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 4.2 Backend Endpoint for Role Assignment

**File**: `server.js` (add to admin endpoints section)

```javascript
// ============================================================================
// USER ROLE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/users/:userId/permissions
 * Get all roles and permissions for a user
 */
app.get('/api/users/:userId/permissions',
  authenticateToken,
  async (req, res) => {
    const { userId } = req.params;

    try {
      // Only allow users to view their own permissions (or admins to view any)
      if (req.user.member_id !== parseInt(userId)) {
        const hasPermission = await userHasPermission(req.user.member_id, 'manage_users');
        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Get all roles for user
      const rolesResult = await pool.query(
        `SELECT * FROM user_roles_view WHERE member_id = $1 ORDER BY is_primary DESC`,
        [userId]
      );

      // Get all permissions (aggregated from all roles)
      const permissionsResult = await pool.query(
        `SELECT DISTINCT permission_key, permission_name, category
         FROM user_all_permissions
         WHERE member_id = $1
         ORDER BY category, permission_name`,
        [userId]
      );

      const primaryRole = rolesResult.rows.find(r => r.is_primary);

      res.json({
        roles: rolesResult.rows,
        permissions: permissionsResult.rows.map(p => p.permission_key),
        permission_details: permissionsResult.rows,
        primary_role: primaryRole?.role_name ?? 'Member'
      });
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({ error: 'Failed to fetch user permissions' });
    }
  }
);

/**
 * PUT /api/admin/users/:userId/roles
 * Assign multiple roles to a user
 */
app.put('/api/admin/users/:userId/roles',
  authenticateToken,
  requirePermission('assign_roles'),
  async (req, res) => {
    const { userId } = req.params;
    const { role_ids, primary_role_id } = req.body;

    // Validation
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      return res.status(400).json({ error: 'role_ids must be a non-empty array' });
    }

    if (!primary_role_id || !role_ids.includes(primary_role_id)) {
      return res.status(400).json({
        error: 'primary_role_id must be one of the selected roles'
      });
    }

    try {
      await pool.query('BEGIN');

      // Get old roles for audit log
      const oldRolesResult = await pool.query(
        'SELECT role_id FROM user_roles WHERE member_id = $1',
        [userId]
      );
      const oldRoleIds = oldRolesResult.rows.map(r => r.role_id);

      // Remove existing role assignments
      await pool.query('DELETE FROM user_roles WHERE member_id = $1', [userId]);

      // Add new role assignments
      for (const roleId of role_ids) {
        await pool.query(
          `INSERT INTO user_roles (member_id, role_id, is_primary, assigned_by)
           VALUES ($1, $2, $3, $4)`,
          [userId, roleId, roleId === primary_role_id, req.user.member_id]
        );
      }

      // Update primary role in users table for backward compatibility
      await pool.query(
        `UPDATE users
         SET role_id = $1,
             role = (SELECT role_name FROM roles WHERE id = $1)
         WHERE member_id = $2`,
        [primary_role_id, userId]
      );

      // Log the change
      await pool.query(
        `INSERT INTO permission_audit_log (action, admin_user_id, details)
         VALUES ($1, $2, $3)`,
        [
          'roles_updated',
          req.user.member_id,
          JSON.stringify({
            user_id: userId,
            old_roles: oldRoleIds,
            new_roles: role_ids,
            primary_role: primary_role_id
          })
        ]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'User roles updated successfully'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Role assignment error:', error);
      res.status(500).json({ error: 'Failed to assign roles' });
    }
  }
);

/**
 * GET /api/admin/users/:userId/role-history
 * Get role assignment history for a user
 */
app.get('/api/admin/users/:userId/role-history',
  authenticateToken,
  requirePermission('manage_users'),
  async (req, res) => {
    const { userId } = req.params;

    try {
      const result = await pool.query(
        `SELECT
          pal.id,
          pal.action,
          pal.created_at,
          pal.details,
          u.first_name,
          u.last_name
         FROM permission_audit_log pal
         LEFT JOIN users u ON pal.admin_user_id = u.member_id
         WHERE pal.details->>'user_id' = $1
         ORDER BY pal.created_at DESC
         LIMIT 50`,
        [userId]
      );

      res.json({ history: result.rows });
    } catch (error) {
      console.error('Error fetching role history:', error);
      res.status(500).json({ error: 'Failed to fetch role history' });
    }
  }
);
```

---

### Phase 5: Backward Compatibility & Migration

**Objective**: Ensure smooth transition without breaking existing functionality.

#### 5.1 Update Existing Role Utilities

**File**: `server.js` - Update existing role checking functions

```javascript
// ============================================================================
// BACKWARD COMPATIBLE ROLE CHECKING (Deprecated - use permissions instead)
// ============================================================================

/**
 * @deprecated Use userHasPermission('access_admin_panel') instead
 */
async function isAdmin(user) {
  // Check if user has admin permissions
  return await userHasPermission(user.member_id, 'access_admin_panel');
}

/**
 * @deprecated Use userHasAnyPermission(['view_club_handicaps', 'manage_club_members']) instead
 */
async function isClubPro(user) {
  return await userHasAnyPermission(user.member_id, [
    'view_club_handicaps',
    'manage_club_members'
  ]);
}

/**
 * @deprecated Use permission checks instead
 */
async function isAdminOrClubPro(user) {
  return await userHasAnyPermission(user.member_id, [
    'access_admin_panel',
    'view_club_handicaps',
    'manage_club_members'
  ]);
}

/**
 * Update existing requireAdmin middleware to use permissions
 * Keep for backward compatibility during transition
 */
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.member_id;
    const hasPermission = await userHasPermission(userId, 'access_admin_panel');

    if (!hasPermission) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Update existing requireClubProOrAdmin middleware
 */
const requireClubProOrAdmin = async (req, res, next) => {
  try {
    const userId = req.user.member_id;
    const hasPermission = await userHasAnyPermission(userId, [
      'access_admin_panel',
      'view_club_handicaps',
      'manage_club_members'
    ]);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Club Pro or Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Authorization check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};
```

#### 5.2 Frontend Backward Compatible Utilities

**File**: `client/src/utils/roleUtils.ts` - Add deprecation notices

```typescript
import { User } from '../types/user';

/**
 * @deprecated Use usePermissions().hasPermission('access_admin_panel') instead
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.permissions?.includes('access_admin_panel') ??
         normalizeRole(user.role) === UserRole.ADMIN;
}

/**
 * @deprecated Use usePermissions().hasAnyPermission(['view_club_handicaps', 'manage_club_members']) instead
 */
export function isClubPro(user: User | null): boolean {
  if (!user) return false;
  return user.permissions?.some(p =>
    ['view_club_handicaps', 'manage_club_members'].includes(p)
  ) ?? normalizeRole(user.role) === UserRole.CLUB_PRO;
}

/**
 * @deprecated Use usePermissions().hasPermission('edit_course_data') instead
 */
export function canEditCourses(user: User | null): boolean {
  if (!user) return false;
  return user.permissions?.includes('edit_course_data') ?? false;
}
```

#### 5.3 Create Migration Script

**File**: `scripts/migrate-to-multi-role.js` (NEW)

```javascript
/**
 * Migration Script: Convert existing users to multi-role system
 *
 * Run this script once to populate the user_roles table with existing user roles
 *
 * Usage: node scripts/migrate-to-multi-role.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateUsers() {
  console.log('Starting multi-role migration...\n');

  try {
    // Get all users
    const usersResult = await pool.query(
      'SELECT member_id, role, role_id FROM users WHERE role_id IS NOT NULL'
    );

    console.log(`Found ${usersResult.rows.length} users to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of usersResult.rows) {
      try {
        // Check if already migrated
        const existingResult = await pool.query(
          'SELECT 1 FROM user_roles WHERE member_id = $1',
          [user.member_id]
        );

        if (existingResult.rows.length > 0) {
          console.log(`✓ User ${user.member_id} already migrated - skipping`);
          skipped++;
          continue;
        }

        // Assign their current role as primary role
        await pool.query(
          `INSERT INTO user_roles (member_id, role_id, is_primary)
           VALUES ($1, $2, TRUE)`,
          [user.member_id, user.role_id]
        );

        console.log(`✓ Migrated user ${user.member_id} with role: ${user.role}`);
        migrated++;

      } catch (error) {
        console.error(`✗ Error migrating user ${user.member_id}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total users:     ${usersResult.rows.length}`);
    console.log(`Migrated:        ${migrated}`);
    console.log(`Skipped:         ${skipped}`);
    console.log(`Errors:          ${errors}`);
    console.log('='.repeat(60) + '\n');

    // Verify migration
    const verifyResult = await pool.query(`
      SELECT
        COUNT(DISTINCT u.member_id) as total_users,
        COUNT(ur.id) as total_role_assignments,
        COUNT(CASE WHEN ur.is_primary THEN 1 END) as primary_roles
      FROM users u
      LEFT JOIN user_roles ur ON u.member_id = ur.member_id
    `);

    console.log('Verification:');
    console.log('-'.repeat(60));
    console.log(`Total users:           ${verifyResult.rows[0].total_users}`);
    console.log(`Total role assignments: ${verifyResult.rows[0].total_role_assignments}`);
    console.log(`Primary roles:         ${verifyResult.rows[0].primary_roles}`);
    console.log('-'.repeat(60) + '\n');

    if (errors === 0) {
      console.log('✓ Migration completed successfully!');
    } else {
      console.log('⚠ Migration completed with some errors. Please review above.');
    }

  } catch (error) {
    console.error('Fatal migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateUsers();
```

#### 5.4 Create Rollback Script

**File**: `scripts/rollback-multi-role.js` (NEW)

```javascript
/**
 * Rollback Script: Revert multi-role changes if needed
 *
 * WARNING: This will delete all data from user_roles table
 *
 * Usage: node scripts/rollback-multi-role.js
 */

const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function rollback() {
  console.log('\n' + '='.repeat(60));
  console.log('MULTI-ROLE ROLLBACK SCRIPT');
  console.log('='.repeat(60));
  console.log('\nWARNING: This will:');
  console.log('  1. Delete all data from user_roles table');
  console.log('  2. Keep the users.role_id column intact');
  console.log('  3. NOT drop the user_roles table (for safety)\n');

  const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('\nRollback cancelled.');
    rl.close();
    await pool.end();
    return;
  }

  try {
    // Get current stats
    const beforeResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_roles'
    );

    console.log(`\nFound ${beforeResult.rows[0].count} role assignments to remove...`);

    // Delete all user_roles
    await pool.query('DELETE FROM user_roles');

    console.log('✓ Deleted all user role assignments');

    // Verify
    const afterResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_roles'
    );

    console.log(`\nRollback complete. Remaining assignments: ${afterResult.rows[0].count}`);
    console.log('\nNote: To fully revert, you may also need to:');
    console.log('  1. Revert code changes to use old role-based system');
    console.log('  2. Drop views: user_all_permissions, user_roles_view');
    console.log('  3. Drop table: user_roles');

  } catch (error) {
    console.error('\nRollback error:', error);
  } finally {
    rl.close();
    await pool.end();
  }
}

rollback();
```

---

### Phase 6: Testing & Validation

#### 6.1 Test Checklist

**Database Tests:**
- [ ] Migration script runs without errors
- [ ] All existing users have at least one role in user_roles
- [ ] Primary roles are correctly set
- [ ] Permission views return correct data
- [ ] Role assignment creates audit log entries

**Backend API Tests:**
- [ ] `/api/users/:userId/permissions` returns correct permissions
- [ ] Permission middleware correctly blocks unauthorized users
- [ ] Permission middleware allows authorized users
- [ ] Multi-role assignment endpoint works
- [ ] Backward compatible role checks still work
- [ ] Audit log tracks all role changes

**Frontend Tests:**
- [ ] `usePermissions()` hook returns correct permissions
- [ ] Components show/hide based on permissions
- [ ] UserRoleManager UI loads and displays correctly
- [ ] Role assignment saves successfully
- [ ] Protected routes work correctly
- [ ] User sees correct permissions after login
- [ ] Refresh maintains permissions

**Integration Tests:**
- [ ] User with Admin role has all admin permissions
- [ ] User with multiple roles has combined permissions
- [ ] Changing roles updates permissions immediately
- [ ] View-as mode works with multi-role system
- [ ] No permission = access denied (403)
- [ ] Invalid permission checks fail gracefully

#### 6.2 Performance Testing

**Database Query Performance:**
```sql
-- Test permission lookup speed
EXPLAIN ANALYZE
SELECT DISTINCT permission_key
FROM user_all_permissions
WHERE member_id = 1;

-- Should complete in < 50ms
```

**Load Testing:**
- [ ] 100 concurrent permission checks
- [ ] Cache permission lookups in request lifecycle
- [ ] Consider Redis caching for frequently accessed permissions

#### 6.3 Security Testing

- [ ] Users cannot access endpoints they don't have permissions for
- [ ] Users cannot assign roles they don't have permission to assign
- [ ] Audit log captures all permission changes
- [ ] SQL injection attempts fail
- [ ] Role escalation attempts fail

---

## Implementation Order & Timeline

### Week 1: Database & Backend Foundation
**Days 1-2: Database Setup**
- Run migration 003 (user_roles junction table)
- Run migration 004 (permission views)
- Run migration script to populate user_roles
- Verify all users migrated correctly

**Days 3-4: Backend Permission System**
- Add permission checking functions to server.js
- Add permission middleware to server.js
- Test permission queries and middleware

**Day 5: Backend Endpoint Updates**
- Update 5-10 endpoints to use permission middleware
- Add user role management endpoints
- Test all updated endpoints

### Week 2: Frontend Integration
**Days 1-2: Permission Infrastructure**
- Update User type definition
- Update AuthContext to fetch permissions
- Create usePermissions hook
- Test permission fetching

**Days 3-4: Component Updates**
- Create ProtectedRoute component
- Update 3-5 key components to use permissions
- Create UserRoleManager component
- Test component permission checks

**Day 5: UI Polish**
- Style UserRoleManager
- Update navigation based on permissions
- Add permission indicators
- Test user experience

### Week 3: Migration & Deployment
**Days 1-2: Final Updates**
- Update remaining endpoints (20-30 endpoints)
- Update remaining components
- Add deprecation notices
- Complete documentation

**Day 3: Testing**
- Run full test suite
- Manual QA testing
- Performance testing
- Security testing

**Days 4-5: Staged Rollout**
- Deploy to staging environment
- Test with real data
- Deploy to production
- Monitor for issues
- Gather feedback

---

## Key Files to Modify

### Database Migrations (NEW)
1. `db/migrations/003_create_user_roles_junction.sql`
2. `db/migrations/004_create_permission_views.sql`

### Scripts (NEW)
1. `scripts/migrate-to-multi-role.js`
2. `scripts/rollback-multi-role.js`

### Backend (server.js)
- Lines ~155-250: Add permission checking functions
- Lines ~250-350: Add permission middleware
- Lines ~8936+: Add user role management endpoints
- Update ~30-40 existing endpoints to use permission middleware

### Frontend Type Definitions
1. `client/src/types/user.ts` - Update User interface (NEW or UPDATE)
2. `client/src/types/permissions.ts` - Already exists

### Frontend Hooks (NEW)
1. `client/src/hooks/usePermissions.ts`

### Frontend Components (NEW)
1. `client/src/components/UserRoleManager.tsx`
2. `client/src/components/ProtectedRoute.tsx`

### Frontend Components (UPDATE)
1. `client/src/AuthContext.tsx` - Fetch permissions on login
2. `client/src/App.tsx` - Use ProtectedRoute
3. `client/src/components/SimulatorCourses.tsx` - Use permissions
4. `client/src/components/UserTrackingWidget.tsx` - Use permissions
5. ~10-15 other components that check roles

### Frontend Utils (UPDATE)
1. `client/src/utils/roleUtils.ts` - Add deprecation notices

### Documentation (UPDATE)
1. `PERMISSION_SYSTEM_GUIDE.md` - Update with multi-role info
2. `docs/MULTI_ROLE_MIGRATION_PLAN.md` - This document
3. `README.md` - Add migration notes

---

## Rollback Strategy

If issues arise, follow this rollback plan:

### Immediate Rollback (Code Only)
1. Revert backend to use `requireAdmin` and `requireClubProOrAdmin` middleware
2. Revert frontend to use role checking utilities from `roleUtils.ts`
3. Do NOT query `user_roles` table
4. Keep using `users.role` and `users.role_id` columns
5. Deploy reverted code

### Database Rollback
```bash
node scripts/rollback-multi-role.js
```

This will:
- Delete all data from `user_roles` table
- Keep table structure intact (for safety)
- Preserve backward compatible columns

### Full Rollback (If Needed)
```sql
-- Drop views
DROP VIEW IF EXISTS user_all_permissions;
DROP VIEW IF EXISTS user_roles_view;
DROP VIEW IF EXISTS user_permission_summary;

-- Drop table
DROP TABLE IF EXISTS user_roles;

-- Users table remains unchanged (role and role_id columns preserved)
```

---

## Post-Migration Tasks

### Week 4+: Optimization & Enhancement

**Performance Optimization:**
- [ ] Add Redis caching for user permissions
- [ ] Optimize permission query performance
- [ ] Add database query monitoring

**Feature Enhancements:**
- [ ] Add bulk role assignment
- [ ] Create role templates
- [ ] Add permission inheritance
- [ ] Create role hierarchy (Admin > Club Pro > Member)

**Documentation:**
- [ ] Create admin user guide for role management
- [ ] Create developer guide for adding new permissions
- [ ] Update API documentation
- [ ] Create video tutorial for admins

**Monitoring:**
- [ ] Set up permission denial alerts
- [ ] Monitor audit log for suspicious activity
- [ ] Track permission query performance
- [ ] Monitor user feedback

---

## Support & Troubleshooting

### Common Issues

**Issue: User has no permissions after migration**
- Check if user exists in `user_roles` table
- Verify role has permissions in `role_permissions` table
- Run: `SELECT * FROM user_all_permissions WHERE member_id = ?`

**Issue: Permission checks are slow**
- Add database indexes
- Implement Redis caching
- Cache permissions in request lifecycle (already implemented)

**Issue: Frontend not showing new permissions**
- Clear browser cache
- Force token refresh
- Check `/api/users/:userId/permissions` endpoint

**Issue: User can't be assigned multiple roles**
- Check `user_roles` table has unique constraint on (member_id, role_id)
- Verify no duplicate entries
- Check frontend sends array of role_ids

### Debug Queries

```sql
-- Check user's roles
SELECT * FROM user_roles_view WHERE member_id = ?;

-- Check user's permissions
SELECT * FROM user_all_permissions WHERE member_id = ?;

-- Check role's permissions
SELECT * FROM role_permissions_view WHERE role_id = ?;

-- Check audit log
SELECT * FROM permission_audit_log ORDER BY created_at DESC LIMIT 50;
```

---

## Success Metrics

**Technical Metrics:**
- [ ] All users successfully migrated to multi-role system
- [ ] Zero permission-related security vulnerabilities
- [ ] Permission checks complete in < 50ms
- [ ] 100% test coverage for permission system
- [ ] Zero production errors related to permissions

**User Experience Metrics:**
- [ ] Admins can easily assign multiple roles
- [ ] Users understand their permissions
- [ ] No user complaints about access issues
- [ ] Role management UI is intuitive
- [ ] Permission changes take effect immediately

**Business Metrics:**
- [ ] Increased flexibility in user role assignments
- [ ] Reduced admin overhead for role management
- [ ] Better audit trail for compliance
- [ ] Easier to add new features with granular permissions

---

## Future Enhancements

### Phase 7: Advanced Features (Optional)

**Role Hierarchy:**
```javascript
// Admin inherits all permissions from Club Pro, Ambassador, and Member
const roleHierarchy = {
  'admin': ['club_pro', 'ambassador', 'member'],
  'club_pro': ['member'],
  'ambassador': ['member']
};
```

**Permission Groups:**
```javascript
// Group related permissions for easier assignment
const permissionGroups = {
  'tournament_management': [
    'manage_tournaments',
    'manage_scores',
    'view_tournaments'
  ],
  'user_management': [
    'manage_users',
    'assign_roles',
    'deactivate_users'
  ]
};
```

**Temporary Role Assignments:**
```sql
ALTER TABLE user_roles ADD COLUMN expires_at TIMESTAMP;
```

**Role Request System:**
- Users can request additional roles
- Admins approve/deny requests
- Notification system for requests

---

**Document Version**: 1.0
**Last Updated**: 2025-11-07
**Author**: Claude Code Assistant
**Status**: Ready for Implementation
