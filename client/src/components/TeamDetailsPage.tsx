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
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'matches' | 'trends'>('overview');

  useEffect(() => {
    loadTeamDetails();
    loadMatchHistory();
  }, [teamId, leagueId]);

  const loadTeamDetails = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockData: TeamDetailsData = {
        team: {
          id: teamId,
          name: "Team Alpha",
          captain_id: 101,
          captain_name: "John Smith",
          league_id: leagueId || 1,
          league_name: "UAL Season 2 Winter 2025",
          division_id: 1,
          division_name: "Division A",
          league_points: 13.0,
          aggregate_net_score: 142,
          second_half_net_score: 68,
          final_week_net_score: 34
        },
        statistics: {
          total_matches: 8,
          wins: 6,
          ties: 1,
          losses: 1,
          total_points: 13.0,
          avg_total_net: 17.75,
          best_total_net: 32,
          worst_total_net: 40,
          win_percentage: 81.3
        },
        player_statistics: [
          {
            member_id: 101,
            player_name: "John Smith",
            matches_played: 8,
            avg_gross: 12.5,
            best_gross: 11,
            avg_net: 10.8,
            best_net: 9,
            handicap: 12,
            role: "captain"
          },
          {
            member_id: 102,
            player_name: "Sarah Johnson",
            matches_played: 7,
            avg_gross: 13.2,
            best_gross: 12,
            avg_net: 11.5,
            best_net: 10,
            handicap: 14,
            role: "member"
          },
          {
            member_id: 103,
            player_name: "Mike Davis",
            matches_played: 6,
            avg_gross: 14.0,
            best_gross: 13,
            avg_net: 12.2,
            best_net: 11,
            handicap: 16,
            role: "member"
          },
          {
            member_id: 104,
            player_name: "Emily Wilson",
            matches_played: 5,
            avg_gross: 13.8,
            best_gross: 12,
            avg_net: 12.0,
            best_net: 10,
            handicap: 15,
            role: "member"
          }
        ],
        standings: {
          team_id: teamId,
          rank_in_division: 1,
          division_name: "Division A",
          league_points: 13.0,
          playoff_qualified: true
        }
      };
      
      setTeamData(mockData);
      
      // Simulate loading delay
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading team details:', error);
      toast.error('Failed to load team details');
      setLoading(false);
    }
  };

  const loadMatchHistory = async () => {
    try {
      // Mock match history data
      const mockMatches: Match[] = [
        {
          id: 1,
          league_id: leagueId || 1,
          week_number: 8,
          opponent_name: "Team Beta",
          opponent_id: 2,
          team_score: 34,
          opponent_score: 36,
          result: "W",
          course_name: "Pebble Beach",
          status: "completed",
          week_start_date: "2025-01-22",
          week_end_date: "2025-01-28",
          league_name: "UAL Season 2 Winter 2025",
          division_name: "Division A"
        },
        {
          id: 2,
          league_id: leagueId || 1,
          week_number: 7,
          opponent_name: "Team Gamma",
          opponent_id: 3,
          team_score: 32,
          opponent_score: 38,
          result: "W",
          course_name: "Augusta National",
          status: "completed",
          week_start_date: "2025-01-15",
          week_end_date: "2025-01-21",
          league_name: "UAL Season 2 Winter 2025",
          division_name: "Division A"
        },
        {
          id: 3,
          league_id: leagueId || 1,
          week_number: 6,
          opponent_name: "Team Delta",
          opponent_id: 4,
          team_score: 35,
          opponent_score: 35,
          result: "T",
          course_name: "St. Andrews",
          status: "completed",
          week_start_date: "2025-01-08",
          week_end_date: "2025-01-14",
          league_name: "UAL Season 2 Winter 2025",
          division_name: "Division A"
        },
        {
          id: 4,
          league_id: leagueId || 1,
          week_number: 5,
          opponent_name: "Team Epsilon",
          opponent_id: 5,
          team_score: 38,
          opponent_score: 33,
          result: "L",
          course_name: "Cypress Point",
          status: "completed",
          week_start_date: "2025-01-01",
          week_end_date: "2025-01-07",
          league_name: "UAL Season 2 Winter 2025",
          division_name: "Division A"
        },
        {
          id: 5,
          league_id: leagueId || 1,
          week_number: 4,
          opponent_name: "Team Zeta",
          opponent_id: 6,
          team_score: 33,
          opponent_score: 37,
          result: "W",
          course_name: "Pine Valley",
          status: "completed",
          week_start_date: "2024-12-25",
          week_end_date: "2024-12-31",
          league_name: "UAL Season 2 Winter 2025",
          division_name: "Division A"
        }
      ];
      
      setMatchHistory(mockMatches);
    } catch (error) {
      console.error('Error loading match history:', error);
      toast.error('Failed to load match history');
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'W': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'L': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'T': return <Minus className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'W': return 'bg-green-100 text-green-800';
      case 'L': return 'bg-red-100 text-red-800';
      case 'T': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlayoffBadge = (qualified: boolean) => {
    if (qualified) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Award className="w-3 h-3 mr-1" />
          Playoff Qualified
        </span>
      );
    }
    return null;
  };

  const getRoleIcon = (role: string) => {
    if (role === 'captain') {
      return <Star className="w-4 h-4 text-yellow-500" />;
    }
    return <User className="w-4 h-4 text-neutral-400" />;
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
        <p className="text-gray-600">No team data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
          )}
          <div className="flex-shrink-0 h-12 w-12">
            <div className="h-12 w-12 rounded-full bg-brand-neon-green flex items-center justify-center">
              <span className="text-lg font-medium text-brand-black">
                {teamData.team.name.charAt(0)}
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-black">{teamData.team.name}</h1>
            <p className="text-neutral-600">
              {teamData.team.league_name} - {teamData.team.division_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {getPlayoffBadge(teamData.standings.playoff_qualified)}
          <button
            onClick={() => {
              loadTeamDetails();
              loadMatchHistory();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Team Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-brand-neon-green" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">League Points</p>
              <p className="text-2xl font-bold text-brand-black">{teamData.team.league_points}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Division Rank</p>
              <p className="text-2xl font-bold text-brand-black">#{teamData.standings.rank_in_division}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Win %</p>
              <p className="text-2xl font-bold text-brand-black">{teamData.statistics.win_percentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Matches Played</p>
              <p className="text-2xl font-bold text-brand-black">{teamData.statistics.total_matches}</p>
            </div>
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
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roster'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Roster
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
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Scoring Trends
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Team Performance */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Team Performance</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-3">Match Record</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Wins:</span>
                        <span className="text-sm font-medium text-green-600">{teamData.statistics.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Ties:</span>
                        <span className="text-sm font-medium text-yellow-600">{teamData.statistics.ties}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Losses:</span>
                        <span className="text-sm font-medium text-red-600">{teamData.statistics.losses}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-neutral-700">Total Points:</span>
                        <span className="text-sm font-bold text-brand-black">{teamData.statistics.total_points}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-3">Scoring Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Average Net:</span>
                        <span className="text-sm font-medium text-brand-black">{teamData.statistics.avg_total_net.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Best Net:</span>
                        <span className="text-sm font-medium text-green-600">{teamData.statistics.best_total_net}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Worst Net:</span>
                        <span className="text-sm font-medium text-red-600">{teamData.statistics.worst_total_net}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-neutral-700">Aggregate Net:</span>
                        <span className="text-sm font-bold text-brand-black">{teamData.team.aggregate_net_score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tiebreaker Information */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Tiebreaker Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-black">{teamData.team.league_points}</div>
                    <div className="text-sm text-neutral-600">Total Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-black">{teamData.team.aggregate_net_score}</div>
                    <div className="text-sm text-neutral-600">Aggregate Net</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-brand-black">{teamData.team.second_half_net_score}</div>
                    <div className="text-sm text-neutral-600">Second Half Net</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="space-y-6">
            {/* Roster Table */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Team Roster</h3>
                <p className="text-sm text-neutral-600">Player statistics and performance</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Handicap
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Matches Played
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Avg Gross
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Avg Net
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Best Net
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {teamData.player_statistics.map((player) => (
                      <tr key={player.member_id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                                <User className="w-5 h-5 text-neutral-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-brand-black">
                                {player.player_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div className="flex items-center">
                            {getRoleIcon(player.role)}
                            <span className="ml-1 capitalize">{player.role}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {player.handicap}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {player.matches_played}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {player.avg_gross.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {player.avg_net.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <span className="text-green-600 font-medium">{player.best_net}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6">
            {/* Match History */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Match History</h3>
                <p className="text-sm text-neutral-600">Recent match results and performance</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Date
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
