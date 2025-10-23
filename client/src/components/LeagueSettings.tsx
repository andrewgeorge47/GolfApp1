import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, Settings, Clock, Award } from 'lucide-react';
import { toast } from 'react-toastify';

interface LeagueSettingsProps {
  tournamentId?: number;
  isLeague: boolean;
  onSettingsChange: (settings: LeagueConfig) => void;
  initialSettings?: LeagueConfig;
}

interface LeagueConfig {
  // Basic league info
  name: string;
  description: string;
  
  // Season configuration
  season_start_date: string;
  season_end_date: string;
  auto_progression: boolean;
  
  // Scoring configuration
  min_matches_per_week: number;
  max_matches_per_week: number;
  live_match_bonus: number;
  tie_break_rules: string;
  
  // Participant management
  max_participants: number;
  min_participants: number;
  registration_open: boolean;
  
  // Week configuration
  week_start_day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  scoring_deadline_hours: number;
  
  // Advanced settings
  playoff_enabled: boolean;
  playoff_weeks: number;
  drop_worst_weeks: number;
}

const LeagueSettings: React.FC<LeagueSettingsProps> = ({
  tournamentId,
  isLeague,
  onSettingsChange,
  initialSettings
}) => {
  const [settings, setSettings] = useState<LeagueConfig>({
    name: initialSettings?.name || 'Weekly Golf League',
    description: initialSettings?.description || '',
    season_start_date: initialSettings?.season_start_date || '',
    season_end_date: initialSettings?.season_end_date || '',
    auto_progression: initialSettings?.auto_progression || false,
    min_matches_per_week: initialSettings?.min_matches_per_week || 3,
    max_matches_per_week: initialSettings?.max_matches_per_week || 5,
    live_match_bonus: initialSettings?.live_match_bonus || 1,
    tie_break_rules: initialSettings?.tie_break_rules || 'total_points',
    max_participants: initialSettings?.max_participants || 50,
    min_participants: initialSettings?.min_participants || 8,
    registration_open: initialSettings?.registration_open || true,
    week_start_day: initialSettings?.week_start_day || 'monday',
    scoring_deadline_hours: initialSettings?.scoring_deadline_hours || 72,
    playoff_enabled: initialSettings?.playoff_enabled || false,
    playoff_weeks: initialSettings?.playoff_weeks || 2,
    drop_worst_weeks: initialSettings?.drop_worst_weeks || 0
  });

  // Update parent component when settings change
  useEffect(() => {
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleSettingChange = (key: keyof LeagueConfig, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isLeague) {
    return null; // Don't render for non-league tournaments
  }

  return (
    <div className="space-y-6">
      {/* League Configuration Header */}
      <div className="flex items-center space-x-2 mb-6">
        <Trophy className="w-6 h-6 text-brand-neon-green" />
        <h3 className="text-xl font-semibold text-brand-black">League Configuration</h3>
      </div>

      {/* Season Configuration */}
      <div className="bg-neutral-50 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-brand-neon-green mr-2" />
          <h4 className="text-lg font-semibold text-brand-black">Season Configuration</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Season Start Date *
            </label>
            <input
              type="date"
              value={settings.season_start_date}
              onChange={e => handleSettingChange('season_start_date', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Season End Date *
            </label>
            <input
              type="date"
              value={settings.season_end_date}
              onChange={e => handleSettingChange('season_end_date', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.auto_progression}
              onChange={e => handleSettingChange('auto_progression', e.target.checked)}
              className="w-4 h-4 text-brand-neon-green border-neutral-300 rounded focus:ring-brand-neon-green focus:ring-2"
            />
            <span className="text-sm font-medium text-neutral-600">
              Enable automatic week progression
            </span>
          </label>
          <p className="text-xs text-neutral-500 mt-1">
            Automatically create new tournament weeks and advance the league
          </p>
        </div>
      </div>

      {/* Scoring Configuration */}
      <div className="bg-neutral-50 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <Award className="w-5 h-5 text-brand-neon-green mr-2" />
          <h4 className="text-lg font-semibold text-brand-black">Scoring Configuration</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Min Matches Per Week
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.min_matches_per_week}
              onChange={e => handleSettingChange('min_matches_per_week', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Max Matches Per Week
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.max_matches_per_week}
              onChange={e => handleSettingChange('max_matches_per_week', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Live Match Bonus Points
            </label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.5"
              value={settings.live_match_bonus}
              onChange={e => handleSettingChange('live_match_bonus', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Tie Break Rules
            </label>
            <select
              value={settings.tie_break_rules}
              onChange={e => handleSettingChange('tie_break_rules', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="total_points">Total Points</option>
              <option value="head_to_head">Head to Head Record</option>
              <option value="lowest_total_score">Lowest Total Score</option>
              <option value="most_wins">Most Wins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Week Configuration */}
      <div className="bg-neutral-50 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-brand-neon-green mr-2" />
          <h4 className="text-lg font-semibold text-brand-black">Week Configuration</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Week Start Day
            </label>
            <select
              value={settings.week_start_day}
              onChange={e => handleSettingChange('week_start_day', e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Scoring Deadline (hours after week ends)
            </label>
            <input
              type="number"
              min="24"
              max="168"
              value={settings.scoring_deadline_hours}
              onChange={e => handleSettingChange('scoring_deadline_hours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-neutral-50 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-brand-neon-green mr-2" />
          <h4 className="text-lg font-semibold text-brand-black">Advanced Settings</h4>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.playoff_enabled}
                onChange={e => handleSettingChange('playoff_enabled', e.target.checked)}
                className="w-4 h-4 text-brand-neon-green border-neutral-300 rounded focus:ring-brand-neon-green focus:ring-2"
              />
              <span className="text-sm font-medium text-neutral-600">
                Enable playoffs at end of season
              </span>
            </label>
          </div>
          
          {settings.playoff_enabled && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1">
                Number of Playoff Weeks
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={settings.playoff_weeks}
                onChange={e => handleSettingChange('playoff_weeks', parseInt(e.target.value))}
                className="w-24 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Drop Worst Weeks
            </label>
            <input
              type="number"
              min="0"
              max="4"
              value={settings.drop_worst_weeks}
              onChange={e => handleSettingChange('drop_worst_weeks', parseInt(e.target.value))}
              className="w-24 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Number of worst scoring weeks to exclude from final standings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeagueSettings; 