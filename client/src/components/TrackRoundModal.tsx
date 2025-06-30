import React, { useState, useEffect } from 'react';
import { X, Target, Search, MapPin, Loader2 } from 'lucide-react';
import { getSimulatorCourses } from '../services/api';

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
  onSelectRoundType: (roundType: 'sim', holes: 9 | 18, course: SimulatorCourse, nineType: 'front' | 'back' | null) => void;
}

const TrackRoundModal: React.FC<TrackRoundModalProps> = ({
  isOpen,
  onClose,
  onSelectRoundType
}) => {
  const [step, setStep] = useState<'holes' | 'course'>('holes');
  const [selectedHoles, setSelectedHoles] = useState<9 | 18 | null>(null);
  const [nineType, setNineType] = useState<'front' | 'back' | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<SimulatorCourse | null>(null);
  const [courses, setCourses] = useState<SimulatorCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<SimulatorCourse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

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
      ).slice(0, 10);
      setFilteredCourses(filtered);
    } else {
      // Show popular courses when search is empty (first 20 courses)
      setFilteredCourses(courses.slice(0, 20));
    }
  }, [searchTerm, courses]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await getSimulatorCourses('', 'all', 1000);
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
    onClose();
  };

  const handleHolesSelect = (holes: 9 | 18, nineType: 'front' | 'back' | null = null) => {
    setSelectedHoles(holes);
    setNineType(nineType);
    setStep('course');
  };

  const handleCourseSelect = (course: SimulatorCourse) => {
    setSelectedCourse(course);
    setShowCourseDropdown(false);
    setSearchTerm(course.name);
  };

  const handleStartRound = () => {
    if (selectedHoles && selectedCourse) {
      onSelectRoundType('sim', selectedHoles, selectedCourse, nineType);
    }
  };

  const handleBackToHoles = () => {
    setStep('holes');
    setSelectedCourse(null);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {step === 'course' && (
              <button
                onClick={handleBackToHoles}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5 rotate-45" />
              </button>
            )}
            <h2 className="text-xl font-bold text-brand-black">
              {step === 'holes' ? 'Track a Simulator Round' : 'Select Course'}
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
        <div className="p-6">
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
          ) : (
            <>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Which course are you playing?
                </p>
                <p className="text-sm text-gray-500">
                  {selectedHoles} holes • Search for a course
                </p>
              </div>

              {/* Course Search */}
              <div className="relative mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowCourseDropdown(true);
                    }}
                    onFocus={() => setShowCourseDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                  )}
                </div>

                {/* Course Dropdown */}
                {showCourseDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => handleCourseSelect(course)}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{course.name}</div>
                          <div className="text-sm text-gray-600 flex items-center space-x-2">
                            {course.location && (
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {course.location}
                              </span>
                            )}
                            {course.designer && (
                              <span>by {course.designer}</span>
                            )}
                          </div>
                          <div className="flex space-x-1 mt-1">
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
                      ))
                    ) : searchTerm.trim() ? (
                      <div className="px-4 py-3 text-gray-500">
                        No courses found matching "{searchTerm}"
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-gray-500">
                        Loading courses...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Course Display */}
              {selectedCourse && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{selectedCourse.name}</div>
                  <div className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                    {selectedCourse.location && (
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {selectedCourse.location}
                      </span>
                    )}
                    {selectedCourse.designer && (
                      <span>by {selectedCourse.designer}</span>
                    )}
                  </div>
                  <div className="flex space-x-1 mt-2">
                    {selectedCourse.platforms.map((platform) => (
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
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200">
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
              Start Round
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackRoundModal; 