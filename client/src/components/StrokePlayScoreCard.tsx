import React, { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, Target, TrendingUp, Award } from 'lucide-react';
import ParValueInputModal from './ParValueInputModal';
import { updateCourseParValues } from '../services/api';
import { useAuth } from '../AuthContext';
import { calculateHandicapDifferential } from '../utils/handicapUtils';

interface StrokePlayScoreCardProps {
  onClose?: () => void;
  onSave?: (scoreCard: any) => void;
  userInfo?: {
    name: string;
    handicap: number;
  };
  holes?: number;
  course?: {
    id?: number;
    name: string;
    location?: string;
    designer?: string;
    par_values?: number[];
    teeboxData?: {
      teebox: string;
      courseRating: number | null;
      courseSlope: number | null;
    };
  };
  nineType?: 'front' | 'back' | null;
}

interface HoleScore {
  hole: number;
  strokes: number;
  par?: number;
}

interface PlayerInfo {
  name: string;
  date: string;
  handicap: number;
}

const StrokePlayScoreCard: React.FC<StrokePlayScoreCardProps> = ({ onClose, onSave, userInfo, holes = 18, course, nineType }) => {
  const { user } = useAuth();
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    handicap: 0
  });

  // Auto-populate with user info if provided
  useEffect(() => {
    if (userInfo) {
      setPlayerInfo(prev => ({
        ...prev,
        name: userInfo.name || prev.name,
        handicap: userInfo.handicap || prev.handicap
      }));
    }
  }, [userInfo]);

  const [holesState, setHolesState] = useState<HoleScore[]>(
    Array.from({ length: holes }, (_, i) => ({
      hole: i + 1,
      strokes: 0
    }))
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showParValueModal, setShowParValueModal] = useState(false);
  const hasShownParModal = useRef(false);

  // Par values - can be overridden by course data in the future
  const getParValues = () => {
    // If course has par data, use it
    if (course?.par_values) {
      return course.par_values;
    }
    
    // Default realistic par values for 18 holes
    const defaultPar18 = [4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 3, 4, 4, 4];
    
    // For 9 holes, use first 9 holes
    if (holes === 9) {
      return defaultPar18.slice(0, 9);
    }
    
    return defaultPar18;
  };

  const parValues = (() => {
    const allParValues = getParValues();
    if (nineType === 'front') return allParValues.slice(0, 9);
    if (nineType === 'back') return allParValues.slice(9, 18);
    return allParValues;
  })();

  // Check if we need to show the par value modal
  useEffect(() => {
    if (course && !course.par_values && !hasShownParModal.current) {
      // Only show the modal if user is logged in
      if (user) {
        setShowParValueModal(true);
        hasShownParModal.current = true;
      } else {
        // If user is not logged in, show a message that they need to log in to set par values
        alert('You need to be logged in to set par values for this course. Please log in and try again.');
        hasShownParModal.current = true;
      }
    }
  }, [course, user]);

  const totalStrokes = holesState.reduce((sum, hole) => sum + hole.strokes, 0);
  const totalPar = parValues.reduce((sum, par) => sum + par, 0);
  const scoreToPar = totalStrokes - totalPar;

  // Calculate handicap differential if course rating and slope are available
  const handicapDifferential = calculateHandicapDifferential(
    totalStrokes,
    course?.teeboxData?.courseRating || 0,
    course?.teeboxData?.courseSlope || 0,
    holes // pass holes (9 or 18)
  );

  const updatePlayerInfo = (field: keyof PlayerInfo, value: string | number) => {
    setPlayerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateHoleScore = (holeNumber: number, strokes: number) => {
    setHolesState(prev => prev.map(hole => 
      hole.hole === holeNumber ? { ...hole, strokes: Math.max(0, strokes) } : hole
    ));
  };

  const resetScoreCard = () => {
    if (window.confirm('Are you sure you want to reset the scorecard? This will clear all scores.')) {
      setHolesState(Array.from({ length: holes }, (_, i) => ({
        hole: i + 1,
        strokes: 0
      })));
      setErrors([]);
    }
  };

  const validateScoreCard = () => {
    const errors: string[] = [];
    
    if (!playerInfo.name.trim()) {
      errors.push('Player name is required');
    }
    
    if (!playerInfo.date) {
      errors.push('Date is required');
    }
    
    const holesWithScores = holesState.filter(hole => hole.strokes > 0).length;
    if (holesWithScores === 0) {
      errors.push('At least one hole must have a score');
    }
    
    // Check if handicap differential can be calculated
    if (totalStrokes > 0 && handicapDifferential === null) {
      errors.push('Handicap differential cannot be calculated. Please ensure course rating and slope are available.');
    }
    
    return errors;
  };

  const handleSave = async () => {
    console.log('Starting StrokePlay save process...'); // Debug log
    console.log('Current data:', { playerInfo, holes: holesState, totalStrokes, totalPar, scoreToPar, handicapDifferential }); // Debug log
    
    const validationErrors = validateScoreCard();
    console.log('Validation errors:', validationErrors); // Debug log
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      console.log('Validation failed, not saving'); // Debug log
      return;
    }

    setIsSaving(true);
    try {
      console.log('Calling onSave with stroke play data...'); // Debug log
      if (onSave) {
        // Include teebox data in the scorecard data
        const scoreCardWithTeebox = {
          playerInfo,
          holes: holesState,
          totalStrokes,
          totalPar,
          scoreToPar,
          type: 'stroke_play',
          teebox: course?.teeboxData?.teebox,
          course_rating: course?.teeboxData?.courseRating,
          course_slope: course?.teeboxData?.courseSlope,
          handicap_differential: handicapDifferential // Add the calculated differential
        };
        console.log('Scorecard data being sent:', scoreCardWithTeebox); // Debug log
        await onSave(scoreCardWithTeebox);
      }
      setErrors([]);
      console.log('StrokePlay save completed successfully'); // Debug log
    } catch (err) {
      console.error('StrokePlay save failed with error:', err); // Debug log
      setErrors(['Failed to save scorecard']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveParValues = async (parValues: number[]) => {
    try {
      if (course?.id) {
        console.log('Saving par values:', { courseId: course.id, parValues });
        await updateCourseParValues(course.id, parValues);
        // Update the course object with the new par values
        if (course) {
          course.par_values = parValues;
        }
      }
      setShowParValueModal(false);
    } catch (error: any) {
      console.error('Error saving par values:', error);
      console.error('Error response:', error.response);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        alert('You need to be logged in to save par values. Please log in and try again.');
      } else if (error.response?.status === 403) {
        alert('You do not have permission to save par values for this course.');
      } else if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert('Failed to save par values. Please try again.');
      }
    }
  };

  const getScoreColor = (strokes: number, par: number) => {
    if (strokes === 0) return 'text-gray-400';
    if (strokes === par) return 'text-green-600';
    if (strokes === par - 1) return 'text-blue-600';
    if (strokes === par - 2) return 'text-purple-600';
    if (strokes === par + 1) return 'text-orange-600';
    if (strokes >= par + 2) return 'text-red-600';
    return 'text-gray-900';
  };

  const getScoreLabel = (strokes: number, par: number) => {
    if (strokes === 0) return '';
    if (strokes === par - 2) return 'EAGLE';
    if (strokes === par - 1) return 'BIRDIE';
    if (strokes === par) return 'PAR';
    if (strokes === par + 1) return 'BOGEY';
    if (strokes === par + 2) return 'DOUBLE';
    return `+${strokes - par}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-full p-3">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-brand-black">Stroke Play Scorecard</h1>
              <p className="text-brand-muted-green">Traditional golf scoring</p>
              {course && (
                <div className="mt-2 text-sm text-gray-600">
                  <div className="font-medium">{course.name}</div>
                  {(course.location || course.designer) && (
                    <div className="text-gray-500">
                      {course.location && <span>{course.location}</span>}
                      {course.location && course.designer && <span> • </span>}
                      {course.designer && <span>by {course.designer}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={resetScoreCard}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-brand-neon-green/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Round'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Score Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Strokes</div>
                <div className="text-2xl font-bold text-gray-900">{totalStrokes}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Par</div>
                <div className="text-2xl font-bold text-blue-600">{totalPar}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Score to Par</div>
                <div className={`text-2xl font-bold ${scoreToPar > 0 ? 'text-red-600' : scoreToPar < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar}
                </div>
              </div>
              {handicapDifferential !== null && (
                <div className="text-center">
                  <div className="text-sm text-gray-600">Handicap Differential</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {handicapDifferential.toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          </div>
          {handicapDifferential === null && totalStrokes > 0 && course?.teeboxData && (
            <div className="mt-3 text-sm text-gray-600">
              <div className="flex items-center justify-center space-x-4">
                <span>Course Rating: {course.teeboxData.courseRating}</span>
                <span>Slope: {course.teeboxData.courseSlope}</span>
                <span>Teebox: {course.teeboxData.teebox}</span>
              </div>
              <div className="mt-2 text-center">
                <span className="text-orange-600 font-medium">✓ Handicap differential will be calculated on submission</span>
              </div>
            </div>
          )}
          {handicapDifferential === null && totalStrokes > 0 && !course?.teeboxData && (
            <div className="mt-3 text-sm text-red-600 text-center">
              <span className="font-medium">⚠️ Handicap differential cannot be calculated - missing course rating and slope data</span>
            </div>
          )}
        </div>
      </div>

      {/* Player Information */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-brand-black mb-4">Player Information</h2>
        
        {errors.length > 0 && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player Name *
            </label>
            <input
              type="text"
              value={playerInfo.name}
              onChange={(e) => updatePlayerInfo('name', e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={playerInfo.date}
              onChange={(e) => updatePlayerInfo('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Handicap
            </label>
            <input
              type="number"
              value={playerInfo.handicap}
              onChange={(e) => updatePlayerInfo('handicap', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              max="54"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Scorecard Table */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Scorecard
        </h2>

        {/* Table Header */}
        <div className="grid grid-cols-6 gap-2 items-center py-3 border-b-2 border-gray-200 font-semibold text-gray-700">
          <div className="text-center">Hole</div>
          <div className="text-center">Par</div>
          <div className="text-center">Strokes</div>
          <div className="text-center">Score</div>
          <div className="text-center">To Par</div>
          <div className="text-center">Running Total</div>
        </div>

        {/* Score Rows */}
        <div className="space-y-1">
          {holesState.map((hole, index) => {
            const par = parValues[hole.hole - 1];
            const runningTotal = holesState.slice(0, index + 1).reduce((sum, h) => sum + h.strokes, 0);
            const runningToPar = holesState.slice(0, index + 1).reduce((sum, h, i) => sum + (h.strokes - parValues[i]), 0);
            
            return (
              <div key={hole.hole} className="grid grid-cols-6 gap-2 items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="text-center font-semibold text-gray-700">{hole.hole}</div>
                <div className="text-center text-gray-600">{par}</div>
                <div className="text-center">
                  <input
                    type="number"
                    value={hole.strokes || ''}
                    onChange={(e) => updateHoleScore(hole.hole, parseInt(e.target.value) || 0)}
                    className="w-16 text-center border border-gray-300 rounded-lg py-1 focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    min="0"
                    max="20"
                  />
                </div>
                <div className="text-center">
                  {hole.strokes > 0 && (
                    <div className={`font-bold ${getScoreColor(hole.strokes, par)}`}>
                      {hole.strokes}
                      {getScoreLabel(hole.strokes, par) && (
                        <div className="text-xs font-normal">{getScoreLabel(hole.strokes, par)}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  {hole.strokes > 0 && (
                    <span className={`font-semibold ${hole.strokes > par ? 'text-red-600' : hole.strokes < par ? 'text-green-600' : 'text-gray-900'}`}>
                      {hole.strokes > par ? `+${hole.strokes - par}` : hole.strokes < par ? `-${par - hole.strokes}` : 'E'}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  {hole.strokes > 0 && (
                    <span className="font-semibold text-gray-900">{runningTotal}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2" />
          Final Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalStrokes}</div>
            <div className="text-sm text-gray-600">Total Strokes</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalPar}</div>
            <div className="text-sm text-gray-600">Total Par</div>
          </div>
          <div className="bg-brand-neon-green/10 rounded-lg p-4 text-center">
            <div className={`text-3xl font-bold ${scoreToPar > 0 ? 'text-red-600' : scoreToPar < 0 ? 'text-green-600' : 'text-brand-black'}`}>
              {scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar}
            </div>
            <div className="text-sm text-gray-600">Score to Par</div>
          </div>
          {handicapDifferential !== null && (
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {handicapDifferential.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Handicap Differential</div>
            </div>
          )}
        </div>
        {handicapDifferential !== null && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-sm text-purple-700">
              <div className="font-medium mb-1">Handicap Differential Details:</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div>Course Rating: <span className="font-semibold">{course?.teeboxData?.courseRating}</span></div>
                <div>Course Slope: <span className="font-semibold">{course?.teeboxData?.courseSlope}</span></div>
                <div>Teebox: <span className="font-semibold">{course?.teeboxData?.teebox}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Par Value Input Modal */}
      <ParValueInputModal
        isOpen={showParValueModal}
        onClose={() => setShowParValueModal(false)}
        onSave={handleSaveParValues}
        courseName={course?.name || 'Unknown Course'}
        holes={holes as 9 | 18}
      />
    </div>
  );
};

export default StrokePlayScoreCard; 