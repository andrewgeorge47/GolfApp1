import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Edit2,
  Trash2,
  Eye,
  Users,
  Calendar,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { environment } from '../config/environment';
import { Button, Spinner } from './ui';
import LeagueScoreSubmission from './LeagueScoreSubmission';

interface MatchupScore {
  matchup_id: number;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  division_name: string;
  team1_id: number;
  team1_name: string;
  team2_id: number;
  team2_name: string;
  course_id: number;
  course_name: string;
  status: string;
  team1_has_scores: boolean;
  team2_has_scores: boolean;
  team1_net_total?: number;
  team2_net_total?: number;
  team1_gross_total?: number;
  team2_gross_total?: number;
  submitted_at?: string;
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
  const [scores, setScores] = useState<MatchupScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchup, setSelectedMatchup] = useState<MatchupScore | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [deletingMatchupId, setDeletingMatchupId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'pending'>('all');

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

      const data = await response.json();
      setScores(data);
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
        .slice(0, 3)
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

  const handleDeleteScore = async (matchupId: number, teamId: number, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${teamName}'s scorecard? This will remove all scores for this team.`)) {
      return;
    }

    setDeletingMatchupId(matchupId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${environment.apiBaseUrl}/leagues/matchups/${matchupId}/scores/${teamId}`, {
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
      setDeletingMatchupId(null);
    }
  };

  const handleEditScore = async (matchup: MatchupScore, teamId: number) => {
    const opponentTeamId = teamId === matchup.team1_id ? matchup.team2_id : matchup.team1_id;
    const players = await loadTeamPlayers(teamId);

    if (players.length === 0) {
      toast.error('No players found for this team');
      return;
    }

    setSelectedMatchup(matchup);
    setSelectedTeamId(teamId);
    setSelectedPlayers(players);
    setShowScoreModal(true);
  };

  const handleScoreSubmitted = () => {
    setShowScoreModal(false);
    setSelectedMatchup(null);
    setSelectedTeamId(null);
    setSelectedPlayers([]);
    loadScores();
  };

  const filteredScores = scores.filter(score => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'submitted') return score.team1_has_scores || score.team2_has_scores;
    if (filterStatus === 'pending') return !score.team1_has_scores || !score.team2_has_scores;
    return true;
  });

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
            <h2 className="text-2xl font-bold text-brand-black">Match Scores</h2>
            <p className="text-sm text-neutral-600">View and manage all submitted scores</p>
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
            <option value="all">All Matches</option>
            <option value="submitted">Scores Submitted</option>
            <option value="pending">Pending Scores</option>
          </select>
        </div>
      </div>

      {/* Scores Table */}
      {filteredScores.length === 0 ? (
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
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Division
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Matchup
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Scores
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredScores.map((score) => {
                  // Create rows for each team
                  return (
                    <React.Fragment key={score.matchup_id}>
                      {/* Team 1 Row */}
                      <tr className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap" rowSpan={2}>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-medium text-brand-black">Week {score.week_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap" rowSpan={2}>
                          <div className="text-sm text-neutral-600">
                            {new Date(score.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' - '}
                            {new Date(score.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap" rowSpan={2}>
                          <div className="text-sm text-neutral-700">{score.division_name}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-medium text-brand-black">{score.team1_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4" rowSpan={2}>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm text-neutral-700">{score.course_name || 'Not assigned'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {score.team1_has_scores ? (
                            <div className="text-sm">
                              <span className="text-brand-neon-green font-semibold">
                                {score.team1_net_total || 0}
                              </span>
                              <span className="text-neutral-400 ml-1 text-xs">
                                (Gross: {score.team1_gross_total || 0})
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">Not submitted</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            score.team1_has_scores
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {score.team1_has_scores ? 'Submitted' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEditScore(score, score.team1_id)}
                              disabled={loadingPlayers}
                              className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                                score.team1_has_scores
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  : 'bg-brand-neon-green text-brand-black hover:bg-green-400 font-medium'
                              }`}
                              title={score.team1_has_scores ? 'Edit scores' : 'Submit scores'}
                            >
                              {score.team1_has_scores ? 'Edit' : 'Submit'}
                            </button>
                            {score.team1_has_scores && (
                              <button
                                onClick={() => handleDeleteScore(score.matchup_id, score.team1_id, score.team1_name)}
                                disabled={deletingMatchupId === score.matchup_id}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Delete scorecard"
                              >
                                {deletingMatchupId === score.matchup_id ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Team 2 Row */}
                      <tr className="hover:bg-neutral-50 transition-colors border-b-2 border-neutral-300">
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-medium text-brand-black">{score.team2_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {score.team2_has_scores ? (
                            <div className="text-sm">
                              <span className="text-brand-neon-green font-semibold">
                                {score.team2_net_total || 0}
                              </span>
                              <span className="text-neutral-400 ml-1 text-xs">
                                (Gross: {score.team2_gross_total || 0})
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">Not submitted</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            score.team2_has_scores
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {score.team2_has_scores ? 'Submitted' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEditScore(score, score.team2_id)}
                              disabled={loadingPlayers}
                              className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                                score.team2_has_scores
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  : 'bg-brand-neon-green text-brand-black hover:bg-green-400 font-medium'
                              }`}
                              title={score.team2_has_scores ? 'Edit scores' : 'Submit scores'}
                            >
                              {score.team2_has_scores ? 'Edit' : 'Submit'}
                            </button>
                            {score.team2_has_scores && (
                              <button
                                onClick={() => handleDeleteScore(score.matchup_id, score.team2_id, score.team2_name)}
                                disabled={deletingMatchupId === score.matchup_id}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Delete scorecard"
                              >
                                {deletingMatchupId === score.matchup_id ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score Submission Modal */}
      {showScoreModal && selectedMatchup && selectedTeamId && selectedPlayers.length > 0 && (
        <LeagueScoreSubmission
          matchupId={selectedMatchup.matchup_id}
          teamId={selectedTeamId}
          opponentTeamId={selectedTeamId === selectedMatchup.team1_id ? selectedMatchup.team2_id : selectedMatchup.team1_id}
          courseId={selectedMatchup.course_id}
          players={selectedPlayers}
          onClose={() => {
            setShowScoreModal(false);
            setSelectedMatchup(null);
            setSelectedTeamId(null);
            setSelectedPlayers([]);
          }}
          onSubmit={handleScoreSubmitted}
        />
      )}
    </div>
  );
};

export default LeagueScoresManager;
