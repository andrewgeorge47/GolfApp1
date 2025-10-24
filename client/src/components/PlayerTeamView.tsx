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
import { getUserTeams, getTeamDashboard } from '../services/api';

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

const PlayerTeamView: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'schedule' | 'stats'>('roster');

  useEffect(() => {
    loadUserTeams();
  }, []);

  const loadUserTeams = async () => {
    setLoading(true);
    try {
      // Mock data for preview
      const mockTeams: TeamData[] = [
        {
          team: {
            id: 1,
            name: "Team Alpha",
            captain_id: 1,
            league_id: 1,
            division_id: 1,
            league_points: 24,
            aggregate_net_score: 145,
            created_at: "2025-01-01T00:00:00Z"
          },
          roster: [
            {
              user_member_id: 1,
              first_name: "John",
              last_name: "Smith",
              email_address: "john.smith@email.com",
              handicap: 12,
              is_captain: true,
              phone: "(555) 123-4567"
            },
            {
              user_member_id: 2,
              first_name: "Mike",
              last_name: "Johnson",
              email_address: "mike.johnson@email.com",
              handicap: 15,
              is_captain: false,
              phone: "(555) 234-5678"
            },
            {
              user_member_id: 3,
              first_name: "Sarah",
              last_name: "Davis",
              email_address: "sarah.davis@email.com",
              handicap: 18,
              is_captain: false,
              phone: "(555) 345-6789"
            },
            {
              user_member_id: 4,
              first_name: "Lisa",
              last_name: "Brown",
              email_address: "lisa.brown@email.com",
              handicap: 10,
              is_captain: false
            }
          ],
          upcomingMatches: [
            {
              id: 1,
              week_number: 8,
              week_start_date: "2025-01-22",
              week_end_date: "2025-01-28",
              opponent_name: "Team Beta",
              opponent_captain_name: "Jane Wilson",
              course_name: "Pebble Beach Golf Links",
              course_rating: 72.0,
              course_slope: 140,
              course_par: 72,
              status: "scheduled",
              match_date: "2025-01-25"
            },
            {
              id: 2,
              week_number: 9,
              week_start_date: "2025-01-29",
              week_end_date: "2025-02-04",
              opponent_name: "Team Gamma",
              opponent_captain_name: "Bob Anderson",
              course_name: "Augusta National",
              course_rating: 74.0,
              course_slope: 135,
              course_par: 72,
              status: "scheduled"
            },
            {
              id: 3,
              week_number: 7,
              week_start_date: "2025-01-15",
              week_end_date: "2025-01-21",
              opponent_name: "Team Delta",
              opponent_captain_name: "Alice Taylor",
              course_name: "St. Andrews",
              course_rating: 71.5,
              course_slope: 130,
              course_par: 72,
              status: "completed",
              match_date: "2025-01-18"
            }
          ],
          standings: {
            team_id: 1,
            wins: 5,
            losses: 2,
            ties: 0,
            total_points: 24,
            aggregate_net_total: 145,
            league_position: 2,
            total_teams: 8
          }
        }
      ];
      
      setTeams(mockTeams);
      if (mockTeams.length > 0) {
        setSelectedTeam(mockTeams[0]);
      }
    } catch (error) {
      console.error('Error loading user teams:', error);
      toast.error('Failed to load team information');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'completed': return <Trophy className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Found</h3>
        <p className="text-gray-600">You are not currently a member of any teams.</p>
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
          onClick={loadUserTeams}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Team Selection */}
      {teams.length > 1 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-brand-black mb-4">Select Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <button
                key={team.team.id}
                onClick={() => setSelectedTeam(team)}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  selectedTeam?.team.id === team.team.id
                    ? 'border-brand-neon-green bg-green-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <h4 className="font-semibold text-brand-black">{team.team.name}</h4>
                <p className="text-sm text-neutral-600">
                  League Points: {team.team.league_points} | Position: {team.standings.league_position}/{team.standings.total_teams}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTeam && (
        <>
          {/* Team Overview */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-brand-black">{selectedTeam.team.name}</h2>
                <p className="text-neutral-600">League Points: {selectedTeam.team.league_points}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600">League Position</p>
                <p className="text-2xl font-bold text-brand-black">
                  {selectedTeam.standings.league_position}/{selectedTeam.standings.total_teams}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-neutral-600">Wins</p>
                <p className="text-xl font-bold text-green-600">{selectedTeam.standings.wins}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600">Losses</p>
                <p className="text-xl font-bold text-red-600">{selectedTeam.standings.losses}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600">Ties</p>
                <p className="text-xl font-bold text-yellow-600">{selectedTeam.standings.ties}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600">Total Points</p>
                <p className="text-xl font-bold text-brand-black">{selectedTeam.standings.total_points}</p>
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
                  {selectedTeam.roster.map((member) => (
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
                  {selectedTeam.upcomingMatches.map((match) => (
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
                      <p className="text-2xl font-bold text-green-600">{selectedTeam.standings.wins}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <Target className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Losses</p>
                      <p className="text-2xl font-bold text-red-600">{selectedTeam.standings.losses}</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Ties</p>
                      <p className="text-2xl font-bold text-yellow-600">{selectedTeam.standings.ties}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Trophy className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600">Total Points</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedTeam.standings.total_points}</p>
                    </div>
                  </div>
                </div>

                {/* League Position */}
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-brand-black mb-4">League Position</h3>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-brand-neon-green rounded-full mb-4">
                      <span className="text-3xl font-bold text-brand-black">
                        {selectedTeam.standings.league_position}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-brand-black">
                      out of {selectedTeam.standings.total_teams} teams
                    </p>
                    <p className="text-sm text-neutral-600 mt-2">
                      Aggregate Net Score: {selectedTeam.standings.aggregate_net_total}
                    </p>
                  </div>
                </div>

                {/* Captain Information */}
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-brand-black mb-4">Captain Information</h3>
                  {(() => {
                    const captain = selectedTeam.roster.find(member => member.is_captain);
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
        </>
      )}
    </div>
  );
};

export default PlayerTeamView;
