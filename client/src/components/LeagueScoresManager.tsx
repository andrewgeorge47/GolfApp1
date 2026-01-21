import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Edit2,
  Trash2,
  Users,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import { environment } from '../config/environment';
import { Button, Spinner } from './ui';
import LeagueScoreSubmission from './LeagueScoreSubmission';

interface TeamScore {
  schedule_id: number;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  course_id: number;
  course_name: string;
  status: string;
  team_id: number;
  team_name: string;
  division_id: number;
  division_name: string;
  has_scores: boolean;
  net_total: number | null;
  gross_total: number | null;
}

interface WeekScores {
  schedule_id: number;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  course_id: number;
  course_name: string;
  status: string;
  teams: TeamScore[];
}

interface Player {
  id: number;
  user_id: number;
  name: string;
  sim_handicap: number;
}

interface LeagueScoresManagerProps {
  leagueId: number;
}

const LeagueScoresManager: React.FC<LeagueScoresManagerProps> = ({ leagueId }) => {
  const [weekScores, setWeekScores] = useState<WeekScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedTeamScore, setSelectedTeamScore] = useState<TeamScore | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [selectedLineup, setSelectedLineup] = useState<any>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'pending'>('all');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadScores();
  }, [leagueId]);

  const loadScores = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${environment.apiBaseUrl}/leagues/${leagueId}/scores`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load scores');
      }

      const data: TeamScore[] = await response.json();

      // Group scores by week
      const weekMap = new Map<number, WeekScores>();
      data.forEach(score => {
        if (!weekMap.has(score.schedule_id)) {
          weekMap.set(score.schedule_id, {
            schedule_id: score.schedule_id,
            week_number: score.week_number,
            week_start_date: score.week_start_date,
            week_end_date: score.week_end_date,
            course_id: score.course_id,
            course_name: score.course_name,
            status: score.status,
            teams: []
          });
        }
        weekMap.get(score.schedule_id)!.teams.push(score);
      });

      setWeekScores(Array.from(weekMap.values()).sort((a, b) => a.week_number - b.week_number));
    } catch (error) {
      console.error('Error loading scores:', error);
      toast.error('Failed to load scores');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamPlayers = async (teamId: number) => {
    setLoadingPlayers(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${environment.apiBaseUrl}/teams/${teamId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load team members');
      }

      const data = await response.json();
      const players = data
        .map((m: any) => ({
          id: m.id,
          user_id: m.user_member_id,
          name: `${m.first_name} ${m.last_name}`,
          sim_handicap: m.sim_handicap
        }));

      if (players.length === 0) {
        throw new Error('Team has no members');
      }

      return players;
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
      return [];
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleDeleteScore = async (scheduleId: number, teamId: number, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${teamName}'s scorecard? This will remove all scores for this team.`)) {
      return;
    }

    const deleteKey = `${scheduleId}-${teamId}`;
    setDeletingKey(deleteKey);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${environment.apiBaseUrl}/leagues/schedule/${scheduleId}/scores/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete score');
      }

      toast.success(`${teamName}'s scores deleted successfully`);
      loadScores();
    } catch (error) {
      console.error('Error deleting score:', error);
      toast.error('Failed to delete score');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleEditScore = async (teamScore: TeamScore) => {
    // Use the scores endpoint - it returns lineup + scores + players all in one call
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${environment.apiBaseUrl}/leagues/schedule/${teamScore.schedule_id}/scores/${teamScore.team_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        toast.error('Failed to load scores and lineup');
        return;
      }

      const data = await response.json();

      // Use the lineup_players from the response (these are the players who were in the lineup)
      // Format them to match the Player interface
      const players = data.lineup_players || [];

      if (players.length === 0) {
        toast.error('No players found for this lineup');
        return;
      }

      setSelectedScheduleId(teamScore.schedule_id);
      setSelectedTeamScore(teamScore);
      setSelectedPlayers(players);
      setSelectedLineup(data);
      setShowScoreModal(true);
    } catch (error) {
      console.error('Error loading scores:', error);
      toast.error('Failed to load scores and lineup');
    }
  };

  const handleScoreSubmitted = () => {
    setShowScoreModal(false);
    setSelectedScheduleId(null);
    setSelectedTeamScore(null);
    setSelectedPlayers([]);
    loadScores();
  };

  const toggleWeek = (weekNumber: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNumber)) {
      newExpanded.delete(weekNumber);
    } else {
      newExpanded.add(weekNumber);
    }
    setExpandedWeeks(newExpanded);
  };

  const filteredWeekScores = weekScores.map(week => ({
    ...week,
    teams: week.teams.filter(team => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'submitted') return team.has_scores;
      if (filterStatus === 'pending') return !team.has_scores;
      return true;
    })
  })).filter(week => week.teams.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading scores..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClipboardList className="w-6 h-6 text-brand-neon-green" />
          <div>
            <h2 className="text-2xl font-bold text-brand-black">Team Scores</h2>
            <p className="text-sm text-neutral-600">View and manage team scores by week</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-neutral-600">Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
          >
            <option value="all">All Teams</option>
            <option value="submitted">Scores Submitted</option>
            <option value="pending">Pending Scores</option>
          </select>
        </div>
      </div>

      {/* Weekly Scores */}
      {filteredWeekScores.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-12 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">No scores found</h3>
          <p className="text-neutral-500">
            {filterStatus === 'submitted'
              ? 'No scores have been submitted yet.'
              : filterStatus === 'pending'
              ? 'No matches are pending scores.'
              : 'No matches found for this league.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWeekScores.map((week) => {
            const isExpanded = expandedWeeks.has(week.week_number);
            const submittedCount = week.teams.filter(t => t.has_scores).length;
            const totalCount = week.teams.length;

            return (
              <div key={week.schedule_id} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                {/* Week Header */}
                <button
                  onClick={() => toggleWeek(week.week_number)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    )}
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-brand-neon-green" />
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-brand-black">Week {week.week_number}</h3>
                        <p className="text-sm text-neutral-600">
                          {new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(week.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <MapPin className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm text-neutral-700">{week.course_name || 'No course assigned'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-neutral-600">
                      {submittedCount} / {totalCount} teams submitted
                    </span>
                    <div className="w-32 bg-neutral-200 rounded-full h-2">
                      <div
                        className="bg-brand-neon-green h-2 rounded-full transition-all"
                        style={{ width: `${totalCount > 0 ? (submittedCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Team List */}
                {isExpanded && (
                  <div className="border-t border-neutral-200">
                    <table className="w-full">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Team</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Division</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Net Score</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Gross Score</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase">Status</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {week.teams.map((team) => {
                          const deleteKey = `${week.schedule_id}-${team.team_id}`;
                          return (
                            <tr key={team.team_id} className="hover:bg-neutral-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <Users className="w-4 h-4 text-neutral-400" />
                                  <span className="text-sm font-medium text-brand-black">{team.team_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-neutral-700">{team.division_name || 'No division'}</span>
                              </td>
                              <td className="px-6 py-4">
                                {team.has_scores ? (
                                  <span className="text-sm font-semibold text-brand-neon-green">{team.net_total}</span>
                                ) : (
                                  <span className="text-sm text-neutral-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {team.has_scores ? (
                                  <span className="text-sm text-neutral-700">{team.gross_total}</span>
                                ) : (
                                  <span className="text-sm text-neutral-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  team.has_scores
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {team.has_scores ? 'Submitted' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleEditScore(team)}
                                    disabled={loadingPlayers}
                                    className={`px-3 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                                      team.has_scores
                                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                        : 'bg-brand-neon-green text-brand-black hover:bg-green-400 font-medium'
                                    }`}
                                    title={team.has_scores ? 'Edit scores' : 'Submit scores'}
                                  >
                                    {team.has_scores ? 'Edit' : 'Submit'}
                                  </button>
                                  {team.has_scores && (
                                    <button
                                      onClick={() => handleDeleteScore(week.schedule_id, team.team_id, team.team_name)}
                                      disabled={deletingKey === deleteKey}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                      title="Delete scorecard"
                                    >
                                      {deletingKey === deleteKey ? (
                                        <Spinner size="sm" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Score Submission Modal */}
      {showScoreModal && selectedScheduleId && selectedTeamScore && selectedPlayers.length > 0 && selectedLineup && (() => {
        // hole_assignments is already stored with player.id (team_members.id), use directly
        const holeAssignments = selectedLineup.hole_assignments || {};

        // back9_player_order is stored with user_id, convert to player.id
        const back9PlayerOrder: number[] = [];
        if (selectedLineup.back9_player_order && Array.isArray(selectedLineup.back9_player_order)) {
          selectedLineup.back9_player_order.forEach((userId: number) => {
            const player = selectedPlayers.find(p => p.user_id === userId);
            if (player) {
              back9PlayerOrder.push(player.id);
            }
          });
        }

        return (
          <LeagueScoreSubmission
            scheduleId={selectedScheduleId}
            teamId={selectedTeamScore.team_id}
            opponentTeamId={selectedTeamScore.team_id}
            courseId={selectedTeamScore.course_id}
            players={selectedPlayers}
            initialHoleAssignments={holeAssignments}
            initialBack9PlayerOrder={back9PlayerOrder}
            onClose={() => {
              setShowScoreModal(false);
              setSelectedScheduleId(null);
              setSelectedTeamScore(null);
              setSelectedPlayers([]);
              setSelectedLineup(null);
            }}
            onSubmit={handleScoreSubmitted}
          />
        );
      })()}
    </div>
  );
};

export default LeagueScoresManager;
