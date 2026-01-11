import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Calendar,
  Settings as SettingsIcon,
  ArrowLeft
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getLeagues,
  League as APILeague
} from '../services/api';
import LeagueDivisionManager from './LeagueDivisionManager';
import LeagueScheduleBuilder from './LeagueScheduleBuilder';
import LeagueTeamManager from './LeagueTeamManager';
import LeagueAdminSettings from './LeagueAdminSettings';
import {
  Button,
  Spinner
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
  status: 'draft' | 'registration' | 'active' | 'playoffs' | 'completed' | 'paused';
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

const LeagueAdminPanel: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'divisions' | 'schedule' | 'teams'>('settings');

  useEffect(() => {
    if (leagueId) {
      loadLeague();
    }
  }, [leagueId]);

  const loadLeague = async () => {
    if (!leagueId) return;

    setLoading(true);
    try {
      const response = await getLeagues();
      const apiLeagues = response.data;
      const foundLeague = apiLeagues.find(l => l.id === parseInt(leagueId));

      if (!foundLeague) {
        toast.error('League not found');
        navigate('/admin/league-management');
        return;
      }

      // Transform to component format
      const transformedLeague: League = {
        id: foundLeague.id,
        name: foundLeague.name,
        season: foundLeague.season || '',
        start_date: foundLeague.start_date,
        end_date: foundLeague.end_date,
        divisions: [],
        teams_per_division: foundLeague.teams_per_division || 8,
        scoring_rules: {
          points_per_win: foundLeague.points_for_win || 2,
          points_per_tie: foundLeague.points_for_tie || 1,
          points_per_loss: foundLeague.points_for_loss || 0,
          playoff_format: (foundLeague.playoff_format || 'single_elimination') as any,
          tiebreaker_criteria: ['head_to_head', 'aggregate_score', 'handicap_differential']
        },
        format: (foundLeague.format || 'round_robin') as any,
        status: foundLeague.status,
        created_at: foundLeague.created_at,
        updated_at: foundLeague.updated_at
      };

      setLeague(transformedLeague);
    } catch (error) {
      console.error('Error loading league:', error);
      toast.error('Failed to load league');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading league..." />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
        <p className="text-neutral-600 mb-4">League not found</p>
        <Button onClick={() => navigate('/admin/league-management')} variant="primary">
          Back to Leagues
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate('/admin/league-management')}
              icon={ArrowLeft}
              variant="ghost"
              size="sm"
            >
              Back
            </Button>
            <div className="h-8 w-px bg-neutral-200"></div>
            <Trophy className="w-8 h-8 text-brand-neon-green" />
            <div>
              <h1 className="text-2xl font-bold text-brand-black">{league.name}</h1>
              <p className="text-neutral-600">{league.season}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <SettingsIcon className="w-4 h-4 inline mr-2" />
            Settings
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
        {activeTab === 'settings' && <LeagueAdminSettings leagueId={league.id} />}

        {activeTab === 'divisions' && <LeagueDivisionManager leagueId={league.id} />}

        {activeTab === 'schedule' && <LeagueScheduleBuilder leagueId={league.id} />}

        {activeTab === 'teams' && <LeagueTeamManager leagueId={league.id} />}
      </div>
    </div>
  );
};

export default LeagueAdminPanel;