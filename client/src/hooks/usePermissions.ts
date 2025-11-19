import { useAuth } from '../AuthContext';
import { UserRole } from '../services/api';

/**
 * Hook for checking user permissions in components
 * Uses the multi-role permission system where permissions are aggregated from all roles
 */
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
    return user?.roles?.some((r: UserRole) => r.role_key === roleKey) ?? false;
  };

  /**
   * Check if user has ANY of the specified roles
   */
  const hasAnyRole = (roleKeys: string[]): boolean => {
    if (!user?.roles) return false;
    return roleKeys.some(key => user.roles!.some((r: UserRole) => r.role_key === key));
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

// Convenience exports for common permission keys
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
