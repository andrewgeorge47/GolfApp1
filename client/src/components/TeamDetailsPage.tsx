import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Award,
  Target,
  Calendar,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Star,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getCaptainDashboard, getLeagueMatchups, getLeagueStandings } from '../services/api';

interface Team {
  id: number;
  name: string;
  captain_id: number;
  captain_name: string;
  league_id: number;
  league_name: string;
  division_id: number;
  division_name: string;
  league_points: number;
  aggregate_net_score: number;
  second_half_net_score: number;
  final_week_net_score: number;
}

interface TeamStatistics {
  total_matches: number;
  wins: number;
  ties: number;
  losses: number;
  total_points: number;
  avg_total_net: number;
  best_total_net: number;
  worst_total_net: number;
  win_percentage: number;
}

interface PlayerStatistics {
  member_id: number;
  player_name: string;
  matches_played: number;
  avg_gross: number;
  best_gross: number;
  avg_net: number;
  best_net: number;
  handicap: number;
  role: string;
}

interface TeamStandings {
  team_id: number;
  rank_in_division: number;
  division_name: string;
  league_points: number;
  playoff_qualified: boolean;
}

interface Match {
  id: number;
  league_id: number;
  week_number: number;
  opponent_name: string;
  opponent_id: number;
  team_score: number;
  opponent_score: number;
  result: string;
  course_name: string;
  status: string;
  week_start_date: string;
  week_end_date: string;
  league_name: string;
  division_name: string;
}

interface TeamDetailsData {
  team: Team;
  statistics: TeamStatistics;
  player_statistics: PlayerStatistics[];
  standings: TeamStandings;
}

interface TeamDetailsPageProps {
  teamId: number;
  leagueId?: number;
  onBack?: () => void;
}

const TeamDetailsPage: React.FC<TeamDetailsPageProps> = ({ 
  teamId, 
  leagueId, 
  onBack 
}) => {
  const [teamData, setTeamData] = useState<TeamDetailsData | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'matches' | 'trends' | 'players'>('overview');

  useEffect(() => {
    loadTeamDetails();
    loadMatchHistory();
  }, [teamId, leagueId]);

  const loadTeamDetails = async () => {
    setLoading(true);
    try {
      if (!leagueId) {
        toast.error('League ID is required');
        setLoading(false);
        return;
      }

      // Fetch team data from captain dashboard
      const dashboardResponse = await getCaptainDashboard(teamId, leagueId);
      const dashboardData = dashboardResponse.data;

      // Fetch standings to get additional team info
      const standingsResponse = await getLeagueStandings(leagueId);
      const standingsData = standingsResponse.data;

      // Find this team in standings
      let teamStandingsInfo = null;
      for (const division of standingsData.divisions) {
        const teamInDivision = division.teams.find((t: any) => t.team_id === teamId);
        if (teamInDivision) {
          teamStandingsInfo = {
            ...teamInDivision,
            division_name: division.division_name
          };
          break;
        }
      }

      // Calculate team statistics from match history (will be loaded separately)
      const stats: TeamStatistics = {
        total_matches: dashboardData.standings?.wins + dashboardData.standings?.losses + dashboardData.standings?.ties || 0,
        wins: dashboardData.standings?.wins || 0,
        ties: dashboardData.standings?.ties || 0,
        losses: dashboardData.standings?.losses || 0,
        total_points: dashboardData.standings?.league_points || 0,
        avg_total_net: 0, // TODO: Calculate from match history
        best_total_net: 0, // TODO: Calculate from match history
        worst_total_net: 0, // TODO: Calculate from match history
        win_percentage: ((dashboardData.standings?.wins || 0) / Math.max(1, (dashboardData.standings?.wins || 0) + (dashboardData.standings?.losses || 0) + (dashboardData.standings?.ties || 0))) * 100
      };

      // Transform player statistics from roster
      const playerStats: PlayerStatistics[] = dashboardData.roster.map((member: any) => ({
        member_id: member.user_member_id,
        player_name: `${member.first_name} ${member.last_name}`,
        matches_played: 0, // TODO: Get from match history
        avg_gross: 0, // TODO: Calculate from scores
        best_gross: 0, // TODO: Calculate from scores
        avg_net: 0, // TODO: Calculate from scores
        best_net: 0, // TODO: Calculate from scores
        handicap: member.handicap || 0,
        role: member.is_captain ? 'captain' : 'member'
      }));

      const transformedData: TeamDetailsData = {
        team: {
          id: dashboardData.team.id,
          name: dashboardData.team.name,
          captain_id: dashboardData.team.captain_id,
          captain_name: dashboardData.roster.find((m: any) => m.is_captain)?.first_name + ' ' +
                        dashboardData.roster.find((m: any) => m.is_captain)?.last_name || 'Unknown',
          league_id: leagueId,
          league_name: 'Unknown', // TODO: Get from league data
          division_id: dashboardData.team.division_id || 0,
          division_name: teamStandingsInfo?.division_name || 'Unknown',
          league_points: teamStandingsInfo?.total_points || 0,
          aggregate_net_score: teamStandingsInfo?.aggregate_net_score || 0,
          second_half_net_score: 0, // TODO: Get from standings view
          final_week_net_score: 0 // TODO: Get from standings view
        },
        statistics: stats,
        player_statistics: playerStats,
        standings: {
          team_id: teamId,
          rank_in_division: teamStandingsInfo?.rank_in_division || 0,
          division_name: teamStandingsInfo?.division_name || 'Unknown',
          league_points: teamStandingsInfo?.total_points || 0,
          playoff_qualified: teamStandingsInfo?.playoff_qualified || false
        }
      };

      setTeamData(transformedData);
    } catch (error: any) {
      console.error('Error loading team details:', error);
      toast.error(error.response?.data?.error || 'Failed to load team details');
    } finally {
      setLoading(false);
    }
  };

  const loadMatchHistory = async () => {
    if (!leagueId) return;

    try {
      const response = await getLeagueMatchups(leagueId);
      const allMatches = response.data;

      // Filter matches for this team
      const teamMatches = allMatches.filter((match: any) =>
        match.team1_id === teamId || match.team2_id === teamId
      );

      // Transform to Match format
      const transformedMatches: Match[] = teamMatches.map((match: any) => {
        const isTeam1 = match.team1_id === teamId;
        const teamScore = isTeam1 ? match.team1_total_net : match.team2_total_net;
        const opponentScore = isTeam1 ? match.team2_total_net : match.team1_total_net;

        let result = 'pending';
        if (match.status === 'completed' && teamScore && opponentScore) {
          if (teamScore < opponentScore) result = 'won';
          else if (teamScore > opponentScore) result = 'lost';
          else result = 'tied';
        }

        return {
          id: match.id,
          league_id: match.league_id,
          week_number: match.week_number,
          opponent_name: isTeam1 ? match.team2_name : match.team1_name,
          opponent_id: isTeam1 ? match.team2_id : match.team1_id,
          team_score: teamScore || 0,
          opponent_score: opponentScore || 0,
          result,
          course_name: match.course_name || 'TBD',
          status: match.status,
          week_start_date: match.week_start_date || '',
          week_end_date: match.week_end_date || '',
          league_name: 'Unknown', // TODO: Get from league data
          division_name: match.division_name || 'Unknown'
        };
      });

      setMatchHistory(transformedMatches);
    } catch (error: any) {
      console.error('Error loading match history:', error);
      toast.error(error.response?.data?.error || 'Failed to load match history');
    }
  };

  // Helper functions
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'won': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'lost': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'tied': return <Trophy className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'won': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'tied': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Data</h3>
        <p className="text-gray-600">Unable to load team information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Team Details</h1>
            <p className="text-neutral-600">{teamData.team.name}</p>
          </div>
        </div>

        <button
          onClick={loadTeamDetails}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Team Overview */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <Award className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
            <p className="text-sm text-neutral-600">League Points</p>
            <p className="text-2xl font-bold text-brand-black">{teamData.team.league_points}</p>
          </div>
          <div className="text-center">
            <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-600">League Position</p>
            <p className="text-2xl font-bold text-brand-black">{teamData.standings.rank_in_division}</p>
          </div>
          <div className="text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-600">Total Matches</p>
            <p className="text-2xl font-bold text-brand-black">{teamData.statistics.total_matches}</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-600">Win %</p>
            <p className="text-2xl font-bold text-brand-black">{teamData.statistics.win_percentage.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'matches'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Match History
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'players'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            Player Statistics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Team Statistics */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Team Statistics</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-600">Wins</p>
                    <p className="text-2xl font-bold text-green-600">{teamData.statistics.wins}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Target className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-600">Losses</p>
                    <p className="text-2xl font-bold text-red-600">{teamData.statistics.losses}</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-600">Ties</p>
                    <p className="text-2xl font-bold text-yellow-600">{teamData.statistics.ties}</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Trophy className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-600">Total Points</p>
                    <p className="text-2xl font-bold text-blue-600">{teamData.statistics.total_points}</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-600">Avg Total Net</p>
                    <p className="text-lg font-bold text-brand-black">{teamData.statistics.avg_total_net.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">Best Total Net</p>
                    <p className="text-lg font-bold text-brand-black">{teamData.statistics.best_total_net}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-brand-black">Match History</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Opponent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                    {matchHistory.map((match) => (
                      <tr key={match.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-black">
                          Week {match.week_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div>
                            <div>{new Date(match.week_start_date).toLocaleDateString()}</div>
                            <div className="text-xs text-neutral-500">
                              to {new Date(match.week_end_date).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div className="font-medium">{match.opponent_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-neutral-400 mr-1" />
                            {match.course_name || 'TBD'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {match.status === 'completed' ? (
                            <div className="font-medium">
                              {match.team_score} - {match.opponent_score}
                            </div>
                          ) : (
                            <span className="text-neutral-400">TBD</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResultColor(match.result)}`}>
                            {getResultIcon(match.result)}
                            <span className="ml-1">{match.result}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            match.status === 'completed' ? 'bg-green-100 text-green-800' :
                            match.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* Scoring Trends */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Scoring Trends</h3>
                <p className="text-sm text-neutral-600">Performance analysis over time</p>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Scoring trends visualization coming soon</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This will show team performance over time with charts and graphs
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Form */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Recent Form</h3>
                <p className="text-sm text-neutral-600">Last 5 matches performance</p>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-2">
                  {matchHistory.slice(0, 5).map((match, index) => (
                    <div key={index} className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResultColor(match.result)}`}>
                        {getResultIcon(match.result)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-neutral-600">
                  <p>Recent form: {matchHistory.slice(0, 5).map(m => m.result).join('-')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetailsPage;
