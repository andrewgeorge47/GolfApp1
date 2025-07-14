import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Eye, ChevronRight } from 'lucide-react';
import { getTournamentMatches, getTournamentParticipants } from '../services/api';

interface Match {
  id: number;
  tournament_id: number;
  player1_id: number;
  player1_first_name: string;
  player1_last_name: string;
  player2_id: number;
  player2_first_name: string;
  player2_last_name: string;
  status: string;
  winner_id?: number;
  winner_first_name?: string;
  winner_last_name?: string;
  scores?: any;
  match_number: number;
  group_number?: number;
}

interface PlayerStats {
  player_id: number;
  first_name: string;
  last_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  win_rate: number;
}

interface MatchplayLeaderboardProps {
  tournamentId: number;
  tournamentFormat: string;
  onRefresh?: () => void;
  tournamentInfo?: {
    name: string;
    description?: string;
    start_date?: string;
    course_name?: string;
  };
}

const MatchplayLeaderboard: React.FC<MatchplayLeaderboardProps> = ({
  tournamentId,
  tournamentFormat,
  onRefresh,
  tournamentInfo
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await getTournamentMatches(tournamentId);
      setMatches(response.data || []);
    } catch (error) {
      console.error('Error fetching tournament matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = () => {
    const statsMap = new Map<number, PlayerStats>();

    // Debug: Log the matches being processed
    console.log('Processing matches for leaderboard:', matches);

    // Initialize stats for all players
    matches.forEach(match => {
      // Add player 1
      if (!statsMap.has(match.player1_id)) {
        statsMap.set(match.player1_id, {
          player_id: match.player1_id,
          first_name: match.player1_first_name,
          last_name: match.player1_last_name,
          matches_played: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          points: 0,
          win_rate: 0
        });
      }

      // Add player 2
      if (!statsMap.has(match.player2_id)) {
        statsMap.set(match.player2_id, {
          player_id: match.player2_id,
          first_name: match.player2_first_name,
          last_name: match.player2_last_name,
          matches_played: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          points: 0,
          win_rate: 0
        });
      }
    });

    // Debug: Log the players found
    console.log('Players found in matches:', Array.from(statsMap.values()).map(p => `${p.first_name} ${p.last_name}`));

    // Calculate stats from completed matches
    matches.forEach(match => {
      if (match.status === 'completed') {
        const player1Stats = statsMap.get(match.player1_id)!;
        const player2Stats = statsMap.get(match.player2_id)!;

        player1Stats.matches_played++;
        player2Stats.matches_played++;

        if (match.winner_id === match.player1_id) {
          player1Stats.wins++;
          player2Stats.losses++;
          player1Stats.points += 3; // Win = 3 points
          player2Stats.points += 0; // Loss = 0 points
        } else if (match.winner_id === match.player2_id) {
          player2Stats.wins++;
          player1Stats.losses++;
          player2Stats.points += 3; // Win = 3 points
          player1Stats.points += 0; // Loss = 0 points
        } else {
          // Tie (winner_id is null or doesn't match either player)
          player1Stats.ties++;
          player2Stats.ties++;
          player1Stats.points += 1; // Tie = 1 point
          player2Stats.points += 1; // Tie = 1 point
        }
      }
    });

    // Calculate win rates
    statsMap.forEach(stats => {
      stats.win_rate = stats.matches_played > 0 ? (stats.wins / stats.matches_played) * 100 : 0;
    });

    // Debug: Log all players before filtering
    console.log('All players before filtering:', Array.from(statsMap.values()).map(p => `${p.first_name} ${p.last_name} (${p.matches_played} matches)`));

    // Convert to array and sort
    const sortedStats = Array.from(statsMap.values())
      .filter(player => player.matches_played > 0)
      .sort((a, b) => {
        // Sort by points (descending)
        if (b.points !== a.points) return b.points - a.points;
        // If points tied, sort by wins (descending)
        if (b.wins !== a.wins) return b.wins - a.wins;
        // If wins tied, sort by win rate
        return b.win_rate - a.win_rate;
      });

    // Debug: Log players after filtering
    console.log('Players after filtering (with matches):', sortedStats.map(p => `${p.first_name} ${p.last_name} (${p.matches_played} matches)`));

    setPlayerStats(sortedStats);
  };

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  useEffect(() => {
    calculatePlayerStats();
  }, [matches]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-neutral-400 text-sm font-medium">{position}</span>;
    }
  };

  const formatTournamentFormat = (format: string) => {
    return format.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (playerStats.length === 0) {
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
    <div className="space-y-6">
      {/* Tournament Info Header */}
      {tournamentInfo && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-brand-black mb-2">{tournamentInfo.name}</h2>
              {tournamentInfo.description && (
                <p className="text-neutral-600 mb-3">{tournamentInfo.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                <div className="flex items-center space-x-1">
                  <Trophy className="w-4 h-4" />
                  <span>{formatTournamentFormat(tournamentFormat)}</span>
                </div>
                {tournamentInfo.course_name && (
                  <div className="flex items-center space-x-1">
                    <span>🏌️</span>
                    <span>{tournamentInfo.course_name}</span>
                  </div>
                )}
                {tournamentInfo.start_date && (
                  <div className="flex items-center space-x-1">
                    <span>📅</span>
                    <span>{new Date(tournamentInfo.start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-brand-neon-green" />
            <h3 className="text-xl font-bold text-brand-black">Matchplay Leaderboard</h3>
          </div>
          <button
            onClick={fetchMatches}
            className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mt-6">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">Position</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">Player</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Points</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Matches</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Wins</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Losses</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Ties</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {playerStats.map((player, index) => (
                  <tr key={player.player_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getPositionIcon(index + 1)}
                        <span className="text-sm font-medium text-neutral-600">
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-brand-black">
                          {player.first_name} {player.last_name}
                        </span>
                        {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-brand-neon-green">
                        {player.points}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-neutral-900 font-medium">
                        {player.matches_played}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-green-600 font-medium">
                        {player.wins}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-red-600 font-medium">
                        {player.losses}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-neutral-600 font-medium">
                        {player.ties}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-neutral-900 font-medium">
                        {player.win_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Table */}
          <div className="lg:hidden">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-600">Pos</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-600">Player</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-600">Pts</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-600">W/L/T</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {playerStats.map((player, index) => (
                  <tr key={player.player_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center space-x-2">
                        {getPositionIcon(index + 1)}
                        <span className="text-sm font-medium text-neutral-600">
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-brand-black text-sm">
                          {player.first_name} {player.last_name}
                        </span>
                        {index === 0 && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-lg font-bold text-brand-neon-green">
                        {player.points}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm text-neutral-900">
                        {player.wins}/{player.losses}/{player.ties}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchplayLeaderboard; 