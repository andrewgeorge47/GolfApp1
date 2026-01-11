import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  MapPin,
  Clock,
  Users,
  Target,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
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
  Spinner
} from './ui';
import {
  getLeagueDivisions,
  getLeagueTeams,
  getLeagueSchedule,
  getLeagueMatchups,
  generateLeagueSchedule,
  generateLeagueMatchups,
  deleteMatchup,
  getSimulatorCourses,
  getLeagues
} from '../services/api';
import SimulatorCourseSearch from './SimulatorCourseSearch';

interface ScheduleWeek {
  id: number;
  week_number: number;
  start_date: string;
  end_date: string;
  course_id: number;
  course_name: string;
  matches: Match[];
  status: 'scheduled' | 'active' | 'completed';
}

interface Match {
  id: number;
  team1_id: number;
  team1_name: string;
  team2_id: number;
  team2_name: string;
  division_id: number;
  week_id: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  team1_score?: number;
  team2_score?: number;
}

interface Team {
  id: number;
  name: string;
  division_id: number;
  captain_name: string;
}

interface Division {
  id: number;
  name: string;
  teams: Team[];
}

interface Course {
  id: number;
  name: string;
  location?: string;
  par: number;
}

interface LeagueScheduleBuilderProps {
  leagueId: number;
}

const LeagueScheduleBuilder: React.FC<LeagueScheduleBuilderProps> = ({ leagueId }) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [scheduleWeeks, setScheduleWeeks] = useState<ScheduleWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  
  // Week creation form state
  const [showCreateWeekForm, setShowCreateWeekForm] = useState(false);
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [weekForm, setWeekForm] = useState({
    week_number: 1,
    start_date: '',
    end_date: '',
    course_id: 0,
    course_name: ''
  });

  // Match editing state
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchForm, setMatchForm] = useState({
    team1_id: 0,
    team2_id: 0,
    division_id: 0
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load league settings first
      const leaguesResponse = await getLeagues();
      const league = leaguesResponse.data.find((l: any) => l.id === leagueId);
      const weeksPerSeason = league?.weeks_per_season || 18;
      const teamsPerDivision = league?.teams_per_division || 8;
      const startDate = league?.start_date ? new Date(league.start_date) : new Date();

      // Load divisions
      const divisionsResponse = await getLeagueDivisions(leagueId);
      const divisionsData = divisionsResponse.data;

      // Load teams
      const teamsResponse = await getLeagueTeams(leagueId);
      const teamsData = teamsResponse.data;

      // Group teams by division
      const divisionsWithTeams: Division[] = divisionsData.map((div: any) => ({
        id: div.id,
        name: div.division_name,
        teams: teamsData
          .filter((team: any) => team.division_id === div.id)
          .map((team: any) => ({
            id: team.id,
            name: team.name,
            division_id: team.division_id,
            captain_name: team.captain_name || 'Unknown'
          }))
      }));

      // Load courses
      const coursesResponse = await getSimulatorCourses('', '', 100);
      const coursesData: Course[] = (coursesResponse.data.courses || []).map((course: any) => ({
        id: course.id,
        name: course.name,
        location: course.location || '',
        par: course.par || 72
      }));

      // Load schedule
      const scheduleResponse = await getLeagueSchedule(leagueId);
      let scheduleData = scheduleResponse.data;

      // Auto-generate schedule if it doesn't exist based on settings
      // Only auto-generate if divisions exist (prerequisite)
      if (scheduleData.length === 0 && weeksPerSeason > 0 && divisionsData.length > 0) {
        try {
          await generateLeagueSchedule(leagueId, {
            weeks: weeksPerSeason,
            start_date: startDate.toISOString().split('T')[0]
          });
          const newScheduleResponse = await getLeagueSchedule(leagueId);
          scheduleData = newScheduleResponse.data;
          if (scheduleData.length > 0) {
            toast.success(`Created ${weeksPerSeason} week schedule based on league settings`);
          }
        } catch (err: any) {
          console.error('Error auto-generating schedule:', err);
          const errorMessage = err.response?.data?.error || err.message;
          console.log('Schedule generation error details:', errorMessage);
          // Silent fail - user can use the "Generate Schedule" button in the empty state
        }
      }

      // Load matchups
      const matchupsResponse = await getLeagueMatchups(leagueId);
      const matchupsData = matchupsResponse.data;

      // Calculate matches needed per week per division
      const matchesPerWeek = Math.floor(teamsPerDivision / 2);

      // Transform schedule data with matchups
      const transformedSchedule: ScheduleWeek[] = scheduleData.map((week: any) => {
        // Get matchups for this week
        const weekMatchups = matchupsData
          .filter((m: any) => m.week_number === week.week_number)
          .map((m: any) => ({
            id: m.id,
            team1_id: m.team1_id,
            team1_name: m.team1_name,
            team2_id: m.team2_id,
            team2_name: m.team2_name,
            division_id: m.division_id,
            week_id: week.id,
            status: m.status as 'scheduled' | 'in_progress' | 'completed',
            team1_score: m.team1_points,
            team2_score: m.team2_points
          }));

        // Create placeholder matches for each division if none exist
        const placeholderMatches: Match[] = [];
        if (weekMatchups.length === 0 && divisionsData.length > 0) {
          divisionsData.forEach((div: any) => {
            for (let i = 0; i < matchesPerWeek; i++) {
              placeholderMatches.push({
                id: -(week.id * 1000 + div.id * 10 + i), // Negative ID for placeholder
                team1_id: 0,
                team1_name: 'TBD',
                team2_id: 0,
                team2_name: 'TBD',
                division_id: div.id,
                week_id: week.id,
                status: 'scheduled'
              });
            }
          });
        }

        return {
          id: week.id,
          week_number: week.week_number,
          start_date: week.week_start_date,
          end_date: week.week_end_date,
          course_id: week.course_id || 0,
          course_name: week.course_name || 'No course assigned',
          status: week.status as 'scheduled' | 'active' | 'completed',
          matches: weekMatchups.length > 0 ? weekMatchups : placeholderMatches
        };
      });

      setDivisions(divisionsWithTeams);
      setCourses(coursesData);
      setScheduleWeeks(transformedSchedule);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const validateWeekForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!weekForm.start_date) {
      errors.start_date = 'Start date is required';
    }

    if (!weekForm.end_date) {
      errors.end_date = 'End date is required';
    }

    if (weekForm.start_date && weekForm.end_date && weekForm.start_date >= weekForm.end_date) {
      errors.end_date = 'End date must be after start date';
    }

    if (!weekForm.course_id) {
      errors.course_id = 'Course is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateMatchForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!matchForm.team1_id) {
      errors.team1_id = 'Team 1 is required';
    }

    if (!matchForm.team2_id) {
      errors.team2_id = 'Team 2 is required';
    }

    if (matchForm.team1_id && matchForm.team2_id && matchForm.team1_id === matchForm.team2_id) {
      errors.team2_id = 'Teams must be different';
    }

    if (!matchForm.division_id) {
      errors.division_id = 'Division is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateWeek = async () => {
    if (!validateWeekForm()) {
      return;
    }

    toast.info('Use "Auto-Generate Schedule" from the main league page to create weeks');
    setShowCreateWeekForm(false);
    setIsSubmitting(false);

    // TODO: Backend endpoint needed for creating individual schedule weeks
    // Current API only supports bulk schedule generation
  };

  const handleCreateMatch = async () => {
    if (!validateMatchForm()) {
      return;
    }

    toast.info('Use "Auto-Generate" to create matchups for a week');
    setShowMatchForm(false);
    setEditingMatch(null);
    setMatchForm({ team1_id: 0, team2_id: 0, division_id: 0 });
    setIsSubmitting(false);

    // TODO: Backend endpoint needed for creating individual matchups
    // Current API only supports bulk matchup generation
  };

  const handleDeleteWeek = async (weekId: number) => {
    if (!window.confirm('Are you sure you want to delete this week? This will also delete all matches in this week.')) {
      return;
    }

    toast.warning('Week deletion not yet implemented - contact admin to regenerate schedule');

    // TODO: Backend endpoint needed for deleting individual schedule weeks
    // For now, admin can regenerate the entire schedule if needed
  };

  const handleDeleteMatch = async (weekId: number, matchId: number) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }

    try {
      await deleteMatchup(matchId);
      setScheduleWeeks(prev =>
        prev.map(week =>
          week.id === weekId
            ? { ...week, matches: week.matches.filter(match => match.id !== matchId) }
            : week
        )
      );
      toast.success('Match deleted successfully');
    } catch (error: any) {
      console.error('Error deleting match:', error);
      toast.error(error.response?.data?.error || 'Failed to delete match');
    }
  };

  const handleAutoGenerateMatches = async (weekId: number) => {
    try {
      const week = scheduleWeeks.find(w => w.id === weekId);
      if (!week) return;

      if (!window.confirm('This will regenerate matchups for ALL weeks in the league. Continue?')) {
        return;
      }

      // Generate matchups for the entire league
      await generateLeagueMatchups(leagueId, {
        week_number: week.week_number
      });

      // Reload data to get the new matchups
      await loadData();

      toast.success('Matchups generated successfully');
    } catch (error: any) {
      console.error('Error auto-generating matches:', error);
      toast.error(error.response?.data?.error || 'Failed to auto-generate matches');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'active': return <Target className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="Loading schedule..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h2 className="text-2xl font-bold text-brand-black">Schedule Builder</h2>
            <p className="text-neutral-600">Generate and manage league schedules</p>
          </div>
        </div>
        
        <Button
          onClick={() => setShowCreateWeekForm(true)}
          icon={Plus}
          variant="primary"
        >
          Add Week
        </Button>
      </div>

      {/* Empty State */}
      {scheduleWeeks.length === 0 && (
        <Card variant="elevated">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-semibold text-brand-black mb-2">No Schedule Yet</h3>
            <p className="text-neutral-600 mb-6">
              Generate a schedule based on your league settings to get started
            </p>
            <Button
              onClick={async () => {
                try {
                  const leaguesResponse = await getLeagues();
                  const league = leaguesResponse.data.find((l: any) => l.id === leagueId);
                  const weeksPerSeason = league?.weeks_per_season || 18;
                  const startDate = league?.start_date ? new Date(league.start_date) : new Date();

                  setLoading(true);
                  await generateLeagueSchedule(leagueId, {
                    weeks: weeksPerSeason,
                    start_date: startDate.toISOString().split('T')[0]
                  });
                  await loadData();
                  toast.success(`Created ${weeksPerSeason} week schedule`);
                } catch (err: any) {
                  console.error('Error generating schedule:', err);
                  toast.error(err.response?.data?.error || 'Failed to generate schedule');
                  setLoading(false);
                }
              }}
              icon={Plus}
              variant="primary"
            >
              Generate Schedule
            </Button>
          </div>
        </Card>
      )}

      {/* Schedule Weeks */}
      <div className="space-y-4">
        {scheduleWeeks.map((week) => (
          <Card key={week.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setExpandedWeek(expandedWeek === week.id ? null : week.id)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  {expandedWeek === week.id ? (
                    <ChevronDown className="w-5 h-5 text-neutral-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-neutral-500" />
                  )}
                </button>
                
                <div className="flex items-center space-x-3">
                  {getStatusIcon(week.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-brand-black">
                      Week {week.week_number}
                    </h3>
                    <p className="text-sm text-neutral-600">
                      {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <StatusBadge status={week.status === 'scheduled' ? 'pending' : week.status === 'active' ? 'active' : 'completed'} />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm text-neutral-600">
                  <MapPin className="w-4 h-4" />
                  <span>{week.course_name}</span>
                </div>
                
                <Button
                  onClick={() => handleAutoGenerateMatches(week.id)}
                  icon={RotateCcw}
                  variant="secondary"
                  size="sm"
                >
                  Auto-Generate
                </Button>
                
                <Button
                  onClick={() => {
                    setEditingMatch({ ...week.matches[0], week_id: week.id } as any);
                    setShowMatchForm(true);
                  }}
                  icon={Plus}
                  variant="success"
                  size="sm"
                >
                  Add Match
                </Button>
                
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDeleteWeek(week.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
              
              {expandedWeek === week.id && (
                <div className="mt-6 space-y-4">
                  {week.matches.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p>No matches scheduled for this week</p>
                      <p className="text-sm">Click "Auto-Generate" or "Add Match" to create matches</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {week.matches.map((match) => (
                        <Card key={match.id} variant="outlined">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <StatusBadge status={match.status === 'scheduled' ? 'pending' : match.status === 'in_progress' ? 'in_progress' : 'completed'} />
                              
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-brand-black">{match.team1_name}</span>
                                <span className="text-neutral-500">vs</span>
                                <span className="font-medium text-brand-black">{match.team2_name}</span>
                              </div>
                              
                              {match.status === 'completed' && (
                                <div className="flex items-center space-x-2 text-sm">
                                  <span className="font-medium">{match.team1_score}</span>
                                  <span className="text-neutral-500">-</span>
                                  <span className="font-medium">{match.team2_score}</span>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteMatch(week.id, match.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

      {/* Create Week Modal */}
      <FormDialog
        open={showCreateWeekForm}
        onClose={() => {
          setShowCreateWeekForm(false);
          setWeekForm({ week_number: 1, start_date: '', end_date: '', course_id: 0, course_name: '' });
        }}
        onSubmit={(e) => { e.preventDefault(); handleCreateWeek(); }}
        title="Create Week"
        submitText="Create Week"
        loading={isSubmitting}
      >
        <div className="space-y-4">
          <Input
            label="Week Number"
            type="number"
            min="1"
            value={weekForm.week_number}
            onChange={(e) => setWeekForm(prev => ({ ...prev, week_number: parseInt(e.target.value) }))}
          />

          <Input
            label="Start Date"
            type="date"
            value={weekForm.start_date}
            onChange={(e) => setWeekForm(prev => ({ ...prev, start_date: e.target.value }))}
            error={formErrors.start_date}
            required
          />

          <Input
            label="End Date"
            type="date"
            value={weekForm.end_date}
            onChange={(e) => setWeekForm(prev => ({ ...prev, end_date: e.target.value }))}
            error={formErrors.end_date}
            required
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Course <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCourseSearch(true)}
              className="w-full px-4 py-2 text-left border border-neutral-300 rounded-lg hover:border-brand-neon-green focus:ring-2 focus:ring-brand-neon-green focus:border-transparent transition-colors"
            >
              {weekForm.course_name || (
                <span className="text-neutral-400">Click to search courses...</span>
              )}
            </button>
            {formErrors.course_id && (
              <p className="mt-1 text-sm text-red-600">{formErrors.course_id}</p>
            )}
          </div>
        </div>
      </FormDialog>

      {/* Create Match Modal */}
      <FormDialog
        open={showMatchForm}
        onClose={() => {
          setShowMatchForm(false);
          setEditingMatch(null);
        }}
        onSubmit={(e) => { e.preventDefault(); handleCreateMatch(); }}
        title="Create Match"
        submitText="Create Match"
        loading={isSubmitting}
      >
        <div className="space-y-4">
          <Select
            label="Division"
            value={matchForm.division_id}
            onChange={(e) => setMatchForm(prev => ({ ...prev, division_id: parseInt(e.target.value) }))}
            options={[
              { value: 0, label: 'Select division...' },
              ...divisions.map((division) => ({
                value: division.id,
                label: division.name
              }))
            ]}
            error={formErrors.division_id}
            required
          />

          <Select
            label="Team 1"
            value={matchForm.team1_id}
            onChange={(e) => setMatchForm(prev => ({ ...prev, team1_id: parseInt(e.target.value) }))}
            options={[
              { value: 0, label: 'Select team...' },
              ...(matchForm.division_id ? divisions
                .find(d => d.id === matchForm.division_id)
                ?.teams.map((team) => ({
                  value: team.id,
                  label: team.name
                })) || [] : [])
            ]}
            error={formErrors.team1_id}
            required
            disabled={!matchForm.division_id}
          />

          <Select
            label="Team 2"
            value={matchForm.team2_id}
            onChange={(e) => setMatchForm(prev => ({ ...prev, team2_id: parseInt(e.target.value) }))}
            options={[
              { value: 0, label: 'Select team...' },
              ...(matchForm.division_id ? divisions
                .find(d => d.id === matchForm.division_id)
                ?.teams.filter(team => team.id !== matchForm.team1_id)
                .map((team) => ({
                  value: team.id,
                  label: team.name
                })) || [] : [])
            ]}
            error={formErrors.team2_id}
            required
            disabled={!matchForm.division_id}
          />
        </div>
      </FormDialog>

      {/* Course Search Modal */}
      {showCourseSearch && (
        <SimulatorCourseSearch
          onCourseSelect={(course) => {
            setWeekForm(prev => ({
              ...prev,
              course_id: course.id,
              course_name: course.name
            }));
            setShowCourseSearch(false);
          }}
          onClose={() => setShowCourseSearch(false)}
          selectedCourseId={weekForm.course_id}
        />
      )}
    </div>
  );
};

export default LeagueScheduleBuilder;
