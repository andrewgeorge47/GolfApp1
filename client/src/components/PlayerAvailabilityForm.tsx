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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
// TODO: Re-enable when league endpoints are rebuilt with permission system
// import {
//   getUserTeams,
//   getLeagueAvailableWeeks,
//   submitPlayerAvailability,
//   getTeamAvailability
// } from '../services/api';

interface AvailabilityFormData {
  league_id: number;
  week_number: number;
  is_available: boolean;
  availability_notes: string;
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

const PlayerAvailabilityForm: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [formData, setFormData] = useState<AvailabilityFormData>({
    league_id: 0,
    week_number: 0,
    is_available: true,
    availability_notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentAvailability, setCurrentAvailability] = useState<{
    is_available: boolean;
    availability_notes: string;
    last_updated?: string;
  } | null>(null);

  useEffect(() => {
    loadUserTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadAvailableWeeks(selectedTeam.league_id);
      setFormData(prev => ({
        ...prev,
        league_id: selectedTeam.league_id
      }));
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedWeek) {
      setFormData(prev => ({
        ...prev,
        week_number: selectedWeek.week_number
      }));
      loadCurrentAvailability();
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
      setFormData(prev => ({
        ...prev,
        is_available: mockAvailability.is_available,
        availability_notes: mockAvailability.availability_notes
      }));
    } catch (error) {
      console.error('Error loading current availability:', error);
      // Don't show error toast for this as it's not critical
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeam || !selectedWeek) {
      toast.error('Please select a team and week');
      return;
    }

    setSubmitting(true);
    try {
      // Mock submission for preview
      const mockResult = {
        is_available: formData.is_available,
        availability_notes: formData.availability_notes,
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

  const handleAvailabilityChange = (isAvailable: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_available: isAvailable
    }));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      availability_notes: e.target.value
    }));
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Calendar className="w-8 h-8 text-brand-neon-green" />
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Submit Availability</h1>
          <p className="text-neutral-600">Let your team know when you're available to play</p>
        </div>
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

      {/* Availability Form */}
      {selectedTeam && selectedWeek && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-brand-black mb-4">Your Availability</h3>
          
          {/* Current Status Display */}
          {currentAvailability && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Current Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {currentAvailability.is_available ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      currentAvailability.is_available ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentAvailability.is_available ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  {currentAvailability.availability_notes && (
                    <p className="text-sm text-neutral-500 mt-1">
                      Notes: {currentAvailability.availability_notes}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Availability Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Are you available for this week?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleAvailabilityChange(true)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    formData.is_available
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Available</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleAvailabilityChange(false)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    !formData.is_available
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Not Available</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.availability_notes}
                onChange={handleNotesChange}
                rows={4}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                placeholder="e.g., Available Tuesday and Thursday evenings, or Out of town for work..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Availability'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PlayerAvailabilityForm;
