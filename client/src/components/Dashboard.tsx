import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, TrendingUp, ArrowRight, Play, Award, Settings, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUsers, getLeagueSettings, getMatches, getUserProfiles } from '../services/api';
import type { User, LeagueSettings, Match, UserProfile } from '../services/api';

const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, settingsData, matchesData, profilesData] = await Promise.all([
          getUsers(),
          getLeagueSettings(),
          getMatches(),
          getUserProfiles()
        ]);

        setUsers(usersData.data);
        setSettings(settingsData.data);
        setMatches(matchesData.data);
        setProfiles(profilesData.data);
        
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
  const totalMatches = matches.length;
  const activePlayers = profiles.length;
  const recentMatches = matches.slice(-5);
  const upcomingMatches = matches.filter(match => new Date(match.match_date) > new Date()).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center bg-gradient-to-r from-brand-neon-green to-emerald-400 rounded-2xl p-8 shadow-lg">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-brand-black mb-2">
          {settings?.name || 'Golf League Tournament'}
        </h1>
        <p className="text-xl text-brand-black/80 mb-4">
          {settings?.description || 'Weekly match play league'}
        </p>
        {currentUser && (
          <p className="text-lg text-brand-black/90 mb-4">
            Welcome back, <span className="font-semibold">{currentUser.first_name} {currentUser.last_name}</span>! 🏌️‍♂️
          </p>
        )}
        <div className="inline-flex items-center bg-white/90 text-brand-black px-6 py-3 rounded-full font-semibold">
          <Calendar className="w-5 h-5 mr-2" />
          {settings?.status === 'active' ? 'League Active' : 'League Inactive'}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-brand-black mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/scoring" className="group">
            <div className="bg-gradient-to-br from-brand-neon-green to-emerald-400 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <Play className="w-8 h-8 text-brand-black mb-2" />
                  <h3 className="font-bold text-brand-black">Start Scoring</h3>
                  <p className="text-sm text-brand-black/80">Record match results</p>
                </div>
                <ArrowRight className="w-5 h-5 text-brand-black group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link to="/leaderboard" className="group">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-400 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <Trophy className="w-8 h-8 text-white mb-2" />
                  <h3 className="font-bold text-white">Leaderboard</h3>
                  <p className="text-sm text-white/90">View standings</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link to="/players" className="group">
            <div className="bg-gradient-to-br from-blue-400 to-purple-400 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <Users className="w-8 h-8 text-white mb-2" />
                  <h3 className="font-bold text-white">Players</h3>
                  <p className="text-sm text-white/90">Manage roster</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link to="/admin" className="group">
            <div className="bg-gradient-to-br from-gray-600 to-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <Settings className="w-8 h-8 text-white mb-2" />
                  <h3 className="font-bold text-white">Admin</h3>
                  <p className="text-sm text-white/90">League settings</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
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

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
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

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
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

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
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

      {/* Upcoming Matches & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Matches */}
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-brand-black mb-4 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-brand-neon-green" />
            Upcoming Matches
          </h2>
          <div className="space-y-4">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => (
                <div key={match.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-400">
                  <div className="font-semibold text-brand-black">
                    Match #{match.id}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {new Date(match.match_date).toLocaleDateString()} at {new Date(match.match_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-sm text-blue-600 font-medium mt-1">
                    ⏰ Upcoming
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600">No upcoming matches scheduled.</p>
                <Link to="/admin" className="text-brand-neon-green hover:underline mt-2 inline-block">
                  Schedule a match →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-brand-black mb-4 flex items-center">
            <Award className="w-6 h-6 mr-2 text-brand-neon-green" />
            Recent Matches
          </h2>
          <div className="space-y-4">
            {recentMatches.length > 0 ? (
              recentMatches.map((match) => (
                <div key={match.id} className="p-4 bg-neutral-50 rounded-lg border-l-4 border-brand-neon-green">
                  <div className="font-semibold text-brand-black">
                    Match #{match.id}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {new Date(match.match_date).toLocaleDateString()}
                  </div>
                  {match.winner && (
                    <div className="text-sm text-brand-neon-green font-medium">
                      🏆 Winner: {match.winner}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-600">No matches played yet.</p>
                <Link to="/scoring" className="text-brand-neon-green hover:underline mt-2 inline-block">
                  Start your first match →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* League Settings Summary */}
      <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-brand-black mb-4 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-brand-neon-green" />
          League Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-neutral-600">Scoring Rules</label>
            <div className="mt-2 p-3 bg-neutral-50 rounded-lg">
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
              <div className="mt-2 p-3 bg-neutral-50 rounded-lg">
                <div className="text-brand-black font-semibold">
                  {new Date(settings.tournament_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-neutral-600">League Status</label>
            <div className="mt-2 p-3 bg-neutral-50 rounded-lg">
              <div className={`font-semibold ${settings?.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {settings?.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 