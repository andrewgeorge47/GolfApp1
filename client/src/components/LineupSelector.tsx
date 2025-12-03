import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Users, 
  Lock, 
  Unlock, 
  Save, 
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Calculator,
  Trophy,
  MapPin,
  X
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  availability_status: 'available' | 'unavailable' | 'pending';
}

interface LineupPlayer {
  player_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  holes_assigned: number[]; // 1-3, 4-6, 7-9
  position: 'holes_1_3' | 'holes_4_6' | 'holes_7_9';
}

interface WeeklyLineup {
  week_start_date: string;
  lineup_submitted: boolean;
  lineup_locked: boolean;
  players: LineupPlayer[];
  team_handicap: number;
  submission_deadline: string;
}

interface UpcomingMatch {
  id: number;
  week_start_date: string;
  opponent_team_id: number;
  opponent_team_name: string;
  course_name: string;
  course_id: number;
  lineup_submitted: boolean;
  lineup_deadline: string;
  status: 'upcoming' | 'in_progress' | 'completed';
}

const LineupSelector: React.FC = () => {
  const { user } = useAuth();
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);
  const [currentLineup, setCurrentLineup] = useState<WeeklyLineup | null>(null);
  const [upcomingMatch, setUpcomingMatch] = useState<UpcomingMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  useEffect(() => {
    loadLineupData();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      loadWeekLineup(selectedWeek);
    }
  }, [selectedWeek]);

  const loadLineupData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Mock data for now
      const mockAvailableMembers: TeamMember[] = [
        {
          id: 1,
          user_id: user?.member_id || 1,
          first_name: user?.first_name || 'John',
          last_name: user?.last_name || 'Doe',
          handicap: 12,
          role: 'captain',
          availability_status: 'available'
        },
        {
          id: 2,
          user_id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          handicap: 15,
          role: 'member',
          availability_status: 'available'
        },
        {
          id: 3,
          user_id: 3,
          first_name: 'Mike',
          last_name: 'Johnson',
          handicap: 18,
          role: 'member',
          availability_status: 'available'
        },
        {
          id: 4,
          user_id: 4,
          first_name: 'Sarah',
          last_name: 'Wilson',
          handicap: 14,
          role: 'member',
          availability_status: 'available'
        },
        {
          id: 5,
          user_id: 5,
          first_name: 'Tom',
          last_name: 'Brown',
          handicap: 16,
          role: 'member',
          availability_status: 'available'
        }
      ];

      const mockUpcomingMatch: UpcomingMatch = {
        id: 1,
        week_start_date: '2024-03-18',
        opponent_team_id: 2,
        opponent_team_name: 'Birdie Brigade',
        course_name: 'Augusta National',
        course_id: 1,
        lineup_submitted: false,
        lineup_deadline: '2024-03-17T18:00:00Z',
        status: 'upcoming'
      };

      setAvailableMembers(mockAvailableMembers.filter(member => member.availability_status === 'available'));
      setUpcomingMatch(mockUpcomingMatch);
      setSelectedWeek(mockUpcomingMatch.week_start_date);
    } catch (error) {
      console.error('Error loading lineup data:', error);
      toast.error('Failed to load lineup data');
    } finally {
      setLoading(false);
    }
  };

  const loadWeekLineup = async (weekStartDate: string) => {
    try {
      // TODO: Replace with actual API call
      // Mock data for now
      const mockLineup: WeeklyLineup = {
        week_start_date: weekStartDate,
        lineup_submitted: false,
        lineup_locked: false,
        players: [
          {
            player_id: 1,
            first_name: user?.first_name || 'John',
            last_name: user?.last_name || 'Doe',
            handicap: 12,
            holes_assigned: [1, 2, 3],
            position: 'holes_1_3'
          },
          {
            player_id: 2,
            first_name: 'Jane',
            last_name: 'Smith',
            handicap: 15,
            holes_assigned: [4, 5, 6],
            position: 'holes_4_6'
          },
          {
            player_id: 3,
            first_name: 'Mike',
            last_name: 'Johnson',
            handicap: 18,
            holes_assigned: [7, 8, 9],
            position: 'holes_7_9'
          }
        ],
        team_handicap: 15, // Average of selected players
        submission_deadline: '2024-03-17T18:00:00Z'
      };

      setCurrentLineup(mockLineup);
    } catch (error) {
      console.error('Error loading week lineup:', error);
      toast.error('Failed to load week lineup');
    }
  };

  const assignPlayerToPosition = (playerId: number, position: 'holes_1_3' | 'holes_4_6' | 'holes_7_9') => {
    if (!currentLineup) return;

    const player = availableMembers.find(member => member.id === playerId);
    if (!player) return;

    // Check if player is already assigned
    const existingPlayer = currentLineup.players.find(p => p.player_id === playerId);
    if (existingPlayer) {
      toast.warning('Player is already assigned to a position');
      return;
    }

    // Check if position is already taken
    const positionTaken = currentLineup.players.find(p => p.position === position);
    if (positionTaken) {
      toast.warning('This position is already assigned');
      return;
    }

    const holesAssigned = position === 'holes_1_3' ? [1, 2, 3] : 
                         position === 'holes_4_6' ? [4, 5, 6] : [7, 8, 9];

    const newPlayer: LineupPlayer = {
      player_id: playerId,
      first_name: player.first_name,
      last_name: player.last_name,
      handicap: player.handicap,
      holes_assigned: holesAssigned,
      position: position
    };

    const updatedPlayers = [...currentLineup.players, newPlayer];
    const teamHandicap = Math.round(updatedPlayers.reduce((sum, p) => sum + p.handicap, 0) / updatedPlayers.length);

    setCurrentLineup({
      ...currentLineup,
      players: updatedPlayers,
      team_handicap: teamHandicap
    });
  };

  const removePlayerFromLineup = (playerId: number) => {
    if (!currentLineup) return;

    const updatedPlayers = currentLineup.players.filter(p => p.player_id !== playerId);
    const teamHandicap = updatedPlayers.length > 0 
      ? Math.round(updatedPlayers.reduce((sum, p) => sum + p.handicap, 0) / updatedPlayers.length)
      : 0;

    setCurrentLineup({
      ...currentLineup,
      players: updatedPlayers,
      team_handicap: teamHandicap
    });
  };

  const submitLineup = async () => {
    if (!currentLineup) return;

    if (currentLineup.players.length !== 3) {
      toast.error('Please select exactly 3 players for the lineup');
      return;
    }

    setSaving(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setCurrentLineup({
        ...currentLineup,
        lineup_submitted: true,
        lineup_locked: true
      });

      toast.success('Lineup submitted successfully!');
    } catch (error) {
      console.error('Error submitting lineup:', error);
      toast.error('Failed to submit lineup');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isLineupDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const getPositionName = (position: string) => {
    switch (position) {
      case 'holes_1_3': return 'Holes 1-3';
      case 'holes_4_6': return 'Holes 4-6';
      case 'holes_7_9': return 'Holes 7-9';
      default: return position;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'holes_1_3': return 'bg-blue-100 text-blue-800';
      case 'holes_4_6': return 'bg-green-100 text-green-800';
      case 'holes_7_9': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <Target className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Lineup Selector</h1>
            <p className="text-neutral-600">Select your weekly lineup and assign hole positions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={loadLineupData}
            className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Match Information */}
      {upcomingMatch && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Trophy className="w-6 h-6 text-brand-neon-green" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-brand-black">
                  vs {upcomingMatch.opponent_team_name}
                </h3>
                <p className="text-sm text-neutral-600">
                  {formatDate(upcomingMatch.week_start_date)} • {upcomingMatch.course_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {currentLineup?.lineup_submitted ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Lineup Submitted</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {isLineupDeadlinePassed(upcomingMatch.lineup_deadline) ? 'Deadline Passed' : 'Lineup Due Soon'}
                  </span>
                </div>
              )}
              
              <div className="text-sm text-neutral-600">
                Deadline: {formatDate(upcomingMatch.lineup_deadline)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Handicap */}
      {currentLineup && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calculator className="w-6 h-6 text-brand-neon-green" />
              <div>
                <h3 className="text-lg font-semibold text-brand-black">Team Handicap</h3>
                <p className="text-sm text-neutral-600">Average handicap of selected players</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-brand-black">{currentLineup.team_handicap}</div>
              <div className="text-sm text-neutral-600">
                {currentLineup.players.length} of 3 players selected
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lineup Positions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Holes 1-3 */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-800">Holes 1-3</h3>
            <p className="text-sm text-blue-600">Opening holes</p>
          </div>
          
          <div className="p-6">
            {currentLineup?.players.find(p => p.position === 'holes_1_3') ? (
              <div className="space-y-3">
                {currentLineup.players
                  .filter(p => p.position === 'holes_1_3')
                  .map((player) => (
                    <div key={player.player_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-blue-900">
                          {player.first_name} {player.last_name}
                        </h4>
                        <p className="text-sm text-blue-700">Handicap: {player.handicap}</p>
                      </div>
                      <button
                        onClick={() => removePlayerFromLineup(player.player_id)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        disabled={currentLineup?.lineup_locked}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No player assigned</p>
              </div>
            )}
          </div>
        </div>

        {/* Holes 4-6 */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800">Holes 4-6</h3>
            <p className="text-sm text-green-600">Middle holes</p>
          </div>
          
          <div className="p-6">
            {currentLineup?.players.find(p => p.position === 'holes_4_6') ? (
              <div className="space-y-3">
                {currentLineup.players
                  .filter(p => p.position === 'holes_4_6')
                  .map((player) => (
                    <div key={player.player_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-green-900">
                          {player.first_name} {player.last_name}
                        </h4>
                        <p className="text-sm text-green-700">Handicap: {player.handicap}</p>
                      </div>
                      <button
                        onClick={() => removePlayerFromLineup(player.player_id)}
                        className="p-1 text-green-600 hover:text-green-800 transition-colors"
                        disabled={currentLineup?.lineup_locked}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No player assigned</p>
              </div>
            )}
          </div>
        </div>

        {/* Holes 7-9 */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-purple-50">
            <h3 className="text-lg font-semibold text-purple-800">Holes 7-9</h3>
            <p className="text-sm text-purple-600">Closing holes</p>
          </div>
          
          <div className="p-6">
            {currentLineup?.players.find(p => p.position === 'holes_7_9') ? (
              <div className="space-y-3">
                {currentLineup.players
                  .filter(p => p.position === 'holes_7_9')
                  .map((player) => (
                    <div key={player.player_id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-purple-900">
                          {player.first_name} {player.last_name}
                        </h4>
                        <p className="text-sm text-purple-700">Handicap: {player.handicap}</p>
                      </div>
                      <button
                        onClick={() => removePlayerFromLineup(player.player_id)}
                        className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                        disabled={currentLineup?.lineup_locked}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No player assigned</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Players */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-brand-black">Available Players</h3>
          <p className="text-sm text-neutral-600">Click to assign players to positions</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableMembers
              .filter(member => !currentLineup?.players.find(p => p.player_id === member.id))
              .map((member) => (
                <div key={member.id} className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-brand-neon-green rounded-full flex items-center justify-center">
                        <span className="text-brand-black font-semibold">
                          {member.first_name[0]}{member.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-brand-black">
                          {member.first_name} {member.last_name}
                        </h4>
                        <p className="text-sm text-neutral-600">Handicap: {member.handicap}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => assignPlayerToPosition(member.id, 'holes_1_3')}
                      className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                      disabled={currentLineup?.lineup_locked || !!currentLineup?.players.find(p => p.position === 'holes_1_3')}
                    >
                      Assign to Holes 1-3
                    </button>
                    <button
                      onClick={() => assignPlayerToPosition(member.id, 'holes_4_6')}
                      className="w-full px-3 py-2 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                      disabled={currentLineup?.lineup_locked || !!currentLineup?.players.find(p => p.position === 'holes_4_6')}
                    >
                      Assign to Holes 4-6
                    </button>
                    <button
                      onClick={() => assignPlayerToPosition(member.id, 'holes_7_9')}
                      className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                      disabled={currentLineup?.lineup_locked || !!currentLineup?.players.find(p => p.position === 'holes_7_9')}
                    >
                      Assign to Holes 7-9
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Submit Lineup */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-brand-black">Submit Lineup</h3>
            <p className="text-sm text-neutral-600">
              {currentLineup?.players.length === 3 
                ? 'Ready to submit your lineup' 
                : `Select ${3 - (currentLineup?.players.length || 0)} more players to complete your lineup`
              }
            </p>
          </div>
          
          <button
            onClick={submitLineup}
            disabled={currentLineup?.players.length !== 3 || currentLineup?.lineup_locked || saving}
            className="flex items-center space-x-2 px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Submit Lineup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LineupSelector;
