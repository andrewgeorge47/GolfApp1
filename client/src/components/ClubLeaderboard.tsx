import React, { useState } from 'react';
import { Trophy, Target, BarChart3, Users, Calendar, Activity, Globe, Building } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface PlayerRanking {
  player_id: string;
  player_name: string;
  record_count?: number;
  rounds_count?: number;
  avg_score?: number;
}

interface ClubLeaderboardData {
  clubStats: {
    total_players: number;
    total_rounds: number;
    total_records: number;
  };
  playerRankings: {
    courseRecords: {
      monthly: PlayerRanking[];
      allTime: PlayerRanking[];
    };
    roundsLogged: {
      monthly: PlayerRanking[];
      allTime: PlayerRanking[];
    };
    averageScore: {
      monthly: PlayerRanking[];
      allTime: PlayerRanking[];
    };
  };
}

interface ClubLeaderboardProps {
  onTabChange?: (tab: 'global' | 'club') => void;
  activeTab?: 'global' | 'club';
  clubData?: any;
  loading?: boolean;
  error?: string | null;
  timeFrame: 'monthly' | 'allTime';
  onTimeFrameChange: (timeFrame: 'monthly' | 'allTime') => void;
}

const ClubLeaderboard: React.FC<ClubLeaderboardProps> = ({ 
  onTabChange, 
  activeTab = 'club', 
  clubData, 
  loading = false, 
  error = null,
  timeFrame,
  onTimeFrameChange
}) => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<'courseRecords' | 'roundsLogged' | 'averageScore'>('courseRecords');

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getCurrentData = () => {
    if (!clubData) return [];
    
    switch (activeCategory) {
      case 'courseRecords':
        return clubData.playerRankings.courseRecords[timeFrame === 'monthly' ? 'monthly' : 'allTime'];
      case 'roundsLogged':
        return clubData.playerRankings.roundsLogged[timeFrame === 'monthly' ? 'monthly' : 'allTime'];
      case 'averageScore':
        return clubData.playerRankings.averageScore[timeFrame === 'monthly' ? 'monthly' : 'allTime'];
      default:
        return [];
    }
  };

  const getCategoryIcon = () => {
    switch (activeCategory) {
      case 'courseRecords':
        return <Trophy className="w-4 h-4" />;
      case 'roundsLogged':
        return <Target className="w-4 h-4" />;
      case 'averageScore':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getCategoryTitle = () => {
    switch (activeCategory) {
      case 'courseRecords':
        return 'Course Records';
      case 'roundsLogged':
        return 'Rounds Logged';
      case 'averageScore':
        return 'Average Score';
      default:
        return '';
    }
  };

  const getValueDisplay = (item: PlayerRanking) => {
    switch (activeCategory) {
      case 'courseRecords':
        return item.record_count || 0;
      case 'roundsLogged':
        return item.rounds_count || 0;
      case 'averageScore':
        return item.avg_score || 0;
      default:
        return '';
    }
  };

  const getValueSuffix = () => {
    switch (activeCategory) {
      case 'courseRecords':
        return 'records';
      case 'roundsLogged':
        return 'rounds';
      case 'averageScore':
        return '';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Club Leaderboard</h3>
            <p className="text-gray-500">Fetching player rankings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <Activity className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!clubData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Club Data</h3>
            <p className="text-gray-500">Unable to load club leaderboard data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Neighborhood National Community Leaderboard</h1>
          <p className="text-gray-600">See where your club stacks up!</p>
        </div>

        {/* Navigation Chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => onTabChange?.('global')}
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-brand-neon-green text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            NN Community
          </button>
          {user?.club && (
            <button
              onClick={() => onTabChange?.('club')}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'club'
                  ? 'bg-brand-neon-green text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building className="w-4 h-4 mr-2" />
              My Club
            </button>
          )}
        </div>

        {/* Club Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{clubData.clubStats.total_players}</p>
                <p className="text-sm text-gray-500">Club Members</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Target className="w-6 h-6 text-purple-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{clubData.clubStats.total_rounds}</p>
                <p className="text-sm text-gray-500">Total Rounds</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{clubData.clubStats.total_records}</p>
                <p className="text-sm text-gray-500">Club Records</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* Content Header with Filter */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900">Player Rankings</h2>
              </div>
              
              {/* Toggle Button - Time Frame Filter */}
              <div className="relative inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onTimeFrameChange('allTime')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    timeFrame === 'allTime'
                      ? 'bg-brand-neon-green text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => onTimeFrameChange('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    timeFrame === 'monthly'
                      ? 'bg-brand-neon-green text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {timeFrame === 'monthly' ? 'Last 30 Days' : 'All Time'}
            </p>
          </div>

          {/* Mobile: Category Tabs */}
          <div className="lg:hidden border-b border-gray-200">
            <div className="flex p-1">
              <button
                onClick={() => setActiveCategory('courseRecords')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'courseRecords'
                    ? 'bg-brand-neon-green text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Trophy className="w-4 h-4 inline mr-2" />
                Records
              </button>
              <button
                onClick={() => setActiveCategory('roundsLogged')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'roundsLogged'
                    ? 'bg-brand-neon-green text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Rounds
              </button>
              <button
                onClick={() => setActiveCategory('averageScore')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'averageScore'
                    ? 'bg-brand-neon-green text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Average
              </button>
            </div>
          </div>

          {/* Mobile: Single Table */}
          <div className="lg:hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getCategoryTitle()}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().length > 0 ? (
                  getCurrentData().map((item: any, index: number) => (
                    <tr key={item.player_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                            {getRankIcon(index + 1)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{item.player_name}</div>
                          {item.player_id === user?.id && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded border border-brand-neon-green/20">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {getValueDisplay(item)}
                          {getValueSuffix() && <span className="text-sm text-gray-500 ml-1">{getValueSuffix()}</span>}
                        </div>
                        {activeCategory === 'averageScore' && 'rounds_count' in item && (
                          <div className="text-sm text-gray-500">({item.rounds_count} rounds)</div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                      <p className="text-gray-500">No players have data for this category and time frame.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Desktop: Three Column Layout */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-3 gap-6 p-6">
              {/* Course Records Column */}
              <div>
                <div className="flex items-center mb-4">
                  <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Course Records</h3>
                </div>
                <div className="space-y-3">
                  {clubData.playerRankings.courseRecords[timeFrame === 'monthly' ? 'monthly' : 'allTime'].map((item: any, index: number) => (
                    <div key={item.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{item.player_name}</div>
                          {item.player_id === user?.id && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded border border-brand-neon-green/20">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.record_count || 0} records
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rounds Logged Column */}
              <div>
                <div className="flex items-center mb-4">
                  <Target className="w-5 h-5 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Rounds Logged</h3>
                </div>
                <div className="space-y-3">
                  {clubData.playerRankings.roundsLogged[timeFrame === 'monthly' ? 'monthly' : 'allTime'].map((item: any, index: number) => (
                    <div key={item.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{item.player_name}</div>
                          {item.player_id === user?.id && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded border border-brand-neon-green/20">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.rounds_count || 0} rounds
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Average Score Column */}
              <div>
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Average Score</h3>
                </div>
                <div className="space-y-3">
                  {clubData.playerRankings.averageScore[timeFrame === 'monthly' ? 'monthly' : 'allTime'].map((item: any, index: number) => (
                    <div key={item.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{item.player_name}</div>
                          {item.player_id === user?.id && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded border border-brand-neon-green/20">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.avg_score || 0}
                        </div>
                        <div className="text-sm text-gray-500">({item.rounds_count || 0} rounds)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubLeaderboard; 