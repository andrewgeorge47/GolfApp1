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

const LeagueScheduleBuilder: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [scheduleWeeks, setScheduleWeeks] = useState<ScheduleWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  
  // Week creation form state
  const [showCreateWeekForm, setShowCreateWeekForm] = useState(false);
  const [weekForm, setWeekForm] = useState({
    week_number: 1,
    start_date: '',
    end_date: '',
    course_id: 0
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
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Mock data for now
      const mockDivisions: Division[] = [
        {
          id: 1,
          name: 'Division A',
          teams: [
            { id: 1, name: 'Team Alpha', division_id: 1, captain_name: 'John Doe' },
            { id: 2, name: 'Team Beta', division_id: 1, captain_name: 'Jane Smith' },
            { id: 3, name: 'Team Gamma', division_id: 1, captain_name: 'Bob Johnson' },
            { id: 4, name: 'Team Delta', division_id: 1, captain_name: 'Alice Brown' }
          ]
        },
        {
          id: 2,
          name: 'Division B',
          teams: [
            { id: 5, name: 'Team Echo', division_id: 2, captain_name: 'Charlie Wilson' },
            { id: 6, name: 'Team Foxtrot', division_id: 2, captain_name: 'David Lee' },
            { id: 7, name: 'Team Golf', division_id: 2, captain_name: 'Emma Davis' },
            { id: 8, name: 'Team Hotel', division_id: 2, captain_name: 'Frank Miller' }
          ]
        }
      ];

      const mockCourses: Course[] = [
        { id: 1, name: 'Augusta National', location: 'Augusta, GA', par: 72 },
        { id: 2, name: 'Pebble Beach', location: 'Pebble Beach, CA', par: 72 },
        { id: 3, name: 'St. Andrews', location: 'St. Andrews, Scotland', par: 72 },
        { id: 4, name: 'TPC Sawgrass', location: 'Ponte Vedra Beach, FL', par: 72 }
      ];

      const mockScheduleWeeks: ScheduleWeek[] = [
        {
          id: 1,
          week_number: 1,
          start_date: '2024-03-01',
          end_date: '2024-03-07',
          course_id: 1,
          course_name: 'Augusta National',
          status: 'completed',
          matches: [
            {
              id: 1,
              team1_id: 1,
              team1_name: 'Team Alpha',
              team2_id: 2,
              team2_name: 'Team Beta',
              division_id: 1,
              week_id: 1,
              status: 'completed',
              team1_score: 2,
              team2_score: 1
            },
            {
              id: 2,
              team1_id: 3,
              team1_name: 'Team Gamma',
              team2_id: 4,
              team2_name: 'Team Delta',
              division_id: 1,
              week_id: 1,
              status: 'completed',
              team1_score: 1,
              team2_score: 2
            }
          ]
        },
        {
          id: 2,
          week_number: 2,
          start_date: '2024-03-08',
          end_date: '2024-03-14',
          course_id: 2,
          course_name: 'Pebble Beach',
          status: 'active',
          matches: [
            {
              id: 3,
              team1_id: 1,
              team1_name: 'Team Alpha',
              team2_id: 3,
              team2_name: 'Team Gamma',
              division_id: 1,
              week_id: 2,
              status: 'scheduled'
            },
            {
              id: 4,
              team1_id: 2,
              team1_name: 'Team Beta',
              team2_id: 4,
              team2_name: 'Team Delta',
              division_id: 1,
              week_id: 2,
              status: 'scheduled'
            }
          ]
        }
      ];

      setDivisions(mockDivisions);
      setCourses(mockCourses);
      setScheduleWeeks(mockScheduleWeeks);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
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

    setIsSubmitting(true);
    try {
      const course = courses.find(c => c.id === weekForm.course_id);
      if (!course) {
        toast.error('Selected course not found');
        return;
      }

      const newWeek: ScheduleWeek = {
        id: Date.now(), // Temporary ID
        week_number: weekForm.week_number,
        start_date: weekForm.start_date,
        end_date: weekForm.end_date,
        course_id: weekForm.course_id,
        course_name: course.name,
        status: 'scheduled',
        matches: []
      };

      setScheduleWeeks(prev => [...prev, newWeek]);
      setShowCreateWeekForm(false);
      setWeekForm({
        week_number: scheduleWeeks.length + 1,
        start_date: '',
        end_date: '',
        course_id: 0
      });
      toast.success('Week created successfully');
    } catch (error) {
      console.error('Error creating week:', error);
      toast.error('Failed to create week');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!validateMatchForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const team1 = divisions
        .find(d => d.id === matchForm.division_id)
        ?.teams.find(t => t.id === matchForm.team1_id);
      const team2 = divisions
        .find(d => d.id === matchForm.division_id)
        ?.teams.find(t => t.id === matchForm.team2_id);

      if (!team1 || !team2) {
        toast.error('Selected teams not found');
        return;
      }

      const newMatch: Match = {
        id: Date.now(), // Temporary ID
        team1_id: matchForm.team1_id,
        team1_name: team1.name,
        team2_id: matchForm.team2_id,
        team2_name: team2.name,
        division_id: matchForm.division_id,
        week_id: editingMatch?.week_id || 0,
        status: 'scheduled'
      };

      setScheduleWeeks(prev => 
        prev.map(week => 
          week.id === (editingMatch?.week_id || 0)
            ? { ...week, matches: [...week.matches, newMatch] }
            : week
        )
      );

      setShowMatchForm(false);
      setEditingMatch(null);
      setMatchForm({ team1_id: 0, team2_id: 0, division_id: 0 });
      toast.success('Match created successfully');
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWeek = async (weekId: number) => {
    if (!window.confirm('Are you sure you want to delete this week? This will also delete all matches in this week.')) {
      return;
    }

    try {
      setScheduleWeeks(prev => prev.filter(week => week.id !== weekId));
      toast.success('Week deleted successfully');
    } catch (error) {
      console.error('Error deleting week:', error);
      toast.error('Failed to delete week');
    }
  };

  const handleDeleteMatch = async (weekId: number, matchId: number) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }

    try {
      setScheduleWeeks(prev => 
        prev.map(week => 
          week.id === weekId
            ? { ...week, matches: week.matches.filter(match => match.id !== matchId) }
            : week
        )
      );
      toast.success('Match deleted successfully');
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  const handleAutoGenerateMatches = async (weekId: number) => {
    try {
      const week = scheduleWeeks.find(w => w.id === weekId);
      if (!week) return;

      // Clear existing matches for this week
      const updatedWeek: ScheduleWeek = { ...week, matches: [] };
      
      // Generate round-robin matches for each division
      divisions.forEach(division => {
        const teams = division.teams;
        for (let i = 0; i < teams.length; i += 2) {
          if (i + 1 < teams.length) {
            const newMatch: Match = {
              id: Date.now() + Math.random(), // Temporary ID
              team1_id: teams[i].id,
              team1_name: teams[i].name,
              team2_id: teams[i + 1].id,
              team2_name: teams[i + 1].name,
              division_id: division.id,
              week_id: weekId,
              status: 'scheduled'
            };
            updatedWeek.matches.push(newMatch);
          }
        }
      });

      setScheduleWeeks(prev => 
        prev.map(w => w.id === weekId ? updatedWeek : w)
      );
      
      toast.success('Matches auto-generated successfully');
    } catch (error) {
      console.error('Error auto-generating matches:', error);
      toast.error('Failed to auto-generate matches');
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
        onClose={() => setShowCreateWeekForm(false)}
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

          <Select
            label="Course"
            value={weekForm.course_id}
            onChange={(e) => setWeekForm(prev => ({ ...prev, course_id: parseInt(e.target.value) }))}
            options={[
              { value: 0, label: 'Select course...' },
              ...courses.map((course) => ({
                value: course.id,
                label: `${course.name} ${course.location && `(${course.location})`}`
              }))
            ]}
            error={formErrors.course_id}
            required
          />
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
    </div>
  );
};

export default LeagueScheduleBuilder;
