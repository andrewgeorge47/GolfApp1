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
import { getLeague, getLeagueStandings } from '../services/api';

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
      // Fetch league details
      const leagueResponse = await getLeague(leagueId);
      const leagueData = leagueResponse.data;

      // Fetch standings
      const standingsResponse = await getLeagueStandings(leagueId);
      const standingsAPIData = standingsResponse.data;

      // Transform API data to component format
      const allStandings: TeamStanding[] = [];
      const divisionsRecord: Record<string, TeamStanding[]> = {};

      standingsAPIData.divisions.forEach((division: any) => {
        const divisionStandings: TeamStanding[] = division.teams.map((team: any) => ({
          league_id: leagueId,
          division_id: division.division_id,
          division_name: division.division_name,
          team_id: team.team_id,
          team_name: team.team_name,
          captain_id: 0, // Not provided by API
          captain_name: team.captain_name || 'Unknown',
          matches_played: team.wins + team.ties + team.losses,
          wins: team.wins,
          ties: team.ties,
          losses: team.losses,
          total_points: team.total_points,
          league_points: team.total_points,
          aggregate_net_score: team.aggregate_net_score,
          second_half_net_score: 0, // Not provided by API
          final_week_net_score: 0, // Not provided by API
          division_rank: team.rank_in_division,
          rank_in_division: team.rank_in_division,
          playoff_qualified: team.playoff_qualified,
          recent_form: '' // Not provided by API
        }));

        divisionsRecord[division.division_name] = divisionStandings;
        allStandings.push(...divisionStandings);
      });

      const transformedData: StandingsData = {
        league: {
          id: leagueData.id,
          name: leagueData.name,
          season: leagueData.season || '',
          playoff_format: leagueData.playoff_format || 'top_per_division',
          divisions_count: standingsAPIData.divisions.length
        },
        standings: allStandings,
        divisions: divisionsRecord,
        playoff_format: leagueData.playoff_format || 'top_per_division'
      };

      setStandingsData(transformedData);

      // Set first division as active if available
      if (standingsAPIData.divisions.length > 0) {
        setActiveDivision(standingsAPIData.divisions[0].division_name);
      }
    } catch (error: any) {
      console.error('Error loading standings:', error);
      toast.error(error.response?.data?.error || 'Failed to load standings');
    } finally {
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
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-neutral-700 mb-2">Team Stats</h4>
                            <div className="space-y-1 text-sm">
                              <div>Total Points: <span className="font-medium">{team.league_points}</span></div>
                              <div>Aggregate Net: <span className="font-medium">{team.aggregate_net_score}</span></div>
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
