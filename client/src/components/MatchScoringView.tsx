import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, AlertCircle, Trophy, Users, Target, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

interface HoleScore {
  gross: number;
  net: number;
  par: number;
  strokes_received: number;
}

interface IndividualScore {
  id: number;
  matchup_id: number;
  lineup_id: number;
  team_id: number;
  player_id: number;
  player_name: string;
  assigned_holes: number[];
  hole_scores: { [hole: string]: HoleScore | undefined };
  gross_total: number;
  net_total: number;
  player_handicap: number;
  course_handicap: number;
  submitted_at: string;
}

interface AlternateShotScore {
  id: number;
  team_id: number;
  hole_scores: { [hole: string]: HoleScore | undefined };
  gross_total: number;
  net_total: number;
  team_handicap: number;
  team_course_handicap: number;
  submitted_at: string;
}

interface Lineup {
  id: number;
  team_id: number;
  team_name: string;
  player1_id: number;
  player1_name: string;
  player2_id: number;
  player2_name: string;
  player3_id: number;
  player3_name: string;
}

interface Matchup {
  id: number;
  week_number: number;
  team1_id: number;
  team1_name: string;
  team2_id: number;
  team2_name: string;
  course_name: string;
  status: string;
  team1_individual_net: number;
  team2_individual_net: number;
  team1_alternate_shot_net: number;
  team2_alternate_shot_net: number;
  team1_total_net: number;
  team2_total_net: number;
  winner_team_id: number;
}

interface MatchScoringViewProps {
  matchupId: number;
  onVerify?: () => void;
}

const MatchScoringView: React.FC<MatchScoringViewProps> = ({
  matchupId,
  onVerify
}) => {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [individualScores, setIndividualScores] = useState<IndividualScore[]>([]);
  const [alternateShotScores, setAlternateShotScores] = useState<AlternateShotScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatchupScores = async () => {
    try {
      // Mock data for demonstration
      const mockData = {
        matchup: {
          id: matchupId,
          week_number: 1,
          team1_id: 1,
          team1_name: "Eagle Hunters",
          team2_id: 2,
          team2_name: "Birdie Brigade",
          course_name: "Augusta National",
          status: "in_progress",
          team1_individual_net: 29,
          team2_individual_net: 31,
          team1_alternate_shot_net: 28,
          team2_alternate_shot_net: 30,
          team1_total_net: 57,
          team2_total_net: 61,
          winner_team_id: 1
        },
        lineups: [
          {
            id: 1,
            matchup_id: matchupId,
            team_id: 1,
            team_name: "Eagle Hunters",
            player1_id: 1,
            player1_name: "John Smith",
            player2_id: 2,
            player2_name: "Mike Johnson",
            player3_id: 3,
            player3_name: "Tom Wilson",
            player1_handicap: 12,
            player2_handicap: 15,
            player3_handicap: 18,
            week_number: 1,
            league_id: 1,
            is_locked: true,
            submitted_at: "2025-01-15T09:00:00Z",
            submitted_by: 1
          },
          {
            id: 2,
            matchup_id: matchupId,
            team_id: 2,
            team_name: "Birdie Brigade",
            player1_id: 4,
            player1_name: "Sarah Davis",
            player2_id: 5,
            player2_name: "Lisa Brown",
            player3_id: 6,
            player3_name: "Amy Taylor",
            player1_handicap: 10,
            player2_handicap: 14,
            player3_handicap: 16,
            week_number: 1,
            league_id: 1,
            is_locked: true,
            submitted_at: "2025-01-15T09:00:00Z",
            submitted_by: 4
          }
        ],
        individualScores: [
          {
            id: 1,
            matchup_id: matchupId,
            lineup_id: 1,
            team_id: 1,
            player_id: 1,
            player_name: "John Smith",
            assigned_holes: [1, 2, 3],
            hole_scores: {
              "1": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "2": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "3": { gross: 3, net: 2, par: 3, strokes_received: 1 }
            },
            gross_total: 12,
            net_total: 9,
            player_handicap: 12,
            course_handicap: 14,
            submitted_at: "2025-01-15T10:30:00Z"
          },
          {
            id: 2,
            matchup_id: matchupId,
            lineup_id: 1,
            team_id: 1,
            player_id: 2,
            player_name: "Mike Johnson",
            assigned_holes: [4, 5, 6],
            hole_scores: {
              "4": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "5": { gross: 6, net: 5, par: 5, strokes_received: 1 },
              "6": { gross: 3, net: 2, par: 3, strokes_received: 1 }
            },
            gross_total: 13,
            net_total: 10,
            player_handicap: 15,
            course_handicap: 17,
            submitted_at: "2025-01-15T10:35:00Z"
          },
          {
            id: 3,
            matchup_id: matchupId,
            lineup_id: 1,
            team_id: 1,
            player_id: 3,
            player_name: "Tom Wilson",
            assigned_holes: [7, 8, 9],
            hole_scores: {
              "7": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "8": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "9": { gross: 4, net: 3, par: 4, strokes_received: 1 }
            },
            gross_total: 13,
            net_total: 10,
            player_handicap: 18,
            course_handicap: 20,
            submitted_at: "2025-01-15T10:40:00Z"
          },
          {
            id: 4,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            player_id: 4,
            player_name: "Sarah Davis",
            assigned_holes: [1, 2, 3],
            hole_scores: {
              "1": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "2": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "3": { gross: 4, net: 3, par: 3, strokes_received: 1 }
            },
            gross_total: 13,
            net_total: 10,
            player_handicap: 10,
            course_handicap: 12,
            submitted_at: "2025-01-15T10:30:00Z"
          },
          {
            id: 5,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            player_id: 5,
            player_name: "Lisa Brown",
            assigned_holes: [4, 5, 6],
            hole_scores: {
              "4": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "5": { gross: 6, net: 5, par: 5, strokes_received: 1 },
              "6": { gross: 4, net: 3, par: 3, strokes_received: 1 }
            },
            gross_total: 15,
            net_total: 12,
            player_handicap: 14,
            course_handicap: 16,
            submitted_at: "2025-01-15T10:35:00Z"
          },
          {
            id: 6,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            player_id: 6,
            player_name: "Amy Taylor",
            assigned_holes: [7, 8, 9],
            hole_scores: {
              "7": { gross: 6, net: 5, par: 4, strokes_received: 1 },
              "8": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "9": { gross: 5, net: 4, par: 4, strokes_received: 1 }
            },
            gross_total: 16,
            net_total: 13,
            player_handicap: 16,
            course_handicap: 18,
            submitted_at: "2025-01-15T10:40:00Z"
          }
        ],
        alternateShotScores: [
          {
            id: 1,
            matchup_id: matchupId,
            lineup_id: 1,
            team_id: 1,
            hole_scores: {
              "10": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "11": { gross: 5, net: 4, par: 5, strokes_received: 1 },
              "12": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "13": { gross: 3, net: 2, par: 3, strokes_received: 1 },
              "14": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "15": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "16": { gross: 3, net: 2, par: 3, strokes_received: 1 },
              "17": { gross: 5, net: 4, par: 5, strokes_received: 1 },
              "18": { gross: 4, net: 3, par: 4, strokes_received: 1 }
            },
            gross_total: 37,
            net_total: 28,
            team_handicap: 15,
            team_course_handicap: 17,
            submitted_at: "2025-01-15T11:00:00Z"
          },
          {
            id: 2,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            hole_scores: {
              "10": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "11": { gross: 6, net: 5, par: 5, strokes_received: 1 },
              "12": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "13": { gross: 4, net: 3, par: 3, strokes_received: 1 },
              "14": { gross: 6, net: 5, par: 4, strokes_received: 1 },
              "15": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "16": { gross: 4, net: 3, par: 3, strokes_received: 1 },
              "17": { gross: 6, net: 5, par: 5, strokes_received: 1 },
              "18": { gross: 5, net: 4, par: 4, strokes_received: 1 }
            },
            gross_total: 46,
            net_total: 37,
            team_handicap: 13,
            team_course_handicap: 15,
            submitted_at: "2025-01-15T11:00:00Z"
          }
        ]
      };

      setMatchup(mockData.matchup);
      setLineups(mockData.lineups);
      setIndividualScores(mockData.individualScores);
      setAlternateShotScores(mockData.alternateShotScores);
    } catch (error) {
      console.error('Error fetching matchup scores:', error);
      toast.error('Failed to load matchup scores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatchupScores();
  }, [matchupId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMatchupScores();
  };

  const getTeamScores = (teamId: number) => {
    const teamIndividualScores = individualScores.filter(score => score.player_id === teamId);
    const teamAlternateShotScore = alternateShotScores.find(score => score.team_id === teamId);
    
    const individualNetTotal = teamIndividualScores.reduce((sum, score) => sum + score.net_total, 0);
    const alternateShotNetTotal = teamAlternateShotScore?.net_total || 0;
    const totalNet = individualNetTotal + alternateShotNetTotal;

    return {
      individualNetTotal,
      alternateShotNetTotal,
      totalNet,
      individualScores: teamIndividualScores,
      alternateShotScore: teamAlternateShotScore
    };
  };

  const getLeaderStatus = (teamId: number) => {
    if (!matchup) return 'tie';
    
    const team1Scores = getTeamScores(matchup.team1_id);
    const team2Scores = getTeamScores(matchup.team2_id);
    
    if (team1Scores.totalNet < team2Scores.totalNet) {
      return matchup.team1_id === teamId ? 'leading' : 'trailing';
    } else if (team2Scores.totalNet < team1Scores.totalNet) {
      return matchup.team2_id === teamId ? 'leading' : 'trailing';
    }
    return 'tie';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'leading': return 'text-green-600 bg-green-100';
      case 'trailing': return 'text-red-600 bg-red-100';
      case 'tie': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'leading': return <Trophy className="w-4 h-4" />;
      case 'trailing': return <AlertCircle className="w-4 h-4" />;
      case 'tie': return <Users className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
          <span className="text-gray-600">Loading matchup scores...</span>
        </div>
      </div>
    );
  }

  if (!matchup) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p>Matchup not found</p>
        </div>
      </div>
    );
  }

  const team1Scores = getTeamScores(matchup.team1_id);
  const team2Scores = getTeamScores(matchup.team2_id);
  const team1Status = getLeaderStatus(matchup.team1_id);
  const team2Status = getLeaderStatus(matchup.team2_id);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Match Scoring View</h2>
          <p className="text-gray-600">Week {matchup.week_number} • {matchup.course_name}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Match Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Eye className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-semibold text-gray-900">Match Status: </span>
            <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(matchup.status)}`}>
              {matchup.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          {matchup.winner_team_id && (
            <div className="flex items-center text-green-600">
              <Trophy className="w-5 h-5 mr-2" />
              <span className="font-semibold">
                Winner: {matchup.winner_team_id === matchup.team1_id ? matchup.team1_name : matchup.team2_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Team Scores Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Team 1 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">{matchup.team1_name}</h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(team1Status)}`}>
              {getStatusIcon(team1Status)}
              <span className="ml-1">{team1Status.toUpperCase()}</span>
            </div>
          </div>

          {/* Individual Scores */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Users className="w-4 h-4 text-blue-600 mr-2" />
              <span className="font-medium text-gray-900">Individual 9 Holes</span>
            </div>
            <div className="space-y-2">
              {team1Scores.individualScores.map(score => (
                <div key={score.id} className="flex justify-between items-center bg-white rounded p-2">
                  <span className="text-sm">{score.player_name}</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600">{score.net_total}</div>
                    <div className="text-xs text-gray-500">({score.gross_total})</div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center bg-blue-100 rounded p-2 font-semibold">
                <span>Individual Total</span>
                <span className="text-blue-600">{team1Scores.individualNetTotal}</span>
              </div>
            </div>
          </div>

          {/* Alternate Shot Scores */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Target className="w-4 h-4 text-green-600 mr-2" />
              <span className="font-medium text-gray-900">Alternate Shot 9 Holes</span>
            </div>
            {team1Scores.alternateShotScore ? (
              <div className="flex justify-between items-center bg-white rounded p-2">
                <span className="text-sm">Team Score</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">{team1Scores.alternateShotScore.net_total}</div>
                  <div className="text-xs text-gray-500">({team1Scores.alternateShotScore.gross_total})</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">No alternate shot scores submitted</div>
            )}
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center bg-gray-900 text-white rounded p-3 font-bold text-lg">
              <span>TOTAL NET</span>
              <span>{team1Scores.totalNet}</span>
            </div>
          </div>
        </div>

        {/* Team 2 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">{matchup.team2_name}</h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(team2Status)}`}>
              {getStatusIcon(team2Status)}
              <span className="ml-1">{team2Status.toUpperCase()}</span>
            </div>
          </div>

          {/* Individual Scores */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Users className="w-4 h-4 text-blue-600 mr-2" />
              <span className="font-medium text-gray-900">Individual 9 Holes</span>
            </div>
            <div className="space-y-2">
              {team2Scores.individualScores.map(score => (
                <div key={score.id} className="flex justify-between items-center bg-white rounded p-2">
                  <span className="text-sm">{score.player_name}</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600">{score.net_total}</div>
                    <div className="text-xs text-gray-500">({score.gross_total})</div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center bg-blue-100 rounded p-2 font-semibold">
                <span>Individual Total</span>
                <span className="text-blue-600">{team2Scores.individualNetTotal}</span>
              </div>
            </div>
          </div>

          {/* Alternate Shot Scores */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Target className="w-4 h-4 text-green-600 mr-2" />
              <span className="font-medium text-gray-900">Alternate Shot 9 Holes</span>
            </div>
            {team2Scores.alternateShotScore ? (
              <div className="flex justify-between items-center bg-white rounded p-2">
                <span className="text-sm">Team Score</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">{team2Scores.alternateShotScore.net_total}</div>
                  <div className="text-xs text-gray-500">({team2Scores.alternateShotScore.gross_total})</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-2">No alternate shot scores submitted</div>
            )}
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center bg-gray-900 text-white rounded p-3 font-bold text-lg">
              <span>TOTAL NET</span>
              <span>{team2Scores.totalNet}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Hole Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Hole Breakdown</h3>
        
        {/* Individual Holes (1-9) */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Individual Holes (1-9)</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Hole</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Par</th>
                  {team1Scores.individualScores.map(score => (
                    <th key={score.id} className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {score.player_name}
                    </th>
                  ))}
                  {team2Scores.individualScores.map(score => (
                    <th key={score.id} className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {score.player_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => (
                  <tr key={hole}>
                    <td className="border border-gray-300 px-3 py-2 font-medium">{hole}</td>
                    <td className="border border-gray-300 px-3 py-2">{4}</td>
                    {team1Scores.individualScores.map(score => {
                      const holeScore = score.hole_scores[hole.toString()];
                      return (
                        <td key={score.id} className="border border-gray-300 px-3 py-2 text-center">
                          {holeScore ? (
                            <div>
                              <div className="font-semibold text-blue-600">{holeScore.net || holeScore.gross}</div>
                              <div className="text-xs text-gray-500">({holeScore.gross})</div>
                            </div>
                          ) : '-'}
                        </td>
                      );
                    })}
                    {team2Scores.individualScores.map(score => {
                      const holeScore = score.hole_scores[hole.toString()];
                      return (
                        <td key={score.id} className="border border-gray-300 px-3 py-2 text-center">
                          {holeScore ? (
                            <div>
                              <div className="font-semibold text-blue-600">{holeScore.net || holeScore.gross}</div>
                              <div className="text-xs text-gray-500">({holeScore.gross})</div>
                            </div>
                          ) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alternate Shot Holes (10-18) */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Alternate Shot Holes (10-18)</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Hole</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Par</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{matchup.team1_name}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{matchup.team2_name}</th>
                </tr>
              </thead>
              <tbody>
                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => (
                  <tr key={hole}>
                    <td className="border border-gray-300 px-3 py-2 font-medium">{hole}</td>
                    <td className="border border-gray-300 px-3 py-2">{4}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {team1Scores.alternateShotScore?.hole_scores[hole.toString()] ? (
                        <div>
                          <div className="font-semibold text-green-600">
                            {team1Scores.alternateShotScore.hole_scores[hole.toString()]?.net || 
                             team1Scores.alternateShotScore.hole_scores[hole.toString()]?.gross}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({team1Scores.alternateShotScore.hole_scores[hole.toString()]?.gross})
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      {team2Scores.alternateShotScore?.hole_scores[hole.toString()] ? (
                        <div>
                          <div className="font-semibold text-green-600">
                            {team2Scores.alternateShotScore.hole_scores[hole.toString()]?.net || 
                             team2Scores.alternateShotScore.hole_scores[hole.toString()]?.gross}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({team2Scores.alternateShotScore.hole_scores[hole.toString()]?.gross})
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Verify Button */}
      {onVerify && (
        <div className="flex justify-center">
          <button
            onClick={onVerify}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-lg font-semibold"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Verify/Approve Scores
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchScoringView;
