import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, TrendingUp } from 'lucide-react';
import { getUsers, getLeagueSettings, getMatches, getUserProfiles } from '../services/api';
import type { User, LeagueSettings, Match, UserProfile } from '../services/api';

const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center bg-white/95 rounded-2xl p-8 shadow-lg">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-brand-black mb-4">
          {settings?.name || 'Golf League Tournament'}
        </h1>
        <p className="text-xl text-neutral-600 mb-6">
          {settings?.description || 'Weekly match play league'}
        </p>
        <div className="inline-flex items-center bg-brand-neon-green text-brand-black px-6 py-3 rounded-full font-semibold">
          <Calendar className="w-5 h-5 mr-2" />
          {settings?.status === 'active' ? 'League Active' : 'League Inactive'}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
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

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
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

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
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

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-brand-black mb-4">Recent Matches</h2>
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
                      Winner: {match.winner}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-neutral-600">No matches played yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-brand-black mb-4">League Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-600">Scoring Rules</label>
              <div className="mt-1 text-brand-black">
                Win: {settings?.scoring_rules?.win || 3} pts | 
                Tie: {settings?.scoring_rules?.tie || 1} pt | 
                Loss: {settings?.scoring_rules?.loss || 0} pts
              </div>
            </div>
            {settings?.tournament_date && (
              <div>
                <label className="text-sm font-medium text-neutral-600">Tournament Date</label>
                <div className="mt-1 text-brand-black">
                  {new Date(settings.tournament_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 