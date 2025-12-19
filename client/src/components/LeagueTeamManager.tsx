import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  UserPlus,
  UserMinus,
  Crown,
  Target,
  Award,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getLeagueTeams,
  createLeagueTeam,
  updateLeagueTeam,
  deleteLeagueTeam,
  getLeagueDivisions,
  getPlayers,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  getLeagueSignupLinks,
  getLeagueSignupRegistrations,
  type LeagueSignupLink,
  type LeagueSignupRegistration
} from '../services/api';

interface Team {
  id: number;
  name: string;
  captain_id: number;
  captain_name: string;
  members: TeamMember[];
  division_id: number;
  division_name: string;
  wins: number;
  losses: number;
  ties: number;
  total_points: number;
  created_at: string;
}

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  joined_at: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  club: string;
  email: string;
}

interface Division {
  id: number;
  name: string;
}

interface LeagueTeamManagerProps {
  leagueId: number;
}

const LeagueTeamManager: React.FC<LeagueTeamManagerProps> = ({ leagueId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [signupLinks, setSignupLinks] = useState<LeagueSignupLink[]>([]);
  const [signupRegistrations, setSignupRegistrations] = useState<Map<number, LeagueSignupRegistration[]>>(new Map());
  const [selectedSignupFilter, setSelectedSignupFilter] = useState<number | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'wins' | 'created'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Team creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    captain_id: 0,
    division_id: 0
  });

  // Member management state
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [createFormSignupFilter, setCreateFormSignupFilter] = useState<number | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load teams for this league
      const teamsResponse = await getLeagueTeams(leagueId);
      const teamsData = teamsResponse.data;

      // Load divisions for this league
      const divisionsResponse = await getLeagueDivisions(leagueId);
      const divisionsData = divisionsResponse.data;

      // Load available users/players
      const usersResponse = await getPlayers();
      const usersData = usersResponse.data;

      // Load signup links for this league
      const linksResponse = await getLeagueSignupLinks(leagueId);
      const linksData = linksResponse.data;
      setSignupLinks(linksData);

      // Load registrations for each linked signup
      const registrationsMap = new Map<number, LeagueSignupRegistration[]>();
      for (const link of linksData) {
        try {
          const regsResponse = await getLeagueSignupRegistrations(leagueId, link.signup_id);
          registrationsMap.set(link.signup_id, regsResponse.data);
        } catch (error) {
          console.error(`Error loading registrations for signup ${link.signup_id}:`, error);
        }
      }
      setSignupRegistrations(registrationsMap);

      // Transform teams data and load members for each team
      const transformedTeams: Team[] = await Promise.all(
        teamsData.map(async (team: any) => {
          // Fetch members for this team
          let members: TeamMember[] = [];
          try {
            const membersResponse = await getTeamMembers(team.id);
            members = membersResponse.data.map((m: any) => ({
              id: m.id,
              user_id: m.user_member_id,
              first_name: m.first_name,
              last_name: m.last_name,
              handicap: m.handicap || 0,
              role: m.is_captain ? 'captain' : 'member',
              joined_at: m.joined_at
            }));
          } catch (error) {
            console.error(`Error loading members for team ${team.id}:`, error);
          }

          return {
            id: team.id,
            name: team.name,
            captain_id: team.captain_id,
            captain_name: team.captain_name || 'Unknown',
            division_id: team.division_id || 0,
            division_name: divisionsData.find((d: any) => d.id === team.division_id)?.division_name || 'No Division',
            wins: 0, // Will be populated from standings
            losses: 0,
            ties: 0,
            total_points: team.league_points || 0,
            created_at: team.created_at,
            members
          };
        })
      );

      setTeams(transformedTeams);
      setDivisions(divisionsData.map((d: any) => ({
        id: d.id,
        name: d.division_name
      })));
      setAvailableUsers(usersData.map((user: any) => ({
        id: user.member_id,
        first_name: user.first_name,
        last_name: user.last_name,
        handicap: user.handicap || 0,
        club: user.club || 'Unknown',
        email: user.email || ''
      })));
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const validateTeamForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!teamForm.name.trim()) {
      errors.name = 'Team name is required';
    }

    if (!teamForm.captain_id) {
      errors.captain_id = 'Captain is required';
    }

    if (!teamForm.division_id) {
      errors.division_id = 'Division is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTeam = async () => {
    if (!validateTeamForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const captain = availableUsers.find(u => u.id === teamForm.captain_id);
      const division = divisions.find(d => d.id === teamForm.division_id);

      if (!captain || !division) {
        toast.error('Selected captain or division not found');
        setIsSubmitting(false);
        return;
      }

      // Create team via API
      const response = await createLeagueTeam(leagueId, {
        name: teamForm.name,
        captain_id: teamForm.captain_id,
        division_id: teamForm.division_id
      });

      const createdTeam: Team = {
        id: response.data.id,
        name: response.data.name,
        captain_id: response.data.captain_id,
        captain_name: `${captain.first_name} ${captain.last_name}`,
        division_id: response.data.division_id || 0,
        division_name: division.name,
        wins: 0,
        losses: 0,
        ties: 0,
        total_points: 0,
        created_at: response.data.created_at || new Date().toISOString(),
        members: [
          {
            id: Date.now() + 1,
            user_id: captain.id,
            first_name: captain.first_name,
            last_name: captain.last_name,
            handicap: captain.handicap,
            role: 'captain',
            joined_at: new Date().toISOString()
          }
        ]
      };

      setTeams(prev => [...prev, createdTeam]);
      setShowCreateForm(false);
      setTeamForm({ name: '', captain_id: 0, division_id: 0 });
      setCreateFormSignupFilter(null);
      toast.success('Team created successfully');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteLeagueTeam(leagueId, teamId);
      setTeams(prev => prev.filter(team => team.id !== teamId));
      toast.success('Team deleted successfully');
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast.error(error.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleAddMemberToTeam = async (teamId: number, userId: number) => {
    try {
      const user = availableUsers.find(u => u.id === userId);
      if (!user) return;

      // Add member via API
      const response = await addTeamMember(teamId, userId);
      const apiMember = response.data;

      const newMember: TeamMember = {
        id: apiMember.id,
        user_id: apiMember.user_member_id,
        first_name: apiMember.first_name,
        last_name: apiMember.last_name,
        handicap: apiMember.handicap || 0,
        role: apiMember.is_captain ? 'captain' : 'member',
        joined_at: apiMember.joined_at
      };

      setTeams(prev =>
        prev.map(team =>
          team.id === teamId
            ? { ...team, members: [...team.members, newMember] }
            : team
        )
      );
      toast.success('Member added to team');
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMemberFromTeam = async (teamId: number, memberId: number) => {
    try {
      // Remove member via API
      await removeTeamMember(teamId, memberId);

      setTeams(prev =>
        prev.map(team =>
          team.id === teamId
            ? { ...team, members: team.members.filter(member => member.id !== memberId) }
            : team
        )
      );
      toast.success('Member removed from team');
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const getAvailableUsersForTeam = (team: Team) => {
    const teamUserIds = team.members.map(member => member.user_id);
    let users = availableUsers.filter(user => !teamUserIds.includes(user.id));

    // Filter by signup if selected
    if (selectedSignupFilter) {
      const registrations = signupRegistrations.get(selectedSignupFilter) || [];
      const registeredUserIds = registrations.map(r => r.user_id);
      users = users.filter(user => registeredUserIds.includes(user.id));
    }

    return users;
  };

  const getAvailableUsersForCreateForm = () => {
    // Get all users who are not already captains of teams
    const captainIds = teams.map(team => team.captain_id);
    let users = availableUsers.filter(user => !captainIds.includes(user.id));

    // Filter by signup if selected
    if (createFormSignupFilter) {
      const registrations = signupRegistrations.get(createFormSignupFilter) || [];
      const registeredUserIds = registrations.map(r => r.user_id);
      users = users.filter(user => registeredUserIds.includes(user.id));
    }

    return users;
  };

  const getUserRegistrationData = (userId: number, signupId?: number) => {
    if (signupId) {
      const registrations = signupRegistrations.get(signupId) || [];
      return registrations.find(r => r.user_id === userId);
    }

    // If no specific signup, check all signups
    const allRegistrations = Array.from(signupRegistrations.values());
    for (const registrations of allRegistrations) {
      const registration = registrations.find(r => r.user_id === userId);
      if (registration) return registration;
    }

    return null;
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.captain_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDivision = !selectedDivision || team.division_id === selectedDivision;
    return matchesSearch && matchesDivision;
  });

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'points':
        aValue = a.total_points;
        bValue = b.total_points;
        break;
      case 'wins':
        aValue = a.wins;
        bValue = b.wins;
        break;
      case 'created':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        aValue = a.total_points;
        bValue = b.total_points;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h2 className="text-2xl font-bold text-brand-black">Team Management</h2>
            <p className="text-neutral-600">Create and manage league teams</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Team</span>
        </button>
      </div>

      {/* Linked Signups Info */}
      {signupLinks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Linked Signups ({signupLinks.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {signupLinks.map((link) => {
              const registrationCount = signupRegistrations.get(link.signup_id)?.length || 0;
              return (
                <span
                  key={link.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {link.signup_title} ({registrationCount} registered)
                </span>
              );
            })}
          </div>
          <p className="text-xs text-blue-700 mt-2">
            You can filter users by signup registration when adding team members
          </p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search teams or captains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedDivision || ''}
              onChange={(e) => setSelectedDivision(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="">All Divisions</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="points-desc">Points (High to Low)</option>
              <option value="points-asc">Points (Low to High)</option>
              <option value="wins-desc">Wins (High to Low)</option>
              <option value="wins-asc">Wins (Low to High)</option>
              <option value="name-asc">Name (A to Z)</option>
              <option value="name-desc">Name (Z to A)</option>
              <option value="created-desc">Created (Newest)</option>
              <option value="created-asc">Created (Oldest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-4">
        {sortedTeams.map((team) => (
          <div key={team.id} className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    {expandedTeam === team.id ? (
                      <ChevronDown className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-500" />
                    )}
                  </button>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-brand-black">{team.name}</h3>
                    <p className="text-sm text-neutral-600">
                      {team.division_name} • Captain: {team.captain_name}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-neutral-600">Record</div>
                    <div className="font-semibold text-brand-black">
                      {team.wins}-{team.losses}-{team.ties}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-neutral-600">Points</div>
                    <div className="font-semibold text-brand-neon-green">{team.total_points}</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTeam(team.id);
                        setShowAddMemberForm(true);
                      }}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Member</span>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {expandedTeam === team.id && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold text-brand-black mb-3">Team Members ({team.members.length})</h4>
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {member.role === 'captain' && <Crown className="w-4 h-4 text-yellow-500" />}
                              <div>
                                <div className="font-medium text-brand-black">
                                  {member.first_name} {member.last_name}
                                </div>
                                <div className="text-sm text-neutral-600">
                                  HCP: {member.handicap}
                                </div>
                              </div>
                            </div>
                            
                            {member.role !== 'captain' && (
                              <button
                                onClick={() => handleRemoveMemberFromTeam(team.id, member.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-brand-black mb-3">Team Stats</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Wins:</span>
                          <span className="font-medium text-green-600">{team.wins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Losses:</span>
                          <span className="font-medium text-red-600">{team.losses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Ties:</span>
                          <span className="font-medium text-yellow-600">{team.ties}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Total Points:</span>
                          <span className="font-medium text-brand-neon-green">{team.total_points}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-brand-black mb-3">Team Info</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Division:</span>
                          <span className="font-medium">{team.division_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Created:</span>
                          <span className="font-medium">
                            {new Date(team.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Win Rate:</span>
                          <span className="font-medium">
                            {team.wins + team.losses + team.ties > 0 
                              ? Math.round((team.wins / (team.wins + team.losses + team.ties)) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Team Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-brand-black">Create Team</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateFormSignupFilter(null);
                }}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateTeam(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                    formErrors.name ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="e.g., Team Alpha"
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Division *
                </label>
                <select
                  value={teamForm.division_id}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, division_id: parseInt(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                    formErrors.division_id ? 'border-red-500' : 'border-neutral-300'
                  }`}
                >
                  <option value={0}>Select division...</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
                {formErrors.division_id && <p className="text-red-500 text-sm mt-1">{formErrors.division_id}</p>}
              </div>

              {/* Signup Filter */}
              {signupLinks.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Filter by Signup Registration
                  </label>
                  <select
                    value={createFormSignupFilter || ''}
                    onChange={(e) => {
                      setCreateFormSignupFilter(e.target.value ? parseInt(e.target.value) : null);
                      // Reset captain selection when changing filter
                      setTeamForm(prev => ({ ...prev, captain_id: 0 }));
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value="">All Users</option>
                    {signupLinks.map((link) => (
                      <option key={link.id} value={link.signup_id}>
                        {link.signup_title} ({signupRegistrations.get(link.signup_id)?.length || 0} registered)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Filter captains by signup registration
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Captain *
                </label>
                <select
                  value={teamForm.captain_id}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, captain_id: parseInt(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                    formErrors.captain_id ? 'border-red-500' : 'border-neutral-300'
                  }`}
                >
                  <option value={0}>Select captain...</option>
                  {getAvailableUsersForCreateForm().map((user) => {
                    const registrationData = getUserRegistrationData(user.id, createFormSignupFilter || undefined);
                    return (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} (HCP: {user.handicap})
                        {registrationData ? ' ✓ Registered' : ''}
                      </option>
                    );
                  })}
                </select>
                {formErrors.captain_id && <p className="text-red-500 text-sm mt-1">{formErrors.captain_id}</p>}

                {/* Show registration data for selected captain */}
                {teamForm.captain_id > 0 && (() => {
                  const registrationData = getUserRegistrationData(teamForm.captain_id, createFormSignupFilter || undefined);
                  if (registrationData) {
                    return (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                        <div className="font-semibold text-blue-900 mb-2">Registration Information:</div>
                        {registrationData.registration_data && typeof registrationData.registration_data === 'object' && (
                          <div className="space-y-1 text-blue-800 mb-2">
                            {Object.entries(registrationData.registration_data).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-blue-600">
                          Registered: {new Date(registrationData.registered_at).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateFormSignupFilter(null);
                  }}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Team'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-brand-black">Add Member</h2>
              <button
                onClick={() => {
                  setShowAddMemberForm(false);
                  setSelectedTeam(null);
                }}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedTeam && (() => {
                const team = teams.find(t => t.id === selectedTeam);
                const availableUsers = team ? getAvailableUsersForTeam(team) : [];

                return (
                  <>
                    <div>
                      <p className="text-sm text-neutral-600 mb-3">
                        Add a member to <strong>{team?.name}</strong>
                      </p>
                    </div>

                    {/* Signup Filter */}
                    {signupLinks.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Filter by Signup Registration
                        </label>
                        <select
                          value={selectedSignupFilter || ''}
                          onChange={(e) => setSelectedSignupFilter(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                        >
                          <option value="">All Users</option>
                          {signupLinks.map((link) => (
                            <option key={link.id} value={link.signup_id}>
                              {link.signup_title} ({signupRegistrations.get(link.signup_id)?.length || 0} registered)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {availableUsers.length === 0 ? (
                      <div className="text-center py-8 text-neutral-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                        <p>No available users to add</p>
                        {selectedSignupFilter ? (
                          <p className="text-sm">No registered users available from this signup</p>
                        ) : (
                          <p className="text-sm">All users are already on teams</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {availableUsers.map((user) => {
                          const registrationData = getUserRegistrationData(user.id, selectedSignupFilter || undefined);

                          return (
                            <div key={user.id} className="flex items-start justify-between p-3 border border-neutral-200 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-brand-black">
                                  {user.first_name} {user.last_name}
                                </div>
                                <div className="text-sm text-neutral-600">
                                  HCP: {user.handicap} • {user.club}
                                </div>

                                {/* Show registration data if available */}
                                {registrationData && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                    <div className="font-semibold text-blue-900 mb-1">Registration Data:</div>
                                    {registrationData.registration_data && typeof registrationData.registration_data === 'object' && (
                                      <div className="space-y-1 text-blue-800">
                                        {Object.entries(registrationData.registration_data).map(([key, value]) => (
                                          <div key={key}>
                                            <span className="font-medium">{key}:</span> {String(value)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="text-blue-600 mt-1">
                                      Registered: {new Date(registrationData.registered_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  handleAddMemberToTeam(selectedTeam, user.id);
                                  setShowAddMemberForm(false);
                                  setSelectedTeam(null);
                                  setSelectedSignupFilter(null);
                                }}
                                className="flex items-center space-x-2 px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors ml-3"
                              >
                                <UserPlus className="w-4 h-4" />
                                <span>Add</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueTeamManager;
