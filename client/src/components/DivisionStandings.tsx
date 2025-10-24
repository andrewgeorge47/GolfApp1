import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
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
  MapPin
} from 'lucide-react';
import { toast } from 'react-toastify';

interface League {
  id: number;
  name: string;
  season: string;
}

interface Division {
  id: number;
  league_id: number;
  division_name: string;
  division_order: number;
}

interface TeamStanding {
  team_id: number;
  team_name: string;
  rank_in_division: number;
  matches_played: number;
  wins: number;
  ties: number;
  losses: number;
  league_points: number;
  aggregate_net_score: number;
  second_half_net_score: number;
  final_week_net_score: number;
  playoff_qualified: boolean;
}

interface Matchup {
  id: number;
  week_number: number;
  division_id: number;
  division_name: string;
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team2_name: string;
  winner_team_id: number | null;
  status: string;
  week_start_date: string;
  week_end_date: string;
  team1_total_net: number;
  team2_total_net: number;
  course_name: string;
  course_rating: number;
  course_slope: number;
  course_par: number;
  team1_individual_net: number;
  team2_individual_net: number;
  team1_alternate_shot_net: number;
  team2_alternate_shot_net: number;
  team1_points: number;
  team2_points: number;
  match_date: string;
  completed_at: string;
}

interface HeadToHead {
  [teamId: string]: {
    [opponentId: string]: string; // 'W', 'L', 'T', or null
  };
}

interface DivisionStandingsData {
  league: League;
  division: Division;
  standings: TeamStanding[];
  matchups: Matchup[];
  headToHead: HeadToHead;
}

interface DivisionStandingsProps {
  leagueId: number;
  divisionId: number;
  onBack?: () => void;
}

const DivisionStandings: React.FC<DivisionStandingsProps> = ({ 
  leagueId, 
  divisionId, 
  onBack 
}) => {
  const [standingsData, setStandingsData] = useState<DivisionStandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'standings' | 'headToHead' | 'schedule'>('standings');

  useEffect(() => {
    loadDivisionStandings();
  }, [leagueId, divisionId]);

  const loadDivisionStandings = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockData: DivisionStandingsData = {
        league: {
          id: leagueId,
          name: "UAL Season 2 Winter 2025",
          season: "Winter 2025"
        },
        division: {
          id: divisionId,
          league_id: leagueId,
          division_name: divisionId === 1 ? "Division A" : "Division B",
          division_order: divisionId
        },
        standings: [
          {
            team_id: 1,
            team_name: "Team Alpha",
            rank_in_division: 1,
            matches_played: 8,
            wins: 6,
            ties: 1,
            losses: 1,
            league_points: 13.0,
            aggregate_net_score: 142,
            second_half_net_score: 68,
            final_week_net_score: 34,
            playoff_qualified: true
          },
          {
            team_id: 2,
            team_name: "Team Beta",
            rank_in_division: 2,
            matches_played: 8,
            wins: 5,
            ties: 2,
            losses: 1,
            league_points: 12.0,
            aggregate_net_score: 148,
            second_half_net_score: 72,
            final_week_net_score: 36,
            playoff_qualified: false
          },
          {
            team_id: 3,
            team_name: "Team Gamma",
            rank_in_division: 3,
            matches_played: 8,
            wins: 4,
            ties: 1,
            losses: 3,
            league_points: 9.0,
            aggregate_net_score: 155,
            second_half_net_score: 78,
            final_week_net_score: 39,
            playoff_qualified: false
          }
        ],
        matchups: [
          {
            id: 1,
            week_number: 8,
            division_id: divisionId,
            division_name: divisionId === 1 ? "Division A" : "Division B",
            team1_id: 1,
            team2_id: 2,
            team1_name: "Team Alpha",
            team2_name: "Team Beta",
            winner_team_id: 1,
            status: "completed",
            week_start_date: "2025-01-22",
            week_end_date: "2025-01-28",
            course_name: "Pebble Beach",
            course_rating: 72.0,
            course_slope: 140,
            course_par: 72,
            team1_individual_net: 18,
            team2_individual_net: 19,
            team1_alternate_shot_net: 16,
            team2_alternate_shot_net: 17,
            team1_total_net: 34,
            team2_total_net: 36,
            team1_points: 1.0,
            team2_points: 0.0,
            match_date: "2025-01-25",
            completed_at: "2025-01-25T18:30:00Z"
          },
          {
            id: 2,
            week_number: 7,
            division_id: divisionId,
            division_name: divisionId === 1 ? "Division A" : "Division B",
            team1_id: 1,
            team2_id: 3,
            team1_name: "Team Alpha",
            team2_name: "Team Gamma",
            winner_team_id: 1,
            status: "completed",
            week_start_date: "2025-01-15",
            week_end_date: "2025-01-21",
            course_name: "Augusta National",
            course_rating: 74.0,
            course_slope: 135,
            course_par: 72,
            team1_individual_net: 17,
            team2_individual_net: 20,
            team1_alternate_shot_net: 15,
            team2_alternate_shot_net: 18,
            team1_total_net: 32,
            team2_total_net: 38,
            team1_points: 1.0,
            team2_points: 0.0,
            match_date: "2025-01-18",
            completed_at: "2025-01-18T17:45:00Z"
          },
          {
            id: 3,
            week_number: 6,
            division_id: divisionId,
            division_name: divisionId === 1 ? "Division A" : "Division B",
            team1_id: 2,
            team2_id: 3,
            team1_name: "Team Beta",
            team2_name: "Team Gamma",
            winner_team_id: 2,
            status: "completed",
            week_start_date: "2025-01-08",
            week_end_date: "2025-01-14",
            course_name: "St. Andrews",
            course_rating: 71.0,
            course_slope: 130,
            course_par: 72,
            team1_individual_net: 18,
            team2_individual_net: 19,
            team1_alternate_shot_net: 17,
            team2_alternate_shot_net: 18,
            team1_total_net: 35,
            team2_total_net: 37,
            team1_points: 1.0,
            team2_points: 0.0,
            match_date: "2025-01-11",
            completed_at: "2025-01-11T16:20:00Z"
          }
        ],
        headToHead: {
          "1": {
            "2": "W",
            "3": "W"
          },
          "2": {
            "1": "L",
            "3": "W"
          },
          "3": {
            "1": "L",
            "2": "L"
          }
        }
      };
      
      setStandingsData(mockData);
      
      // Simulate loading delay
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading division standings:', error);
      toast.error('Failed to load division standings');
      setLoading(false);
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
          Playoff
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!standingsData) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No division standings data available</p>
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
          <Trophy className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">
              {standingsData.division.division_name}
            </h1>
            <p className="text-neutral-600">
              {standingsData.league.name} - {standingsData.league.season}
            </p>
          </div>
        </div>
        
        <button
          onClick={loadDivisionStandings}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('standings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'standings'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Standings
          </button>
          <button
            onClick={() => setActiveTab('headToHead')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'headToHead'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Head-to-Head
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedule'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Schedule
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'standings' && (
          <div className="space-y-6">
            {/* Standings Table */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        W-T-L
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Aggregate Net
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Second Half
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Final Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Playoff
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {standingsData.standings.map((team) => (
                      <tr key={team.team_id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-black">
                          <span className="text-lg font-bold">#{team.rank_in_division}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-brand-neon-green flex items-center justify-center">
                                <span className="text-sm font-medium text-brand-black">
                                  {team.team_name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-brand-black">
                                {team.team_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <span className="text-lg font-bold">{team.league_points}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <span className="font-medium">
                            {team.wins}-{team.ties}-{team.losses}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {team.aggregate_net_score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {team.second_half_net_score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {team.final_week_net_score}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {getPlayoffBadge(team.playoff_qualified)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center">
                  <Trophy className="w-8 h-8 text-brand-neon-green" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Teams in Division</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {standingsData.standings.length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center">
                  <Target className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Playoff Qualified</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {standingsData.standings.filter(t => t.playoff_qualified).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Total Matches</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {standingsData.matchups.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'headToHead' && (
          <div className="space-y-6">
            {/* Head-to-Head Matrix */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Head-to-Head Results</h3>
                <p className="text-sm text-neutral-600">Results from each team's perspective</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Team
                      </th>
                      {standingsData.standings.map((team) => (
                        <th key={team.team_id} className="px-3 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          {team.team_name.split(' ')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {standingsData.standings.map((team) => (
                      <tr key={team.team_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-black">
                          {team.team_name}
                        </td>
                        {standingsData.standings.map((opponent) => (
                          <td key={opponent.team_id} className="px-3 py-4 whitespace-nowrap text-center">
                            {team.team_id === opponent.team_id ? (
                              <span className="text-neutral-400">-</span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResultColor(standingsData.headToHead[team.team_id]?.[opponent.team_id] || '')}`}>
                                {getResultIcon(standingsData.headToHead[team.team_id]?.[opponent.team_id] || '')}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Legend</h4>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-blue-700">Win</span>
                </div>
                <div className="flex items-center">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-blue-700">Loss</span>
                </div>
                <div className="flex items-center">
                  <Minus className="w-4 h-4 text-yellow-500 mr-1" />
                  <span className="text-blue-700">Tie</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-400 mr-1" />
                  <span className="text-blue-700">Not Played</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Weekly Schedule */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Weekly Match Schedule</h3>
                <p className="text-sm text-neutral-600">All matchups in this division</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Date Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Matchup
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Course
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
                    {standingsData.matchups
                      .sort((a, b) => b.week_number - a.week_number)
                      .map((matchup) => (
                      <tr key={matchup.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-black">
                          Week {matchup.week_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div>
                            <div>{new Date(matchup.week_start_date).toLocaleDateString()}</div>
                            <div className="text-xs text-neutral-500">
                              to {new Date(matchup.week_end_date).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div>
                            <div className="font-medium">{matchup.team1_name}</div>
                            <div className="text-xs text-neutral-500">vs</div>
                            <div className="font-medium">{matchup.team2_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-neutral-400 mr-1" />
                            {matchup.course_name || 'TBD'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {matchup.status === 'completed' ? (
                            <div>
                              <div className="font-medium">
                                {matchup.team1_total_net} - {matchup.team2_total_net}
                              </div>
                              <div className="text-xs text-neutral-500">
                                Winner: {matchup.winner_team_id === matchup.team1_id ? matchup.team1_name : matchup.team2_name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">TBD</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            matchup.status === 'completed' ? 'bg-green-100 text-green-800' :
                            matchup.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {matchup.status.charAt(0).toUpperCase() + matchup.status.slice(1)}
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
      </div>
    </div>
  );
};

export default DivisionStandings;
