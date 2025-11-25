import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, addDays, setHours, setMinutes } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../AuthContext';
import { User as UserIcon, Group as GroupIcon, Plus as PlusIcon, Edit3, X, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './ui/Modal';
import { Input } from './ui/Input';
import { SimpleLoading } from './ui/SimpleLoading';
import { CalendarStyles } from './ui/CalendarStyles';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Extend window for calendar navigation
declare global {
  interface Window {
    calendarNavigate?: (action: string, newDate?: Date) => void;
  }
}

interface Booking {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  date: string;
  start_time: string;
  end_time: string;
  type: 'solo' | 'social';
  participants?: number[];
  participantNames?: string[];
  bay?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  booking: Booking;
  isOwnBooking: boolean;
  canJoin: boolean;
}

interface BookingSettings {
  id: number;
  club_name: string;
  number_of_bays: number;
  opening_time: string;
  closing_time: string;
  days_of_operation: string;
  booking_duration_options: string;
  max_advance_booking_days: number;
  min_booking_duration: number;
  max_booking_duration: number;
  enabled: boolean;
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

const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Club name - can be made dynamic later for multi-club support
  const clubName = 'No. 5';

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Booking settings state
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [bookingType, setBookingType] = useState<'solo' | 'social'>('solo');
  const [selectedBay, setSelectedBay] = useState<number>(1);
  const [activeBay, setActiveBay] = useState<number>(1);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleSlot, setRescheduleSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [rescheduleType, setRescheduleType] = useState<'solo' | 'social'>('solo');
  const [rescheduleBay, setRescheduleBay] = useState<number>(1);
  const [calendarView, setCalendarView] = useState<View>(Views.DAY);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/simulator-bookings', {
        params: { club_name: clubName }
      });
      const bookingsData = response.data;
      console.log('Fetched bookings:', bookingsData);
      setAllBookings(bookingsData);
      
      // Get all unique participant IDs to fetch their names
      const participantIds = new Set<number>();
      bookingsData.forEach((booking: Booking) => {
        if (booking.participants) {
          booking.participants.forEach(id => participantIds.add(id));
        }
      });
      
      // Fetch participant names if there are any
      let participantNames: { [key: number]: string } = {};
      if (participantIds.size > 0) {
        try {
          const usersResponse = await api.get('/users');
          const users = usersResponse.data;
          users.forEach((user: any) => {
            participantNames[user.member_id] = `${user.first_name} ${user.last_name}`;
          });
        } catch (err) {
          console.error('Failed to fetch participant names:', err);
        }
      }
      
      // Store participant names for later use
      const bookingsWithNames = bookingsData.map((booking: Booking) => ({
        ...booking,
        participantNames: booking.participants?.map(id => participantNames[id] || `User ${id}`) || []
      }));
      
      setAllBookings(bookingsWithNames);
      updateEventsForActiveBay(bookingsWithNames);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateEventsForActiveBay = (bookingsData: Booking[]) => {
    // Filter bookings for the active bay
    const bayBookings = bookingsData.filter((booking: Booking) => booking.bay === activeBay);
    
    // Convert bookings to calendar events
    const calendarEvents: CalendarEvent[] = bayBookings.map((booking: Booking) => {
      console.log('Processing booking:', booking);
      
      // Parse date and time properly
      // Extract just the date part from the ISO timestamp
      const dateOnly = booking.date.split('T')[0];
      const startDate = new Date(`${dateOnly}T${booking.start_time}`);
      const endDate = new Date(`${dateOnly}T${booking.end_time}`);
      
      const isOwnBooking = user?.id === booking.user_id || user?.member_id === booking.user_id;
      const canJoin = booking.type === 'social' && 
                     !isOwnBooking && 
                     !booking.participants?.includes(user?.id || 0);
      
      const event = {
        id: booking.id.toString(),
        title: `${booking.first_name} ${booking.last_name} - ${booking.type} - Bay ${booking.bay || 1}`,
        start: startDate,
        end: endDate,
        booking: booking,
        isOwnBooking,
        canJoin,
      };
      
      console.log('Created event:', event);
      return event;
    });
    
    console.log('All calendar events:', calendarEvents);
    setEvents(calendarEvents);
  };

  const fetchBookingSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await api.get(`/club-booking-settings/${clubName}`);
      setBookingSettings(response.data);
    } catch (err: any) {
      console.error('Error fetching booking settings:', err);
      // Use default settings if not found
      setBookingSettings({
        id: 0,
        club_name: clubName,
        number_of_bays: 4,
        opening_time: '07:00',
        closing_time: '22:00',
        days_of_operation: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
        booking_duration_options: '30,60,90,120',
        max_advance_booking_days: 30,
        min_booking_duration: 30,
        max_booking_duration: 240,
        enabled: true,
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingSettings();
    fetchBookings();
  }, []);

  useEffect(() => {
    updateEventsForActiveBay(allBookings);
  }, [activeBay, allBookings]);

  // Debug reschedule dialog state
  useEffect(() => {
    if (isRescheduleDialogOpen && selectedEvent) {
      console.log('Reschedule dialog opened with:', { 
        rescheduleSlot, 
        selectedEvent: selectedEvent?.booking,
        rescheduleType,
        rescheduleBay 
      });
    }
  }, [isRescheduleDialogOpen, selectedEvent, rescheduleSlot, rescheduleType, rescheduleBay]);

  // Scroll to current day on mobile in week view
  useEffect(() => {
    if (window.innerWidth < 640 && calendarView === Views.WEEK) {
      // Small delay to ensure calendar is rendered
      const timer = setTimeout(() => {
        const currentDayIndex = new Date().getDay(); // 0 = Sunday, 6 = Saturday
        const calendarElement = document.querySelector('.rbc-time-content');

        if (calendarElement) {
          // Each day column is roughly 1/7 of the total width
          // Scroll to show current day in the center
          const scrollPosition = (currentDayIndex / 7) * calendarElement.scrollWidth - (window.innerWidth / 2);
          calendarElement.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [calendarDate, events, calendarView]); // Re-run when view changes

  // Helper function to check for booking conflicts
  const checkBookingConflict = (date: string, startTime: string, endTime: string, bay: number, excludeBookingId?: number) => {
    return allBookings.find((booking: Booking) => {
      // Skip the booking being rescheduled
      if (excludeBookingId && booking.id === excludeBookingId) return false;

      // Extract date part from booking.date (handles ISO format like "2025-11-21T00:00:00.000Z")
      const bookingDateOnly = booking.date.split('T')[0];
      if (bookingDateOnly !== date) return false;

      if (booking.bay !== bay) return false; // Only check conflicts in the same bay

      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;

      // Check for overlap
      return (
        (startTime >= bookingStart && startTime < bookingEnd) ||
        (endTime > bookingStart && endTime <= bookingEnd) ||
        (startTime <= bookingStart && endTime >= bookingEnd)
      );
    });
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    console.log('Slot selected:', { start, end });

    // If reschedule dialog is open, update the reschedule slot
    if (isRescheduleDialogOpen) {
      setRescheduleSlot({ start, end });
      setError(''); // Clear any previous errors
      return;
    }

    // Don't allow creating bookings when reschedule dialog is open
    if (isRescheduleDialogOpen) return;

    // Check if the selected time slot conflicts with existing bookings
    const selectedDate = format(start, 'yyyy-MM-dd');
    const selectedStart = format(start, 'HH:mm');
    const selectedEnd = format(end, 'HH:mm');

    console.log('Selected slot:', { selectedDate, selectedStart, selectedEnd });

    const conflictingBooking = checkBookingConflict(selectedDate, selectedStart, selectedEnd, activeBay);

    if (conflictingBooking) {
      setError(`This time slot is already booked by ${conflictingBooking.first_name} ${conflictingBooking.last_name} in Bay ${conflictingBooking.bay || 1}. Please choose a different time or bay.`);
      return;
    }

    setSelectedSlot({ start, end });
    setSelectedBay(activeBay); // Default to the active bay
    setIsCreateDialogOpen(true);
    setError(''); // Clear any previous errors
  };

  const handleQuickBookingClick = () => {
    // Open create dialog with default time slot (next available hour)
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const endTime = new Date(nextHour);
    endTime.setHours(nextHour.getHours() + 1, 0, 0, 0);

    setSelectedSlot({ start: nextHour, end: endTime });
    setSelectedBay(activeBay);
    setIsCreateDialogOpen(true);
    setError('');
  };

  const handleCreateBooking = async () => {
    if (!selectedSlot) return;

    const date = format(selectedSlot.start, 'yyyy-MM-dd');
    const start_time = format(selectedSlot.start, 'HH:mm');
    const end_time = format(selectedSlot.end, 'HH:mm');

    // Validate time range
    if (end_time <= start_time) {
      setError('End time must be after start time.');
      return;
    }

    // Check for conflicts client-side before submitting
    const conflictingBooking = checkBookingConflict(date, start_time, end_time, selectedBay);
    if (conflictingBooking) {
      setError(`This time slot is already booked by ${conflictingBooking.first_name} ${conflictingBooking.last_name} in Bay ${conflictingBooking.bay || 1}. Please choose a different time or bay.`);
      return;
    }

    try {
      await api.post('/simulator-bookings', {
        date,
        start_time,
        end_time,
        type: bookingType,
        bay: selectedBay,
        club_name: clubName,
      });

      setSuccess('Booking created successfully!');
      setIsCreateDialogOpen(false);
      setSelectedSlot(null);
      setError(''); // Clear any previous errors
      fetchBookings();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create booking';
      if (err.response?.status === 409) {
        setError(`Time slot already booked. Please choose a different time.`);
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleJoinBooking = async () => {
    if (!selectedEvent) return;
    
    try {
      await api.post(`/simulator-bookings/${selectedEvent.booking.id}/join`);
      setSuccess('You have joined the booking!');
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join booking');
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedEvent) return;
    
    try {
      await api.delete(`/simulator-bookings/${selectedEvent.booking.id}`);
      setSuccess('Booking cancelled successfully!');
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const handleRescheduleBooking = async () => {
    if (!selectedEvent || !rescheduleSlot) {
      setError('Please select a valid time slot for rescheduling.');
      return;
    }

    // Validate that end time is after start time
    if (rescheduleSlot.end <= rescheduleSlot.start) {
      setError('End time must be after start time.');
      return;
    }

    const date = format(rescheduleSlot.start, 'yyyy-MM-dd');
    const start_time = format(rescheduleSlot.start, 'HH:mm');
    const end_time = format(rescheduleSlot.end, 'HH:mm');

    // Check for conflicts client-side, excluding the current booking being rescheduled
    const conflictingBooking = checkBookingConflict(date, start_time, end_time, rescheduleBay, selectedEvent.booking.id);
    if (conflictingBooking) {
      setError(`This time slot is already booked by ${conflictingBooking.first_name} ${conflictingBooking.last_name} in Bay ${conflictingBooking.bay || 1}. Please choose a different time or bay.`);
      return;
    }

    try {
      console.log('Rescheduling booking:', {
        id: selectedEvent.booking.id,
        date,
        start_time,
        end_time,
        type: rescheduleType,
        bay: rescheduleBay,
      });

      await api.put(`/simulator-bookings/${selectedEvent.booking.id}`, {
        date,
        start_time,
        end_time,
        type: rescheduleType,
        bay: rescheduleBay,
      });

      setSuccess('Booking rescheduled successfully!');
      setIsRescheduleDialogOpen(false);
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
      setRescheduleSlot(null);
      setError(''); // Clear any previous errors
      fetchBookings();
    } catch (err: any) {
      console.error('Reschedule error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to reschedule booking';
      if (err.response?.status === 409) {
        setError(`Time slot already booked for Bay ${rescheduleBay}. Please choose a different time or bay.`);
      } else if (err.response?.status === 400) {
        setError('Invalid booking data. Please check your selection.');
      } else if (err.response?.status === 403) {
        setError('You can only reschedule your own bookings.');
      } else if (err.response?.status === 404) {
        setError('Booking not found. It may have been deleted.');
      } else {
        setError(errorMessage);
      }
    }
  };

  const openRescheduleDialog = () => {
    if (!selectedEvent) return;
    
    // Set current booking time as default
    // Handle different date formats and ensure proper parsing
    let dateOnly = selectedEvent.booking.date;
    if (dateOnly.includes('T')) {
      dateOnly = dateOnly.split('T')[0];
    }
    
    // Create dates with proper timezone handling and validation
    let startDate, endDate;
    
    try {
      // Ensure we have valid time strings
      const startTime = selectedEvent.booking.start_time || '09:00';
      const endTime = selectedEvent.booking.end_time || '10:00';
      
      startDate = new Date(`${dateOnly}T${startTime}:00`);
      endDate = new Date(`${dateOnly}T${endTime}:00`);
      
      // Validate the dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date created');
      }
      
      console.log('Opening reschedule dialog with dates:', {
        originalDate: selectedEvent.booking.date,
        dateOnly,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startTime: selectedEvent.booking.start_time,
        endTime: selectedEvent.booking.end_time
      });
    } catch (error) {
      console.error('Error creating dates for reschedule:', error);
      // Fallback to today's date with default times
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0);
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0);
      
      console.log('Using fallback dates:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
    }
    
    setRescheduleSlot({ start: startDate, end: endDate });
    setRescheduleType(selectedEvent.booking.type);
    setRescheduleBay(selectedEvent.booking.bay || activeBay);
    setIsRescheduleDialogOpen(true);
    setIsEventDialogOpen(false); // Close the event dialog
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let style: React.CSSProperties = {
      backgroundColor: event.booking.type === 'social' ? '#10B981' : '#3B82F6',
      color: 'white',
      borderRadius: '8px',
      border: 'none',
      padding: '4px 8px',
      fontSize: '12px',
      fontWeight: '500',
    };
    
    if (event.isOwnBooking) {
      style.border = '2px solid #F59E0B';
      style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }
    
    return { style };
  };

  const components = {
    event: (props: any) => {
      const event = props.event as CalendarEvent;
      return (
        <div className="flex items-center justify-between w-full h-full p-1">
          <div className="flex items-center min-w-0 flex-1">
            {event.booking.type === 'social' ? (
              <GroupIcon className="w-3 h-3 mr-1 flex-shrink-0" />
            ) : (
              <UserIcon className="w-3 h-3 mr-1 flex-shrink-0" />
            )}
            <span className="text-xs font-medium truncate">{event.booking.first_name}</span>
          </div>
          {event.canJoin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick(event);
              }}
              className="ml-1 p-1.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
              title="Join this social booking"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    },
    toolbar: (props: any) => {
      // Store navigation functions for floating toolbar
      window.calendarNavigate = props.onNavigate;

      // Only show date display in Day view
      if (calendarView === Views.DAY) {
        return (
          <div className="flex items-center justify-center p-3 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(calendarDate, 'EEEE, MMMM d, yyyy')}
            </h2>
          </div>
        );
      }

      // No toolbar in Week view (day headers are already visible)
      return null;
    },
    timeGutterHeader: () => <div className="text-[10px] text-gray-400"></div>,
    header: ({ date, label }: any) => {
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
  };

  return (
    <div className="w-full sm:max-w-6xl sm:mx-auto relative pb-0 sm:pb-6">
      {/* Mobile-optimized CSS for calendar */}
      <CalendarStyles />

      {/* Compact Mobile Header */}
      <div className="sm:hidden bg-brand-dark-green text-white px-2 py-3 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center px-2">
          <span className="text-base font-semibold">Booking {clubName}</span>
        </div>

        {bookingSettings && bookingSettings.number_of_bays > 1 ? (
          <div className="flex items-center gap-1.5 pr-2 flex-shrink-0">
            <span className="text-xs opacity-90">Bay</span>
            <div className="flex gap-1">
              {Array.from({ length: bookingSettings.number_of_bays }, (_, i) => i + 1).map((bay) => (
                <button
                  key={bay}
                  onClick={() => setActiveBay(bay)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    activeBay === bay
                      ? 'bg-white text-brand-dark-green'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {bay}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-10 flex-shrink-0"></div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:block bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-xl shadow-md mb-4 sm:mb-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center">
              <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
              Simulator Bay Booking
            </h1>
            <p className="text-white/90 mt-2 text-sm sm:text-base">
              {clubName} - Tap calendar to create bookings
            </p>
          </div>
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
            className="bg-white/10 text-white hover:bg-white/20 border-white/20 w-full sm:w-auto"
            size="lg"
          >
            Back
          </Button>
        </div>
      </div>

      {error && (
        <Card variant="outlined" className="mb-4 border-red-300 bg-red-50 rounded-none sm:rounded-xl mx-0">
          <CardContent className="py-3">
            <p className="text-red-800 text-sm sm:text-base">{error}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card variant="outlined" className="mb-4 border-green-300 bg-green-50 rounded-none sm:rounded-xl mx-0">
          <CardContent className="py-3">
            <p className="text-green-800 text-sm sm:text-base">{success}</p>
          </CardContent>
        </Card>
      )}

      {/* Bay Selector - Desktop Only */}
      {!settingsLoading && bookingSettings && (
        <Card variant="elevated" className="hidden sm:block mb-4 sm:mb-6 rounded-xl">
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select Simulator Bay</h3>
                <p className="text-gray-600 text-sm mt-1">Tap a bay to view its schedule</p>
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2">
                {Array.from({ length: bookingSettings.number_of_bays }, (_, i) => i + 1).map((bay) => (
                  <Button
                    key={bay}
                    variant={activeBay === bay ? 'primary' : 'outline'}
                    onClick={() => setActiveBay(bay)}
                    size="lg"
                    className="min-h-[48px]"
                  >
                    Bay {bay}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-white shadow-none sm:shadow-md rounded-none sm:rounded-xl overflow-hidden">
        {(loading || settingsLoading) ? (
          <CardContent className="py-16">
            <SimpleLoading text="Loading booking calendar..." />
          </CardContent>
        ) : (
          <>
            <div className="hidden sm:block bg-gray-50 border-b px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    {events.length} booking{events.length !== 1 ? 's' : ''} loaded
                  </div>
                  <div className="text-sm font-medium text-brand-dark-green">
                    Bay {activeBay}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">Solo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600">Social</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[calc(100vh-120px)] sm:h-[600px] relative">
              {bookingSettings && (
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  selectable={true}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleEventClick}
                  eventPropGetter={eventStyleGetter}
                  components={components}
                  formats={{
                    timeGutterFormat: (date: Date) => {
                      const hour = date.getHours();
                      const minute = date.getMinutes();
                      if (minute !== 0) return ''; // Only show full hours
                      const period = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      return `${displayHour} ${period}`;
                    }
                  }}
                  step={30}
                  timeslots={2}
                  views={[Views.WEEK, Views.DAY]}
                  defaultView={calendarView}
                  view={calendarView}
                  onView={(view) => setCalendarView(view)}
                  date={calendarDate}
                  onNavigate={date => setCalendarDate(date)}
                  min={new Date(0, 0, 0, parseInt(bookingSettings.opening_time.split(':')[0]), parseInt(bookingSettings.opening_time.split(':')[1]), 0)}
                  max={new Date(0, 0, 0, parseInt(bookingSettings.closing_time.split(':')[0]), parseInt(bookingSettings.closing_time.split(':')[1]), 0)}
                  toolbar={true}
                  popup
                  longPressThreshold={0}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Booking Dialog */}
      <Modal open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <ModalHeader>Create New Booking</ModalHeader>
        <ModalContent>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={selectedSlot ? format(selectedSlot.start, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (selectedSlot) {
                    const newDate = new Date(e.target.value + 'T00:00:00');
                    const currentTime = selectedSlot.start;
                    const newStart = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(),
                      currentTime.getHours(), currentTime.getMinutes());
                    const newEnd = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(),
                      selectedSlot.end.getHours(), selectedSlot.end.getMinutes());
                    setSelectedSlot({ start: newStart, end: newEnd });
                  }
                }}
                className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={selectedSlot ? format(selectedSlot.start, 'HH:mm') : ''}
                  onChange={(e) => {
                    if (selectedSlot) {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newStart = new Date(selectedSlot.start);
                      newStart.setHours(hours, minutes);
                      setSelectedSlot({ start: newStart, end: selectedSlot.end });
                    }
                  }}
                  className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={selectedSlot ? format(selectedSlot.end, 'HH:mm') : ''}
                  onChange={(e) => {
                    if (selectedSlot) {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newEnd = new Date(selectedSlot.end);
                      newEnd.setHours(hours, minutes);
                      setSelectedSlot({ start: selectedSlot.start, end: newEnd });
                    }
                  }}
                  className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Type
              </label>
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value as 'solo' | 'social')}
                className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
              >
                <option value="solo">Solo</option>
                <option value="social">Social</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Simulator Bay
              </label>
              <select
                value={selectedBay}
                onChange={(e) => setSelectedBay(Number(e.target.value))}
                className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
              >
                {bookingSettings && Array.from({ length: bookingSettings.number_of_bays }, (_, i) => i + 1).map((bay) => (
                  <option key={bay} value={bay}>Bay {bay}</option>
                ))}
              </select>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              size="lg"
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateBooking}
              size="lg"
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Create Booking
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Event Details Dialog */}
      <Modal
        open={isEventDialogOpen && selectedEvent !== null}
        onClose={() => setIsEventDialogOpen(false)}
      >
        {selectedEvent && (
          <>
            <ModalHeader>
              <div className="flex items-center">
                {selectedEvent.booking.type === 'social' ? (
                  <GroupIcon className="w-6 h-6 mr-3" />
                ) : (
                  <UserIcon className="w-6 h-6 mr-3" />
                )}
                <span>Booking Details</span>
              </div>
            </ModalHeader>
            <ModalContent>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    {selectedEvent.booking.first_name} {selectedEvent.booking.last_name}
                  </h3>
                  <div className="mt-3 space-y-2 text-sm sm:text-base text-gray-600">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                      {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                    </div>
                    <div className="flex items-center font-medium text-brand-dark-green">
                      Bay {selectedEvent.booking.bay || 1}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center ${
                    selectedEvent.booking.type === 'social'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedEvent.booking.type === 'social' ? (
                      <GroupIcon className="w-4 h-4 mr-2" />
                    ) : (
                      <UserIcon className="w-4 h-4 mr-2" />
                    )}
                    {selectedEvent.booking.type}
                  </span>
                </div>

                {selectedEvent.booking.type === 'social' && selectedEvent.booking.participantNames && selectedEvent.booking.participantNames.length > 0 && (
                  <Card variant="outlined" className="bg-gray-50 border-gray-200">
                    <CardContent className="py-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Participants:</div>
                      <div className="text-sm text-gray-600">
                        {selectedEvent.booking.participantNames.join(', ')}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ModalContent>
            <ModalFooter>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsEventDialogOpen(false)}
                  size="lg"
                  className="w-full sm:w-auto order-last"
                >
                  Close
                </Button>
                {selectedEvent.canJoin && (
                  <Button
                    variant="primary"
                    onClick={handleJoinBooking}
                    size="lg"
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 order-1"
                  >
                    Join Booking
                  </Button>
                )}
                {selectedEvent.isOwnBooking && (
                  <>
                    <Button
                      variant="primary"
                      onClick={openRescheduleDialog}
                      size="lg"
                      className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 order-2"
                      icon={Edit3}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCancelBooking}
                      size="lg"
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 order-3"
                      icon={X}
                    >
                      Cancel Booking
                    </Button>
                  </>
                )}
              </div>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Reschedule Booking Dialog */}
      <Modal
        open={isRescheduleDialogOpen && selectedEvent !== null}
        onClose={() => {
          setIsRescheduleDialogOpen(false);
          setRescheduleSlot(null);
          setError('');
        }}
        size="lg"
      >
        {selectedEvent && (
          <>
            <ModalHeader>Reschedule Booking</ModalHeader>
            <ModalContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Current Booking */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Current Booking</h3>
                  <Card variant="outlined" className="bg-gray-50 border-gray-200">
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-1">Date</div>
                        <div className="text-sm sm:text-base font-medium text-gray-900">
                          {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-1">Time</div>
                        <div className="text-sm sm:text-base font-medium text-gray-900">
                          {`${format(selectedEvent.start, 'HH:mm')} - ${format(selectedEvent.end, 'HH:mm')}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-1">Type</div>
                        <div className="text-sm sm:text-base font-medium text-gray-900 capitalize">
                          {selectedEvent.booking.type}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-1">Bay</div>
                        <div className="text-sm sm:text-base font-medium text-gray-900">
                          {selectedEvent.booking.bay || 1}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* New Booking Details */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">New Booking Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={rescheduleSlot ? format(rescheduleSlot.start, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => {
                          console.log('Date input changed:', e.target.value);
                          try {
                            if (rescheduleSlot) {
                              const newDate = new Date(e.target.value + 'T00:00:00');

                              if (isNaN(newDate.getTime())) {
                                throw new Error('Invalid date value');
                              }

                              const currentTime = rescheduleSlot.start;
                              const newStart = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(),
                                currentTime.getHours(), currentTime.getMinutes());
                              const newEnd = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(),
                                rescheduleSlot.end.getHours(), rescheduleSlot.end.getMinutes());
                              console.log('Updated reschedule slot:', { newStart, newEnd });
                              setRescheduleSlot({ start: newStart, end: newEnd });
                            } else {
                              const newDate = new Date(e.target.value + 'T00:00:00');

                              if (isNaN(newDate.getTime())) {
                                throw new Error('Invalid date value');
                              }

                              const defaultStart = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 9, 0);
                              const defaultEnd = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 10, 0);
                              setRescheduleSlot({ start: defaultStart, end: defaultEnd });
                            }
                          } catch (error) {
                            console.error('Error updating date:', error);
                            setError('Invalid date selected. Please try again.');
                          }
                        }}
                        className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <input
                          type="time"
                          value={rescheduleSlot ? format(rescheduleSlot.start, 'HH:mm') : ''}
                          onChange={(e) => {
                            if (rescheduleSlot) {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newStart = new Date(rescheduleSlot.start);
                              newStart.setHours(hours, minutes);
                              setRescheduleSlot({ start: newStart, end: rescheduleSlot.end });
                            } else {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const today = new Date();
                              const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
                              const defaultEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours + 1, minutes);
                              setRescheduleSlot({ start: defaultStart, end: defaultEnd });
                            }
                          }}
                          className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                        <input
                          type="time"
                          value={rescheduleSlot ? format(rescheduleSlot.end, 'HH:mm') : ''}
                          onChange={(e) => {
                            if (rescheduleSlot) {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newEnd = new Date(rescheduleSlot.end);
                              newEnd.setHours(hours, minutes);
                              setRescheduleSlot({ start: rescheduleSlot.start, end: newEnd });
                            } else {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const today = new Date();
                              const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours - 1, minutes);
                              const defaultEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
                              setRescheduleSlot({ start: defaultStart, end: defaultEnd });
                            }
                          }}
                          className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
                      <select
                        value={rescheduleType}
                        onChange={(e) => setRescheduleType(e.target.value as 'solo' | 'social')}
                        className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
                      >
                        <option value="solo">Solo</option>
                        <option value="social">Social</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Simulator Bay</label>
                      <select
                        value={rescheduleBay}
                        onChange={(e) => setRescheduleBay(Number(e.target.value))}
                        className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green text-base min-h-[48px]"
                      >
                        {bookingSettings && Array.from({ length: bookingSettings.number_of_bays }, (_, i) => i + 1).map((bay) => (
                          <option key={bay} value={bay}>Bay {bay}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip Section */}
              <Card variant="outlined" className="mt-4 sm:mt-6 bg-blue-50 border-blue-200">
                <CardContent className="py-3">
                  <div className="flex items-start space-x-2 text-blue-800">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">
                      💡 Tip: You can also click on the calendar to select a new time slot, then click "Reschedule Booking"
                    </span>
                  </div>
                  {rescheduleSlot && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="text-xs sm:text-sm font-medium text-blue-900 mb-1">Selected Time Slot:</div>
                      <div className="text-xs sm:text-sm text-blue-700">
                        {format(rescheduleSlot.start, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-xs sm:text-sm text-blue-700">
                        {format(rescheduleSlot.start, 'HH:mm')} - {format(rescheduleSlot.end, 'HH:mm')}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </ModalContent>
            <ModalFooter>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRescheduleDialogOpen(false);
                    setRescheduleSlot(null);
                    setError('');
                  }}
                  size="lg"
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRescheduleBooking}
                  size="lg"
                  className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 order-1 sm:order-2"
                  icon={Edit3}
                >
                  Reschedule Booking
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Floating Bottom Toolbar - Hidden when modals are open */}
      {!isCreateDialogOpen && !isEventDialogOpen && !isRescheduleDialogOpen && (
        <>
          {/* Navigation Toolbar - Centered */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pr-[50px]">
            <div className="bg-white rounded-full shadow-lg border border-gray-200 px-2 py-2 flex items-center gap-2">
              {/* Previous Navigation */}
              <button
                onClick={() => window.calendarNavigate?.('PREV')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>

              {/* View Toggle with Today functionality */}
              <div className="flex items-center bg-gray-100 rounded-full overflow-hidden">
                <button
                  onClick={() => {
                    if (calendarView === Views.DAY) {
                      // If already in day view, jump to today
                      window.calendarNavigate?.('TODAY');
                    } else {
                      // Switch to day view
                      setCalendarView(Views.DAY);
                    }
                  }}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    calendarView === Views.DAY
                      ? 'bg-brand-dark-green text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => {
                    if (calendarView === Views.WEEK) {
                      // If already in week view, jump to today
                      window.calendarNavigate?.('TODAY');
                    } else {
                      // Switch to week view
                      setCalendarView(Views.WEEK);
                    }
                  }}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    calendarView === Views.WEEK
                      ? 'bg-brand-dark-green text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Next Navigation */}
              <button
                onClick={() => window.calendarNavigate?.('NEXT')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Quick Booking Button - Right Side */}
          <button
            onClick={handleQuickBookingClick}
            className="fixed bottom-6 right-6 w-14 h-14 bg-brand-dark-green text-white rounded-full shadow-lg hover:bg-brand-muted-green hover:shadow-xl transition-all duration-200 z-50 active:scale-95 flex items-center justify-center"
            aria-label="Quick booking"
            title="Create new booking"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
};

export default BookingPage; 