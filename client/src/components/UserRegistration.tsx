import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Search, MapPin } from 'lucide-react';
import { getUsers, registerUserForTournament, unregisterUserFromTournament } from '../services/api';
import type { User } from '../services/api';
import { toast } from 'react-toastify';

interface UserRegistrationProps {
  tournamentId: number;
  tournamentParticipants: any[];
  onUserRegistered: () => void;
  onUserUnregistered: () => void;
  clubRestriction?: string;
  isSuperAdmin?: boolean;
  currentUserClub?: string;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({
  tournamentId,
  tournamentParticipants,
  onUserRegistered,
  onUserUnregistered,
  clubRestriction = 'open',
  isSuperAdmin = false,
  currentUserClub
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [registrationClubFilter, setRegistrationClubFilter] = useState<string | null>(null);
  const [selectedRegistrationUserIds, setSelectedRegistrationUserIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleRegisterUsers = async (userIds: number[]) => {
    try {
      await Promise.all(
        userIds.map(userId => registerUserForTournament(tournamentId, userId))
      );
      toast.success(`Successfully registered ${userIds.length} user(s)`);
      setSelectedRegistrationUserIds([]);
      onUserRegistered();
    } catch (error) {
      console.error('Error registering users:', error);
      toast.error('Failed to register users');
    }
  };

  const handleUnregisterUser = async (userId: number) => {
    try {
      await unregisterUserFromTournament(tournamentId, userId);
      toast.success('User unregistered successfully');
      onUserUnregistered();
    } catch (error) {
      console.error('Error unregistering user:', error);
      toast.error('Failed to unregister user');
    }
  };

  const getAllClubs = () => {
    const clubs = new Set(users.map(user => user.club).filter(Boolean));
    return Array.from(clubs).sort();
  };

  const getTotalUsersInClub = (club: string) => {
    return users.filter(user => user.club === club).length;
  };

  const getRegisteredUsersInClub = (club: string) => {
    return tournamentParticipants.filter(p => p.club === club).length;
  };

  const getAvailableUsers = () => {
    const registeredUserIds = new Set(tournamentParticipants.map(p => p.user_member_id));
    return users.filter(user => !registeredUserIds.has(user.member_id));
  };

  const getAvailableUsersFiltered = () => {
    let availableUsers = getAvailableUsers();

    // Apply club filter
    if (registrationClubFilter) {
      availableUsers = availableUsers.filter(user => user.club === registrationClubFilter);
    }

    // Apply search filter
    if (registrationSearch) {
      const searchLower = registrationSearch.toLowerCase();
      availableUsers = availableUsers.filter(user =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.club?.toLowerCase().includes(searchLower)
      );
    }

    // Apply club restrictions
    if (clubRestriction !== 'open') {
      if (clubRestriction === 'club_specific') {
        // This would need to be handled by the parent component
        availableUsers = availableUsers.filter(user => user.club === currentUserClub);
      } else {
        availableUsers = availableUsers.filter(user => user.club === clubRestriction);
      }
    }

    return availableUsers;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Registration Overview */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-brand-black">Registration Management</h4>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">
              {tournamentParticipants.length} registered
            </span>
          </div>
        </div>
        
        {/* Club Restriction Info */}
        {clubRestriction && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                Registration Access: {
                  clubRestriction === 'open' 
                    ? 'Open to All Clubs' 
                    : `Restricted to ${clubRestriction}`
                }
              </span>
            </div>
            {!isSuperAdmin && clubRestriction !== 'open' && (
              <p className="text-xs text-blue-600 mt-1">
                As a club admin, you can only manage users from your club for this tournament.
              </p>
            )}
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              setRegistrationClubFilter(null);
              setRegistrationSearch('');
            }}
            className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
          >
            <Users className="w-4 h-4 mr-2" />
            View All Users
          </button>
          <button
            onClick={() => {
              const availableUsers = getAvailableUsers();
              if (availableUsers.length > 0) {
                handleRegisterUsers(availableUsers.map(u => u.member_id));
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
            disabled={getAvailableUsers().length === 0}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register All Available
          </button>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={registrationSearch}
                onChange={e => setRegistrationSearch(e.target.value)}
                placeholder="Search by name, email, or club..."
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Filter by Club</label>
            <select
              value={registrationClubFilter || ''}
              onChange={e => setRegistrationClubFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="">All Clubs</option>
              {(() => {
                const clubs = getAllClubs();
                // Filter clubs based on tournament restrictions and user role
                const availableClubs = clubs.filter(club => {
                  if (clubRestriction === 'open') {
                    return true; // Show all clubs for open tournaments
                  }
                  if (clubRestriction === club) {
                    return true; // Show the specific club
                  }
                  if (!isSuperAdmin && club === currentUserClub) {
                    return true; // Club admins can see their club
                  }
                  return false;
                });
                return availableClubs.map(club => (
                  <option key={club} value={club}>{club}</option>
                ));
              })()}
            </select>
          </div>
        </div>

        {/* Club Registration Progress */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-neutral-700 mb-3">Club Registration Progress</h5>
          <div className="flex flex-wrap gap-3">
            <div
              onClick={() => setRegistrationClubFilter(null)}
              className={`cursor-pointer flex flex-col items-center px-4 py-3 rounded-lg border transition-all ${
                registrationClubFilter === null 
                  ? 'bg-brand-neon-green/80 border-brand-neon-green text-brand-black shadow-md' 
                  : 'bg-neutral-50 border-neutral-300 text-neutral-700 hover:bg-brand-neon-green/30 hover:border-brand-neon-green'
              }`}
              style={{ minWidth: 120 }}
            >
              <span className="font-medium">All Clubs</span>
              <div className="text-sm text-neutral-600 mt-1">
                {tournamentParticipants.length} / {users.length}
              </div>
            </div>
            {getAllClubs().map(club => {
              const total = getTotalUsersInClub(club);
              const registered = getRegisteredUsersInClub(club);
              const percent = total > 0 ? Math.round((registered / total) * 100) : 0;
              return (
                <div
                  key={club}
                  onClick={() => setRegistrationClubFilter(club)}
                  className={`cursor-pointer flex flex-col items-center px-4 py-3 rounded-lg border transition-all ${
                    registrationClubFilter === club 
                      ? 'bg-brand-neon-green/80 border-brand-neon-green text-brand-black shadow-md' 
                      : 'bg-neutral-50 border-neutral-300 text-neutral-700 hover:bg-brand-neon-green/30 hover:border-brand-neon-green'
                  }`}
                  style={{ minWidth: 120 }}
                >
                  <span className="font-medium">{club}</span>
                  <div className="w-full h-2 bg-neutral-200 rounded mt-2 mb-1">
                    <div
                      className="h-2 rounded transition-all duration-300"
                      style={{ 
                        width: `${percent}%`, 
                        background: percent === 100 ? '#22c55e' : '#4ade80' 
                      }}
                    />
                  </div>
                  <div className="text-sm text-neutral-600">
                    {registered}/{total} ({percent}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-neutral-300 rounded-lg">
            <thead className="bg-neutral-50">
              <tr>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">
                  <input
                    type="checkbox"
                    checked={getAvailableUsersFiltered().length > 0 && selectedRegistrationUserIds.length === getAvailableUsersFiltered().length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedRegistrationUserIds(getAvailableUsersFiltered().map(u => u.member_id));
                      } else {
                        setSelectedRegistrationUserIds([]);
                      }
                    }}
                  />
                </th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Name</th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Email</th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Club</th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Handicap</th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getAvailableUsersFiltered().map(user => (
                <tr key={user.member_id} className="hover:bg-neutral-50">
                  <td className="border border-neutral-300 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRegistrationUserIds.includes(user.member_id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedRegistrationUserIds(prev => [...prev, user.member_id]);
                        } else {
                          setSelectedRegistrationUserIds(prev => prev.filter(id => id !== user.member_id));
                        }
                      }}
                    />
                  </td>
                  <td className="border border-neutral-300 px-4 py-3 font-medium">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                    {user.email}
                  </td>
                  <td className="border border-neutral-300 px-4 py-3">
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-sm rounded">
                      {user.club}
                    </span>
                  </td>
                  <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                    {user.handicap ? user.handicap : 'N/A'}
                  </td>
                  <td className="border border-neutral-300 px-4 py-3">
                    <button
                      onClick={() => handleRegisterUsers([user.member_id])}
                      className="px-3 py-1 bg-brand-neon-green text-brand-black text-sm rounded hover:bg-green-400 transition-colors"
                    >
                      Register
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {getAvailableUsersFiltered().length === 0 && (
          <div className="text-center py-8 text-neutral-600">
            <Users className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
            <p>No available users found.</p>
            <p className="text-sm">Try adjusting your search or club filter.</p>
          </div>
        )}
        
        {selectedRegistrationUserIds.length > 0 && (
          <div className="flex justify-end mt-4">
            <button
              onClick={() => handleRegisterUsers(selectedRegistrationUserIds)}
              className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Register {selectedRegistrationUserIds.length} Selected
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRegistration; 