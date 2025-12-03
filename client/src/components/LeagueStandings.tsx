import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronRight,
  ChevronDown,
  Award,
  Target,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

interface League {
  id: number;
  name: string;
  season: string;
  playoff_format: string;
  divisions_count: number;
}

interface TeamStanding {
  league_id: number;
  division_id: number;
  division_name: string;
  team_id: number;
  team_name: string;
  captain_id: number;
  captain_name: string;
  matches_played: number;
  wins: number;
  ties: number;
  losses: number;
  total_points: number;
  league_points: number;
  aggregate_net_score: number;
  second_half_net_score: number;
  final_week_net_score: number;
  division_rank: number;
  rank_in_division: number;
  playoff_qualified: boolean;
  recent_form?: string;
}

interface StandingsData {
  league: League;
  standings: TeamStanding[];
  divisions: Record<string, TeamStanding[]>;
  playoff_format: string;
}

interface LeagueStandingsProps {
  leagueId?: number;
}

const LeagueStandings: React.FC<LeagueStandingsProps> = ({ leagueId }) => {
  const [standingsData, setStandingsData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDivision, setActiveDivision] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (leagueId) {
      loadStandings();
    }
  }, [leagueId]);

  const loadStandings = async () => {
    if (!leagueId) return;
    
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockData: StandingsData = {
        league: {
          id: leagueId,
          name: "UAL Season 2 Winter 2025",
          season: "Winter 2025",
          playoff_format: "top_per_division",
          divisions_count: 2
        },
        standings: [
          {
            league_id: leagueId,
            division_id: 1,
            division_name: "Division A",
            team_id: 1,
            team_name: "Team Alpha",
            captain_id: 101,
            captain_name: "John Smith",
            matches_played: 8,
            wins: 6,
            ties: 1,
            losses: 1,
            total_points: 13.0,
            league_points: 13.0,
            aggregate_net_score: 142,
            second_half_net_score: 68,
            final_week_net_score: 34,
            division_rank: 1,
            rank_in_division: 1,
            playoff_qualified: true,
            recent_form: "WWLWT"
          },
          {
            league_id: leagueId,
            division_id: 1,
            division_name: "Division A",
            team_id: 2,
            team_name: "Team Beta",
            captain_id: 102,
            captain_name: "Sarah Johnson",
            matches_played: 8,
            wins: 5,
            ties: 2,
            losses: 1,
            total_points: 12.0,
            league_points: 12.0,
            aggregate_net_score: 148,
            second_half_net_score: 72,
            final_week_net_score: 36,
            division_rank: 2,
            rank_in_division: 2,
            playoff_qualified: false,
            recent_form: "WLWTW"
          },
          {
            league_id: leagueId,
            division_id: 1,
            division_name: "Division A",
            team_id: 3,
            team_name: "Team Gamma",
            captain_id: 103,
            captain_name: "Mike Davis",
            matches_played: 8,
            wins: 4,
            ties: 1,
            losses: 3,
            total_points: 9.0,
            league_points: 9.0,
            aggregate_net_score: 155,
            second_half_net_score: 78,
            final_week_net_score: 39,
            division_rank: 3,
            rank_in_division: 3,
            playoff_qualified: false,
            recent_form: "LWLTL"
          },
          {
            league_id: leagueId,
            division_id: 2,
            division_name: "Division B",
            team_id: 4,
            team_name: "Team Delta",
            captain_id: 104,
            captain_name: "Emily Wilson",
            matches_played: 8,
            wins: 7,
            ties: 0,
            losses: 1,
            total_points: 14.0,
            league_points: 14.0,
            aggregate_net_score: 138,
            second_half_net_score: 65,
            final_week_net_score: 32,
            division_rank: 1,
            rank_in_division: 1,
            playoff_qualified: true,
            recent_form: "WWWWL"
          },
          {
            league_id: leagueId,
            division_id: 2,
            division_name: "Division B",
            team_id: 5,
            team_name: "Team Epsilon",
            captain_id: 105,
            captain_name: "David Brown",
            matches_played: 8,
            wins: 5,
            ties: 1,
            losses: 2,
            total_points: 11.5,
            league_points: 11.5,
            aggregate_net_score: 145,
            second_half_net_score: 70,
            final_week_net_score: 35,
            division_rank: 2,
            rank_in_division: 2,
            playoff_qualified: false,
            recent_form: "WLTWW"
          },
          {
            league_id: leagueId,
            division_id: 2,
            division_name: "Division B",
            team_id: 6,
            team_name: "Team Zeta",
            captain_id: 106,
            captain_name: "Lisa Anderson",
            matches_played: 8,
            wins: 3,
            ties: 2,
            losses: 3,
            total_points: 8.0,
            league_points: 8.0,
            aggregate_net_score: 162,
            second_half_net_score: 82,
            final_week_net_score: 41,
            division_rank: 3,
            rank_in_division: 3,
            playoff_qualified: false,
            recent_form: "TLWLT"
          }
        ],
        divisions: {
          "Division A": [
            {
              league_id: leagueId,
              division_id: 1,
              division_name: "Division A",
              team_id: 1,
              team_name: "Team Alpha",
              captain_id: 101,
              captain_name: "John Smith",
              matches_played: 8,
              wins: 6,
              ties: 1,
              losses: 1,
              total_points: 13.0,
              league_points: 13.0,
              aggregate_net_score: 142,
              second_half_net_score: 68,
              final_week_net_score: 34,
              division_rank: 1,
              rank_in_division: 1,
              playoff_qualified: true,
              recent_form: "WWLWT"
            },
            {
              league_id: leagueId,
              division_id: 1,
              division_name: "Division A",
              team_id: 2,
              team_name: "Team Beta",
              captain_id: 102,
              captain_name: "Sarah Johnson",
              matches_played: 8,
              wins: 5,
              ties: 2,
              losses: 1,
              total_points: 12.0,
              league_points: 12.0,
              aggregate_net_score: 148,
              second_half_net_score: 72,
              final_week_net_score: 36,
              division_rank: 2,
              rank_in_division: 2,
              playoff_qualified: false,
              recent_form: "WLWTW"
            },
            {
              league_id: leagueId,
              division_id: 1,
              division_name: "Division A",
              team_id: 3,
              team_name: "Team Gamma",
              captain_id: 103,
              captain_name: "Mike Davis",
              matches_played: 8,
              wins: 4,
              ties: 1,
              losses: 3,
              total_points: 9.0,
              league_points: 9.0,
              aggregate_net_score: 155,
              second_half_net_score: 78,
              final_week_net_score: 39,
              division_rank: 3,
              rank_in_division: 3,
              playoff_qualified: false,
              recent_form: "LWLTL"
            }
          ],
          "Division B": [
            {
              league_id: leagueId,
              division_id: 2,
              division_name: "Division B",
              team_id: 4,
              team_name: "Team Delta",
              captain_id: 104,
              captain_name: "Emily Wilson",
              matches_played: 8,
              wins: 7,
              ties: 0,
              losses: 1,
              total_points: 14.0,
              league_points: 14.0,
              aggregate_net_score: 138,
              second_half_net_score: 65,
              final_week_net_score: 32,
              division_rank: 1,
              rank_in_division: 1,
              playoff_qualified: true,
              recent_form: "WWWWL"
            },
            {
              league_id: leagueId,
              division_id: 2,
              division_name: "Division B",
              team_id: 5,
              team_name: "Team Epsilon",
              captain_id: 105,
              captain_name: "David Brown",
              matches_played: 8,
              wins: 5,
              ties: 1,
              losses: 2,
              total_points: 11.5,
              league_points: 11.5,
              aggregate_net_score: 145,
              second_half_net_score: 70,
              final_week_net_score: 35,
              division_rank: 2,
              rank_in_division: 2,
              playoff_qualified: false,
              recent_form: "WLTWW"
            },
            {
              league_id: leagueId,
              division_id: 2,
              division_name: "Division B",
              team_id: 6,
              team_name: "Team Zeta",
              captain_id: 106,
              captain_name: "Lisa Anderson",
              matches_played: 8,
              wins: 3,
              ties: 2,
              losses: 3,
              total_points: 8.0,
              league_points: 8.0,
              aggregate_net_score: 162,
              second_half_net_score: 82,
              final_week_net_score: 41,
              division_rank: 3,
              rank_in_division: 3,
              playoff_qualified: false,
              recent_form: "TLWLT"
            }
          ]
        },
        playoff_format: "top_per_division"
      };
      
      setStandingsData(mockData);
      setActiveDivision("Division A");
      
      // Simulate loading delay
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading standings:', error);
      toast.error('Failed to load standings');
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleTeamExpansion = (teamId: number) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const getFormIcon = (form: string) => {
    switch (form) {
      case 'W': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'L': return <TrendingDown className="w-3 h-3 text-red-500" />;
      case 'T': return <Minus className="w-3 h-3 text-yellow-500" />;
      default: return null;
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

  const getSortedStandings = () => {
    if (!standingsData) return [];
    
    let teams = standingsData.standings;
    
    if (activeDivision !== 'all') {
      teams = standingsData.divisions[activeDivision] || [];
    }
    
    return teams.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortColumn) {
        case 'rank':
          return sortDirection === 'asc' ? a.rank_in_division - b.rank_in_division : b.rank_in_division - a.rank_in_division;
        case 'team':
          return sortDirection === 'asc' ? a.team_name.localeCompare(b.team_name) : b.team_name.localeCompare(a.team_name);
        case 'points':
          return sortDirection === 'asc' ? a.league_points - b.league_points : b.league_points - a.league_points;
        case 'record':
          const aRecord = a.wins + (a.ties * 0.5);
          const bRecord = b.wins + (b.ties * 0.5);
          return sortDirection === 'asc' ? aRecord - bRecord : bRecord - aRecord;
        case 'aggregate':
          return sortDirection === 'asc' ? a.aggregate_net_score - b.aggregate_net_score : b.aggregate_net_score - a.aggregate_net_score;
        default:
          return 0;
      }
    });
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
        <p className="text-gray-600">No standings data available</p>
      </div>
    );
  }

  const sortedStandings = getSortedStandings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">{standingsData.league.name}</h1>
            <p className="text-neutral-600">{standingsData.league.season}</p>
          </div>
        </div>
        
        <button
          onClick={loadStandings}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Division Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveDivision('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeDivision === 'all'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            All Divisions
          </button>
          {Object.keys(standingsData.divisions).map((divisionName) => (
            <button
              key={divisionName}
              onClick={() => setActiveDivision(divisionName)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeDivision === divisionName
                  ? 'border-brand-neon-green text-brand-neon-green'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              {divisionName}
            </button>
          ))}
        </nav>
      </div>

      {/* Standings Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center">
                    Rank
                    {sortColumn === 'rank' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('team')}
                >
                  <div className="flex items-center">
                    Team
                    {sortColumn === 'team' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('points')}
                >
                  <div className="flex items-center">
                    Points
                    {sortColumn === 'points' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('record')}
                >
                  <div className="flex items-center">
                    W-T-L
                    {sortColumn === 'record' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('aggregate')}
                >
                  <div className="flex items-center">
                    Aggregate Net
                    {sortColumn === 'aggregate' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Recent Form
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Playoff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {sortedStandings.map((team) => (
                <React.Fragment key={team.team_id}>
                  <tr 
                    className="hover:bg-neutral-50 cursor-pointer"
                    onClick={() => toggleTeamExpansion(team.team_id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-black">
                      <div className="flex items-center">
                        <span className="text-lg font-bold">#{team.rank_in_division}</span>
                        {team.division_name && activeDivision === 'all' && (
                          <span className="ml-2 text-xs text-neutral-500">
                            ({team.division_name})
                          </span>
                        )}
                      </div>
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
                          <div className="text-sm text-neutral-500">
                            {team.captain_name}
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
                      <div className="flex items-center space-x-1">
                        {team.recent_form?.split('').map((result, index) => (
                          <span key={index} className="flex items-center">
                            {getFormIcon(result)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                      {getPlayoffBadge(team.playoff_qualified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                      <button className="p-1 hover:bg-neutral-100 rounded">
                        {expandedTeams.has(team.team_id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Team Details */}
                  {expandedTeams.has(team.team_id) && (
                    <tr className="bg-neutral-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-2">Team Stats</h4>
                            <div className="space-y-1 text-sm">
                              <div>Matches Played: <span className="font-medium">{team.matches_played}</span></div>
                              <div>Win %: <span className="font-medium">
                                {team.matches_played > 0 ? 
                                  ((team.wins + (team.ties * 0.5)) / team.matches_played * 100).toFixed(1) : 0}%
                              </span></div>
                              <div>Second Half Net: <span className="font-medium">{team.second_half_net_score}</span></div>
                              <div>Final Week Net: <span className="font-medium">{team.final_week_net_score}</span></div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-2">Tiebreaker Info</h4>
                            <div className="space-y-1 text-sm">
                              <div>Total Points: <span className="font-medium">{team.league_points}</span></div>
                              <div>Aggregate Net: <span className="font-medium">{team.aggregate_net_score}</span></div>
                              <div>Second Half: <span className="font-medium">{team.second_half_net_score}</span></div>
                              <div>Final Week: <span className="font-medium">{team.final_week_net_score}</span></div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-2">Actions</h4>
                            <div className="space-y-2">
                              <button className="w-full text-left px-3 py-2 text-sm bg-white border border-neutral-300 rounded hover:bg-neutral-50">
                                View Team Details
                              </button>
                              <button className="w-full text-left px-3 py-2 text-sm bg-white border border-neutral-300 rounded hover:bg-neutral-50">
                                View Match History
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playoff Format Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Target className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-sm font-medium text-blue-800">Playoff Format</h3>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          {standingsData.playoff_format === 'top_per_division' && 
            'Top team from each division qualifies for playoffs'}
          {standingsData.playoff_format === 'top_overall' && 
            `Top ${standingsData.league.divisions_count} teams overall qualify for playoffs`}
          {standingsData.playoff_format === 'bracket' && 
            'Top 2 teams from each division qualify for playoffs'}
        </p>
      </div>
    </div>
  );
};

export default LeagueStandings;
