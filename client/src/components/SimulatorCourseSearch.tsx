import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, Loader2, Trophy } from 'lucide-react';
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
}

const SimulatorCourseSearch: React.FC<SimulatorCourseSearchProps> = ({
  onCourseSelect,
  onClose,
  selectedCourseId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = courses.filter(
        course =>
          course.name.toLowerCase().includes(searchLower) ||
          course.location?.toLowerCase().includes(searchLower) ||
          course.designer?.toLowerCase().includes(searchLower)
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, courses]);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSimulatorCourses();
      setCourses(response.data);
      setFilteredCourses(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    onCourseSelect(course);
    onClose();
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
              <h2 className="text-xl font-bold text-brand-black">Select Course</h2>
              <p className="text-sm text-neutral-600">Search from available simulator courses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
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
          </div>
          <div className="mt-2 text-sm text-neutral-600">
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-neon-green" />
              <p className="mt-2 text-neutral-600">Loading courses...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!loading && !error && filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-600">No courses found matching your search</p>
            </div>
          )}

          {!loading && !error && filteredCourses.length > 0 && (
            <div className="space-y-3">
              {filteredCourses.map((course) => (
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
      </div>
    </div>
  );
};

export default SimulatorCourseSearch;
