import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import api, { uploadScorecardPhoto } from '../services/api';
import { toast } from 'react-toastify';
import { Trophy, Users, Target, CheckCircle, Camera, Upload, X, Clock } from 'lucide-react';
import { useUserCourse } from '../hooks/useUserCourse';

interface ChampionshipPlayerScoringProps {
  tournamentId: number;
  tournamentName: string;
  onScoreSubmitted: () => void;
  tournament?: any; // Add tournament object for course assignment
}

interface Match {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_name: string;
  player1_last_name: string;
  player1_handicap?: number;
  player1_grass_handicap?: number;
  player2_name: string;
  player2_last_name: string;
  player2_handicap?: number;
  player2_grass_handicap?: number;
  match_number: number;
  match_status: string;
  winner_id?: number;
  course_id?: number;
  teebox?: string;
  player1_hole_scores?: string;
  player2_hole_scores?: string;
  player1_net_hole_scores?: string;
  player2_net_hole_scores?: string;
  player1_scorecard_photo_url?: string;
  player2_scorecard_photo_url?: string;
}

interface PlayerMatch {
  match: Match;
  opponent: {
    id: number;
    name: string;
    last_name: string;
  };
  isPlayer1: boolean;
}

const ChampionshipPlayerScoring: React.FC<ChampionshipPlayerScoringProps> = ({
  tournamentId,
  tournamentName,
  onScoreSubmitted,
  tournament
}) => {
  const { user } = useAuth();
  const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [holeScores, setHoleScores] = useState<number[]>(new Array(18).fill(0));
  const [submitting, setSubmitting] = useState(false);
  
  // Course data for handicap calculation
  const [courseData, setCourseData] = useState<any>(null);
  const [holeIndexes, setHoleIndexes] = useState<number[]>([]);
  const [parValues, setParValues] = useState<number[]>([]);
  const [opponentHandicap, setOpponentHandicap] = useState<number>(0);
  
  // Get user's appropriate course based on their club
  const { courseData: userCourseData, loading: userCourseLoading, courseId: userCourseId } = useUserCourse(tournamentId, tournament);

  // Scorecard photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scorecardPhotoUrl, setScorecardPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPlayerMatches();
  }, [tournamentId, user?.member_id]);

  // Fetch course data for handicap calculation
  useEffect(() => {
    const fetchCourseData = async () => {
      const effectiveCourseId = userCourseId || tournament?.course_id;
      
      if (!effectiveCourseId) {
        console.log('No course ID available for handicap calculation');
        return;
      }
      
      try {
        const response = await api.get(`/simulator-courses?id=${effectiveCourseId}`);
        const courses = response.data.courses || response.data;
        
        if (courses && courses.length > 0) {
          const course = courses[0];
          setCourseData(course);
          setHoleIndexes(course.hole_indexes || []);
          setParValues(course.par_values || []);
          console.log('Course data loaded for handicap calculation:', {
            courseId: effectiveCourseId,
            holeIndexes: course.hole_indexes,
            parValues: course.par_values
          });
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
      }
    };

    if (userCourseId || tournament?.course_id) {
      fetchCourseData();
    }
  }, [userCourseId, tournament?.course_id]);

  // Calculate net score for a hole based on handicap
  const calculateNetScore = (grossScore: number, handicap: number, holeNumber: number, opponentHandicap: number = 0): number => {
    if (holeNumber === 0) return grossScore;
    
    // Calculate the handicap differential (max 8 strokes for match play)
    const rawDifferential = Math.abs(handicap - opponentHandicap);
    const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
    
    // Determine which player gets strokes (the higher handicap player)
    const playerGetsStrokes = handicap > opponentHandicap;
    
    if (!playerGetsStrokes) {
      // This player doesn't get strokes, return gross score
      return grossScore;
    }
    
    // Get the actual hole index from course data (1-18, with 1 being hardest)
    // If no course data, fall back to hole number
    const actualHoleIndex = holeIndexes[holeNumber - 1] || holeNumber;
    
    // Calculate handicap strokes for this hole based on course handicap index
    // Distribute strokes across holes based on their handicap index (1-18)
    const handicapStrokes = Math.floor(handicapDifferential / 18) +
      (handicapDifferential % 18 >= actualHoleIndex ? 1 : 0);
    
    // Return net score (gross - handicap strokes), minimum 1
    return Math.max(1, grossScore - handicapStrokes);
  };

  // Check if player gets strokes on a specific hole
  const playerGetsStrokesOnHole = (holeNumber: number): boolean => {
    if (!user?.member_id || !selectedMatch) return false;
    
    // Use the same handicap values as the match data for consistency
    const isPlayer1 = selectedMatch.player1_id === user.member_id;
    const currentPlayerHandicap = isPlayer1 ? 
      Number(selectedMatch.player1_handicap || selectedMatch.player1_grass_handicap || 0) : 
      Number(selectedMatch.player2_handicap || selectedMatch.player2_grass_handicap || 0);
    const opponentHandicap = isPlayer1 ? 
      Number(selectedMatch.player2_handicap || selectedMatch.player2_grass_handicap || 0) : 
      Number(selectedMatch.player1_handicap || selectedMatch.player1_grass_handicap || 0);
    
    // Calculate the handicap differential (max 8 strokes for match play)
    const rawDifferential = Math.abs(currentPlayerHandicap - opponentHandicap);
    const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
    
    // Determine which player gets strokes (the higher handicap player)
    const playerGetsStrokes = currentPlayerHandicap > opponentHandicap;
    
    if (!playerGetsStrokes) return false;
    
    // Get the actual hole index from course data
    const actualHoleIndex = holeIndexes[holeNumber - 1] || holeNumber;
    
    // Check if this hole gets strokes using rounded differential
    return handicapDifferential % 18 >= actualHoleIndex;
  };

  // Check if opponent gets strokes on a specific hole (from current player's perspective)
  const opponentGetsStrokesOnHole = (holeNumber: number, match?: Match): boolean => {
    const matchToUse = match || selectedMatch;
    if (!user?.member_id || !matchToUse) return false;
    
    // Use the same handicap values as the match data for consistency
    const isPlayer1 = matchToUse.player1_id === user.member_id;
    const currentPlayerHandicap = isPlayer1 ? 
      Number(matchToUse.player1_handicap || matchToUse.player1_grass_handicap || 0) : 
      Number(matchToUse.player2_handicap || matchToUse.player2_grass_handicap || 0);
    const opponentHandicap = isPlayer1 ? 
      Number(matchToUse.player2_handicap || matchToUse.player2_grass_handicap || 0) : 
      Number(matchToUse.player1_handicap || matchToUse.player1_grass_handicap || 0);
    
    // Calculate the handicap differential (max 8 strokes for match play)
    const rawDifferential = Math.abs(currentPlayerHandicap - opponentHandicap);
    const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
    
    // Determine which player gets strokes (the higher handicap player)
    const opponentGetsStrokes = opponentHandicap > currentPlayerHandicap;
    
    if (!opponentGetsStrokes) return false;
    
    // Get the actual hole index from course data
    const actualHoleIndex = holeIndexes[holeNumber - 1] || holeNumber;
    
    // Check if this hole gets strokes using rounded differential
    return handicapDifferential % 18 >= actualHoleIndex;
  };

  // Calculate stroke difference for match play
  const calculateStrokeDifference = (match: Match) => {
    const player1Handicap = Number(match.player1_handicap || match.player1_grass_handicap || 0);
    const player2Handicap = Number(match.player2_handicap || match.player2_grass_handicap || 0);
    
    // Calculate the handicap differential (max 8 strokes for match play)
    const rawDifferential = Math.abs(player1Handicap - player2Handicap);
    const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
    
    // Determine higher handicap player before rounding
    const higherHandicapPlayer = player1Handicap > player2Handicap ? 'player1' : 'player2';
    
    // Debug logging for stroke calculation
    console.log('Stroke calculation debug:', {
      matchId: match.id,
      player1Name: `${match.player1_name} ${match.player1_last_name}`,
      player2Name: `${match.player2_name} ${match.player2_last_name}`,
      player1Handicap,
      player2Handicap,
      player1SimHandicap: match.player1_handicap,
      player1GrassHandicap: match.player1_grass_handicap,
      player2SimHandicap: match.player2_handicap,
      player2GrassHandicap: match.player2_grass_handicap,
      rawDifferential,
      handicapDifferential,
      higherHandicapPlayer,
      strokesReceived: Math.round(handicapDifferential)
    });
    
    return {
      player1Handicap: Number(player1Handicap.toFixed(1)),
      player2Handicap: Number(player2Handicap.toFixed(1)),
      handicapDifferential: Number(handicapDifferential.toFixed(1)),
      higherHandicapPlayer,
      strokesReceived: Math.round(handicapDifferential)
    };
  };

  const loadPlayerMatches = async () => {
    if (!user?.member_id) return;

    try {
      setLoading(true);
      console.log('Loading championship matches for tournament:', tournamentId, 'user:', user.member_id);
      const response = await api.get(`/tournaments/${tournamentId}/championship-matches`);
      console.log('Championship matches response:', response.data);
      const matches: Match[] = response.data;

      // Filter matches for this player
      const playerMatchesData: PlayerMatch[] = matches
        .filter(match => 
          match.player1_id === user.member_id || match.player2_id === user.member_id
        )
        .map(match => ({
          match,
          opponent: {
            id: match.player1_id === user.member_id ? match.player2_id : match.player1_id,
            name: match.player1_id === user.member_id ? match.player2_name : match.player1_name,
            last_name: match.player1_id === user.member_id ? match.player2_last_name : match.player1_last_name
          },
          isPlayer1: match.player1_id === user.member_id
        }));

      console.log('Filtered player matches:', playerMatchesData);
      setPlayerMatches(playerMatchesData);
    } catch (error) {
      console.error('Error loading player matches:', error);
      toast.error('Failed to load your matches');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreMatch = (match: Match) => {
    setSelectedMatch(match);
    setHoleScores(new Array(18).fill(0));
    setScorecardPhotoUrl(null); // Reset photo when opening new match
    setShowScoringModal(true);
  };

  const handleSubmitScore = async () => {
    if (!selectedMatch || !user?.member_id) return;

    // Validate scores
    const validScores = holeScores.filter(score => score > 0);
    if (validScores.length === 0) {
      toast.error('Please enter at least one hole score');
      return;
    }

    setSubmitting(true);

    try {
      // Get both players' handicaps for proper net score calculation
      const currentPlayerHandicap = Number(user?.sim_handicap || user?.handicap || 0);
      const isPlayer1 = selectedMatch.player1_id === user.member_id;
      const opponentHandicap = isPlayer1 ? 
        Number(selectedMatch.player2_handicap || selectedMatch.player2_grass_handicap || 0) : 
        Number(selectedMatch.player1_handicap || selectedMatch.player1_grass_handicap || 0);
      
      // Calculate net scores for the current player using actual course hole indexes
      const netScores = holeScores.map((score, index) => {
        if (score === 0) return 0;
        const holeNumber = index + 1; // Hole numbers are 1-18
        // Calculate net score with proper opponent handicap for correct stroke assignment
        return calculateNetScore(score, currentPlayerHandicap, holeNumber, opponentHandicap);
      });
      
      const response = await api.put(`/tournaments/${tournamentId}/championship-matches/${selectedMatch.id}/result`, {
        [isPlayer1 ? 'player1_hole_scores' : 'player2_hole_scores']: JSON.stringify(holeScores),
        [isPlayer1 ? 'player1_net_hole_scores' : 'player2_net_hole_scores']: JSON.stringify(netScores),
        [isPlayer1 ? 'player1_scorecard_photo_url' : 'player2_scorecard_photo_url']: scorecardPhotoUrl || null,
        match_status: 'in_progress' // Set to in_progress until opponent submits
      });

      toast.success('Your scores have been submitted! Waiting for opponent to submit their scores.');
      setShowScoringModal(false);
      setSelectedMatch(null);
      loadPlayerMatches();
      onScoreSubmitted();
    } catch (error) {
      console.error('Error submitting match score:', error);
      toast.error('Failed to submit match score');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchStatus = (match: Match) => {
    if (match.match_status === 'completed') {
      if (match.winner_id === null) {
        return 'Tied';
      }
      return match.winner_id === user?.member_id ? 'Won' : 'Lost';
    }
    if (match.match_status === 'in_progress') {
      return 'In Progress';
    }
    return 'Pending';
  };

  const getMatchStatusColor = (match: Match) => {
    if (match.match_status === 'completed') {
      if (match.winner_id === null) {
        return 'text-yellow-600';
      }
      return match.winner_id === user?.member_id ? 'text-green-600' : 'text-red-600';
    }
    if (match.match_status === 'in_progress') {
      return 'text-blue-600';
    }
    return 'text-gray-600';
  };

  // Photo upload handlers
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Photo upload started:', file.name, file.size, file.type);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      console.log('Uploading photo to server...');
      const response = await uploadScorecardPhoto(file);
      console.log('Photo upload response:', response.data);
      
      if (response.data.success) {
        setScorecardPhotoUrl(response.data.photoUrl);
        toast.success('Scorecard photo uploaded successfully');
        console.log('Photo URL set:', response.data.photoUrl);
      } else {
        console.error('Upload failed:', response.data);
        toast.error('Upload failed: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      console.error('Error details:', err.response?.data);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    setScorecardPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-brand-black mb-2">
          <Trophy className="inline w-8 h-8 mr-2 text-brand-neon-green" />
          Championship Scoring
        </h3>
        <p className="text-neutral-600">{tournamentName}</p>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-brand-black">Your Matches</h4>
        
        {playerMatches.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
            <p>No matches assigned yet</p>
            <p className="text-sm">Check back later or contact the tournament organizer</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {playerMatches.map((playerMatch) => {
              console.log('Rendering match:', playerMatch);
              const strokeInfo = calculateStrokeDifference(playerMatch.match);
              const currentPlayerName = playerMatch.isPlayer1 ? 
                `${playerMatch.match.player1_name} ${playerMatch.match.player1_last_name}` :
                `${playerMatch.match.player2_name} ${playerMatch.match.player2_last_name}`;
              const currentPlayerHandicap = playerMatch.isPlayer1 ? 
                strokeInfo.player1Handicap : strokeInfo.player2Handicap;
              const opponentHandicap = playerMatch.isPlayer1 ? 
                strokeInfo.player2Handicap : strokeInfo.player1Handicap;
              
              return (
              <div key={playerMatch.match.id} className="bg-white border border-neutral-200 rounded-lg p-3 sm:p-4">
                {/* Header with Match Number and Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-neutral-600">
                    Match {playerMatch.match.match_number}
                  </div>
                  {/* Status Badge */}
                  <div className="flex items-center">
                    {playerMatch.match.match_status === 'pending' && (
                      <div className="flex items-center px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs sm:text-sm font-medium">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Pending
                      </div>
                    )}
                    {playerMatch.match.match_status === 'in_progress' && (
                      <div className="flex items-center px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full mr-1 sm:mr-2"></div>
                        <span className="hidden sm:inline">In Progress</span>
                        <span className="sm:hidden">Progress</span>
                      </div>
                    )}
                    {playerMatch.match.match_status === 'completed' && (
                      <div className={`flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                        playerMatch.match.winner_id === null
                          ? 'bg-yellow-100 text-yellow-800'
                          : playerMatch.match.winner_id === user?.member_id 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {playerMatch.match.winner_id === null 
                          ? 'Tied' 
                          : playerMatch.match.winner_id === user?.member_id 
                          ? 'Won' 
                          : 'Lost'
                        }
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Players and Handicaps - Mobile Optimized Layout */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                    <div className="text-xs font-medium text-blue-800 mb-1">You</div>
                    <div className="text-sm sm:text-lg font-semibold text-blue-900 truncate">
                      {currentPlayerName}
                    </div>
                    <div className="text-xs text-blue-700">
                      Hcp: {Number(currentPlayerHandicap || 0).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
                    <div className="text-xs font-medium text-green-800 mb-1">Opponent</div>
                    <div className="text-sm sm:text-lg font-semibold text-green-900 truncate">
                      {playerMatch.opponent.name} {playerMatch.opponent.last_name}
                    </div>
                    <div className="text-xs text-green-700">
                      Hcp: {Number(opponentHandicap || 0).toFixed(1)}
                    </div>
                  </div>
                </div>
                
                {/* Stroke Information */}
                {strokeInfo.handicapDifferential > 0 && (
                  <div className="mb-3 space-y-2">
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-xs sm:text-sm text-yellow-800">
                        <strong>
                          {strokeInfo.higherHandicapPlayer === 'player1' ? 
                            `${playerMatch.match.player1_name} ${playerMatch.match.player1_last_name}` :
                            `${playerMatch.match.player2_name} ${playerMatch.match.player2_last_name}`
                          }
                        </strong> receives {strokeInfo.strokesReceived} stroke{strokeInfo.strokesReceived !== 1 ? 's' : ''} for this match
                      </div>
                    </div>
                    
                    {/* Show which holes opponent gets strokes on */}
                    {(() => {
                      const opponentStrokeHoles = [];
                      for (let i = 1; i <= 18; i++) {
                        if (opponentGetsStrokesOnHole(i, playerMatch.match)) {
                          opponentStrokeHoles.push(i);
                        }
                      }
                      
                      if (opponentStrokeHoles.length > 0) {
                        return (
                          <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-xs text-orange-800">
                              <strong>Your opponent gets strokes on holes:</strong> {opponentStrokeHoles.join(', ')}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                
                {/* Action Button - Mobile Optimized */}
                <div className="mt-3">
                  {playerMatch.match.match_status === 'pending' && (
                    <button
                      onClick={() => handleScoreMatch(playerMatch.match)}
                      className="w-full px-3 sm:px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center justify-center shadow-sm text-sm"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Enter Score
                    </button>
                  )}
                  {playerMatch.match.match_status === 'in_progress' && (
                    <div className="space-y-2">
                      {/* Check if current player has already submitted their score */}
                      {(() => {
                        const isPlayer1 = playerMatch.match.player1_id === user?.member_id;
                        const currentPlayerScores = isPlayer1 ? playerMatch.match.player1_hole_scores : playerMatch.match.player2_hole_scores;
                        
                        // Simple check: if scores exist and are not empty/null
                        const hasCurrentPlayerScores = currentPlayerScores && 
                          currentPlayerScores !== 'null' && 
                          currentPlayerScores !== '[]' &&
                          (typeof currentPlayerScores === 'string' ? currentPlayerScores.trim() !== '' : true);
                        
                        console.log('Score check debug:', {
                          isPlayer1,
                          currentPlayerScores,
                          hasCurrentPlayerScores,
                          matchStatus: playerMatch.match.match_status,
                          player1Scores: playerMatch.match.player1_hole_scores,
                          player2Scores: playerMatch.match.player2_hole_scores
                        });
                        
                        return hasCurrentPlayerScores;
                      })() ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center justify-center px-2 sm:px-3 py-2 bg-green-100 text-green-800 rounded-lg text-xs sm:text-sm font-medium">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Score Submitted</span>
                            <span className="sm:hidden">Submitted</span>
                          </div>
                          <div className="flex items-center justify-center px-2 sm:px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-xs sm:text-sm font-medium">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full mr-1 sm:mr-2"></div>
                            <span className="hidden sm:inline">Waiting for opponent</span>
                            <span className="sm:hidden">Waiting</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleScoreMatch(playerMatch.match)}
                          className="w-full px-3 sm:px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center justify-center shadow-sm text-sm"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Enter Score
                        </button>
                      )}
                    </div>
                  )}
                  {playerMatch.match.match_status === 'completed' && (
                    <div className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Match Complete</span>
                      <span className="sm:hidden">Complete</span>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scoring Modal - Mobile Optimized */}
      {showScoringModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h4 className="text-base sm:text-lg font-semibold mb-4">
              Enter Scores - Match {selectedMatch.match_number}
            </h4>
            
            <div className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs sm:text-sm font-medium text-blue-800 mb-1">You</div>
                  <div className="text-base sm:text-lg font-semibold text-blue-900 truncate">
                    {selectedMatch.player1_id === user?.member_id ? 
                      `${selectedMatch.player1_name} ${selectedMatch.player1_last_name}` : 
                      `${selectedMatch.player2_name} ${selectedMatch.player2_last_name}`
                    }
                  </div>
                  <div className="text-xs sm:text-sm text-blue-700">
                    Handicap: {selectedMatch.player1_id === user?.member_id ? 
                      (selectedMatch.player1_handicap || selectedMatch.player1_grass_handicap || 0) :
                      (selectedMatch.player2_handicap || selectedMatch.player2_grass_handicap || 0)
                    }
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs sm:text-sm font-medium text-green-800 mb-1">Opponent</div>
                  <div className="text-base sm:text-lg font-semibold text-green-900 truncate">
                    {selectedMatch.player1_id === user?.member_id ? 
                      `${selectedMatch.player2_name} ${selectedMatch.player2_last_name}` : 
                      `${selectedMatch.player1_name} ${selectedMatch.player1_last_name}`
                    }
                  </div>
                  <div className="text-xs sm:text-sm text-green-700">
                    Handicap: {selectedMatch.player1_id === user?.member_id ? 
                      (selectedMatch.player2_handicap || selectedMatch.player2_grass_handicap || 0) :
                      (selectedMatch.player1_handicap || selectedMatch.player1_grass_handicap || 0)
                    }
                  </div>
                </div>
              </div>
              
                {/* Stroke Information - Mobile Optimized */}
                {(() => {
                  const strokeInfo = calculateStrokeDifference(selectedMatch);
                  if (strokeInfo.handicapDifferential > 0) {
                    // Get holes where opponent gets strokes
                    const opponentStrokeHoles = [];
                    for (let i = 1; i <= 18; i++) {
                      if (opponentGetsStrokesOnHole(i, selectedMatch)) {
                        opponentStrokeHoles.push(i);
                      }
                    }
                    
                    return (
                      <div className="space-y-3">
                        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="text-xs sm:text-sm text-yellow-800">
                            <strong>
                              {strokeInfo.higherHandicapPlayer === 'player1' ? 
                                `${selectedMatch.player1_name} ${selectedMatch.player1_last_name}` :
                                `${selectedMatch.player2_name} ${selectedMatch.player2_last_name}`
                              }
                            </strong> receives {strokeInfo.strokesReceived} stroke{strokeInfo.strokesReceived !== 1 ? 's' : ''} for this match
                          </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="text-xs text-gray-700 mb-2 font-medium">Scorecard Legend:</div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-green-100 border border-green-300 rounded-full mr-1"></span>
                              <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs mr-1">S</span>
                              You get strokes
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-full mr-1"></span>
                              <span className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded text-xs mr-1">O</span>
                              Opponent gets strokes
                            </div>
                          </div>
                        </div>
                        
                        {/* Opponent stroke holes summary */}
                        {opponentStrokeHoles.length > 0 && (
                          <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-xs text-orange-800">
                              <strong>Your opponent gets strokes on holes:</strong> {opponentStrokeHoles.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
            </div>

            {/* Hole Scores Table - Mobile Optimized */}
            <div className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-neutral-300 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-neutral-50">
                      <th className="border border-neutral-300 px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium text-neutral-700">Hole</th>
                      <th className="border border-neutral-300 px-1 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-neutral-700">Idx</th>
                      <th className="border border-neutral-300 px-1 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-neutral-700">Par</th>
                      <th className="border border-neutral-300 px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-neutral-700">Score</th>
                      <th className="border border-neutral-300 px-1 sm:px-3 py-2 text-center text-xs sm:text-sm font-medium text-neutral-700">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 18 }, (_, i) => {
                      const holeIndex = holeIndexes[i] || (i + 1);
                      const parValue = parValues[i] || 4;
                      const isBackNine = i >= 9;
                      const holeNumber = i + 1;
                      const getsStrokes = playerGetsStrokesOnHole(holeNumber);
                      const opponentGetsStrokes = opponentGetsStrokesOnHole(holeNumber, selectedMatch);
                      const isPlayer1 = selectedMatch?.player1_id === user?.member_id;
                      const currentPlayerHandicap = isPlayer1 ? 
                        Number(selectedMatch?.player1_handicap || selectedMatch?.player1_grass_handicap || 0) : 
                        Number(selectedMatch?.player2_handicap || selectedMatch?.player2_grass_handicap || 0);
                      const opponentHandicap = isPlayer1 ? 
                        Number(selectedMatch?.player2_handicap || selectedMatch?.player2_grass_handicap || 0) : 
                        Number(selectedMatch?.player1_handicap || selectedMatch?.player1_grass_handicap || 0);
                      const netScore = holeScores[i] > 0 ? 
                        calculateNetScore(holeScores[i], currentPlayerHandicap, holeNumber, opponentHandicap) : 0;
                      
                      return (
                        <tr 
                          key={i} 
                          className={`${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'} ${getsStrokes ? 'bg-green-50 border-l-4 border-l-green-400' : ''} ${opponentGetsStrokes ? 'bg-orange-50 border-l-4 border-l-orange-400' : ''}`}
                        >
                          <td className="border border-neutral-300 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-neutral-700">
                            <div className="flex items-center">
                              {i + 1}
                              {isBackNine && <span className="text-xs text-neutral-500 ml-1 hidden sm:inline">(Back 9)</span>}
                              {getsStrokes && <span className="ml-1 sm:ml-2 text-xs bg-green-100 text-green-800 px-1 sm:px-2 py-1 rounded-full">S</span>}
                              {opponentGetsStrokes && <span className="ml-1 sm:ml-2 text-xs bg-orange-100 text-orange-800 px-1 sm:px-2 py-1 rounded-full">O</span>}
                            </div>
                          </td>
                          <td className="border border-neutral-300 px-1 sm:px-3 py-2 text-center text-xs sm:text-sm text-neutral-600">
                            {holeIndex}
                          </td>
                          <td className="border border-neutral-300 px-1 sm:px-3 py-2 text-center text-xs sm:text-sm text-neutral-600">
                            {parValue}
                          </td>
                          <td className="border border-neutral-300 px-2 sm:px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              max="15"
                              value={holeScores[i] || ''}
                              onChange={(e) => {
                                const newScores = [...holeScores];
                                newScores[i] = parseInt(e.target.value) || 0;
                                setHoleScores(newScores);
                              }}
                              className="w-full px-1 sm:px-2 py-1 border border-neutral-300 rounded text-center text-xs sm:text-sm focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                              placeholder="0"
                            />
                          </td>
                          <td className="border border-neutral-300 px-1 sm:px-3 py-2 text-center text-xs sm:text-sm">
                            {netScore > 0 ? (
                              <span className={`font-medium ${netScore < holeScores[i] ? 'text-green-600' : 'text-neutral-600'}`}>
                                {netScore}
                              </span>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Score Display */}
            <div className="mb-6 p-3 bg-neutral-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Score:</span>
                <span className="text-lg font-bold text-brand-black">
                  {holeScores.reduce((sum, score) => sum + (score || 0), 0)}
                </span>
              </div>
            </div>

            {/* Scorecard Photo Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Scorecard Photo (Optional)
              </label>
              <div className="space-y-3">
                {!scorecardPhotoUrl ? (
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={triggerPhotoUpload}
                      disabled={uploadingPhoto}
                      className="flex items-center px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingPhoto ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-neon-green mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </button>
                    <span className="text-xs text-neutral-500">
                      JPG, PNG, GIF up to 5MB
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Photo uploaded successfully</span>
                      </div>
                      <div className="mt-1">
                        <img
                          src={scorecardPhotoUrl}
                          alt="Scorecard"
                          className="w-32 h-24 object-cover rounded-lg border border-neutral-200"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowScoringModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-neutral-600 hover:text-neutral-800 text-sm sm:text-base"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitScore}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {submitting ? 'Submitting...' : 'Submit Score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChampionshipPlayerScoring;
