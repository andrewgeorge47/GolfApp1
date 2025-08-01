import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Clock, Users, Trophy, Eye, EyeOff, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Target, TrendingUp, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { submitWeeklyScorecard, getWeeklyLeaderboard, getWeeklyMatches, getWeeklyScorecard, getWeeklyFieldStats, getCurrentWeeklyScorecard } from '../services/api';
import { useAuth } from '../AuthContext';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

interface WeeklyScoringProps {
  tournamentId: number;
  tournamentName: string;
  onScoreSubmitted?: () => void;
}

interface HoleScore {
  hole: number;
  score: number;
  submitted: boolean;
}

interface FieldStats {
  hole: number;
  averageScore: number;
  totalPlayers: number;
  bestScore: number;
}

const NewWeeklyScoring: React.FC<WeeklyScoringProps> = ({
  tournamentId,
  tournamentName,
  onScoreSubmitted
}) => {
  const { user } = useAuth();
  const [holeScores, setHoleScores] = useState<HoleScore[]>([
    { hole: 1, score: 0, submitted: false },
    { hole: 2, score: 0, submitted: false },
    { hole: 3, score: 0, submitted: false },
    { hole: 4, score: 0, submitted: false },
    { hole: 5, score: 0, submitted: false },
    { hole: 6, score: 0, submitted: false },
    { hole: 7, score: 0, submitted: false },
    { hole: 8, score: 0, submitted: false },
    { hole: 9, score: 0, submitted: false }
  ]);
  const [currentRound, setCurrentRound] = useState(1); // 1, 2, 3, or 'LB'
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLiveOptions, setShowLiveOptions] = useState(false);
  const [fieldStats, setFieldStats] = useState<FieldStats[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{
    totalPoints: number;
    holePoints: number;
    roundPoints: number;
    liveBonus: number;
  }>({
    totalPoints: 0,
    holePoints: 0,
    roundPoints: 0,
    liveBonus: 0
  });

  const [holeResults, setHoleResults] = useState<{
    [holeNumber: number]: {
      points: number;
      result: 'W' | 'T' | 'L' | null;
      fieldRank: number;
      totalField: number;
      record: string;
    };
  }>({});

  const [roundResults, setRoundResults] = useState<{
    [roundNumber: number]: {
      result: 'W' | 'T' | 'L' | null;
      record: string;
    };
    }>({});

  // Track matchplay state for each opponent
  const [matchplayStates, setMatchplayStates] = useState<{
    [playerId: string]: {
      [holeNumber: number]: number; // 0 = AS, positive = up, negative = down
    };
  }>({});

  // Real-time update state with smart polling
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const isInitialLoadRef = useRef(true);
  const lastDataHashRef = useRef<string>('');
  const lastLeaderboardRef = useRef<any[]>([]);
  const lastFieldStatsRef = useRef<FieldStats[]>([]);

  // Helper function to get week start date (Monday) - using UTC to match server
  const getWeekStartDate = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getUTCDay();
    // Monday = 1, Sunday = 0
    // If it's Sunday (0), we want the previous Monday (-6 days)
    // If it's any other day, we want the current week's Monday
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setUTCDate(diff));
    // Use UTC to match server timezone
    const year = weekStart.getUTCFullYear();
    const month = String(weekStart.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(weekStart.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + dayOfMonth;
  };

  const currentWeek = getWeekStartDate();

  // Calculate matchplay states when leaderboard or hole scores change
  useEffect(() => {
    console.log('=== CALCULATING MATCHPLAY STATES ===');
    console.log('Leaderboard length:', leaderboard.length);
    console.log('Hole scores with submitted:', holeScores.filter(h => h.submitted).length);
    console.log('Current user:', user?.user_id || user?.member_id);
    
    if (leaderboard.length > 0 && holeScores.some(hole => hole.submitted)) {
      const newMatchplayStates: { [playerId: string]: { [holeNumber: number]: number } } = {};
      
      leaderboard.forEach(player => {
        if (player.user_id === user?.user_id || player.member_id === user?.member_id) {
          console.log('Skipping current user:', player.user_id || player.member_id);
          return; // Skip current user
        }
        
        const playerId = player.user_id || player.member_id;
        console.log('Calculating states for player:', playerId, player.first_name);
        newMatchplayStates[playerId] = {};
        
        // Calculate state for each round separately
        for (let round = 1; round <= 3; round++) {
          let currentState = 0; // Reset to AS for each round
          
          // Calculate state for holes in this round
          const roundStartHole = (round - 1) * 3 + 1;
          const roundEndHole = round * 3;
          
          for (let holeNumber = roundStartHole; holeNumber <= roundEndHole; holeNumber++) {
            const holeIndex = holeNumber - 1;
            const yourScore = holeScores[holeIndex]?.submitted ? holeScores[holeIndex].score : 0;
            const theirScore = player.hole_scores?.[holeIndex] || 0;
            
            console.log(`Hole ${holeNumber}: Your score: ${yourScore}, Their score: ${theirScore}`);
            
            if (yourScore > 0 && theirScore > 0) {
              // Calculate hole result
              let holeResult = 0;
              if (yourScore < theirScore) {
                holeResult = 1; // You win
                console.log(`Hole ${holeNumber}: You win (+1)`);
              } else if (yourScore > theirScore) {
                holeResult = -1; // You lose
                console.log(`Hole ${holeNumber}: You lose (-1)`);
              } else {
                console.log(`Hole ${holeNumber}: Tie (0)`);
              }
              // If tied, holeResult stays 0
              
              // Update state for this round
              currentState += holeResult;
              newMatchplayStates[playerId][holeNumber] = currentState;
              console.log(`Hole ${holeNumber}: State after: ${currentState}`);
            }
          }
        }
      });
      
      console.log('Final matchplay states:', newMatchplayStates);
      setMatchplayStates(newMatchplayStates);
    }
  }, [leaderboard, holeScores, user?.user_id, user?.member_id]);

  // Get holes for current round
  const getCurrentRoundHoles = () => {
    const startHole = (currentRound - 1) * 3 + 1;
    return holeScores.slice(startHole - 1, startHole + 2);
  };

  // Helper function to create a hash of current data for change detection
  const createDataHash = useCallback((leaderboard: any[], fieldStats: FieldStats[]) => {
    const leaderboardHash = JSON.stringify(leaderboard.map(p => ({
      user_id: p.user_id,
      total_score: p.total_score,
      hole_scores: p.hole_scores
    })));
    const fieldStatsHash = JSON.stringify(fieldStats.map(f => ({
      hole: f.hole,
      averageScore: f.averageScore,
      totalPlayers: f.totalPlayers
    })));
    return `${leaderboardHash}-${fieldStatsHash}`;
  }, []);

  // Smart data update function that only fetches if data has changed
  const performSmartDataUpdate = useCallback(async () => {
    try {
      // Fetch leaderboard and field stats
      const [leaderboardResponse, fieldStatsResponse] = await Promise.all([
        getWeeklyLeaderboard(tournamentId, currentWeek),
        getWeeklyFieldStats(tournamentId, currentWeek)
      ]);

      const newLeaderboard = leaderboardResponse.data;
      const newFieldStats = fieldStatsResponse.data;
      
      // Create hash of new data
      const newDataHash = createDataHash(newLeaderboard, newFieldStats);
      
      // Only update if data has actually changed
      if (newDataHash !== lastDataHashRef.current) {
        console.log('Data changed, updating UI...');
        setLeaderboard(newLeaderboard);
        setFieldStats(newFieldStats);
        lastDataHashRef.current = newDataHash;
        lastLeaderboardRef.current = newLeaderboard;
        lastFieldStatsRef.current = newFieldStats;
      } else {
        console.log('No data changes detected, skipping UI update');
      }

      // Always fetch current player data (this is lightweight)
      await Promise.all([
        fetchCurrentPlayerScorecard(),
        fetchCurrentPoints()
      ]);
      
    } catch (error) {
      console.error('Error in smart data update:', error);
      throw error;
    }
  }, [tournamentId, currentWeek, createDataHash]);

  // Combined update function for real-time updates (now uses smart update)
  const performDataUpdate = useCallback(async () => {
    await performSmartDataUpdate();
  }, [performSmartDataUpdate]);

  // Real-time updates hook
  const {
    isConnected,
    lastUpdateTime,
    error,
    manualRefresh,
    connectionStatus
  } = useRealTimeUpdates({
    enabled: autoRefreshEnabled,
    interval: refreshInterval,
    onUpdate: performDataUpdate,
    onError: (error) => {
      console.error('Real-time update error:', error);
      toast.error(`Connection error: ${error.message}`);
    },
    retryAttempts: 3,
    retryDelay: 5000
  });

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      await performDataUpdate();
      isInitialLoadRef.current = false;
    };
    
    initializeData();
  }, [currentWeek]);

  // Update hole results when leaderboard and field stats are available
  useEffect(() => {
    console.log('useEffect triggered - Leaderboard length:', leaderboard.length, 'Field stats length:', fieldStats.length);
    if (leaderboard.length > 0 && fieldStats.length > 0 && Object.keys(holeResults).length > 0) {
      console.log('Updating hole results with field data...');
      updateHoleResultsWithFieldData();
    }
  }, [leaderboard, fieldStats]);

  const fetchCurrentPlayerScorecard = async () => {
    try {
      // Use only the calculated week start date
      const response = await getCurrentWeeklyScorecard(tournamentId, currentWeek);
      if (response.data) {
        const existingScores = response.data.hole_scores;
        const updatedHoleScores = holeScores.map((hole, index) => ({
          ...hole,
          score: existingScores[index] || 0,
          submitted: existingScores[index] > 0
        }));
        setHoleScores(updatedHoleScores);
      }
    } catch (error) {
      console.error('Error fetching current player scorecard:', error);
    }
  };

  const fetchCurrentPoints = async () => {
    try {
      console.log('fetchCurrentPoints called');
      const currentUserId = user?.user_id || user?.member_id;
      if (!currentUserId) {
        console.log('No current user ID found');
        return;
      }
      console.log('Current user ID:', currentUserId);

      // Fetch match data for current points display using API service
      const matchResponse = await getWeeklyMatches(tournamentId, currentUserId, currentWeek);
      console.log('Match data response:', matchResponse.data);
      
      if (matchResponse.data && matchResponse.data.length > 0) {
        const match = matchResponse.data[0];
        console.log('Found match:', match);
        const isPlayer1 = match.player1_id === currentUserId;
        
        setCurrentPoints({
          totalPoints: Number(isPlayer1 ? match.total_points_player1 : match.total_points_player2 || 0),
          holePoints: Number(isPlayer1 ? match.hole_points_player1 : match.hole_points_player2 || 0),
          roundPoints: Number(isPlayer1 ? 
            (Number(match.round1_points_player1 || 0) + Number(match.round2_points_player1 || 0) + Number(match.round3_points_player1 || 0)) :
            (Number(match.round1_points_player2 || 0) + Number(match.round2_points_player2 || 0) + Number(match.round3_points_player2 || 0))
          ),
          liveBonus: 0 // Live bonus points are no longer awarded
        });
      }

      // Fetch hole points from backend API
      const holePointsResponse = await fetch(`/api/tournaments/${tournamentId}/weekly-hole-points/${currentUserId}?week_start_date=${currentWeek}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (holePointsResponse.ok) {
        const responseData = await holePointsResponse.json();
        console.log('Hole and round points data received:', responseData);
        
        const holePointsData = responseData.holePoints || responseData; // Handle both new and old format
        const roundPointsData = responseData.roundPoints || {};
        
        console.log('Hole points data:', holePointsData);
        console.log('Round points data:', roundPointsData);
        
        // Convert backend hole points to frontend format (without field data for now)
        const newHoleResults: { [holeNumber: number]: { points: number; result: 'W' | 'T' | 'L' | null; fieldRank: number; totalField: number; record: string; } } = {};
        const newRoundResults: { [roundNumber: number]: { result: 'W' | 'T' | 'L' | null; record: string; } } = {};
        
        for (let hole = 1; hole <= 9; hole++) {
          const holeData = holePointsData[hole];
          console.log(`Processing hole ${hole}:`, holeData);
          if (holeData) {
            // Include hole data without field rank for now
            newHoleResults[hole] = { 
              points: holeData.points, 
              result: holeData.result, 
              fieldRank: 0, // Will be updated when field data is available
              totalField: 0,
              record: holeData.record
            };
          }
        }
        
        // Process round results
        for (let round = 1; round <= 3; round++) {
          const roundData = roundPointsData[round];
          if (roundData) {
            newRoundResults[round] = {
              result: roundData.result,
              record: roundData.record
            };
          }
        }
        
        console.log('Hole results from backend:', newHoleResults);
        console.log('Round results from backend:', newRoundResults);
        console.log('Setting hole results:', newHoleResults);
        setHoleResults(newHoleResults);
        setRoundResults(newRoundResults);
      }
    } catch (error) {
      console.error('Error fetching current points:', error);
    }
  };

  const updateHoleResultsWithFieldData = () => {
    const currentUserId = user?.user_id || user?.member_id;
    if (!currentUserId) return;

    const updatedHoleResults = { ...holeResults };
    
    for (let hole = 1; hole <= 9; hole++) {
      const fieldStat = fieldStats.find(stat => stat.hole === hole);
      if (fieldStat && fieldStat.totalPlayers > 0) {
        const fieldScores = leaderboard
          .filter((player: any) => player.hole_scores && player.hole_scores[hole - 1] > 0)
          .map((player: any) => player.hole_scores[hole - 1])
          .sort((a: number, b: number) => a - b);
        
        if (fieldScores.length > 0) {
          // Find player's score for this hole
          const playerScore = leaderboard.find((player: any) => 
            (player.user_id === currentUserId || player.member_id === currentUserId)
          )?.hole_scores?.[hole - 1];
          
          if (playerScore && updatedHoleResults[hole]) {
            const playerRank = fieldScores.findIndex((score: number) => score === playerScore) + 1;
            const totalField = fieldScores.length;
            
            updatedHoleResults[hole] = { 
              ...updatedHoleResults[hole],
              fieldRank: playerRank, 
              totalField
            };
          }
        }
      }
    }
    
    console.log('Updated hole results with field data:', updatedHoleResults);
    setHoleResults(updatedHoleResults);
  };

  const handleHoleScoreChange = (holeIndex: number, score: number) => {
    if (score < 0) return;
    
    const newScores = [...holeScores];
    newScores[holeIndex] = { ...newScores[holeIndex], score };
    setHoleScores(newScores);
  };

  const submitHoleScore = async (holeIndex: number) => {
    const holeScore = holeScores[holeIndex];
    if (holeScore.score === 0 || holeScore.score < 1) {
      toast.error('Please enter a valid score (1-20) for this hole');
      return;
    }

    if (holeScore.score > 20) {
      toast.error('Score must be between 1 and 20');
      return;
    }

    if (holeScore.submitted) {
      toast.error('This hole has already been submitted');
      return;
    }

    setSubmitting(true);

    try {
      console.log('=== SUBMITTING HOLE SCORE ===');
      console.log('Tournament ID:', tournamentId);
      console.log('Hole Index:', holeIndex);
      console.log('Hole Scores:', holeScores);
      
      const tempScores = holeScores.map((h, i) => i === holeIndex ? h.score : 0);
      console.log('Temp Scores:', tempScores);
      
      console.log('Calling submitWeeklyScorecard...');
      const response = await submitWeeklyScorecard(tournamentId, {
        hole_scores: tempScores,
        is_live: isLive,
        group_id: groupId || undefined
      });
      console.log('API Response:', response);

      const newScores = [...holeScores];
      newScores[holeIndex] = { ...newScores[holeIndex], submitted: true };
      setHoleScores(newScores);

      // Update points after submission
      await fetchCurrentPoints();
      
      // Check if points were earned and show notification
      const holeResult = holeResults[holeIndex + 1];
      if (holeResult && holeResult.points > 0) {
        toast.success(`Hole ${holeIndex + 1} submitted! +${holeResult.points.toFixed(1)} points earned! 🎉`);
      } else {
        toast.success(`Hole ${holeIndex + 1} submitted successfully!`);
      }
      
      // Check if round was completed and show round win notification
      const currentRoundHoles = holeScores.slice((currentRound - 1) * 3, currentRound * 3);
      const roundCompleted = currentRoundHoles.every(hole => hole.submitted);
      if (roundCompleted) {
        // Check if current user won the round by comparing with other players
        const currentUserRoundScores = currentRoundHoles.map(hole => hole.score);
        const roundStartHole = (currentRound - 1) * 3;
        
        // Simple check: if user has the lowest total score in the round, they likely won
        const userRoundTotal = currentUserRoundScores.reduce((sum: number, score: number) => sum + score, 0);
        const otherPlayersRoundScores = leaderboard
          .filter(p => p.user_id !== user?.user_id && p.member_id !== user?.member_id)
          .map(p => p.hole_scores?.slice(roundStartHole, roundStartHole + 3) || [])
          .filter(scores => scores.every((score: number) => score > 0));
        
        const hasWonRound = otherPlayersRoundScores.every(otherScores => {
          const otherTotal = otherScores.reduce((sum: number, score: number) => sum + score, 0);
          return userRoundTotal <= otherTotal;
        });
        
        if (hasWonRound && otherPlayersRoundScores.length > 0) {
          toast.success(`Round ${currentRound} completed! You won the round! +1.0 points! 🏆`);
        }
      }
      
      // Immediately refresh leaderboard to show updated data
      await performDataUpdate();
      
      if (onScoreSubmitted) {
        onScoreSubmitted();
      }
    } catch (error: any) {
      console.error('Error submitting hole score:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to submit hole score');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFinalScorecard = async () => {
    if (holeScores.some(hole => hole.score === 0)) {
      toast.error('Please enter scores for all 9 holes');
      return;
    }

    if (holeScores.some(hole => hole.score < 1 || hole.score > 20)) {
      toast.error('All scores must be between 1 and 20');
      return;
    }

    setSubmitting(true);

    try {
      const finalScores = holeScores.map(hole => hole.score);
      
      const response = await submitWeeklyScorecard(tournamentId, {
        hole_scores: finalScores,
        is_live: isLive,
        group_id: groupId || undefined
      });

      toast.success('Final scorecard submitted successfully!');
      
      setHoleScores(holeScores.map(hole => ({ ...hole, score: 0, submitted: false })));
      setIsLive(false);
      setGroupId('');
      setCurrentRound(1);
      
      // Immediately refresh all data
      await performDataUpdate();
      
      if (onScoreSubmitted) {
        onScoreSubmitted();
      }
    } catch (error: any) {
      console.error('Error submitting final scorecard:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to submit scorecard');
    } finally {
      setSubmitting(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    toast.info('Refreshing live data...');
    await manualRefresh();
    toast.success('Data refreshed successfully!');
  };

  const totalScore = holeScores.reduce((sum, hole) => sum + hole.score, 0);
  const completedHoles = holeScores.filter(hole => hole.score > 0).length;
  const submittedHoles = holeScores.filter(hole => hole.submitted).length;
  const currentRoundHoles = getCurrentRoundHoles();
  const currentRoundScore = currentRoundHoles.reduce((sum, hole) => sum + hole.score, 0);

  // Get connection status icon and color
  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: Wifi, color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'disconnected':
        return { icon: WifiOff, color: 'text-gray-600', bgColor: 'bg-gray-100' };
      case 'error':
        return { icon: WifiOff, color: 'text-red-600', bgColor: 'bg-red-100' };
      case 'retrying':
        return { icon: RefreshCw, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      default:
        return { icon: WifiOff, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const connectionDisplay = getConnectionStatusDisplay();
  const ConnectionIcon = connectionDisplay.icon;

  return (
    <div className="max-w-md mx-auto p-2 sm:p-4 bg-gray-50 min-h-screen">
      {/* Header with Round Selection and Live Status */}
      <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm">
        <div className="text-center mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
            {tournamentName}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {showLeaderboard ? 'Leaderboard' : `Round ${currentRound} of 3`}
          </p>
          {/* Live Status Indicator */}
          <div className="flex items-center justify-center space-x-1 sm:space-x-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-xs sm:text-sm text-gray-600">
              {autoRefreshEnabled ? 'Live Updates' : 'Manual Mode'}
            </span>
            <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">
              • Last update: {lastUpdateTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (showLeaderboard) {
                setShowLeaderboard(false);
                setCurrentRound(3);
              } else {
                setCurrentRound(Math.max(1, currentRound - 1));
              }
            }}
            disabled={!showLeaderboard && currentRound === 1}
            className="p-3 sm:p-2 rounded-full bg-gray-100 shadow-sm disabled:opacity-50 touch-manipulation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex space-x-1 sm:space-x-2">
            {[1, 2, 3].map((round) => (
              <button
                key={round}
                onClick={() => {
                  setCurrentRound(round);
                  setShowLeaderboard(false);
                }}
                className={`w-14 h-14 sm:w-12 sm:h-12 rounded-full text-sm font-bold flex items-center justify-center touch-manipulation ${
                  !showLeaderboard && currentRound === round
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span className="text-lg font-bold">{round}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setShowLeaderboard(true);
              }}
              className={`w-14 h-14 sm:w-12 sm:h-12 rounded-full text-sm font-bold flex items-center justify-center touch-manipulation ${
                showLeaderboard
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span className="text-lg font-bold">LB</span>
            </button>
          </div>
          
          <button
            onClick={() => {
              if (showLeaderboard) {
                setShowLeaderboard(false);
                setCurrentRound(1);
              } else {
                setCurrentRound(Math.min(3, currentRound + 1));
              }
            }}
            disabled={!showLeaderboard && currentRound === 3}
            className="p-3 sm:p-2 rounded-full bg-gray-100 shadow-sm disabled:opacity-50 touch-manipulation"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Live Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-3 py-2 sm:py-1 rounded-full text-xs sm:text-xs font-medium touch-manipulation ${
                autoRefreshEnabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoRefreshEnabled ? 'Auto' : 'Manual'}
            </button>
            <select
              value={refreshInterval / 1000}
              onChange={(e) => setRefreshInterval(Number(e.target.value) * 1000)}
              disabled={!autoRefreshEnabled}
              className="text-xs border rounded px-2 py-2 sm:py-1 disabled:opacity-50 touch-manipulation"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${connectionDisplay.bgColor} ${connectionDisplay.color}`}>
              <ConnectionIcon className="w-3 h-3" />
              <span className="capitalize hidden sm:inline">{connectionStatus}</span>
            </div>
            
            <button
              onClick={handleManualRefresh}
              disabled={leaderboardLoading}
              className="flex items-center space-x-1 px-3 py-2 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 disabled:opacity-50 touch-manipulation"
            >
              <RefreshCw className={`w-3 h-3 ${leaderboardLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            Connection error: {error.message}
          </div>
        )}
      </div>



      {/* Conditional Content */}
      {showLeaderboard ? (
        /* Leaderboard View */
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">🏆 Weekly Leaderboard</h3>
            <p className="text-sm sm:text-base text-gray-600">Overall standings for the week</p>
          </div>
          
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full text-center min-w-full">
                <thead>
                  <tr>
                    <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600 text-left">Rank</th>
                    <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600 text-left">Player</th>
                    <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600 hidden sm:table-cell">Hole Pts</th>
                    <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600 hidden sm:table-cell">Round Pts</th>
                    <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((player, index) => {
                    const isCurrentUser = (String(player.user_id || player.member_id) === String(user?.user_id || user?.member_id));
                    
                    // Get points from leaderboard data
                    const totalPoints = Number(player.total_score || 0);
                    const holePoints = Number(player.total_hole_points || 0);
                    const roundPoints = Number(player.total_round_points || 0);
                    
                    return (
                      <tr key={player.user_id} className={`${isCurrentUser ? 'bg-blue-50' : ''}`}>
                        <td className="px-1 sm:px-2 py-2 text-left">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-1 sm:px-2 py-2 text-left">
                          <div>
                            <div className={`text-sm font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                              {player.first_name} {player.last_name}
                            </div>
                            <div className="text-xs text-gray-500 hidden sm:block">{player.club}</div>
                          </div>
                        </td>
                        <td className="px-1 sm:px-2 py-2 hidden sm:table-cell">
                          <div className="text-sm text-gray-600">{holePoints.toFixed(1)}</div>
                        </td>
                        <td className="px-1 sm:px-2 py-2 hidden sm:table-cell">
                          <div className="text-sm text-gray-600">{roundPoints.toFixed(1)}</div>
                        </td>
                        <td className="px-1 sm:px-2 py-2">
                          <div className="text-lg font-bold text-gray-900">{totalPoints.toFixed(1)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-lg mb-2">📊</div>
              <div>No leaderboard data available</div>
            </div>
          )}
        </div>
      ) : (
        /* Hole-by-Hole Grid */
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm overflow-x-auto">

        
        {currentRoundHoles.length === 0 ? (
          <div className="text-center text-gray-500">Loading holes...</div>
        ) : (
        
        <div className="min-w-max">
          <table className="w-full text-center border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600">Hole</th>
                {currentRoundHoles.map((hole, index) => {
                  const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                  return (
                    <th key={index} className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600 border-b">
                      {actualHoleNumber}
                    </th>
                  );
                })}
              </tr>
            </thead>
                          <tbody>
                {/* Score Row */}
                <tr>
                  <td className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600">Score</td>
                {currentRoundHoles.map((hole, index) => {
                  const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                  const fieldStat = fieldStats.find(stat => stat.hole === actualHoleNumber);
                  
                  return (
                    <td key={index} className="px-1 sm:px-2 py-2">
                      {hole.submitted ? (
                        <div className="flex items-center justify-center space-x-1">
                          <span className="text-lg font-bold text-green-600">{hole.score}</span>
                          <span className="text-green-500">✓</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={hole.score === 0 ? '' : hole.score}
                            onChange={(e) => {
                              const value = e.target.value;
                              const score = value === '' ? 0 : parseInt(value);
                              handleHoleScoreChange((currentRound - 1) * 3 + index, score);
                            }}
                            disabled={hole.submitted}
                            className="w-14 h-10 sm:w-12 sm:h-8 text-center border rounded text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 touch-manipulation"
                            placeholder="0"
                          />
                          <button
                            onClick={() => submitHoleScore((currentRound - 1) * 3 + index)}
                            disabled={submitting || hole.submitted || hole.score === 0}
                            className="absolute -right-8 sm:-right-6 top-0 w-8 h-10 sm:w-6 sm:h-8 bg-blue-600 text-white text-xs rounded-r hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400 touch-manipulation"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              

            </tbody>
          </table>
        </div>
        )}
      </div>
      )}
      {!showLeaderboard && leaderboard.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 sm:p-4 shadow-sm border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm sm:text-base font-bold text-gray-900">🏆 LIVE ROUND RANKINGS</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 hidden sm:inline">
                {leaderboard.length} players
              </span>
              <button
                onClick={performDataUpdate}
                disabled={leaderboardLoading}
                className="text-blue-600 text-sm touch-manipulation"
              >
                <ArrowRight className={`w-4 h-4 ${leaderboardLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-center min-w-full">
              <thead>
                <tr>
                  <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600 text-left">Player</th>
                  {currentRoundHoles.map((hole, index) => {
                    const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                    return (
                      <th key={index} className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600">
                        H{actualHoleNumber}
                      </th>
                    );
                  })}
                  <th className="px-1 sm:px-2 py-2 text-xs font-bold text-gray-600">R{currentRound}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((player, index) => {
                  const isCurrentUser = (String(player.user_id || player.member_id) === String(user?.user_id || user?.member_id));
                  
                  // Debug current user detection
                  if (index === 0) {
                    console.log('LIVE RANKINGS DEBUG:');
                    console.log('Current user object:', user);
                    console.log('Current user ID:', user?.user_id || user?.member_id);
                    console.log('Leaderboard players:', leaderboard.slice(0, 5).map(p => ({ id: p.user_id || p.member_id, name: p.first_name })));
                  }
                  
                  console.log(`Player ${player.first_name} (${player.user_id || player.member_id}): isCurrentUser=${isCurrentUser}`);
                  const roundStartHole = (currentRound - 1) * 3;
                  
                  // Calculate round outcome for current round (matchplay)
                  const roundScores = player.hole_scores?.slice(roundStartHole, roundStartHole + 3) || [];
                  const roundCompleted = roundScores.every((score: number) => score > 0);
                  
                  // Get current user's round score for comparison
                  let currentUser = leaderboard.find(p => p.user_id === user?.user_id || p.member_id === user?.member_id);
                  let currentUserRoundScores = currentUser?.hole_scores?.slice(roundStartHole, roundStartHole + 3) || [];
                  let currentUserRoundCompleted = currentUserRoundScores.every((score: number) => score > 0);
                  
                  // If current user not found in leaderboard, use local holeScores state
                  if (!currentUser || currentUserRoundScores.length === 0) {
                    // Use the local holeScores state for current user data
                    const localRoundScores = holeScores.slice((currentRound - 1) * 3, currentRound * 3);
                    currentUserRoundScores = localRoundScores.map(hole => hole.score);
                    currentUserRoundCompleted = localRoundScores.every(hole => hole.score > 0);
                  }
                  

                  
                  // Calculate matchplay round outcome (hole-by-hole comparison)
                  let roundOutcome = null;
                  if (roundCompleted && currentUserRoundCompleted && !isCurrentUser) {
                    let currentUserWins = 0;
                    let otherPlayerWins = 0;
                    let ties = 0;
                    
                    // Compare each hole in the round
                    for (let i = 0; i < 3; i++) {
                      const currentUserScore = currentUserRoundScores[i];
                      const otherPlayerScore = roundScores[i];
                      
                      if (currentUserScore < otherPlayerScore) {
                        currentUserWins++;
                      } else if (currentUserScore > otherPlayerScore) {
                        otherPlayerWins++;
                      } else {
                        ties++;
                      }
                    }
                    
                    // Determine round outcome from current user's perspective
                    if (currentUserWins > otherPlayerWins) {
                      roundOutcome = { result: 'W', color: 'text-green-600', bgColor: 'bg-green-100' };
                    } else if (otherPlayerWins > currentUserWins) {
                      roundOutcome = { result: 'L', color: 'text-red-600', bgColor: 'bg-red-100' };
                    } else {
                      roundOutcome = { result: 'T', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
                    }
                  }
                  
                  return (
                    <tr key={player.user_id} className={`${isCurrentUser ? 'bg-blue-50' : ''}`}>
                      <td className="px-2 py-2 text-left">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                              {player.first_name} {player.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{player.club}</div>
                          </div>
                        </div>
                      </td>
                      {currentRoundHoles.map((hole, holeIndex) => {
                        const actualHoleNumber = roundStartHole + holeIndex + 1;
                        const playerScore = player.hole_scores?.[actualHoleNumber - 1];
                        const isSubmitted = hole.submitted;
                        
                        // Debug hole results for current user
                        if (isCurrentUser) {
                          console.log(`LIVE RANKINGS - Hole ${actualHoleNumber}: playerScore=${playerScore}, holeResults=${holeResults[actualHoleNumber]?.points || 'no data'}, isCurrentUser=${isCurrentUser}`);
                        }
                        
                        // Get current user's score for comparison
                        const currentUser = leaderboard.find(p => p.user_id === user?.user_id || p.member_id === user?.member_id);
                        const currentUserScore = isCurrentUser ? playerScore : 
                          currentUser?.hole_scores?.[actualHoleNumber - 1];
                        
                        // Also check if current user has submitted scores for this round
                        const currentUserSubmittedScores = holeScores.slice((currentRound - 1) * 3, currentRound * 3);
                        const currentUserHoleScore = currentUserSubmittedScores[holeIndex]?.score || 0;
                        
                        // Calculate matchplay status based on cumulative state
                        let matchplayStatus = null;
                        
                        if (!isCurrentUser && playerScore > 0 && currentUserHoleScore > 0) {
                          const playerId = player.user_id || player.member_id;
                          
                          // Get the cumulative state for this hole
                          const currentState = matchplayStates[playerId]?.[actualHoleNumber] || 0;
                          
                          // Convert to display format
                          if (currentState === 0) {
                            matchplayStatus = 'AS';
                          } else if (currentState > 0) {
                            matchplayStatus = currentState === 1 ? '1▲' : `${currentState}▲`;
                          } else {
                            const downCount = Math.abs(currentState);
                            matchplayStatus = downCount === 1 ? '1▼' : `${downCount}▼`;
                          }
                          
                          console.log(`Hole ${actualHoleNumber}: State: ${currentState} = ${matchplayStatus}`);
                        }
                        
                        // Keep individual hole competitive status for backward compatibility
                        let competitiveStatus = null;
                        if (!isCurrentUser && playerScore > 0 && currentUserHoleScore > 0) {
                          if (currentUserHoleScore < playerScore) {
                            competitiveStatus = 'winning';
                          } else if (currentUserHoleScore > playerScore) {
                            competitiveStatus = 'losing';
                          } else {
                            competitiveStatus = 'tied';
                          }
                        }
                        
                        return (
                          <td key={holeIndex} className="px-2 py-2">
                            <div className="text-center relative group cursor-pointer hover:bg-gray-50 rounded p-1" title={!isCurrentUser && playerScore > 0 ? `${player.first_name}: ${playerScore}` : ''}>
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold mx-auto group-hover:bg-yellow-100 transition-colors relative ${
                                playerScore > 0 ? 
                                  (isCurrentUser ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800') :
                                  'bg-gray-50 text-gray-400'
                              }`}>
                                {isCurrentUser ? (playerScore > 0 ? playerScore : '-') : 
                                 (playerScore > 0 ? (matchplayStatus || '?') : '-')}
                                {/* Color styling for matchplay status */}
                                {!isCurrentUser && matchplayStatus && (
                                  <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                                    matchplayStatus.includes('▲') ? 'text-green-600' :
                                    matchplayStatus === 'AS' ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {matchplayStatus}
                                  </div>
                                )}
                                {/* Score revealed on hover */}
                                {!isCurrentUser && playerScore > 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-yellow-100 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <span className="text-xs font-bold text-gray-800">{playerScore}</span>
                                  </div>
                                )}
                              </div>
                              {isCurrentUser && isSubmitted && (
                                <div className="text-xs text-green-600 mt-1">✓</div>
                              )}
                              
                              {/* Point earned badge for current user's points on this hole */}
                              {/* Point earned badge for current user's points on this hole */}
                              {!isCurrentUser && playerScore > 0 && currentUserHoleScore > 0 && currentUserHoleScore < playerScore && (
                                <div className="flex items-center justify-center mt-1">
                                  <span className="text-xs text-green-600 font-bold">+0.5</span>
                                </div>
                              )}
                              

                              



                              
                              {/* Hover tooltip with raw score */}
                              {!isCurrentUser && playerScore > 0 && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                  {player.first_name}: {playerScore}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2">
                        <div className="text-center">
                          {!isCurrentUser && (
                            <div className="flex flex-col items-center space-y-1">
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold mx-auto ${
                                roundOutcome ? roundOutcome.bgColor : 'bg-gray-100'
                              } ${roundOutcome ? roundOutcome.color : 'text-gray-600'}`}>
                                {roundOutcome ? roundOutcome.result : '-'}
                              </div>
                              {roundOutcome && roundOutcome.result === 'W' && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-green-600 font-bold">+1</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
};

export default NewWeeklyScoring; 