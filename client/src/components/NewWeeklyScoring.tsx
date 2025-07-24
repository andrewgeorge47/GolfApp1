import React, { useState, useEffect } from 'react';
import { Save, Clock, Users, Trophy, Eye, EyeOff, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Target, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { submitWeeklyScorecard } from '../services/api';
import { useAuth } from '../AuthContext';

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
  const [currentRound, setCurrentRound] = useState(1); // 1, 2, or 3
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

  // Helper function to get week start date (Monday)
  const getWeekStartDate = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    // Monday = 1, Sunday = 0
    // If it's Sunday (0), we want the previous Monday (-6 days)
    // If it's any other day, we want the current week's Monday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    // Ensure we get the correct date by using local time
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(weekStart.getDate()).padStart(2, '0');
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

  // Fetch leaderboard and field stats
  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      
      // Fetch leaderboard
      const leaderboardResponse = await fetch(`/api/tournaments/${tournamentId}/weekly-leaderboard?week_start_date=${currentWeek}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        console.log('Leaderboard data:', leaderboardData);
        setLeaderboard(leaderboardData);
      }
      
      // Fetch field stats separately
      const fieldStatsResponse = await fetch(`/api/tournaments/${tournamentId}/weekly-field-stats?week_start_date=${currentWeek}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (fieldStatsResponse.ok) {
        const fieldStatsData = await fieldStatsResponse.json();
        console.log('Field stats data:', fieldStatsData);
        setFieldStats(fieldStatsData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchCurrentPlayerScorecard();
    fetchCurrentPoints(); // Run in parallel with other fetches
  }, [currentWeek]);

  // Update hole results when leaderboard and field stats are available
  useEffect(() => {
    console.log('useEffect triggered - Leaderboard length:', leaderboard.length, 'Field stats length:', fieldStats.length);
    if (leaderboard.length > 0 && fieldStats.length > 0 && Object.keys(holeResults).length > 0) {
      console.log('Updating hole results with field data...');
      updateHoleResultsWithFieldData();
    }
  }, [leaderboard, fieldStats]);

  // Only recalculate when week changes or after score submission
  // Removed leaderboard dependency to avoid unnecessary recalculations

  const fetchCurrentPlayerScorecard = async () => {
    try {
      // Try both the calculated week start date and the actual date in the database
      const response = await fetch(`/api/tournaments/${tournamentId}/weekly-scorecard/current?week_start_date=${currentWeek}&fallback_date=2025-07-21`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          const existingScores = data.hole_scores;
          const updatedHoleScores = holeScores.map((hole, index) => ({
            ...hole,
            score: existingScores[index] || 0,
            submitted: existingScores[index] > 0
          }));
          setHoleScores(updatedHoleScores);
        }
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

      // Fetch match data for current points display
      const matchResponse = await fetch(`/api/tournaments/${tournamentId}/weekly-matches/${currentUserId}?week_start_date=${currentWeek}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (matchResponse.ok) {
        const matchData = await matchResponse.json();
        console.log('Match data response:', matchData);
        
        if (matchData && matchData.length > 0) {
          const match = matchData[0];
          console.log('Found match:', match);
          const isPlayer1 = match.player1_id === currentUserId;
          
          setCurrentPoints({
            totalPoints: Number(isPlayer1 ? match.total_points_player1 : match.total_points_player2 || 0),
            holePoints: Number(isPlayer1 ? match.hole_points_player1 : match.hole_points_player2 || 0),
            roundPoints: Number(isPlayer1 ? 
              (Number(match.round1_points_player1 || 0) + Number(match.round2_points_player1 || 0) + Number(match.round3_points_player1 || 0)) :
              (Number(match.round1_points_player2 || 0) + Number(match.round2_points_player2 || 0) + Number(match.round3_points_player2 || 0))
            ),
            liveBonus: Number(isPlayer1 ? match.match_live_bonus_player1 : match.match_live_bonus_player2 || 0)
          });
        }
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
      
      toast.success(`Hole ${holeIndex + 1} submitted successfully!`);
      
      await fetchLeaderboard();
      
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
      
      await fetchLeaderboard();
      
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

  const totalScore = holeScores.reduce((sum, hole) => sum + hole.score, 0);
  const completedHoles = holeScores.filter(hole => hole.score > 0).length;
  const submittedHoles = holeScores.filter(hole => hole.submitted).length;
  const currentRoundHoles = getCurrentRoundHoles();
  const currentRoundScore = currentRoundHoles.reduce((sum, hole) => sum + hole.score, 0);

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header with Round Selection */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <div className="text-center mb-3">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {tournamentName}
          </h2>
          <p className="text-sm text-gray-600">
            Round {currentRound} of 3
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
            disabled={currentRound === 1}
            className="p-2 rounded-full bg-gray-100 shadow-sm disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
                        <div className="flex space-x-2">
                {[1, 2, 3].map((round) => (
                  <button
                    key={round}
                    onClick={() => setCurrentRound(round)}
                    className={`w-12 h-12 rounded-full text-sm font-bold flex items-center justify-center ${
                      currentRound === round
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className="text-lg font-bold">{round}</span>
                  </button>
                ))}
              </div>
          
          <button
            onClick={() => setCurrentRound(Math.min(3, currentRound + 1))}
            disabled={currentRound === 3}
            className="p-2 rounded-full bg-gray-100 shadow-sm disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>



      {/* Hole-by-Hole Grid */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div></div>
          {Object.keys(roundResults).length > 0 && (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-600">Round Records:</span>
              {[1, 2, 3].map((round) => {
                const roundResult = roundResults[round];
                return (
                  <div key={round} className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">R{round}:</span>
                    {roundResult ? (
                      <span className={`text-sm font-bold ${
                        roundResult.result === 'W' ? 'text-green-600' :
                        roundResult.result === 'T' ? 'text-yellow-600' :
                        roundResult.result === 'L' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {roundResult.record}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400">-</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {currentRoundHoles.length === 0 ? (
          <div className="text-center text-gray-500">Loading holes...</div>
        ) : (
        
        <div className="min-w-max">
          <table className="w-full text-center border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="px-2 py-2 text-xs font-bold text-gray-600">Hole</th>
                {currentRoundHoles.map((hole, index) => {
                  const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                  return (
                    <th key={index} className="px-2 py-2 text-xs font-bold text-gray-600 border-b">
                      {actualHoleNumber}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Score Row */}
              <tr>
                <td className="px-2 py-2 text-xs font-bold text-gray-600">Score</td>
                {currentRoundHoles.map((hole, index) => {
                  const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                  const fieldStat = fieldStats.find(stat => stat.hole === actualHoleNumber);
                  
                  return (
                    <td key={index} className="px-2 py-2">
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
                            className="w-12 h-8 text-center border rounded text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                          <button
                            onClick={() => submitHoleScore((currentRound - 1) * 3 + index)}
                            disabled={submitting || hole.submitted || hole.score === 0}
                            className="absolute -right-6 top-0 w-6 h-8 bg-blue-600 text-white text-xs rounded-r hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              
              {/* Field Average Row */}
              <tr>
                <td className="px-2 py-1 text-xs font-bold text-gray-600">Field Avg</td>
                {currentRoundHoles.map((hole, index) => {
                  const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                  const fieldStat = fieldStats.find(stat => stat.hole === actualHoleNumber);
                  
                  return (
                    <td key={index} className="px-2 py-1">
                      {fieldStat && fieldStat.totalPlayers > 0 ? (
                        <div className="text-xs text-gray-600">
                          {fieldStat.averageScore.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              
              {/* Hole Points Row */}
              <tr>
                <td className="px-2 py-1 text-xs font-bold text-blue-600">Total Pts</td>
                {currentRoundHoles.map((hole, index) => {
                  const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                  const holeResult = holeResults[actualHoleNumber];
                  
                  return (
                    <td key={index} className="px-2 py-1">
                      {hole.submitted && holeResult ? (
                        <div className="text-xs font-bold text-blue-600">
                          +{holeResult.points.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
              
              {/* W-T-L Record Row (only show if score submitted) */}
              {currentRoundHoles.some(hole => hole.submitted) && (
                <tr>
                  <td className="px-2 py-1 text-xs font-bold text-gray-600" title="Wins-Ties-Losses">W-T-L</td>
                  {currentRoundHoles.map((hole, index) => {
                    const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                    const holeResult = holeResults[actualHoleNumber];
                    

                    
                    return (
                      <td key={index} className="px-2 py-1">
                        {hole.submitted && holeResult ? (
                          <div className={`text-xs font-bold ${
                            holeResult.result === 'W' ? 'text-green-600' :
                            holeResult.result === 'T' ? 'text-yellow-600' :
                            holeResult.result === 'L' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {holeResult.record || 'No record'}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            {hole.submitted ? 'No data' : '-'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>











      {/* Live Round-Based Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 shadow-sm border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">🏆 LIVE ROUND RANKINGS</h3>
            <button
              onClick={fetchLeaderboard}
              disabled={leaderboardLoading}
              className="text-blue-600 text-sm"
            >
              <ArrowRight className={`w-4 h-4 ${leaderboardLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-xs font-bold text-gray-600 text-left">Player</th>
                  <th className="px-2 py-2 text-xs font-bold text-gray-600">Total</th>
                  {currentRoundHoles.map((hole, index) => {
                    const actualHoleNumber = (currentRound - 1) * 3 + index + 1;
                    return (
                      <th key={index} className="px-2 py-2 text-xs font-bold text-gray-600">
                        H{actualHoleNumber}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 5).map((player, index) => {
                  const isCurrentUser = (player.user_id === user?.user_id || player.member_id === user?.member_id);
                  const roundStartHole = (currentRound - 1) * 3;
                  
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
                              {isCurrentUser && ' (You)'}
                            </div>
                            <div className="text-xs text-gray-500">{player.club}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className={`text-sm font-bold ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                          {Number(player.total_score || 0).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">pts</div>
                      </td>
                      {currentRoundHoles.map((hole, holeIndex) => {
                        const actualHoleNumber = roundStartHole + holeIndex + 1;
                        const playerScore = player.hole_scores?.[actualHoleNumber - 1];
                        const isSubmitted = hole.submitted;
                        
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