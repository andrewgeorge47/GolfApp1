import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, Loader2, Trophy, Trash2, Edit3 } from 'lucide-react';
import { getSimulatorCourses } from '../services/api';

interface Course {
  id: number;
  name: string;
  location?: string;
  par?: number;
  designer?: string;
  platforms?: string[];
}

interface SimulatorCourseSearchProps {
  onCourseSelect: (course: Course) => void;
  onClose: () => void;
  selectedCourseId?: number;
  selectedCourseName?: string;
  onCourseRemove?: () => void;
}

const SimulatorCourseSearch: React.FC<SimulatorCourseSearchProps> = ({
  onCourseSelect,
  onClose,
  selectedCourseId,
  selectedCourseName,
  onCourseRemove
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(2000);
  const [showSearch, setShowSearch] = useState(!selectedCourseId);

  const loadCourses = async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch with a higher limit, or all if search is empty
      const limit = search.trim() === '' ? 100 : 5000;
      const response = await getSimulatorCourses(search, '', limit);
      const coursesData = response.data.courses || [];
      setCourses(coursesData);
      setTotalCount(response.data.total || coursesData.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCourses(searchTerm);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleCourseSelect = (course: Course) => {
    onCourseSelect(course);
    onClose();
  };

  const handleRemoveCourse = () => {
    if (onCourseRemove) {
      onCourseRemove();
    }
    setShowSearch(true);
  };

  const handleChangeCourse = () => {
    setShowSearch(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-neon-green/10 rounded-full p-2">
              <Trophy className="w-6 h-6 text-brand-neon-green" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-black">
                {!showSearch && selectedCourseId ? 'Selected Course' : 'Select Course'}
              </h2>
              <p className="text-sm text-neutral-600">
                {!showSearch && selectedCourseId
                  ? 'Change or remove the course assignment'
                  : 'Search from available simulator courses'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Currently Selected Course Display */}
        {!showSearch && selectedCourseId && selectedCourseName && (
          <div className="p-6 border-b border-neutral-200">
            <div className="bg-brand-neon-green/10 border-2 border-brand-neon-green rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-brand-neon-green rounded-full p-3">
                    <Trophy className="w-8 h-8 text-brand-dark-green" />
                  </div>
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Current Course</div>
                    <h3 className="text-2xl font-bold text-brand-black">{selectedCourseName}</h3>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleChangeCourse}
                    className="flex items-center space-x-2 px-4 py-2 bg-brand-dark-green text-white rounded-lg hover:bg-brand-muted-green transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Change Course</span>
                  </button>
                  {onCourseRemove && (
                    <button
                      onClick={handleRemoveCourse}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Course</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {showSearch && (
        <div className="p-6 border-b border-neutral-200">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by course name, location, or designer..."
              className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              autoFocus
            />
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-neutral-400" />
            {loading && (
              <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-brand-neon-green" />
            )}
          </div>
          <div className="mt-2 text-sm text-neutral-600">
            {searchTerm.trim() === '' ? (
              <>Showing first 100 courses. Type to search all {totalCount.toLocaleString()}+ courses</>
            ) : (
              <>Found {courses.length.toLocaleString()} courses matching "{searchTerm}"</>
            )}
          </div>
        </div>
        )}

        {/* Content */}
        {showSearch && (
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!error && courses.length === 0 && !loading && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-600">
                {searchTerm.trim() === ''
                  ? 'Start typing to search for courses...'
                  : 'No courses found matching your search'}
              </p>
            </div>
          )}

          {!error && courses.length > 0 && (
            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`border rounded-lg p-4 hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all cursor-pointer ${
                    selectedCourseId === course.id
                      ? 'border-brand-neon-green bg-brand-neon-green/10'
                      : 'border-neutral-200'
                  }`}
                  onClick={() => handleCourseSelect(course)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-brand-black text-lg">
                        {course.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-neutral-600 mt-2">
                        {course.location && (
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {course.location}
                          </span>
                        )}
                        {course.par && (
                          <span className="flex items-center">
                            <Trophy className="w-4 h-4 mr-1" />
                            Par {course.par}
                          </span>
                        )}
                        {course.designer && (
                          <span className="text-neutral-500">
                            by {course.designer}
                          </span>
                        )}
                      </div>
                      {course.platforms && course.platforms.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {course.platforms.map((platform, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseSelect(course);
                      }}
                      className="px-4 py-2 bg-brand-neon-green text-brand-black font-medium rounded-lg hover:bg-green-400 transition-colors"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default SimulatorCourseSearch;
