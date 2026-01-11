import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Trophy,
  Users,
  Calendar,
  Target,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getLeagues,
  updateLeague,
  League as APILeague
} from '../services/api';
import LeagueSignupLinker from './LeagueSignupLinker';
import { Button, Card, CardHeader, CardContent, Input, Select } from './ui';

interface LeagueAdminSettingsProps {
  leagueId: number;
}

interface LeagueFormData {
  name: string;
  season: string;
  start_date: string;
  end_date: string;
  divisions_count: number;
  weeks_per_season: number;
  teams_per_division: number;
  format: 'round_robin' | 'playoff' | 'hybrid';
  individual_holes: number;
  alternate_shot_holes: number;
  active_players_per_week: number;
  roster_size_min: number;
  roster_size_max: number;
  points_for_win: number;
  points_for_tie: number;
  points_for_loss: number;
  status: 'draft' | 'registration' | 'active' | 'playoffs' | 'completed' | 'paused';
}

const LeagueAdminSettings: React.FC<LeagueAdminSettingsProps> = ({ leagueId }) => {
  const [league, setLeague] = useState<APILeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    season: '',
    start_date: '',
    end_date: '',
    divisions_count: 2,
    weeks_per_season: 18,
    teams_per_division: 8,
    format: 'hybrid',
    individual_holes: 9,
    alternate_shot_holes: 9,
    active_players_per_week: 3,
    roster_size_min: 4,
    roster_size_max: 5,
    points_for_win: 2,
    points_for_tie: 1,
    points_for_loss: 0,
    status: 'draft'
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadLeague();
  }, [leagueId]);

  const loadLeague = async () => {
    setLoading(true);
    try {
      const response = await getLeagues();
      const foundLeague = response.data.find((l: APILeague) => l.id === leagueId);

      if (foundLeague) {
        setLeague(foundLeague);
        setFormData({
          name: foundLeague.name,
          season: foundLeague.season || '',
          start_date: foundLeague.start_date,
          end_date: foundLeague.end_date,
          divisions_count: foundLeague.divisions_count || 2,
          weeks_per_season: foundLeague.weeks_per_season || 18,
          teams_per_division: foundLeague.teams_per_division || 8,
          format: (foundLeague.format || 'hybrid') as 'round_robin' | 'playoff' | 'hybrid',
          individual_holes: foundLeague.individual_holes || 9,
          alternate_shot_holes: foundLeague.alternate_shot_holes || 9,
          active_players_per_week: foundLeague.active_players_per_week || 3,
          roster_size_min: foundLeague.roster_size_min || 4,
          roster_size_max: foundLeague.roster_size_max || 5,
          points_for_win: foundLeague.points_for_win || 2,
          points_for_tie: foundLeague.points_for_tie || 1,
          points_for_loss: foundLeague.points_for_loss || 0,
          status: foundLeague.status as 'draft' | 'registration' | 'active' | 'playoffs' | 'completed' | 'paused'
        });
      }
    } catch (error) {
      console.error('Error loading league:', error);
      toast.error('Failed to load league settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LeagueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLeague(leagueId, formData);
      toast.success('League settings updated successfully');
      setHasChanges(false);
      loadLeague(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error saving league settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save league settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
        <p className="text-neutral-600">League not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h2 className="text-2xl font-bold text-brand-black">League Settings</h2>
            <p className="text-neutral-600">Configure high-level league settings and manage registrations</p>
          </div>
        </div>

        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saving}
            icon={Save}
            variant="primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Basic Information */}
      <Card variant="elevated">
        <CardHeader
          title={
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-brand-neon-green" />
              <span>Basic Information</span>
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="League Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />

            <Input
              label="Season"
              value={formData.season}
              onChange={(e) => handleInputChange('season', e.target.value)}
              required
            />

            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              required
            />

            <Select
              label="League Status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'registration', label: 'Registration' },
                { value: 'active', label: 'Active' },
                { value: 'playoffs', label: 'Playoffs' },
                { value: 'paused', label: 'Paused' },
                { value: 'completed', label: 'Completed' }
              ]}
              required
            />

            <Select
              label="League Format"
              value={formData.format}
              onChange={(e) => handleInputChange('format', e.target.value)}
              options={[
                { value: 'round_robin', label: 'Round Robin' },
                { value: 'playoff', label: 'Playoff' },
                { value: 'hybrid', label: 'Hybrid' }
              ]}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Structure Settings */}
      <Card variant="elevated">
        <CardHeader
          title={
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-brand-neon-green" />
              <span>League Structure</span>
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Number of Divisions"
              type="number"
              min="1"
              max="10"
              value={formData.divisions_count}
              onChange={(e) => handleInputChange('divisions_count', parseInt(e.target.value))}
              helperText="Total number of divisions in the league"
              required
            />

            <Input
              label="Number of Weeks"
              type="number"
              min="1"
              max="52"
              value={formData.weeks_per_season}
              onChange={(e) => handleInputChange('weeks_per_season', parseInt(e.target.value))}
              helperText="Total weeks in the regular season"
              required
            />

            <Input
              label="Teams per Division"
              type="number"
              min="2"
              max="16"
              value={formData.teams_per_division}
              onChange={(e) => handleInputChange('teams_per_division', parseInt(e.target.value))}
              helperText="Maximum teams allowed per division"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">League Capacity</p>
                <p>
                  Current configuration allows for <span className="font-bold">{formData.divisions_count} divisions</span> with up to{' '}
                  <span className="font-bold">{formData.teams_per_division} teams each</span> ={' '}
                  <span className="font-bold">{formData.divisions_count * formData.teams_per_division} total teams maximum</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Settings */}
      <Card variant="elevated">
        <CardHeader
          title={
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-brand-neon-green" />
              <span>Match Format</span>
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Individual Holes"
              type="number"
              min="0"
              max="18"
              value={formData.individual_holes}
              onChange={(e) => handleInputChange('individual_holes', parseInt(e.target.value))}
              helperText="Number of individual match play holes"
            />

            <Input
              label="Alternate Shot Holes"
              type="number"
              min="0"
              max="18"
              value={formData.alternate_shot_holes}
              onChange={(e) => handleInputChange('alternate_shot_holes', parseInt(e.target.value))}
              helperText="Number of alternate shot holes"
            />

            <Input
              label="Active Players per Week"
              type="number"
              min="1"
              max="10"
              value={formData.active_players_per_week}
              onChange={(e) => handleInputChange('active_players_per_week', parseInt(e.target.value))}
              helperText="Players that must be active each week"
            />

            <div></div>

            <Input
              label="Minimum Roster Size"
              type="number"
              min="1"
              max="20"
              value={formData.roster_size_min}
              onChange={(e) => handleInputChange('roster_size_min', parseInt(e.target.value))}
              helperText="Minimum number of players per team"
            />

            <Input
              label="Maximum Roster Size"
              type="number"
              min="1"
              max="20"
              value={formData.roster_size_max}
              onChange={(e) => handleInputChange('roster_size_max', parseInt(e.target.value))}
              helperText="Maximum number of players per team"
            />
          </div>
        </CardContent>
      </Card>

      {/* Scoring Settings */}
      <Card variant="elevated">
        <CardHeader
          title={
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-brand-neon-green" />
              <span>Scoring Rules</span>
            </div>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Points per Win"
              type="number"
              min="0"
              step="0.5"
              value={formData.points_for_win}
              onChange={(e) => handleInputChange('points_for_win', parseFloat(e.target.value))}
            />

            <Input
              label="Points per Tie"
              type="number"
              min="0"
              step="0.5"
              value={formData.points_for_tie}
              onChange={(e) => handleInputChange('points_for_tie', parseFloat(e.target.value))}
            />

            <Input
              label="Points per Loss"
              type="number"
              min="0"
              step="0.5"
              value={formData.points_for_loss}
              onChange={(e) => handleInputChange('points_for_loss', parseFloat(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signup Registrations */}
      <div className="pt-6 border-t-2 border-neutral-200">
        <LeagueSignupLinker leagueId={leagueId} />
      </div>
    </div>
  );
};

export default LeagueAdminSettings;
