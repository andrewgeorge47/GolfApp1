import { User } from '../services/api';

// Helper function to check if user has a specific role (supports both old and new systems)
export const hasRole = (user: User, roleName: string): boolean => {
  // Check new multiple roles system first
  if (user.roles?.some(role => role.name === roleName)) {
    return true;
  }
  
  // Fall back to old single role system
  return user.role === roleName;
};

// Helper function to check if user has any of the specified roles
export const hasAnyRole = (user: User, roleNames: string[]): boolean => {
  // Check new multiple roles system first
  if (user.roles?.some(role => roleNames.includes(role.name))) {
    return true;
  }
  
  // Fall back to old single role system
  return roleNames.includes(user.role);
};

// Helper function to check if user has a specific permission
export const hasPermission = (user: User, permission: string): boolean => {
  // Check new permissions system
  if (user.roles?.some(role => role.permissions[permission])) {
    return true;
  }
  
  // Fall back to old role-based permissions
  const adminRoles = ['Admin', 'admin', 'super_admin', 'Super Admin'];
  if (permission === 'manage_users' && adminRoles.includes(user.role)) {
    return true;
  }
  
  if (permission === 'manage_tournaments' && 
      (adminRoles.includes(user.role) || user.role === 'Club Pro')) {
    return true;
  }
  
  if (permission === 'view_admin_dashboard' && 
      (adminRoles.includes(user.role) || user.role === 'Club Pro')) {
    return true;
  }
  
  return false;
};

// Helper function to get all roles for a user
export const getUserRoles = (user: User): string[] => {
  const roles: string[] = [];
  
  // Add roles from new system
  if (user.roles) {
    roles.push(...user.roles.map(role => role.name));
  }
  
  // Add role from old system (if not already included)
  if (user.role && !roles.includes(user.role)) {
    roles.push(user.role);
  }
  
  return roles;
};

// Helper function to check if user is admin (supports multiple admin roles)
export const isAdmin = (user: User): boolean => {
  // Check for actual admin roles
  if (hasAnyRole(user, ['Admin', 'admin', 'super_admin', 'Super Admin'])) {
    return true;
  }
  
  // Check for roles that have admin permissions
  if (hasPermission(user, 'view_admin_dashboard')) {
    return true;
  }
  
  return false;
}; 