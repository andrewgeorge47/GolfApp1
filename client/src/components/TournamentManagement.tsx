import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Users, BarChart3, CheckCircle, Clock, Edit, Trash2, Target, Award } from 'lucide-react';
import { 
  getTournaments,
  getTournamentParticipants,
  getTournamentMatches,
  getTournamentCheckIns,
  getTournamentScores,
  getTeams,
  deleteTournament,
  checkInUser,
  checkOutUser,
  updateTournamentMatch,
  unregisterUserFromTournament,
  forceCalculateMatches,
  forceUpdateLeaderboard,
  cleanupDuplicateMatches,
  fixTournamentWeekDate
} from '../services/api';
import TournamentForm from './TournamentForm';
import { toast } from 'react-toastify';
import UserRegistration from './UserRegistration';
import MatchGenerator from './MatchGenerator';
import ScoreSubmission from './ScoreSubmission';
import TeamFormation from './TeamFormation';
import TournamentLeaderboard from './TournamentLeaderboard';
import StrokeplayScoring from './StrokeplayScoring';
import StrokeplayLeaderboard from './StrokeplayLeaderboard';
import NewWeeklyScoring from './NewWeeklyScoring';
import ParticipantsTable from './ParticipantsTable';
import { useAuth } from '../AuthContext';
import NewWeeklyLeaderboard from './NewWeeklyLeaderboard';
import AdminScorecardEditor from './AdminScorecardEditor';
import AdminStrokeplayScorecardEditor from './AdminStrokeplayScorecardEditor';
import AdminMatchplayEditor from './AdminMatchplayEditor';
import ChampionshipAdminDashboard from './ChampionshipAdminDashboard';

interface TournamentManagementProps {
  // Add any props if needed
}

const TournamentManagement: React.FC<TournamentManagementProps> = () => {
  const { user: currentUser } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [tournamentParticipants, setTournamentParticipants] = useState<any[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [tournamentCheckIns, setTournamentCheckIns] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [tournamentScores, setTournamentScores] = useState<any[]>([]);
  const [tournamentPayouts, setTournamentPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'registration' | 'checkin' | 'teams' | 'matches' | 'scoring' | 'leaderboard' | 'championship'>('registration');

  // Tournament form state
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);

  // Custom matchplay scoring modal state
  const [showMatchplayScoringModal, setShowMatchplayScoringModal] = useState(false);
  const [selectedMatchplayMatch, setSelectedMatchplayMatch] = useState<any>(null);
  const [matchplayScoreForm, setMatchplayScoreForm] = useState({
    player1Holes: ['', '', ''],
    player2Holes: ['', '', ''],
    player1Total: '',
    player2Total: '',
    winner: null as number | null
  });

  // Admin action state
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
  const [adminActionMessage, setAdminActionMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [adminWeekOverride, setAdminWeekOverride] = useState<string>('');
  const [adminScorecardWeek, setAdminScorecardWeek] = useState<string>('');

  // Helper function to determine if tournament requires matches
  const requiresMatches = (tournamentFormat: string) => {
    return tournamentFormat === 'match_play' || tournamentFormat === 'par3_match_play';
  };

  // Helper function to determine if tournament requires payment tracking
  const requiresCheckIn = (tournamentFormat: string) => {
    // For now, require payment tracking for all formats, but this could be configurable
    return true;
  };

  // Helper function to determine if tournament requires team formation
  const requiresTeamFormation = (tournamentFormat: string) => {
    return tournamentFormat === 'scramble' || tournamentFormat === 'best_ball';
  };

  // Helper function to get available tabs based on tournament format
  const getAvailableTabs = (tournamentFormat: string) => {
    const tabs = ['registration'];
    
    if (requiresCheckIn(tournamentFormat)) {
      tabs.push('checkin');
    }
    
    if (requiresTeamFormation(tournamentFormat)) {
      tabs.push('teams');
    }
    
    if (requiresMatches(tournamentFormat)) {
      tabs.push('matches');
    }
    
    tabs.push('scoring');
    tabs.push('leaderboard');
    
    return tabs;
  };

  // Helper function to get format-specific settings
  const getFormatSpecificSettings = (tournament: any) => {
    const settings: any = {
      format: tournament.tournament_format,
      teamSize: tournament.team_size || 4,
      holeConfiguration: tournament.hole_configuration || '18',
      tee: tournament.tee || 'Red',
      pins: tournament.pins || 'Friday',
      puttingGimme: tournament.putting_gimme || '8',
      elevation: tournament.elevation || 'Course',
      stimp: tournament.stimp || '11',
      mulligan: tournament.mulligan || 'No',
      gamePlay: tournament.game_play || 'Force Realistic',
      firmness: tournament.firmness || 'Normal',
      wind: tournament.wind || 'None',
      handicapEnabled: tournament.handicap_enabled || false
    };
    
    switch (tournament.tournament_format) {
      case 'scramble':
        settings.requiresCaptain = true;
        settings.scoringMethod = 'team_total';
        settings.description = 'Scramble format - teams of 4 players. All players hit, best shot is selected. Team captain submits final score.';
        break;
      case 'best_ball':
        settings.requiresCaptain = false;
        settings.scoringMethod = 'best_ball';
        settings.description = 'Best ball format - teams of 2 players. Each player plays their own ball, best score on each hole counts.';
        break;
      case 'match_play':
        settings.requiresMatches = true;
        settings.matchFormat = 'head_to_head';
        settings.description = 'Match play format - head-to-head competition. Win holes to win matches.';
        break;
      case 'par3_match_play':
        settings.requiresMatches = true;
        settings.matchFormat = 'group_play';
        settings.description = '3-hole match play format - 4-player groups. Each player plays 3 matches against their group members.';
        break;
      case 'stroke_play':
        settings.requiresMatches = false;
        settings.scoringMethod = 'individual_total';
        settings.description = 'Stroke play format - individual competition. Lowest total score wins.';
        break;
      case 'stableford':
        settings.requiresMatches = false;
        settings.scoringMethod = 'stableford_points';
        settings.description = 'Stableford format - points-based scoring. Points awarded based on score relative to par.';
        break;
      default:
        settings.description = 'Custom tournament format.';
    }
    
    return settings;
  };

  // Helper function to ensure current tab is available
  const ensureValidTab = (currentTab: string, tournamentFormat: string) => {
    const availableTabs = getAvailableTabs(tournamentFormat);
    if (!availableTabs.includes(currentTab as any)) {
      return availableTabs[0];
    }
    return currentTab;
  };

  // Check if current user is super admin (Andrew George)
  const isSuperAdmin = currentUser?.first_name === 'Andrew' && currentUser?.last_name === 'George';



  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getTournaments();
        setTournaments(response.data);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        toast.error('Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      const loadTournamentData = async () => {
        try {
          const [participantsResponse, matchesResponse, checkInsResponse, scoresResponse] = await Promise.all([
            getTournamentParticipants(selectedTournament.id),
            getTournamentMatches(selectedTournament.id),
            getTournamentCheckIns(selectedTournament.id),
            getTournamentScores(selectedTournament.id)
          ]);
          setTournamentParticipants(participantsResponse.data);
          setTournamentMatches(matchesResponse.data);
          setTournamentCheckIns(checkInsResponse.data);
          setTournamentScores(scoresResponse.data || []);
          
          // Load teams if tournament is scramble format
          if (selectedTournament.tournament_format === 'scramble') {
            try {
              const teamsResponse = await getTeams(selectedTournament.id);
              // Transform API response to match ScoreSubmission component expectations
              const transformedTeams = teamsResponse.data.map((team: any) => ({
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
              setTournamentTeams(transformedTeams);
            } catch (teamsError) {
              console.error('Error loading teams:', teamsError);
              // Don't show error toast for teams as it might not be implemented yet
            }
          }
        } catch (error) {
          console.error('Error loading tournament data:', error);
          toast.error('Failed to load tournament data');
        }
      };

      loadTournamentData();
      
      // Ensure the active tab is valid for the selected tournament
      const validTab = ensureValidTab(activeTab, selectedTournament.tournament_format || 'match_play');
      if (validTab !== activeTab) {
        setActiveTab(validTab as any);
      }
    }
  }, [selectedTournament]);

  // On mount, check for hash and auto-select tournament
  useEffect(() => {
    if (tournaments.length > 0 && !selectedTournament) {
      const hash = window.location.hash;
      if (hash.startsWith('#/tournament-management')) {
        const urlParams = new URLSearchParams(hash.split('?')[1] || '');
        const tournamentId = urlParams.get('tournament');
        if (tournamentId) {
          const id = parseInt(tournamentId);
          const found = tournaments.find(t => t.id === id);
          if (found) setSelectedTournament(found);
        }
      }
    }
    // eslint-disable-next-line
  }, [tournaments]);

  // When a tournament is selected, update the hash
  const handleSelectTournament = (tournament: any) => {
    setSelectedTournament(tournament);
    window.location.hash = `/tournament-management?tournament=${tournament.id}`;
    
    // Auto-switch to championship tab for championship tournaments
    if (tournament.type === 'club_championship' || tournament.type === 'national_championship') {
      setActiveTab('championship');
    } else {
      setActiveTab('registration'); // Default to registration for regular tournaments
    }
  };

  // When returning to the list, clear the hash
  const handleBackToList = () => {
    setSelectedTournament(null);
    window.location.hash = '/tournament-management';
  };

  const handleUserRegistered = () => {
    // Refresh participants data
    if (selectedTournament) {
      getTournamentParticipants(selectedTournament.id).then(response => {
        console.log('Participants updated:', response.data);
        setTournamentParticipants(response.data);
      });
    }
  };

  const handleUserUnregistered = () => {
    // Refresh participants data
    if (selectedTournament) {
      getTournamentParticipants(selectedTournament.id).then(response => setTournamentParticipants(response.data));
    }
  };

  const handleMatchesGenerated = () => {
    // Refresh matches data
    if (selectedTournament) {
      getTournamentMatches(selectedTournament.id).then(response => setTournamentMatches(response.data));
    }
  };

  const handleMatchUpdated = () => {
    // Refresh matches data
    if (selectedTournament) {
      getTournamentMatches(selectedTournament.id).then(response => setTournamentMatches(response.data));
    }
  };

  const handleScoreSubmitted = () => {
    // Refresh matches data
    if (selectedTournament) {
      getTournamentMatches(selectedTournament.id).then(response => setTournamentMatches(response.data));
    }
    
    // Also refresh teams data for team-based tournaments
    if (selectedTournament && selectedTournament.tournament_format === 'scramble') {
      getTeams(selectedTournament.id).then(response => {
        const transformedTeams = response.data.map((team: any) => ({
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
        setTournamentTeams(transformedTeams);
      }).catch(error => {
        console.error('Error refreshing teams after score submission:', error);
      });
    }
  };

  const handleTeamsCreated = () => {
    // Refresh teams data when teams are created/updated
    if (selectedTournament && selectedTournament.tournament_format === 'scramble') {
      getTeams(selectedTournament.id).then(response => {
        const transformedTeams = response.data.map((team: any) => ({
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
        setTournamentTeams(transformedTeams);
      }).catch(error => {
        console.error('Error refreshing teams:', error);
      });
    }
  };

  const handleCheckInUsers = async (userIds: number[]) => {
    try {
      await Promise.all(
        userIds.map(userId => checkInUser(selectedTournament!.id, userId))
      );
      toast.success(`Successfully marked ${userIds.length} user(s) as paid`);
      // Refresh payment tracking data
      if (selectedTournament) {
        getTournamentCheckIns(selectedTournament.id).then(response => setTournamentCheckIns(response.data));
      }
    } catch (error) {
              console.error('Error marking users as paid:', error);
              toast.error('Failed to mark users as paid');
    }
  };

  const handleCheckOutUser = async (userId: number) => {
    try {
      await checkOutUser(selectedTournament!.id, userId);
      toast.success('User marked as unpaid successfully');
      // Refresh payment tracking data
      if (selectedTournament) {
        getTournamentCheckIns(selectedTournament.id).then(response => setTournamentCheckIns(response.data));
      }
    } catch (error) {
      console.error('Error marking user as unpaid:', error);
      toast.error('Failed to mark user as unpaid');
    }
  };

  const handleUnregisterUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to unregister this user from the tournament?')) return;
    
    try {
      await unregisterUserFromTournament(selectedTournament!.id, userId);
      toast.success('User unregistered successfully');
      // Refresh participants data
      if (selectedTournament) {
        getTournamentParticipants(selectedTournament.id).then(response => setTournamentParticipants(response.data));
      }
    } catch (error) {
      console.error('Error unregistering user:', error);
      toast.error('Failed to unregister user');
    }
  };

  // Admin action handlers
  const handleForceCalculateMatches = async () => {
    if (!selectedTournament) return;
    
    setIsAdminActionLoading(true);
    setAdminActionMessage(null);
    
    try {
      const response = await forceCalculateMatches(selectedTournament.id, adminWeekOverride || undefined);
      setAdminActionMessage({
        type: 'success',
        message: response.data.message || 'Matches calculated successfully!'
      });
      toast.success('Matches calculated successfully!');
      
      // Refresh matches data
      getTournamentMatches(selectedTournament.id).then(response => setTournamentMatches(response.data));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to calculate matches';
      setAdminActionMessage({
        type: 'error',
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const handleForceUpdateLeaderboard = async () => {
    if (!selectedTournament) return;
    
    setIsAdminActionLoading(true);
    setAdminActionMessage(null);
    
    try {
      const response = await forceUpdateLeaderboard(selectedTournament.id, adminWeekOverride || undefined);
      setAdminActionMessage({
        type: 'success',
        message: response.data.message || 'Leaderboard updated successfully!'
      });
      toast.success('Leaderboard updated successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update leaderboard';
      setAdminActionMessage({
        type: 'error',
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!selectedTournament) return;
    
    if (!window.confirm('Are you sure you want to cleanup duplicate matches? This action cannot be undone.')) return;
    
    setIsAdminActionLoading(true);
    setAdminActionMessage(null);
    
    try {
      const response = await cleanupDuplicateMatches(selectedTournament.id);
      setAdminActionMessage({
        type: 'success',
        message: response.data.message || 'Duplicate matches cleaned up successfully!'
      });
      toast.success('Duplicate matches cleaned up successfully!');
      
      // Refresh matches data
      getTournamentMatches(selectedTournament.id).then(response => setTournamentMatches(response.data));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to cleanup duplicate matches';
      setAdminActionMessage({
        type: 'error',
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const handleFixWeekDate = async () => {
    if (!selectedTournament) return;
    
    if (!window.confirm('Are you sure you want to fix the tournament week start date? This will update the tournament configuration.')) return;
    
    setIsAdminActionLoading(true);
    setAdminActionMessage(null);
    
    try {
      const response = await fixTournamentWeekDate(selectedTournament.id);
      setAdminActionMessage({
        type: 'success',
        message: response.data.message || 'Tournament week date fixed successfully!'
      });
      toast.success('Tournament week date fixed successfully!');
      
      // Refresh tournament data to show updated week_start_date
      const updatedTournament = { ...selectedTournament, week_start_date: response.data.current };
      setSelectedTournament(updatedTournament);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to fix tournament week date';
      setAdminActionMessage({
        type: 'error',
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  // Tournament form handlers
  const handleEditTournament = (tournament: any) => {
    setEditingTournament(tournament);
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

  const handleTournamentFormSuccess = async () => {
    setShowTournamentForm(false);
    setEditingTournament(null);
    // Refresh tournaments list
    const res = await getTournaments();
    setTournaments(res.data);
  };

  // Custom matchplay scoring functions
  const handleMatchplayScoreSubmit = async () => {
    if (!selectedMatchplayMatch) return;

    try {
      const player1Total = parseInt(matchplayScoreForm.player1Total);
      const player2Total = parseInt(matchplayScoreForm.player2Total);
      
      // Determine winner based on total score
      let winnerId = null;
      if (player1Total < player2Total) {
        winnerId = selectedMatchplayMatch.player1_id;
      } else if (player2Total < player1Total) {
        winnerId = selectedMatchplayMatch.player2_id;
      } else {
        // Tie - set winner_id to null so both players get tie points
        winnerId = null;
      }

      await updateTournamentMatch(selectedTournament.id, selectedMatchplayMatch.id, {
        winner_id: winnerId,
        scores: {
          player1_score: player1Total,
          player2_score: player2Total,
          holes: [
            { hole: 1, player1: matchplayScoreForm.player1Holes[0], player2: matchplayScoreForm.player2Holes[0] },
            { hole: 2, player1: matchplayScoreForm.player1Holes[1], player2: matchplayScoreForm.player2Holes[1] },
            { hole: 3, player1: matchplayScoreForm.player1Holes[2], player2: matchplayScoreForm.player2Holes[2] }
          ]
        }
      });

      toast.success('Matchplay score submitted successfully');
      setShowMatchplayScoringModal(false);
      setSelectedMatchplayMatch(null);
      setMatchplayScoreForm({
        player1Holes: ['', '', ''],
        player2Holes: ['', '', ''],
        player1Total: '',
        player2Total: '',
        winner: null
      });
      handleScoreSubmitted();
    } catch (error) {
      console.error('Error submitting matchplay score:', error);
      toast.error('Failed to submit matchplay score');
    }
  };

  const handleMatchplayHoleScoreChange = (holeIndex: number, player: 'player1' | 'player2', value: string) => {
    const newForm = { ...matchplayScoreForm };
    if (player === 'player1') {
      newForm.player1Holes[holeIndex] = value;
      // Recalculate total
      const total = newForm.player1Holes.reduce((sum, score) => sum + (parseInt(score) || 0), 0);
      newForm.player1Total = total.toString();
    } else {
      newForm.player2Holes[holeIndex] = value;
      // Recalculate total
      const total = newForm.player2Holes.reduce((sum, score) => sum + (parseInt(score) || 0), 0);
      newForm.player2Total = total.toString();
    }
    setMatchplayScoreForm(newForm);
  };

  const openMatchplayScoringModal = (match: any) => {
    setSelectedMatchplayMatch(match);
    setMatchplayScoreForm({
      player1Holes: ['', '', ''],
      player2Holes: ['', '', ''],
      player1Total: '',
      player2Total: '',
      winner: null
    });
    setShowMatchplayScoringModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main Content */}
      <div className="bg-white/95 rounded-2xl shadow-lg">
        <div className="p-6">
          <div className="space-y-6">
            {/* Tournament Management */}
            <div className="space-y-6">
              {/* Tournament Overview Grid */}
              {!selectedTournament && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-brand-black">All Tournaments</h4>
                    <button
                      onClick={() => setShowTournamentForm(true)}
                      className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-brand-neon-green text-brand-black rounded-full sm:rounded-lg font-medium hover:bg-green-400 transition-colors text-sm sm:text-base"
                    >
                      <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Create Tournament</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tournaments.map(tournament => (
                      <div
                        key={tournament.id}
                        className="p-4 bg-white border border-neutral-200 rounded-lg hover:border-brand-neon-green hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 
                            className="font-medium text-brand-black group-hover:text-brand-neon-green transition-colors cursor-pointer"
                            onClick={() => handleSelectTournament(tournament)}
                          >
                            {tournament.name}
                          </h5>
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tournament.status === 'active' ? 'bg-green-100 text-green-800' :
                              tournament.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              tournament.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              tournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {tournament.status || 'draft'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTournament(tournament);
                              }}
                              className="p-1 text-neutral-400 hover:text-blue-600 transition-colors"
                              title="Edit tournament"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTournament(tournament.id);
                              }}
                              className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                              title="Delete tournament"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div 
                          className="text-sm text-neutral-600 mb-2 cursor-pointer"
                          onClick={() => handleSelectTournament(tournament)}
                        >
                          {tournament.tournament_format || 'match_play'} • {tournament.type || 'tournament'}
                        </div>
                        {tournament.start_date && (
                          <div 
                            className="text-xs text-neutral-500 cursor-pointer"
                            onClick={() => handleSelectTournament(tournament)}
                          >
                            {new Date(tournament.start_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {tournaments.length === 0 && (
                    <div className="text-center py-8 text-neutral-600">
                      <Trophy className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                      <p>No tournaments found.</p>
                      <p className="text-sm">Create your first tournament to get started.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Management Content */}
              {selectedTournament && (
                <div className="space-y-6">
                  {/* Tournament Header with Settings */}
                  <div className="bg-white rounded-xl border border-neutral-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handleBackToList}
                          className="flex items-center px-3 py-1 text-neutral-600 hover:text-neutral-800 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Back to List
                        </button>
                        <div>
                          <h3 className="text-2xl font-bold text-brand-black">
                            {selectedTournament.name}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedTournament.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedTournament.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          selectedTournament.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          selectedTournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedTournament.status || 'draft'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Admin Controls */}
                    {(currentUser?.role === 'admin' || isSuperAdmin) && (
                      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Admin Controls
                        </h4>
                        
                        {/* Week Override Input - Only for weekly scoring tournaments */}
                        {(selectedTournament.tournament_format === 'par3_match_play' || 
                          selectedTournament.tournament_format === 'weekly') && (
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-yellow-800 mb-1">
                              Week Override (YYYY-MM-DD, optional):
                            </label>
                            <div className="flex space-x-2">
                              <input
                                type="date"
                                value={adminWeekOverride || ''}
                                onChange={(e) => setAdminWeekOverride(e.target.value)}
                                className="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                placeholder="Leave empty for current week"
                              />
                              {adminWeekOverride && (
                                <button
                                  onClick={() => setAdminWeekOverride('')}
                                  className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                                  title="Clear week override"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">
                              Use this to force calculations for a specific week
                            </p>
                            {adminWeekOverride && (
                              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                                <strong>Active Override:</strong> Will calculate for week starting {adminWeekOverride}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Admin Scorecard Week Selector */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-yellow-800 mb-1">
                            Scorecard Editor Week (YYYY-MM-DD, optional):
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="date"
                              value={adminScorecardWeek || ''}
                              onChange={(e) => setAdminScorecardWeek(e.target.value)}
                              className="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                              placeholder="Leave empty for current week"
                            />
                            {adminScorecardWeek && (
                              <button
                                onClick={() => setAdminScorecardWeek('')}
                                className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                                title="Clear scorecard week"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">
                            Use this to view and edit scorecards from a specific week
                          </p>
                          {adminScorecardWeek && (
                            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                              <strong>Active Week:</strong> Will show scorecards from week starting {adminScorecardWeek}
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Force Calculate Matches - Only for weekly scoring tournaments */}
                          {(selectedTournament.tournament_format === 'par3_match_play' || 
                            selectedTournament.tournament_format === 'weekly') && (
                            <button
                              onClick={() => handleForceCalculateMatches()}
                              disabled={isAdminActionLoading}
                              className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                              title="Force recalculation of all matches for this tournament"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Force Calculate Matches
                            </button>
                          )}
                          
                          {/* Force Update Leaderboard - Available for all tournaments */}
                          <button
                            onClick={() => handleForceUpdateLeaderboard()}
                            disabled={isAdminActionLoading}
                            className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                            title="Force update of the tournament leaderboard"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Force Update Leaderboard
                          </button>
                          
                          {/* Cleanup Duplicates - Only for weekly scoring tournaments */}
                          {(selectedTournament.tournament_format === 'par3_match_play' || 
                            selectedTournament.tournament_format === 'weekly') && (
                            <button
                              onClick={() => handleCleanupDuplicates()}
                              disabled={isAdminActionLoading}
                              className="px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                              title="Remove duplicate matches that may have been created"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Cleanup Duplicates
                            </button>
                          )}
                          
                          {/* Fix Week Date - Only for weekly scoring tournaments */}
                          {(selectedTournament.tournament_format === 'par3_match_play' || 
                            selectedTournament.tournament_format === 'weekly') && (
                            <button
                              onClick={() => handleFixWeekDate()}
                              disabled={isAdminActionLoading}
                              className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                              title="Fix incorrect tournament week start date"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Fix Week Date
                            </button>
                          )}
                        </div>
                        {adminActionMessage && (
                          <div className={`mt-3 p-2 rounded text-sm ${
                            adminActionMessage.type === 'success' ? 'bg-green-100 text-green-800' :
                            adminActionMessage.type === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {adminActionMessage.message}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Tournament Settings Display */}
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-brand-black">
                            Simulator Settings
                          </h4>
                        </div>
                      </div>
                      
                      {/* Settings Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                        <div>
                          <span className="text-neutral-600">Holes:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).holeConfiguration}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Tee:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).tee}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Pins:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).pins}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Gimme:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).puttingGimme}'</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Elevation:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).elevation}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Stimp:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).stimp}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Mulligan:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).mulligan}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Game Play:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).gamePlay}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Firmness:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).firmness}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Wind:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).wind}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">Handicap:</span>
                          <span className="ml-1 font-medium">{getFormatSpecificSettings(selectedTournament).handicapEnabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="bg-white rounded-xl border border-neutral-200">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 border-b border-neutral-200 p-6 pb-0">
                      <button
                        className={`py-2 px-4 font-medium ${activeTab === 'registration' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                        onClick={() => setActiveTab('registration')}
                      >
                        <Users className="w-4 h-4 mr-2 inline" />
                        Registration
                      </button>
                      {requiresCheckIn(selectedTournament.tournament_format || 'match_play') && (
                        <button
                          className={`py-2 px-4 font-medium ${activeTab === 'checkin' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                          onClick={() => setActiveTab('checkin')}
                        >
                          <Users className="w-4 h-4 mr-2 inline" />
                          Players
                        </button>
                      )}
                      {requiresTeamFormation(selectedTournament.tournament_format || 'match_play') && (
                        <button
                          className={`py-2 px-4 font-medium ${activeTab === 'teams' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                          onClick={() => setActiveTab('teams')}
                        >
                          <Users className="w-4 h-4 mr-2 inline" />
                          Teams
                        </button>
                      )}
                      {requiresMatches(selectedTournament.tournament_format || 'match_play') && !(selectedTournament.type === 'club_championship' || selectedTournament.type === 'national_championship') && (
                        <button
                          className={`py-2 px-4 font-medium ${activeTab === 'matches' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                          onClick={() => setActiveTab('matches')}
                        >
                          <Trophy className="w-4 h-4 mr-2 inline" />
                          Matches
                        </button>
                      )}
                      {!(selectedTournament.type === 'club_championship' || selectedTournament.type === 'national_championship') && (
                        <button
                          className={`py-2 px-4 font-medium ${activeTab === 'scoring' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                          onClick={() => setActiveTab('scoring')}
                        >
                          <BarChart3 className="w-4 h-4 mr-2 inline" />
                          Scoring
                        </button>
                      )}
                      {!(selectedTournament.type === 'club_championship' || selectedTournament.type === 'national_championship') && (
                        <button
                          className={`py-2 px-4 font-medium ${activeTab === 'leaderboard' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                          onClick={() => setActiveTab('leaderboard')}
                        >
                          <Trophy className="w-4 h-4 mr-2 inline" />
                          Leaderboard
                        </button>
                      )}
                      {(selectedTournament.type === 'club_championship' || selectedTournament.type === 'national_championship') && (
                        <button
                          className={`py-2 px-4 font-medium ${activeTab === 'championship' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                          onClick={() => setActiveTab('championship')}
                        >
                          <Award className="w-4 h-4 mr-2 inline" />
                          Championship Management
                        </button>
                      )}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">

                      {activeTab === 'registration' && (
                        <UserRegistration
                          tournamentId={selectedTournament.id}
                          tournamentParticipants={tournamentParticipants}
                          onUserRegistered={handleUserRegistered}
                          onUserUnregistered={handleUserUnregistered}
                          clubRestriction={selectedTournament.club_restriction}
                          isSuperAdmin={isSuperAdmin}
                          currentUserClub={currentUser?.club}
                        />
                      )}
                      
                      {activeTab === 'teams' && requiresTeamFormation(selectedTournament.tournament_format || 'match_play') && (
                        <TeamFormation
                          tournamentId={selectedTournament.id}
                          tournamentParticipants={tournamentParticipants}
                          onTeamsCreated={handleTeamsCreated}
                          tournamentFormat={selectedTournament.tournament_format}
                          tournamentSettings={getFormatSpecificSettings(selectedTournament)}
                        />
                      )}
                      
                      {activeTab === 'checkin' && requiresCheckIn(selectedTournament.tournament_format || 'match_play') && (
                        <ParticipantsTable
                          participants={tournamentParticipants}
                          checkIns={tournamentCheckIns}
                          scores={tournamentScores}
                          payouts={tournamentPayouts}
                          tournamentId={selectedTournament.id}
                          onCheckIn={handleCheckInUsers}
                          onCheckOut={handleCheckOutUser}
                          onUnregister={handleUnregisterUser}
                        />
                      )}
                      
                      {activeTab === 'matches' && requiresMatches(selectedTournament.tournament_format || 'match_play') && !(selectedTournament.type === 'club_championship' || selectedTournament.type === 'national_championship') && (
                        <MatchGenerator
                          tournamentId={selectedTournament.id}
                          tournamentMatches={tournamentMatches}
                          tournamentParticipants={tournamentParticipants}
                          tournamentCheckIns={tournamentCheckIns}
                          onMatchesGenerated={handleMatchesGenerated}
                          onMatchUpdated={handleMatchUpdated}
                        />
                      )}
                      
                      {activeTab === 'scoring' && !(selectedTournament.type === 'club_championship' || selectedTournament.type === 'national_championship') && (
                        <div className="space-y-6">
                          {/* Custom Matchplay Scoring for 3-hole tournaments */}
                          {selectedTournament.tournament_format === 'match_play' && 
                           selectedTournament.hole_configuration === '3' && (
                            <div className="bg-white rounded-xl p-6 border border-neutral-200">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-2">
                                  <Target className="w-6 h-6 text-brand-neon-green" />
                                  <h4 className="text-xl font-semibold text-brand-black">3-Hole Matchplay Scoring</h4>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-neutral-600">
                                    {tournamentMatches.filter(m => m.status === 'completed').length} completed
                                  </span>
                                  <span className="text-sm text-neutral-600">
                                    / {tournamentMatches.length} total
                                  </span>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mb-6">
                                <div className="flex justify-between text-sm text-neutral-600 mb-2">
                                  <span>Match Completion Progress</span>
                                  <span>
                                    {tournamentMatches.length > 0 
                                      ? Math.round((tournamentMatches.filter(m => m.status === 'completed').length / tournamentMatches.length) * 100)
                                      : 0}%
                                  </span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-3">
                                  <div 
                                    className="h-3 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${tournamentMatches.length > 0 
                                        ? (tournamentMatches.filter(m => m.status === 'completed').length / tournamentMatches.length) * 100
                                        : 0}%`,
                                      background: '#22c55e'
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Pending Matches */}
                              {tournamentMatches.filter(m => m.status === 'pending').length > 0 && (
                                <div className="mb-6">
                                  <h5 className="text-lg font-semibold text-brand-black mb-4">Pending Matches</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {tournamentMatches.filter(m => m.status === 'pending').map(match => (
                                      <div
                                        key={match.id}
                                        className="p-4 border border-neutral-200 rounded-lg hover:border-brand-neon-green transition-colors cursor-pointer bg-gradient-to-r from-blue-50 to-green-50"
                                        onClick={() => openMatchplayScoringModal(match)}
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <span className="text-sm font-medium text-neutral-600">Match #{match.match_number}</span>
                                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                            Pending
                                          </span>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="text-sm">
                                            <span className="font-medium">{match.player1_first_name} {match.player1_last_name}</span>
                                            <span className="text-neutral-500 ml-2">vs</span>
                                          </div>
                                          <div className="text-sm">
                                            <span className="font-medium">{match.player2_first_name} {match.player2_last_name}</span>
                                          </div>
                                        </div>
                                        <div className="mt-3">
                                          <button className="w-full px-3 py-2 bg-brand-neon-green text-brand-black text-sm rounded hover:bg-green-400 transition-colors">
                                            Enter Scores
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Completed Matches */}
                              {tournamentMatches.filter(m => m.status === 'completed').length > 0 && (
                                <div>
                                  <h5 className="text-lg font-semibold text-brand-black mb-4">Completed Matches</h5>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                                      <thead className="bg-neutral-50">
                                        <tr>
                                          <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Match #</th>
                                          <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Player 1</th>
                                          <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Player 2</th>
                                          <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Winner</th>
                                          <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tournamentMatches.filter(m => m.status === 'completed').map(match => (
                                          <tr key={match.id} className="hover:bg-neutral-50">
                                            <td className="border border-neutral-300 px-4 py-3 font-medium">
                                              #{match.match_number}
                                            </td>
                                            <td className="border border-neutral-300 px-4 py-3">
                                              <div className="font-medium">
                                                {match.player1_first_name} {match.player1_last_name}
                                              </div>
                                              <div className="text-sm text-neutral-600">
                                                {match.player1_club}
                                              </div>
                                            </td>
                                            <td className="border border-neutral-300 px-4 py-3">
                                              <div className="font-medium">
                                                {match.player2_first_name} {match.player2_last_name}
                                              </div>
                                              <div className="text-sm text-neutral-600">
                                                {match.player2_club}
                                              </div>
                                            </td>
                                            <td className="border border-neutral-300 px-4 py-3">
                                              {match.winner_first_name ? (
                                                <div className="font-medium text-green-600">
                                                  {match.winner_first_name} {match.winner_last_name}
                                                </div>
                                              ) : (
                                                <span className="text-neutral-500">Not available</span>
                                              )}
                                            </td>
                                            <td className="border border-neutral-300 px-4 py-3">
                                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <Award className="w-3 h-3 inline mr-1" />
                                                Completed
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {tournamentMatches.length === 0 && (
                                <div className="text-center py-8">
                                  <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                                    <Trophy className="w-8 h-8 text-neutral-400" />
                                  </div>
                                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No matches available</h3>
                                  <p className="text-neutral-600 mb-4">
                                    Generate matches first to submit scores.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Strokeplay Scoring */}
                          {selectedTournament.tournament_format === 'stroke_play' && (
                            <StrokeplayScoring
                              tournamentId={selectedTournament.id}
                              tournamentFormat={selectedTournament.tournament_format}
                              tournamentSettings={getFormatSpecificSettings(selectedTournament)}
                              onScoreSubmitted={handleScoreSubmitted}
                              courseId={selectedTournament.course_id}
                            />
                          )}

                          {/* Admin Strokeplay Scorecard Editor - Only show for admin users */}
                          {selectedTournament.tournament_format === 'stroke_play' && (currentUser?.role === 'admin' || isSuperAdmin) && (
                            <div className="mt-8">
                              <div className="border-t border-neutral-200 pt-6">
                                <AdminStrokeplayScorecardEditor
                                  tournamentId={selectedTournament.id}
                                  tournamentName={selectedTournament.name}
                                  onScorecardUpdated={handleScoreSubmitted}
                                />
                              </div>
                            </div>
                          )}

                          {/* Par3 Match Play Scoring */}
                          {selectedTournament.tournament_format === 'par3_match_play' && (
                            <NewWeeklyScoring
                              tournamentId={selectedTournament.id}
                              tournamentName={selectedTournament.name}
                              onScoreSubmitted={handleScoreSubmitted}
                            />
                          )}

                          {/* Standard ScoreSubmission for other formats */}
                          {(!selectedTournament.tournament_format || 
                            (selectedTournament.tournament_format !== 'match_play' && selectedTournament.tournament_format !== 'stroke_play' && selectedTournament.tournament_format !== 'par3_match_play') || 
                            selectedTournament.hole_configuration !== '3') && (
                            <ScoreSubmission
                              tournamentId={selectedTournament.id}
                              tournamentMatches={tournamentMatches}
                              tournamentFormat={selectedTournament.tournament_format || 'match_play'}
                              onScoreSubmitted={handleScoreSubmitted}
                              requiresMatches={requiresMatches(selectedTournament.tournament_format || 'match_play')}
                              teams={tournamentTeams}
                              tournamentSettings={getFormatSpecificSettings(selectedTournament)}
                              courseId={selectedTournament.course_id}
                            />
                          )}

                          {/* Admin Scorecard Editor - Only show for admin users */}
                          {(currentUser?.role === 'admin' || isSuperAdmin) && (
                            <div className="mt-8">
                              <div className="border-t border-neutral-200 pt-6">
                                <AdminScorecardEditor
                                  tournamentId={selectedTournament.id}
                                  tournamentName={selectedTournament.name}
                                  weekStartDate={adminScorecardWeek || selectedTournament.week_start_date}
                                  onScorecardUpdated={handleScoreSubmitted}
                                />
                              </div>
                            </div>
                          )}

                          {/* Admin Matchplay Editor - Only show for admin users in matchplay tournaments */}
                          {(currentUser?.role === 'admin' || isSuperAdmin) && 
                           selectedTournament.tournament_format === 'match_play' && 
                           selectedTournament.hole_configuration !== '3' && (
                            <div className="mt-8">
                              <div className="border-t border-neutral-200 pt-6">
                                <AdminMatchplayEditor
                                  tournamentId={selectedTournament.id}
                                  tournamentName={selectedTournament.name}
                                  onMatchUpdated={handleScoreSubmitted}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {activeTab === 'leaderboard' && !(selectedTournament.type === 'club_championship' || selectedTournament.type === 'national_championship') && (
                        <div className="space-y-6">
                          {/* Custom Matchplay Leaderboard for 3-hole tournaments */}
                          {selectedTournament.tournament_format === 'match_play' && 
                           selectedTournament.hole_configuration === '3' && (
                            <div className="bg-white rounded-xl p-6 border border-neutral-200">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-2">
                                  <Trophy className="w-6 h-6 text-brand-neon-green" />
                                  <h4 className="text-xl font-semibold text-brand-black">3-Hole Matchplay Leaderboard</h4>
                                </div>
                                <button
                                  onClick={handleScoreSubmitted}
                                  className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
                                >
                                  Refresh
                                </button>
                              </div>

                              {/* Matchplay Standings */}
                              <div className="space-y-4">
                                {(() => {
                                  // Calculate player standings based on completed matches
                                  const completedMatches = tournamentMatches.filter(m => m.status === 'completed');
                                  const playerStats = new Map();

                                  // Initialize player stats
                                  tournamentParticipants.forEach(participant => {
                                    playerStats.set(participant.user_member_id, {
                                      player_id: participant.user_member_id,
                                      first_name: participant.first_name,
                                      last_name: participant.last_name,
                                      club: participant.club,
                                      matches_played: 0,
                                      wins: 0,
                                      losses: 0,
                                      ties: 0,
                                      points: 0,
                                      total_score: 0,
                                      avg_score: 0
                                    });
                                  });

                                  // Calculate stats from completed matches
                                  completedMatches.forEach(match => {
                                    const player1Stats = playerStats.get(match.player1_id);
                                    const player2Stats = playerStats.get(match.player2_id);

                                    if (player1Stats && player2Stats) {
                                      // Count matches played
                                      player1Stats.matches_played++;
                                      player2Stats.matches_played++;

                                      // Determine winner and update stats
                                      if (match.winner_id === match.player1_id) {
                                        player1Stats.wins++;
                                        player1Stats.points += 3; // 3 points for win
                                        player2Stats.losses++;
                                        player2Stats.points += 0; // 0 points for loss
                                      } else if (match.winner_id === match.player2_id) {
                                        player2Stats.wins++;
                                        player2Stats.points += 3; // 3 points for win
                                        player1Stats.losses++;
                                        player1Stats.points += 0; // 0 points for loss
                                      } else {
                                        // Tie
                                        player1Stats.ties++;
                                        player1Stats.points += 1; // 1 point for tie
                                        player2Stats.ties++;
                                        player2Stats.points += 1; // 1 point for tie
                                      }
                                    }
                                  });

                                  // Convert to array and sort by points, then wins, then avg score
                                  const standings = Array.from(playerStats.values())
                                    .filter(player => player.matches_played > 0)
                                    .sort((a, b) => {
                                      // Sort by points (descending)
                                      if (b.points !== a.points) return b.points - a.points;
                                      // If points tied, sort by wins (descending)
                                      if (b.wins !== a.wins) return b.wins - a.wins;
                                      // If wins tied, sort by win percentage
                                      const aWinRate = a.matches_played > 0 ? a.wins / a.matches_played : 0;
                                      const bWinRate = b.matches_played > 0 ? b.wins / b.matches_played : 0;
                                      return bWinRate - aWinRate;
                                    });

                                  if (standings.length === 0) {
                                    return (
                                      <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                                          <Trophy className="w-8 h-8 text-neutral-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-neutral-900 mb-2">No matches completed yet</h3>
                                        <p className="text-neutral-600">
                                          Complete some matches to see the leaderboard.
                                        </p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                                        <thead className="bg-neutral-50">
                                          <tr>
                                            <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Position</th>
                                            <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Player</th>
                                            <th className="border border-neutral-300 px-4 py-3 text-center font-medium">Points</th>
                                            <th className="border border-neutral-300 px-4 py-3 text-center font-medium">W</th>
                                            <th className="border border-neutral-300 px-4 py-3 text-center font-medium">L</th>
                                            <th className="border border-neutral-300 px-4 py-3 text-center font-medium">T</th>
                                            <th className="border border-neutral-300 px-4 py-3 text-center font-medium">Matches</th>
                                            <th className="border border-neutral-300 px-4 py-3 text-center font-medium">Win %</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {standings.map((player, index) => {
                                            const winRate = player.matches_played > 0 ? (player.wins / player.matches_played * 100).toFixed(1) : '0.0';
                                            const isLeader = index === 0;
                                            
                                            return (
                                              <tr key={player.player_id} className={`hover:bg-neutral-50 ${isLeader ? 'bg-yellow-50' : ''}`}>
                                                <td className="border border-neutral-300 px-4 py-3">
                                                  <div className="flex items-center space-x-2">
                                                    {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                                                    {index === 1 && <Award className="w-5 h-5 text-gray-400" />}
                                                    {index === 2 && <Award className="w-5 h-5 text-amber-600" />}
                                                    <span className="font-medium text-neutral-600">
                                                      {index + 1}
                                                    </span>
                                                  </div>
                                                </td>
                                                <td className="border border-neutral-300 px-4 py-3">
                                                  <div>
                                                    <div className="font-medium text-brand-black">
                                                      {player.first_name} {player.last_name}
                                                    </div>
                                                    <div className="text-sm text-neutral-600">
                                                      {player.club}
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="border border-neutral-300 px-4 py-3 text-center">
                                                  <span className="font-bold text-lg text-brand-black">
                                                    {player.points}
                                                  </span>
                                                </td>
                                                <td className="border border-neutral-300 px-4 py-3 text-center">
                                                  <span className="font-medium text-green-600">
                                                    {player.wins}
                                                  </span>
                                                </td>
                                                <td className="border border-neutral-300 px-4 py-3 text-center">
                                                  <span className="font-medium text-red-600">
                                                    {player.losses}
                                                  </span>
                                                </td>
                                                <td className="border border-neutral-300 px-4 py-3 text-center">
                                                  <span className="font-medium text-blue-600">
                                                    {player.ties}
                                                  </span>
                                                </td>
                                                <td className="border border-neutral-300 px-4 py-3 text-center">
                                                  <span className="font-medium text-neutral-600">
                                                    {player.matches_played}
                                                  </span>
                                                </td>
                                                <td className="border border-neutral-300 px-4 py-3 text-center">
                                                  <span className="font-medium text-neutral-600">
                                                    {winRate}%
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Match Results Summary */}
                              {(() => {
                                const completedMatches = tournamentMatches.filter(m => m.status === 'completed');
                                if (completedMatches.length === 0) return null;

                                return (
                                  <div className="mt-8">
                                    <h5 className="text-lg font-semibold text-brand-black mb-4">Recent Match Results</h5>
                                    <div className="space-y-4">
                                      {completedMatches.slice(-6).reverse().map(match => {
                                        // Parse holes data if available
                                        let holes = [];
                                        if (match.scores) {
                                          // Debug: Log the scores structure
                                          console.log('Match scores structure:', match.scores);
                                          
                                          if (match.scores.holes) {
                                            if (typeof match.scores.holes === 'string') {
                                              try {
                                                holes = JSON.parse(match.scores.holes);
                                              } catch (e) {
                                                console.error('Error parsing holes data:', e);
                                              }
                                            } else if (Array.isArray(match.scores.holes)) {
                                              holes = match.scores.holes;
                                            }
                                          } else if (match.scores.player1_score && match.scores.player2_score) {
                                            // If no holes array but we have total scores, create a summary
                                            holes = [{
                                              hole: 'Total',
                                              player1: match.scores.player1_score,
                                              player2: match.scores.player2_score
                                            }];
                                          }
                                        }

                                        return (
                                          <div key={match.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                                            {/* Match Header */}
                                            <div className="bg-gradient-to-r from-blue-50 to-green-50 px-4 py-3 border-b border-neutral-200">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  <span className="text-sm font-medium text-neutral-600">Match #{match.match_number}</span>
                                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                    Completed
                                                  </span>
                                                </div>
                                                <div className="text-sm text-neutral-500">
                                                  {match.updated_at ? new Date(match.updated_at).toLocaleDateString() : 
                                                   match.created_at ? new Date(match.created_at).toLocaleDateString() : 
                                                   'Date not available'}
                                                </div>
                                              </div>
                                              <div className="mt-2 space-y-1">
                                                <div className="text-sm">
                                                  <span className="font-medium">{match.player1_first_name} {match.player1_last_name}</span>
                                                  <span className="text-neutral-500 ml-2">vs</span>
                                                  <span className="font-medium">{match.player2_first_name} {match.player2_last_name}</span>
                                                </div>
                                                {match.winner_first_name && (
                                                  <div className="text-sm font-medium text-green-600">
                                                    Winner: {match.winner_first_name} {match.winner_last_name}
                                                  </div>
                                                )}
                                                <div className="text-sm text-neutral-600">
                                                  Final Score: {match.scores?.player1_score || match.player1_score} - {match.scores?.player2_score || match.player2_score}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Hole-by-Hole Scores */}
                                            {holes.length > 0 && (
                                              <div className="p-4 bg-white">
                                                <div className="text-sm font-medium text-neutral-700 mb-3">Hole-by-Hole Scores:</div>
                                                <div className="overflow-x-auto">
                                                  <table className="w-full text-xs border border-neutral-200 rounded">
                                                    <thead className="bg-neutral-50">
                                                      <tr>
                                                        <th className="px-2 py-1 text-center font-medium text-neutral-600 border-b">Hole</th>
                                                        <th className="px-2 py-1 text-center font-medium text-neutral-600 border-b">{match.player1_first_name}</th>
                                                        <th className="px-2 py-1 text-center font-medium text-neutral-600 border-b">{match.player2_first_name}</th>
                                                        <th className="px-2 py-1 text-center font-medium text-neutral-600 border-b">Winner</th>
                                                        <th className="px-2 py-1 text-center font-medium text-neutral-600 border-b">Score</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                                                                                                                                   {holes.map((hole: any, holeIndex: number) => {
                                                        const player1Score = hole.player1 || hole.player1_score || 0;
                                                        const player2Score = hole.player2 || hole.player2_score || 0;
                                                        const holeWinner = player1Score < player2Score ? match.player1_first_name : 
                                                                         player1Score > player2Score ? match.player2_first_name : 'Tie';
                                                        const scoreDiff = Math.abs(player1Score - player2Score);
                                                        
                                                        return (
                                                          <tr key={holeIndex} className="border-b border-neutral-100">
                                                            <td className="px-2 py-1 text-center font-medium text-neutral-600">
                                                              {hole.hole || holeIndex + 1}
                                                            </td>
                                                            <td className={`px-2 py-1 text-center ${player1Score < player2Score ? 'text-green-600 font-semibold' : ''}`}>
                                                              {player1Score || '-'}
                                                            </td>
                                                            <td className={`px-2 py-1 text-center ${player2Score < player1Score ? 'text-green-600 font-semibold' : ''}`}>
                                                              {player2Score || '-'}
                                                            </td>
                                                            <td className={`px-2 py-1 text-center text-xs ${holeWinner === 'Tie' ? 'text-neutral-500' : 'text-green-600 font-medium'}`}>
                                                              {holeWinner}
                                                            </td>
                                                            <td className="px-2 py-1 text-center text-xs text-neutral-500">
                                                              {scoreDiff > 0 ? `+${scoreDiff}` : 'AS'}
                                                            </td>
                                                          </tr>
                                                        );
                                                      })}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Fallback if no hole data */}
                                            {holes.length === 0 && (
                                              <div className="p-4 bg-white text-sm text-neutral-500">
                                                <div className="flex items-center justify-center space-x-2">
                                                  <span>📊</span>
                                                  <span>Hole-by-hole scores not available for this match</span>
                                                </div>
                                                <div className="text-xs text-neutral-400 mt-1 text-center">
                                                  Only total scores are recorded for this match
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Par3 Weekly Leaderboard */}
                          {selectedTournament.tournament_format === 'par3_match_play' && (
                            <NewWeeklyLeaderboard
                              tournamentId={selectedTournament.id}
                              tournamentName={selectedTournament.name}
                              weekStartDate={selectedTournament.week_start_date}
                              tournamentStartDate={selectedTournament.start_date}
                              tournamentEndDate={selectedTournament.end_date}
                            />
                          )}

                          {/* Standard TournamentLeaderboard for other formats */}
                          {(!selectedTournament.tournament_format || 
                            selectedTournament.tournament_format !== 'match_play' || 
                            selectedTournament.hole_configuration !== '3') &&
                             selectedTournament.tournament_format !== 'par3_match_play' && (
                             selectedTournament.tournament_format === 'stroke_play' ? (
                               <StrokeplayLeaderboard
                                 tournamentId={selectedTournament.id}
                                 tournamentFormat={selectedTournament.tournament_format}
                                 courseId={selectedTournament.course_id}
                                 onRefresh={handleScoreSubmitted}
                                 tournamentInfo={{
                                   name: selectedTournament.name,
                                   description: selectedTournament.description,
                                   start_date: selectedTournament.start_date,
                                   course_name: selectedTournament.course
                                 }}
                                 tournamentSettings={getFormatSpecificSettings(selectedTournament)}
                               />
                             ) : (
                               <TournamentLeaderboard
                                 tournamentId={selectedTournament.id}
                                 tournamentFormat={selectedTournament.tournament_format || 'match_play'}
                                 onRefresh={handleScoreSubmitted}
                                 courseId={selectedTournament.course_id}
                                 tournamentSettings={getFormatSpecificSettings(selectedTournament)}
                               />
                             )
                           )}
                         </div>
                       )}
                      
                      {activeTab === 'championship' && (
                        <ChampionshipAdminDashboard
                          tournamentId={selectedTournament.id}
                          tournamentName={selectedTournament.name}
                          tournamentParticipants={tournamentParticipants}
                          tournamentMatches={tournamentMatches}
                          tournamentCourse={selectedTournament.course}
                          tournamentCourseId={selectedTournament.course_id}
                          tournament={selectedTournament}
                          onDataRefresh={() => {
                            // Refresh tournament data
                            if (selectedTournament) {
                              getTournamentParticipants(selectedTournament.id).then(response => setTournamentParticipants(response.data));
                              getTournamentMatches(selectedTournament.id).then(response => setTournamentMatches(response.data));
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Form Modals */}
      {showTournamentForm && (
        <TournamentForm
          mode="create"
          onSuccess={handleTournamentFormSuccess}
          onCancel={() => setShowTournamentForm(false)}
          currentUser={currentUser}
        />
      )}

      {editingTournament && (
        <TournamentForm
          mode="edit"
          tournament={editingTournament}
          onSuccess={handleTournamentFormSuccess}
          onCancel={() => setEditingTournament(null)}
          currentUser={currentUser}
        />
      )}

      {/* Custom Matchplay Scoring Modal */}
      {showMatchplayScoringModal && selectedMatchplayMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-brand-black">
                3-Hole Matchplay Scoring - Match #{selectedMatchplayMatch.match_number}
              </h3>
              <button
                onClick={() => setShowMatchplayScoringModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Match Info */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4 text-center">Match Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h5 className="font-medium text-neutral-700 mb-3 flex items-center">
                      <Target className="w-5 h-5 text-blue-600 mr-2" />
                      Player 1
                    </h5>
                    <p className="text-sm text-neutral-600 font-medium">
                      {selectedMatchplayMatch.player1_first_name} {selectedMatchplayMatch.player1_last_name}
                    </p>
                    <p className="text-xs text-neutral-500">{selectedMatchplayMatch.player1_club}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h5 className="font-medium text-neutral-700 mb-3 flex items-center">
                      <Target className="w-5 h-5 text-green-600 mr-2" />
                      Player 2
                    </h5>
                    <p className="text-sm text-neutral-600 font-medium">
                      {selectedMatchplayMatch.player2_first_name} {selectedMatchplayMatch.player2_last_name}
                    </p>
                    <p className="text-xs text-neutral-500">{selectedMatchplayMatch.player2_club}</p>
                  </div>
                </div>
              </div>

              {/* Hole-by-Hole Scoring */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4">Hole-by-Hole Scores</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Hole</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Par</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          {selectedMatchplayMatch.player1_first_name}
                        </th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          {selectedMatchplayMatch.player2_first_name}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map((hole, index) => (
                        <tr key={hole} className="hover:bg-neutral-50">
                          <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                            {hole}
                          </td>
                          <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-500">
                            {selectedTournament.tee === 'Par 3' ? '3' : '4'}
                          </td>
                          <td className="border border-neutral-300 px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={matchplayScoreForm.player1Holes[index]}
                              onChange={e => handleMatchplayHoleScoreChange(index, 'player1', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-brand-neon-green focus:border-transparent text-center"
                              placeholder="-"
                            />
                          </td>
                          <td className="border border-neutral-300 px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={matchplayScoreForm.player2Holes[index]}
                              onChange={e => handleMatchplayHoleScoreChange(index, 'player2', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-brand-neon-green focus:border-transparent text-center"
                              placeholder="-"
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-neutral-100 font-semibold">
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          Total
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          {selectedTournament.tee === 'Par 3' ? '9' : '12'}
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-brand-black">
                          {matchplayScoreForm.player1Total || '0'}
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-brand-black">
                          {matchplayScoreForm.player2Total || '0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Winner Display */}
              {matchplayScoreForm.player1Total && matchplayScoreForm.player2Total && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-brand-black mb-4 text-center">Match Result</h4>
                  <div className="text-center">
                    {parseInt(matchplayScoreForm.player1Total) < parseInt(matchplayScoreForm.player2Total) ? (
                      <div className="text-green-600 font-semibold">
                        <Award className="w-8 h-8 mx-auto mb-2" />
                        {selectedMatchplayMatch.player1_first_name} {selectedMatchplayMatch.player1_last_name} wins!
                      </div>
                    ) : parseInt(matchplayScoreForm.player1Total) > parseInt(matchplayScoreForm.player2Total) ? (
                      <div className="text-green-600 font-semibold">
                        <Award className="w-8 h-8 mx-auto mb-2" />
                        {selectedMatchplayMatch.player2_first_name} {selectedMatchplayMatch.player2_last_name} wins!
                      </div>
                    ) : (
                      <div className="text-blue-600 font-semibold">
                        <Target className="w-8 h-8 mx-auto mb-2" />
                        Match tied!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMatchplayScoringModal(false)}
                  className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMatchplayScoreSubmit}
                  disabled={!matchplayScoreForm.player1Total || !matchplayScoreForm.player2Total}
                  className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Match Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManagement; 