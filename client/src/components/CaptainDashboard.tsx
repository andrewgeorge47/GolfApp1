import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Calendar,
  Target,
  Trophy,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Settings,
  BarChart3,
  MapPin
} from 'lucide-react';
import { toast } from 'react-toastify';
import AvailabilityView from './AvailabilityView';
import LineupSelector from './LineupSelector';
import StrategyHelper from './StrategyHelper';
import {
  getCaptainDashboard,
  getLeague,
  getLeagueDivisions,
  getLeagueTeams,
  getTeamAvailability
} from '../services/api';

interface Team {
  id: number;
  name: string;
  captain_id: number;
  captain_name: string;
  members: TeamMember[];
  division_id: number;
  division_name: string;
  league_id: number;
  league_name: string;
}

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  availability_status?: 'available' | 'unavailable' | 'pending';
}

interface UpcomingMatch {
  id: number;
  week_start_date: string;
  opponent_team_id: number;
  opponent_team_name: string;
  course_name: string;
  course_id: number;
  lineup_submitted: boolean;
  lineup_deadline: string;
  status: 'upcoming' | 'in_progress' | 'completed';
}

interface TeamStats {
  total_matches: number;
  wins: number;
  losses: number;
  ties: number;
  total_points: number;
  current_standing: number;
  total_teams: number;
}

interface CaptainDashboardProps {
  teamId: number;
  leagueId: number;
}

const CaptainDashboard: React.FC<CaptainDashboardProps> = ({ teamId, leagueId }) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'availability' | 'lineup' | 'strategy'>('overview');

  const loadCaptainData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [
        dashboardResponse,
        leagueResponse,
        divisionsResponse,
        teamsResponse
      ] = await Promise.all([
        getCaptainDashboard(teamId, leagueId),
        getLeague(leagueId),
        getLeagueDivisions(leagueId),
        getLeagueTeams(leagueId)
      ]);

      const data = dashboardResponse.data;
      const leagueData = leagueResponse.data;
      const divisionsData = divisionsResponse.data;
      const teamsData = teamsResponse.data;

      // Debug: Check what's in the roster
      console.log('Captain Dashboard Data:', {
        captain_id: data.team.captain_id,
        roster_count: data.roster?.length || 0,
        roster: data.roster
      });

      // Find division info
      const teamDivisionId = data.team.division_id;
      const division = divisionsData.find((d: any) => d.id === teamDivisionId);
      const divisionName = division?.division_name || 'Unknown Division';

      // Count teams in the same division
      const teamsInDivision = teamsData.filter((t: any) => t.division_id === teamDivisionId);
      const totalTeamsInDivision = teamsInDivision.length;

      // Load availability for upcoming matches (first match only for now)
      let memberAvailability: Map<number, string> = new Map();
      if (data.upcomingMatches.length > 0) {
        try {
          const firstMatch = data.upcomingMatches[0];
          const weekNumber = firstMatch.week_number || 1;
          const availResponse = await getTeamAvailability(teamId, weekNumber, leagueId);
          const availData = availResponse.data;

          // Map user_id to availability status
          if (availData.availability) {
            availData.availability.forEach((avail: any) => {
              memberAvailability.set(avail.user_id, avail.status);
            });
          }
        } catch (err) {
          console.log('Could not load availability:', err);
          // Continue without availability data
        }
      }

      // Transform roster to match TeamMember interface
      const transformedMembers: TeamMember[] = data.roster.map((member: any) => ({
        id: member.id,
        user_id: member.user_member_id,
        first_name: member.first_name,
        last_name: member.last_name,
        handicap: member.handicap || 0,
        role: member.user_member_id === data.team.captain_id ? 'captain' : 'member',
        availability_status: (memberAvailability.get(member.user_member_id) as 'available' | 'unavailable' | 'pending') || 'pending'
      }));

      // Ensure captain is in the members list (if not already)
      const captainInRoster = transformedMembers.some(m => m.user_id === data.team.captain_id);
      if (!captainInRoster && data.team.captain_id) {
        console.warn('Captain not found in roster, fetching captain data separately');
        // The captain should be in the roster, but if not, this is a backend data issue
        // For now, we'll show a warning and the roster as-is
      }

      // Transform team data
      const transformedTeam: Team = {
        id: data.team.id,
        name: data.team.name,
        captain_id: data.team.captain_id,
        captain_name: transformedMembers.find(m => m.role === 'captain')?.first_name + ' ' +
                     transformedMembers.find(m => m.role === 'captain')?.last_name || 'Unknown',
        members: transformedMembers,
        division_id: teamDivisionId || 0,
        division_name: divisionName,
        league_id: leagueId,
        league_name: leagueData.name || 'Unknown League'
      };

      // Calculate lineup deadline (24 hours before match start)
      const calculateDeadline = (matchStart: string): string => {
        const matchDate = new Date(matchStart);
        const deadline = new Date(matchDate.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
        return deadline.toISOString();
      };

      // Transform upcoming matches
      const transformedMatches: UpcomingMatch[] = data.upcomingMatches.map((match: any) => ({
        id: match.id,
        week_start_date: match.week_start_date,
        opponent_team_id: match.team1_id === teamId ? match.team2_id : match.team1_id,
        opponent_team_name: match.opponent_name,
        course_name: match.course_name || 'TBD',
        course_id: match.course_id || 0,
        lineup_submitted: match.status === 'lineup_submitted' || match.lineup_submitted || false,
        lineup_deadline: calculateDeadline(match.week_start_date),
        status: match.status === 'scheduled' ? 'upcoming' :
                match.status === 'in_progress' ? 'in_progress' : 'completed'
      }));

      // Transform standings to stats
      const standings = data.standings;
      const transformedStats: TeamStats = {
        total_matches: standings ? (standings.wins + standings.losses + standings.ties) : 0,
        wins: standings?.wins || 0,
        losses: standings?.losses || 0,
        ties: standings?.ties || 0,
        total_points: standings?.league_points || 0,
        current_standing: standings?.division_rank || 0,
        total_teams: totalTeamsInDivision
      };

      setTeam(transformedTeam);
      setUpcomingMatches(transformedMatches);
      setTeamStats(transformedStats);
    } catch (error: any) {
      console.error('Error loading captain data:', error);
      toast.error(error.response?.data?.error || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [teamId, leagueId]);

  useEffect(() => {
    if (teamId && leagueId) {
      loadCaptainData();
    }
  }, [teamId, leagueId, loadCaptainData]);

  const getAvailabilityStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'unavailable': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'unavailable': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const isLineupDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Found</h3>
        <p className="text-gray-600">You are not currently a captain of any team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Captain Dashboard</h1>
            <p className="text-neutral-600">{team.league_name} • {team.division_name} • {team.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Team Settings</span>
          </button>
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
            onClick={() => setActiveTab('availability')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'availability'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('lineup')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'lineup'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Lineup
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'strategy'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Strategy
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Team Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-brand-neon-green" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Team Members</p>
                    <p className="text-2xl font-bold text-brand-black">{team.members.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center">
                  <Trophy className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Current Standing</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {teamStats?.current_standing || 'N/A'} of {teamStats?.total_teams || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center">
                  <Target className="w-8 h-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Total Points</p>
                    <p className="text-2xl font-bold text-brand-black">{teamStats?.total_points || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Upcoming Matches</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {upcomingMatches.filter(m => m.status === 'upcoming').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Team Members</h3>
              </div>
              
              <div className="divide-y divide-neutral-200">
                {team.members.map((member) => (
                  <div key={member.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-brand-neon-green rounded-full flex items-center justify-center">
                            <span className="text-brand-black font-semibold">
                              {member.first_name[0]}{member.last_name[0]}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold text-brand-black">
                            {member.first_name} {member.last_name}
                            {member.role === 'captain' && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-neon-green text-brand-black">
                                Captain
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-neutral-600">Handicap: {member.handicap}</p>
                        </div>
                      </div>

                      {/* Removed availability status - shown in Availability tab instead */}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Matches */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Upcoming Matches</h3>
              </div>
              
              <div className="divide-y divide-neutral-200">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Calendar className="w-6 h-6 text-neutral-500" />
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold text-brand-black">
                            vs {match.opponent_team_name}
                          </h4>
                          <p className="text-sm text-neutral-600">
                            {formatDate(match.week_start_date)} • {match.course_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                        </span>
                        
                        {match.lineup_submitted ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">Lineup Submitted</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">
                              {isLineupDeadlinePassed(match.lineup_deadline) ? 'Deadline Passed' : 'Lineup Due Soon'}
                            </span>
                          </div>
                        )}
                        
                        <button className="flex items-center space-x-1 px-3 py-1 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors">
                          <span className="text-sm">Manage</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Quick Actions</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveTab('availability')}
                    className="flex items-center space-x-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <Users className="w-6 h-6 text-brand-neon-green" />
                    <div className="text-left">
                      <h4 className="font-medium text-brand-black">Check Availability</h4>
                      <p className="text-sm text-neutral-600">View team member availability</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('lineup')}
                    className="flex items-center space-x-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <Target className="w-6 h-6 text-brand-neon-green" />
                    <div className="text-left">
                      <h4 className="font-medium text-brand-black">Set Lineup</h4>
                      <p className="text-sm text-neutral-600">Select active players</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('strategy')}
                    className="flex items-center space-x-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <MapPin className="w-6 h-6 text-brand-neon-green" />
                    <div className="text-left">
                      <h4 className="font-medium text-brand-black">Strategy Helper</h4>
                      <p className="text-sm text-neutral-600">Plan your approach</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'availability' && team && (
          <AvailabilityView
            teamId={teamId}
            leagueId={leagueId}
            members={team.members}
          />
        )}
        {activeTab === 'lineup' && team && (
          <LineupSelector
            teamId={teamId}
            leagueId={leagueId}
            members={team.members}
            upcomingMatches={upcomingMatches}
          />
        )}
        {activeTab === 'strategy' && team && (
          <StrategyHelper
            teamId={teamId}
            leagueId={leagueId}
            members={team.members}
            upcomingMatches={upcomingMatches}
            teamStats={teamStats}
          />
        )}
      </div>
    </div>
  );
};

export default CaptainDashboard;
