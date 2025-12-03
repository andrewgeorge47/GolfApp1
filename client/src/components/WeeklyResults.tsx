import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Award,
  Target,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';

interface League {
  id: number;
  name: string;
  season: string;
}

interface Matchup {
  id: number;
  league_id: number;
  week_number: number;
  division_id: number;
  division_name: string;
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team2_name: string;
  winner_team_id: number | null;
  status: string;
  week_start_date: string;
  week_end_date: string;
  course_name: string;
  course_rating: number;
  course_slope: number;
  course_par: number;
  team1_individual_net: number;
  team2_individual_net: number;
  team1_alternate_shot_net: number;
  team2_alternate_shot_net: number;
  team1_total_net: number;
  team2_total_net: number;
  team1_points: number;
  team2_points: number;
  match_date: string;
  completed_at: string;
}

interface StandingsChange {
  team_id: number;
  team_name: number;
  division_name: string;
  previous_rank: number;
  current_rank: number;
  rank_change: number;
  points_change: number;
  previous_points: number;
  current_points: number;
}

interface WeeklyResultsData {
  league: League;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  matchups: Matchup[];
  standings_changes: StandingsChange[];
  total_matches: number;
  completed_matches: number;
  pending_matches: number;
}

interface WeeklyResultsProps {
  leagueId: number;
  weekNumber?: number;
  onBack?: () => void;
}

const WeeklyResults: React.FC<WeeklyResultsProps> = ({ 
  leagueId, 
  weekNumber, 
  onBack 
}) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(weekNumber || 1);
  const [activeTab, setActiveTab] = useState<'results' | 'standings' | 'summary'>('results');

  useEffect(() => {
    loadWeeklyResults();
  }, [leagueId, currentWeek]);

  const loadWeeklyResults = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockData: WeeklyResultsData = {
        league: {
          id: leagueId,
          name: "UAL Season 2 Winter 2025",
          season: "Winter 2025"
        },
        week_number: currentWeek,
        week_start_date: "2025-01-22",
        week_end_date: "2025-01-28",
        matchups: [
          {
            id: 1,
            league_id: leagueId,
            week_number: currentWeek,
            division_id: 1,
            division_name: "Division A",
            team1_id: 1,
            team2_id: 2,
            team1_name: "Team Alpha",
            team2_name: "Team Beta",
            winner_team_id: 1,
            status: "completed",
            week_start_date: "2025-01-22",
            week_end_date: "2025-01-28",
            course_name: "Pebble Beach",
            course_rating: 72.0,
            course_slope: 140,
            course_par: 72,
            team1_individual_net: 18,
            team2_individual_net: 19,
            team1_alternate_shot_net: 16,
            team2_alternate_shot_net: 17,
            team1_total_net: 34,
            team2_total_net: 36,
            team1_points: 1.0,
            team2_points: 0.0,
            match_date: "2025-01-25",
            completed_at: "2025-01-25T18:30:00Z"
          },
          {
            id: 2,
            league_id: leagueId,
            week_number: currentWeek,
            division_id: 1,
            division_name: "Division A",
            team1_id: 3,
            team2_id: 4,
            team1_name: "Team Gamma",
            team2_name: "Team Delta",
            winner_team_id: 4,
            status: "completed",
            week_start_date: "2025-01-22",
            week_end_date: "2025-01-28",
            course_name: "Augusta National",
            course_rating: 74.0,
            course_slope: 135,
            course_par: 72,
            team1_individual_net: 20,
            team2_individual_net: 17,
            team1_alternate_shot_net: 18,
            team2_alternate_shot_net: 15,
            team1_total_net: 38,
            team2_total_net: 32,
            team1_points: 0.0,
            team2_points: 1.0,
            match_date: "2025-01-26",
            completed_at: "2025-01-26T17:45:00Z"
          },
          {
            id: 3,
            league_id: leagueId,
            week_number: currentWeek,
            division_id: 2,
            division_name: "Division B",
            team1_id: 5,
            team2_id: 6,
            team1_name: "Team Epsilon",
            team2_name: "Team Zeta",
            winner_team_id: null,
            status: "completed",
            week_start_date: "2025-01-22",
            week_end_date: "2025-01-28",
            course_name: "St. Andrews",
            course_rating: 71.0,
            course_slope: 130,
            course_par: 72,
            team1_individual_net: 18,
            team2_individual_net: 18,
            team1_alternate_shot_net: 17,
            team2_alternate_shot_net: 17,
            team1_total_net: 35,
            team2_total_net: 35,
            team1_points: 0.5,
            team2_points: 0.5,
            match_date: "2025-01-27",
            completed_at: "2025-01-27T16:20:00Z"
          },
          {
            id: 4,
            league_id: leagueId,
            week_number: currentWeek,
            division_id: 2,
            division_name: "Division B",
            team1_id: 7,
            team2_id: 8,
            team1_name: "Team Theta",
            team2_name: "Team Iota",
            winner_team_id: null,
            status: "scheduled",
            week_start_date: "2025-01-22",
            week_end_date: "2025-01-28",
            course_name: "Cypress Point",
            course_rating: 73.0,
            course_slope: 145,
            course_par: 72,
            team1_individual_net: 0,
            team2_individual_net: 0,
            team1_alternate_shot_net: 0,
            team2_alternate_shot_net: 0,
            team1_total_net: 0,
            team2_total_net: 0,
            team1_points: 0.0,
            team2_points: 0.0,
            match_date: "2025-01-28",
            completed_at: ""
          }
        ],
        standings_changes: [
          {
            team_id: 1,
            team_name: 1,
            division_name: "Division A",
            previous_rank: 2,
            current_rank: 1,
            rank_change: -1,
            points_change: 1.0,
            previous_points: 12.0,
            current_points: 13.0
          },
          {
            team_id: 2,
            team_name: 2,
            division_name: "Division A",
            previous_rank: 1,
            current_rank: 2,
            rank_change: 1,
            points_change: 0.0,
            previous_points: 12.0,
            current_points: 12.0
          },
          {
            team_id: 4,
            team_name: 4,
            division_name: "Division A",
            previous_rank: 3,
            current_rank: 3,
            rank_change: 0,
            points_change: 1.0,
            previous_points: 8.0,
            current_points: 9.0
          }
        ],
        total_matches: 4,
        completed_matches: 3,
        pending_matches: 1
      };
      
      setWeeklyData(mockData);
      
      // Simulate loading delay
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading weekly results:', error);
      toast.error('Failed to load weekly results');
      setLoading(false);
    }
  };

  const getAvailableWeeks = () => {
    // This would be determined by the matchups data
    return Array.from({ length: 12 }, (_, i) => i + 1); // Placeholder
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const availableWeeks = getAvailableWeeks();
    const currentIndex = availableWeeks.indexOf(currentWeek);
    
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentWeek(availableWeeks[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < availableWeeks.length - 1) {
      setCurrentWeek(availableWeeks[currentIndex + 1]);
    }
  };

  const getResultIcon = (matchup: Matchup, teamId: number) => {
    if (matchup.status !== 'completed') {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    
    if (matchup.winner_team_id === teamId) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (matchup.winner_team_id === null) {
      return <Minus className="w-4 h-4 text-yellow-500" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
  };

  const getResultColor = (matchup: Matchup, teamId: number) => {
    if (matchup.status !== 'completed') {
      return 'bg-gray-100 text-gray-800';
    }
    
    if (matchup.winner_team_id === teamId) {
      return 'bg-green-100 text-green-800';
    } else if (matchup.winner_team_id === null) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getRankChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!weeklyData) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No weekly results data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
          )}
          <Calendar className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">
              Week {weeklyData.week_number} Results
            </h1>
            <p className="text-neutral-600">
              {weeklyData.league.name} - {weeklyData.league.season}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadWeeklyResults()}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            disabled={currentWeek <= 1}
            className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Week</span>
          </button>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-brand-black">
              Week {weeklyData.week_number}
            </div>
            <div className="text-sm text-neutral-600">
              {new Date(weeklyData.week_start_date).toLocaleDateString()} - {new Date(weeklyData.week_end_date).toLocaleDateString()}
            </div>
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            disabled={currentWeek >= 12} // Assuming 12 weeks max
            className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next Week</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-brand-neon-green" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Total Matches</p>
              <p className="text-2xl font-bold text-brand-black">{weeklyData.total_matches}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Completed</p>
              <p className="text-2xl font-bold text-brand-black">{weeklyData.completed_matches}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Pending</p>
              <p className="text-2xl font-bold text-brand-black">{weeklyData.pending_matches}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Completion Rate</p>
              <p className="text-2xl font-bold text-brand-black">
                {weeklyData.total_matches > 0 ? 
                  ((weeklyData.completed_matches / weeklyData.total_matches) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('results')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'results'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Match Results
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'standings'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Standings Changes
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Week Summary
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* Match Results */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Match Results</h3>
                <p className="text-sm text-neutral-600">All matchups for Week {weeklyData.week_number}</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Division
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Matchup
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Scores
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {weeklyData.matchups.map((matchup) => (
                      <tr key={matchup.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {matchup.division_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div>
                            <div className="font-medium">{matchup.team1_name}</div>
                            <div className="text-xs text-neutral-500">vs</div>
                            <div className="font-medium">{matchup.team2_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-neutral-400 mr-1" />
                            <div>
                              <div className="font-medium">{matchup.course_name || 'TBD'}</div>
                              {matchup.course_par && (
                                <div className="text-xs text-neutral-500">Par {matchup.course_par}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {matchup.status === 'completed' ? (
                            <div>
                              <div className="font-medium">
                                {matchup.team1_total_net} - {matchup.team2_total_net}
                              </div>
                              <div className="text-xs text-neutral-500">
                                Individual: {matchup.team1_individual_net} - {matchup.team2_individual_net}
                              </div>
                              <div className="text-xs text-neutral-500">
                                Alt Shot: {matchup.team1_alternate_shot_net} - {matchup.team2_alternate_shot_net}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">TBD</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <div className="flex space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResultColor(matchup, matchup.team1_id)}`}>
                              {getResultIcon(matchup, matchup.team1_id)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResultColor(matchup, matchup.team2_id)}`}>
                              {getResultIcon(matchup, matchup.team2_id)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          {matchup.status === 'completed' ? (
                            <div>
                              <div className="font-medium">
                                {matchup.team1_points} - {matchup.team2_points}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">TBD</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(matchup.status)}`}>
                            {matchup.status.charAt(0).toUpperCase() + matchup.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-6">
            {/* Standings Changes */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Standings Changes</h3>
                <p className="text-sm text-neutral-600">Rank and points changes after Week {weeklyData.week_number}</p>
              </div>
              
              {weeklyData.standings_changes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Division
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Rank Change
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Points Change
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          Current Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {weeklyData.standings_changes.map((change) => (
                        <tr key={change.team_id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-black">
                            {change.team_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                            {change.division_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                            <div className="flex items-center">
                              {getRankChangeIcon(change.rank_change)}
                              <span className={`ml-1 font-medium ${getRankChangeColor(change.rank_change)}`}>
                                {change.rank_change > 0 ? `+${change.rank_change}` : change.rank_change}
                              </span>
                              <span className="ml-2 text-xs text-neutral-500">
                                ({change.previous_rank} → {change.current_rank})
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                            <span className={`font-medium ${change.points_change > 0 ? 'text-green-600' : change.points_change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {change.points_change > 0 ? `+${change.points_change}` : change.points_change}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-black">
                            <span className="font-bold">{change.current_points}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No standings changes data available</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Standings changes will be calculated after matches are completed
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Week Summary */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Week Summary</h3>
                <p className="text-sm text-neutral-600">Overview of Week {weeklyData.week_number} performance</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-3">Match Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Total Matches:</span>
                        <span className="text-sm font-medium text-brand-black">{weeklyData.total_matches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Completed:</span>
                        <span className="text-sm font-medium text-green-600">{weeklyData.completed_matches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Pending:</span>
                        <span className="text-sm font-medium text-blue-600">{weeklyData.pending_matches}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-neutral-700">Completion Rate:</span>
                        <span className="text-sm font-bold text-brand-black">
                          {weeklyData.total_matches > 0 ? 
                            ((weeklyData.completed_matches / weeklyData.total_matches) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-3">Week Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Week Number:</span>
                        <span className="text-sm font-medium text-brand-black">{weeklyData.week_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">Start Date:</span>
                        <span className="text-sm font-medium text-brand-black">
                          {new Date(weeklyData.week_start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-600">End Date:</span>
                        <span className="text-sm font-medium text-brand-black">
                          {new Date(weeklyData.week_end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-neutral-700">League:</span>
                        <span className="text-sm font-bold text-brand-black">{weeklyData.league.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Division Breakdown */}
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-brand-black">Division Breakdown</h3>
                <p className="text-sm text-neutral-600">Matches by division for Week {weeklyData.week_number}</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries(
                    weeklyData.matchups.reduce((acc, matchup) => {
                      const div = matchup.division_name;
                      if (!acc[div]) acc[div] = { total: 0, completed: 0 };
                      acc[div].total++;
                      if (matchup.status === 'completed') acc[div].completed++;
                      return acc;
                    }, {} as Record<string, { total: number; completed: number }>)
                  ).map(([division, stats]) => (
                    <div key={division} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-brand-black">{division}</h4>
                        <p className="text-xs text-neutral-600">
                          {stats.completed} of {stats.total} matches completed
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-brand-black">
                          {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%
                        </div>
                        <div className="text-xs text-neutral-600">completion</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyResults;
