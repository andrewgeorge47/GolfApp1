import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Save, X, Lock, Users, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { getRoles, getPermissions, createRole, updateRole, deleteRole, updateRolePermissions } from '../services/api';
import { toast } from 'react-toastify';
import type { Role, Permission } from '../types/permissions';

const AdminPermissionsManager: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<{ [category: string]: Permission[] }>({});
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Form state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        getRoles(),
        getPermissions()
      ]);

      setRoles(rolesRes.data);
      setPermissions(permsRes.data.permissions);
      setGroupedPermissions(permsRes.data.grouped);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName || !newRoleKey) {
      toast.error('Role name and key are required');
      return;
    }

    try {
      await createRole({
        role_name: newRoleName,
        role_key: newRoleKey,
        description: newRoleDescription,
        permissions: selectedPermissions
      });

      toast.success('Role created successfully');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error(error.response?.data?.error || 'Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      await updateRole(selectedRole.id, {
        role_name: newRoleName,
        description: newRoleDescription
      });

      toast.success('Role updated successfully');
      setShowEditModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system_role) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the role "${role.role_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteRole(role.id);
      toast.success('Role deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;

    try {
      await updateRolePermissions(selectedRole.id, selectedPermissions);
      toast.success('Permissions updated successfully');
      setShowPermissionsModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast.error(error.response?.data?.error || 'Failed to update permissions');
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setNewRoleName(role.role_name);
    setNewRoleDescription(role.description || '');
    setShowEditModal(true);
  };

  const openPermissionsModal = (role: Role) => {
    setSelectedRole(role);
    // Get current permissions for this role
    const rolePermissionIds = role.permissions?.map(p => p.id) || [];
    setSelectedPermissions(rolePermissionIds);
    setShowPermissionsModal(true);
  };

  const resetForm = () => {
    setNewRoleName('');
    setNewRoleKey('');
    setNewRoleDescription('');
    setSelectedPermissions([]);
    setSelectedRole(null);
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleAllInCategory = (category: string, checked: boolean) => {
    const categoryPermissionIds = groupedPermissions[category]?.map(p => p.id) || [];

    setSelectedPermissions(prev => {
      if (checked) {
        // Add all permissions from this category
        return [...new Set([...prev, ...categoryPermissionIds])];
      } else {
        // Remove all permissions from this category
        return prev.filter(id => !categoryPermissionIds.includes(id));
      }
    });
  };

  const getRoleBadgeColor = (role: Role) => {
    if (role.role_key === 'admin') return 'bg-red-100 text-red-800 border-red-200';
    if (role.role_key === 'club_pro') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (role.role_key === 'ambassador') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (role.role_key === 'deactivated') return 'bg-gray-100 text-gray-500 border-gray-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-7 h-7 mr-3 text-blue-600" />
            Role & Permission Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Create roles, assign permissions, and manage access control
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </button>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            {/* Role Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(role)}`}>
                    {role.role_name}
                  </span>
                  {role.is_system_role && (
                    <Lock className="w-4 h-4 text-gray-400" title="System Role" />
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {role.description || 'No description'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
              <div className="flex items-center">
                <Shield className="w-3.5 h-3.5 mr-1" />
                {role.permission_count || 0} permissions
              </div>
              <div className="flex items-center">
                <Users className="w-3.5 h-3.5 mr-1" />
                {role.user_count || 0} users
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => openPermissionsModal(role)}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Permissions
              </button>
              <button
                onClick={() => openEditModal(role)}
                className="px-3 py-2 bg-gray-50 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              {!role.is_system_role && (
                <button
                  onClick={() => handleDeleteRole(role)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Create New Role</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g., Tournament Director"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Key *
                  </label>
                  <input
                    type="text"
                    value={newRoleKey}
                    onChange={(e) => setNewRoleKey(e.target.value)}
                    placeholder="e.g., tournament_director"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier (lowercase, underscores allowed)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="What can users with this role do?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit Role</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedRole.is_system_role && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>System Role:</strong> You can only edit the name and description. The role key cannot be changed.
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Manage Permissions: {selectedRole.role_name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedPermissions.length} of {permissions.length} permissions selected
                  </p>
                </div>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Permissions by Category */}
              <div className="space-y-6">
                {Object.keys(groupedPermissions).sort().map((category) => {
                  const categoryPerms = groupedPermissions[category];
                  const allSelected = categoryPerms.every(p => selectedPermissions.includes(p.id));
                  const someSelected = categoryPerms.some(p => selectedPermissions.includes(p.id)) && !allSelected;

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      {/* Category Header */}
                      <div className="flex items-center mb-3 pb-3 border-b border-gray-200">
                        <button
                          onClick={() => toggleAllInCategory(category, !allSelected)}
                          className="flex items-center space-x-2 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                        >
                          {allSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : someSelected ? (
                            <div className="w-5 h-5 bg-blue-100 border-2 border-blue-600 rounded flex items-center justify-center">
                              <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
                            </div>
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-sm font-semibold text-gray-900 capitalize">
                            {category}
                          </span>
                        </button>
                      </div>

                      {/* Permissions in Category */}
                      <div className="space-y-2">
                        {categoryPerms.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {permission.permission_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePermissions}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPermissionsManager;
