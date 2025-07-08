import React, { useState, useEffect } from 'react';
import { Trophy, Users, Target, Award, Crown, CheckCircle } from 'lucide-react';
import { updateTournamentMatch, submitTeamScore, getSimulatorCourses, getTeamScores } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';

interface Match {
  id: number;
  match_number: number;
  player1_id: number;
  player1_first_name: string;
  player1_last_name: string;
  player1_club: string;
  player2_id: number;
  player2_first_name: string;
  player2_last_name: string;
  player2_club: string;
  status: 'pending' | 'completed';
  winner_id?: number;
  winner_first_name?: string;
  winner_last_name?: string;
}

interface Player {
  user_member_id: number;
  first_name: string;
  last_name: string;
  club: string;
  email: string;
}

interface Team {
  id: string;
  name: string;
  captain: Player;
  players: Player[];
  maxPlayers: number;
}

interface ScoreSubmissionProps {
  tournamentId: number;
  tournamentMatches: Match[];
  tournamentFormat: string;
  onScoreSubmitted: () => void;
  requiresMatches?: boolean;
  teams?: Team[];
  tournamentSettings?: any;
  courseId?: number;
}

interface CourseData {
  id: number;
  name: string;
  par_values?: number[];
  location?: string;
  designer?: string;
}

// Helper function to get format-specific scoring information
const getFormatScoringInfo = (format: string) => {
  switch (format) {
    case 'scramble':
      return {
        title: 'Scramble Scoring',
        description: 'Team captains submit final team scores. All players hit, best shot is selected.',
        requiresTeams: true,
        scoringMethod: 'team_total'
      };
    case 'best_ball':
      return {
        title: 'Best Ball Scoring',
        description: 'Best score on each hole from team members counts toward team total.',
        requiresTeams: true,
        scoringMethod: 'best_ball'
      };
    case 'match_play':
      return {
        title: 'Match Play Scoring',
        description: 'Head-to-head matches. Win holes to win matches. Ties result in halved holes.',
        requiresTeams: false,
        scoringMethod: 'match_play'
      };
    case 'stroke_play':
      return {
        title: 'Stroke Play Scoring',
        description: 'Individual competition. Lowest total score wins.',
        requiresTeams: false,
        scoringMethod: 'individual_total'
      };
    case 'stableford':
      return {
        title: 'Stableford Scoring',
        description: 'Points awarded based on score relative to par. Highest total points wins.',
        requiresTeams: false,
        scoringMethod: 'stableford_points'
      };
    default:
      return {
        title: 'Tournament Scoring',
        description: 'Standard tournament scoring format.',
        requiresTeams: false,
        scoringMethod: 'standard'
      };
  }
};

const ScoreSubmission: React.FC<ScoreSubmissionProps> = ({
  tournamentId,
  tournamentMatches,
  tournamentFormat,
  onScoreSubmitted,
  requiresMatches = true,
  teams = [],
  tournamentSettings,
  courseId
}) => {
  const { user } = useAuth();
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [teamScores, setTeamScores] = useState<any[]>([]);
  const [teamScoresLoading, setTeamScoresLoading] = useState(false);
  const scoringInfo = getFormatScoringInfo(tournamentFormat);
  
  // Fetch course data if courseId is provided
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) return;
      
      try {
        setCourseLoading(true);
        const response = await getSimulatorCourses('', '', 1000);
        const course = response.data.courses?.find((c: any) => c.id === courseId);
        if (course) {
          setCourseData(course);
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setCourseLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  // Fetch team scores for team-based tournaments
  useEffect(() => {
    const fetchTeamScores = async () => {
      if (!scoringInfo.requiresTeams || teams.length === 0) return;
      
      try {
        setTeamScoresLoading(true);
        const response = await getTeamScores(tournamentId);
        setTeamScores(response.data || []);
      } catch (error) {
        console.error('Error fetching team scores:', error);
      } finally {
        setTeamScoresLoading(false);
      }
    };

    fetchTeamScores();
  }, [tournamentId, teams, scoringInfo.requiresTeams]);
  
  // Get tournament-specific settings
  const getTournamentSettings = () => {
    if (tournamentSettings) {
      return {
        teamSize: tournamentSettings.teamSize || 4,
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
    return {
      teamSize: 4,
      holeConfiguration: '18',
      tee: 'Red',
      pins: 'Friday',
      puttingGimme: '8',
      elevation: 'Course',
      stimp: '11',
      mulligan: 'No',
      gamePlay: 'Force Realistic',
      firmness: 'Normal',
      wind: 'None',
      handicapEnabled: false
    };
  };
  
  const tournamentSettingsData = getTournamentSettings();
  
  // Get the number of holes and starting hole from tournament settings
  const getHoleConfiguration = () => {
    const holeConfig = tournamentSettingsData.holeConfiguration;
    
    // Check for 9-hole configurations
    if (holeConfig === '9' || holeConfig === '9_front') {
      return { holeCount: 9, startHole: 1 };
    }
    if (holeConfig === '9_back') {
      return { holeCount: 9, startHole: 10 };
    }
    // Check for 18-hole configurations
    if (holeConfig === '18') {
      return { holeCount: 18, startHole: 1 };
    }
    // Default to 18 if not specified
    return { holeCount: 18, startHole: 1 };
  };
  
  const { holeCount, startHole } = getHoleConfiguration();
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showIndividualScoreModal, setShowIndividualScoreModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [scoreForm, setScoreForm] = useState({
    player1Score: '',
    player2Score: '',
    holes: Array(holeCount).fill('').map((_, i) => ({ hole: startHole + i, player1: '', player2: '' }))
  });
  const [individualScoreForm, setIndividualScoreForm] = useState({
    totalScore: '',
    holes: Array(holeCount).fill('').map((_, i) => ({ hole: startHole + i, score: '' }))
  });
  const [showTeamScoreModal, setShowTeamScoreModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamScoreForm, setTeamScoreForm] = useState({
    totalScore: '',
    holes: Array(holeCount).fill('').map((_, i) => ({ hole: startHole + i, score: '' }))
  });

  const handleScoreSubmit = async () => {
    if (!selectedMatch) return;

    try {
      // Determine winner based on score
      const player1Score = parseInt(scoreForm.player1Score);
      const player2Score = parseInt(scoreForm.player2Score);
      
      let winnerId = selectedMatch.player1_id;
      if (player2Score < player1Score) {
        winnerId = selectedMatch.player2_id;
      } else if (player1Score === player2Score) {
        // Handle tie - could be based on tournament format
        winnerId = selectedMatch.player1_id; // Default to player1 for ties
      }

      await updateTournamentMatch(selectedMatch.id, winnerId, {
        player1_score: player1Score,
        player2_score: player2Score,
        holes: scoreForm.holes
      });

      toast.success('Score submitted successfully');
      setShowScoreModal(false);
      setSelectedMatch(null);
      setScoreForm({
        player1Score: '',
        player2Score: '',
        holes: Array(holeCount).fill('').map((_, i) => ({ hole: startHole + i, player1: '', player2: '' }))
      });
      onScoreSubmitted();
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score');
    }
  };

  const handleIndividualScoreSubmit = async () => {
    if (!selectedPlayer) return;

    try {
      const totalScore = parseInt(individualScoreForm.totalScore);
      
      // For individual scoring, we'll need to create a new API endpoint
      // For now, we'll just show a success message
      console.log('Submitting individual score for player:', selectedPlayer, 'score:', totalScore);
      
      toast.success('Individual score submitted successfully');
      setShowIndividualScoreModal(false);
      setSelectedPlayer(null);
      setIndividualScoreForm({
        totalScore: '',
        holes: Array(holeCount).fill('').map((_, i) => ({ hole: startHole + i, score: '' }))
      });
      onScoreSubmitted();
    } catch (error) {
      console.error('Error submitting individual score:', error);
      toast.error('Failed to submit individual score');
    }
  };

  const handleTeamScoreSubmit = async () => {
    if (!selectedTeam) return;

    try {
      const totalScore = parseInt(teamScoreForm.totalScore);
      
      console.log('Submitting team score:', {
        tournamentId,
        teamId: selectedTeam.id,
        parsedTeamId: parseInt(selectedTeam.id),
        totalScore,
        current_user_id: user?.member_id,
        team_captain_id: selectedTeam.captain?.user_member_id,
        captainData: selectedTeam.captain,
        selectedTeam
      });
      
      // Submit team score to API
      const scoreData = {
        total_score: totalScore,
        hole_scores: teamScoreForm.holes.map(hole => ({
          hole: hole.hole,
          score: parseInt(hole.score) || 0
        })),
        submitted_by: user?.member_id || 0
      };
      
      console.log('Sending score data:', scoreData);
      
      await submitTeamScore(tournamentId, parseInt(selectedTeam.id), scoreData);
      
      toast.success(`Team "${selectedTeam.name}" score submitted successfully`);
      setShowTeamScoreModal(false);
      setSelectedTeam(null);
      setTeamScoreForm({
        totalScore: '',
        holes: Array(holeCount).fill('').map((_, i) => ({ hole: startHole + i, score: '' }))
      });
      
      // Refresh team scores
      try {
        const response = await getTeamScores(tournamentId);
        setTeamScores(response.data || []);
      } catch (error) {
        console.error('Error refreshing team scores:', error);
      }
      
      onScoreSubmitted();
    } catch (error: any) {
      console.error('Error submitting team score:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to submit team score');
    }
  };

  const handleHoleScoreChange = (holeIndex: number, player: 'player1' | 'player2', value: string) => {
    const newHoles = [...scoreForm.holes];
    newHoles[holeIndex] = { ...newHoles[holeIndex], [player]: value };
    setScoreForm({ ...scoreForm, holes: newHoles });
  };

  const handleIndividualHoleScoreChange = (holeIndex: number, value: string) => {
    const newHoles = [...individualScoreForm.holes];
    newHoles[holeIndex] = { ...newHoles[holeIndex], score: value };
    setIndividualScoreForm({ ...individualScoreForm, holes: newHoles });
  };

  const handleTeamHoleScoreChange = (holeIndex: number, value: string) => {
    const newHoles = [...teamScoreForm.holes];
    newHoles[holeIndex] = { ...newHoles[holeIndex], score: value };
    setTeamScoreForm({ ...teamScoreForm, holes: newHoles });
  };

  const calculateTotalScore = (player: 'player1' | 'player2') => {
    return scoreForm.holes.reduce((total, hole) => {
      const score = parseInt(hole[player]) || 0;
      return total + score;
    }, 0);
  };

  const calculateIndividualTotalScore = () => {
    return individualScoreForm.holes.reduce((total, hole) => {
      const score = parseInt(hole.score) || 0;
      return total + score;
    }, 0);
  };

  const calculateTeamTotalScore = () => {
    return teamScoreForm.holes.reduce((total, hole) => {
      const score = parseInt(hole.score) || 0;
      return total + score;
    }, 0);
  };

  const getPendingMatches = () => {
    return tournamentMatches.filter(match => match.status === 'pending');
  };

  const getCompletedMatches = () => {
    return tournamentMatches.filter(match => match.status === 'completed');
  };

  const hasTeamSubmittedScore = (teamId: string) => {
    return teamScores.some(score => score.team_id.toString() === teamId);
  };

  const getTeamScore = (teamId: string) => {
    return teamScores.find(score => score.team_id.toString() === teamId);
  };

  return (
    <div className="space-y-6">
      {/* Score Submission Overview */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {requiresMatches ? (
              <>
                <span className="text-sm text-neutral-600">
                  {getCompletedMatches().length} scored
                </span>
                <span className="text-sm text-neutral-600">
                  / {tournamentMatches.length} total
                </span>
              </>
            ) : null}
          </div>
        </div>



        {/* Score Progress */}
        {requiresMatches && tournamentMatches.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-neutral-600 mb-2">
              <span>Score Submission Progress</span>
              <span>
                {tournamentMatches.length > 0 
                  ? Math.round((getCompletedMatches().length / tournamentMatches.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${tournamentMatches.length > 0 
                    ? (getCompletedMatches().length / tournamentMatches.length) * 100
                    : 0}%`,
                  background: '#22c55e'
                }}
              />
            </div>
          </div>
        )}

        {requiresMatches ? (
          <>
            {/* Pending Matches for Score Submission */}
            {getPendingMatches().length > 0 && (
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-brand-black mb-4">Pending Score Submissions</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getPendingMatches().map(match => (
                    <div
                      key={match.id}
                      className="p-4 border border-neutral-200 rounded-lg hover:border-brand-neon-green transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedMatch(match);
                        setShowScoreModal(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
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
                          Submit Score
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Matches */}
            {getCompletedMatches().length > 0 && (
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
                      {getCompletedMatches().map(match => (
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
          </>
        ) : (
          <>
                    {/* Team-based scoring for scramble/best_ball formats */}
        {!requiresMatches && scoringInfo.requiresTeams && teams.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-brand-black">Team Score Submission</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-neutral-600">
                  {teamScores.length} submitted
                </span>
                <span className="text-sm text-neutral-600">
                  / {teams.length} teams
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-neutral-600 mb-2">
                <span>Score Submission Progress</span>
                <span>
                  {teams.length > 0 
                    ? Math.round((teamScores.length / teams.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${teams.length > 0 
                      ? (teamScores.length / teams.length) * 100
                      : 0}%`,
                    background: '#22c55e'
                  }}
                />
              </div>
            </div>

            {/* Teams Grid - Matching TeamFormation style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams && teams.length > 0 && teams.map((team: Team) => {
                const hasSubmitted = hasTeamSubmittedScore(team.id);
                const teamScore = getTeamScore(team.id);
                
                return (
                  <div
                    key={team.id}
                    className={`bg-white border rounded-lg p-4 shadow-sm transition-colors ${
                      hasSubmitted 
                        ? 'border-green-300 bg-green-50 cursor-default' 
                        : 'border-neutral-200 hover:border-brand-neon-green cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!hasSubmitted) {
                        setSelectedTeam(team);
                        setShowTeamScoreModal(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h6 className="font-semibold text-brand-black">{team.name}</h6>
                      {hasSubmitted ? (
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            Submitted
                          </span>
                          {teamScore && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                              {teamScore.total_score}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button className="px-3 py-1 bg-brand-neon-green text-brand-black text-sm rounded hover:bg-green-400 transition-colors">
                          Submit Score
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {[team.captain, ...team.players].map((player, idx) => (
                        <div key={player.user_member_id} className="text-sm text-neutral-700 flex items-center">
                          {player.first_name} {player.last_name}
                          {player.user_member_id === team.captain.user_member_id && <Crown className="w-4 h-4 text-yellow-600 ml-1" />}
                        </div>
                      ))}
                    </div>
                    
                    {hasSubmitted && teamScore && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="text-xs text-green-700">
                          Submitted by: {teamScore.captain_first_name} {teamScore.captain_last_name}
                        </div>
                        <div className="text-xs text-green-600">
                          {teamScore.submitted_at ? (
                            (() => {
                              try {
                                // Remove microseconds from PostgreSQL timestamp
                                const cleanDate = teamScore.submitted_at.replace(/\.\d+$/, '');
                                return new Date(cleanDate).toLocaleString();
                              } catch (error) {
                                console.error('Date parsing error:', teamScore.submitted_at, error);
                                return 'Invalid Date';
                              }
                            })()
                          ) : 'Unknown'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}


          </>
        )}
      </div>

      {/* Score Submission Modal */}
      {showScoreModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-brand-black">
                Submit Score - Match #{selectedMatch.match_number}
              </h3>
              <button
                onClick={() => setShowScoreModal(false)}
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
                  <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-brand-black mb-2">
                      {selectedMatch.player1_first_name} {selectedMatch.player1_last_name}
                    </h5>
                    <p className="text-sm text-neutral-600">{selectedMatch.player1_club}</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <h5 className="font-semibold text-brand-black mb-2">
                      {selectedMatch.player2_first_name} {selectedMatch.player2_last_name}
                    </h5>
                    <p className="text-sm text-neutral-600">{selectedMatch.player2_club}</p>
                  </div>
                </div>
              </div>

              {/* Total Score Input */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4">Total Scores</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-2">
                      {selectedMatch.player1_first_name} Total Score
                    </label>
                    <input
                      type="number"
                      value={scoreForm.player1Score}
                      onChange={e => setScoreForm({ ...scoreForm, player1Score: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent text-center text-lg font-medium"
                      placeholder="Enter total score"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-2">
                      {selectedMatch.player2_first_name} Total Score
                    </label>
                    <input
                      type="number"
                      value={scoreForm.player2Score}
                      onChange={e => setScoreForm({ ...scoreForm, player2Score: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent text-center text-lg font-medium"
                      placeholder="Enter total score"
                    />
                  </div>
                </div>
              </div>

              {/* Hole-by-Hole Score (Optional) */}
              <div>
                <h4 className="text-lg font-semibold text-brand-black mb-4">Hole-by-Hole Scores (Optional)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Hole</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Par</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">{selectedMatch.player1_first_name}</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">{selectedMatch.player2_first_name}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreForm.holes.map((hole, index) => {
                        // Calculate the correct par value index based on hole configuration
                        const parValueIndex = startHole - 1 + index;
                        const parValue = courseData?.par_values?.[parValueIndex] || 4;
                        return (
                          <tr key={hole.hole} className="hover:bg-neutral-50">
                            <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                              {hole.hole}
                            </td>
                            <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-500">
                              {parValue}
                            </td>
                            <td className="border border-neutral-300 px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={hole.player1}
                                onChange={e => handleHoleScoreChange(index, 'player1', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-brand-neon-green focus:border-transparent text-center"
                                placeholder="-"
                              />
                            </td>
                            <td className="border border-neutral-300 px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={hole.player2}
                                onChange={e => handleHoleScoreChange(index, 'player2', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-brand-neon-green focus:border-transparent text-center"
                                placeholder="-"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-neutral-100 font-semibold">
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          Total
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          {courseData?.par_values ? 
                            courseData.par_values.slice(startHole - 1, startHole - 1 + holeCount).reduce((sum, par) => sum + par, 0) : 
                            (holeCount * 4)
                          }
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-brand-black">
                          {calculateTotalScore('player1')}
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-brand-black">
                          {calculateTotalScore('player2')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScoreModal(false)}
                  className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScoreSubmit}
                  disabled={!scoreForm.player1Score || !scoreForm.player2Score}
                  className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Score Submission Modal */}
      {showTeamScoreModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-brand-black">
                Submit Team Score - {selectedTeam.name}
              </h3>
              <button
                onClick={() => setShowTeamScoreModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Team Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4 text-center">Team Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <h5 className="font-medium text-neutral-700 mb-3 flex items-center">
                      <Crown className="w-5 h-5 text-yellow-600 mr-2" />
                      Captain
                    </h5>
                    <p className="text-sm text-neutral-600 font-medium">
                      {selectedTeam.captain?.first_name} {selectedTeam.captain?.last_name}
                    </p>
                    <p className="text-xs text-neutral-500">{selectedTeam.captain?.club}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-pink-200">
                    <h5 className="font-medium text-neutral-700 mb-3">Team Members</h5>
                    <div className="space-y-2">
                      {[selectedTeam.captain, ...(selectedTeam.players || [])].map((player, idx) => (
                        <div key={player.user_member_id} className="text-sm text-neutral-700 flex items-center">
                          <span className="w-2 h-2 bg-brand-neon-green rounded-full mr-2"></span>
                          {player.first_name} {player.last_name}
                          {player.user_member_id === selectedTeam.captain.user_member_id && <Crown className="w-4 h-4 text-yellow-600 ml-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Score Input */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4">Team Total Score</h4>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-2">
                    Team Total Score
                  </label>
                  <input
                    type="number"
                    value={teamScoreForm.totalScore}
                    onChange={e => setTeamScoreForm({ ...teamScoreForm, totalScore: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent text-center text-lg font-medium"
                    placeholder="Enter team total score"
                  />
                </div>
              </div>

              {/* Hole-by-Hole Score (Optional) */}
              <div>
                <h4 className="text-lg font-semibold text-brand-black mb-4">Hole-by-Hole Scores (Optional)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Hole</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Par</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Team Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamScoreForm.holes.map((hole, index) => {
                        // Calculate the correct par value index based on hole configuration
                        const parValueIndex = startHole - 1 + index;
                        const parValue = courseData?.par_values?.[parValueIndex] || 4;
                        return (
                          <tr key={hole.hole} className="hover:bg-neutral-50">
                            <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                              {hole.hole}
                            </td>
                            <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-500">
                              {parValue}
                            </td>
                            <td className="border border-neutral-300 px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={hole.score}
                                onChange={e => handleTeamHoleScoreChange(index, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-brand-neon-green focus:border-transparent text-center"
                                placeholder="-"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-neutral-100 font-semibold">
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          Total
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          {courseData?.par_values ? 
                            courseData.par_values.slice(startHole - 1, startHole - 1 + holeCount).reduce((sum, par) => sum + par, 0) : 
                            (holeCount * 4)
                          }
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-brand-black">
                          {calculateTeamTotalScore()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTeamScoreModal(false)}
                  className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTeamScoreSubmit}
                  disabled={!teamScoreForm.totalScore}
                  className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Team Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreSubmission; 