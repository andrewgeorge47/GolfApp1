import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Settings,
  ChevronRight,
  ChevronDown,
  Edit3,
  Award,
  Clock,
  Calendar,
  BarChart3,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  createLeague,
  getLeagues,
  League as APILeague
} from '../services/api';
import {
  Button,
  Card,
  FormDialog,
  Input,
  Select,
  StatusBadge,
  Spinner
} from './ui';

interface League {
  id: number;
  name: string;
  season: string;
  start_date: string;
  end_date: string;
  teams_per_division: number;
  scoring_rules: ScoringRules;
  format: 'round_robin' | 'playoff' | 'hybrid';
  status: 'draft' | 'registration' | 'active' | 'playoffs' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

interface ScoringRules {
  points_per_win: number;
  points_per_tie: number;
  points_per_loss: number;
  playoff_format: 'single_elimination' | 'double_elimination' | 'best_of_three';
  tiebreaker_criteria: string[];
}

const LeaguesLanding: React.FC = () => {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLeague, setExpandedLeague] = useState<number | null>(null);

  // League creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [leagueForm, setLeagueForm] = useState({
    name: '',
    season: '',
    start_date: '',
    end_date: '',
    teams_per_division: 8,
    format: 'round_robin' as League['format'],
    scoring_rules: {
      points_per_win: 2,
      points_per_tie: 1,
      points_per_loss: 0,
      playoff_format: 'single_elimination' as const,
      tiebreaker_criteria: ['head_to_head', 'aggregate_score', 'handicap_differential']
    }
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    setLoading(true);
    try {
      const response = await getLeagues();
      const apiLeagues = response.data;

      // Transform API leagues to component format
      const transformedLeagues: League[] = apiLeagues.map(league => ({
        id: league.id,
        name: league.name,
        season: league.season || '',
        start_date: league.start_date,
        end_date: league.end_date,
        teams_per_division: league.teams_per_division || 8,
        scoring_rules: {
          points_per_win: league.points_for_win || 2,
          points_per_tie: league.points_for_tie || 1,
          points_per_loss: league.points_for_loss || 0,
          playoff_format: (league.playoff_format || 'single_elimination') as any,
          tiebreaker_criteria: ['head_to_head', 'aggregate_score', 'handicap_differential']
        },
        format: (league.format || 'round_robin') as any,
        status: league.status,
        created_at: league.created_at,
        updated_at: league.updated_at
      }));

      setLeagues(transformedLeagues);
    } catch (error) {
      console.error('Error loading leagues:', error);
      toast.error('Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!leagueForm.name.trim()) {
      errors.name = 'League name is required';
    }

    if (!leagueForm.season.trim()) {
      errors.season = 'Season is required';
    }

    if (!leagueForm.start_date) {
      errors.start_date = 'Start date is required';
    }

    if (!leagueForm.end_date) {
      errors.end_date = 'End date is required';
    }

    if (leagueForm.start_date && leagueForm.end_date && leagueForm.start_date >= leagueForm.end_date) {
      errors.end_date = 'End date must be after start date';
    }

    if (leagueForm.teams_per_division < 4 || leagueForm.teams_per_division > 16) {
      errors.teams_per_division = 'Teams per division must be between 4 and 16';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateLeague = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const leagueData: Partial<APILeague> = {
        name: leagueForm.name,
        season: leagueForm.season,
        start_date: leagueForm.start_date,
        end_date: leagueForm.end_date,
        teams_per_division: leagueForm.teams_per_division,
        format: leagueForm.format,
        points_for_win: leagueForm.scoring_rules.points_per_win,
        points_for_tie: leagueForm.scoring_rules.points_per_tie,
        points_for_loss: leagueForm.scoring_rules.points_per_loss,
        playoff_format: leagueForm.scoring_rules.playoff_format,
        // Default UAL settings
        individual_holes: 9,
        alternate_shot_holes: 9,
        active_players_per_week: 3,
        roster_size_min: 4,
        roster_size_max: 5,
        weeks_per_season: 18,
        divisions_count: 2
      };

      const response = await createLeague(leagueData);
      const createdLeague = response.data;

      // Transform to component format and add to list
      const newLeague: League = {
        id: createdLeague.id,
        name: createdLeague.name,
        season: createdLeague.season || '',
        start_date: createdLeague.start_date,
        end_date: createdLeague.end_date,
        teams_per_division: createdLeague.teams_per_division || 8,
        scoring_rules: {
          points_per_win: createdLeague.points_for_win || 2,
          points_per_tie: createdLeague.points_for_tie || 1,
          points_per_loss: createdLeague.points_for_loss || 0,
          playoff_format: (createdLeague.playoff_format || 'single_elimination') as any,
          tiebreaker_criteria: ['head_to_head', 'aggregate_score', 'handicap_differential']
        },
        format: (createdLeague.format || 'round_robin') as any,
        status: createdLeague.status,
        created_at: createdLeague.created_at,
        updated_at: createdLeague.updated_at
      };

      setLeagues(prev => [...prev, newLeague]);
      setShowCreateForm(false);

      // Reset form
      setLeagueForm({
        name: '',
        season: '',
        start_date: '',
        end_date: '',
        teams_per_division: 8,
        format: 'round_robin',
        scoring_rules: {
          points_per_win: 2,
          points_per_tie: 1,
          points_per_loss: 0,
          playoff_format: 'single_elimination',
          tiebreaker_criteria: ['head_to_head', 'aggregate_score', 'handicap_differential']
        }
      });

      toast.success('League created successfully');
    } catch (error: any) {
      console.error('Error creating league:', error);
      toast.error(error.response?.data?.error || 'Failed to create league');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: League['status']) => {
    switch (status) {
      case 'draft': return <Edit3 className="w-4 h-4" />;
      case 'active': return <Trophy className="w-4 h-4" />;
      case 'completed': return <Award className="w-4 h-4" />;
      case 'paused': return <Clock className="w-4 h-4" />;
      default: return <Edit3 className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading leagues..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-dark-green to-emerald-700 rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">League Management</h1>
              <p className="text-white/90 mt-1">Create and manage your golf leagues</p>
            </div>
          </div>

          <Button
            onClick={() => setShowCreateForm(true)}
            icon={Plus}
            variant="primary"
            size="lg"
          >
            Create League
          </Button>
        </div>
      </div>

      {/* Leagues Grid */}
      <div className="grid grid-cols-1 gap-6">
        {leagues.length === 0 ? (
          <Card variant="dark-elevated">
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-semibold text-brand-black mb-2">No leagues yet</h3>
              <p className="text-neutral-600 mb-4">Get started by creating your first league</p>
              <Button
                onClick={() => setShowCreateForm(true)}
                icon={Plus}
                variant="primary"
              >
                Create Your First League
              </Button>
            </div>
          </Card>
        ) : (
          leagues.map((league) => (
            <Card key={league.id} variant="dark-elevated" className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <button
                      onClick={() => setExpandedLeague(expandedLeague === league.id ? null : league.id)}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      {expandedLeague === league.id ? (
                        <ChevronDown className="w-5 h-5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-neutral-500" />
                      )}
                    </button>

                    <div className="flex items-center space-x-3 flex-1">
                      {getStatusIcon(league.status)}
                      <div>
                        <h3 className="text-xl font-bold text-brand-black">{league.name}</h3>
                        <p className="text-sm text-neutral-600">{league.season}</p>
                      </div>
                    </div>

                    <StatusBadge
                      status={league.status === 'active' ? 'active' : league.status === 'draft' ? 'draft' : 'completed'}
                    />
                  </div>

                  <div className="flex items-center space-x-3 ml-4">
                    <Button
                      variant="primary"
                      size="md"
                      icon={Settings}
                      onClick={() => navigate(`/admin/league/${league.id}`)}
                    >
                      Manage League
                    </Button>
                  </div>
                </div>

                {expandedLeague === league.id && (
                  <div className="mt-6 pt-6 border-t border-neutral-200 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Format</p>
                        <p className="text-sm text-brand-black capitalize">{league.format.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Teams per Division</p>
                        <p className="text-sm text-brand-black">{league.teams_per_division}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-600">Start Date</p>
                        <p className="text-sm text-brand-black">{new Date(league.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-600">End Date</p>
                        <p className="text-sm text-brand-black">{new Date(league.end_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-neutral-600 mb-2">Scoring Rules</p>
                      <div className="grid grid-cols-3 gap-4 text-sm text-neutral-700">
                        <div>Win: {league.scoring_rules.points_per_win} pts</div>
                        <div>Tie: {league.scoring_rules.points_per_tie} pts</div>
                        <div>Loss: {league.scoring_rules.points_per_loss} pts</div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-4 border-t border-neutral-200">
                      <p className="text-sm font-medium text-neutral-600 mb-3">Quick Actions</p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/league-standings/${league.id}`}
                          className="inline-flex items-center px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors text-sm font-medium"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Standings
                        </a>
                        <a
                          href={`/weekly-results/${league.id}`}
                          className="inline-flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Weekly Results
                        </a>
                        <button
                          onClick={() => navigate(`/admin/league/${league.id}`)}
                          className="inline-flex items-center px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create League Modal */}
      <FormDialog
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={(e) => { e.preventDefault(); handleCreateLeague(); }}
        title="Create New League"
        submitText="Create League"
        loading={isSubmitting}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="League Name"
              value={leagueForm.name}
              onChange={(e) => setLeagueForm(prev => ({ ...prev, name: e.target.value }))}
              error={formErrors.name}
              required
              placeholder="e.g., Spring 2024 League"
            />

            <Input
              label="Season"
              value={leagueForm.season}
              onChange={(e) => setLeagueForm(prev => ({ ...prev, season: e.target.value }))}
              error={formErrors.season}
              required
              placeholder="e.g., Spring 2024"
            />

            <Input
              label="Start Date"
              type="date"
              value={leagueForm.start_date}
              onChange={(e) => setLeagueForm(prev => ({ ...prev, start_date: e.target.value }))}
              error={formErrors.start_date}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={leagueForm.end_date}
              onChange={(e) => setLeagueForm(prev => ({ ...prev, end_date: e.target.value }))}
              error={formErrors.end_date}
              required
            />

            <Input
              label="Teams per Division"
              type="number"
              min="4"
              max="16"
              value={leagueForm.teams_per_division}
              onChange={(e) => setLeagueForm(prev => ({ ...prev, teams_per_division: parseInt(e.target.value) }))}
              error={formErrors.teams_per_division}
              required
            />

            <Select
              label="Format"
              value={leagueForm.format}
              onChange={(e) => setLeagueForm(prev => ({ ...prev, format: e.target.value as League['format'] }))}
              options={[
                { value: 'round_robin', label: 'Round Robin' },
                { value: 'playoff', label: 'Playoff' },
                { value: 'hybrid', label: 'Hybrid' }
              ]}
              error={formErrors.format}
              required
            />
          </div>

          {/* Scoring Rules */}
          <div>
            <h3 className="text-lg font-semibold text-brand-black mb-4">Scoring Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Points per Win"
                type="number"
                min="0"
                value={leagueForm.scoring_rules.points_per_win}
                onChange={(e) => setLeagueForm(prev => ({
                  ...prev,
                  scoring_rules: { ...prev.scoring_rules, points_per_win: parseInt(e.target.value) }
                }))}
              />

              <Input
                label="Points per Tie"
                type="number"
                min="0"
                value={leagueForm.scoring_rules.points_per_tie}
                onChange={(e) => setLeagueForm(prev => ({
                  ...prev,
                  scoring_rules: { ...prev.scoring_rules, points_per_tie: parseInt(e.target.value) }
                }))}
              />

              <Input
                label="Points per Loss"
                type="number"
                min="0"
                value={leagueForm.scoring_rules.points_per_loss}
                onChange={(e) => setLeagueForm(prev => ({
                  ...prev,
                  scoring_rules: { ...prev.scoring_rules, points_per_loss: parseInt(e.target.value) }
                }))}
              />
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
};

export default LeaguesLanding;
