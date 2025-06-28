import React, { useState, useEffect } from 'react';
import { Search, MapPin, Flag, Loader2, X } from 'lucide-react';
import GolfAPI, { GolfCourse, CourseDetails } from '../services/golfApi';

interface CourseSelectorProps {
  onCourseSelect: (course: CourseDetails) => void;
  onClose: () => void;
  apiKey: string;
}

const CourseSelector: React.FC<CourseSelectorProps> = ({ onCourseSelect, onClose, apiKey }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'location'>('name');
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseDetails | null>(null);
  const [apiRequestsLeft, setApiRequestsLeft] = useState<string>('0');

  const golfApi = new GolfAPI(apiKey);

  const searchCourses = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setCourses([]);

    try {
      let response;
      
      if (searchType === 'name') {
        response = await golfApi.searchCourses({ name: searchTerm });
      } else {
        // For location search, we'll use city for now
        // In a real app, you might want to use geolocation or address lookup
        response = await golfApi.searchCourses({ city: searchTerm });
      }

      setCourses(response.courses || []);
      setApiRequestsLeft(response.apiRequestsLeft || '0');
    } catch (err: any) {
      setError(err.message || 'Failed to search courses');
      console.error('Course search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCourseDetails = async (courseId: string) => {
    setLoading(true);
    setError(null);

    try {
      const courseDetails = await golfApi.getCourse(courseId);
      setSelectedCourse(courseDetails);
      setApiRequestsLeft(courseDetails.apiRequestsLeft || '0');
    } catch (err: any) {
      setError(err.message || 'Failed to get course details');
      console.error('Course details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: CourseDetails) => {
    onCourseSelect(course);
    onClose();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchCourses();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-2">
              <Flag className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Golf Course</h2>
              <p className="text-sm text-gray-600">Search for a course to get par values and course details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Form */}
        <div className="p-6 border-b border-gray-200">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'name' | 'location')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="name">Course Name</option>
                  <option value="location">Location (City)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {searchType === 'name' ? 'Course Name' : 'City'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchType === 'name' ? 'e.g., Pebble Beach' : 'e.g., Pebble Beach, CA'}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading || !searchTerm.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* API Requests Info */}
          <div className="mt-4 text-sm text-gray-600">
            API requests remaining: {apiRequestsLeft}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-6">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            </div>
          )}

          {loading && !courses.length && (
            <div className="p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
              <p className="mt-2 text-gray-600">Searching for courses...</p>
            </div>
          )}

          {!loading && !error && courses.length > 0 && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Found {courses.length} course{courses.length !== 1 ? 's' : ''}
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {courses.map((course) => (
                  <div
                    key={course.courseID}
                    className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer"
                    onClick={() => getCourseDetails(course.courseID)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{course.courseName}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {course.courseName}
                          </span>
                          <span>{course.numHoles} holes</span>
                          {course.hasGPS && (
                            <span className="text-green-600">GPS Available</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            getCourseDetails(course.courseID);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCourse && (
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedCourse.courseName}</h4>
                    <p className="text-gray-600">{selectedCourse.clubName}</p>
                    <p className="text-gray-600">{selectedCourse.address}</p>
                    <p className="text-gray-600">{selectedCourse.city}, {selectedCourse.state} {selectedCourse.postalCode}</p>
                  </div>
                  
                  <div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Holes:</span> {selectedCourse.numHoles}
                      </div>
                      <div>
                        <span className="font-medium">Par:</span> {selectedCourse.parsMen?.reduce((a, b) => a + b, 0) || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Rating:</span> {selectedCourse.tees?.[0]?.courseRatingMen || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Slope:</span> {selectedCourse.tees?.[0]?.slopeMen || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedCourse.parsMen && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Par Values (Men)</h5>
                    <div className="grid grid-cols-9 gap-1 text-sm">
                      {selectedCourse.parsMen.map((par, index) => (
                        <div key={index} className="text-center p-2 bg-white rounded border">
                          <div className="font-medium">{index + 1}</div>
                          <div className="text-green-600">{par}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => handleCourseSelect(selectedCourse)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Use This Course
                  </button>
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Search
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseSelector; 