import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Shield
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getLeagueSchedule, getTeamAvailability, setCaptainOverride } from '../services/api';

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
  captain_override?: boolean;
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

        // Determine status: captain override takes precedence
        let status: 'available' | 'unavailable' | 'pending' = 'pending';
        if (row.captain_override === true) {
          status = 'available';
        } else if (row.is_available !== null && row.is_available !== undefined) {
          status = row.is_available ? 'available' : 'unavailable';
        }

        return {
          member_id: row.user_member_id,
          first_name: row.first_name,
          last_name: row.last_name,
          handicap: row.handicap || 0,
          role: row.is_captain ? 'captain' : 'member',
          availability_status: status,
          captain_override: row.captain_override || false,
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

  // Get players who haven't submitted (and not overridden by captain)
  const pendingPlayers = sortedMembers.filter(m => m.availability_status === 'pending' && !m.captain_override);

  // Handle captain override toggle
  const handleCaptainOverride = async (memberId: number, currentOverride: boolean) => {
    const weekNumber = availableWeeks.indexOf(currentWeek) + 1;

    try {
      await setCaptainOverride(teamId, memberId, {
        league_id: leagueId,
        week_number: weekNumber,
        captain_override: !currentOverride
      });

      toast.success(!currentOverride ? 'Player marked as available' : 'Override removed');

      // Reload week availability
      loadWeekAvailability(currentWeek);
    } catch (error: any) {
      console.error('Error setting captain override:', error);
      toast.error(error.response?.data?.error || 'Failed to update availability');
    }
  };


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
                // Only add player if not already in the list (defensive check)
                if (!existingSlot.players.includes(playerName)) {
                  existingSlot.players.push(playerName);
                }
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

      {/* Team Member Availability List with Captain Override */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand-black">Team Availability</h3>
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <Shield className="w-4 h-4" />
              <span>Captain Override</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-neutral-200">
          {sortedMembers.map(member => (
            <div key={member.member_id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    member.availability_status === 'available' ? 'bg-green-100' :
                    member.availability_status === 'unavailable' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {member.availability_status === 'available' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {member.availability_status === 'unavailable' && <XCircle className="w-5 h-5 text-red-600" />}
                    {member.availability_status === 'pending' && <Clock className="w-5 h-5 text-gray-500" />}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-brand-black">
                        {member.first_name} {member.last_name}
                      </span>
                      {member.role === 'captain' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-neon-green text-brand-dark-green">
                          Captain
                        </span>
                      )}
                      {member.captain_override && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Override
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`text-sm ${
                        member.availability_status === 'available' ? 'text-green-600 font-medium' :
                        member.availability_status === 'unavailable' ? 'text-red-600 font-medium' :
                        'text-gray-500'
                      }`}>
                        {member.availability_status === 'available' && 'Available'}
                        {member.availability_status === 'unavailable' && 'Unavailable'}
                        {member.availability_status === 'pending' && 'Not submitted'}
                      </span>
                      {member.notes && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-600 truncate">{member.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Captain Override Toggle */}
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={member.captain_override || false}
                      onChange={() => handleCaptainOverride(member.member_id, member.captain_override || false)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {member.captain_override ? 'ON' : 'OFF'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
