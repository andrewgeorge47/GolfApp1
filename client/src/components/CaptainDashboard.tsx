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
  BarChart3,
  ClipboardList,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import AvailabilityView from './AvailabilityView';
import ImprovedLineupSelector from './ImprovedLineupSelector';
import DivisionLeaderboard from './DivisionLeaderboard';
import {
  getCaptainDashboard,
  getLeague,
  getLeagueDivisions,
  getLeagueTeams,
  getTeamAvailability,
  updateLeagueTeam,
  setMatchupPlayingTime
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
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  opponent_team_id: number;
  opponent_team_name: string;
  course_name: string;
  course_id: number;
  lineup_submitted: boolean;
  lineup_deadline: string;
  status: 'scheduled' | 'lineup_submitted' | 'completed';
  team1_id: number;
  team2_id: number;
  team1_playing_time?: string;
  team2_playing_time?: string;
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
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'availability' | 'lineup' | 'standings'>('overview');

  // Edit team name state
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');

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

          console.log('CaptainDashboard - Availability data:', availData);

          // API returns array of team members with availability
          // Format: [{ user_member_id, is_available, availability_notes, time_slots, ... }]
          if (Array.isArray(availData)) {
            availData.forEach((avail: any) => {
              // Convert is_available boolean to status string
              let status = 'pending';
              if (avail.is_available !== null && avail.is_available !== undefined) {
                status = avail.is_available ? 'available' : 'unavailable';
              }
              memberAvailability.set(avail.user_member_id, status);
            });
          }

          console.log('CaptainDashboard - Member availability map:', memberAvailability);
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
        week_number: match.week_number,
        week_start_date: match.week_start_date,
        week_end_date: match.week_end_date,
        opponent_team_id: match.team1_id === teamId ? match.team2_id : match.team1_id,
        opponent_team_name: match.opponent_name,
        course_name: match.course_name || 'TBD',
        course_id: match.course_id || 0,
        lineup_submitted: match.status === 'lineup_submitted' || match.lineup_submitted || false,
        lineup_deadline: calculateDeadline(match.week_start_date),
        status: match.status || 'scheduled',
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        team1_playing_time: match.team1_playing_time,
        team2_playing_time: match.team2_playing_time
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

  const handleStartEditTeamName = () => {
    if (team) {
      setEditedTeamName(team.name);
      setIsEditingTeamName(true);
    }
  };

  const handleCancelEditTeamName = () => {
    setIsEditingTeamName(false);
    setEditedTeamName('');
  };

  const handleSaveTeamName = async () => {
    if (!team || !editedTeamName.trim()) {
      toast.error('Team name cannot be empty');
      return;
    }

    try {
      const response = await updateLeagueTeam(leagueId, teamId, {
        name: editedTeamName.trim()
      });

      setTeam(prev => prev ? { ...prev, name: response.data.name } : null);
      setIsEditingTeamName(false);
      toast.success('Team name updated successfully');
    } catch (error: any) {
      console.error('Error updating team name:', error);
      toast.error(error.response?.data?.error || 'Failed to update team name');
    }
  };

  const handleSetPlayingTime = async (matchupId: number, playingTime: string) => {
    if (!playingTime) {
      toast.error('Please select a playing time');
      return;
    }

    try {
      await setMatchupPlayingTime(matchupId, playingTime);
      toast.success('Playing time set successfully');

      // Reload captain data to reflect the update
      loadCaptainData();
    } catch (error: any) {
      console.error('Error setting playing time:', error);
      toast.error(error.response?.data?.error || 'Failed to set playing time');
    }
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
            <h1 className="text-2xl font-bold text-white">Captain Dashboard</h1>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-white/80">{team.league_name} • {team.division_name} • </p>
              {isEditingTeamName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editedTeamName}
                    onChange={(e) => setEditedTeamName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTeamName();
                      else if (e.key === 'Escape') handleCancelEditTeamName();
                    }}
                    className="px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTeamName}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Save"
                  >
                    <Save className="w-4 h-4 text-brand-neon-green" />
                  </button>
                  <button
                    onClick={handleCancelEditTeamName}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-white/80">{team.name}</span>
                  <button
                    onClick={handleStartEditTeamName}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Edit team name"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-white/70 hover:text-brand-neon-green" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/20">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
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
                : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
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
                : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Lineup
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'standings'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Standings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Weekly Schedule</h3>
              </div>

              <div className="divide-y divide-neutral-200">
                {upcomingMatches.map((match) => {
                  const myPlayingTime = match.team1_id === teamId ? match.team1_playing_time : match.team2_playing_time;
                  const hasSubmittedScores = match.status !== 'scheduled';

                  return (
                    <div key={match.id} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-brand-teal/10 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-brand-teal" />
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-lg font-semibold text-brand-black">
                                Week {match.week_number}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                                {match.status === 'scheduled' ? 'Not Submitted' : hasSubmittedScores ? 'Scores Submitted' : 'In Progress'}
                              </span>
                            </div>

                            <p className="text-sm text-neutral-600 mb-2">
                              {formatDate(match.week_start_date)} - {formatDate(match.week_end_date)}
                            </p>

                            {match.course_name && (
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <Target className="w-4 h-4 text-brand-purple" />
                                  <span className="font-medium text-brand-black">{match.course_name}</span>
                                </div>
                              </div>
                            )}

                            {myPlayingTime && (
                              <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600">
                                <Clock className="w-4 h-4" />
                                <span>Playing: {new Date(myPlayingTime).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <button
                            onClick={() => setActiveTab('lineup')}
                            className="flex items-center justify-center space-x-1 px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 transition-colors w-full sm:w-auto"
                          >
                            <Target className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {hasSubmittedScores ? 'View Lineup & Scores' : 'Manage Lineup & Scores'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'availability' && team && (
          <AvailabilityView
            teamId={teamId}
            leagueId={leagueId}
            members={team.members}
            upcomingMatches={upcomingMatches}
            onPlayingTimeSet={loadCaptainData}
          />
        )}
        {activeTab === 'lineup' && team && (
          <ImprovedLineupSelector
            teamId={teamId}
            leagueId={leagueId}
            members={team.members}
            upcomingMatches={upcomingMatches}
          />
        )}

        {activeTab === 'standings' && team && (
          <div className="py-6">
            <DivisionLeaderboard
              leagueId={leagueId}
              divisionId={team.division_id}
              divisionName={team.division_name}
              weekNumber={upcomingMatches[0]?.week_number}
              currentTeamId={teamId}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default CaptainDashboard;
