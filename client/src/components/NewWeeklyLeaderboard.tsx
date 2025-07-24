import React, { useState, useEffect } from 'react';
import { Trophy, Users, TrendingUp, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { WeeklyLeaderboardEntry, WeeklyMatch, getWeeklyLeaderboard, getWeeklyMatches } from '../services/api';

interface WeeklyLeaderboardProps {
  tournamentId: number;
  tournamentName: string;
  weekStartDate?: string;
}

const NewWeeklyLeaderboard: React.FC<WeeklyLeaderboardProps> = ({
  tournamentId,
  tournamentName,
  weekStartDate
}) => {
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);
  const [playerMatches, setPlayerMatches] = useState<WeeklyMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Helper function to get week start date (Monday)
  const getWeekStartDate = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const currentWeek = weekStartDate || getWeekStartDate();

  useEffect(() => {
    fetchLeaderboard();
  }, [tournamentId, currentWeek]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWeeklyLeaderboard(tournamentId, currentWeek);
      setLeaderboard(response.data);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.response?.data?.error || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerMatches = async (userId: number) => {
    try {
      setMatchesLoading(true);
      const response = await getWeeklyMatches(tournamentId, userId, currentWeek);
      setPlayerMatches(response.data);
    } catch (err: any) {
      console.error('Error fetching player matches:', err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handlePlayerExpand = async (userId: number) => {
    if (expandedPlayer === userId) {
      setExpandedPlayer(null);
      setPlayerMatches([]);
    } else {
      setExpandedPlayer(userId);
      await fetchPlayerMatches(userId);
    }
  };

  const formatWeekDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getMatchResult = (match: WeeklyMatch, userId: number) => {
    if (match.player1_id === userId) {
      if (match.match_winner_id === userId) return 'W';
      if (match.match_winner_id === null) return 'T';
      return 'L';
    } else {
      if (match.match_winner_id === userId) return 'W';
      if (match.match_winner_id === null) return 'T';
      return 'L';
    }
  };

  const getMatchResultColor = (result: string) => {
    switch (result) {
      case 'W': return 'text-green-600 bg-green-100';
      case 'L': return 'text-red-600 bg-red-100';
      case 'T': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Weekly Leaderboard - {tournamentName}
        </h2>
        <p className="text-gray-600">
          Week of {formatWeekDate(currentWeek)}
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            No Scores Submitted Yet
          </h3>
          <p className="text-yellow-800">
            Be the first to submit your 9-hole scorecard for this week!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-1">Rank</div>
              <div className="col-span-3">Player</div>
              <div className="col-span-1 text-center">Hole Pts</div>
              <div className="col-span-1 text-center">Round Pts</div>
              <div className="col-span-1 text-center">Bonus</div>
              <div className="col-span-1 text-center">Total</div>
              <div className="col-span-2 text-center">Record</div>
              <div className="col-span-1 text-center">Live</div>
              <div className="col-span-1"></div>
            </div>
          </div>

          {/* Leaderboard Entries */}
          <div className="divide-y divide-gray-200">
            {leaderboard.map((player, index) => (
              <div key={player.user_id}>
                <div className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="col-span-3">
                      <div className="font-semibold text-gray-900">
                        {player.first_name} {player.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{player.club}</div>
                    </div>
                    
                    <div className="col-span-1 text-center">
                      <div className="text-lg font-semibold text-blue-600">
                        {Number(player.total_hole_points || 0).toFixed(1)}
                      </div>
                    </div>
                    
                    <div className="col-span-1 text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {Number(player.total_round_points || 0).toFixed(1)}
                      </div>
                    </div>
                    
                    <div className="col-span-1 text-center">
                      <div className="text-lg font-semibold text-purple-600">
                        {Number(player.total_match_bonus || 0).toFixed(1)}
                      </div>
                    </div>
                    
                    <div className="col-span-1 text-center">
                      <div className="text-xl font-bold text-gray-900">
                        {Number(player.total_score || 0).toFixed(1)}
                      </div>
                    </div>
                    
                    <div className="col-span-2 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{Number(player.matches_won || 0)}W</span>
                        <span className="text-gray-500">-</span>
                        <span className="font-semibold">{Number(player.matches_tied || 0)}T</span>
                        <span className="text-gray-500">-</span>
                        <span className="font-semibold">{Number(player.matches_lost || 0)}L</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        ({Number(player.matches_played || 0)} played)
                      </div>
                    </div>
                    
                    <div className="col-span-1 text-center">
                      {Number(player.live_matches_played || 0) > 0 ? (
                        <div className="flex items-center justify-center space-x-1">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
                            {Number(player.live_matches_played || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => handlePlayerExpand(player.user_id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedPlayer === player.user_id ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Match Details */}
                {expandedPlayer === player.user_id && (
                  <div className="bg-gray-50 px-6 py-4 border-t">
                    {matchesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : playerMatches.length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Match Details</h4>
                        <div className="space-y-3">
                          {playerMatches.map((match) => (
                            <div key={match.id} className="bg-white rounded-lg p-4 border">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center space-x-4">
                                  <div>
                                    <div className="font-semibold">
                                      {match.player1_id === player.user_id 
                                        ? `${match.player2_first_name} ${match.player2_last_name}`
                                        : `${match.player1_first_name} ${match.player1_last_name}`
                                      }
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {match.player1_id === player.user_id 
                                        ? match.player2_last_name
                                        : match.player1_last_name
                                      } Club
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getMatchResultColor(getMatchResult(match, player.user_id))}`}>
                                    {getMatchResult(match, player.user_id)}
                                  </span>
                                                                     {Number(match.match_live_bonus_player1 || 0) > 0 || Number(match.match_live_bonus_player2 || 0) > 0 ? (
                                     <Users className="w-4 h-4 text-green-600" />
                                   ) : null}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                                <div>
                                  <div className="text-gray-500">Hole Points</div>
                                  <div className="font-semibold text-blue-600">
                                    {match.player1_id === player.user_id 
                                      ? Number(match.hole_points_player1 || 0).toFixed(1)
                                      : Number(match.hole_points_player2 || 0).toFixed(1)
                                    }
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Round Points</div>
                                  <div className="font-semibold text-green-600">
                                    {match.player1_id === player.user_id 
                                      ? (Number(match.round1_points_player1 || 0) + Number(match.round2_points_player1 || 0) + Number(match.round3_points_player1 || 0)).toFixed(1)
                                      : (Number(match.round1_points_player2 || 0) + Number(match.round2_points_player2 || 0) + Number(match.round3_points_player2 || 0)).toFixed(1)
                                    }
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Live Bonus</div>
                                  <div className="font-semibold text-purple-600">
                                    {match.player1_id === player.user_id 
                                      ? Number(match.match_live_bonus_player1 || 0).toFixed(1)
                                      : Number(match.match_live_bonus_player2 || 0).toFixed(1)
                                    }
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Total</div>
                                  <div className="font-semibold text-gray-900">
                                    {match.player1_id === player.user_id 
                                      ? Number(match.total_points_player1 || 0).toFixed(1)
                                      : Number(match.total_points_player2 || 0).toFixed(1)
                                    }
                                  </div>
                                </div>
                              </div>
                              
                              {/* Match Details Table */}
                              <div className="mt-3">
                                <div className="text-xs font-semibold text-gray-700 mb-2">
                                  {match.player1_first_name} {match.player1_last_name} vs {match.player2_first_name} {match.player2_last_name}
                                </div>
                                
                                <div className="overflow-x-auto">
                                  <table className="w-full text-center border-separate border-spacing-0">
                                    <thead>
                                      <tr>
                                        <th className="border-b px-1 py-1 text-xs font-bold text-neutral-600">HOLE</th>
                                        {Array.from({ length: 9 }, (_, i) => (
                                          <th key={i} className="border-b px-1 py-1 text-xs font-bold text-neutral-600">{i + 1}</th>
                                        ))}
                                        <th className="border-b px-1 py-1 text-xs font-bold text-neutral-600">TOT</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* Player 1 Scores Row */}
                                      <tr>
                                        <td className="font-bold text-xs text-blue-600">{match.player1_first_name} {match.player1_last_name}</td>
                                        {Array.from({ length: 9 }, (_, i) => {
                                          const playerScore = Number(match.player1_scores?.[i] || 0);
                                          const opponentScore = Number(match.player2_scores?.[i] || 0);
                                          
                                          const bothPlayed = playerScore > 0 && opponentScore > 0;
                                          const playerWon = bothPlayed && playerScore < opponentScore;
                                          const opponentWon = bothPlayed && opponentScore < playerScore;
                                          const tied = bothPlayed && playerScore === opponentScore;
                                          
                                          let bgClass = '';
                                          if (bothPlayed) {
                                            if (playerWon) bgClass = 'bg-green-200 text-green-900'; // Birdie (win)
                                            else if (opponentWon) bgClass = 'bg-red-200 text-red-900'; // Bogey (loss)
                                            else bgClass = 'bg-yellow-200 text-yellow-900'; // Par (tie)
                                          }
                                          
                                          return (
                                            <td key={i} className={`font-bold text-xs px-1 py-1 rounded ${bgClass}`}>
                                              {playerScore > 0 ? playerScore : ''}
                                            </td>
                                          );
                                        })}
                                        <td className="font-bold text-xs text-blue-600">
                                          {(() => {
                                            let total = 0;
                                            for (let i = 0; i < 9; i++) {
                                              const score = Number(match.player1_scores?.[i] || 0);
                                              if (score > 0) total += score;
                                            }
                                            return total;
                                          })()}
                                        </td>
                                      </tr>
                                      
                                      {/* Player 2 Scores Row */}
                                      <tr>
                                        <td className="font-bold text-xs text-red-600">{match.player2_first_name} {match.player2_last_name}</td>
                                        {Array.from({ length: 9 }, (_, i) => {
                                          const playerScore = Number(match.player1_scores?.[i] || 0);
                                          const opponentScore = Number(match.player2_scores?.[i] || 0);
                                          
                                          const bothPlayed = playerScore > 0 && opponentScore > 0;
                                          const playerWon = bothPlayed && playerScore < opponentScore;
                                          const opponentWon = bothPlayed && opponentScore < playerScore;
                                          const tied = bothPlayed && playerScore === opponentScore;
                                          
                                          let bgClass = '';
                                          if (bothPlayed) {
                                            if (opponentWon) bgClass = 'bg-green-200 text-green-900'; // Birdie (win)
                                            else if (playerWon) bgClass = 'bg-red-200 text-red-900'; // Bogey (loss)
                                            else bgClass = 'bg-yellow-200 text-yellow-900'; // Par (tie)
                                          }
                                          
                                          return (
                                            <td key={i} className={`font-bold text-xs px-1 py-1 rounded ${bgClass}`}>
                                              {opponentScore > 0 ? opponentScore : ''}
                                            </td>
                                          );
                                        })}
                                        <td className="font-bold text-xs text-red-600">
                                          {(() => {
                                            let total = 0;
                                            for (let i = 0; i < 9; i++) {
                                              const score = Number(match.player2_scores?.[i] || 0);
                                              if (score > 0) total += score;
                                            }
                                            return total;
                                          })()}
                                        </td>
                                      </tr>
                                      
                                      {/* Hole Points Row */}
                                      <tr>
                                        <td className="font-bold text-xs text-blue-600">Hole Pts</td>
                                        {Array.from({ length: 9 }, (_, i) => {
                                          const playerScore = Number(match.player1_scores?.[i] || 0);
                                          const opponentScore = Number(match.player2_scores?.[i] || 0);
                                          
                                          const bothPlayed = playerScore > 0 && opponentScore > 0;
                                          const playerWon = bothPlayed && playerScore < opponentScore;
                                          const opponentWon = bothPlayed && opponentScore < playerScore;
                                          const tied = bothPlayed && playerScore === opponentScore;
                                          
                                          let points = 0;
                                          if (bothPlayed) {
                                            if (playerWon) points = 0.5;
                                            else if (tied) points = 0;
                                            else points = 0;
                                          }
                                          
                                          return (
                                            <td key={i} className="font-bold text-xs px-1 py-1 text-blue-600">
                                              {points > 0 ? Number(points).toFixed(1) : ''}
                                            </td>
                                          );
                                        })}
                                        <td className="font-bold text-xs text-blue-600">
                                          {match.player1_id === player.user_id 
                                            ? Number(match.hole_points_player1 || 0).toFixed(1)
                                            : Number(match.hole_points_player2 || 0).toFixed(1)
                                          }
                                        </td>
                                      </tr>
                                      
                                      {/* Round Points Row */}
                                      <tr>
                                        <td className="font-bold text-xs text-green-600">Round Pts</td>
                                        {Array.from({ length: 9 }, (_, i) => {
                                          // Calculate round points for each 3-hole segment
                                          const round1Holes = [0, 1, 2];
                                          const round2Holes = [3, 4, 5];
                                          const round3Holes = [6, 7, 8];
                                          
                                          let roundPoints = 0;
                                          if (i === 0) {
                                            // Round 1 (holes 1-3)
                                            const player1Scores = round1Holes.map(hole => 
                                              Number(match.player1_scores?.[hole] || 0)
                                            );
                                            const player2Scores = round1Holes.map(hole => 
                                              Number(match.player2_scores?.[hole] || 0)
                                            );
                                            
                                            const player1Total = player1Scores.reduce((a, b) => a + b, 0);
                                            const player2Total = player2Scores.reduce((a, b) => a + b, 0);
                                            
                                            if (player1Total > 0 && player2Total > 0) {
                                              if (player1Total < player2Total) roundPoints = 1; // Player 1 wins round
                                              else if (player1Total === player2Total) roundPoints = 0.5; // Tie
                                            }
                                          } else if (i === 3) {
                                            // Round 2 (holes 4-6)
                                            const player1Scores = round2Holes.map(hole => 
                                              Number(match.player1_scores?.[hole] || 0)
                                            );
                                            const player2Scores = round2Holes.map(hole => 
                                              Number(match.player2_scores?.[hole] || 0)
                                            );
                                            
                                            const player1Total = player1Scores.reduce((a, b) => a + b, 0);
                                            const player2Total = player2Scores.reduce((a, b) => a + b, 0);
                                            
                                            if (player1Total > 0 && player2Total > 0) {
                                              if (player1Total < player2Total) roundPoints = 1; // Player 1 wins round
                                              else if (player1Total === player2Total) roundPoints = 0.5; // Tie
                                            }
                                          } else if (i === 6) {
                                            // Round 3 (holes 7-9)
                                            const player1Scores = round3Holes.map(hole => 
                                              Number(match.player1_scores?.[hole] || 0)
                                            );
                                            const player2Scores = round3Holes.map(hole => 
                                              Number(match.player2_scores?.[hole] || 0)
                                            );
                                            
                                            const player1Total = player1Scores.reduce((a, b) => a + b, 0);
                                            const player2Total = player2Scores.reduce((a, b) => a + b, 0);
                                            
                                            if (player1Total > 0 && player2Total > 0) {
                                              if (player1Total < player2Total) roundPoints = 1; // Player 1 wins round
                                              else if (player1Total === player2Total) roundPoints = 0.5; // Tie
                                            }
                                          }
                                          
                                          return (
                                            <td key={i} className="font-bold text-xs px-1 py-1 text-green-600">
                                              {roundPoints > 0 ? Number(roundPoints).toFixed(1) : ''}
                                            </td>
                                          );
                                        })}
                                        <td className="font-bold text-xs text-green-600">
                                          {match.player1_id === player.user_id 
                                            ? (Number(match.round1_points_player1 || 0) + Number(match.round2_points_player1 || 0) + Number(match.round3_points_player1 || 0)).toFixed(1)
                                            : (Number(match.round1_points_player2 || 0) + Number(match.round2_points_player2 || 0) + Number(match.round3_points_player2 || 0)).toFixed(1)
                                          }
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                
                                {/* Additional Points */}
                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                  <div className="text-center">
                                    <div className="text-gray-500">Live Bonus</div>
                                    <div className="font-bold text-purple-600">
                                      {match.player1_id === player.user_id 
                                        ? Number(match.match_live_bonus_player1 || 0).toFixed(1)
                                        : Number(match.match_live_bonus_player2 || 0).toFixed(1)
                                      }
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-gray-500">Total Points</div>
                                    <div className="font-bold text-gray-900">
                                      {match.player1_id === player.user_id 
                                        ? Number(match.total_points_player1 || 0).toFixed(1)
                                        : Number(match.total_points_player2 || 0).toFixed(1)
                                      }
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Legend */}
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-green-200 border border-green-400"></span> Birdie (Win)
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-yellow-200 border border-yellow-400"></span> Par (Tie)
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-red-200 border border-red-400"></span> Bogey (Loss)
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No matches found for this player
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoring Legend */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">Scoring System</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Point Breakdown:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• <strong>Hole Points:</strong> 0.5 per hole won</li>
              <li>• <strong>Round Points:</strong> 1.0 per round won (holes 1-3, 4-6, 7-9)</li>
              <li>• <strong>Live Bonus:</strong> +1.0 for match wins, +0.5 for ties</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Match Results:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• <strong>Win:</strong> Win 2+ rounds OR win 1 round + tie 2</li>
              <li>• <strong>Tie:</strong> Each player wins 1 round + 1 tied OR all 3 tied</li>
              <li>• <strong>Loss:</strong> Otherwise</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewWeeklyLeaderboard; 