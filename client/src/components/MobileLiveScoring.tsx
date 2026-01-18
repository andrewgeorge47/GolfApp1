import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Save, Trophy, Target,
  CheckCircle, MapPin, Users, Calendar, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getSimulatorCourse } from '../services/api';
import { environment } from '../config/environment';

interface Player {
  id: number;
  user_id: number;
  name: string;
  sim_handicap: number;
}

interface HoleScore {
  hole: number;
  player_id?: number;
  gross: number;
  net: number;
  par: number;
  index: number;
  stroke_received: boolean;
}

interface MobileLiveScoringProps {
  matchupId: number;
  teamId: number;
  courseId: number;
  players: Player[];
  initialHoleAssignments: { [hole: number]: number };
  initialBack9PlayerOrder: number[];
  onClose: () => void;
  onSubmit?: () => void;
}

interface CourseData {
  id: number;
  name: string;
  location: string;
  par_values: number[];
  hole_indexes: number[];
}

const MobileLiveScoring: React.FC<MobileLiveScoringProps> = ({
  matchupId,
  teamId,
  courseId,
  players,
  initialHoleAssignments,
  initialBack9PlayerOrder,
  onClose,
  onSubmit
}) => {
  const [currentHole, setCurrentHole] = useState(1);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  // Score state
  const [frontNineScores, setFrontNineScores] = useState<{ [hole: number]: HoleScore }>({});
  const [backNineScores, setBackNineScores] = useState<{ [hole: number]: HoleScore }>({});

  // Team handicap
  const [teamHandicap, setTeamHandicap] = useState(0);

  // Refs for scroll behavior
  const parButtonRef = useRef<HTMLButtonElement>(null);
  const scoreButtonRefs = useRef<{ [score: number]: HTMLButtonElement | null }>({});

  // Calculate team handicap
  useEffect(() => {
    if (players.length > 0) {
      const totalHandicap = players.reduce((sum, p) => {
        const handicap = typeof p.sim_handicap === 'string' ? parseFloat(p.sim_handicap) : (p.sim_handicap || 0);
        return sum + handicap;
      }, 0);
      const avgHandicap = totalHandicap / players.length;
      setTeamHandicap(Math.round(avgHandicap * 10) / 10);
    }
  }, [players]);

  // Load course data
  useEffect(() => {
    const loadCourseData = async () => {
      setLoading(true);
      try {
        const response = await getSimulatorCourse(courseId);
        const courseData = response.data;

        const parValues = Array.isArray(courseData.par_values)
          ? courseData.par_values
          : Array(18).fill(4);

        const holeIndexes = Array.isArray(courseData.hole_indexes)
          ? courseData.hole_indexes
          : Array.from({ length: 18 }, (_, i) => i + 1);

        setCourse({
          id: courseData.id,
          name: courseData.name,
          location: courseData.location || '',
          par_values: parValues,
          hole_indexes: holeIndexes
        });

        // Initialize scores
        const front9: { [hole: number]: HoleScore } = {};
        for (let hole = 1; hole <= 9; hole++) {
          const playerId = initialHoleAssignments[hole];
          const player = players.find(p => p.id === playerId);
          const playerHandicap = player ? (typeof player.sim_handicap === 'string' ? parseFloat(player.sim_handicap) : player.sim_handicap) : 0;
          const holeIndex = holeIndexes[hole - 1];
          const getsStroke = playerHandicap >= holeIndex;

          front9[hole] = {
            hole,
            player_id: playerId,
            gross: 0,
            net: 0,
            par: parValues[hole - 1] || 4,
            index: holeIndex || hole,
            stroke_received: getsStroke
          };
        }
        setFrontNineScores(front9);

        const back9: { [hole: number]: HoleScore } = {};
        for (let hole = 10; hole <= 18; hole++) {
          const holeIndex = holeIndexes[hole - 1];
          const getsStroke = teamHandicap >= holeIndex;

          back9[hole] = {
            hole,
            gross: 0,
            net: 0,
            par: parValues[hole - 1] || 4,
            index: holeIndex || hole,
            stroke_received: getsStroke
          };
        }
        setBackNineScores(back9);

      } catch (error) {
        console.error('Error loading course:', error);
        toast.error('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, initialHoleAssignments, players, teamHandicap]);

  const updateScore = (hole: number, gross: number) => {
    if (hole <= 9) {
      // Front 9
      const score = frontNineScores[hole];
      const playerId = initialHoleAssignments[hole];
      const player = players.find(p => p.id === playerId);

      if (!player) {
        toast.error('No player assigned to this hole');
        return;
      }

      const playerHandicap = typeof player.sim_handicap === 'string' ? parseFloat(player.sim_handicap) : player.sim_handicap;
      const getsStroke = playerHandicap >= score.index;
      const net = getsStroke ? gross - 1 : gross;

      setFrontNineScores(prev => ({
        ...prev,
        [hole]: {
          ...score,
          player_id: playerId,
          gross,
          net,
          stroke_received: getsStroke
        }
      }));
    } else {
      // Back 9
      const score = backNineScores[hole];
      const getsStroke = teamHandicap >= score.index;
      const net = getsStroke ? gross - 1 : gross;

      setBackNineScores(prev => ({
        ...prev,
        [hole]: {
          ...score,
          gross,
          net,
          stroke_received: getsStroke
        }
      }));
    }

    // Scroll to the selected button
    const buttonRef = scoreButtonRefs.current[gross];
    if (buttonRef) {
      buttonRef.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };

  const [showSummary, setShowSummary] = useState(false);

  // Center on Par button when hole changes or on initial load
  useEffect(() => {
    if (parButtonRef.current && course) {
      setTimeout(() => {
        parButtonRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
    }
  }, [currentHole, course]);

  const goToNextHole = () => {
    // Show summary after hole 9 or 18
    if (currentHole === 9 || currentHole === 18) {
      setShowSummary(true);
    } else if (currentHole < 18) {
      setCurrentHole(currentHole + 1);
    }
  };

  const goToPreviousHole = () => {
    if (currentHole > 1) {
      setCurrentHole(currentHole - 1);
      setShowSummary(false);
    }
  };

  const handleContinueFromSummary = () => {
    setShowSummary(false);
    if (currentHole === 9) {
      setCurrentHole(10);
    }
  };

  const handleSubmit = async () => {
    // Validate all scores are entered
    for (let hole = 1; hole <= 18; hole++) {
      const score = hole <= 9 ? frontNineScores[hole] : backNineScores[hole];
      if (!score?.gross || score.gross === 0) {
        toast.error(`Please enter a score for hole ${hole}`);
        setCurrentHole(hole);
        return;
      }
    }

    try {
      const frontTotals = Object.values(frontNineScores).reduce((acc, s) => ({
        gross: acc.gross + s.gross,
        net: acc.net + s.net
      }), { gross: 0, net: 0 });

      const backTotals = Object.values(backNineScores).reduce((acc, s) => ({
        gross: acc.gross + s.gross,
        net: acc.net + s.net
      }), { gross: 0, net: 0 });

      const scoreData = {
        matchup_id: matchupId,
        team_id: teamId,
        front_nine_scores: frontNineScores,
        back_nine_scores: backNineScores,
        hole_assignments: initialHoleAssignments,
        back_9_player_order: initialBack9PlayerOrder,
        team_handicap: teamHandicap,
        players: players.map(p => ({
          id: p.id,
          user_id: p.user_id,
          handicap: p.sim_handicap
        })),
        total_gross: frontTotals.gross + backTotals.gross,
        total_net: frontTotals.net + backTotals.net
      };

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${environment.apiBaseUrl}/leagues/matchups/${matchupId}/scores`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(scoreData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to submit scores');
      }

      toast.success('Scores submitted successfully!');
      onSubmit?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting scores:', error);
      toast.error(error.message || 'Failed to submit scores');
    }
  };

  if (loading || !course) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center rounded-t-3xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark-green mx-auto mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  const currentScore = currentHole <= 9 ? frontNineScores[currentHole] : backNineScores[currentHole];
  const assignedPlayerId = currentHole <= 9 ? initialHoleAssignments[currentHole] : null;
  const assignedPlayer = assignedPlayerId ? players.find(p => p.id === assignedPlayerId) : null;

  // For back 9, determine who tees off
  const teeingPlayer = currentHole > 9
    ? players.find(p => p.id === initialBack9PlayerOrder[((currentHole - 10) % 3)])
    : null;

  // Calculate progress
  const completedHoles = [
    ...Object.values(frontNineScores),
    ...Object.values(backNineScores)
  ].filter(s => s.gross > 0).length;

  // Calculate current totals
  const currentTotals = {
    front9Gross: Object.values(frontNineScores).reduce((sum, s) => sum + s.gross, 0),
    front9Net: Object.values(frontNineScores).reduce((sum, s) => sum + s.net, 0),
    back9Gross: Object.values(backNineScores).reduce((sum, s) => sum + s.gross, 0),
    back9Net: Object.values(backNineScores).reduce((sum, s) => sum + s.net, 0)
  };

  // Show summary screen
  if (showSummary) {
    const isNineHoleSummary = currentHole === 9;
    const summaryGross = isNineHoleSummary ? currentTotals.front9Gross : currentTotals.front9Gross + currentTotals.back9Gross;
    const summaryNet = isNineHoleSummary ? currentTotals.front9Net : currentTotals.front9Net + currentTotals.back9Net;

    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center p-4 rounded-t-3xl">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="text-sm text-neutral-600 mb-2">
              {isNineHoleSummary ? 'Front 9 Complete' : 'Round Complete'}
            </div>
            <div className="text-4xl font-bold text-brand-black mb-4">
              {isNineHoleSummary ? '9 Holes' : '18 Holes'}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {isNineHoleSummary ? (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-neutral-600 mb-1">Front 9</div>
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <div className="text-xs text-neutral-600">Gross</div>
                      <div className="text-2xl font-bold text-neutral-900">{currentTotals.front9Gross}</div>
                    </div>
                    <div className="text-neutral-400">→</div>
                    <div>
                      <div className="text-xs text-neutral-600">Net</div>
                      <div className="text-3xl font-bold text-blue-600">{currentTotals.front9Net}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-neutral-700">Front 9</div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-neutral-600">Gross</div>
                        <div className="text-lg font-bold text-neutral-900">{currentTotals.front9Gross}</div>
                      </div>
                      <div className="text-neutral-400">→</div>
                      <div className="text-right">
                        <div className="text-xs text-neutral-600">Net</div>
                        <div className="text-xl font-bold text-blue-600">{currentTotals.front9Net}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-neutral-700">Back 9</div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-neutral-600">Gross</div>
                        <div className="text-lg font-bold text-neutral-900">{currentTotals.back9Gross}</div>
                      </div>
                      <div className="text-neutral-400">→</div>
                      <div className="text-right">
                        <div className="text-xs text-neutral-600">Net</div>
                        <div className="text-xl font-bold text-green-600">{currentTotals.back9Net}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-brand-dark-green text-white rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Total</div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs opacity-75">Gross</div>
                        <div className="text-xl font-bold">{summaryGross}</div>
                      </div>
                      <div className="opacity-50">→</div>
                      <div className="text-right">
                        <div className="text-xs opacity-75">Net</div>
                        <div className="text-3xl font-bold">{summaryNet}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {isNineHoleSummary ? (
            <button
              onClick={handleContinueFromSummary}
              className="w-full py-4 rounded-lg bg-brand-neon-green text-brand-black font-bold text-lg shadow-lg active:scale-95 transition-all touch-manipulation"
            >
              Continue to Back 9
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full py-4 rounded-lg bg-brand-neon-green text-brand-black font-bold text-lg shadow-lg active:scale-95 transition-all touch-manipulation"
            >
              Submit Round
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-white overflow-y-auto rounded-t-3xl">
      {/* Header with Hole Info */}
      <div className={`sticky top-0 z-10 rounded-t-3xl ${currentHole <= 9 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
        <div className="px-4 pt-4 pb-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1.5 text-white/90 hover:text-white active:scale-95 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center flex-1">
              <div className="text-sm font-semibold text-white/90">
                {course.name}
              </div>
            </div>
            <div className="text-white text-base font-bold">
              {currentHole}/18
            </div>
          </div>

          {/* Hole Info */}
          <div className="flex items-center justify-between text-white mb-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs opacity-75 mb-0.5">HOLE</div>
                <div className="text-4xl font-bold leading-none">{currentHole}</div>
              </div>
              <div className="w-px h-12 bg-white/30"></div>
              <div>
                <div className="text-xs opacity-75 mb-0.5">PAR</div>
                <div className="text-4xl font-bold leading-none">{currentScore.par}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-75">INDEX {currentScore.index}</div>
              <div className="text-xs opacity-90 mt-1">
                {currentHole <= 9 ? 'Individual' : 'Alt Shot'}
              </div>
            </div>
          </div>

          {/* Stroke Indicator */}
          {currentScore.stroke_received && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="text-center text-white text-sm font-medium">
                +1 Stroke on this hole
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Score Selection */}
      <div className="px-4 pt-6 pb-4">
        <div className="text-center mb-4">
          <div className="text-sm font-medium text-neutral-600">How did you score?</div>
        </div>

        {/* All Score Buttons - Horizontal Scroll */}
        <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-3 pb-2">
            {/* Eagle (if par 4 or higher) */}
            {currentScore.par >= 4 && (
              <button
                ref={(el) => { scoreButtonRefs.current[currentScore.par - 2] = el; }}
                onClick={() => updateScore(currentHole, currentScore.par - 2)}
                className={`flex-shrink-0 w-28 py-6 rounded-xl font-bold transition-all touch-manipulation ${
                  currentScore.gross === currentScore.par - 2
                    ? 'bg-brand-muted-green text-white shadow-lg scale-105'
                    : 'bg-success-50 text-success-700 border-2 border-success-200 active:bg-success-100'
                }`}
              >
                <div className="text-xs uppercase tracking-wide opacity-75 mb-1">Eagle</div>
                <div className="text-3xl font-bold">{currentScore.par - 2}</div>
              </button>
            )}

            {/* Birdie */}
            <button
              ref={(el) => { scoreButtonRefs.current[currentScore.par - 1] = el; }}
              onClick={() => updateScore(currentHole, currentScore.par - 1)}
              className={`flex-shrink-0 w-28 py-6 rounded-xl font-bold transition-all touch-manipulation ${
                currentScore.gross === currentScore.par - 1
                  ? 'bg-brand-dark-green text-white shadow-lg scale-105'
                  : 'bg-success-50 text-success-700 border-2 border-success-200 active:bg-success-100'
              }`}
            >
              <div className="text-xs uppercase tracking-wide opacity-75 mb-1">Birdie</div>
              <div className="text-3xl font-bold">{currentScore.par - 1}</div>
            </button>

            {/* Par */}
            <button
              ref={(el) => {
                parButtonRef.current = el;
                scoreButtonRefs.current[currentScore.par] = el;
              }}
              onClick={() => updateScore(currentHole, currentScore.par)}
              className={`flex-shrink-0 w-28 py-6 rounded-xl font-bold transition-all touch-manipulation ${
                currentScore.gross === currentScore.par
                  ? 'bg-brand-neon-green text-brand-black shadow-lg scale-105'
                  : 'bg-neutral-50 text-neutral-700 border-2 border-neutral-300 active:bg-neutral-100'
              }`}
            >
              <div className="text-xs uppercase tracking-wide opacity-75 mb-1">Par</div>
              <div className="text-3xl font-bold">{currentScore.par}</div>
            </button>

            {/* Bogey */}
            <button
              ref={(el) => { scoreButtonRefs.current[currentScore.par + 1] = el; }}
              onClick={() => updateScore(currentHole, currentScore.par + 1)}
              className={`flex-shrink-0 w-28 py-6 rounded-xl font-bold transition-all touch-manipulation ${
                currentScore.gross === currentScore.par + 1
                  ? 'bg-warning-600 text-white shadow-lg scale-105'
                  : 'bg-warning-50 text-warning-700 border-2 border-warning-200 active:bg-warning-100'
              }`}
            >
              <div className="text-xs uppercase tracking-wide opacity-75 mb-1">Bogey</div>
              <div className="text-3xl font-bold">{currentScore.par + 1}</div>
            </button>

            {/* Double Bogey and higher */}
            {[2, 3, 4, 5, 6, 7, 8].map((over) => (
              <button
                key={over}
                ref={(el) => { scoreButtonRefs.current[currentScore.par + over] = el; }}
                onClick={() => updateScore(currentHole, currentScore.par + over)}
                className={`flex-shrink-0 w-28 py-6 rounded-xl font-bold transition-all touch-manipulation ${
                  currentScore.gross === currentScore.par + over
                    ? 'bg-error-600 text-white shadow-lg scale-105'
                    : 'bg-error-50 text-error-700 border-2 border-error-600/30 active:bg-error-100'
                }`}
              >
                {over === 2 && <div className="text-xs uppercase tracking-wide opacity-75 mb-1">Double</div>}
                {over === 3 && <div className="text-xs uppercase tracking-wide opacity-75 mb-1">Triple</div>}
                {over > 3 && <div className="text-xs uppercase tracking-wide opacity-75 mb-1">+{over}</div>}
                <div className="text-3xl font-bold">{currentScore.par + over}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Net Score Display */}
        {currentScore.gross > 0 && (
          <div className={`mt-4 p-4 rounded-lg ${currentHole <= 9 ? 'bg-blue-50' : 'bg-green-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-600">Gross Score</div>
                <div className="text-2xl font-bold text-neutral-900">{currentScore.gross}</div>
              </div>
              <div className="text-xl text-neutral-400">→</div>
              <div className="text-right">
                <div className="text-xs text-neutral-600">
                  Net Score {currentScore.stroke_received ? '(-1 stroke)' : ''}
                </div>
                <div className={`text-3xl font-bold ${currentHole <= 9 ? 'text-blue-600' : 'text-green-600'}`}>
                  {currentScore.net}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className="px-4 pb-24 border-t border-neutral-100 pt-4">
        {currentHole <= 9 ? (
          assignedPlayer ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                {assignedPlayer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-brand-black">{assignedPlayer.name}</div>
                <div className="text-xs text-neutral-600">Individual • Handicap: {assignedPlayer.sim_handicap}</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-neutral-500 italic text-sm py-2">No player assigned</div>
          )
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-600 mb-2">Team Alternate Shot</div>
              <div className="flex items-center gap-2">
                {players.map((player) => {
                  const isTeeingOff = teeingPlayer?.id === player.id;
                  const initials = player.name.split(' ').map(n => n[0]).join('');
                  return (
                    <div key={player.id} className="flex items-center gap-1.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        isTeeingOff
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-2 ring-green-300'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}>
                        {initials}
                      </div>
                      {isTeeingOff && <div className="text-xs font-medium text-green-700">Tees</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-600">Team HCP</div>
              <div className="text-xl font-bold text-green-700">{teamHandicap.toFixed(1)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-100 p-4 shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousHole}
            disabled={currentHole === 1}
            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all touch-manipulation ${
              currentHole === 1
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : 'bg-neutral-800 text-white active:scale-95 shadow-md'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          <button
            onClick={goToNextHole}
            disabled={currentScore.gross === 0}
            className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all touch-manipulation ${
              currentScore.gross === 0
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-brand-dark-green to-brand-muted-green text-white active:scale-95 shadow-lg'
            }`}
          >
            <span>{currentHole === 18 ? 'Finish' : 'Next Hole'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileLiveScoring;
