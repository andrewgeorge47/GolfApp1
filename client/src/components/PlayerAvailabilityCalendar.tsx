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
import { submitTeamAvailability, getTeamAvailability, getLeagueSchedule } from '../services/api';

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

interface PlayerAvailabilityCalendarProps {
  teamId: number;
  leagueId: number;
}

const PlayerAvailabilityCalendar: React.FC<PlayerAvailabilityCalendarProps> = ({ teamId, leagueId }) => {
  const { user } = useAuth();
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
    if (teamId && leagueId) {
      loadAvailableWeeks(leagueId);
    }
  }, [teamId, leagueId]);

  useEffect(() => {
    if (selectedWeek && teamId) {
      loadCurrentAvailability();
      generateAvailabilityEvents();
    }
  }, [selectedWeek, teamId]);

  const loadAvailableWeeks = async (leagueId: number) => {
    setLoading(true);
    try {
      const response = await getLeagueSchedule(leagueId);
      const scheduleData = response.data;

      const weeks: Week[] = scheduleData.map((week: any) => ({
        week_number: week.week_number,
        week_start_date: week.week_start_date,
        week_end_date: week.week_end_date,
        is_current_week: week.status === 'active'
      }));

      setAvailableWeeks(weeks);

      // Select current week or first week
      const currentWeek = weeks.find(w => w.is_current_week) || weeks[0];
      if (currentWeek) {
        setSelectedWeek(currentWeek);
      }
    } catch (error: any) {
      console.error('Error loading available weeks:', error);
      toast.error(error.response?.data?.error || 'Failed to load weeks');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentAvailability = async () => {
    if (!selectedWeek || !teamId) return;

    try {
      const response = await getTeamAvailability(teamId, selectedWeek.week_number, leagueId);
      const availability = response.data;

      if (availability && availability.length > 0) {
        const userAvail = availability.find((a: any) => a.user_id === user?.member_id);
        if (userAvail) {
          setCurrentAvailability({
            is_available: userAvail.is_available,
            availability_notes: userAvail.availability_notes || '',
            last_updated: userAvail.updated_at
          });
          return;
        }
      }

      // No availability set yet
      setCurrentAvailability({
        is_available: true,
        availability_notes: '',
        last_updated: undefined
      });
    } catch (error: any) {
      console.error('Error loading current availability:', error);
      // Default to available if not set
      setCurrentAvailability({
        is_available: true,
        availability_notes: '',
        last_updated: undefined
      });
    }
  };

  const handleSubmitAvailability = async (isAvailable: boolean, notes: string) => {
    if (!selectedWeek || !teamId) return;

    setSubmitting(true);
    try {
      await submitTeamAvailability(teamId, {
        league_id: leagueId,
        week_number: selectedWeek.week_number,
        is_available: isAvailable,
        availability_notes: notes
      });

      toast.success('Availability updated successfully');
      await loadCurrentAvailability();
    } catch (error: any) {
      console.error('Error submitting availability:', error);
      toast.error(error.response?.data?.error || 'Failed to update availability');
    } finally {
      setSubmitting(false);
    }
  };

  const generateAvailabilityEvents = () => {
    if (!selectedWeek) return;

    const events: AvailabilityEvent[] = [];
    const startDate = new Date(selectedWeek.week_start_date);
    const endDate = new Date(selectedWeek.week_end_date);

    // Create an event for the selected week
    events.push({
      id: `week-${selectedWeek.week_number}`,
      title: currentAvailability?.is_available ? 'Available' : 'Unavailable',
      start: startDate,
      end: endDate,
      isAvailable: currentAvailability?.is_available || false,
      notes: currentAvailability?.availability_notes,
      weekNumber: selectedWeek.week_number
    });

    setEvents(events);
  };

  const selectWeek = (week: Week) => {
    setSelectedWeek(week);
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

  if (!selectedWeek) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Available</h3>
        <p className="text-gray-600">No schedule weeks found for this league.</p>
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
            <p className="text-neutral-600">Mark your availability for Week {selectedWeek.week_number}</p>
          </div>
        </div>

        <button
          onClick={() => loadAvailableWeeks(leagueId)}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Week Selection */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            disabled={getCurrentWeekIndex() === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Week {selectedWeek.week_number}</h3>
            <p className="text-sm text-gray-600">
              {new Date(selectedWeek.week_start_date).toLocaleDateString()} -{' '}
              {new Date(selectedWeek.week_end_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={goToNextWeek}
            disabled={getCurrentWeekIndex() === availableWeeks.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Availability Status */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Your Availability</h3>
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => handleSubmitAvailability(true, currentAvailability?.availability_notes || '')}
            disabled={submitting}
            className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
              currentAvailability?.is_available
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">Available</span>
            </div>
          </button>
          <button
            onClick={() => handleSubmitAvailability(false, '')}
            disabled={submitting}
            className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
              currentAvailability?.is_available === false
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium">Unavailable</span>
            </div>
          </button>
        </div>
        {currentAvailability?.last_updated && (
          <p className="text-sm text-gray-500">
            Last updated: {new Date(currentAvailability.last_updated).toLocaleString()}
          </p>
        )}
      </div>

      {/* Events Display */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Schedule Events</h3>
        <div className="space-y-2">
          {events.map(event => (
            <div
              key={event.id}
              className={`p-3 rounded-lg ${
                event.isAvailable ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{event.title}</span>
                <span className="text-sm text-gray-600">
                  {event.start.toLocaleString()} - {event.end.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-gray-500 text-center py-4">No events for this week</p>
          )}
        </div>
      </div>

      {/* Submit Button - Kept for compatibility but main action is above */}
      {submitting && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-neon-green"></div>
        </div>
      )}
    </div>
  );
};

export default PlayerAvailabilityCalendar;
