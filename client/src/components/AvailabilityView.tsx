import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Edit3
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getLeagueSchedule, getTeamAvailability, setCaptainOverride, setMatchupPlayingTime } from '../services/api';

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

interface UpcomingMatch {
  id: number;
  week_number: number;
  week_start_date: string;
  opponent_team_name: string;
  team1_id: number;
  team2_id: number;
  team1_playing_time?: string;
  team2_playing_time?: string;
}

interface AvailabilityViewProps {
  teamId: number;
  leagueId: number;
  members: TeamMember[];
  upcomingMatches: UpcomingMatch[];
  onPlayingTimeSet: () => void;
}

const AvailabilityView: React.FC<AvailabilityViewProps> = ({ teamId, leagueId, members, upcomingMatches, onPlayingTimeSet }) => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [weekAvailability, setWeekAvailability] = useState<WeekAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingPlayingTime, setIsEditingPlayingTime] = useState(false);

  const loadAvailabilityData = useCallback(async () => {
    setLoading(true);
    try {
      // Load league schedule - show ALL weeks so captains can plan ahead
      const scheduleResponse = await getLeagueSchedule(leagueId, false);
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
      setIsEditingPlayingTime(false); // Reset edit mode when week changes
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

  // Helper to format date for datetime-local input (without timezone conversion)
  const formatDateTimeLocal = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Handle set playing time
  const handleSetPlayingTime = async (matchupId: number, playingTime: string) => {
    if (!playingTime) {
      toast.error('Please select a playing time');
      return;
    }

    try {
      await setMatchupPlayingTime(matchupId, playingTime);
      toast.success('Playing time set successfully');
      setIsEditingPlayingTime(false);
      onPlayingTimeSet();
    } catch (error: any) {
      console.error('Error setting playing time:', error);
      toast.error(error.response?.data?.error || 'Failed to set playing time');
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

      {/* Set Playing Time */}
      {(() => {
        const weekNumber = availableWeeks.indexOf(currentWeek) + 1;
        const matchForWeek = upcomingMatches.find(m => m.week_number === weekNumber);

        if (!matchForWeek) return null;

        const myPlayingTime = matchForWeek.team1_id === teamId
          ? matchForWeek.team1_playing_time
          : matchForWeek.team2_playing_time;
        const opponentPlayingTime = matchForWeek.team1_id === teamId
          ? matchForWeek.team2_playing_time
          : matchForWeek.team1_playing_time;

        return (
          <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-brand-black mb-4">Set Playing Time</h3>
            <div className="space-y-3">
              {/* Your Playing Time Card */}
              <div className="bg-gradient-to-br from-brand-neon-green/10 to-brand-neon-green/5 border border-brand-neon-green/30 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-brand-neon-green" />
                    <span className="text-xs sm:text-sm font-semibold text-neutral-700 uppercase">Your Playing Time</span>
                  </div>
                  {myPlayingTime && !isEditingPlayingTime && (
                    <button
                      onClick={() => setIsEditingPlayingTime(true)}
                      className="flex items-center space-x-1 text-xs font-medium text-brand-neon-green hover:text-green-600 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {myPlayingTime && !isEditingPlayingTime ? (
                  <p className="text-base sm:text-lg font-bold text-brand-black">
                    {new Date(myPlayingTime).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="datetime-local"
                      key={myPlayingTime || 'empty'}
                      defaultValue={myPlayingTime ? formatDateTimeLocal(myPlayingTime) : ''}
                      onBlur={(e) => {
                        if (e.target.value) {
                          // Convert the local datetime to ISO string for storage
                          const localDate = new Date(e.target.value);
                          handleSetPlayingTime(matchForWeek.id, localDate.toISOString());
                        }
                      }}
                      min={matchForWeek.week_start_date}
                      placeholder="Select date and time"
                      className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-neon-green bg-white"
                      autoFocus
                    />
                    {myPlayingTime && (
                      <button
                        onClick={() => setIsEditingPlayingTime(false)}
                        className="text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Opponent Playing Time Card */}
              {opponentPlayingTime && (
                <div className="bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-300 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs sm:text-sm font-semibold text-neutral-700 uppercase">{matchForWeek.opponent_team_name}</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-brand-black">
                    {new Date(opponentPlayingTime).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Team Availability Overview */}
      {weekAvailability && weekAvailability.members.some(m => m.time_slots && m.time_slots.length > 0) && (() => {
        // Helper function to merge adjacent time slots for a single player
        const mergeAdjacentSlots = (slots: TimeSlot[]): TimeSlot[] => {
          if (slots.length === 0) return [];

          // Sort by start time
          const sorted = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
          const merged: TimeSlot[] = [sorted[0]];

          for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const previous = merged[merged.length - 1];

            // Check if current slot starts where previous ends (adjacent)
            if (current.start_time === previous.end_time) {
              // Merge by extending the end time
              previous.end_time = current.end_time;
            } else {
              // Not adjacent, add as new slot
              merged.push(current);
            }
          }

          return merged;
        };

        // First, collect and merge each player's time slots by day
        const playerSlotsByDay: { [day: string]: { [playerName: string]: TimeSlot[] } } = {};

        weekAvailability.members.forEach(member => {
          if (member.availability_status === 'available' && member.time_slots) {
            const playerName = `${member.first_name} ${member.last_name}`;

            member.time_slots.forEach(slot => {
              if (!playerSlotsByDay[slot.day]) {
                playerSlotsByDay[slot.day] = {};
              }
              if (!playerSlotsByDay[slot.day][playerName]) {
                playerSlotsByDay[slot.day][playerName] = [];
              }
              playerSlotsByDay[slot.day][playerName].push(slot);
            });
          }
        });

        // Merge adjacent slots for each player on each day
        Object.keys(playerSlotsByDay).forEach(day => {
          Object.keys(playerSlotsByDay[day]).forEach(playerName => {
            playerSlotsByDay[day][playerName] = mergeAdjacentSlots(playerSlotsByDay[day][playerName]);
          });
        });

        // Now, intelligently combine overlapping time slots across players
        const timeSlotsByDay: { [day: string]: Array<{ slot: TimeSlot; players: string[] }> } = {};

        Object.keys(playerSlotsByDay).forEach(day => {
          // Collect all unique time points (starts and ends) for this day
          const timePoints = new Set<string>();
          Object.values(playerSlotsByDay[day]).forEach(slots => {
            slots.forEach(slot => {
              timePoints.add(slot.start_time);
              timePoints.add(slot.end_time);
            });
          });

          // Sort time points
          const sortedTimePoints = Array.from(timePoints).sort();

          // For each interval between consecutive time points, determine which players are available
          const intervals: Array<{ start_time: string; end_time: string; players: string[] }> = [];

          for (let i = 0; i < sortedTimePoints.length - 1; i++) {
            const start = sortedTimePoints[i];
            const end = sortedTimePoints[i + 1];
            const availablePlayers: string[] = [];

            // Check which players are available during this interval
            Object.keys(playerSlotsByDay[day]).forEach(playerName => {
              const playerSlots = playerSlotsByDay[day][playerName];
              const isAvailable = playerSlots.some(slot =>
                slot.start_time <= start && slot.end_time >= end
              );
              if (isAvailable) {
                availablePlayers.push(playerName);
              }
            });

            if (availablePlayers.length > 0) {
              intervals.push({
                start_time: start,
                end_time: end,
                players: availablePlayers
              });
            }
          }

          // Merge consecutive intervals with the same player set
          const mergedIntervals: Array<{ slot: TimeSlot; players: string[] }> = [];

          for (let i = 0; i < intervals.length; i++) {
            const current = intervals[i];

            if (mergedIntervals.length === 0) {
              mergedIntervals.push({
                slot: { day, start_time: current.start_time, end_time: current.end_time },
                players: current.players
              });
            } else {
              const previous = mergedIntervals[mergedIntervals.length - 1];

              // Check if players are the same (order doesn't matter)
              const samePlayerSet =
                previous.players.length === current.players.length &&
                previous.players.every(p => current.players.includes(p));

              if (samePlayerSet && previous.slot.end_time === current.start_time) {
                // Merge by extending the end time
                previous.slot.end_time = current.end_time;
              } else {
                // Different player set or not adjacent, add as new interval
                mergedIntervals.push({
                  slot: { day, start_time: current.start_time, end_time: current.end_time },
                  players: current.players
                });
              }
            }
          }

          timeSlotsByDay[day] = mergedIntervals;
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

        // Color palette for player chips
        const playerColors = [
          'bg-blue-500 text-white',
          'bg-purple-500 text-white',
          'bg-pink-500 text-white',
          'bg-orange-500 text-white',
          'bg-teal-500 text-white',
          'bg-indigo-500 text-white',
          'bg-rose-500 text-white',
          'bg-cyan-500 text-white',
          'bg-amber-500 text-white',
          'bg-emerald-500 text-white'
        ];

        // Assign consistent colors to players
        const allPlayers = Array.from(new Set(
          Object.values(timeSlotsByDay).flatMap(slots => slots.flatMap(s => s.players))
        ));
        const playerColorMap: { [player: string]: string } = {};
        allPlayers.forEach((player, index) => {
          playerColorMap[player] = playerColors[index % playerColors.length];
        });

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
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${playerColorMap[player]}`}
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
