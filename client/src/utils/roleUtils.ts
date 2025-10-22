/**
 * Role Utilities - Centralized role checking and validation
 *
 * This file provides consistent role checking across the application.
 * All role comparisons should use these utilities to ensure consistency.
 */

// Valid roles in the system
export enum UserRole {
  MEMBER = 'Member',
  ADMIN = 'Admin',
  CLUB_PRO = 'Club Pro',
  AMBASSADOR = 'Ambassador',
  DEACTIVATED = 'Deactivated'
}

// Legacy role names that should be normalized
const ROLE_ALIASES: Record<string, UserRole> = {
  'admin': UserRole.ADMIN,
  'super admin': UserRole.ADMIN,
  'super_admin': UserRole.ADMIN,
  'clubpro': UserRole.CLUB_PRO,
  'club pro': UserRole.CLUB_PRO,
  'member': UserRole.MEMBER,
  'ambassador': UserRole.AMBASSADOR,
  'deactivated': UserRole.DEACTIVATED
};

/**
 * Normalize a role string to the canonical format
 */
export function normalizeRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;

  const normalized = role.trim().toLowerCase();
  return ROLE_ALIASES[normalized] || null;
}

/**
 * Check if user has admin privileges
 * Note: This checks for admin role only, not super admin override
 */
export function isAdmin(user: any): boolean {
  if (!user || !user.role) return false;
  const normalized = normalizeRole(user.role);
  return normalized === UserRole.ADMIN;
}

/**
 * Check if user has club pro privileges
 */
export function isClubPro(user: any): boolean {
  if (!user || !user.role) return false;
  const normalized = normalizeRole(user.role);
  return normalized === UserRole.CLUB_PRO;
}

/**
 * Check if user has ambassador privileges
 */
export function isAmbassador(user: any): boolean {
  if (!user || !user.role) return false;
  const normalized = normalizeRole(user.role);
  return normalized === UserRole.AMBASSADOR;
}

/**
 * Check if user account is deactivated
 */
export function isDeactivated(user: any): boolean {
  if (!user || !user.role) return false;
  const normalized = normalizeRole(user.role);
  return normalized === UserRole.DEACTIVATED;
}

/**
 * Check if user is a regular member
 */
export function isMember(user: any): boolean {
  if (!user || !user.role) return false;
  const normalized = normalizeRole(user.role);
  return normalized === UserRole.MEMBER;
}

/**
 * Check if user has admin OR club pro privileges
 */
export function isAdminOrClubPro(user: any): boolean {
  return isAdmin(user) || isClubPro(user);
}

/**
 * Check if user can edit courses (Admin, Club Pro, or Ambassador)
 */
export function canEditCourses(user: any): boolean {
  return isAdmin(user) || isClubPro(user) || isAmbassador(user);
}

/**
 * Get a list of all valid roles for dropdowns/selection
 */
export function getAvailableRoles(): Array<{ value: UserRole; label: string }> {
  return [
    { value: UserRole.MEMBER, label: 'Member' },
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.CLUB_PRO, label: 'Club Pro' },
    { value: UserRole.AMBASSADOR, label: 'Ambassador' },
    { value: UserRole.DEACTIVATED, label: 'Deactivated' }
  ];
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: string | null | undefined): string {
  if (!role) return 'No Role';
  const normalized = normalizeRole(role);
  return normalized || role;
}

/**
 * Get badge color class for a role (for UI styling)
 */
export function getRoleBadgeColor(role: string | null | undefined): string {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case UserRole.ADMIN:
      return 'bg-red-100 text-red-800';
    case UserRole.AMBASSADOR:
      return 'bg-purple-100 text-purple-800';
    case UserRole.CLUB_PRO:
      return 'bg-blue-100 text-blue-800';
    case UserRole.DEACTIVATED:
      return 'bg-gray-100 text-gray-500';
    case UserRole.MEMBER:
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
}

/**
 * Validate if a role string is valid
 */
export function isValidRole(role: string): boolean {
  return normalizeRole(role) !== null;
}
