import React, { useState, useEffect } from 'react';
import { X, Target, Search, MapPin, Loader2, Info, ExternalLink, ArrowLeft } from 'lucide-react';
import { getSimulatorCourses, getCourseTeeboxData, updateCourseTeeboxData } from '../services/api';

interface SimulatorCourse {
  id: number;
  name: string;
  platforms: string[];
  location?: string;
  designer?: string;
  elevation?: number;
  course_types: string[];
  par_values?: number[];
}

interface TrackRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoundType: (roundType: 'sim', holes: 9 | 18, course: SimulatorCourse, nineType: 'front' | 'back' | null, teeboxData?: { teebox: string; courseRating: number | null; courseSlope: number | null }) => void;
}

const TrackRoundModal: React.FC<TrackRoundModalProps> = ({
  isOpen,
  onClose,
  onSelectRoundType
}) => {
  const [step, setStep] = useState<'holes' | 'course' | 'teebox'>('holes');
  const [selectedHoles, setSelectedHoles] = useState<9 | 18 | null>(null);
  const [nineType, setNineType] = useState<'front' | 'back' | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<SimulatorCourse | null>(null);
  const [courses, setCourses] = useState<SimulatorCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<SimulatorCourse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [teeboxData, setTeeboxData] = useState<{ teebox: string; courseRating: number | null; courseSlope: number | null } | null>(null);
  const [existingTeeboxData, setExistingTeeboxData] = useState<Array<{
    teebox: string;
    course_rating: number;
    course_slope: number;
    usage_count: number;
    last_used: string;
  }>>([]);
  const [loadingTeeboxData, setLoadingTeeboxData] = useState(false);

  // Teebox order and color map
  const TEEBOX_ORDER = ['Black', 'Blue', 'White', 'Green', 'Yellow', 'Red', 'Junior', 'PAR3'];
  const TEEBOX_COLORS: { [key: string]: string } = {
    Black: 'bg-gray-800 text-white border-gray-700',
    Blue: 'bg-blue-200 text-blue-900 border-blue-300',
    White: 'bg-white text-gray-900 border-gray-300',
    Green: 'bg-green-200 text-green-900 border-green-300',
    Yellow: 'bg-yellow-200 text-yellow-900 border-yellow-300',
    Red: 'bg-red-200 text-red-900 border-red-300',
    Junior: 'bg-cyan-200 text-cyan-900 border-cyan-300',
    PAR3: 'bg-purple-200 text-purple-900 border-purple-300',
  };

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = courses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.location && course.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (course.designer && course.designer.toLowerCase().includes(searchTerm.toLowerCase()))
      ).slice(0, 20);
      setFilteredCourses(filtered);
    } else {
      // Show popular courses when search is empty (first 30 courses)
      setFilteredCourses(courses.slice(0, 30));
    }
  }, [searchTerm, courses]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await getSimulatorCourses('', 'all', 10000);
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('holes');
    setSelectedHoles(null);
    setSelectedCourse(null);
    setSearchTerm('');
    setShowCourseDropdown(false);
    setTeeboxData(null);
    setExistingTeeboxData([]);
    onClose();
  };

  const handleHolesSelect = (holes: 9 | 18, nineType: 'front' | 'back' | null = null) => {
    setSelectedHoles(holes);
    setNineType(nineType);
    setStep('course');
  };

  const handleCourseSelect = async (course: SimulatorCourse) => {
    setSelectedCourse(course);
    setShowCourseDropdown(false);
    setSearchTerm(course.name);
    setTeeboxData({ teebox: '', courseRating: null, courseSlope: null });
    setStep('teebox');
    
    // Fetch existing teebox data for this course
    if (course.id) {
      setLoadingTeeboxData(true);
      try {
        const response = await getCourseTeeboxData(course.id);
        setExistingTeeboxData(response.data.teeboxData || []);
      } catch (error) {
        console.error('Error fetching teebox data:', error);
        setExistingTeeboxData([]);
      } finally {
        setLoadingTeeboxData(false);
      }
    }
  };

  const handleStartRound = async () => {
    if (selectedHoles && selectedCourse && teeboxData?.teebox && teeboxData.courseRating !== null && teeboxData.courseSlope !== null) {
      try {
        // Save teebox data immediately when starting the round
        console.log('Saving teebox data before starting round:', {
          courseId: selectedCourse.id,
          teebox: teeboxData.teebox,
          rating: teeboxData.courseRating,
          slope: teeboxData.courseSlope
        });
        
        await updateCourseTeeboxData(
          selectedCourse.id,
          teeboxData.teebox,
          teeboxData.courseRating,
          teeboxData.courseSlope
        );
        
        console.log('Teebox data saved successfully');
      } catch (error) {
        console.error('Error saving teebox data:', error);
        // Don't block the round from starting if teebox save fails
      }
      
      // Start the round regardless of teebox save success
      onSelectRoundType('sim', selectedHoles, selectedCourse, nineType, teeboxData);
    }
  };

  const handleBackToHoles = () => {
    setStep('holes');
    setSelectedCourse(null);
    setSearchTerm('');
    setTeeboxData(null);
    setExistingTeeboxData([]);
  };

  const handleBackToCourse = () => {
    setStep('course');
    setTeeboxData(null);
    setExistingTeeboxData([]);
  };

  // Helper to check if any teeboxes are missing ratings/slopes
  function hasMissingTeeboxRatings(teeboxData: typeof existingTeeboxData) {
    return teeboxData.some(t => !t.course_rating || !t.course_slope);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full flex flex-col ${
        step === 'course' 
          ? 'max-w-7xl max-h-[95vh]' 
          : 'max-w-2xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {(step === 'course' || step === 'teebox') && (
              <button
                onClick={step === 'course' ? handleBackToHoles : handleBackToCourse}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-bold text-brand-black">
              {step === 'holes' ? 'Track a Simulator Round' : 
               step === 'course' ? 'Change number of holes' : 'Change Course Selection'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 flex-1 overflow-y-auto ${
          step === 'course' ? 'min-h-[60vh]' : ''
        }`}>
          {step === 'holes' ? (
            <>
              <p className="text-gray-600 mb-6">
                How many holes are you playing today?
              </p>

              <div className="space-y-4 mb-6">
                {/* Main Full 18 Button */}
                <button
                  onClick={() => handleHolesSelect(18, null)}
                  className="w-full py-4 px-6 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <div className="rounded-full p-3 bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <span className="text-purple-600 font-bold text-lg">18</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 text-lg">Full Round</div>
                      <div className="text-sm text-gray-600">Complete 18-hole round</div>
                    </div>
                  </div>
                </button>

                {/* 9-Hole Options */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleHolesSelect(9, 'front')}
                    className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className="rounded-full p-2 bg-orange-100 group-hover:bg-orange-200 transition-colors">
                        <span className="text-orange-600 font-bold text-sm">F9</span>
                      </div>
                      <span className="font-medium text-gray-900">Front 9</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleHolesSelect(9, 'back')}
                    className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className="rounded-full p-2 bg-blue-100 group-hover:bg-blue-200 transition-colors">
                        <span className="text-blue-600 font-bold text-sm">B9</span>
                      </div>
                      <span className="font-medium text-gray-900">Back 9</span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          ) : step === 'course' ? (
            <>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select Your Course
                </h3>
                <p className="text-gray-600">
                  {selectedHoles} holes • Search from {courses.length.toLocaleString()} available courses
                </p>
              </div>

              {/* Course Search */}
              <div className="relative mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search courses by name, location, or designer..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowCourseDropdown(true);
                    }}
                    onFocus={() => setShowCourseDropdown(true)}
                    className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
                  {loading && (
                    <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
                  )}
                </div>

                {/* Course Dropdown */}
                {showCourseDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-[60vh] overflow-y-auto">
                    {filteredCourses.length > 0 ? (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-0">
                        {filteredCourses.map((course) => (
                          <div
                            key={course.id}
                            onClick={() => handleCourseSelect(course)}
                            className="px-6 py-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-semibold text-gray-900 text-base mb-1 truncate">{course.name}</div>
                            <div className="text-xs text-gray-600 flex items-center space-x-2 mb-2">
                              {course.location && (
                                <span className="flex items-center truncate">
                                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{course.location}</span>
                                </span>
                              )}
                              {course.designer && (
                                <span className="text-gray-500 truncate">by {course.designer}</span>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              {course.platforms.map((platform) => (
                                <span
                                  key={platform}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    platform === 'GSPro' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {platform}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchTerm.trim() ? (
                      <div className="px-6 py-8 text-center text-gray-500">
                        <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-lg">No courses found matching "{searchTerm}"</p>
                        <p className="text-sm mt-1">Try a different search term</p>
                      </div>
                    ) : (
                      <div className="px-6 py-8 text-center text-gray-500">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-300" />
                        <p className="text-lg">Loading courses...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Course Display */}
              {selectedCourse && (
                <div className="mb-6 p-6 bg-gradient-to-r from-brand-green/10 to-brand-blue/10 rounded-lg border border-brand-green/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-xl mb-2">{selectedCourse.name}</div>
                      <div className="text-sm text-gray-600 flex items-center space-x-4">
                        {selectedCourse.location && (
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {selectedCourse.location}
                          </span>
                        )}
                        {selectedCourse.designer && (
                          <span className="text-gray-500">by {selectedCourse.designer}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {selectedCourse.platforms.map((platform) => (
                        <span
                          key={platform}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            platform === 'GSPro' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : step === 'teebox' && selectedCourse ? (
            <>

              {/* Teebox Selection */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {existingTeeboxData.length > 0 ? 'Choose a Teebox' : 'Add a Teebox'}
                </h3>
                {loadingTeeboxData ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-gray-600">Loading teeboxes...</span>
                  </div>
                ) : existingTeeboxData.length > 0 ? (
                  <>
                    <div className="mb-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {existingTeeboxData
                          .slice()
                          .sort((a, b) => TEEBOX_ORDER.indexOf(a.teebox) - TEEBOX_ORDER.indexOf(b.teebox))
                          .map((item, index) => (
                            <button
                              key={index}
                              onClick={() => setTeeboxData({ 
                                teebox: item.teebox, 
                                courseRating: item.course_rating, 
                                courseSlope: item.course_slope 
                              })}
                              className={`px-3 py-2 border-2 rounded-lg text-center text-sm font-medium transition-colors ${
                                teeboxData?.teebox === item.teebox && 
                                teeboxData?.courseRating === item.course_rating && 
                                teeboxData?.courseSlope === item.course_slope
                                  ? 'border-brand-neon-green bg-brand-neon-green/10 text-brand-black'
                                  : `${TEEBOX_COLORS[item.teebox] || 'bg-gray-50 border-gray-200'} hover:border-gray-400'`
                              }`}
                            >
                              <div className="font-medium">{item.teebox}</div>
                              <div className="text-xs text-gray-500">
                                {item.course_rating}/{item.course_slope}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                    {/* Show tip for finding ratings - always show when there are existing teeboxes */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <div className="flex items-center space-x-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                          <span>Need help finding ratings? </span>
                          <a
                            href="https://simulatorgolftour.com/courses"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Visit SGT Course Database
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p>No teeboxes found for this course. Please enter the teebox, rating, and slope manually.</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 inline-block">
                      <div className="flex items-center space-x-2">
                        <Info className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        <div className="text-xs text-yellow-800">
                          <span>Need help finding ratings? </span>
                          <a
                            href="https://simulatorgolftour.com/courses"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Visit SGT Course Database
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Teebox dropdown for new teeboxes */}
                {(!teeboxData?.teebox || !existingTeeboxData.some(t => t.teebox === teeboxData.teebox)) && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {existingTeeboxData.length > 0 ? 'Add Another Teebox' : 'Select Teebox'}
                    </label>
                    <select
                      value={teeboxData?.teebox || ''}
                      onChange={(e) => setTeeboxData(prev => ({ 
                        teebox: e.target.value, 
                        courseRating: prev?.courseRating || null, 
                        courseSlope: prev?.courseSlope || null 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    >
                      <option value="">Select a teebox...</option>
                      {TEEBOX_ORDER.map(teebox => (
                        <option key={teebox} value={teebox}>
                          {teebox}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Course Rating and Slope - Only show for new teeboxes */}
              {(!existingTeeboxData.some(t => t.teebox === teeboxData?.teebox) && teeboxData?.teebox) && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Rating & Slope</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Rating
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="60"
                        max="80"
                        value={teeboxData?.courseRating || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? null : parseFloat(value);
                          setTeeboxData(prev => ({ 
                            teebox: prev?.teebox || '', 
                            courseRating: numValue, 
                            courseSlope: prev?.courseSlope || null 
                          }));
                        }}
                        placeholder="72.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent text-center text-lg font-semibold"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The expected score for a scratch golfer (typically 60-80)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Slope
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="55"
                        max="155"
                        value={teeboxData?.courseSlope || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? null : parseFloat(value);
                          setTeeboxData(prev => ({ 
                            teebox: prev?.teebox || '', 
                            courseRating: prev?.courseRating || null, 
                            courseSlope: numValue
                          }));
                        }}
                        placeholder="113"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent text-center text-lg font-semibold"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Difficulty rating relative to scratch (typically 55-155)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          {step === 'course' && selectedCourse && (
            <button
              onClick={handleStartRound}
              className="px-6 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium"
            >
              Continue
            </button>
          )}
          {step === 'teebox' && selectedCourse && teeboxData?.teebox && (
            existingTeeboxData.some(t => t.teebox === teeboxData.teebox) || 
            (teeboxData.courseRating !== null && teeboxData.courseSlope !== null)
          ) && (
            <button
              onClick={handleStartRound}
              className="px-6 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium"
            >
              Start Round
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackRoundModal; 