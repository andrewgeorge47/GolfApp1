import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, addDays, setHours, setMinutes } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../AuthContext';
import { User as UserIcon, Group as GroupIcon, Plus as PlusIcon, Edit3, X, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('week');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Custom 3-day view for mobile
  const customViews = {
    week: true,
    day: {
      type: Views.DAY,
      length: 3,
      label: '3-Day',
    },
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/simulator-bookings');
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
      const response = await api.get('/club-booking-settings/No. 5');
      setBookingSettings(response.data);
    } catch (err: any) {
      console.error('Error fetching booking settings:', err);
      // Use default settings if not found
      setBookingSettings({
        id: 0,
        club_name: 'No. 5',
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

  // Handle responsive calendar view
  useEffect(() => {
    const handleResize = () => {
      setCalendarView(window.innerWidth < 640 ? 'day' : 'week');
    };

    // Set initial view
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
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
    
    const conflictingBooking = allBookings.find((booking: Booking) => {
      if (booking.date !== selectedDate) return false;
      if (booking.bay !== activeBay) return false; // Only check conflicts in the same bay
      
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      
      // Check for overlap
      return (
        (selectedStart >= bookingStart && selectedStart < bookingEnd) ||
        (selectedEnd > bookingStart && selectedEnd <= bookingEnd) ||
        (selectedStart <= bookingStart && selectedEnd >= bookingEnd)
      );
    });
    
    if (conflictingBooking) {
      setError(`This time slot is already booked by ${conflictingBooking.first_name} ${conflictingBooking.last_name} in Bay ${conflictingBooking.bay || 1}. Please choose a different time or bay.`);
      return;
    }
    
    setSelectedSlot({ start, end });
    setSelectedBay(activeBay); // Default to the active bay
    setIsCreateDialogOpen(true);
    setError(''); // Clear any previous errors
  };

  const handleCreateBooking = async () => {
    if (!selectedSlot) return;
    
    try {
      const date = format(selectedSlot.start, 'yyyy-MM-dd');
      const start_time = format(selectedSlot.start, 'HH:mm');
      const end_time = format(selectedSlot.end, 'HH:mm');
      
      await api.post('/simulator-bookings', {
        date,
        start_time,
        end_time,
        type: bookingType,
        bay: selectedBay,
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
    
    try {
      const date = format(rescheduleSlot.start, 'yyyy-MM-dd');
      const start_time = format(rescheduleSlot.start, 'HH:mm');
      const end_time = format(rescheduleSlot.end, 'HH:mm');
      
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
      return (
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => props.onNavigate('PREV')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => props.onNavigate('TODAY')}
              className="px-3 py-1 text-sm bg-brand-dark-green text-white rounded-lg hover:bg-brand-muted-green transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => props.onNavigate('NEXT')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              {props.label}
            </span>
          </div>
        </div>
      );
    },
  };

  return (
    <div className="max-w-6xl mx-auto relative pb-16 sm:pb-6 px-4 sm:px-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
              <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
              Simulator Bay Booking
            </h1>
            <p className="text-white/90 mt-2 text-sm sm:text-base">No. 5 Clubhouse - Drag to create bookings</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-white/10 backdrop-blur-sm text-white rounded-full px-3 py-2 sm:px-4 sm:py-2 hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <X className="w-4 h-4" />
            <span className="text-sm sm:text-base">Back to Profile</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-400/50 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm sm:text-base">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-400/50 text-green-800 px-4 py-3 rounded-lg mb-4 text-sm sm:text-base">
          {success}
        </div>
      )}

      {/* Bay Toggle */}
      {!settingsLoading && bookingSettings && (
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Simulator Bay</h3>
              <p className="text-gray-600 text-sm">View bookings for a specific bay</p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:space-x-2 gap-2 sm:gap-0">
              {Array.from({ length: bookingSettings.number_of_bays }, (_, i) => i + 1).map((bay) => (
                <button
                  key={bay}
                  onClick={() => setActiveBay(bay)}
                  className={`px-3 py-3 sm:px-4 sm:py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base min-h-[44px] ${
                    activeBay === bay
                      ? 'bg-brand-dark-green text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bay {bay}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {(loading || settingsLoading) ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 border-b px-4 sm:px-6 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center justify-between sm:justify-start sm:space-x-4">
                  <div className="text-xs sm:text-sm text-gray-600">
                    {events.length} booking{events.length !== 1 ? 's' : ''} loaded
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-brand-dark-green">
                    Bay {activeBay}
                  </div>
                </div>
                <div className="flex items-center justify-center sm:justify-end space-x-4 text-xs sm:text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-600">Solo</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600">Social</span>
                  </div>
                  {/* Mobile view indicator */}
                  <div className="sm:hidden text-xs text-gray-500">
                    {calendarView === 'day' ? '3-Day View' : 'Week View'}
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[400px] sm:h-[600px]">
              {bookingSettings && (
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  selectable="ignoreEvents"
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleEventClick}
                  eventPropGetter={eventStyleGetter}
                  components={components}
                  step={30}
                  timeslots={2}
                  views={{ week: true, day: true }}
                  defaultView={calendarView === 'day' ? 'day' : 'week'}
                  view={calendarView === 'day' ? 'day' : 'week'}
                  date={calendarDate}
                  onNavigate={date => setCalendarDate(date)}
                  min={new Date(0, 0, 0, parseInt(bookingSettings.opening_time.split(':')[0]), parseInt(bookingSettings.opening_time.split(':')[1]), 0)}
                  max={new Date(0, 0, 0, parseInt(bookingSettings.closing_time.split(':')[0]), parseInt(bookingSettings.closing_time.split(':')[1]), 0)}
                  toolbar={true}
                  popup
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Booking Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green text-white p-6 rounded-t-2xl">
              <h2 className="text-xl font-bold">Create New Booking</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Selected Time Slot</div>
                  <div className="text-lg font-semibold">
                    {selectedSlot ? format(selectedSlot.start, 'EEEE, MMMM d, yyyy') : ''}
                  </div>
                  <div className="text-gray-600">
                    {selectedSlot ? `${format(selectedSlot.start, 'HH:mm')} - ${format(selectedSlot.end, 'HH:mm')}` : ''}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Type
                  </label>
                  <select
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value as 'solo' | 'social')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                  >
                    {bookingSettings && Array.from({ length: bookingSettings.number_of_bays }, (_, i) => i + 1).map((bay) => (
                      <option key={bay} value={bay}>Bay {bay}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 sm:px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-3 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors rounded-lg border border-gray-300 sm:border-none"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBooking}
                className="bg-brand-dark-green text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-brand-muted-green transition-colors font-medium"
              >
                Create Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Dialog */}
      {isEventDialogOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green text-white p-6 rounded-t-2xl">
              <div className="flex items-center">
                {selectedEvent.booking.type === 'social' ? (
                  <GroupIcon className="w-6 h-6 mr-3" />
                ) : (
                  <UserIcon className="w-6 h-6 mr-3" />
                )}
                <h2 className="text-xl font-bold">Booking Details</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedEvent.booking.first_name} {selectedEvent.booking.last_name}
                  </h3>
                  <div className="text-gray-600">
                    {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-gray-600">
                    {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                  </div>
                  <div className="text-gray-600">
                    Bay {selectedEvent.booking.bay || 1}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedEvent.booking.type === 'social' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedEvent.booking.type === 'social' ? (
                      <GroupIcon className="w-4 h-4 inline mr-1" />
                    ) : (
                      <UserIcon className="w-4 h-4 inline mr-1" />
                    )}
                    {selectedEvent.booking.type}
                  </span>
                </div>
                
                {selectedEvent.booking.type === 'social' && selectedEvent.booking.participantNames && selectedEvent.booking.participantNames.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Participants:</div>
                    <div className="text-gray-600">
                      {selectedEvent.booking.participantNames.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-4 sm:px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setIsEventDialogOpen(false)}
                className="px-4 py-3 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors rounded-lg border border-gray-300 sm:border-none"
              >
                Close
              </button>
              {selectedEvent.canJoin && (
                <button
                  onClick={handleJoinBooking}
                  className="bg-green-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Join Booking
                </button>
              )}
              {selectedEvent.isOwnBooking && (
                <>
                  <button
                    onClick={openRescheduleDialog}
                    className="bg-yellow-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    className="bg-red-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Cancel Booking
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

            {/* Reschedule Booking Dialog */}
      {isRescheduleDialogOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green text-white p-6 rounded-t-2xl">
              <h2 className="text-xl font-bold">Reschedule Booking</h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Booking</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="text-sm text-gray-600">Date</div>
                    <div className="font-medium">{selectedEvent ? format(selectedEvent.start, 'EEEE, MMMM d, yyyy') : ''}</div>
                    <div className="text-sm text-gray-600">Time</div>
                    <div className="font-medium">{selectedEvent ? `${format(selectedEvent.start, 'HH:mm')} - ${format(selectedEvent.end, 'HH:mm')}` : ''}</div>
                    <div className="text-sm text-gray-600">Type</div>
                    <div className="font-medium">{selectedEvent?.booking.type}</div>
                    <div className="text-sm text-gray-600">Bay</div>
                    <div className="font-medium">{selectedEvent?.booking.bay || 1}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">New Booking Details</h3>
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
                              
                              // Validate the new date
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
                              // If no slot is selected, create a default one
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
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
                              // If no slot is selected, create a default one
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const today = new Date();
                              const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
                              const defaultEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours + 1, minutes);
                              setRescheduleSlot({ start: defaultStart, end: defaultEnd });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
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
                              // If no slot is selected, create a default one
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const today = new Date();
                              const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours - 1, minutes);
                              const defaultEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
                              setRescheduleSlot({ start: defaultStart, end: defaultEnd });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
                      <select
                        value={rescheduleType}
                        onChange={(e) => setRescheduleType(e.target.value as 'solo' | 'social')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                      >
                        {bookingSettings && Array.from({ length: bookingSettings.number_of_bays }, (_, i) => i + 1).map((bay) => (
                          <option key={bay} value={bay}>Bay {bay}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2 text-blue-800">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">💡 Tip: You can also drag on the calendar to select a new time slot, then click "Reschedule Booking"</span>
                </div>
                {rescheduleSlot && (
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <div className="text-xs sm:text-sm font-medium text-blue-900">Selected Time Slot:</div>
                    <div className="text-xs sm:text-sm text-blue-700">
                      {format(rescheduleSlot.start, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-xs sm:text-sm text-blue-700">
                      {format(rescheduleSlot.start, 'HH:mm')} - {format(rescheduleSlot.end, 'HH:mm')}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-4 sm:px-6 py-4 rounded-b-2xl flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setIsRescheduleDialogOpen(false);
                  setRescheduleSlot(null);
                  setError('');
                }}
                className="px-4 py-3 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors rounded-lg border border-gray-300 sm:border-none"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleBooking}
                className="bg-yellow-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Reschedule Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage; 