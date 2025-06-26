import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, TrendingUp, ArrowRight, Play, Award, Settings, User as UserIcon, Star, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUsers, getLeagueSettings, getLeaderboard } from '../services/api';
import type { User, LeagueSettings } from '../services/api';

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
}

const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, settingsData, leaderboardResponse] = await Promise.all([
          getUsers(),
          getLeagueSettings(),
          getLeaderboard()
        ]);

        setUsers(usersData.data);
        setSettings(settingsData.data);
        setLeaderboardData(leaderboardResponse.data);
        
        // For now, we'll use the first user as current user (you can implement proper auth later)
        if (usersData.data.length > 0) {
          setCurrentUser(usersData.data[0]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  const totalPlayers = users.length;
  const totalMatches = leaderboardData?.stats.totalMatches || 0;
  const activePlayers = leaderboardData?.players.filter(p => p.total_matches > 0).length || 0;
  const recentMatches = leaderboardData?.recentMatches.slice(-3) || [];
  const upcomingMatches: any[] = []; // No upcoming matches endpoint yet

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-brand-dark-green via-brand-muted-green to-brand-neon-green/20 rounded-2xl p-12 shadow-2xl overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-neon-green rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
        </div>
        
        <div className="relative z-10 text-center">
          <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-24 w-auto mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-white mb-4">
            {settings?.name || 'Golf League Tournament'}
          </h1>
          <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">
            Join the ultimate weekly match play league. Track scores, compete with friends, and climb the leaderboard.
          </p>
          
          {currentUser && (
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 inline-block mb-8">
              <p className="text-white font-semibold">
                Welcome back, <span className="text-brand-neon-green">{currentUser.first_name} {currentUser.last_name}</span>! 🏌️‍♂️
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/scoring" className="group">
              <div className="bg-brand-neon-green hover:bg-brand-neon-green/90 text-brand-black px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105 flex items-center justify-center">
                <Play className="w-6 h-6 mr-2" />
                Start Playing
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to="/leaderboard" className="group">
              <div className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-white/50 px-8 py-4 rounded-full font-bold text-lg backdrop-blur-sm transition-all duration-200 group-hover:scale-105 flex items-center justify-center">
                <Trophy className="w-6 h-6 mr-2" />
                View Leaderboard
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-white/20">
          <div className="flex items-center">
            <div className="p-3 bg-brand-neon-green rounded-full">
              <Users className="w-6 h-6 text-brand-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Total Players</p>
              <p className="text-2xl font-bold text-brand-black">{totalPlayers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-white/20">
          <div className="flex items-center">
            <div className="p-3 bg-brand-neon-green rounded-full">
              <Trophy className="w-6 h-6 text-brand-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Total Matches</p>
              <p className="text-2xl font-bold text-brand-black">{totalMatches}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-white/20">
          <div className="flex items-center">
            <div className="p-3 bg-brand-neon-green rounded-full">
              <TrendingUp className="w-6 h-6 text-brand-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Active Players</p>
              <p className="text-2xl font-bold text-brand-black">{activePlayers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-white/20">
          <div className="flex items-center">
            <div className="p-3 bg-brand-neon-green rounded-full">
              <Calendar className="w-6 h-6 text-brand-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Min Matches</p>
              <p className="text-2xl font-bold text-brand-black">{settings?.min_matches || 3}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-brand-black mb-4">Everything You Need</h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Our comprehensive golf league platform provides all the tools you need to run a successful tournament.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center group">
            <div className="bg-gradient-to-br from-brand-neon-green to-emerald-400 p-6 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105 mb-4">
              <Play className="w-12 h-12 text-brand-black mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-brand-black mb-2">Live Scoring</h3>
            <p className="text-neutral-600">Record match results in real-time with our intuitive scoring system.</p>
          </div>

          <div className="text-center group">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-400 p-6 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105 mb-4">
              <Trophy className="w-12 h-12 text-white mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-brand-black mb-2">Leaderboards</h3>
            <p className="text-neutral-600">Track standings and see who's leading the competition.</p>
          </div>

          <div className="text-center group">
            <div className="bg-gradient-to-br from-blue-400 to-purple-400 p-6 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105 mb-4">
              <Users className="w-12 h-12 text-white mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-brand-black mb-2">Player Management</h3>
            <p className="text-neutral-600">Manage your roster and track player statistics.</p>
          </div>

          <div className="text-center group">
            <div className="bg-gradient-to-br from-gray-600 to-gray-800 p-6 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105 mb-4">
              <Settings className="w-12 h-12 text-white mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-brand-black mb-2">League Settings</h3>
            <p className="text-neutral-600">Customize scoring rules and tournament parameters.</p>
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Matches */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
            <Award className="w-6 h-6 mr-3 text-brand-neon-green" />
            Recent Matches
          </h2>
          <div className="space-y-4">
            {recentMatches.length > 0 ? (
              recentMatches.map((match) => (
                <div key={match.id} className="p-4 bg-neutral-50 rounded-lg border-l-4 border-brand-neon-green hover:bg-neutral-100 transition-colors">
                  <div className="font-semibold text-brand-black">
                    {match.tournament_name} - Match #{match.id}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {new Date(match.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-neutral-700 mt-1">
                    {match.player1_first_name} {match.player1_last_name} vs {match.player2_first_name} {match.player2_last_name}
                  </div>
                  {match.winner_first_name && (
                    <div className="text-sm text-brand-neon-green font-medium mt-1">
                      🏆 Winner: {match.winner_first_name} {match.winner_last_name}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600 mb-4">No matches played yet.</p>
                <Link to="/scoring" className="inline-flex items-center text-brand-neon-green hover:text-brand-muted-green font-semibold">
                  Start your first match
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Top Players */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
            <Trophy className="w-6 h-6 mr-3 text-brand-neon-green" />
            Top Players
          </h2>
          <div className="space-y-4">
            {leaderboardData?.players.slice(0, 5).map((player, index) => (
              <div key={player.member_id} className="p-4 bg-neutral-50 rounded-lg border-l-4 border-brand-neon-green hover:bg-neutral-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-brand-black">
                      #{index + 1} {player.first_name} {player.last_name}
                    </div>
                    <div className="text-sm text-neutral-600">
                      {player.club} • {player.total_matches} matches
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-neon-green">
                      {player.total_points} pts
                    </div>
                    <div className="text-sm text-neutral-600">
                      {Math.round(parseFloat(player.win_rate.toString()) * 100)}% win rate
                    </div>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600 mb-4">No player data available.</p>
                <Link to="/leaderboard" className="inline-flex items-center text-brand-neon-green hover:text-brand-muted-green font-semibold">
                  View full leaderboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* League Info */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
        <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-3 text-brand-neon-green" />
          League Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-neutral-600">Scoring Rules</label>
            <div className="mt-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="text-brand-black font-semibold">
                Win: {settings?.scoring_rules?.win || 3} pts | 
                Tie: {settings?.scoring_rules?.tie || 1} pt | 
                Loss: {settings?.scoring_rules?.loss || 0} pts
              </div>
            </div>
          </div>
          {settings?.tournament_date && (
            <div>
              <label className="text-sm font-medium text-neutral-600">Tournament Date</label>
              <div className="mt-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="text-brand-black font-semibold">
                  {new Date(settings.tournament_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-neutral-600">League Status</label>
            <div className="mt-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className={`font-semibold ${settings?.status === 'active' ? 'text-system-success-green' : 'text-red-600'}`}>
                {settings?.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-brand-dark-green to-brand-muted-green rounded-2xl p-8 shadow-lg text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Join the Competition?</h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Whether you're a seasoned golfer or just getting started, our league welcomes players of all skill levels.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/scoring" className="group">
            <div className="bg-brand-neon-green hover:bg-brand-neon-green/90 text-brand-black px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 group-hover:scale-105 flex items-center justify-center">
              <Play className="w-6 h-6 mr-2" />
              Start Playing Now
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <Link to="/players" className="group">
            <div className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 hover:border-white/50 px-8 py-4 rounded-full font-bold text-lg backdrop-blur-sm transition-all duration-200 group-hover:scale-105 flex items-center justify-center">
              <Users className="w-6 h-6 mr-2" />
              View Players
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 