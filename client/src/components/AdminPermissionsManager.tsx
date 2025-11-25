import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Save, X, Lock, Users, CheckSquare, Square, AlertCircle, Search, Star, UserPlus } from 'lucide-react';
import { getRoles, getPermissions, createRole, updateRole, deleteRole, updateRolePermissions, getUsersWithRoles, assignUserRole, removeUserRole, setUserPrimaryRole } from '../services/api';
import type { UserWithRoles } from '../services/api';
import { toast } from 'react-toastify';
import type { Role, Permission } from '../types/permissions';
import { PageContainer, PageHeader, PageContent } from './ui/PageContainer';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from './ui/Table';
import { Card } from './ui/Card';
import { Tabs, TabPanel } from './ui/Tabs';

const AdminPermissionsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
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

  // User role management state
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [showUserRolesModal, setShowUserRolesModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState(false);

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
        // Add all permissions from this category (deduplicate with Set and convert back to array)
        const combined = prev.concat(categoryPermissionIds);
        return Array.from(new Set(combined));
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

  const getRoleBadgeColorByKey = (roleKey: string) => {
    if (roleKey === 'admin') return 'bg-red-100 text-red-800 border-red-200';
    if (roleKey === 'club_pro') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (roleKey === 'ambassador') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (roleKey === 'deactivated') return 'bg-gray-100 text-gray-500 border-gray-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  // User role management functions
  const loadUsers = async (search?: string) => {
    try {
      setUsersLoading(true);
      const response = await getUsersWithRoles(search);
      setUsers(response.data);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSearchUsers = () => {
    loadUsers(userSearch);
  };

  const openUserRolesModal = (user: UserWithRoles) => {
    setSelectedUser(user);
    setShowUserRolesModal(true);
  };

  const handleAssignRole = async (roleId: number) => {
    if (!selectedUser) return;

    try {
      setAssigningRole(true);
      const isPrimary = selectedUser.roles.length === 0;
      await assignUserRole(selectedUser.member_id, roleId, isPrimary);
      toast.success('Role assigned successfully');

      // Refresh user data
      const response = await getUsersWithRoles(userSearch);
      setUsers(response.data);
      const updatedUser = response.data.find(u => u.member_id === selectedUser.member_id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.response?.data?.error || 'Failed to assign role');
    } finally {
      setAssigningRole(false);
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    if (!selectedUser) return;

    if (!window.confirm('Are you sure you want to remove this role from the user?')) {
      return;
    }

    try {
      await removeUserRole(selectedUser.member_id, roleId);
      toast.success('Role removed successfully');

      // Refresh user data
      const response = await getUsersWithRoles(userSearch);
      setUsers(response.data);
      const updatedUser = response.data.find(u => u.member_id === selectedUser.member_id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error(error.response?.data?.error || 'Failed to remove role');
    }
  };

  const handleSetPrimaryRole = async (roleId: number) => {
    if (!selectedUser) return;

    try {
      await setUserPrimaryRole(selectedUser.member_id, roleId);
      toast.success('Primary role updated successfully');

      // Refresh user data
      const response = await getUsersWithRoles(userSearch);
      setUsers(response.data);
      const updatedUser = response.data.find(u => u.member_id === selectedUser.member_id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    } catch (error: any) {
      console.error('Error setting primary role:', error);
      toast.error(error.response?.data?.error || 'Failed to set primary role');
    }
  };

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      loadUsers();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Role & Permission Management"
        subtitle="Create roles, assign permissions, and manage user access"
        icon={<Shield className="w-7 h-7 text-blue-600" />}
        action={
          activeTab === 'roles' ? (
            <Button
              onClick={openCreateModal}
              variant="primary"
              size="sm"
              responsive
            >
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create Role</span>
              <span className="sm:hidden">Create</span>
            </Button>
          ) : undefined
        }
      />

      <PageContent>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('roles')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'roles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline-block mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Roles & Permissions</span>
              <span className="sm:hidden">Roles</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-1 sm:mr-2" />
              <span className="hidden sm:inline">User Role Assignments</span>
              <span className="sm:hidden">Users</span>
            </button>
          </nav>
        </div>

      {/* Roles Tab Content */}
      {activeTab === 'roles' && (
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
                    <div title="System Role" className="inline-flex">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
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
            <div className="flex gap-2">
              <Button
                onClick={() => openPermissionsModal(role)}
                variant="secondary"
                size="xs"
                responsive
                className="flex-1"
              >
                <Shield className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Permissions</span>
                <span className="sm:hidden">Perms</span>
              </Button>
              <Button
                onClick={() => openEditModal(role)}
                variant="ghost"
                size="xs"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              {!role.is_system_role && (
                <Button
                  onClick={() => handleDeleteRole(role)}
                  variant="danger"
                  size="xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1">
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                placeholder="Search by name or email..."
                icon={Search}
                iconPosition="left"
                fullWidth
              />
            </div>
            <Button
              onClick={handleSearchUsers}
              variant="primary"
              size="md"
              responsive
              className="w-full sm:w-auto"
            >
              Search
            </Button>
          </div>

          {/* Users List */}
          {usersLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Club
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.member_id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="font-medium text-gray-900 text-sm">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[120px] sm:max-w-none">{user.email_address}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {user.club || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-xs sm:text-sm text-gray-400 italic">No roles</span>
                          ) : (
                            user.roles.map((role) => (
                              <span
                                key={role.role_id}
                                className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium border ${getRoleBadgeColorByKey(role.role_key)}`}
                              >
                                {role.is_primary && <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 fill-current" />}
                                {role.role_name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openUserRolesModal(user)}
                          className="text-blue-600 hover:text-blue-900 flex items-center ml-auto min-h-[44px] px-2"
                        >
                          <UserPlus className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Manage</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 sm:px-6 py-8 text-center text-gray-500 text-sm">
                        {userSearch ? 'No users found' : 'Search for users to manage their roles'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} size="md">
        <ModalHeader>Create New Role</ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <Input
              label="Role Name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g., Tournament Director"
              required
              fullWidth
            />

            <Input
              label="Role Key"
              value={newRoleKey}
              onChange={(e) => setNewRoleKey(e.target.value)}
              placeholder="e.g., tournament_director"
              helperText="Unique identifier (lowercase, underscores allowed)"
              required
              fullWidth
            />

            <Textarea
              label="Description"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              placeholder="What can users with this role do?"
              rows={3}
              fullWidth
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowCreateModal(false)}
            size="sm"
            responsive
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateRole}
            size="sm"
            responsive
          >
            <Save className="w-4 h-4 mr-1" />
            Create
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Role Modal */}
      <Modal open={showEditModal && !!selectedRole} onClose={() => setShowEditModal(false)} size="md">
        <ModalHeader>Edit Role</ModalHeader>
        <ModalContent>
          {selectedRole?.is_system_role && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <strong>System Role:</strong> You can only edit the name and description.
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Role Name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              fullWidth
            />

            <Textarea
              label="Description"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              rows={3}
              fullWidth
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowEditModal(false)}
            size="sm"
            responsive
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateRole}
            size="sm"
            responsive
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </ModalFooter>
      </Modal>

      {/* Permissions Modal */}
      <Modal open={showPermissionsModal && !!selectedRole} onClose={() => setShowPermissionsModal(false)} size="lg">
        <ModalHeader>
          <div>
            <span className="block">Manage Permissions: {selectedRole?.role_name}</span>
            <span className="text-sm font-normal text-gray-600">
              {selectedPermissions.length} of {permissions.length} selected
            </span>
          </div>
        </ModalHeader>
        <ModalContent>

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
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowPermissionsModal(false)}
            size="sm"
            responsive
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdatePermissions}
            size="sm"
            responsive
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </ModalFooter>
      </Modal>

      {/* User Roles Modal */}
      <Modal open={showUserRolesModal && !!selectedUser} onClose={() => setShowUserRolesModal(false)} size="md">
        <ModalHeader>
          <div>
            <span className="block">Manage Roles: {selectedUser?.first_name} {selectedUser?.last_name}</span>
            <span className="text-sm font-normal text-gray-500">{selectedUser?.email_address}</span>
          </div>
        </ModalHeader>
        <ModalContent>
          {selectedUser && (
            <>
              {/* Current Roles */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Current Roles</h3>
                {selectedUser.roles.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No roles assigned</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.roles.map((role) => (
                      <div
                        key={role.role_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeColorByKey(role.role_key)}`}>
                            {role.role_name}
                          </span>
                          {role.is_primary && (
                            <span className="ml-2 text-xs text-yellow-600 flex items-center">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!role.is_primary && selectedUser.roles.length > 1 && (
                            <button
                              onClick={() => handleSetPrimaryRole(role.role_id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveRole(role.role_id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Role */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Add Role</h3>
                <div className="grid grid-cols-2 gap-2">
                  {roles
                    .filter(role => !selectedUser.roles.some(ur => ur.role_id === role.id))
                    .map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleAssignRole(role.id)}
                        disabled={assigningRole}
                        className={`p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                          assigningRole ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeColor(role)}`}>
                          {role.role_name}
                        </span>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{role.description}</p>
                        )}
                      </button>
                    ))}
                </div>
                {roles.filter(role => !selectedUser.roles.some(ur => ur.role_id === role.id)).length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">
                    User has all available roles assigned
                  </p>
                )}
              </div>
            </>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowUserRolesModal(false)}
            size="sm"
            responsive
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
      </PageContent>
    </PageContainer>
  );
};

export default AdminPermissionsManager;
