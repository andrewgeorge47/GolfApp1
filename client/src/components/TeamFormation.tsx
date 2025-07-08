import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../services/api';

interface Player {
  user_member_id: number;
  first_name: string;
  last_name: string;
  club: string;
  email: string;
}

interface LocalTeam {
  id: string;
  name: string;
  captain: Player;
  players: Player[];
  maxPlayers: number;
}

interface TeamFormationProps {
  tournamentId: number;
  tournamentParticipants: Player[];
  onTeamsCreated: () => void;
  tournamentFormat?: string;
  tournamentSettings?: any;
}

const TeamFormation: React.FC<TeamFormationProps> = ({
  tournamentId,
  tournamentParticipants,
  onTeamsCreated,
  tournamentFormat = 'scramble',
  tournamentSettings
}) => {
  const [teams, setTeams] = useState<LocalTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<LocalTeam | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    captainId: '',
    selectedPlayers: [] as number[]
  });

  // Get format-specific settings
  const getFormatSettings = () => {
    if (tournamentSettings) {
      return {
        teamSize: tournamentSettings.teamSize || 4,
        requiresCaptain: tournamentSettings.requiresCaptain || true,
        description: tournamentSettings.description || 'Team format - standard team competition.',
        maxPlayers: tournamentSettings.teamSize || 4,
        holeConfiguration: tournamentSettings.holeConfiguration || '18',
        tee: tournamentSettings.tee || 'Red',
        pins: tournamentSettings.pins || 'Friday',
        puttingGimme: tournamentSettings.puttingGimme || '8',
        elevation: tournamentSettings.elevation || 'Course',
        stimp: tournamentSettings.stimp || '11',
        mulligan: tournamentSettings.mulligan || 'No',
        gamePlay: tournamentSettings.gamePlay || 'Force Realistic',
        firmness: tournamentSettings.firmness || 'Normal',
        wind: tournamentSettings.wind || 'None',
        handicapEnabled: tournamentSettings.handicapEnabled || false
      };
    }
    
    // Fallback to format-based settings
    switch (tournamentFormat) {
      case 'scramble':
        return {
          teamSize: 4,
          requiresCaptain: true,
          description: 'Scramble format - teams of 4 players. All players hit, best shot is selected.',
          maxPlayers: 4
        };
      case 'best_ball':
        return {
          teamSize: 2,
          requiresCaptain: false,
          description: 'Best ball format - teams of 2 players. Each player plays their own ball.',
          maxPlayers: 2
        };
      default:
        return {
          teamSize: 4,
          requiresCaptain: true,
          description: 'Team format - standard team competition.',
          maxPlayers: 4
        };
    }
  };

  const formatSettings = getFormatSettings();

  // Load teams from API
  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true);
      try {
        const response = await getTeams(tournamentId);
        // Transform API response to LocalTeam format
        const transformedTeams: LocalTeam[] = response.data.map((team: any) => ({
          id: team.id.toString(),
          name: team.name,
          captain: {
            user_member_id: team.captain_id,
            first_name: team.captain_first_name,
            last_name: team.captain_last_name,
            club: team.captain_club,
            email: ''
          },
          players: team.players || [],
          maxPlayers: 4
        }));
        setTeams(transformedTeams);
      } catch (error) {
        console.error('Error loading teams:', error);
        toast.error('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [tournamentId]);

  // Get available players (not assigned to any team)
  const getAvailablePlayers = () => {
    const assignedPlayerIds = teams.flatMap(team => 
      [team.captain.user_member_id, ...team.players.map(p => p.user_member_id)]
    );
    return tournamentParticipants.filter(player => 
      !assignedPlayerIds.includes(player.user_member_id)
    );
  };

  // Get players assigned to a specific team
  const getTeamPlayers = (team: LocalTeam) => {
    return [team.captain, ...team.players];
  };

  const handleCreateTeam = async () => {
    if (!teamForm.name || !teamForm.captainId) {
      toast.error('Please provide a team name and select a captain');
      return;
    }

    const captain = tournamentParticipants.find((p: Player) => p.user_member_id === parseInt(teamForm.captainId));
    if (!captain) {
      toast.error('Selected captain not found');
      return;
    }

    const selectedPlayers = tournamentParticipants.filter((p: Player) => 
      teamForm.selectedPlayers.includes(p.user_member_id)
    );

    try {
      const response = await createTeam(tournamentId, {
        name: teamForm.name,
        captain_id: parseInt(teamForm.captainId),
        player_ids: selectedPlayers.map(p => p.user_member_id)
      });

      // Refresh teams from API
      const teamsResponse = await getTeams(tournamentId);
      const transformedTeams: LocalTeam[] = teamsResponse.data.map((team: any) => ({
        id: team.id.toString(),
        name: team.name,
        captain: {
          user_member_id: team.captain_id,
          first_name: team.captain_first_name,
          last_name: team.captain_last_name,
          club: team.captain_club,
          email: ''
        },
        players: team.players || [],
        maxPlayers: 4
      }));
      setTeams(transformedTeams);

      setShowCreateTeamModal(false);
      setTeamForm({ name: '', captainId: '', selectedPlayers: [] });
      toast.success(`Team "${teamForm.name}" created successfully`);
      onTeamsCreated();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const handleEditTeam = (team: LocalTeam) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name,
      captainId: team.captain.user_member_id.toString(),
      selectedPlayers: team.players.map((p: Player) => p.user_member_id)
    });
    setShowCreateTeamModal(true);
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !teamForm.name || !teamForm.captainId) {
      toast.error('Please provide a team name and select a captain');
      return;
    }

    const captain = tournamentParticipants.find((p: Player) => p.user_member_id === parseInt(teamForm.captainId));
    if (!captain) {
      toast.error('Selected captain not found');
      return;
    }

    const selectedPlayers = tournamentParticipants.filter((p: Player) => 
      teamForm.selectedPlayers.includes(p.user_member_id)
    );

    try {
      await updateTeam(tournamentId, parseInt(editingTeam.id), {
        name: teamForm.name,
        captain_id: parseInt(teamForm.captainId),
        player_ids: selectedPlayers.map(p => p.user_member_id)
      });

      // Refresh teams from API
      const teamsResponse = await getTeams(tournamentId);
      const transformedTeams: LocalTeam[] = teamsResponse.data.map((team: any) => ({
        id: team.id.toString(),
        name: team.name,
        captain: {
          user_member_id: team.captain_id,
          first_name: team.captain_first_name,
          last_name: team.captain_last_name,
          club: team.captain_club,
          email: ''
        },
        players: team.players || [],
        maxPlayers: 4
      }));
      setTeams(transformedTeams);

      setShowCreateTeamModal(false);
      setEditingTeam(null);
      setTeamForm({ name: '', captainId: '', selectedPlayers: [] });
      toast.success(`Team "${teamForm.name}" updated successfully`);
      onTeamsCreated();
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      try {
        await deleteTeam(tournamentId, parseInt(teamId));
        setTeams(teams.filter(t => t.id !== teamId));
        toast.success(`Team "${team.name}" deleted successfully`);
        onTeamsCreated();
      } catch (error) {
        console.error('Error deleting team:', error);
        toast.error('Failed to delete team');
      }
    }
  };

  const handlePlayerToggle = (playerId: number) => {
    setTeamForm(prev => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter(id => id !== playerId)
        : [...prev.selectedPlayers, playerId]
    }));
  };

  const handleCaptainChange = (playerId: string) => {
    setTeamForm(prev => ({
      ...prev,
      captainId: playerId,
      // Remove captain from selected players if they were there
      selectedPlayers: prev.selectedPlayers.filter(id => id !== parseInt(playerId))
    }));
  };

  const availablePlayers = getAvailablePlayers();

  return (
    <div className="space-y-6">
      {/* Team Formation Overview */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        
        {/* Formed Teams header and Create Team button in a flex row */}
        {teams.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-semibold text-brand-black">Formed Teams</h5>
            {availablePlayers.length > 0 && (
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
                disabled={availablePlayers.length === 0}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create New Team
              </button>
            )}
          </div>
        )}

        {/* Teams List */}
        {teams.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => (
                <div key={team.id} className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h6 className="font-semibold text-brand-black">{team.name}</h6>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="p-1 text-neutral-600 hover:text-blue-600 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1 text-neutral-600 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {[team.captain, ...team.players].map((player, idx) => (
                      <div key={player.user_member_id} className="text-sm text-neutral-700 flex items-center">
                        {player.first_name} {player.last_name}
                        {player.user_member_id === team.captain.user_member_id && <Crown className="w-4 h-4 text-yellow-600 ml-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Players */}
        {availablePlayers.length > 0 && (
          <div className="mt-6">
            <h5 className="text-lg font-semibold text-brand-black mb-4">Available Players</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePlayers.map(player => (
                <div key={player.user_member_id} className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="font-medium text-sm">
                    {player.first_name} {player.last_name}
                  </div>
                  <div className="text-xs text-neutral-600">{player.club}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {teams.length === 0 && availablePlayers.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No teams formed yet</h3>
            <p className="text-neutral-600 mb-4">
              Create teams to organize players for the scramble tournament.
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-brand-black">
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateTeamModal(false);
                  setEditingTeam(null);
                  setTeamForm({ name: '', captainId: '', selectedPlayers: [] });
                }}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  placeholder="Enter team name"
                />
              </div>

              {/* Captain Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Team Captain <span className="text-red-500">*</span>
                </label>
                <select
                  value={teamForm.captainId}
                  onChange={e => handleCaptainChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="">Select a captain</option>
                  {availablePlayers.map(player => (
                    <option key={player.user_member_id} value={player.user_member_id}>
                      {player.first_name} {player.last_name} ({player.club})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  The captain will be responsible for entering team scores.
                </p>
              </div>

              {/* Team Members Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Team Members (Optional)
                </label>
                <div className="max-h-48 overflow-y-auto border border-neutral-300 rounded-lg p-3">
                  {availablePlayers
                    .filter(player => player.user_member_id !== parseInt(teamForm.captainId))
                    .map(player => (
                      <label key={player.user_member_id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={teamForm.selectedPlayers.includes(player.user_member_id)}
                          onChange={() => handlePlayerToggle(player.user_member_id)}
                          className="rounded border-neutral-300 text-brand-neon-green focus:ring-brand-neon-green"
                        />
                        <span className="text-sm">
                          {player.first_name} {player.last_name} ({player.club})
                        </span>
                      </label>
                    ))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Select additional team members (up to 4 total including captain).
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTeamModal(false);
                    setEditingTeam(null);
                    setTeamForm({ name: '', captainId: '', selectedPlayers: [] });
                  }}
                  className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                  disabled={!teamForm.name || !teamForm.captainId}
                  className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamFormation; 