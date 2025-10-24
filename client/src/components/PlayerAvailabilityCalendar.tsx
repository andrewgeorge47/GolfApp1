import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Save,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  MapPin
} from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
import 'react-big-calendar/lib/css/react-big-calendar.css';

interface AvailabilityEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAvailable: boolean;
  notes?: string;
  weekNumber: number;
}

interface Week {
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  is_current_week: boolean;
}

interface Team {
  id: number;
  name: string;
  league_id: number;
}

interface AvailabilityFormData {
  league_id: number;
  week_number: number;
  is_available: boolean;
  availability_notes: string;
}

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const PlayerAvailabilityCalendar: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [events, setEvents] = useState<AvailabilityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentAvailability, setCurrentAvailability] = useState<{
    is_available: boolean;
    availability_notes: string;
    last_updated?: string;
  } | null>(null);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    loadUserTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadAvailableWeeks(selectedTeam.league_id);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedWeek) {
      loadCurrentAvailability();
      generateAvailabilityEvents();
    }
  }, [selectedWeek, selectedTeam]);

  const loadUserTeams = async () => {
    setLoading(true);
    try {
      // Mock data for preview
      const mockTeams: Team[] = [
        {
          id: 1,
          name: "Team Alpha",
          league_id: 1
        },
        {
          id: 2,
          name: "Team Beta",
          league_id: 2
        }
      ];
      
      setTeams(mockTeams);
      if (mockTeams.length > 0) {
        setSelectedTeam(mockTeams[0]);
      }
    } catch (error) {
      console.error('Error loading user teams:', error);
      toast.error('Failed to load your teams');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableWeeks = async (leagueId: number) => {
    try {
      // Mock data for preview
      const mockWeeks: Week[] = [
        {
          week_number: 6,
          week_start_date: "2025-01-08",
          week_end_date: "2025-01-14",
          is_current_week: false
        },
        {
          week_number: 7,
          week_start_date: "2025-01-15",
          week_end_date: "2025-01-21",
          is_current_week: false
        },
        {
          week_number: 8,
          week_start_date: "2025-01-22",
          week_end_date: "2025-01-28",
          is_current_week: true
        },
        {
          week_number: 9,
          week_start_date: "2025-01-29",
          week_end_date: "2025-02-04",
          is_current_week: false
        },
        {
          week_number: 10,
          week_start_date: "2025-02-05",
          week_end_date: "2025-02-11",
          is_current_week: false
        }
      ];
      
      setAvailableWeeks(mockWeeks);
      const currentWeek = mockWeeks.find(week => week.is_current_week);
      if (currentWeek) {
        setSelectedWeek(currentWeek);
      } else if (mockWeeks.length > 0) {
        setSelectedWeek(mockWeeks[0]);
      }
    } catch (error) {
      console.error('Error loading available weeks:', error);
      toast.error('Failed to load available weeks');
    }
  };

  const loadCurrentAvailability = async () => {
    if (!selectedTeam || !selectedWeek) return;

    try {
      // Mock data for preview - simulate some existing availability
      const mockAvailability = {
        is_available: selectedWeek.week_number === 8, // Available for current week
        availability_notes: selectedWeek.week_number === 8 ? "Available Tuesday and Thursday evenings" : "",
        last_updated: "2025-01-20T10:30:00Z"
      };
      
      setCurrentAvailability(mockAvailability);
    } catch (error) {
      console.error('Error loading current availability:', error);
    }
  };

  const generateAvailabilityEvents = () => {
    if (!selectedWeek) return;

    const weekStart = new Date(selectedWeek.week_start_date);
    const weekEnd = new Date(selectedWeek.week_end_date);
    
    // Generate time slots for each day of the week
    const timeSlots: AvailabilityEvent[] = [];
    
    for (let day = 0; day < 7; day++) {
      const currentDay = addDays(weekStart, day);
      
      // Generate morning slots (6 AM - 12 PM)
      for (let hour = 6; hour < 12; hour++) {
        const start = new Date(currentDay);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1, 0, 0, 0);
        
        timeSlots.push({
          id: `morning-${day}-${hour}`,
          title: 'Available',
          start,
          end,
          isAvailable: false,
          weekNumber: selectedWeek.week_number
        });
      }
      
      // Generate afternoon slots (12 PM - 6 PM)
      for (let hour = 12; hour < 18; hour++) {
        const start = new Date(currentDay);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1, 0, 0, 0);
        
        timeSlots.push({
          id: `afternoon-${day}-${hour}`,
          title: 'Available',
          start,
          end,
          isAvailable: false,
          weekNumber: selectedWeek.week_number
        });
      }
      
      // Generate evening slots (6 PM - 10 PM)
      for (let hour = 18; hour < 22; hour++) {
        const start = new Date(currentDay);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1, 0, 0, 0);
        
        timeSlots.push({
          id: `evening-${day}-${hour}`,
          title: 'Available',
          start,
          end,
          isAvailable: false,
          weekNumber: selectedWeek.week_number
        });
      }
    }
    
    setEvents(timeSlots);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const eventId = events.find(event => 
      event.start.getTime() === start.getTime() && event.end.getTime() === end.getTime()
    )?.id;
    
    if (eventId) {
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, isAvailable: !event.isAvailable }
            : event
        )
      );
    }
  };

  const handleEventClick = (event: AvailabilityEvent) => {
    setEvents(prevEvents => 
      prevEvents.map(e => 
        e.id === event.id 
          ? { ...e, isAvailable: !e.isAvailable }
          : e
      )
    );
  };

  const eventStyleGetter = (event: AvailabilityEvent) => {
    const style: React.CSSProperties = {
      backgroundColor: event.isAvailable ? '#10B981' : '#E5E7EB',
      color: event.isAvailable ? 'white' : '#6B7280',
      borderRadius: '4px',
      border: 'none',
      padding: '2px 4px',
      fontSize: '10px',
      fontWeight: '500',
      cursor: 'pointer',
    };
    
    return { style };
  };

  const components = {
    event: (props: any) => {
      const event = props.event as AvailabilityEvent;
      return (
        <div className="flex items-center justify-center w-full h-full">
          {event.isAvailable ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
        </div>
      );
    },
  };

  const handleSubmit = async () => {
    if (!selectedTeam || !selectedWeek) {
      toast.error('Please select a team and week');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate availability from events
      const availableSlots = events.filter(event => event.isAvailable);
      const isAvailable = availableSlots.length > 0;
      const notes = availableSlots.length > 0 
        ? `Available for ${availableSlots.length} time slots this week`
        : 'Not available this week';

      // Mock submission for preview
      const mockResult = {
        is_available: isAvailable,
        availability_notes: notes,
        updated_at: new Date().toISOString()
      };
      
      setCurrentAvailability({
        is_available: mockResult.is_available,
        availability_notes: mockResult.availability_notes,
        last_updated: mockResult.updated_at
      });

      toast.success('Availability submitted successfully!');
    } catch (error) {
      console.error('Error submitting availability:', error);
      toast.error('Failed to submit availability. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const getCurrentWeekIndex = () => {
    return availableWeeks.findIndex(week => week.week_number === selectedWeek?.week_number);
  };

  const goToPreviousWeek = () => {
    const currentIndex = getCurrentWeekIndex();
    if (currentIndex > 0) {
      setSelectedWeek(availableWeeks[currentIndex - 1]);
    }
  };

  const goToNextWeek = () => {
    const currentIndex = getCurrentWeekIndex();
    if (currentIndex < availableWeeks.length - 1) {
      setSelectedWeek(availableWeeks[currentIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Found</h3>
        <p className="text-gray-600">You are not currently a member of any teams.</p>
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
            <h1 className="text-2xl font-bold text-brand-black">Availability Calendar</h1>
            <p className="text-neutral-600">Drag and click to mark your available times</p>
          </div>
        </div>
        
        <button 
          onClick={loadUserTeams}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Team Selection */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-brand-black mb-4">Select Team</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                selectedTeam?.id === team.id
                  ? 'border-brand-neon-green bg-green-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <h4 className="font-semibold text-brand-black">{team.name}</h4>
              <p className="text-sm text-neutral-600">League ID: {team.league_id}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Week Selection */}
      {selectedTeam && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-brand-black">Select Week</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousWeek}
                disabled={getCurrentWeekIndex() === 0}
                className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextWeek}
                disabled={getCurrentWeekIndex() === availableWeeks.length - 1}
                className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {selectedWeek && (
            <div className="text-center">
              <h4 className="text-xl font-semibold text-brand-black">
                Week {selectedWeek.week_number}
              </h4>
              <p className="text-lg text-neutral-600">
                {formatWeekRange(selectedWeek.week_start_date, selectedWeek.week_end_date)}
              </p>
              {selectedWeek.is_current_week && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-neon-green text-brand-black mt-2">
                  Current Week
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      {selectedTeam && selectedWeek && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-brand-black">Availability Calendar</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCalendarView('week')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  calendarView === 'week'
                    ? 'bg-brand-neon-green text-brand-black'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Week View
              </button>
              <button
                onClick={() => setCalendarView('month')}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  calendarView === 'month'
                    ? 'bg-brand-neon-green text-brand-black'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Month View
              </button>
            </div>
          </div>
          
          <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-gray-500" />
                <span>Not Available</span>
              </div>
              <div className="text-neutral-500">
                Click or drag to toggle availability
              </div>
            </div>
          </div>
          
          <div className="h-[600px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleEventClick}
              eventPropGetter={eventStyleGetter}
              components={components}
              step={60}
              timeslots={1}
              views={{ week: true, month: true }}
              defaultView={calendarView}
              view={calendarView}
              date={calendarDate}
              onNavigate={date => setCalendarDate(date)}
              min={new Date(0, 0, 0, 6, 0, 0)}
              max={new Date(0, 0, 0, 22, 0, 0)}
              toolbar={true}
              popup
            />
          </div>
        </div>
      )}

      {/* Current Status Display */}
      {currentAvailability && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-brand-black mb-4">Current Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                {currentAvailability.is_available ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  currentAvailability.is_available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentAvailability.is_available ? 'Available' : 'Not Available'}
                </span>
              </div>
              {currentAvailability.availability_notes && (
                <p className="text-sm text-neutral-500 mt-1">
                  {currentAvailability.availability_notes}
                </p>
              )}
            </div>
            {currentAvailability.last_updated && (
              <p className="text-xs text-neutral-400">
                Updated: {formatDate(currentAvailability.last_updated)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {selectedTeam && selectedWeek && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center space-x-2 px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Submit Availability'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerAvailabilityCalendar;
