import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, CheckCircle, Clock } from 'lucide-react';
import { 
  createTournament,
  getTournaments,
  updateTournament,
  deleteTournament,
  getTournamentParticipants,
  registerUserForTournament,
  unregisterUserFromTournament,
  getTournamentCheckIns,
  checkInUser,
  checkOutUser,
  getTournamentStats,
  getTournamentMatches,
  generateTournamentMatches,
  updateTournamentMatch,
  getUsers
} from '../services/api';
import type { User } from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TournamentList from './TournamentList';
import TournamentDetails from './TournamentDetails';
import ParticipantsTable from './ParticipantsTable';
import MatchesTable from './MatchesTable';

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tournament form state
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    notes: '',
    type: 'tournament'
  });

  // Tournament state
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [showEditTournamentForm, setShowEditTournamentForm] = useState(false);
  const [editTournamentForm, setEditTournamentForm] = useState<any>(null);

  // Tournament management state
  const [tournamentParticipants, setTournamentParticipants] = useState<any[]>([]);
  const [tournamentCheckIns, setTournamentCheckIns] = useState<any[]>([]);
  const [tournamentStats, setTournamentStats] = useState<any>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedUserForCheckIn, setSelectedUserForCheckIn] = useState<any | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');

  // Tournament matches state
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [showMatchGenerationModal, setShowMatchGenerationModal] = useState(false);
  const [matchGenerationForm, setMatchGenerationForm] = useState({
    format: 'optimized',
    minMatchesPerPlayer: 3
  });

  // Add state for multi-select registration
  const [selectedRegistrationUserIds, setSelectedRegistrationUserIds] = useState<number[]>([]);

  // Add state for multi-select check-in
  const [selectedCheckInUserIds, setSelectedCheckInUserIds] = useState<number[]>([]);

  // Add tab state
  const [activeTab, setActiveTab] = useState<'registration' | 'checkin' | 'matches'>('registration');

  // Add state for registration search
  const [registrationSearch, setRegistrationSearch] = useState('');

  // Add state for club filter
  const [registrationClubFilter, setRegistrationClubFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData] = await Promise.all([
          getUsers()
        ]);

        setUsers(usersData.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await getTournaments();
        setTournaments(res.data);
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchTournaments();
  }, []);

  // Load tournament data when selected
  useEffect(() => {
    if (selectedTournament) {
      const loadTournamentData = async () => {
        try {
          const [participantsRes, checkInsRes, statsRes, matchesRes] = await Promise.all([
            getTournamentParticipants(selectedTournament.id),
            getTournamentCheckIns(selectedTournament.id),
            getTournamentStats(selectedTournament.id),
            getTournamentMatches(selectedTournament.id)
          ]);
          
          setTournamentParticipants(participantsRes.data);
          setTournamentCheckIns(checkInsRes.data);
          setTournamentStats(statsRes.data);
          setTournamentMatches(matchesRes.data);
        } catch (error) {
          console.error('Error loading tournament data:', error);
        }
      };
      
      loadTournamentData();
    }
  }, [selectedTournament]);

  const handleTournamentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTournament(tournamentForm);
      setShowTournamentForm(false);
      setTournamentForm({ name: '', start_date: '', end_date: '', notes: '', type: 'tournament' });
      toast.success('Tournament created successfully!');
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data);
    } catch (error) {
      toast.error('Error creating tournament.');
    }
  };

  const handleEditTournament = (t: any) => {
    setEditTournamentForm({ ...t });
    setShowEditTournamentForm(true);
  };

  const handleUpdateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTournament(editTournamentForm.id, editTournamentForm);
      setShowEditTournamentForm(false);
      setEditTournamentForm(null);
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data);
      toast.success('Tournament updated successfully!');
    } catch (error) {
      toast.error('Error updating tournament.');
    }
  };

  const handleDeleteTournament = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await deleteTournament(id);
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data);
      toast.success('Tournament deleted successfully!');
      if (selectedTournament && selectedTournament.id === id) setSelectedTournament(null);
    } catch (error) {
      toast.error('Error deleting tournament.');
    }
  };

  // Tournament registration functions
  const handleRegisterUsers = async (userIds: number[]) => {
    if (!selectedTournament) return;
    try {
      await Promise.all(userIds.map(userId => registerUserForTournament(selectedTournament.id, userId)));
      // Refresh tournament data
      const [participantsRes, statsRes] = await Promise.all([
        getTournamentParticipants(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      setTournamentParticipants(participantsRes.data);
      setTournamentStats(statsRes.data);
      setShowRegistrationModal(false);
      setSelectedRegistrationUserIds([]);
      toast.success('Users registered successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error registering users');
    }
  };

  const handleUnregisterUser = async (userId: number) => {
    if (!selectedTournament) return;
    
    if (!window.confirm('Are you sure you want to unregister this user?')) return;
    
    try {
      await unregisterUserFromTournament(selectedTournament.id, userId);
      
      // Refresh tournament data
      const [participantsRes, statsRes] = await Promise.all([
        getTournamentParticipants(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      
      setTournamentParticipants(participantsRes.data);
      setTournamentStats(statsRes.data);
      
      alert('User unregistered successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error unregistering user');
    }
  };

  // Tournament check-in functions
  const handleCheckInUsers = async (userIds: number[]) => {
    if (!selectedTournament) return;
    try {
      await Promise.all(userIds.map(userId => checkInUser(selectedTournament.id, userId, checkInNotes)));
      // Refresh tournament data
      const [checkInsRes, statsRes] = await Promise.all([
        getTournamentCheckIns(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      setTournamentCheckIns(checkInsRes.data);
      setTournamentStats(statsRes.data);
      setShowCheckInModal(false);
      setSelectedCheckInUserIds([]);
      setCheckInNotes('');
      toast.success('Users checked in successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error checking in users');
    }
  };

  const handleCheckOutUser = async (userId: number) => {
    if (!selectedTournament) return;
    
    if (!window.confirm('Are you sure you want to check out this user?')) return;
    
    try {
      await checkOutUser(selectedTournament.id, userId);
      
      // Refresh tournament data
      const [checkInsRes, statsRes] = await Promise.all([
        getTournamentCheckIns(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      
      setTournamentCheckIns(checkInsRes.data);
      setTournamentStats(statsRes.data);
      
      alert('User checked out successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error checking out user');
    }
  };

  // Get available users for registration (not already registered)
  const getAvailableUsers = () => {
    const registeredUserIds = tournamentParticipants.map(p => p.user_member_id);
    return users.filter(user => !registeredUserIds.includes(user.member_id));
  };

  // Get registered users not checked in
  const getRegisteredNotCheckedIn = () => {
    const checkedInUserIds = tournamentCheckIns.map(c => c.user_member_id);
    return tournamentParticipants.filter(p => !checkedInUserIds.includes(p.user_member_id));
  };

  // Match generation functions
  const handleGenerateMatches = async () => {
    if (!selectedTournament) return;
    
    try {
      const response = await generateTournamentMatches(
        selectedTournament.id, 
        matchGenerationForm.format, 
        matchGenerationForm.minMatchesPerPlayer
      );
      
      // Refresh tournament data
      const [matchesRes, statsRes] = await Promise.all([
        getTournamentMatches(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      
      setTournamentMatches(matchesRes.data);
      setTournamentStats(statsRes.data);
      setShowMatchGenerationModal(false);
      
      alert(response.data.message || 'Matches generated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error generating matches');
    }
  };

  const handleUpdateMatchResult = async (matchId: number, winnerId: number, scores?: any) => {
    if (!selectedTournament) return;
    
    try {
      await updateTournamentMatch(selectedTournament.id, matchId, {
        winner_id: winnerId,
        scores: scores || {},
        status: 'completed'
      });
      
      // Refresh matches
      const matchesRes = await getTournamentMatches(selectedTournament.id);
      setTournamentMatches(matchesRes.data);
      
      alert('Match result updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating match result');
    }
  };

  // Get checked-in players count for match generation
  const getCheckedInPlayersCount = () => {
    return tournamentCheckIns.filter(c => c.status === 'checked_in').length;
  };

  // Build statsByTournamentId for TournamentList
  const statsByTournamentId = tournaments.reduce((acc, t) => {
    if (t.id && selectedTournament && t.id === selectedTournament.id && tournamentStats) {
      acc[t.id] = tournamentStats;
    }
    return acc;
  }, {} as Record<string, any>);

  // Helper to get all clubs from all users
  function getAllClubs() {
    return Array.from(new Set(users.map(u => u.club))).sort();
  }
  // Helper to get total users in a club
  function getTotalUsersInClub(club: string) {
    return users.filter(u => u.club === club).length;
  }
  // Helper to get registered users in a club
  function getRegisteredUsersInClub(club: string) {
    return tournamentParticipants.filter(p => p.club === club).length;
  }
  // Helper to get available (unregistered) users, filtered by club if set
  function getAvailableUsersFiltered() {
    let filtered = getAvailableUsers();
    if (registrationClubFilter) {
      filtered = filtered.filter(u => u.club === registrationClubFilter);
    }
    const search = registrationSearch.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(u =>
        u.first_name.toLowerCase().includes(search) ||
        u.last_name.toLowerCase().includes(search) ||
        (u.club && u.club.toLowerCase().includes(search))
      );
    }
    return filtered;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center bg-white/95 rounded-2xl p-8 shadow-lg">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-brand-black mb-4">Admin Panel</h1>
        <p className="text-xl text-neutral-600">
          Manage tournaments
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white/95 rounded-2xl shadow-lg">
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-brand-black">Tournament Management</h2>
              <button
                onClick={() => setShowTournamentForm(true)}
                className="flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Tournament
              </button>
            </div>

            {/* Tournament Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tournament List */}
              <TournamentList
                tournaments={tournaments}
                selectedTournament={selectedTournament}
                setSelectedTournament={setSelectedTournament}
                onEdit={handleEditTournament}
                onDelete={handleDeleteTournament}
                statsByTournamentId={statsByTournamentId}
              />

              {/* Tournament Details */}
              {selectedTournament && (
                <div className="lg:col-span-2 space-y-6">
                  {/* Tabs */}
                  <div className="flex space-x-4 border-b border-neutral-200 mb-4">
                    <button
                      className={`py-2 px-4 font-medium ${activeTab === 'registration' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                      onClick={() => setActiveTab('registration')}
                    >
                      Registration
                    </button>
                    <button
                      className={`py-2 px-4 font-medium ${activeTab === 'checkin' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                      onClick={() => setActiveTab('checkin')}
                    >
                      Check-in
                    </button>
                    <button
                      className={`py-2 px-4 font-medium ${activeTab === 'matches' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                      onClick={() => setActiveTab('matches')}
                    >
                      Matches
                    </button>
                  </div>
                  {/* Tab Content */}
                  {activeTab === 'registration' && (
                    <div>
                      {/* Club Percentage Bars */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        <div
                          onClick={() => setRegistrationClubFilter(null)}
                          className={`cursor-pointer flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${registrationClubFilter === null ? 'bg-brand-neon-green/80 border-brand-neon-green text-brand-black' : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-brand-neon-green/30'}`}
                          style={{ minWidth: 100 }}
                        >
                          <span>All Clubs</span>
                        </div>
                        {getAllClubs().map(club => {
                          const total = getTotalUsersInClub(club);
                          const registered = getRegisteredUsersInClub(club);
                          const percent = total > 0 ? Math.round((registered / total) * 100) : 0;
                          return (
                            <div
                              key={club}
                              onClick={() => setRegistrationClubFilter(club)}
                              className={`cursor-pointer flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${registrationClubFilter === club ? 'bg-brand-neon-green/80 border-brand-neon-green text-brand-black' : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-brand-neon-green/30'}`}
                              style={{ minWidth: 100 }}
                            >
                              <span>{club}</span>
                              <div className="w-full h-2 bg-neutral-200 rounded mt-1 mb-1">
                                <div
                                  className="h-2 rounded"
                                  style={{ width: `${percent}%`, background: percent === 100 ? '#22c55e' : '#4ade80' }}
                                />
                              </div>
                              <span>{registered}/{total} registered</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Unified Search */}
                      <div className="mb-4">
                        <input
                          type="text"
                          value={registrationSearch}
                          onChange={e => setRegistrationSearch(e.target.value)}
                          placeholder="Search by name or club..."
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                        />
                      </div>
                      {/* Only show table and actions if a filter or search is active */}
                      {(registrationClubFilter || registrationSearch.trim()) && (
                        <>
                          {/* Register All Button (when filtered) */}
                          {getAvailableUsersFiltered().length > 0 && (
                            <div className="flex justify-end mb-2">
                              <button
                                onClick={() => handleRegisterUsers(getAvailableUsersFiltered().map(u => u.member_id))}
                                className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400"
                              >
                                Register All
                              </button>
                            </div>
                          )}
                          {/* Multi-select Table of Available Users Only */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                              <thead className="bg-neutral-50">
                                <tr>
                                  <th className="border border-neutral-300 px-4 py-2 text-left">
                                    <input
                                      type="checkbox"
                                      checked={getAvailableUsersFiltered().length > 0 && selectedRegistrationUserIds.length === getAvailableUsersFiltered().map(u => u.member_id).length}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedRegistrationUserIds(getAvailableUsersFiltered().map(u => u.member_id));
                                        } else {
                                          setSelectedRegistrationUserIds([]);
                                        }
                                      }}
                                    />
                                  </th>
                                  <th className="border border-neutral-300 px-4 py-2 text-left">Name</th>
                                  <th className="border border-neutral-300 px-4 py-2 text-left">Email</th>
                                  <th className="border border-neutral-300 px-4 py-2 text-left">Club</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getAvailableUsersFiltered().map(user => (
                                  <tr key={user.member_id}>
                                    <td className="border border-neutral-300 px-4 py-2">
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
                                    <td className="border border-neutral-300 px-4 py-2">
                                      {user.first_name} {user.last_name}
                                    </td>
                                    <td className="border border-neutral-300 px-4 py-2">{user.email}</td>
                                    <td className="border border-neutral-300 px-4 py-2">{user.club}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {getAvailableUsersFiltered().length === 0 && (
                            <p className="text-center text-neutral-600 py-4">
                              No users found.
                            </p>
                          )}
                          <div className="flex justify-end pt-4 space-x-2">
                            <button
                              onClick={() => handleRegisterUsers(selectedRegistrationUserIds)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                              disabled={selectedRegistrationUserIds.length === 0}
                            >
                              Register Selected
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {activeTab === 'checkin' && (
                    <>
                      <button
                        onClick={() => setShowCheckInModal(true)}
                        className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                      >
                        Check In Players
                      </button>
                      <ParticipantsTable
                        participants={tournamentParticipants}
                        checkIns={tournamentCheckIns}
                        onCheckIn={() => {}}
                        onCheckOut={handleCheckOutUser}
                        onUnregister={() => {}}
                        setSelectedUserForCheckIn={setSelectedUserForCheckIn}
                      />
                    </>
                  )}
                  {activeTab === 'matches' && (
                    <>
                      <button
                        onClick={() => setShowMatchGenerationModal(true)}
                        className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                      >
                        Generate Matches
                      </button>
                      <MatchesTable
                        matches={tournamentMatches}
                        onUpdateMatchResult={handleUpdateMatchResult}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Form Modal (Create) */}
      {showTournamentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">Create Tournament/League</h3>
            <form onSubmit={handleTournamentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Name</label>
                <input
                  type="text"
                  value={tournamentForm.name}
                  onChange={e => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Type</label>
                <select
                  value={tournamentForm.type || 'tournament'}
                  onChange={e => setTournamentForm({ ...tournamentForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="tournament">Tournament</option>
                  <option value="league">League</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={tournamentForm.start_date}
                  onChange={e => setTournamentForm({ ...tournamentForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={tournamentForm.end_date}
                  onChange={e => setTournamentForm({ ...tournamentForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  value={tournamentForm.notes}
                  onChange={e => setTournamentForm({ ...tournamentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTournamentForm(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tournament Edit Modal */}
      {showEditTournamentForm && editTournamentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">Edit Tournament/League</h3>
            <form onSubmit={handleUpdateTournament} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Name</label>
                <input
                  type="text"
                  value={editTournamentForm.name}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Type</label>
                <select
                  value={editTournamentForm.type || 'tournament'}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="tournament">Tournament</option>
                  <option value="league">League</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editTournamentForm.start_date}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={editTournamentForm.end_date}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  value={editTournamentForm.notes}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditTournamentForm(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckInModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-brand-black mb-4">
              Check In Players for {selectedTournament.name}
            </h3>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="border border-neutral-300 px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={getRegisteredNotCheckedIn().length > 0 && selectedCheckInUserIds.length === getRegisteredNotCheckedIn().length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCheckInUserIds(getRegisteredNotCheckedIn().map(u => u.user_member_id));
                            } else {
                              setSelectedCheckInUserIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="border border-neutral-300 px-4 py-2 text-left">Name</th>
                      <th className="border border-neutral-300 px-4 py-2 text-left">Email</th>
                      <th className="border border-neutral-300 px-4 py-2 text-left">Club</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRegisteredNotCheckedIn().map(participant => (
                      <tr key={participant.user_member_id}>
                        <td className="border border-neutral-300 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedCheckInUserIds.includes(participant.user_member_id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedCheckInUserIds(prev => [...prev, participant.user_member_id]);
                              } else {
                                setSelectedCheckInUserIds(prev => prev.filter(id => id !== participant.user_member_id));
                              }
                            }}
                          />
                        </td>
                        <td className="border border-neutral-300 px-4 py-2">
                          {participant.first_name} {participant.last_name}
                        </td>
                        <td className="border border-neutral-300 px-4 py-2">{participant.email_address}</td>
                        <td className="border border-neutral-300 px-4 py-2">{participant.club}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {getRegisteredNotCheckedIn().length === 0 && (
                <p className="text-center text-neutral-600 py-4">
                  All registered players are already checked in.
                </p>
              )}
              <div className="flex justify-end pt-4 space-x-2">
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCheckInUsers(selectedCheckInUserIds)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  disabled={selectedCheckInUserIds.length === 0}
                >
                  Check In Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Notes Modal */}
      {selectedUserForCheckIn && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">
              Check In {selectedUserForCheckIn.first_name} {selectedUserForCheckIn.last_name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Notes (Optional)</label>
                <textarea
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={3}
                  placeholder="Any special notes for this check-in..."
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => {
                    setSelectedUserForCheckIn(null);
                    setCheckInNotes('');
                  }}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCheckInUsers(selectedCheckInUserIds)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Check In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Generation Modal */}
      {showMatchGenerationModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">
              Generate Matches for {selectedTournament.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Format</label>
                <select
                  value={matchGenerationForm.format}
                  onChange={(e) => setMatchGenerationForm({ ...matchGenerationForm, format: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="optimized">Optimized (Recommended)</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="random_pairs">Random Pairs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Minimum Matches Per Player</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={matchGenerationForm.minMatchesPerPlayer}
                  onChange={(e) => setMatchGenerationForm({ ...matchGenerationForm, minMatchesPerPlayer: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Note: This setting is only applicable for optimized format
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Checked-in Players:</strong> {getCheckedInPlayersCount()}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Format:</strong> {matchGenerationForm.format.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => setShowMatchGenerationModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateMatches}
                  disabled={getCheckedInPlayersCount() < 2}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    getCheckedInPlayersCount() >= 2
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  Generate Matches
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin; 