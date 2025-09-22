import React, { useState, useEffect } from 'react';
import { Plus, Save } from 'lucide-react';
import { getUsers, addAdminScorecard, getSimulatorCourses } from '../services/api';
import { toast } from 'react-toastify';

interface AdminRoundAdderProps {
  onRoundsAdded: () => void;
}

interface User {
  member_id: number;
  first_name?: string;
  last_name?: string;
  email_address?: string;
  club?: string;
  handicap?: number;
}

interface SimulatorCourse {
  id: number;
  name: string;
  location?: string;
  designer?: string;
  platforms?: string[];
  elevation?: number;
  course_types: string[];
}

const AdminRoundAdder: React.FC<AdminRoundAdderProps> = ({ onRoundsAdded }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [simulatorCourses, setSimulatorCourses] = useState<SimulatorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Search states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<SimulatorCourse[]>([]);
  const [courseSearchLoading, setCourseSearchLoading] = useState(false);
  
  // Form state
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState<number | ''>('');
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(9);
  const [notes, setNotes] = useState('');
  const [roundType, setRoundType] = useState('sim');
  const [selectedCourse, setSelectedCourse] = useState<SimulatorCourse | null>(null);
  const [teebox, setTeebox] = useState('');
  const [courseRating, setCourseRating] = useState<number | ''>('');
  const [courseSlope, setCourseSlope] = useState<number | ''>('');
  const [handicap, setHandicap] = useState<number | ''>('');
  const [datePlayed, setDatePlayed] = useState(new Date().toISOString().split('T')[0]);

  // Helper function to ensure we always have an array
  const safeArray = (arr: any): any[] => {
    if (Array.isArray(arr)) return arr;
    if (arr && typeof arr === 'object') {
      if (arr.courses && Array.isArray(arr.courses)) return arr.courses;
      if (arr.data && Array.isArray(arr.data)) return arr.data;
    }
    return [];
  };

  // Filter users based on search term
  const filteredUsers = safeArray(users).filter(user => 
    (user.first_name?.toLowerCase() || '').includes(userSearchTerm.toLowerCase()) ||
    (user.last_name?.toLowerCase() || '').includes(userSearchTerm.toLowerCase()) ||
    (user.email_address?.toLowerCase() || '').includes(userSearchTerm.toLowerCase()) ||
    (user.club?.toLowerCase() || '').includes(userSearchTerm.toLowerCase())
  );

  // Handle user search
  const handleUserSearchChange = (value: string) => {
    setUserSearchTerm(value);
    setShowUserDropdown(true);
    if (!value) {
      setSelectedUser(null);
    }
  };

  // Handle course search with debounce
  const handleCourseSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setFilteredCourses([]);
      return;
    }

    try {
      setCourseSearchLoading(true);
      const response = await getSimulatorCourses(searchTerm, undefined, 50);
      setFilteredCourses(safeArray(response.data.courses));
    } catch (error) {
      console.error('Error searching courses:', error);
      setFilteredCourses([]);
    } finally {
      setCourseSearchLoading(false);
    }
  };

  // Debounced course search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleCourseSearch(courseSearchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [courseSearchTerm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
      if (!target.closest('.course-dropdown-container')) {
        setShowCourseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersResponse, coursesResponse] = await Promise.all([
          getUsers(),
          getSimulatorCourses(undefined, undefined, 50)
        ]);
        
        setUsers(safeArray(usersResponse.data));
        setSimulatorCourses(safeArray(coursesResponse.data.courses));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user.member_id);
    setUserSearchTerm(`${user.first_name || ''} ${user.last_name || ''}`.trim());
    setShowUserDropdown(false);
  };

  // Handle course selection
  const handleCourseSelect = (course: SimulatorCourse) => {
    setSelectedCourse(course);
    setCourseSearchTerm(course.name);
    setShowCourseDropdown(false);
    setCourseRating('');
    setCourseSlope('');
    setTeebox('');
  };

  // Handle total score change
  const handleTotalScoreChange = (value: string) => {
    const numValue = parseInt(value) || '';
    setTotalScore(numValue);
  };

  // Add scorecard
  const handleAddScorecard = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    if (!totalScore || totalScore <= 0) {
      toast.error('Please enter a valid total score');
      return;
    }

    try {
      setSaving(true);
      const scorecardData = {
        user_id: selectedUser,
        hole_scores: Array(holesPlayed).fill(0), // Create array based on holes played
        total_score: Number(totalScore),
        notes,
        round_type: roundType,
        course_id: selectedCourse?.id,
        course_name: selectedCourse?.name || '',
        teebox,
        course_rating: courseRating ? Number(courseRating) : undefined,
        course_slope: courseSlope ? Number(courseSlope) : undefined,
        handicap: handicap ? Number(handicap) : 0,
        date_played: datePlayed
      };

      await addAdminScorecard(scorecardData);
      toast.success('Scorecard added successfully');
      
      // Reset form
      setSelectedUser(null);
      setUserSearchTerm('');
      setTotalScore('');
      setHolesPlayed(9);
      setNotes('');
      setSelectedCourse(null);
      setCourseSearchTerm('');
      setTeebox('');
      setCourseRating('');
      setCourseSlope('');
      setHandicap('');
      setDatePlayed(new Date().toISOString().split('T')[0]);
      
      onRoundsAdded();
    } catch (error: any) {
      console.error('Error adding scorecard:', error);
      toast.error(`Failed to add scorecard: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-brand-black">Admin Scorecard Adder</h3>
          <p className="text-sm text-neutral-600">
            Add scorecards for handicap tracking
          </p>
        </div>
      </div>

      {/* Scorecard Form */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-brand-black mb-4">Add Scorecard</h4>
          
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Selection */}
          <div className="relative user-dropdown-container">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select User *
            </label>
            <input
              type="text"
              value={userSearchTerm}
              onChange={(e) => handleUserSearchChange(e.target.value)}
              onFocus={() => setShowUserDropdown(true)}
              placeholder="Search by name, club, or email..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            />
            {showUserDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.slice(0, 50).map(user => (
                    <div
                      key={user.member_id}
                      onClick={() => handleUserSelect(user)}
                      className="px-3 py-2 hover:bg-neutral-100 cursor-pointer border-b border-neutral-100 last:border-b-0"
                    >
                      <div className="font-medium text-neutral-900">
                        {user.first_name || ''} {user.last_name || ''}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {user.club || 'No club'} • {user.email_address || 'No email'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-neutral-500 text-sm">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date Played */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Date Played
            </label>
            <input
              type="date"
              value={datePlayed}
              onChange={(e) => setDatePlayed(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>

          {/* Course Selection */}
          <div className="relative course-dropdown-container">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Course
            </label>
            <input
              type="text"
              value={courseSearchTerm}
              onChange={(e) => setCourseSearchTerm(e.target.value)}
              onFocus={() => setShowCourseDropdown(true)}
              placeholder="Search courses by name, location, or designer..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            />
            {showCourseDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {courseSearchLoading ? (
                  <div className="px-3 py-2 text-neutral-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-neon-green mr-2"></div>
                    Searching courses...
                  </div>
                ) : filteredCourses.length > 0 ? (
                  filteredCourses.map(course => (
                    <div
                      key={course.id}
                      onClick={() => handleCourseSelect(course)}
                      className="px-3 py-2 hover:bg-neutral-100 cursor-pointer border-b border-neutral-100 last:border-b-0"
                    >
                      <div className="font-medium text-neutral-900">
                        {course.name}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {course.location && `${course.location} • `}
                        {course.designer && `${course.designer} • `}
                        {course.platforms?.join(', ')}
                      </div>
                    </div>
                  ))
                ) : courseSearchTerm.length >= 2 ? (
                  <div className="px-3 py-2 text-neutral-500">
                    No courses found
                  </div>
                ) : (
                  <div className="px-3 py-2 text-neutral-500">
                    Type at least 2 characters to search
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Round Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Round Type
            </label>
            <select
              value={roundType}
              onChange={(e) => setRoundType(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="sim">Simulator</option>
              <option value="grass">Grass</option>
            </select>
          </div>

          {/* Teebox */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Teebox
            </label>
            <input
              type="text"
              value={teebox}
              onChange={(e) => setTeebox(e.target.value)}
              placeholder="e.g., Blue, White, Red"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>

          {/* Handicap */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Handicap
            </label>
            <input
              type="number"
              step="0.1"
              value={handicap}
              onChange={(e) => setHandicap(Number(e.target.value) || '')}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>

          {/* Course Rating */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Course Rating
            </label>
            <input
              type="number"
              step="0.1"
              value={courseRating}
              onChange={(e) => setCourseRating(Number(e.target.value) || '')}
              placeholder="72.0"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>

          {/* Course Slope */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Course Slope
            </label>
            <input
              type="number"
              value={courseSlope}
              onChange={(e) => setCourseSlope(Number(e.target.value) || '')}
              placeholder="113"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
        </div>

        {/* Score Input */}
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Total Score *
              </label>
              <input
                type="number"
                min="1"
                value={totalScore || ''}
                onChange={(e) => handleTotalScoreChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
                placeholder="Enter total score"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Holes Played
              </label>
              <select
                value={holesPlayed}
                onChange={(e) => setHolesPlayed(Number(e.target.value) as 9 | 18)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
              >
                <option value={9}>9 Holes</option>
                <option value={18}>18 Holes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes about the round..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-brand-neon-green focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleAddScorecard}
            disabled={saving || !selectedUser || !totalScore}
            className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Add Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRoundAdder;