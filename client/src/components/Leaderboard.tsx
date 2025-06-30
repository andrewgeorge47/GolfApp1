import React, { useState, useEffect } from 'react';
import { Globe, Building, Trophy, Users, Target, MapPin, Calendar, Award, Activity, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { getGlobalLeaderboard, getClubLeaderboard, GlobalLeaderboardData, ClubLeaderboardData } from '../services/api';

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [globalData, setGlobalData] = useState<GlobalLeaderboardData | null>(null);
  const [clubData, setClubData] = useState<ClubLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'club'>('global');

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch global data
        const globalResponse = await getGlobalLeaderboard();
        setGlobalData(globalResponse.data);
        
        // Fetch club data if user has a club
        if (user?.club) {
          const clubResponse = await getClubLeaderboard(user.club);
          setClubData(clubResponse.data);
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.club]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!globalData) {
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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const formatDays = (days: number) => {
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} weeks`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  const getActivityColor = (rounds: number) => {
    if (rounds >= 5) return 'bg-green-100 text-green-800';
    if (rounds >= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center bg-white/95 rounded-2xl p-8 shadow-lg">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-brand-black mb-4">Player Statistics & Records</h1>
        <p className="text-xl text-neutral-600 mb-6">
          Track performance, course records, and community activity
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/95 rounded-2xl p-2 shadow-lg">
        <div className="flex flex-wrap space-x-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`py-3 px-4 rounded-xl font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-brand-neon-green text-white'
                : 'text-neutral-600 hover:text-brand-black'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Global
          </button>
          {user?.club && (
            <button
              onClick={() => setActiveTab('club')}
              className={`py-3 px-4 rounded-xl font-medium transition-colors ${
                activeTab === 'club'
                  ? 'bg-brand-neon-green text-white'
                  : 'text-neutral-600 hover:text-brand-black'
              }`}
            >
              <Building className="w-4 h-4 inline mr-2" />
              {user.club}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/95 rounded-2xl shadow-lg p-6">
        {activeTab === 'global' && globalData && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <Globe className="w-6 h-6 mr-3 text-brand-neon-green" />
              Global Community Highlights
            </h2>
            
            {/* Community Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <Users className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{globalData.communityStats.total_players}</p>
                <p className="text-sm text-neutral-600">Players</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <Building className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{globalData.communityStats.total_clubs}</p>
                <p className="text-sm text-neutral-600">Clubs</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <Target className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{globalData.communityStats.total_rounds}</p>
                <p className="text-sm text-neutral-600">Rounds</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <Trophy className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{globalData.communityStats.total_course_records}</p>
                <p className="text-sm text-neutral-600">Records</p>
              </div>
            </div>

            {/* Club Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-l-4 border-yellow-400 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
                  <h3 className="text-xl font-bold text-yellow-800">Most Course Records</h3>
                </div>
                {globalData.clubHighlights.most_course_records_club ? (
                  <div>
                    <p className="text-3xl font-bold text-yellow-900 mb-2">
                      {globalData.clubHighlights.most_course_records_club}
                    </p>
                    <p className="text-yellow-700">Leads the community in course records held</p>
                  </div>
                ) : (
                  <p className="text-yellow-700">No course records data available</p>
                )}
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-l-4 border-blue-400 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <Activity className="w-8 h-8 text-blue-600 mr-3" />
                  <h3 className="text-xl font-bold text-blue-800">Most Active Club</h3>
                </div>
                {globalData.clubHighlights.most_active_club ? (
                  <div>
                    <p className="text-3xl font-bold text-blue-900 mb-2">
                      {globalData.clubHighlights.most_active_club}
                    </p>
                    <p className="text-blue-700">Highest total rounds logged</p>
                  </div>
                ) : (
                  <p className="text-blue-700">No activity data available</p>
                )}
              </div>
            </div>

            {/* Player Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {globalData.playerHighlights.most_records_player && (
                <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
                    <h3 className="text-xl font-bold text-yellow-800">Most Course Records</h3>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-900 mb-2">
                      {globalData.playerHighlights.most_records_player.first_name} {globalData.playerHighlights.most_records_player.last_name}
                    </p>
                    <p className="text-yellow-700 mb-1">
                      {globalData.playerHighlights.most_records_player.club}
                    </p>
                    <p className="text-lg font-semibold text-yellow-800">
                      {globalData.playerHighlights.most_records_player.record_count} records
                    </p>
                  </div>
                </div>
              )}

              {globalData.playerHighlights.best_recent_player && (
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-l-4 border-emerald-400 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="w-8 h-8 text-emerald-600 mr-3" />
                    <h3 className="text-xl font-bold text-emerald-800">Best Recent Performance</h3>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-900 mb-2">
                      {globalData.playerHighlights.best_recent_player.first_name} {globalData.playerHighlights.best_recent_player.last_name}
                    </p>
                    <p className="text-emerald-700 mb-1">
                      {globalData.playerHighlights.best_recent_player.club}
                    </p>
                    <p className="text-lg font-semibold text-emerald-800">
                      {globalData.playerHighlights.best_recent_player.avg_score} avg score ({globalData.playerHighlights.best_recent_player.rounds_count} rounds)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'club' && clubData && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <Building className="w-6 h-6 mr-3 text-brand-neon-green" />
              {clubData.club} Club Statistics
            </h2>
            
            {/* Club Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <Users className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{clubData.clubMemberStats.length}</p>
                <p className="text-sm text-neutral-600">Members</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <Target className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{clubData.clubAverageScore.total_rounds}</p>
                <p className="text-sm text-neutral-600">Total Rounds</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <TrendingDown className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{clubData.clubAverageScore.avg_score}</p>
                <p className="text-sm text-neutral-600">Avg Score</p>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-xl hover:shadow-md transition-shadow">
                <Trophy className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-brand-black">{clubData.clubCourseRecords.length}</p>
                <p className="text-sm text-neutral-600">Course Records</p>
              </div>
            </div>

            {/* Top Record Holders */}
            {clubData.topRecordHolders.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-brand-black mb-4">Top Record Holders</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {clubData.topRecordHolders.map((holder, index) => (
                    <div key={holder.member_id} className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border-l-4 border-yellow-400 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        {getRankIcon(index + 1)}
                        <div className="ml-3">
                          <p className="font-bold text-yellow-900">
                            {holder.first_name} {holder.last_name}
                          </p>
                          <p className="text-lg font-semibold text-yellow-800">
                            {holder.record_count} records
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Club Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {clubData.mostPlayedCourse && (
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-l-4 border-blue-400 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <MapPin className="w-8 h-8 text-blue-600 mr-3" />
                    <h3 className="text-xl font-bold text-blue-800">Most Played Course</h3>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900 mb-2">
                      {clubData.mostPlayedCourse.course_name}
                    </p>
                    <p className="text-lg font-semibold text-blue-800 mb-2">
                      {clubData.mostPlayedCourse.play_count} rounds
                    </p>
                    <p className="text-blue-700">
                      Avg Score: {clubData.mostPlayedCourse.avg_score}
                    </p>
                  </div>
                </div>
              )}

              {clubData.mostRecentRecord && (
                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-l-4 border-green-400 hover:shadow-lg transition-shadow">
                  <div className="flex items-center mb-4">
                    <Award className="w-8 h-8 text-green-600 mr-3" />
                    <h3 className="text-xl font-bold text-green-800">Most Recent Record</h3>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-900 mb-2">
                      {clubData.mostRecentRecord.course_name}
                    </p>
                    <p className="text-green-700 mb-1">
                      {clubData.mostRecentRecord.first_name} {clubData.mostRecentRecord.last_name}
                    </p>
                    <p className="text-lg font-semibold text-green-800">
                      {clubData.mostRecentRecord.total_strokes} strokes
                    </p>
                    <p className="text-sm text-green-600">
                      {formatDate(clubData.mostRecentRecord.date_played)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Club Member Rankings */}
            {clubData.clubMemberStats.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-brand-black mb-4">Club Member Rankings</h3>
                <div className="space-y-4">
                  {clubData.clubMemberStats.slice(0, 5).map((member, index) => (
                    <div key={member.member_id} className="p-4 bg-neutral-50 rounded-lg border-l-4 border-brand-neon-green hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getRankIcon(index + 1)}
                          <div className="ml-3">
                            <div className="font-semibold text-brand-black">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-neutral-600">
                              {member.total_rounds} rounds • {member.avg_score} avg
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-brand-neon-green">{member.total_points} pts</div>
                          <div className="text-xs text-neutral-600">
                            {Math.round(member.win_rate * 100)}% win rate
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state for club tab when no club data */}
        {activeTab === 'club' && !clubData && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-600 mb-2">No Club Data Available</h3>
            <p className="text-neutral-500">Club statistics will appear here once you join a club and start playing rounds.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 