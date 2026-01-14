import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getLeagueSchedule, getTeamAvailability } from '../services/api';

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  availability_status?: 'available' | 'unavailable' | 'pending';
  last_updated?: string;
  notes?: string;
}

interface WeekAvailability {
  week_start_date: string;
  week_end_date: string;
  members: TeamMemberAvailability[];
}

interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
}

interface TeamMemberAvailability {
  member_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  availability_status: 'available' | 'unavailable' | 'pending';
  last_updated?: string;
  notes?: string;
  time_slots?: TimeSlot[];
}

interface AvailabilityViewProps {
  teamId: number;
  leagueId: number;
  members: TeamMember[];
}

const AvailabilityView: React.FC<AvailabilityViewProps> = ({ teamId, leagueId, members }) => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [weekAvailability, setWeekAvailability] = useState<WeekAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAvailabilityData = useCallback(async () => {
    setLoading(true);
    try {
      // Load league schedule
      const scheduleResponse = await getLeagueSchedule(leagueId);
      console.log('Schedule response:', scheduleResponse.data);
      const weeks = scheduleResponse.data.map((w: any) => w.week_start_date);

      console.log('Available weeks:', weeks);
      setAvailableWeeks(weeks);
      if (weeks.length > 0) {
        setCurrentWeek(weeks[0]);
      }
    } catch (error) {
      console.error('Error loading availability data:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  const loadWeekAvailability = useCallback(async (weekStartDate: string) => {
    try {
      // Find the week number from available weeks
      const weekNumber = availableWeeks.indexOf(weekStartDate) + 1;

      console.log('AvailabilityView - Loading week availability:', {
        weekStartDate,
        weekNumber,
        teamId,
        leagueId
      });

      // Load availability for this week
      const availResponse = await getTeamAvailability(teamId, weekNumber, leagueId);
      const availData = availResponse.data;

      console.log('AvailabilityView - Got availability data:', availData);

      // Parse the availData - it comes as an array directly from the API
      // Each row contains: user_member_id, first_name, last_name, email, handicap, is_captain,
      // is_available, availability_notes, time_slots, submitted_at, updated_at
      const availabilityData = Array.isArray(availData) ? availData : [];

      // Transform the API data directly into our TeamMemberAvailability format
      const weekEndDate = new Date(new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const transformedMembers: TeamMemberAvailability[] = availabilityData.map((row: any) => {
        // Parse time_slots if it exists
        let timeSlots: TimeSlot[] = [];
        if (row.time_slots) {
          try {
            timeSlots = typeof row.time_slots === 'string'
              ? JSON.parse(row.time_slots)
              : row.time_slots;
          } catch (e) {
            console.error('Error parsing time_slots for user', row.user_member_id, ':', e);
          }
        }

        // Determine status: if is_available is null, they haven't submitted yet (pending)
        let status: 'available' | 'unavailable' | 'pending' = 'pending';
        if (row.is_available !== null && row.is_available !== undefined) {
          status = row.is_available ? 'available' : 'unavailable';
        }

        return {
          member_id: row.user_member_id,
          first_name: row.first_name,
          last_name: row.last_name,
          handicap: row.handicap || 0,
          role: row.is_captain ? 'captain' : 'member',
          availability_status: status,
          last_updated: row.updated_at,
          notes: row.availability_notes,
          time_slots: timeSlots
        };
      });

      const weekAvail = {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        members: transformedMembers
      };

      console.log('AvailabilityView - Setting week availability:', weekAvail);
      setWeekAvailability(weekAvail);
    } catch (error) {
      console.error('Error loading week availability:', error);
      toast.error('Failed to load week availability');
    }
  }, [teamId, leagueId, availableWeeks]);

  useEffect(() => {
    loadAvailabilityData();
  }, [loadAvailabilityData]);

  useEffect(() => {
    if (currentWeek) {
      loadWeekAvailability(currentWeek);
    }
  }, [currentWeek, loadWeekAvailability]);

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
    return availableWeeks.findIndex(week => week === currentWeek);
  };

  const goToPreviousWeek = () => {
    const currentIndex = getCurrentWeekIndex();
    if (currentIndex > 0) {
      setCurrentWeek(availableWeeks[currentIndex - 1]);
    }
  };

  const goToNextWeek = () => {
    const currentIndex = getCurrentWeekIndex();
    if (currentIndex < availableWeeks.length - 1) {
      setCurrentWeek(availableWeeks[currentIndex + 1]);
    }
  };

  // Get members sorted by captain first, then by name
  const sortedMembers = weekAvailability?.members.sort((a, b) => {
    if (a.role === 'captain' && b.role !== 'captain') return -1;
    if (a.role !== 'captain' && b.role === 'captain') return 1;
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  }) || [];

  // Get players who haven't submitted
  const pendingPlayers = sortedMembers.filter(m => m.availability_status === 'pending');


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brand-black">Week Selection</h3>
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
        
        {weekAvailability && (
          <div className="text-center">
            <h4 className="text-xl font-semibold text-brand-black">
              {formatWeekRange(weekAvailability.week_start_date, weekAvailability.week_end_date)}
            </h4>
            <p className="text-sm text-neutral-600">
              Week of {formatDate(weekAvailability.week_start_date)}
            </p>
          </div>
        )}
      </div>

      {/* Set My Availability Button */}
      <div className="flex justify-center">
        <button
          onClick={() => navigate(`/player/availability/${teamId}/${leagueId}`)}
          className="flex items-center space-x-2 px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium"
        >
          <Calendar className="w-5 h-5" />
          <span>Manage My Availability</span>
        </button>
      </div>

      {/* Team Availability Overview */}
      {weekAvailability && weekAvailability.members.some(m => m.time_slots && m.time_slots.length > 0) && (() => {
        // Group all time slots by day
        const timeSlotsByDay: { [day: string]: Array<{ slot: TimeSlot; players: string[] }> } = {};

        weekAvailability.members.forEach(member => {
          if (member.availability_status === 'available' && member.time_slots) {
            member.time_slots.forEach(slot => {
              if (!timeSlotsByDay[slot.day]) {
                timeSlotsByDay[slot.day] = [];
              }

              // Find if this exact time slot already exists
              const existingSlot = timeSlotsByDay[slot.day].find(
                s => s.slot.start_time === slot.start_time && s.slot.end_time === slot.end_time
              );

              const playerName = `${member.first_name} ${member.last_name}`;

              if (existingSlot) {
                existingSlot.players.push(playerName);
              } else {
                timeSlotsByDay[slot.day].push({
                  slot,
                  players: [playerName]
                });
              }
            });
          }
        });

        // Sort days in week order
        const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const sortedDays = Object.keys(timeSlotsByDay).sort(
          (a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b)
        );

        // Only render if there are available slots
        if (sortedDays.length === 0) return null;

        // Format time helper
        const formatTime = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };

        return (
          <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-lg p-4 sm:p-6 text-white">
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Team Availability Overview
            </h3>
            <div className="space-y-4">
              {sortedDays.map(day => (
                <div key={day}>
                  <h4 className="text-sm font-semibold mb-2 text-brand-neon-green">{day}</h4>
                  <div className="space-y-2">
                    {timeSlotsByDay[day]
                      .sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time))
                      .map((item, idx) => (
                        <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="font-medium text-sm">
                              {formatTime(item.slot.start_time)} - {formatTime(item.slot.end_time)}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.players.map((player, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-neon-green text-brand-dark-green"
                                >
                                  {player}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Pending Players Alert */}
      {pendingPlayers.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-yellow-800">
                {pendingPlayers.length} {pendingPlayers.length === 1 ? 'player hasn\'t' : 'players haven\'t'} submitted availability yet
              </h3>
            </div>
            <div className="space-y-2">
              {pendingPlayers.map(player => (
                <div key={player.member_id} className="flex items-center justify-between bg-white/60 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-yellow-800">
                        {player.first_name[0]}{player.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {player.first_name} {player.last_name}
                        {player.role === 'captain' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-neon-green text-brand-dark-green">
                            Captain
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">Handicap: {player.handicap}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityView;
