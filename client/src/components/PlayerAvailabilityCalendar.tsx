import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Save,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, startOfDay, setHours, setMinutes, isSameDay } from 'date-fns';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { submitTeamAvailability, getTeamAvailability, getLeagueSchedule, getLeague, getLeagueTeams } from '../services/api';
import { CalendarStyles } from './ui/CalendarStyles';

interface TimeSlot {
  start: Date;
  end: Date;
}

interface AvailabilityEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface Week {
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  is_current_week: boolean;
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
  const navigate = useNavigate();
  const [availableWeeks, setAvailableWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [initialSlots, setInitialSlots] = useState<TimeSlot[]>([]); // Track initial state for comparison
  const [events, setEvents] = useState<AvailabilityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showApplyToAllModal, setShowApplyToAllModal] = useState(false);
  const [pendingTimeSlots, setPendingTimeSlots] = useState<any[]>([]);
  const [leagueName, setLeagueName] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');

  useEffect(() => {
    if (teamId && leagueId) {
      loadAvailableWeeks(leagueId);
      loadLeagueAndTeamInfo();
    }
  }, [teamId, leagueId]);

  useEffect(() => {
    if (selectedWeek && teamId) {
      loadCurrentAvailability();
    }
  }, [selectedWeek, teamId]);

  const loadLeagueAndTeamInfo = async () => {
    try {
      // Load league info
      const leagueResponse = await getLeague(leagueId);
      setLeagueName(leagueResponse.data.name || 'League');

      // Load team info
      const teamsResponse = await getLeagueTeams(leagueId);
      const team = teamsResponse.data.find((t: any) => t.id === teamId);
      if (team) {
        setTeamName(team.name || 'Team');
      }
    } catch (error) {
      console.error('Error loading league/team info:', error);
    }
  };

  useEffect(() => {
    // Update events when selected slots change
    const newEvents: AvailabilityEvent[] = selectedSlots.map((slot, index) => ({
      id: `slot-${index}`,
      title: '', // Empty title to save space on mobile
      start: slot.start,
      end: slot.end
    }));
    setEvents(newEvents);
  }, [selectedSlots]);

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

      console.log('Loaded availability data:', availability);

      if (availability && availability.length > 0) {
        const userAvail = availability.find((a: any) =>
          a.user_id === user?.member_id || a.user_member_id === user?.member_id
        );

        console.log('User availability:', userAvail);

        if (userAvail && userAvail.time_slots) {
          // Parse time slots from database (handle both string and object formats)
          let timeSlotsData = userAvail.time_slots;
          if (typeof timeSlotsData === 'string') {
            timeSlotsData = JSON.parse(timeSlotsData);
          }

          console.log('Parsed time slots:', timeSlotsData);

          // Get the calendar week start once (Sunday of the week containing the league week start)
          const leagueWeekStart = new Date(selectedWeek.week_start_date);
          const calendarWeekStart = startOfWeek(leagueWeekStart, { weekStartsOn: 0 }); // 0 = Sunday
          console.log('League week start:', leagueWeekStart);
          console.log('Calendar week start (Sunday):', calendarWeekStart);

          const slots: TimeSlot[] = timeSlotsData.map((slot: any) => {
            // slot format: { day: "Monday", start_time: "18:00", end_time: "21:00" }
            const dayOffset = getDayOffset(slot.day);
            const slotDate = addDays(calendarWeekStart, dayOffset);

            const [startHour, startMin] = slot.start_time.split(':').map(Number);
            const [endHour, endMin] = slot.end_time.split(':').map(Number);

            const start = setMinutes(setHours(slotDate, startHour), startMin);
            const end = setMinutes(setHours(slotDate, endHour), endMin);

            console.log(`Slot: ${slot.day} ${slot.start_time}-${slot.end_time} -> ${start.toLocaleString()}`);

            return { start, end };
          });

          console.log('Converted slots to Date objects:', slots);
          setSelectedSlots(slots);
          setInitialSlots(slots); // Track initial state for change detection
        } else {
          setSelectedSlots([]);
          setInitialSlots([]);
        }
      } else {
        setSelectedSlots([]);
        setInitialSlots([]);
      }
    } catch (error: any) {
      console.error('Error loading current availability:', error);
      setSelectedSlots([]);
      setInitialSlots([]);
    }
  };

  const getDayOffset = (dayName: string): number => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.indexOf(dayName);
  };

  const getDayName = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Check if there are unsaved changes
  const hasChanges = (): boolean => {
    if (selectedSlots.length !== initialSlots.length) return true;

    // Normalize slots to compare (day + time string)
    const normalize = (slot: TimeSlot) => ({
      day: getDayName(slot.start),
      start: format(slot.start, 'HH:mm'),
      end: format(slot.end, 'HH:mm')
    });

    const currentNormalized = selectedSlots.map(normalize).sort((a, b) =>
      a.day.localeCompare(b.day) || a.start.localeCompare(b.start)
    );
    const initialNormalized = initialSlots.map(normalize).sort((a, b) =>
      a.day.localeCompare(b.day) || a.start.localeCompare(b.start)
    );

    return JSON.stringify(currentNormalized) !== JSON.stringify(initialNormalized);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const { start, end } = slotInfo;

    // Check if this slot overlaps with any existing slot
    const overlapping = selectedSlots.find(slot =>
      isSameDay(slot.start, start) &&
      ((start >= slot.start && start < slot.end) ||
       (end > slot.start && end <= slot.end) ||
       (start <= slot.start && end >= slot.end))
    );

    if (overlapping) {
      // If slot exists, remove it (toggle off)
      setSelectedSlots(prev => prev.filter(slot => slot !== overlapping));
    } else {
      // Add new slot
      setSelectedSlots(prev => [...prev, { start, end }]);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all selected time slots?')) {
      setSelectedSlots([]);
      toast.info('All time slots cleared');
    }
  };

  const handleSubmit = async () => {
    if (!selectedWeek || !teamId) return;

    // Convert time slots to API format
    const timeSlots = selectedSlots.map(slot => ({
      day: getDayName(slot.start),
      start_time: format(slot.start, 'HH:mm'),
      end_time: format(slot.end, 'HH:mm')
    }));

    // Check if this is Week 1 - always show modal for Week 1 saves
    const isWeekOne = selectedWeek.week_number === 1;

    if (isWeekOne && timeSlots.length > 0) {
      // Show modal asking if they want to apply to all weeks
      setPendingTimeSlots(timeSlots);
      setShowApplyToAllModal(true);
      return;
    }

    // Regular save for single week
    await saveAvailability(timeSlots, selectedWeek.week_number);
  };

  const saveAvailability = async (timeSlots: any[], weekNumber: number) => {
    setSubmitting(true);
    try {
      await submitTeamAvailability(teamId, {
        league_id: leagueId,
        week_number: weekNumber,
        is_available: timeSlots.length > 0,
        availability_notes: '',
        time_slots: timeSlots
      });

      // Update initial state after successful save
      setInitialSlots([...selectedSlots]);
      toast.success('Availability saved successfully!');
    } catch (error: any) {
      console.error('Error submitting availability:', error);
      toast.error(error.response?.data?.error || 'Failed to save availability');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyToAllWeeks = async () => {
    setShowApplyToAllModal(false);
    setSubmitting(true);

    try {
      // Save to all weeks
      const savePromises = availableWeeks.map(week =>
        submitTeamAvailability(teamId, {
          league_id: leagueId,
          week_number: week.week_number,
          is_available: pendingTimeSlots.length > 0,
          availability_notes: '',
          time_slots: pendingTimeSlots
        })
      );

      await Promise.all(savePromises);

      // Update initial state after successful save
      setInitialSlots([...selectedSlots]);
      toast.success(`Availability saved for all ${availableWeeks.length} weeks!`);
    } catch (error: any) {
      console.error('Error applying to all weeks:', error);
      toast.error(error.response?.data?.error || 'Failed to save availability');
    } finally {
      setSubmitting(false);
      setPendingTimeSlots([]);
    }
  };

  const handleSaveWeekOne = async () => {
    setShowApplyToAllModal(false);
    await saveAvailability(pendingTimeSlots, 1);
    setPendingTimeSlots([]);
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

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: '#10B981',
        borderColor: '#059669',
        color: '#ffffff',
        borderRadius: '4px',
        opacity: 0.9,
        border: '2px solid'
      }
    };
  };

  // Custom calendar components (Google Calendar style)
  const components = {
    event: (props: any) => {
      return (
        <div
          className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-green-600 transition-colors"
          title="Click to remove"
        >
          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-white drop-shadow-md" />
        </div>
      );
    },
    header: ({ date }: any) => {
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const dayLetter = format(date, 'EEEEE'); // Single letter day
      const dayNumber = format(date, 'd');

      return (
        <div style={{ textAlign: 'center' }}>
          <div className="day-letter">{dayLetter}</div>
          <div className={`day-number ${isToday ? 'today' : ''}`}>
            {dayNumber}
          </div>
        </div>
      );
    },
    toolbar: () => null, // Hide the default toolbar since we have custom week navigation
    timeGutterHeader: () => <div className="text-[10px] text-gray-400"></div>,
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

  // Calculate calendar date range for the selected week
  // Calendar displays weeks starting on Sunday, so we need to find the Sunday that contains the week_start_date
  const leagueWeekStart = new Date(selectedWeek.week_start_date);
  const calendarWeekStart = startOfWeek(leagueWeekStart, { weekStartsOn: 0 }); // 0 = Sunday

  return (
    <div className="w-full sm:max-w-6xl sm:mx-auto relative pb-0 sm:pb-6">
      {/* Mobile-optimized CSS for calendar */}
      <CalendarStyles />

      {/* Compact Mobile Header */}
      <div className="sm:hidden bg-brand-dark-green text-white px-2 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate(`/player/team/${teamId}/${leagueId}`)}
            className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center justify-center px-2">
            <Calendar className="w-5 h-5 mr-2" />
            <span className="text-base font-semibold">Availability</span>
          </div>
          <button
            onClick={() => loadAvailableWeeks(leagueId)}
            className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {(leagueName || teamName) && (
          <div className="text-center text-xs text-white/80">
            {teamName} • {leagueName}
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:block bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-xl shadow-md mb-4 sm:mb-6 p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <button
                onClick={() => navigate(`/player/team/${teamId}/${leagueId}`)}
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
                title="Back to Team Page"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center">
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 mr-2" />
                  Availability Calendar
                </h1>
                {(leagueName || teamName) && (
                  <p className="text-white/80 mt-1 text-sm font-medium">
                    {teamName} • {leagueName}
                  </p>
                )}
              </div>
            </div>
            <p className="text-white/90 text-sm sm:text-base">
              Click empty slots to add availability • Click green blocks to remove
            </p>
          </div>
          <button
            onClick={() => loadAvailableWeeks(leagueId)}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-lg transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Week Selection */}
      <div className="bg-white shadow-none sm:shadow-md border-0 sm:border border-neutral-200 rounded-none sm:rounded-xl p-3 sm:p-6 mb-0 sm:mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            disabled={getCurrentWeekIndex() === 0}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-semibold">Week {selectedWeek.week_number}</h3>
            <p className="text-xs sm:text-sm text-gray-600">
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

      {/* Action Buttons */}
      <div className="bg-white shadow-none sm:shadow-md border-0 sm:border border-neutral-200 rounded-none sm:rounded-xl px-3 sm:px-6 py-3 mb-0 sm:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start space-x-4 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs sm:text-sm">{selectedSlots.length} slot(s)</span>
            </div>
            {hasChanges() && (
              <span className="text-orange-600 font-medium text-xs sm:text-sm">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleClearAll}
              disabled={selectedSlots.length === 0 || submitting}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear All</span>
              <span className="sm:hidden">Clear</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasChanges() || submitting}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 bg-brand-neon-green text-brand-black hover:bg-green-400 text-sm font-medium"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white shadow-none sm:shadow-md rounded-none sm:rounded-xl overflow-hidden">
        <div className="h-[calc(100vh-280px)] sm:h-[600px] relative">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={[Views.WEEK]}
            defaultView={Views.WEEK}
            view={Views.WEEK}
            date={calendarWeekStart}
            onNavigate={() => {}} // Prevent navigation, we control week selection above
            selectable
            onSelectSlot={handleSelectSlot}
            eventPropGetter={eventStyleGetter}
            components={components}
            step={30}
            timeslots={2}
            min={new Date(2024, 0, 1, 7, 0)} // 7 AM
            max={new Date(2024, 0, 1, 23, 0)} // 11 PM
            formats={{
              timeGutterFormat: (date: Date) => {
                const hour = date.getHours();
                const minute = date.getMinutes();
                if (minute !== 0) return '';
                const period = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                return `${displayHour} ${period}`;
              }
            }}
            toolbar={true}
            popup
            longPressThreshold={0}
          />
        </div>
      </div>

      {/* Modal for Apply to All Weeks */}
      {showApplyToAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-start space-x-3 mb-4">
              <Calendar className="w-6 h-6 text-brand-neon-green flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Apply to All Weeks?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Would you like to use this availability for all {availableWeeks.length} weeks in the season?
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSaveWeekOne}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
              >
                Just Week 1
              </button>
              <button
                onClick={handleApplyToAllWeeks}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 font-medium"
              >
                {submitting ? 'Applying...' : `Apply to All ${availableWeeks.length} Weeks`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerAvailabilityCalendar;
