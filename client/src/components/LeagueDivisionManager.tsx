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
  Target,
  Award,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Division {
  id: number;
  name: string;
  teams: Team[];
  max_teams: number;
  league_id: number;
}

interface Team {
  id: number;
  name: string;
  captain_id: number;
  captain_name: string;
  members: TeamMember[];
  division_id: number;
}

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  club: string;
}

const LeagueDivisionManager: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDivision, setExpandedDivision] = useState<number | null>(null);
  
  // Division creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [divisionForm, setDivisionForm] = useState({
    name: '',
    max_teams: 8
  });

  // Team creation form state
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<number | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    captain_id: 0
  });

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
      const mockDivisions: Division[] = [
        {
          id: 1,
          name: 'Division A',
          max_teams: 8,
          league_id: 1,
          teams: [
            {
              id: 1,
              name: 'Team Alpha',
              captain_id: 1,
              captain_name: 'John Doe',
              division_id: 1,
              members: [
                { id: 1, user_id: 1, first_name: 'John', last_name: 'Doe', handicap: 5, role: 'captain' },
                { id: 2, user_id: 2, first_name: 'Jane', last_name: 'Smith', handicap: 8, role: 'member' },
                { id: 3, user_id: 3, first_name: 'Bob', last_name: 'Johnson', handicap: 12, role: 'member' }
              ]
            },
            {
              id: 2,
              name: 'Team Beta',
              captain_id: 4,
              captain_name: 'Alice Brown',
              division_id: 1,
              members: [
                { id: 4, user_id: 4, first_name: 'Alice', last_name: 'Brown', handicap: 7, role: 'captain' },
                { id: 5, user_id: 5, first_name: 'Charlie', last_name: 'Wilson', handicap: 10, role: 'member' }
              ]
            }
          ]
        },
        {
          id: 2,
          name: 'Division B',
          max_teams: 8,
          league_id: 1,
          teams: []
        }
      ];

      const mockUsers: User[] = [
        { id: 1, first_name: 'John', last_name: 'Doe', handicap: 5, club: 'Neighborhood National' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', handicap: 8, club: 'Neighborhood National' },
        { id: 3, first_name: 'Bob', last_name: 'Johnson', handicap: 12, club: 'Neighborhood National' },
        { id: 4, first_name: 'Alice', last_name: 'Brown', handicap: 7, club: 'Neighborhood National' },
        { id: 5, first_name: 'Charlie', last_name: 'Wilson', handicap: 10, club: 'Neighborhood National' },
        { id: 6, first_name: 'David', last_name: 'Lee', handicap: 15, club: 'Neighborhood National' },
        { id: 7, first_name: 'Emma', last_name: 'Davis', handicap: 9, club: 'Neighborhood National' },
        { id: 8, first_name: 'Frank', last_name: 'Miller', handicap: 11, club: 'Neighborhood National' }
      ];

      setDivisions(mockDivisions);
      setAvailableUsers(mockUsers);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const validateDivisionForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!divisionForm.name.trim()) {
      errors.name = 'Division name is required';
    }

    if (divisionForm.max_teams < 4 || divisionForm.max_teams > 16) {
      errors.max_teams = 'Max teams must be between 4 and 16';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTeamForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!teamForm.name.trim()) {
      errors.name = 'Team name is required';
    }

    if (!teamForm.captain_id) {
      errors.captain_id = 'Captain is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateDivision = async () => {
    if (!validateDivisionForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newDivision: Division = {
        id: Date.now(), // Temporary ID
        ...divisionForm,
        league_id: 1, // TODO: Get from context/props
        teams: []
      };

      setDivisions(prev => [...prev, newDivision]);
      setShowCreateForm(false);
      setDivisionForm({ name: '', max_teams: 8 });
      toast.success('Division created successfully');
    } catch (error) {
      console.error('Error creating division:', error);
      toast.error('Failed to create division');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!validateTeamForm() || !selectedDivision) {
      return;
    }

    setIsSubmitting(true);
    try {
      const captain = availableUsers.find(u => u.id === teamForm.captain_id);
      if (!captain) {
        toast.error('Selected captain not found');
        return;
      }

      const newTeam: Team = {
        id: Date.now(), // Temporary ID
        name: teamForm.name,
        captain_id: teamForm.captain_id,
        captain_name: `${captain.first_name} ${captain.last_name}`,
        division_id: selectedDivision,
        members: [
          {
            id: Date.now() + 1,
            user_id: captain.id,
            first_name: captain.first_name,
            last_name: captain.last_name,
            handicap: captain.handicap,
            role: 'captain'
          }
        ]
      };

      setDivisions(prev => 
        prev.map(division => 
          division.id === selectedDivision
            ? { ...division, teams: [...division.teams, newTeam] }
            : division
        )
      );

      setShowTeamForm(false);
      setTeamForm({ name: '', captain_id: 0 });
      setSelectedDivision(null);
      toast.success('Team created successfully');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDivision = async (divisionId: number) => {
    if (!window.confirm('Are you sure you want to delete this division? This will also delete all teams in this division.')) {
      return;
    }

    try {
      setDivisions(prev => prev.filter(division => division.id !== divisionId));
      toast.success('Division deleted successfully');
    } catch (error) {
      console.error('Error deleting division:', error);
      toast.error('Failed to delete division');
    }
  };

  const handleDeleteTeam = async (divisionId: number, teamId: number) => {
    if (!window.confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      setDivisions(prev => 
        prev.map(division => 
          division.id === divisionId
            ? { ...division, teams: division.teams.filter(team => team.id !== teamId) }
            : division
        )
      );
      toast.success('Team deleted successfully');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  const handleAddMemberToTeam = async (divisionId: number, teamId: number, userId: number) => {
    try {
      const user = availableUsers.find(u => u.id === userId);
      if (!user) return;

      const newMember: TeamMember = {
        id: Date.now(),
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        handicap: user.handicap,
        role: 'member'
      };

      setDivisions(prev => 
        prev.map(division => 
          division.id === divisionId
            ? {
                ...division,
                teams: division.teams.map(team =>
                  team.id === teamId
                    ? { ...team, members: [...team.members, newMember] }
                    : team
                )
              }
            : division
        )
      );
      toast.success('Member added to team');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMemberFromTeam = async (divisionId: number, teamId: number, memberId: number) => {
    try {
      setDivisions(prev => 
        prev.map(division => 
          division.id === divisionId
            ? {
                ...division,
                teams: division.teams.map(team =>
                  team.id === teamId
                    ? { ...team, members: team.members.filter(member => member.id !== memberId) }
                    : team
                )
              }
            : division
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
            <h2 className="text-2xl font-bold text-brand-black">Division Management</h2>
            <p className="text-neutral-600">Create and manage league divisions</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Division</span>
        </button>
      </div>

      {/* Divisions List */}
      <div className="space-y-4">
        {divisions.map((division) => (
          <div key={division.id} className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setExpandedDivision(expandedDivision === division.id ? null : division.id)}
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    {expandedDivision === division.id ? (
                      <ChevronDown className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-500" />
                    )}
                  </button>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-brand-black">{division.name}</h3>
                    <p className="text-sm text-neutral-600">
                      {division.teams.length} / {division.max_teams} teams
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedDivision(division.id);
                      setShowTeamForm(true);
                    }}
                    disabled={division.teams.length >= division.max_teams}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Team</span>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteDivision(division.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {expandedDivision === division.id && (
                <div className="mt-6 space-y-4">
                  {division.teams.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p>No teams in this division yet</p>
                      <p className="text-sm">Click "Add Team" to create the first team</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {division.teams.map((team) => (
                        <div key={team.id} className="border border-neutral-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-brand-black">{team.name}</h4>
                            <button
                              onClick={() => handleDeleteTeam(division.id, team.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm text-neutral-600">Captain: {team.captain_name}</p>
                            <p className="text-sm text-neutral-600">
                              Members: {team.members.length}
                            </p>
                            
                            <div className="space-y-1">
                              {team.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between text-sm">
                                  <span className="text-neutral-700">
                                    {member.first_name} {member.last_name}
                                    {member.role === 'captain' && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Captain
                                      </span>
                                    )}
                                  </span>
                                  {member.role !== 'captain' && (
                                    <button
                                      onClick={() => handleRemoveMemberFromTeam(division.id, team.id, member.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <UserMinus className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {getAvailableUsersForTeam(team).length > 0 && (
                              <div className="mt-3">
                                <select
                                  onChange={(e) => {
                                    const userId = parseInt(e.target.value);
                                    if (userId) {
                                      handleAddMemberToTeam(division.id, team.id, userId);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="w-full text-sm border border-neutral-300 rounded px-2 py-1"
                                  defaultValue=""
                                >
                                  <option value="">Add member...</option>
                                  {getAvailableUsersForTeam(team).map((user) => (
                                    <option key={user.id} value={user.id}>
                                      {user.first_name} {user.last_name} (HCP: {user.handicap})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Division Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-brand-black">Create Division</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateDivision(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Division Name *
                </label>
                <input
                  type="text"
                  value={divisionForm.name}
                  onChange={(e) => setDivisionForm(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                    formErrors.name ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="e.g., Division A"
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Max Teams *
                </label>
                <input
                  type="number"
                  min="4"
                  max="16"
                  value={divisionForm.max_teams}
                  onChange={(e) => setDivisionForm(prev => ({ ...prev, max_teams: parseInt(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                    formErrors.max_teams ? 'border-red-500' : 'border-neutral-300'
                  }`}
                />
                {formErrors.max_teams && <p className="text-red-500 text-sm mt-1">{formErrors.max_teams}</p>}
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
                  <span>{isSubmitting ? 'Creating...' : 'Create Division'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showTeamForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-brand-black">Create Team</h2>
              <button
                onClick={() => {
                  setShowTeamForm(false);
                  setSelectedDivision(null);
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
                  onClick={() => {
                    setShowTeamForm(false);
                    setSelectedDivision(null);
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
    </div>
  );
};

export default LeagueDivisionManager;
