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

const LeagueTeamManager: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Mock data for now
      const mockTeams: Team[] = [
        {
          id: 1,
          name: 'Team Alpha',
          captain_id: 1,
          captain_name: 'John Doe',
          division_id: 1,
          division_name: 'Division A',
          wins: 8,
          losses: 2,
          ties: 1,
          total_points: 17,
          created_at: '2024-01-15T10:00:00Z',
          members: [
            { id: 1, user_id: 1, first_name: 'John', last_name: 'Doe', handicap: 5, role: 'captain', joined_at: '2024-01-15T10:00:00Z' },
            { id: 2, user_id: 2, first_name: 'Jane', last_name: 'Smith', handicap: 8, role: 'member', joined_at: '2024-01-20T10:00:00Z' },
            { id: 3, user_id: 3, first_name: 'Bob', last_name: 'Johnson', handicap: 12, role: 'member', joined_at: '2024-01-25T10:00:00Z' }
          ]
        },
        {
          id: 2,
          name: 'Team Beta',
          captain_id: 4,
          captain_name: 'Alice Brown',
          division_id: 1,
          division_name: 'Division A',
          wins: 6,
          losses: 4,
          ties: 1,
          total_points: 13,
          created_at: '2024-01-16T10:00:00Z',
          members: [
            { id: 4, user_id: 4, first_name: 'Alice', last_name: 'Brown', handicap: 7, role: 'captain', joined_at: '2024-01-16T10:00:00Z' },
            { id: 5, user_id: 5, first_name: 'Charlie', last_name: 'Wilson', handicap: 10, role: 'member', joined_at: '2024-01-22T10:00:00Z' }
          ]
        },
        {
          id: 3,
          name: 'Team Gamma',
          captain_id: 6,
          captain_name: 'David Lee',
          division_id: 2,
          division_name: 'Division B',
          wins: 7,
          losses: 3,
          ties: 1,
          total_points: 15,
          created_at: '2024-01-17T10:00:00Z',
          members: [
            { id: 6, user_id: 6, first_name: 'David', last_name: 'Lee', handicap: 15, role: 'captain', joined_at: '2024-01-17T10:00:00Z' },
            { id: 7, user_id: 7, first_name: 'Emma', last_name: 'Davis', handicap: 9, role: 'member', joined_at: '2024-01-23T10:00:00Z' },
            { id: 8, user_id: 8, first_name: 'Frank', last_name: 'Miller', handicap: 11, role: 'member', joined_at: '2024-01-28T10:00:00Z' }
          ]
        }
      ];

      const mockUsers: User[] = [
        { id: 1, first_name: 'John', last_name: 'Doe', handicap: 5, club: 'Neighborhood National', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', handicap: 8, club: 'Neighborhood National', email: 'jane@example.com' },
        { id: 3, first_name: 'Bob', last_name: 'Johnson', handicap: 12, club: 'Neighborhood National', email: 'bob@example.com' },
        { id: 4, first_name: 'Alice', last_name: 'Brown', handicap: 7, club: 'Neighborhood National', email: 'alice@example.com' },
        { id: 5, first_name: 'Charlie', last_name: 'Wilson', handicap: 10, club: 'Neighborhood National', email: 'charlie@example.com' },
        { id: 6, first_name: 'David', last_name: 'Lee', handicap: 15, club: 'Neighborhood National', email: 'david@example.com' },
        { id: 7, first_name: 'Emma', last_name: 'Davis', handicap: 9, club: 'Neighborhood National', email: 'emma@example.com' },
        { id: 8, first_name: 'Frank', last_name: 'Miller', handicap: 11, club: 'Neighborhood National', email: 'frank@example.com' },
        { id: 9, first_name: 'Grace', last_name: 'Taylor', handicap: 6, club: 'Neighborhood National', email: 'grace@example.com' },
        { id: 10, first_name: 'Henry', last_name: 'Anderson', handicap: 14, club: 'Neighborhood National', email: 'henry@example.com' }
      ];

      const mockDivisions: Division[] = [
        { id: 1, name: 'Division A' },
        { id: 2, name: 'Division B' }
      ];

      setTeams(mockTeams);
      setAvailableUsers(mockUsers);
      setDivisions(mockDivisions);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
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
        return;
      }

      const newTeam: Team = {
        id: Date.now(), // Temporary ID
        name: teamForm.name,
        captain_id: teamForm.captain_id,
        captain_name: `${captain.first_name} ${captain.last_name}`,
        division_id: teamForm.division_id,
        division_name: division.name,
        wins: 0,
        losses: 0,
        ties: 0,
        total_points: 0,
        created_at: new Date().toISOString(),
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

      setTeams(prev => [...prev, newTeam]);
      setShowCreateForm(false);
      setTeamForm({ name: '', captain_id: 0, division_id: 0 });
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
      setTeams(prev => prev.filter(team => team.id !== teamId));
      toast.success('Team deleted successfully');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  const handleAddMemberToTeam = async (teamId: number, userId: number) => {
    try {
      const user = availableUsers.find(u => u.id === userId);
      if (!user) return;

      const newMember: TeamMember = {
        id: Date.now(),
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        handicap: user.handicap,
        role: 'member',
        joined_at: new Date().toISOString()
      };

      setTeams(prev => 
        prev.map(team => 
          team.id === teamId
            ? { ...team, members: [...team.members, newMember] }
            : team
        )
      );
      toast.success('Member added to team');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMemberFromTeam = async (teamId: number, memberId: number) => {
    try {
      setTeams(prev => 
        prev.map(team => 
          team.id === teamId
            ? { ...team, members: team.members.filter(member => member.id !== memberId) }
            : team
        )
      );
      toast.success('Member removed from team');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const getAvailableUsersForTeam = (team: Team) => {
    const teamUserIds = team.members.map(member => member.user_id);
    return availableUsers.filter(user => !teamUserIds.includes(user.id));
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
                onClick={() => setShowCreateForm(false)}
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
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} (HCP: {user.handicap})
                    </option>
                  ))}
                </select>
                {formErrors.captain_id && <p className="text-red-500 text-sm mt-1">{formErrors.captain_id}</p>}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
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
                    
                    {availableUsers.length === 0 ? (
                      <div className="text-center py-8 text-neutral-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                        <p>No available users to add</p>
                        <p className="text-sm">All users are already on teams</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                            <div>
                              <div className="font-medium text-brand-black">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-neutral-600">
                                HCP: {user.handicap} • {user.club}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => {
                                handleAddMemberToTeam(selectedTeam, user.id);
                                setShowAddMemberForm(false);
                                setSelectedTeam(null);
                              }}
                              className="flex items-center space-x-2 px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Add</span>
                            </button>
                          </div>
                        ))}
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
