import React, { useState, useEffect } from 'react';
import {
  Save, Calculator, Users, Target, CheckCircle, AlertCircle,
  X, Edit3, Trophy, TrendingDown, MapPin
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getSimulatorCourse,
  createMatchup
} from '../services/api';
import { environment } from '../config/environment';
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge
} from './ui';

interface CourseData {
  id: number;
  name: string;
  location: string;
  par_values: number[];
  hole_indexes: number[];
}

interface Player {
  id: number;
  user_id: number;
  name: string;
  sim_handicap: number;
}

interface HoleScore {
  hole: number;
  player_id?: number; // For front 9 individual
  gross: number;
  net: number;
  par: number;
  index: number;
  stroke_received: boolean;
}

interface LeagueScoreSubmissionProps {
  // Either matchupId (matchup-based leagues) OR scheduleId (division-based leagues)
  matchupId?: number;
  scheduleId?: number;
  teamId: number;
  opponentTeamId?: number | null; // Optional for division-based scoring
  courseId: number;
  players: Player[]; // Active players (3)
  onClose: () => void;
  onSubmit?: () => void;
  // Optional initial lineup data from saved lineup
  initialHoleAssignments?: { [hole: number]: number };
  initialBack9PlayerOrder?: number[];
}

const LeagueScoreSubmission: React.FC<LeagueScoreSubmissionProps> = ({
  matchupId,
  scheduleId,
  teamId,
  opponentTeamId,
  courseId,
  players,
  onClose,
  onSubmit,
  initialHoleAssignments,
  initialBack9PlayerOrder
}) => {
  // Exactly one of matchupId or scheduleId must be provided
  if (!matchupId && !scheduleId) {
    throw new Error('Either matchupId or scheduleId must be provided');
  }
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  // Front 9: Individual scores with player assignments
  const [holeAssignments, setHoleAssignments] = useState<{ [hole: number]: number }>({});
  const [frontNineScores, setFrontNineScores] = useState<{ [hole: number]: HoleScore }>({});

  // Back 9: Alternate shot scores
  const [backNineScores, setBackNineScores] = useState<{ [hole: number]: HoleScore }>({});

  // Back 9: Player teeing order (positions 1, 2, 3)
  const [back9PlayerOrder, setBack9PlayerOrder] = useState<number[]>([]);

  // Team handicap (average of 3 active players)
  const [teamHandicap, setTeamHandicap] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  // Load course data
  useEffect(() => {
    const loadCourseData = async () => {
      setLoading(true);
      try {
        const response = await getSimulatorCourse(courseId);
        const courseData = response.data;

        // Ensure par_values and hole_indexes are arrays
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

        // Initialize front 9 scores
        const initialFrontNine: { [hole: number]: HoleScore } = {};
        for (let hole = 1; hole <= 9; hole++) {
          initialFrontNine[hole] = {
            hole,
            gross: 0,
            net: 0,
            par: parValues[hole - 1] || 4,
            index: holeIndexes[hole - 1] || hole,
            stroke_received: false
          };
        }
        setFrontNineScores(initialFrontNine);

        // Initialize back 9 scores
        const initialBackNine: { [hole: number]: HoleScore } = {};
        for (let hole = 10; hole <= 18; hole++) {
          initialBackNine[hole] = {
            hole,
            gross: 0,
            net: 0,
            par: parValues[hole - 1] || 4,
            index: holeIndexes[hole - 1] || hole,
            stroke_received: false
          };
        }
        setBackNineScores(initialBackNine);

      } catch (error) {
        console.error('Error loading course data:', error);
        toast.error('Failed to load course information');
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  // Load existing scores if editing (only load score values, not lineup)
  useEffect(() => {
    const loadExistingScores = async () => {
      if (!course || !teamId) return;
      if (!matchupId && !scheduleId) return;
      if (!players || players.length === 0) return;

      try {
        const token = localStorage.getItem('token');
        const endpoint = scheduleId
          ? `${environment.apiBaseUrl}/leagues/schedule/${scheduleId}/scores/${teamId}`
          : `${environment.apiBaseUrl}/leagues/matchups/${matchupId}/scores/${teamId}`;

        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();

        // Only load the SCORES, not the lineup (lineup comes from initial props)
        // Populate front 9 scores
        if (data.individual_scores && data.individual_scores.length > 0) {
          setFrontNineScores(prev => {
            const newScores = { ...prev };
            data.individual_scores.forEach((score: any) => {
              const holeScores = score.hole_scores || {};
              Object.keys(holeScores).forEach((holeStr: string) => {
                const hole = parseInt(holeStr);
                const holeData = holeScores[holeStr];
                if (newScores[hole]) {
                  newScores[hole] = {
                    ...newScores[hole],
                    gross: holeData.gross || 0,
                    net: holeData.net || 0,
                    stroke_received: holeData.stroke_received || false
                  };
                }
              });
            });
            return newScores;
          });
        }

        // Populate back 9 scores
        if (data.alternate_shot_scores && data.alternate_shot_scores.hole_scores) {
          setBackNineScores(prev => {
            const newScores = { ...prev };
            const altShotHoleScores = data.alternate_shot_scores.hole_scores;
            Object.keys(altShotHoleScores).forEach((holeStr: string) => {
              const hole = parseInt(holeStr);
              const holeData = altShotHoleScores[holeStr];
              if (newScores[hole]) {
                newScores[hole] = {
                  ...newScores[hole],
                  gross: holeData.gross || 0,
                  net: holeData.net || 0,
                  stroke_received: holeData.stroke_received || false
                };
              }
            });
            return newScores;
          });
        }
      } catch (error) {
        console.error('Error loading existing scores:', error);
      }
    };

    loadExistingScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, matchupId, scheduleId, teamId, players]);

  // Initialize back 9 player order from prop or default
  useEffect(() => {
    if (initialBack9PlayerOrder && initialBack9PlayerOrder.length === 3) {
      setBack9PlayerOrder(initialBack9PlayerOrder);
    } else if (players.length === 3 && back9PlayerOrder.length === 0) {
      // Default order: player 1, 2, 3
      setBack9PlayerOrder(players.map(p => p.id));
    }
  }, [players, initialBack9PlayerOrder]);

  // Calculate team handicap when players change
  useEffect(() => {
    if (players.length > 0) {
      // Parse handicaps as floats since they may come as strings from the API
      const totalHandicap = players.reduce((sum, p) => {
        const handicap = typeof p.sim_handicap === 'string' ? parseFloat(p.sim_handicap) : (p.sim_handicap || 0);
        return sum + handicap;
      }, 0);
      const avgHandicap = totalHandicap / players.length;
      setTeamHandicap(Math.round(avgHandicap * 10) / 10);
      console.log('Team handicap calculated:', { players, totalHandicap, avgHandicap, teamHandicap: Math.round(avgHandicap * 10) / 10 });
    }
  }, [players]);

  // Auto-assign players to holes and calculate strokes (only if not already assigned)
  useEffect(() => {
    // Skip auto-assignment if assignments already exist (from loaded scores)
    if (Object.keys(holeAssignments).length > 0) return;

    if (players.length === 3 && Object.keys(frontNineScores).length > 0) {
      // Use initial assignments if provided, otherwise auto-assign
      const initial: { [hole: number]: number } = initialHoleAssignments || {};
      const updatedScores = { ...frontNineScores };

      // If no initial assignments, auto-assign
      if (!initialHoleAssignments) {
        for (let hole = 1; hole <= 9; hole++) {
          // Assign holes 1-3 to player 1, 4-6 to player 2, 7-9 to player 3
          const playerIndex = Math.floor((hole - 1) / 3);
          const playerId = players[playerIndex].id;
          initial[hole] = playerId;
        }
      }

      // Calculate strokes for all assigned holes
      for (let hole = 1; hole <= 9; hole++) {
        const playerId = initial[hole];
        if (playerId) {
          const player = players.find(p => p.id === playerId);
          if (player) {
            const playerHandicap = typeof player.sim_handicap === 'string' ? parseFloat(player.sim_handicap) : (player.sim_handicap || 0);
            const holeIndex = updatedScores[hole].index;
            const getsStroke = playerGetsStroke(playerHandicap, holeIndex);

            updatedScores[hole] = {
              ...updatedScores[hole],
              stroke_received: getsStroke
            };
          }
        }
      }

      setHoleAssignments(initial);
      setFrontNineScores(updatedScores);
    }
  }, [players, course, initialHoleAssignments]);

  // Update front 9 strokes when assignments change
  useEffect(() => {
    if (Object.keys(holeAssignments).length === 0 || Object.keys(frontNineScores).length === 0 || players.length === 0) return;

    const updatedScores = { ...frontNineScores };
    let hasChanges = false;

    for (let hole = 1; hole <= 9; hole++) {
      const playerId = holeAssignments[hole];
      if (playerId) {
        const player = players.find(p => p.id === playerId);
        if (player) {
          const playerHandicap = typeof player.sim_handicap === 'string' ? parseFloat(player.sim_handicap) : (player.sim_handicap || 0);
          const holeIndex = updatedScores[hole].index;
          const getsStroke = playerGetsStroke(playerHandicap, holeIndex);

          if (updatedScores[hole].stroke_received !== getsStroke) {
            updatedScores[hole] = {
              ...updatedScores[hole],
              stroke_received: getsStroke
            };
            hasChanges = true;
            console.log(`Updated Front 9 - Hole ${hole}: Player ${player.name} (${playerHandicap}) vs Index ${holeIndex} = ${getsStroke ? 'STROKE' : 'NO STROKE'}`);
          }
        }
      }
    }

    if (hasChanges) {
      setFrontNineScores(updatedScores);
    }
  }, [holeAssignments]);

  // Update back 9 stroke flags when team handicap changes or course loads
  useEffect(() => {
    if (Object.keys(backNineScores).length === 0) return;
    if (teamHandicap === 0) return; // Wait for team handicap to be calculated

    const updatedScores = { ...backNineScores };
    let hasChanges = false;

    for (let hole = 10; hole <= 18; hole++) {
      const holeIndex = updatedScores[hole].index;
      const getsStroke = teamGetsStroke(teamHandicap, holeIndex);

      if (updatedScores[hole].stroke_received !== getsStroke) {
        updatedScores[hole] = {
          ...updatedScores[hole],
          stroke_received: getsStroke
        };
        hasChanges = true;
        console.log(`Updated Back 9 - Hole ${hole}: Team (${teamHandicap}) vs Index ${holeIndex} = ${getsStroke ? 'STROKE' : 'NO STROKE'}`);
      }
    }

    if (hasChanges) {
      setBackNineScores(updatedScores);
    }
  }, [teamHandicap, course]);

  // Calculate if player gets stroke on hole (individual)
  const playerGetsStroke = (playerHandicap: number, holeIndex: number): boolean => {
    return playerHandicap >= holeIndex;
  };

  // Calculate if team gets stroke on hole (alternate shot)
  const teamGetsStroke = (teamHandicap: number, holeIndex: number): boolean => {
    return teamHandicap >= holeIndex;
  };

  // Update front 9 score
  const updateFrontNineScore = (hole: number, gross: number) => {
    const playerId = holeAssignments[hole];
    if (!playerId) {
      toast.error(`Please assign a player to hole ${hole} first`);
      return;
    }

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const holeData = frontNineScores[hole];
    // Parse handicap as number
    const playerHandicap = typeof player.sim_handicap === 'string' ? parseFloat(player.sim_handicap) : (player.sim_handicap || 0);
    const getsStroke = playerGetsStroke(playerHandicap, holeData.index);
    const net = getsStroke ? gross - 1 : gross;

    console.log(`Hole ${hole}: Player ${player.name} (HCP: ${playerHandicap}) vs Index ${holeData.index} = ${getsStroke ? 'STROKE' : 'NO STROKE'}`);

    setFrontNineScores(prev => ({
      ...prev,
      [hole]: {
        ...holeData,
        player_id: playerId,
        gross,
        net,
        stroke_received: getsStroke
      }
    }));
  };

  // Update back 9 score
  const updateBackNineScore = (hole: number, gross: number) => {
    const holeData = backNineScores[hole];
    const getsStroke = teamGetsStroke(teamHandicap, holeData.index);
    const net = getsStroke ? gross - 1 : gross;

    console.log(`Hole ${hole}: Team (HCP: ${teamHandicap}) vs Index ${holeData.index} = ${getsStroke ? 'STROKE' : 'NO STROKE'}`);

    setBackNineScores(prev => ({
      ...prev,
      [hole]: {
        ...holeData,
        gross,
        net,
        stroke_received: getsStroke
      }
    }));
  };

  // Calculate totals
  const calculateFrontNineTotals = () => {
    const scores = Object.values(frontNineScores);
    const grossTotal = scores.reduce((sum, s) => sum + (s.gross || 0), 0);
    const netTotal = scores.reduce((sum, s) => sum + (s.net || 0), 0);
    const par = scores.reduce((sum, s) => sum + s.par, 0);
    return { grossTotal, netTotal, par };
  };

  const calculateBackNineTotals = () => {
    const scores = Object.values(backNineScores);
    const grossTotal = scores.reduce((sum, s) => sum + (s.gross || 0), 0);
    const netTotal = scores.reduce((sum, s) => sum + (s.net || 0), 0);
    const par = scores.reduce((sum, s) => sum + s.par, 0);
    return { grossTotal, netTotal, par };
  };

  const frontTotals = calculateFrontNineTotals();
  const backTotals = calculateBackNineTotals();
  const totalNet = frontTotals.netTotal + backTotals.netTotal;
  const totalPar = frontTotals.par + backTotals.par;

  // Validation
  const validateScores = (): boolean => {
    // Check all front 9 holes have assignments and scores
    for (let hole = 1; hole <= 9; hole++) {
      if (!holeAssignments[hole]) {
        toast.error(`Please assign a player to hole ${hole}`);
        return false;
      }
      if (!frontNineScores[hole]?.gross || frontNineScores[hole].gross === 0) {
        toast.error(`Please enter a score for hole ${hole}`);
        return false;
      }
    }

    // Check back 9 player order is set
    if (back9PlayerOrder.length !== 3) {
      toast.error('Back 9 teeing order is not set. Please go back and save your lineup first.');
      return false;
    }

    // Check all back 9 holes have scores
    for (let hole = 10; hole <= 18; hole++) {
      if (!backNineScores[hole]?.gross || backNineScores[hole].gross === 0) {
        toast.error(`Please enter a score for hole ${hole}`);
        return false;
      }
    }

    return true;
  };

  // Submit scores
  const handleSubmit = async () => {
    if (!validateScores()) return;

    setSubmitting(true);
    try {
      // Prepare score data
      const scoreData = {
        team_id: teamId,
        front_nine_scores: frontNineScores,
        back_nine_scores: backNineScores,
        hole_assignments: holeAssignments,
        back_9_player_order: back9PlayerOrder,
        team_handicap: teamHandicap,
        players: players.map(p => ({
          id: p.id,
          user_id: p.user_id,
          handicap: p.sim_handicap
        })),
        total_gross: frontTotals.grossTotal + backTotals.grossTotal,
        total_net: totalNet
      };

      // Submit to API
      console.log('Submitting score data:', scoreData);
      const token = localStorage.getItem('token');
      // Use appropriate endpoint based on league type
      const apiUrl = scheduleId
        ? `${environment.apiBaseUrl}/leagues/schedule/${scheduleId}/scores`
        : `${environment.apiBaseUrl}/leagues/matchups/${matchupId}/scores`;
      console.log('Submitting to URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scoreData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to submit scores');
      }

      const result = await response.json();
      console.log('Score submission result:', result);

      toast.success('Scores submitted successfully!');
      onSubmit?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting scores:', error);
      toast.error(error.message || 'Failed to submit scores. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Modal open={true} onClose={onClose} size="xl">
        <ModalHeader>
          <h2 className="text-2xl font-bold">Loading Course Information...</h2>
        </ModalHeader>
        <ModalContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
          </div>
        </ModalContent>
      </Modal>
    );
  }

  if (!course) {
    return (
      <Modal open={true} onClose={onClose} size="xl">
        <ModalHeader>
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
        </ModalHeader>
        <ModalContent>
          <p className="text-neutral-600">Failed to load course information.</p>
        </ModalContent>
        <ModalFooter>
          <Button onClick={onClose} variant="secondary">Close</Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal open={true} onClose={onClose} size="full">
      <ModalHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-2xl font-bold text-brand-black">Score Submission</h2>
            <div className="flex items-center space-x-2 mt-1">
              <MapPin className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-600">{course.name} - {course.location}</span>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" icon={X} size="sm">
            Close
          </Button>
        </div>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Team Handicap Info */}
          <Card variant="elevated">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-brand-black">Active Players</h3>
                  <div className="flex space-x-4 mt-2">
                    {players.map(player => (
                      <div key={player.id} className="text-sm">
                        <span className="font-medium">{player.name}</span>
                        <span className="text-neutral-600 ml-2">({player.sim_handicap})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-neutral-600">Team Handicap (Back 9)</div>
                  <div className="text-2xl font-bold text-brand-neon-green">{teamHandicap.toFixed(1)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Front 9: Individual Stroke Play */}
          <Card variant="elevated">
            <CardHeader
              title={
                <div className="flex items-center space-x-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  <span>Front 9: Individual Stroke Play</span>
                </div>
              }
            />
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-neutral-200">
                      <th className="text-left p-2 text-sm font-semibold">Hole</th>
                      <th className="text-center p-2 text-sm font-semibold">Par</th>
                      <th className="text-center p-2 text-sm font-semibold">Index</th>
                      <th className="text-left p-2 text-sm font-semibold">Player</th>
                      <th className="text-center p-2 text-sm font-semibold">Stroke?</th>
                      <th className="text-center p-2 text-sm font-semibold">Gross</th>
                      <th className="text-center p-2 text-sm font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => {
                      const score = frontNineScores[hole];
                      const assignedPlayerId = holeAssignments[hole];
                      const assignedPlayer = players.find(p => p.id === assignedPlayerId);

                      // Get player initials
                      const nameParts = assignedPlayer ? assignedPlayer.name.split(' ') : [];
                      const initials = nameParts.length >= 2
                        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                        : nameParts[0] ? nameParts[0][0] : '?';

                      return (
                        <tr key={hole} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="p-2 font-medium">{hole}</td>
                          <td className="p-2 text-center">{score.par}</td>
                          <td className="p-2 text-center">
                            <Badge style="outlined" size="sm">{score.index}</Badge>
                          </td>
                          <td className="p-2">
                            {assignedPlayer ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                  {initials}
                                </div>
                                <span className="text-sm font-medium text-brand-black">
                                  {assignedPlayer.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-neutral-400 italic">Not assigned</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {assignedPlayer && score.stroke_received && (
                              <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                            )}
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              max="15"
                              value={score.gross || ''}
                              onChange={(e) => updateFrontNineScore(hole, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-neutral-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <div className="w-16 px-2 py-1 bg-blue-50 text-blue-900 font-semibold rounded text-center mx-auto">
                              {score.net || '-'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-neutral-100 font-semibold">
                      <td className="p-2" colSpan={5}>Front 9 Total</td>
                      <td className="p-2 text-center">{frontTotals.grossTotal || '-'}</td>
                      <td className="p-2">
                        <div className="w-16 px-2 py-1 bg-blue-600 text-white rounded text-center mx-auto">
                          {frontTotals.netTotal || '-'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Back 9: Team Alternate Shot */}
          <Card variant="elevated">
            <CardHeader
              title={
                <div className="flex items-center space-x-2">
                  <Target className="w-6 h-6 text-green-600" />
                  <span>Back 9: Team Alternate Shot</span>
                  <span className="text-sm font-normal text-neutral-600 ml-2">
                    (Team Handicap: {teamHandicap.toFixed(1)})
                  </span>
                </div>
              }
            />
            <CardContent>
              {/* Teeing Order Display (Read-Only) */}
              <div className="mb-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-brand-black mb-2">Teeing Order</h4>
                <p className="text-xs text-neutral-600 mb-3">
                  The teeing order determines who tees off on which holes (cycles through positions 1, 2, 3).
                </p>
                <div className="flex items-center justify-center gap-6">
                  {back9PlayerOrder.map((playerId, index) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;

                    const nameParts = player.name.split(' ');
                    const initials = nameParts.length >= 2
                      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                      : nameParts[0][0];

                    return (
                      <div key={player.id} className="relative">
                        <div className="w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center border-2 bg-green-600 text-white border-green-700 shadow-lg">
                          {initials}
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white z-10">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1 text-center font-medium">
                          {nameParts[0]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-neutral-200">
                      <th className="text-left p-2 text-sm font-semibold">Hole</th>
                      <th className="text-center p-2 text-sm font-semibold">Par</th>
                      <th className="text-center p-2 text-sm font-semibold">Index</th>
                      <th className="text-center p-2 text-sm font-semibold">Tee Shot</th>
                      <th className="text-center p-2 text-sm font-semibold">Team Stroke?</th>
                      <th className="text-center p-2 text-sm font-semibold">Gross</th>
                      <th className="text-center p-2 text-sm font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole, idx) => {
                      const score = backNineScores[hole];

                      // Determine which player tees off (cycle through positions 1, 2, 3)
                      const position = (idx % 3) + 1;
                      const teeingPlayerId = back9PlayerOrder[position - 1];
                      const teeingPlayer = players.find(p => p.id === teeingPlayerId);

                      const nameParts = teeingPlayer ? teeingPlayer.name.split(' ') : [];
                      const initials = nameParts.length >= 2
                        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                        : nameParts[0] ? nameParts[0][0] : '?';

                      return (
                        <tr key={hole} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="p-2 font-medium">{hole}</td>
                          <td className="p-2 text-center">{score.par}</td>
                          <td className="p-2 text-center">
                            <Badge style="outlined" size="sm">{score.index}</Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center">
                              {teeingPlayer ? (
                                <div className="relative">
                                  <div
                                    className="w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center bg-green-600 text-white shadow-md"
                                    title={`${teeingPlayer.name} tees off (Position ${position})`}
                                  >
                                    {initials}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center">
                                  <span className="text-neutral-400 text-xs font-bold">{position}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            {score.stroke_received && (
                              <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                            )}
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              max="15"
                              value={score.gross || ''}
                              onChange={(e) => updateBackNineScore(hole, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-neutral-300 rounded text-center"
                              placeholder="-"
                            />
                          </td>
                          <td className="p-2">
                            <div className="w-16 px-2 py-1 bg-green-50 text-green-900 font-semibold rounded text-center mx-auto">
                              {score.net || '-'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-neutral-100 font-semibold">
                      <td className="p-2" colSpan={5}>Back 9 Total</td>
                      <td className="p-2 text-center">{backTotals.grossTotal || '-'}</td>
                      <td className="p-2">
                        <div className="w-16 px-2 py-1 bg-green-600 text-white rounded text-center mx-auto">
                          {backTotals.netTotal || '-'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Score Summary */}
          <Card variant="elevated">
            <CardHeader
              title={
                <div className="flex items-center space-x-2">
                  <Calculator className="w-6 h-6 text-brand-neon-green" />
                  <span>Score Summary</span>
                </div>
              }
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-sm text-neutral-600 mb-1">Front 9 Net</div>
                  <div className="text-3xl font-bold text-blue-600">{frontTotals.netTotal || '-'}</div>
                  <div className="text-xs text-neutral-500 mt-1">Par {frontTotals.par}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-neutral-600 mb-1">Back 9 Net</div>
                  <div className="text-3xl font-bold text-green-600">{backTotals.netTotal || '-'}</div>
                  <div className="text-xs text-neutral-500 mt-1">Par {backTotals.par}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-neutral-600 mb-1">Total Net</div>
                  <div className="text-4xl font-bold text-brand-black">{totalNet || '-'}</div>
                  <div className="text-xs text-neutral-500 mt-1">Par {totalPar}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-neutral-600 mb-1">vs Par</div>
                  <div className={`text-4xl font-bold ${totalNet < totalPar ? 'text-green-600' : totalNet > totalPar ? 'text-red-600' : 'text-neutral-600'}`}>
                    {totalNet ? (totalNet > totalPar ? '+' : '') + (totalNet - totalPar) : '-'}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button onClick={onClose} variant="secondary" disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="primary"
          icon={Save}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Scores'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default LeagueScoreSubmission;
