import React, { useState, useEffect } from 'react';
import { User, Role, getRoles, getUserRoles, assignRole, removeRole } from '../services/api';
import { Plus, X, Shield, Users, Settings, User as UserIcon } from 'lucide-react';
import { toast } from 'react-toastify';

interface RoleManagementProps {
  user: User;
  onRoleUpdate?: () => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ user, onRoleUpdate }) => {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState<number | null>(null);
  const [removingRole, setRemovingRole] = useState<number | null>(null);

  useEffect(() => {
    loadRoles();
  }, [user.member_id]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const [rolesData, userRolesData] = await Promise.all([
        getRoles(),
        getUserRoles(user.member_id)
      ]);
      setAvailableRoles(rolesData.data);
      setUserRoles(userRolesData.data);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (roleId: number) => {
    try {
      setAssigningRole(roleId);
      await assignRole(user.member_id, roleId);
      toast.success('Role assigned successfully');
      await loadRoles();
      onRoleUpdate?.();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.response?.data?.error || 'Failed to assign role');
    } finally {
      setAssigningRole(null);
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    try {
      setRemovingRole(roleId);
      await removeRole(user.member_id, roleId);
      toast.success('Role removed successfully');
      await loadRoles();
      onRoleUpdate?.();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error(error.response?.data?.error || 'Failed to remove role');
    } finally {
      setRemovingRole(null);
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'club pro':
        return <Settings className="w-4 h-4" />;
      case 'ambassador':
        return <Users className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'club pro':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ambassador':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  const assignedRoleIds = userRoles.map(role => role.id);
  const availableRolesToAssign = availableRoles.filter(role => !assignedRoleIds.includes(role.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Role Management</h3>
        <span className="text-sm text-gray-500">
          {user.first_name} {user.last_name}
        </span>
      </div>

      {/* Current Roles */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Roles</h4>
        {userRoles.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No roles assigned</p>
        ) : (
          <div className="space-y-2">
            {userRoles.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getRoleIcon(role.name)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(role.name)}`}>
                    {role.name}
                  </span>
                  <span className="text-xs text-gray-500">{role.description}</span>
                </div>
                <button
                  onClick={() => handleRemoveRole(role.id)}
                  disabled={removingRole === role.id}
                  className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                  title="Remove Role"
                >
                  {removingRole === role.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Roles to Assign */}
      {availableRolesToAssign.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Available Roles</h4>
          <div className="space-y-2">
            {availableRolesToAssign.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getRoleIcon(role.name)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(role.name)}`}>
                    {role.name}
                  </span>
                  <span className="text-xs text-gray-500">{role.description}</span>
                </div>
                <button
                  onClick={() => handleAssignRole(role.id)}
                  disabled={assigningRole === role.id}
                  className="text-brand-neon-green hover:text-green-700 transition-colors disabled:opacity-50"
                  title="Assign Role"
                >
                  {assigningRole === role.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-neon-green"></div>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Summary */}
      {userRoles.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(
                userRoles.reduce((permissions, role) => {
                  Object.entries(role.permissions).forEach(([key, value]) => {
                    if (value) permissions[key] = true;
                  });
                  return permissions;
                }, {} as Record<string, boolean>)
              ).map(([permission, enabled]) => (
                <div key={permission} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-gray-600 capitalize">
                    {permission.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement; 