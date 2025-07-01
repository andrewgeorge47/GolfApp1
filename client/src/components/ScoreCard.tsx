import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Info, Circle, Target, TrendingUp, Award } from 'lucide-react';
import { useScoreCalculator } from '../hooks/useScoreCalculator';
import PlayerInfo from './PlayerInfo';
import ScoreRow from './ScoreRow';
import RulesModal from './RulesModal';
import ParValueInputModal from './ParValueInputModal';
import { updateCourseParValues } from '../services/api';
import { useAuth } from '../AuthContext';

interface ScoreCardProps {
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
      courseRating: number;
      courseSlope: number;
    };
  };
  nineType?: 'front' | 'back' | null;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ onClose, onSave, userInfo, holes = 18, course, nineType }) => {
  const { user } = useAuth();
  const {
    scoreCard,
    updatePlayerInfo,
    updateHoleScore,
    applyMulligan,
    revokeMulligan,
    getRemainingMulligans,
    validateScoreCard,
    resetScoreCard,
    getScoreStats,
    TOTAL_MULLIGANS,
    HOLES
  } = useScoreCalculator(holes);

  const [showRules, setShowRules] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showParValueModal, setShowParValueModal] = useState(false);

  const remainingMulligans = getRemainingMulligans();
  const scoreStats = getScoreStats();

  const handleSave = async () => {
    console.log('Starting save process...'); // Debug log
    console.log('Current scoreCard state:', scoreCard); // Debug log
    
    const validationErrors = validateScoreCard();
    console.log('Validation errors:', validationErrors); // Debug log
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      console.log('Validation failed, not saving'); // Debug log
      return;
    }

    setIsSaving(true);
    try {
      console.log('Calling onSave with scoreCard data...'); // Debug log
      if (onSave) {
        // Include teebox data in the scorecard data
        const scoreCardWithTeebox = {
          ...scoreCard,
          teebox: course?.teeboxData?.teebox,
          course_rating: course?.teeboxData?.courseRating,
          course_slope: course?.teeboxData?.courseSlope
        };
        await onSave(scoreCardWithTeebox);
      }
      setErrors([]);
      console.log('Save completed successfully'); // Debug log
    } catch (err) {
      console.error('Save failed with error:', err); // Debug log
      setErrors(['Failed to save scorecard']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the scorecard? This will clear all scores.')) {
      resetScoreCard();
      setErrors([]);
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
    if (course && !course.par_values && !showParValueModal) {
      // Only show the modal if user is logged in
      if (user) {
        setShowParValueModal(true);
      } else {
        // If user is not logged in, show a message that they need to log in to set par values
        alert('You need to be logged in to set par values for this course. Please log in and try again.');
      }
    }
  }, [course, showParValueModal, user]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 rounded-full p-3">
              <Circle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-brand-black">Mully Golf Scorecard</h1>
              <p className="text-brand-muted-green">Track your round with strategic mulligan usage</p>
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
              onClick={() => setShowRules(true)}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Info className="w-4 h-4 mr-2" />
              Rules
            </button>
            <button
              onClick={handleReset}
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

        {/* Mulligan Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Circle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Mulligans Remaining:</span>
                <span className={`text-2xl font-bold ${remainingMulligans > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remainingMulligans}
                </span>
                <span className="text-green-600">/ {TOTAL_MULLIGANS}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Strokes</div>
                <div className="text-xl font-bold text-gray-900">{scoreCard.totalStrokes}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Mulligans Used</div>
                <div className="text-xl font-bold text-green-600">{scoreCard.totalMulligans}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Final Score</div>
                <div className="text-2xl font-bold text-brand-black">{scoreCard.finalScore}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Information */}
      <PlayerInfo
        playerInfo={scoreCard.playerInfo}
        onUpdate={updatePlayerInfo}
        errors={errors}
        userInfo={userInfo}
      />

      {/* Scorecard Table */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Scorecard
        </h2>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 items-center py-3 border-b-2 border-gray-200 font-semibold text-gray-700">
          <div className="col-span-1 text-center">Hole</div>
          <div className="col-span-3 text-center">Strokes</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-3 text-center">Mulligans</div>
          <div className="col-span-1 text-center">Count</div>
          <div className="col-span-2 text-center">Total</div>
        </div>

        {/* Score Rows */}
        <div className="space-y-1">
          {scoreCard.holes.map((hole) => (
            <ScoreRow
              key={hole.hole}
              hole={hole}
              onUpdateStrokes={(value) => updateHoleScore(hole.hole, 'strokes', value)}
              onUseMulligan={() => applyMulligan(hole.hole)}
              onRemoveMulligan={() => revokeMulligan(hole.hole)}
              remainingMulligans={remainingMulligans}
              isPar={parValues[hole.hole - 1]}
            />
          ))}
        </div>
      </div>

      {/* Statistics */}
      {scoreStats && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Round Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{scoreStats.totalHoles}</div>
              <div className="text-sm text-gray-600">Holes Played</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{scoreStats.averageScore}</div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {scoreStats.bestHole.strokes}
              </div>
              <div className="text-sm text-gray-600">Best Hole (#{scoreStats.bestHole.hole})</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{scoreStats.mulliganEfficiency}%</div>
              <div className="text-sm text-gray-600">Mulligan Usage</div>
            </div>
          </div>
        </div>
      )}

      {/* Final Score Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2" />
          Final Score Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{scoreCard.totalStrokes}</div>
            <div className="text-sm text-gray-600">Total Strokes</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{scoreCard.totalMulligans}</div>
            <div className="text-sm text-gray-600">Mulligans Used</div>
          </div>
          <div className="bg-brand-neon-green/10 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-brand-black">{scoreCard.finalScore}</div>
            <div className="text-sm text-gray-600">Final Score</div>
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

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

export default ScoreCard; 