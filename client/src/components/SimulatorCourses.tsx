import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

interface CombinedCourse {
  id: number;
  name: string;
  platforms: string[];
  gspro_id?: number;
  trackman_id?: number;
  location?: string;
  designer?: string;
  elevation?: number;
  course_types: string[];
}

interface SimulatorStats {
  total_courses: number;
  gspro_courses: number;
  trackman_courses: number;
  shared_courses: number;
  unique_gspro: number;
  unique_trackman: number;
}

const SimulatorCourses: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CombinedCourse[]>([]);
  const [stats, setStats] = useState<SimulatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCourseType, setSelectedCourseType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [servers, setServers] = useState<string[]>([]);
  const [designers, setDesigners] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const coursesPerPage = 24;

  const courseTypes = [
    { key: 'par3', label: 'Par 3', icon: '🏌️' },
    { key: 'beginner', label: 'Beginner', icon: '🎯' },
    { key: 'coastal', label: 'Coastal', icon: '🌊' },
    { key: 'desert', label: 'Desert', icon: '🏜️' },
    { key: 'fantasy', label: 'Fantasy', icon: '✨' },
    { key: 'heathland', label: 'Heathland', icon: '🌿' },
    { key: 'historic', label: 'Historic', icon: '🏛️' },
    { key: 'links', label: 'Links', icon: '🏖️' },
    { key: 'major_venue', label: 'Major Venue', icon: '🏆' },
    { key: 'mountain', label: 'Mountain', icon: '⛰️' },
    { key: 'parkland', label: 'Parkland', icon: '🌳' },
    { key: 'tour_stop', label: 'Tour Stop', icon: '🎪' },
    { key: 'training', label: 'Training', icon: '🎓' },
    { key: 'tropical', label: 'Tropical', icon: '🌴' }
  ];

  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCourses();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedPlatform, selectedServer, selectedDesigner, selectedLocation, selectedCourseType, currentPage]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/simulator-courses/stats');
      const stats = await response.json();
      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await fetch('/api/gspro-courses/filters');
      const filters = await response.json();
      setServers(filters.servers || []);
      setDesigners(filters.designers || []);
      setLocations(filters.locations || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchCourses = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        limit: coursesPerPage.toString(),
        offset: ((currentPage - 1) * coursesPerPage).toString()
      });
      if (searchTerm) params.append('search', searchTerm);
      if (selectedPlatform !== 'all') {
        if (selectedPlatform === 'both') {
          params.append('platform', 'shared');
        } else {
          params.append('platform', selectedPlatform);
        }
      }
      if (selectedServer) params.append('server', selectedServer);
      if (selectedDesigner) params.append('designer', selectedDesigner);
      if (selectedLocation) params.append('location', selectedLocation);
      if (selectedCourseType) params.append('courseType', selectedCourseType);
      
      const response = await fetch(`/api/simulator-courses?${params}`);
      const data = await response.json();
      setCourses(data.courses);
      setTotalCourses(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPlatform('all');
    setSelectedServer('');
    setSelectedDesigner('');
    setSelectedLocation('');
    setSelectedCourseType('');
    setCurrentPage(1);
  };

  const shouldShowGsproFilters = () => {
    return selectedPlatform === 'all' || selectedPlatform === 'gspro' || selectedPlatform === 'both';
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedPlatform !== 'all') count++;
    if (selectedServer) count++;
    if (selectedDesigner) count++;
    if (selectedLocation) count++;
    if (selectedCourseType) count++;
    return count;
  };

  const getPlatformIcon = (platform: string) => {
    return platform === 'GSPro' ? '🎮' : '📊';
  };

  const getPlatformColor = (platform: string) => {
    return platform === 'GSPro' ? 'blue' : 'purple';
  };

  if (loading && courses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto"></div>
            <p className="mt-6 text-lg text-gray-600">Loading simulator courses...</p>
            <p className="mt-2 text-sm text-gray-500">Discovering amazing golf courses</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Simulator Courses</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore {stats?.total_courses || 0} golf courses available on GSPro and Trackman simulators
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div 
              className={`relative p-6 rounded-xl cursor-pointer stats-card ${
                selectedPlatform === 'all' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg active' 
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
              onClick={() => setSelectedPlatform('all')}
            >
              <div className="text-3xl font-bold">{stats.total_courses.toLocaleString()}</div>
              <div className="text-sm opacity-90">All Courses</div>
              {selectedPlatform === 'all' && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"></div>
              )}
            </div>
            <div 
              className={`relative p-6 rounded-xl cursor-pointer stats-card ${
                selectedPlatform === 'gspro' 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg active' 
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
              onClick={() => setSelectedPlatform('gspro')}
            >
              <div className="text-3xl font-bold">{stats.gspro_courses.toLocaleString()}</div>
              <div className="text-sm opacity-90">GSPro</div>
              {selectedPlatform === 'gspro' && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"></div>
              )}
            </div>
            <div 
              className={`relative p-6 rounded-xl cursor-pointer stats-card ${
                selectedPlatform === 'trackman' 
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg active' 
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
              onClick={() => setSelectedPlatform('trackman')}
            >
              <div className="text-3xl font-bold">{stats.trackman_courses.toLocaleString()}</div>
              <div className="text-sm opacity-90">Trackman</div>
              {selectedPlatform === 'trackman' && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"></div>
              )}
            </div>
            <div 
              className={`relative p-6 rounded-xl cursor-pointer stats-card ${
                selectedPlatform === 'both' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg active' 
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
              onClick={() => setSelectedPlatform('both')}
            >
              <div className="text-3xl font-bold">{stats.shared_courses.toLocaleString()}</div>
              <div className="text-sm opacity-90">Both</div>
              {selectedPlatform === 'both' && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"></div>
              )}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          {/* Search Bar */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search courses by name, location, or designer..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus-ring"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors focus-ring btn-hover-effect ${
                  showFilters 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Filters</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px]">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors focus-ring btn-hover-effect"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Server Filter */}
                {shouldShowGsproFilters() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Server</label>
                    <select
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">All Servers</option>
                      {servers.map((server) => (
                        <option key={server} value={server}>{server}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Designer Filter */}
                {shouldShowGsproFilters() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designer</label>
                    <select
                      value={selectedDesigner}
                      onChange={(e) => setSelectedDesigner(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">All Designers</option>
                      {designers.slice(0, 50).map((designer) => (
                        <option key={designer} value={designer}>{designer}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Location Filter */}
                {shouldShowGsproFilters() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">All Locations</option>
                      {locations.slice(0, 50).map((location) => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Course Type Filter */}
                {shouldShowGsproFilters() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Course Type</label>
                    <select
                      value={selectedCourseType}
                      onChange={(e) => setSelectedCourseType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">All Types</option>
                      {courseTypes.map((type) => (
                        <option key={type.key} value={type.key}>{type.icon} {type.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {searchLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <span>
                    Showing {courses.length} of {totalCourses.toLocaleString()} courses
                    {searchTerm && ` matching "${searchTerm}"`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {searchLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse skeleton-pulse">
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-md hover:shadow-xl course-card overflow-hidden group fade-in">
                <div className="p-6">
                  {/* Course Name and Platforms */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-green-600 transition-colors">
                      {course.name}
                    </h3>
                    <div className="flex flex-col gap-1 ml-2">
                      {course.platforms.map((platform) => (
                        <span
                          key={platform}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium platform-badge ${
                            platform === 'GSPro' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          <span className="mr-1">{getPlatformIcon(platform)}</span>
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="space-y-3 text-sm text-gray-600">
                    {course.location && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{course.location}</span>
                      </div>
                    )}
                    {course.designer && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate">{course.designer}</span>
                      </div>
                    )}
                    {course.elevation && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span>{course.elevation.toLocaleString()} ft</span>
                      </div>
                    )}
                  </div>

                  {/* Course Type Tags */}
                  {course.course_types && course.course_types.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1">
                        {course.course_types.slice(0, 3).map((type, index) => {
                          const typeInfo = courseTypes.find(t => t.key === type.replace(' ', '_'));
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {typeInfo?.icon && <span className="mr-1">{typeInfo.icon}</span>}
                              {type}
                            </span>
                          );
                        })}
                        {course.course_types.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{course.course_types.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2 bg-white rounded-lg shadow-md p-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors focus-ring ${
                      currentPage === page
                        ? 'bg-green-600 text-white'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* Empty State */}
        {courses.length === 0 && !loading && !searchLoading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulatorCourses; 