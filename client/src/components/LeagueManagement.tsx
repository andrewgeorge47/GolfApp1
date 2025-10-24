import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X,
  ChevronRight,
  ChevronDown,
  Target,
  Award,
  Clock,
  MapPin,
  BarChart3,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import { createTournament, getTournaments, updateTournament, deleteTournament } from '../services/api';
import LeagueDivisionManager from './LeagueDivisionManager';
import LeagueScheduleBuilder from './LeagueScheduleBuilder';
import LeagueTeamManager from './LeagueTeamManager';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardContent, 
  Modal, 
  ModalHeader, 
  ModalContent, 
  ModalFooter,
  FormDialog,
  Input,
  Select,
  SelectOption,
  Badge,
  StatusBadge,
  Loading,
  Spinner,
  Tabs,
  TabPanel
} from './ui';

interface League {
  id: number;
  name: string;
  season: string;
  start_date: string;
  end_date: string;
  divisions: Division[];
  teams_per_division: number;
  scoring_rules: ScoringRules;
  format: 'round_robin' | 'playoff' | 'hybrid';
  status: 'draft' | 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

interface Division {
  id: number;
  name: string;
  teams: Team[];
  max_teams: number;
}

interface Team {
  id: number;
  name: string;
  captain_id: number;
  captain_name: string;
  members: TeamMember[];
  division_id: number;
}

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
}

interface ScoringRules {
  points_per_win: number;
  points_per_tie: number;
  points_per_loss: number;
  playoff_format: 'single_elimination' | 'double_elimination' | 'best_of_three';
  tiebreaker_criteria: string[];
}

const LeagueManagement: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'divisions' | 'schedule' | 'teams'>('overview');
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
      // TODO: Replace with actual API call
      // For now, using mock data
      const mockLeagues: League[] = [
        {
          id: 1,
          name: 'Spring 2024 League',
          season: 'Spring 2024',
          start_date: '2024-03-01',
          end_date: '2024-05-31',
          divisions: [],
          teams_per_division: 8,
          scoring_rules: {
            points_per_win: 2,
            points_per_tie: 1,
            points_per_loss: 0,
            playoff_format: 'single_elimination',
            tiebreaker_criteria: ['head_to_head', 'aggregate_score']
          },
          format: 'round_robin',
          status: 'active',
          created_at: '2024-02-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        }
      ];
      setLeagues(mockLeagues);
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
      // TODO: Replace with actual API call
      const newLeague: League = {
        id: Date.now(), // Temporary ID
        ...leagueForm,
        divisions: [],
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setLeagues(prev => [...prev, newLeague]);
      setShowCreateForm(false);
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
    } catch (error) {
      console.error('Error creating league:', error);
      toast.error('Failed to create league');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeague = async (leagueId: number) => {
    if (!window.confirm('Are you sure you want to delete this league? This action cannot be undone.')) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      setLeagues(prev => prev.filter(league => league.id !== leagueId));
      toast.success('League deleted successfully');
    } catch (error) {
      console.error('Error deleting league:', error);
      toast.error('Failed to delete league');
    }
  };

  const handleUpdateLeagueStatus = async (leagueId: number, status: League['status']) => {
    try {
      // TODO: Replace with actual API call
      setLeagues(prev => 
        prev.map(league => 
          league.id === leagueId 
            ? { ...league, status, updated_at: new Date().toISOString() }
            : league
        )
      );
      toast.success(`League status updated to ${status}`);
    } catch (error) {
      console.error('Error updating league status:', error);
      toast.error('Failed to update league status');
    }
  };

  const getStatusColor = (status: League['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">League Management</h1>
            <p className="text-neutral-600">Create and manage golf leagues</p>
          </div>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
          icon={Plus}
          variant="primary"
        >
          Create League
        </Button>
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
            <Trophy className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('divisions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'divisions'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Divisions
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
          <button
            onClick={() => setActiveTab('teams')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'teams'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Teams
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* League Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="flex items-center">
                  <Trophy className="w-8 h-8 text-brand-neon-green" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Total Leagues</p>
                    <p className="text-2xl font-bold text-brand-black">{leagues.length}</p>
                  </div>
                </div>
              </Card>
              
              <Card>
                <div className="flex items-center">
                  <Trophy className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Active Leagues</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {leagues.filter(l => l.status === 'active').length}
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card>
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Total Teams</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {leagues.reduce((sum, league) => sum + league.divisions.reduce((divSum, div) => divSum + div.teams.length, 0), 0)}
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card>
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-600">Upcoming Seasons</p>
                    <p className="text-2xl font-bold text-brand-black">
                      {leagues.filter(l => l.status === 'draft').length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Leagues List */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">All Leagues</h3>
              </div>
              
              <div className="divide-y divide-neutral-200">
                {leagues.map((league) => (
                  <div key={league.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
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
                        
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(league.status)}
                          <div>
                            <h4 className="text-lg font-semibold text-brand-black">{league.name}</h4>
                            <p className="text-sm text-neutral-600">{league.season}</p>
                          </div>
                        </div>
                        
                        <StatusBadge status={league.status === 'active' ? 'active' : league.status === 'draft' ? 'draft' : 'completed'} />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Select
                          value={league.status}
                          onChange={(e) => handleUpdateLeagueStatus(league.id, e.target.value as League['status'])}
                          options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'active', label: 'Active' },
                            { value: 'paused', label: 'Paused' },
                            { value: 'completed', label: 'Completed' }
                          ]}
                          selectSize="sm"
                        />
                        
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDeleteLeague(league.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    {expandedLeague === league.id && (
                      <div className="mt-4 pl-12 space-y-4">
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
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>Win: {league.scoring_rules.points_per_win} pts</div>
                            <div>Tie: {league.scoring_rules.points_per_tie} pts</div>
                            <div>Loss: {league.scoring_rules.points_per_loss} pts</div>
                          </div>
                        </div>
                        
                        {/* Navigation Actions */}
                        <div className="mt-4 pt-4 border-t border-neutral-200">
                          <p className="text-sm font-medium text-neutral-600 mb-3">Quick Actions</p>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/league-standings/${league.id}`}
                              className="inline-flex items-center px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors text-sm"
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              View Standings
                            </a>
                            <a
                              href={`/weekly-results/${league.id}`}
                              className="inline-flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Weekly Results
                            </a>
                            <button className="inline-flex items-center px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'divisions' && <LeagueDivisionManager />}
        {activeTab === 'schedule' && <LeagueScheduleBuilder />}
        {activeTab === 'teams' && <LeagueTeamManager />}
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

export default LeagueManagement;