import React, { useState, useEffect } from 'react';
import { Trophy, Users, TrendingUp, Eye, ChevronDown, ChevronUp, Smartphone, Monitor } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(false);

  // Helper function to get week start date (Monday) - using UTC to match backend
  const getWeekStartDate = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setUTCDate(diff));
    const year = weekStart.getUTCFullYear();
    const month = String(weekStart.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(weekStart.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + dayOfMonth;
  };

  const currentWeek = weekStartDate || getWeekStartDate();

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      <div className="max-w-6xl mx-auto p-4 md:p-6">
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
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Weekly Leaderboard - {tournamentName}
          </h2>
          {isMobile ? <Smartphone className="w-5 h-5 text-blue-600" /> : <Monitor className="w-5 h-5 text-gray-600" />}
        </div>
        <p className="text-sm md:text-base text-gray-600">
          Week of {formatWeekDate(currentWeek)}
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 text-center">
          <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-base md:text-lg font-semibold text-yellow-900 mb-2">
            No Scores Submitted Yet
          </h3>
          <p className="text-sm md:text-base text-yellow-800">
            Be the first to submit your 9-hole scorecard for this week!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop Header */}
          {!isMobile && (
            <div className="hidden md:block bg-gray-50 px-6 py-4 border-b">
              <div className="grid grid-cols-11 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3">Player</div>
                <div className="col-span-1 text-center">Hole Pts</div>
                <div className="col-span-1 text-center">Round Pts</div>
                <div className="col-span-1 text-center">Total</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-1 text-center">Live</div>
                <div className="col-span-1"></div>
              </div>
            </div>
          )}

          {/* Leaderboard Entries */}
          <div className="divide-y divide-gray-200">
            {leaderboard.map((player, index) => (
              <div key={player.user_id}>
                {/* Desktop Layout */}
                {!isMobile && (
                  <div className="hidden md:block px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-11 gap-4 items-center">
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
                )}

                {/* Mobile Layout */}
                {isMobile && (
                  <div className="md:hidden p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-base">
                            {player.first_name} {player.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{player.club}</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePlayerExpand(player.user_id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {expandedPlayer === player.user_id ? (
                          <ChevronUp className="w-6 h-6 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-600" />
                        )}
                      </button>
                    </div>
                    
                    {/* Mobile Score Display */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 font-medium mb-1">Hole Pts</div>
                        <div className="text-lg font-bold text-blue-700">
                          {Number(player.total_hole_points || 0).toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xs text-green-600 font-medium mb-1">Round Pts</div>
                        <div className="text-lg font-bold text-green-700">
                          {Number(player.total_round_points || 0).toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 font-medium mb-1">Total</div>
                        <div className="text-xl font-bold text-gray-800">
                          {Number(player.total_score || 0).toFixed(1)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile Record Display */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-600">{Number(player.matches_won || 0)}W</span>
                          <span className="text-gray-400">-</span>
                          <span className="font-semibold text-yellow-600">{Number(player.matches_tied || 0)}T</span>
                          <span className="text-gray-400">-</span>
                          <span className="font-semibold text-red-600">{Number(player.matches_lost || 0)}L</span>
                        </div>
                        <span className="text-gray-500">({Number(player.matches_played || 0)} played)</span>
                      </div>
                      
                      {Number(player.live_matches_played || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
                            {Number(player.live_matches_played || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Match Details */}
                {expandedPlayer === player.user_id && (
                  <div className="bg-gray-50 px-4 md:px-6 py-4 border-t">
                    {matchesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : playerMatches.length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 text-base md:text-lg">Match Comparison Matrix</h4>
                        
                        {/* Mobile Match View */}
                        {isMobile ? (
                          <div className="space-y-4">
                            {playerMatches.map((match, matchIndex) => {
                              const isPlayer1 = match.player1_id === player.user_id;
                              const opponentName = isPlayer1 
                                ? `${match.player2_first_name} ${match.player2_last_name}`
                                : `${match.player1_first_name} ${match.player1_last_name}`;
                              const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
                              const opponentLeaderboardEntry = leaderboard.find(p => p.user_id === opponentId);
                              const opponentClub = opponentLeaderboardEntry?.club || 'Unknown Club';
                              const matchResult = getMatchResult(match, player.user_id);
                              
                              return (
                                <div key={match.id} className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <div className="font-semibold text-gray-900">{opponentName}</div>
                                      <div className="text-sm text-gray-500">{opponentClub} Club</div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMatchResultColor(matchResult)}`}>
                                      {matchResult}
                                    </span>
                                  </div>
                                  
                                  {/* Mobile Hole Scores */}
                                  <div className="grid grid-cols-3 gap-2 mb-3">
                                    {Array.from({ length: 9 }, (_, i) => {
                                      const playerScore = Number((isPlayer1 ? match.player1_scores : match.player2_scores)?.[i] || 0);
                                      const opponentScore = Number((isPlayer1 ? match.player2_scores : match.player1_scores)?.[i] || 0);
                                      
                                      if (playerScore === 0 && opponentScore === 0) return null;
                                      
                                      const bothPlayed = playerScore > 0 && opponentScore > 0;
                                      let bgClass = 'bg-gray-100';
                                      let textClass = 'text-gray-700';
                                      
                                      if (bothPlayed) {
                                        if (playerScore < opponentScore) {
                                          bgClass = 'bg-green-200';
                                          textClass = 'text-green-900';
                                        } else if (playerScore > opponentScore) {
                                          bgClass = 'bg-red-200';
                                          textClass = 'text-red-900';
                                        } else {
                                          bgClass = 'bg-yellow-200';
                                          textClass = 'text-yellow-900';
                                        }
                                      }
                                      
                                      return (
                                        <div key={i} className={`text-center p-2 rounded ${bgClass}`}>
                                          <div className="text-xs text-gray-500 mb-1">Hole {i + 1}</div>
                                          <div className={`text-sm font-bold ${textClass}`}>
                                            {opponentScore > 0 ? opponentScore : '-'}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Mobile Round Results */}
                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      { name: 'R1 (1-3)', playerScore: isPlayer1 ? Number(match.round1_points_player1 || 0) : Number(match.round1_points_player2 || 0), opponentScore: isPlayer1 ? Number(match.round1_points_player2 || 0) : Number(match.round1_points_player1 || 0) },
                                      { name: 'R2 (4-6)', playerScore: isPlayer1 ? Number(match.round2_points_player1 || 0) : Number(match.round2_points_player2 || 0), opponentScore: isPlayer1 ? Number(match.round2_points_player2 || 0) : Number(match.round2_points_player1 || 0) },
                                      { name: 'R3 (7-9)', playerScore: isPlayer1 ? Number(match.round3_points_player1 || 0) : Number(match.round3_points_player2 || 0), opponentScore: isPlayer1 ? Number(match.round3_points_player2 || 0) : Number(match.round3_points_player1 || 0) }
                                    ].map((round, roundIndex) => {
                                      let result = 'T';
                                      let color = 'text-yellow-700';
                                      
                                      if (round.playerScore > round.opponentScore) {
                                        result = 'W';
                                        color = 'text-green-700';
                                      } else if (round.playerScore < round.opponentScore) {
                                        result = 'L';
                                        color = 'text-red-700';
                                      }
                                      
                                      return (
                                        <div key={roundIndex} className="text-center p-2 bg-gray-100 rounded">
                                          <div className="text-xs text-gray-600 mb-1">{round.name}</div>
                                          <div className={`text-lg font-bold ${color}`}>{result}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Desktop Match View - Keep existing complex table */
                          <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse">
                              <thead>
                                {/* Round Headers */}
                                <tr className="border-b border-gray-300">
                                  <th className="px-2 py-1 text-xs font-bold text-gray-700 bg-gray-100 sticky left-0 z-10 min-w-[120px]">
                                    Player
                                  </th>
                                  <th colSpan={3} className="px-1 py-1 text-xs font-bold text-gray-700 bg-blue-50 border-l-2 border-blue-200">
                                    R1 (Holes 1-3)
                                  </th>
                                  <th colSpan={3} className="px-1 py-1 text-xs font-bold text-gray-700 bg-green-50 border-l-2 border-green-200">
                                    R2 (Holes 4-6)
                                  </th>
                                  <th colSpan={3} className="px-1 py-1 text-xs font-bold text-gray-700 bg-purple-50 border-l-2 border-purple-200">
                                    R3 (Holes 7-9)
                                  </th>
                                  <th className="px-1 py-1 text-xs font-bold text-gray-700 bg-gray-100 border-l-2 border-gray-200">
                                    H
                                  </th>
                                  <th className="px-1 py-1 text-xs font-bold text-gray-700 bg-gray-100">
                                    R
                                  </th>
                                  <th className="px-1 py-1 text-xs font-bold text-gray-700 bg-gray-100">
                                    Result
                                  </th>
                                </tr>
                                {/* Hole Headers */}
                                <tr className="border-b-2 border-gray-300">
                                  <th className="px-2 py-2 text-xs font-bold text-gray-700 bg-gray-100 sticky left-0 z-10 min-w-[120px]">
                                    
                                  </th>
                                  {Array.from({ length: 9 }, (_, i) => (
                                    <th key={i} className={`px-1 py-2 text-xs font-bold text-gray-700 bg-gray-100 min-w-[40px] ${
                                      i === 0 ? 'border-l-2 border-blue-200' : 
                                      i === 3 ? 'border-l-2 border-green-200' : 
                                      i === 6 ? 'border-l-2 border-purple-200' : ''
                                    }`}>
                                      {i + 1}
                                    </th>
                                  ))}
                                  <th className="px-1 py-2 text-xs font-bold text-gray-700 bg-gray-100 border-l-2 border-gray-200">
                                    
                                  </th>
                                  <th className="px-1 py-2 text-xs font-bold text-gray-700 bg-gray-100">
                                    
                                  </th>
                                  <th className="px-1 py-2 text-xs font-bold text-gray-700 bg-gray-100">
                                    
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Current Player Row */}
                                <tr className="border-b border-gray-200 bg-blue-50">
                                  <td className="px-2 py-2 text-sm font-bold text-blue-900 sticky left-0 z-10 bg-blue-50">
                                    {player.first_name} {player.last_name}
                                  </td>
                                  {Array.from({ length: 9 }, (_, i) => {
                                    // Get player's scores from their matches
                                    const playerMatch = playerMatches.find(match => 
                                      match.player1_id === player.user_id || match.player2_id === player.user_id
                                    );
                                    
                                    if (!playerMatch) return '';
                                    
                                    const isPlayer1 = playerMatch.player1_id === player.user_id;
                                    const playerScores = isPlayer1 ? playerMatch.player1_scores : playerMatch.player2_scores;
                                    const score = Number(playerScores?.[i] || 0);
                                    
                                    return (
                                      <td key={i} className="px-1 py-2 text-sm font-bold text-blue-900">
                                        {score > 0 ? score : ''}
                                      </td>
                                    );
                                  })}
                                  <td className="px-1 py-2 text-sm font-bold text-blue-600">
                                    {Number(player.total_hole_points || 0).toFixed(1)}
                                  </td>
                                  <td className="px-1 py-2 text-sm font-bold text-green-600">
                                    {Number(player.total_round_points || 0).toFixed(1)}
                                  </td>
                                  <td className="px-1 py-2 text-sm font-bold text-gray-900">
                                    -
                                  </td>
                                </tr>
                                
                                {/* Opponent Rows */}
                                {playerMatches.map((match) => {
                                  const isPlayer1 = match.player1_id === player.user_id;
                                  const opponentName = isPlayer1 
                                    ? `${match.player2_first_name} ${match.player2_last_name}`
                                    : `${match.player1_first_name} ${match.player1_last_name}`;
                                  // Get opponent's club from leaderboard data
                                  const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
                                  const opponentLeaderboardEntry = leaderboard.find(player => player.user_id === opponentId);
                                  const opponentClub = opponentLeaderboardEntry?.club || 'Unknown Club';
                                  const opponentScores = isPlayer1 
                                    ? match.player2_scores 
                                    : match.player1_scores;
                                  const opponentHolePoints = isPlayer1 
                                    ? Number(match.hole_points_player2 || 0)
                                    : Number(match.hole_points_player1 || 0);
                                  const opponentRoundPoints = isPlayer1 
                                    ? (Number(match.round1_points_player2 || 0) + Number(match.round2_points_player2 || 0) + Number(match.round3_points_player2 || 0))
                                    : (Number(match.round1_points_player1 || 0) + Number(match.round2_points_player1 || 0) + Number(match.round3_points_player1 || 0));
                                  const matchResult = getMatchResult(match, player.user_id);
                                  
                                  return [
                                    <tr key={`${match.id}-opponent`} className="border-b border-gray-200 hover:bg-gray-50">
                                      <td className="px-2 py-2 text-sm font-semibold text-gray-900 sticky left-0 z-10 bg-white">
                                        <div>{opponentName}</div>
                                        <div className="text-xs text-gray-500">{opponentClub} Club</div>
                                      </td>
                                      {Array.from({ length: 9 }, (_, i) => {
                                        // Get player's scores from the current match context
                                        const isPlayer1 = match.player1_id === player.user_id;
                                        const playerScores = isPlayer1 ? match.player1_scores : match.player2_scores;
                                        const playerScore = Number(playerScores?.[i] || 0);
                                        const opponentScore = Number(opponentScores?.[i] || 0);
                                        
                                        const bothPlayed = playerScore > 0 && opponentScore > 0;
                                        let bgClass = '';
                                        let textClass = '';
                                        
                                        if (bothPlayed) {
                                          if (playerScore < opponentScore) {
                                            bgClass = 'bg-green-200'; // You win
                                            textClass = 'text-green-900';
                                          } else if (playerScore > opponentScore) {
                                            bgClass = 'bg-red-200'; // You lose
                                            textClass = 'text-red-900';
                                          } else {
                                            bgClass = 'bg-yellow-200'; // Tie
                                            textClass = 'text-yellow-900';
                                          }
                                        }
                                        
                                        return (
                                          <td key={i} className={`px-1 py-2 text-sm font-bold ${bgClass} ${textClass}`}>
                                            {opponentScore > 0 ? opponentScore : ''}
                                          </td>
                                        );
                                      })}
                                      <td className="px-1 py-2 text-sm font-semibold text-blue-600">
                                        {isPlayer1 ? Number(match.hole_points_player1 || 0).toFixed(1) : Number(match.hole_points_player2 || 0).toFixed(1)}
                                      </td>
                                      <td className="px-1 py-2 text-sm font-semibold text-green-600">
                                        {isPlayer1 ? 
                                          (Number(match.round1_points_player1 || 0) + Number(match.round2_points_player1 || 0) + Number(match.round3_points_player1 || 0)).toFixed(1) :
                                          (Number(match.round2_points_player2 || 0) + Number(match.round2_points_player2 || 0) + Number(match.round3_points_player2 || 0)).toFixed(1)
                                        }
                                      </td>
                                      <td className="px-1 py-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getMatchResultColor(matchResult)}`}>
                                          {matchResult}
                                        </span>
                                      </td>
                                    </tr>,
                                    
                                    <tr key={`${match.id}-rounds`} className="border-b border-gray-200 bg-gray-100">
                                      <td className="px-2 py-2 text-xs font-semibold text-gray-700 sticky left-0 z-10 bg-gray-100">
                                        Round Results
                                      </td>
                                      {/* Round 1 Results (holes 1-3) */}
                                      <td colSpan={3} className="px-1 py-2 text-xs font-bold text-center bg-blue-50">
                                        {(() => {
                                          const round1PlayerScore = isPlayer1 ? 
                                            Number(match.round1_points_player1 || 0) : 
                                            Number(match.round1_points_player2 || 0);
                                          const round1OpponentScore = isPlayer1 ? 
                                            Number(match.round1_points_player2 || 0) : 
                                            Number(match.round1_points_player1 || 0);
                                          
                                          if (round1PlayerScore > round1OpponentScore) {
                                            return <span className="text-green-700 font-bold text-lg">W</span>;
                                          } else if (round1PlayerScore < round1OpponentScore) {
                                            return <span className="text-red-700 font-bold text-lg">L</span>;
                                          } else {
                                            return <span className="text-yellow-700 font-bold text-lg">T</span>;
                                          }
                                        })()}
                                      </td>
                                      {/* Round 2 Results (holes 4-6) */}
                                      <td colSpan={3} className="px-1 py-2 text-xs font-bold text-center bg-green-50">
                                        {(() => {
                                          const round2PlayerScore = isPlayer1 ? 
                                            Number(match.round2_points_player1 || 0) : 
                                            Number(match.round2_points_player2 || 0);
                                          const round2OpponentScore = isPlayer1 ? 
                                            Number(match.round2_points_player2 || 0) : 
                                            Number(match.round2_points_player1 || 0);
                                          
                                          if (round2PlayerScore > round2OpponentScore) {
                                            return <span className="text-green-700 font-bold text-lg">W</span>;
                                          } else if (round2PlayerScore < round2OpponentScore) {
                                            return <span className="text-red-700 font-bold text-lg">L</span>;
                                          } else {
                                            return <span className="text-yellow-700 font-bold text-lg">T</span>;
                                          }
                                        })()}
                                      </td>
                                      {/* Round 3 Results (holes 7-9) */}
                                      <td colSpan={3} className="px-1 py-2 text-xs font-bold text-center bg-purple-50">
                                        {(() => {
                                          const round3PlayerScore = isPlayer1 ? 
                                            Number(match.round3_points_player1 || 0) : 
                                            Number(match.round3_points_player2 || 0);
                                          const round3OpponentScore = isPlayer1 ? 
                                            Number(match.round3_points_player2 || 0) : 
                                            Number(match.round3_points_player1 || 0);
                                          
                                          if (round3PlayerScore > round3OpponentScore) {
                                            return <span className="text-green-700 font-bold text-lg">W</span>;
                                          } else if (round3PlayerScore < round3OpponentScore) {
                                            return <span className="text-red-700 font-bold text-lg">L</span>;
                                          } else {
                                            return <span className="text-yellow-700 font-bold text-lg">T</span>;
                                          }
                                        })()}
                                      </td>
                                      <td className="px-1 py-2 text-xs text-gray-500 bg-gray-100">
                                        -
                                      </td>
                                      <td className="px-1 py-2 text-xs text-gray-500 bg-gray-100">
                                        -
                                      </td>
                                      <td className="px-1 py-2 text-xs text-gray-500 bg-gray-100">
                                        -
                                      </td>
                                    </tr>
                                  ];
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Compact Legend */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 bg-green-200 border border-green-400"></span> Win
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 bg-yellow-200 border border-yellow-400"></span> Tie
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 bg-red-200 border border-red-400"></span> Loss
                          </div>
                          <div className="text-gray-500">
                            H = Hole Points, R = Round Points
                          </div>
                          <div className="text-gray-500">
                            Numbers 1-9 = Individual hole scores
                          </div>
                          <div className="text-gray-500">
                            R1 = Holes 1-3, R2 = Holes 4-6, R3 = Holes 7-9
                          </div>
                          <div className="text-gray-500">
                            Round Results row shows W/T/L for each round
                          </div>
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