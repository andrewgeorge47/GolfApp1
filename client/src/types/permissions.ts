/**
 * Permission System Types
 */

export interface Permission {
  id: number;
  permission_key: string;
  permission_name: string;
  description: string;
  category: string;
  created_at: string;
}

export interface Role {
  id: number;
  role_name: string;
  role_key: string;
  description: string;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  permission_count?: number;
  user_count?: number;
  permissions?: Permission[];
}

export interface RoleCreateRequest {
  role_name: string;
  role_key: string;
  description?: string;
  permissions?: number[];
}

export interface RoleUpdateRequest {
  role_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface PermissionsGrouped {
  [category: string]: Permission[];
}

export interface AuditLogEntry {
  id: number;
  action: string;
  created_at: string;
  role_name?: string;
  permission_name?: string;
  first_name?: string;
  last_name?: string;
  details: any;
}
