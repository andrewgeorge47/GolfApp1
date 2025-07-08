import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Calendar, TrendingUp, BarChart3, Filter, Clock } from 'lucide-react';
import { getUserTrackingStats, getUserTrackingDetails, type UserTrackingStats, type UserTrackingDetails } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';

interface UserTrackingWidgetProps {
  className?: string;
}

const UserTrackingWidget: React.FC<UserTrackingWidgetProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserTrackingStats | null>(null);
  const [details, setDetails] = useState<UserTrackingDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedClub, setSelectedClub] = useState<string>('');

  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
    console.log('User object keys:', user ? Object.keys(user) : 'No user');
    
    // Check if user is loaded and has admin privileges
    if (user) {
      // Check for both possible role formats
      const isAdmin = user.role === 'admin' || user.role === 'super_admin' || 
                     user.role === 'Admin' || user.role === 'Super Admin';
      console.log('Is admin?', isAdmin);
      
      if (isAdmin) {
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

  if (user.role !== 'admin' && user.role !== 'super_admin' && 
      user.role !== 'Admin' && user.role !== 'Super Admin') {
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
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center space-x-2">
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
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-neutral-600 text-white rounded-lg font-medium hover:bg-neutral-700 transition-colors"
              >
                Back to Overview
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green mx-auto"></div>
                <p className="text-neutral-600 mt-2">Loading user details...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Name</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Email</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Club</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Role</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Claimed</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Total Rounds</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Sim</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Grass</th>
                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Last Round</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((user) => (
                      <tr key={user.member_id} className="hover:bg-neutral-50">
                        <td className="border border-neutral-300 px-4 py-3 font-medium">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                          {user.email_address}
                        </td>
                        <td className="border border-neutral-300 px-4 py-3">
                          <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-sm rounded">
                            {user.club}
                          </span>
                        </td>
                        <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                          {user.role}
                        </td>
                        <td className="border border-neutral-300 px-4 py-3">
                          <span className={`px-2 py-1 text-sm rounded ${
                            user.has_claimed_account 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.has_claimed_account ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="border border-neutral-300 px-4 py-3 font-medium">
                          {user.total_rounds}
                        </td>
                        <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                          {user.sim_rounds}
                        </td>
                        <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                          {user.grass_rounds}
                        </td>
                        <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                          {user.last_round_date ? formatDate(user.last_round_date) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTrackingWidget; 