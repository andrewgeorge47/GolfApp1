import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Trophy, 
  Target,
  Award,
  Clock,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
import { getCaptainDashboard } from '../services/api';

interface TeamMember {
  user_member_id: number;
  first_name: string;
  last_name: string;
  email_address: string;
  handicap: number;
  is_captain: boolean;
  phone?: string;
}

interface UpcomingMatch {
  id: number;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  opponent_name: string;
  opponent_captain_name: string;
  course_name?: string;
  course_rating?: number;
  course_slope?: number;
  course_par?: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  match_date?: string;
}

interface TeamStats {
  team_id: number;
  wins: number;
  losses: number;
  ties: number;
  total_points: number;
  aggregate_net_total: number;
  league_position: number;
  total_teams: number;
}

interface TeamData {
  team: {
    id: number;
    name: string;
    captain_id: number;
    league_id: number;
    division_id: number;
    league_points: number;
    aggregate_net_score: number;
    created_at: string;
  };
  roster: TeamMember[];
  upcomingMatches: UpcomingMatch[];
  standings: TeamStats;
}

interface PlayerTeamViewProps {
  teamId: number;
  leagueId: number;
}

// Helper functions
const formatWeekRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'scheduled':
      return <Clock className="w-3 h-3" />;
    case 'in_progress':
      return <Target className="w-3 h-3" />;
    case 'completed':
      return <Trophy className="w-3 h-3" />;
    default:
      return <Calendar className="w-3 h-3" />;
  }
};

const PlayerTeamView: React.FC<PlayerTeamViewProps> = ({ teamId, leagueId }) => {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'schedule' | 'stats'>('roster');

  useEffect(() => {
    if (teamId && leagueId) {
      loadTeamData();
    }
  }, [teamId, leagueId]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const response = await getCaptainDashboard(teamId, leagueId);
      const data = response.data;

      // Transform roster
      const transformedRoster: TeamMember[] = data.roster.map((member: any) => ({
        user_member_id: member.user_member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        email_address: member.email_address || '',
        handicap: member.handicap || 0,
        is_captain: member.is_captain,
        phone: member.phone
      }));

      // Transform upcoming matches
      const transformedMatches: UpcomingMatch[] = data.upcomingMatches.map((match: any) => ({
        id: match.id,
        week_number: match.week_number,
        week_start_date: match.week_start_date,
        week_end_date: match.week_end_date,
        opponent_name: match.opponent_name,
        opponent_captain_name: '', // Not provided by API
        course_name: match.course_name,
        course_rating: match.course_rating,
        course_slope: match.course_slope,
        course_par: match.course_par,
        status: match.status,
        match_date: match.match_date
      }));

      // Transform standings
      const standings: TeamStats = {
        team_id: data.team.id,
        wins: data.standings?.wins || 0,
        losses: data.standings?.losses || 0,
        ties: data.standings?.ties || 0,
        total_points: data.standings?.league_points || 0,
        aggregate_net_total: data.standings?.aggregate_net_score || 0,
        league_position: data.standings?.division_rank || 0,
        total_teams: 0 // TODO: Get from league data
      };

      const transformedTeamData: TeamData = {
        team: {
          id: data.team.id,
          name: data.team.name,
          captain_id: data.team.captain_id,
          league_id: leagueId,
          division_id: data.team.division_id || 0,
          league_points: data.team.league_points || 0,
          aggregate_net_score: data.team.aggregate_net_score || 0,
          created_at: data.team.created_at
        },
        roster: transformedRoster,
        upcomingMatches: transformedMatches,
        standings
      };

      setTeamData(transformedTeamData);
    } catch (error: any) {
      console.error('Error loading team data:', error);
      toast.error(error.response?.data?.error || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-brand-black">My Team</h1>
            <p className="text-neutral-600">View your team roster, schedule, and statistics</p>
          </div>
        </div>
        
        <button
          onClick={loadTeamData}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Team Overview */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-black">{teamData.team.name}</h2>
            <p className="text-neutral-600">League Points: {teamData.team.league_points}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-600">League Position</p>
            <p className="text-2xl font-bold text-brand-black">
              {teamData.standings.league_position}/{teamData.standings.total_teams}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-neutral-600">Wins</p>
            <p className="text-xl font-bold text-green-600">{teamData.standings.wins}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600">Losses</p>
            <p className="text-xl font-bold text-red-600">{teamData.standings.losses}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600">Ties</p>
            <p className="text-xl font-bold text-yellow-600">{teamData.standings.ties}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600">Total Points</p>
            <p className="text-xl font-bold text-brand-black">{teamData.standings.total_points}</p>
          </div>
        </div>
      </div>

          {/* Tab Navigation */}
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('roster')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roster'
                    ? 'border-brand-neon-green text-brand-neon-green'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Team Roster
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
                Match Schedule
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-brand-neon-green text-brand-neon-green'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <Trophy className="w-4 h-4 inline mr-2" />
                Team Statistics
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'roster' && (
              <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <h3 className="text-lg font-semibold text-brand-black">Team Roster</h3>
                </div>
                
                <div className="divide-y divide-neutral-200">
                  {teamData.roster.map((member) => (
                    <div key={member.user_member_id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-brand-neon-green rounded-full flex items-center justify-center">
                              <span className="text-brand-black font-semibold">
                                {member.first_name[0]}{member.last_name[0]}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-semibold text-brand-black">
                              {member.first_name} {member.last_name}
                              {member.is_captain && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-neon-green text-brand-black">
                                  Captain
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-neutral-600">Handicap: {member.handicap}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3 text-neutral-400" />
                                <span className="text-xs text-neutral-500">{member.email_address}</span>
                              </div>
                              {member.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3 text-neutral-400" />
                                  <span className="text-xs text-neutral-500">{member.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-neutral-600">Handicap</p>
                          <p className="text-lg font-bold text-brand-black">{member.handicap}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <h3 className="text-lg font-semibold text-brand-black">Match Schedule</h3>
                </div>
                
                <div className="divide-y divide-neutral-200">
                  {teamData.upcomingMatches.map((match) => (
                    <div key={match.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                W{match.week_number}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-semibold text-brand-black">
                              vs {match.opponent_name}
                            </h4>
                            <p className="text-sm text-neutral-600">
                              {formatWeekRange(match.week_start_date, match.week_end_date)}
                            </p>
                            {match.course_name && (
                              <div className="flex items-center space-x-1 mt-1">
                                <MapPin className="w-3 h-3 text-neutral-400" />
                                <span className="text-xs text-neutral-500">{match.course_name}</span>
                              </div>
                            )}
                            {match.match_date && (
                              <p className="text-xs text-neutral-500 mt-1">
                                Match Date: {formatDate(match.match_date)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                            {getStatusIcon(match.status)}
                            <span className="ml-1 capitalize">{match.status.replace('_', ' ')}</span>
                          </div>
                          {match.course_name && (
                            <div className="mt-2 text-sm text-neutral-600">
                              <p>Par {match.course_par}</p>
                              <p>Rating: {match.course_rating}</p>
                              <p>Slope: {match.course_slope}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Team Performance */}
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-brand-black mb-4">Team Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Wins</p>
                      <p className="text-2xl font-bold text-green-600">{teamData.standings.wins}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <Target className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Losses</p>
                      <p className="text-2xl font-bold text-red-600">{teamData.standings.losses}</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Ties</p>
                      <p className="text-2xl font-bold text-yellow-600">{teamData.standings.ties}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Trophy className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Total Points</p>
                      <p className="text-2xl font-bold text-blue-600">{teamData.standings.total_points}</p>
                    </div>
                  </div>
                </div>

                {/* League Position */}
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-brand-black mb-4">League Position</h3>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-brand-neon-green rounded-full mb-4">
                      <span className="text-3xl font-bold text-brand-black">
                        {teamData.standings.league_position}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-brand-black">
                      out of {teamData.standings.total_teams} teams
                    </p>
                    <p className="text-sm text-neutral-600 mt-2">
                      Aggregate Net Score: {teamData.standings.aggregate_net_total}
                    </p>
                  </div>
                </div>

                {/* Captain Information */}
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-brand-black mb-4">Captain Information</h3>
                  {(() => {
                    const captain = teamData.roster.find(member => member.is_captain);
                    return captain ? (
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-brand-neon-green rounded-full flex items-center justify-center">
                          <span className="text-brand-black font-semibold text-lg">
                            {captain.first_name[0]}{captain.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-brand-black">
                            {captain.first_name} {captain.last_name}
                          </h4>
                          <p className="text-sm text-neutral-600">Handicap: {captain.handicap}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm text-neutral-500">{captain.email_address}</span>
                            </div>
                            {captain.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm text-neutral-500">{captain.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
    </div>
  );
};

export default PlayerTeamView;
