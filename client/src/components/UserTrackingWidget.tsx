import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Calendar, TrendingUp, BarChart3, Filter, Clock, Edit3, Save, X, UserPlus, Trash2, Plus, Eye } from 'lucide-react';
import { getUserTrackingStats, getUserTrackingDetails, updateUser, deleteUser, type UserTrackingStats, type UserTrackingDetails } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import AddUserModal from './AddUserModal';
import AdminRoundAdder from './AdminRoundAdder';
import { isAdmin, getAvailableRoles, getRoleBadgeColor, UserRole } from '../utils/roleUtils';

interface UserTrackingWidgetProps {
  className?: string;
}

const UserTrackingWidget: React.FC<UserTrackingWidgetProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserTrackingStats | null>(null);
  const [details, setDetails] = useState<UserTrackingDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState<number | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAdminRoundAdder, setShowAdminRoundAdder] = useState(false);

  // Available roles for editing (using centralized role utilities)
  const availableRoles = getAvailableRoles().map(r => r.value);

  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
    console.log('User object keys:', user ? Object.keys(user) : 'No user');

    // Check if user is loaded and has admin privileges (using centralized role check)
    if (user) {
      const userIsAdmin = isAdmin(user);
      console.log('Is admin?', userIsAdmin);

      if (userIsAdmin) {
        fetchStats();
      } else {
        console.log('User does not have admin privileges. Role:', user.role);
        setLoading(false);
      }
    } else {
      console.log('No user loaded yet');
    }
  }, [user]);



  const fetchStats = async () => {
    try {
      setLoading(true);
      console.log('Fetching user tracking stats...');
      const response = await getUserTrackingStats();
      console.log('User tracking stats response:', response);
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching user tracking stats:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to load user tracking statistics: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (selectedClub) params.club = selectedClub;

      const response = await getUserTrackingDetails(params);
      console.log('User tracking details response:', response.data);
      setDetails(response.data);
    } catch (error: any) {
      console.error('Error fetching user tracking details:', error);
      toast.error('Failed to load detailed user data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    setShowDetails(true);
    fetchDetails();
  };

  const handleEditRole = (userId: number, currentRole: string) => {
    console.log('Edit role clicked for user ID:', userId, 'current role:', currentRole);
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const handleSaveRole = async (userId: number) => {
    // Get the user's current name for the confirmation
    const user = details.find(u => u.member_id === userId);
    const userName = user ? `${user.first_name} ${user.last_name}` : 'User';
    
    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to change ${userName}'s role to "${editingRole}"?`)) {
      return;
    }
    
    setUpdatingRole(userId);
    
    try {
      if (!user) throw new Error('User not found');
      await updateUser(userId, {
        first_name: user.first_name,
        last_name: user.last_name,
        email_address: user.email_address,
        club: user.club,
        role: editingRole as UserRole
      });
      toast.success(`Role updated successfully for ${userName}`);
      
      // Update the local state
      setDetails(prevDetails => 
        prevDetails.map(user => 
          user.member_id === userId 
            ? { ...user, role: editingRole }
            : user
        )
      );
      
      setEditingUserId(null);
      setEditingRole('');
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(`Failed to update role: ${error.response?.data?.error || error.message}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole('');
  };

  // Handle user creation
  const handleUserAdded = async () => {
    try {
      // Refresh stats and details
      await fetchStats();
      if (showDetails) {
        await fetchDetails();
      }
      toast.success('User added successfully!');
    } catch (error: any) {
      toast.error('Error refreshing data after user creation');
    }
  };

  // Handle user deactivation
  const handleDeactivateUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${userName}? They will no longer be able to log in, but their data will be preserved.`)) {
      return;
    }

    try {
      await updateUser(userId, {
        first_name: userName.split(' ')[0],
        last_name: userName.split(' ')[1] || '',
        email_address: '', // Keep existing email
        club: '', // Keep existing club
        role: 'Deactivated'
      });
      toast.success('User deactivated successfully!');
      // Refresh stats and details
      await fetchStats();
      if (showDetails) {
        await fetchDetails();
      }
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      const errorMessage = error.response?.data?.error || 'Failed to deactivate user';
      toast.error(errorMessage);
    }
  };

  // Role badge color is now handled by centralized utility
  // const getRoleBadgeColor is imported from roleUtils


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getClaimRate = () => {
    if (!stats?.userStats) return 0;
    return ((parseInt(stats.userStats.claimed_accounts) / parseInt(stats.userStats.total_users)) * 100).toFixed(1);
  };

  if (loading && !stats) {
    return (
      <div className={`bg-white rounded-xl p-6 border border-neutral-200 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`bg-white rounded-xl p-6 border border-neutral-200 ${className}`}>
        <div className="text-center">
          <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-600 mb-2">Loading...</h3>
          <p className="text-neutral-500">Please wait while we load your user information.</p>
        </div>
      </div>
    );
  }

  // Check admin access using centralized role check
  if (!isAdmin(user)) {
    return (
      <div className={`bg-white rounded-xl p-6 border border-neutral-200 ${className}`}>
        <div className="text-center">
          <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-600 mb-2">Access Denied</h3>
          <p className="text-neutral-500">
            You need admin privileges to view user tracking statistics.
            <br />
            Current role: {user.role || 'No role assigned'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 border border-neutral-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-600">Track and manage user accounts across all clubs</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add New User
          </button>
          <button
            onClick={() => setShowAdminRoundAdder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rounds
          </button>
          <button
            onClick={handleViewDetails}
            className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Details
          </button>
        </div>
      </div>

      {!showDetails ? (
        // Overview Stats
        <div className="space-y-6">
          {/* User Account Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-800">{stats?.userStats.total_users || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Claimed Accounts</p>
                  <p className="text-2xl font-bold text-green-800">{stats?.userStats.claimed_accounts || 0}</p>
                  <p className="text-xs text-green-600">{getClaimRate()}% claim rate</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Unclaimed Accounts</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats?.userStats.unclaimed_accounts || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Recent Activity</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {stats?.recentRoundsByDay.reduce((sum, day) => sum + parseInt(day.rounds_count || '0'), 0) || 0}
                  </p>
                  <p className="text-xs text-purple-600">Last 7 days</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Recent Activity Chart */}
          <div className="bg-neutral-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-brand-black mb-4">Recent Rounds by Day</h4>
            <div className="space-y-2">
              {stats?.recentRoundsByDay.slice(0, 7).map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-neutral-500 mr-2" />
                    <span className="text-sm font-medium text-neutral-700">
                      {formatDate(day.date)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-neutral-600">
                      {day.sim_rounds} sim
                    </span>
                    <span className="text-sm text-neutral-600">
                      {day.grass_rounds} grass
                    </span>
                    <span className="text-sm font-semibold text-brand-black">
                      {day.rounds_count} total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Users */}
          {stats?.topUsers && stats.topUsers.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-brand-black mb-4">Top Active Users (Last 30 Days)</h4>
              <div className="space-y-2">
                {stats.topUsers.slice(0, 5).map((user, index) => (
                  <div key={`${user.first_name}-${user.last_name}`} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-neutral-500 mr-2">#{index + 1}</span>
                      <span className="text-sm font-medium text-neutral-700">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className="text-xs text-neutral-500 ml-2">({user.club})</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-black">
                      {user.rounds_count} rounds
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Club Statistics */}
          {stats?.clubStats && stats.clubStats.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-brand-black mb-4">Club Statistics</h4>
              <div className="space-y-3">
                {stats.clubStats.map((club) => (
                  <div key={club.club} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-neutral-700">{club.club}</span>
                      <div className="flex items-center space-x-4 text-xs text-neutral-500">
                        <span>{club.total_users} users</span>
                        <span>{club.claimed_accounts} claimed</span>
                        <span>{club.unclaimed_accounts} unclaimed</span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-brand-black">
                      {((parseInt(club.claimed_accounts) / parseInt(club.total_users)) * 100).toFixed(1)}% claimed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Detailed View
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 text-neutral-500 mr-2" />
              <h4 className="text-lg font-semibold text-brand-black">Filters</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Club</label>
                <select
                  value={selectedClub}
                  onChange={(e) => setSelectedClub(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="">All Clubs</option>
                  {stats?.clubStats.map((club) => (
                    <option key={club.club} value={club.club}>{club.club}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchDetails}
                  className="w-full px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-brand-black">
                User Details ({details.length} users)
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-neutral-600 text-white rounded-lg font-medium hover:bg-neutral-700 transition-colors"
                >
                  Back to Overview
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green mx-auto"></div>
                <p className="text-neutral-600 mt-2">Loading user details...</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-300 rounded-lg">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="border border-neutral-300 px-3 py-3 text-left font-medium text-sm w-[30%]">Name</th>
                      <th className="border border-neutral-300 px-3 py-3 text-left font-medium text-sm w-[10%]">Club</th>
                      <th className="border border-neutral-300 px-3 py-3 text-center font-medium text-sm w-[8%]">Scorecards</th>
                      <th className="border border-neutral-300 px-3 py-3 text-left font-medium text-sm w-[15%]">Role</th>
                      <th className="border border-neutral-300 px-3 py-3 text-left font-medium text-sm w-[10%]">Claimed</th>
                      <th className="border border-neutral-300 px-3 py-3 text-left font-medium text-sm w-[27%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((user) => {
                      console.log('Rendering user:', user.first_name, user.last_name, 'with role:', user.role);
                      console.log('Will render edit button for user:', user.first_name, user.last_name);
                      return (
                        <tr key={user.member_id} className="hover:bg-neutral-50">
                          <td className="border border-neutral-300 px-3 py-3">
                            <div>
                              <div className="font-medium text-sm">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-xs text-neutral-500 mt-1">
                                {user.email_address}
                              </div>
                            </div>
                          </td>
                          <td className="border border-neutral-300 px-3 py-3">
                            <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded font-medium">
                              {user.club}
                            </span>
                          </td>
                          <td className="border border-neutral-300 px-3 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {user.total_rounds || 0}
                              </span>
                              {(user.sim_rounds > 0 || user.grass_rounds > 0) && (
                                <div className="text-xs text-neutral-500 mt-1">
                                  {user.sim_rounds > 0 && `${user.sim_rounds} sim`}
                                  {user.sim_rounds > 0 && user.grass_rounds > 0 && ' • '}
                                  {user.grass_rounds > 0 && `${user.grass_rounds} grass`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="border border-neutral-300 px-3 py-3 text-neutral-600">
                            {editingUserId === user.member_id ? (
                              <div className="flex items-center space-x-2">
                                <select
                                  value={editingRole}
                                  onChange={(e) => setEditingRole(e.target.value)}
                                  className="w-full px-2 py-1 border border-neutral-300 rounded-md text-xs focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                                >
                                  {availableRoles.map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleSaveRole(user.member_id)}
                                  className="p-1 text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                                  title="Save Role"
                                  disabled={updatingRole === user.member_id}
                                >
                                  {updatingRole === user.member_id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                  ) : (
                                    <Save className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1 text-neutral-600 hover:text-neutral-800 transition-colors"
                                  title="Cancel Edit"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2 py-1 text-xs rounded font-medium ${getRoleBadgeColor(user.role)}`}>
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="border border-neutral-300 px-3 py-3">
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              user.has_claimed_account 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.has_claimed_account ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="border border-neutral-300 px-3 py-3 text-neutral-600">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => navigate(`/admin/users/${user.member_id}`)}
                                className="px-3 py-1 bg-green-600 text-white hover:bg-green-700 transition-colors rounded text-xs font-medium shadow-sm flex items-center"
                                title="View Profile"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Profile
                              </button>
                              <button
                                onClick={() => handleEditRole(user.member_id, user.role)}
                                className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded text-xs font-medium shadow-sm"
                                title="Edit Role"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeactivateUser(user.member_id, `${user.first_name} ${user.last_name}`)}
                                className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 transition-colors rounded text-xs font-medium shadow-sm"
                                title="Deactivate User"
                              >
                                Deactivate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={handleUserAdded}
      />

      {/* Admin Round Adder Modal */}
      {showAdminRoundAdder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Add Rounds for Users</h3>
                <button
                  onClick={() => setShowAdminRoundAdder(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <AdminRoundAdder
                onRoundsAdded={() => {
                  setShowAdminRoundAdder(false);
                  fetchStats(); // Refresh stats after adding rounds
                  toast.success('Scorecard added successfully');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTrackingWidget; 