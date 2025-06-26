import React, { useState, useEffect } from 'react';
import { Trophy, Medal, TrendingUp, Users, Clock, Award, Globe, Target } from 'lucide-react';
import { getLeaderboard, getTournaments } from '../services/api';

interface LeaderboardPlayer {
  member_id: number;
  first_name: string;
  last_name: string;
  club: string;
  role: string;
  total_matches: number;
  wins: number;
  losses: number;
  ties: number;
  total_points: number;
  win_rate: number;
}

interface RecentMatch {
  id: number;
  tournament_name: string;
  player1_first_name: string;
  player1_last_name: string;
  player2_first_name: string;
  player2_last_name: string;
  winner_first_name: string;
  winner_last_name: string;
  created_at: string;
}

interface LeaderboardData {
  players: LeaderboardPlayer[];
  recentMatches: RecentMatch[];
  stats: {
    totalPlayers: number;
    totalMatches: number;
    totalPoints: number;
    averagePoints: number;
  };
  type: 'global' | 'tournament';
  tournament_id: number | null;
}

interface Tournament {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

const Leaderboard: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tournaments for dropdown
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await getTournaments();
        setTournaments(response.data);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      }
    };
    fetchTournaments();
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getLeaderboard(selectedTournament || undefined);
        setLeaderboardData(response.data);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTournament]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-600">Failed to load leaderboard data.</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-neutral-600">{rank}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTournamentChange = (tournamentId: string) => {
    setSelectedTournament(tournamentId ? parseInt(tournamentId) : null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center bg-white/95 rounded-2xl p-8 shadow-lg">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-brand-black mb-4">Leaderboard</h1>
        <p className="text-xl text-neutral-600 mb-6">
          {leaderboardData.type === 'global' ? 'All-time standings across all tournaments' : 'Tournament-specific standings'}
        </p>
        
        {/* Tournament Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-brand-neon-green" />
            <span className="text-sm font-medium text-neutral-700">View:</span>
          </div>
          <select
            value={selectedTournament || ''}
            onChange={(e) => handleTournamentChange(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent w-full sm:w-auto"
          >
            <option value="">Global Leaderboard</option>
            {tournaments.map(tournament => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg text-center">
          <Users className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
          <p className="text-2xl font-bold text-brand-black">{leaderboardData.stats.totalPlayers}</p>
          <p className="text-sm text-neutral-600">Active Players</p>
        </div>
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg text-center">
          <Clock className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
          <p className="text-2xl font-bold text-brand-black">{leaderboardData.stats.totalMatches}</p>
          <p className="text-sm text-neutral-600">Total Matches</p>
        </div>
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg text-center">
          <Trophy className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
          <p className="text-2xl font-bold text-brand-black">
            {leaderboardData.players.length > 0 ? leaderboardData.players[0].total_points : 0}
          </p>
          <p className="text-sm text-neutral-600">Top Score</p>
        </div>
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg text-center">
          <TrendingUp className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
          <p className="text-2xl font-bold text-brand-black">
            {leaderboardData.players.length > 0 ? Math.round(leaderboardData.players[0].win_rate * 100) : 0}%
          </p>
          <p className="text-sm text-neutral-600">Best Win Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard Table - Desktop */}
        <div className="lg:col-span-2 bg-white/95 rounded-2xl shadow-lg overflow-hidden hidden md:block">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-2xl font-bold text-brand-black">
              {leaderboardData.type === 'global' ? 'All-Time Rankings' : 'Tournament Rankings'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    W-L-T
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {leaderboardData.players.length > 0 ? (
                  leaderboardData.players.map((player, index) => (
                    <tr key={player.member_id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(index + 1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-black">
                          {player.first_name} {player.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-600">
                          {player.club}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-brand-black">
                          {player.total_matches}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-brand-black">
                          {player.wins}-{player.losses}-{player.ties}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-brand-black">
                          {Math.round(player.win_rate * 100)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-brand-neon-green">
                          {player.total_points}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-neutral-600">
                      {leaderboardData.type === 'global' 
                        ? 'No players found. Add some players to see the leaderboard!' 
                        : 'No players found for this tournament.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leaderboard Cards - Mobile */}
        <div className="lg:col-span-2 bg-white/95 rounded-2xl shadow-lg overflow-hidden md:hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-2xl font-bold text-brand-black">
              {leaderboardData.type === 'global' ? 'All-Time Rankings' : 'Tournament Rankings'}
            </h2>
          </div>
          <div className="p-4">
            {leaderboardData.players.length > 0 ? (
              <div className="space-y-4">
                {leaderboardData.players.map((player, index) => (
                  <div key={player.member_id} className="bg-neutral-50 rounded-lg p-4 border-l-4 border-brand-neon-green">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          {getRankIcon(index + 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-brand-black">
                            {player.first_name} {player.last_name}
                          </div>
                          <div className="text-sm text-neutral-600">
                            {player.club}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-brand-neon-green">
                          {player.total_points} pts
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-neutral-600">Matches</div>
                        <div className="font-semibold text-brand-black">{player.total_matches}</div>
                      </div>
                      <div>
                        <div className="text-neutral-600">Record</div>
                        <div className="font-semibold text-brand-black">{player.wins}-{player.losses}-{player.ties}</div>
                      </div>
                      <div>
                        <div className="text-neutral-600">Win Rate</div>
                        <div className="font-semibold text-brand-black">{Math.round(player.win_rate * 100)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-600">
                {leaderboardData.type === 'global' 
                  ? 'No players found. Add some players to see the leaderboard!' 
                  : 'No players found for this tournament.'}
              </div>
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-white/95 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-2xl font-bold text-brand-black">
              {leaderboardData.type === 'global' ? 'Recent Matches' : 'Tournament Matches'}
            </h2>
          </div>
          <div className="p-6">
            {leaderboardData.recentMatches.length > 0 ? (
              <div className="space-y-4">
                {leaderboardData.recentMatches.map(match => (
                  <div key={match.id} className="border-l-4 border-brand-neon-green pl-4">
                    <div className="text-sm font-medium text-brand-black">
                      {match.tournament_name}
                    </div>
                    <div className="text-xs text-neutral-600 mb-1">
                      {formatDate(match.created_at)}
                    </div>
                    <div className="text-sm text-neutral-700">
                      <span className={match.winner_first_name ? 'font-semibold text-green-600' : ''}>
                        {match.player1_first_name} {match.player1_last_name}
                      </span>
                      {' vs '}
                      <span className={match.winner_first_name ? 'font-semibold text-green-600' : ''}>
                        {match.player2_first_name} {match.player2_last_name}
                      </span>
                    </div>
                    {match.winner_first_name && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        <Award className="w-3 h-3 inline mr-1" />
                        Winner: {match.winner_first_name} {match.winner_last_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-neutral-600 py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                <p>No recent matches</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 