import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, TrendingUp, ArrowRight, Play, Award, Settings, User as UserIcon, Star, CheckCircle } from 'lucide-react';
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
  const recentMatches = matches.slice(-3);
  const upcomingMatches = matches.filter(match => new Date(match.match_date) > new Date()).slice(0, 2);

  return (
    <div className="space-y-0">
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
            {settings?.description || 'Join the ultimate weekly match play league. Track scores, compete with friends, and climb the leaderboard.'}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 -mt-6 relative z-20">
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
                    Match #{match.id}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {new Date(match.match_date).toLocaleDateString()}
                  </div>
                  {match.winner && (
                    <div className="text-sm text-brand-neon-green font-medium mt-1">
                      🏆 Winner: {match.winner}
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

        {/* Upcoming Matches */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
            <Calendar className="w-6 h-6 mr-3 text-brand-neon-green" />
            Upcoming Matches
          </h2>
          <div className="space-y-4">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => (
                <div key={match.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-400 hover:from-blue-100 hover:to-indigo-100 transition-colors">
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
                <p className="text-neutral-600 mb-4">No upcoming matches scheduled.</p>
                <Link to="/admin" className="inline-flex items-center text-brand-neon-green hover:text-brand-muted-green font-semibold">
                  Schedule a match
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