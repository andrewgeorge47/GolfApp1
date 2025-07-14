import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Eye, ChevronRight, Share2, Camera } from 'lucide-react';
import { getTournamentStrokeplayScores, getSimulatorCourse } from '../services/api';
import StrokeplayDetailedScorecard from './StrokeplayDetailedScorecard';

interface TournamentScore {
  id: number;
  user_id: number;
  tournament_id: number;
  first_name: string;
  last_name: string;
  club: string;
  total_strokes: number;
  scores: any;
  created_at: string;
}

interface PlayerScore {
  player_id: number;
  first_name: string;
  last_name: string;
  club: string;
  total_score: number;
  score_to_par?: number;
  submitted_at: string;
  holes?: Array<{
    hole: number;
    score: number;
  }> | {
    [key: number]: number;
    hole_scores?: { [key: number]: number };
  };
  scorecard_photo_url?: string;
}

interface StrokeplayLeaderboardProps {
  tournamentId: number;
  tournamentFormat: string;
  onRefresh?: () => void;
  courseId?: number;
  tournamentInfo?: {
    name: string;
    description?: string;
    start_date?: string;
    course_name?: string;
  };
  tournamentSettings?: {
    holeConfiguration?: string;
    tee?: string;
    pins?: string;
    puttingGimme?: string;
  };
}

const StrokeplayLeaderboard: React.FC<StrokeplayLeaderboardProps> = ({
  tournamentId,
  tournamentFormat,
  onRefresh,
  courseId,
  tournamentInfo,
  tournamentSettings
}) => {
  const [tournamentScores, setTournamentScores] = useState<TournamentScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [selectedPlayerScore, setSelectedPlayerScore] = useState<PlayerScore | null>(null);
  const [showDetailedScorecard, setShowDetailedScorecard] = useState(false);
  const [courseData, setCourseData] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const scoresResponse = await getTournamentStrokeplayScores(tournamentId);
      setTournamentScores(scoresResponse.data || []);
    } catch (error) {
      console.error('Error fetching strokeplay data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseData = async () => {
    if (!courseId) return;
    
    try {
      const response = await getSimulatorCourse(courseId);
      if (response.data) {
        setCourseData(response.data);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    }
  };

  const calculatePlayerScores = () => {
    const playerScores: PlayerScore[] = [];

    // Simply process each score as it comes from the API
    tournamentScores.forEach((score, index) => {
      // Create player score data directly from API response
      const playerScoreData: PlayerScore = {
        player_id: score.user_id,
        first_name: score.first_name || 'Unknown',
        last_name: score.last_name || 'Player',
        club: score.club || 'Unknown',
        total_score: score.total_strokes || 0,
        submitted_at: score.created_at,
        holes: score.scores?.hole_scores || [],
        scorecard_photo_url: score.scores?.scorecard_photo_url
      };
      
      // Calculate score to par if we have hole data and tournament settings
      if (score.scores?.hole_scores?.length > 0 && tournamentSettings?.holeConfiguration && courseData?.par_values) {
        const holeConfig = tournamentSettings.holeConfiguration;
        let startHole = 1;
        let holeCount = 18;
        
        // Determine which holes are being played
        if (holeConfig === '9' || holeConfig === '9_front') {
          startHole = 1;
          holeCount = 9;
        } else if (holeConfig === '9_back') {
          startHole = 10;
          holeCount = 9;
        } else {
          startHole = 1;
          holeCount = 18;
        }
        
        // Calculate total par for the holes being played
        const relevantParValues = courseData.par_values.slice(startHole - 1, startHole - 1 + holeCount);
        const totalPar = relevantParValues.reduce((sum: number, par: number) => sum + par, 0);
        
        playerScoreData.score_to_par = playerScoreData.total_score - totalPar;
      }
      
      playerScores.push(playerScoreData);
    });

    // Sort by total score (lowest first for strokeplay)
    const sortedScores = playerScores
      .filter(player => player.total_score > 0) // Only show players with scores
      .sort((a, b) => a.total_score - b.total_score);

    setPlayerScores(sortedScores);
  };

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  // Add a refresh function that can be called externally
  const refreshLeaderboard = () => {
    fetchData();
  };

  // Single useEffect to handle score calculation
  useEffect(() => {
    if (tournamentScores.length > 0) {
      calculatePlayerScores();
    }
  }, [tournamentScores, tournamentSettings, courseData]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-neutral-400 text-sm font-medium">{position}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      const cleanDate = dateString.replace(/\.\d+$/, '');
      return new Date(cleanDate).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatScoreToPar = (scoreToPar: number) => {
    if (scoreToPar === 0) return 'E';
    if (scoreToPar > 0) return `+${scoreToPar}`;
    return `${scoreToPar}`;
  };

  const getScoreColor = (scoreToPar: number) => {
    if (scoreToPar < 0) return 'text-red-600'; // Under par
    if (scoreToPar === 0) return 'text-neutral-900'; // Even par
    return 'text-blue-600'; // Over par
  };

  const handlePlayerClick = (playerScore: PlayerScore) => {
    setSelectedPlayerScore(playerScore);
    setShowDetailedScorecard(true);
  };

  const handleCloseDetailedScorecard = () => {
    setShowDetailedScorecard(false);
    setSelectedPlayerScore(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (playerScores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No scores submitted yet</h3>
          <p className="text-neutral-600">
            Players need to submit their scores to see the leaderboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-brand-neon-green" />
            <h3 className="text-xl font-bold text-brand-black">Strokeplay Leaderboard</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshLeaderboard}
              className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/#/leaderboard/tournament/${tournamentId}`;
                if (navigator.share) {
                  navigator.share({
                    title: `${tournamentInfo?.name || 'Tournament'} Leaderboard`,
                    text: `Check out the leaderboard for ${tournamentInfo?.name || 'this tournament'}!`,
                    url: shareUrl
                  }).catch(() => {
                    navigator.clipboard.writeText(shareUrl);
                  });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                }
              }}
              className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {tournamentInfo && (
          <div className="mt-2 text-neutral-600">
            <p className="font-medium">{tournamentInfo.name}</p>
            {tournamentInfo.course_name && (
              <p className="text-sm">{tournamentInfo.course_name}</p>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-neutral-600">Position</th>
                <th className="px-6 py-4 text-left font-medium text-neutral-600">Player</th>
                <th className="px-6 py-4 text-center font-medium text-neutral-600">Total Score</th>
                <th className="px-6 py-4 text-center font-medium text-neutral-600">To Par</th>
                <th className="px-6 py-4 text-center font-medium text-neutral-600">Submitted</th>
                <th className="px-6 py-4 text-center font-medium text-neutral-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {playerScores.map((player, index) => (
                <tr key={player.player_id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getPositionIcon(index + 1)}
                      <span className="text-sm font-medium text-neutral-600">
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-brand-black">
                        {player.first_name} {player.last_name}
                      </span>
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                    </div>
                    <div className="text-sm text-neutral-600">{player.club}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-2xl font-bold text-brand-neon-green">
                      {player.total_score}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {player.score_to_par !== undefined && (
                      <span className={`text-lg font-semibold ${getScoreColor(player.score_to_par)}`}>
                        {formatScoreToPar(player.score_to_par)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm text-neutral-600">
                      {formatDate(player.submitted_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayerClick(player);
                        }}
                        className="text-brand-neon-green hover:text-green-400 transition-colors"
                        title="View detailed scorecard"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {player.scorecard_photo_url && (
                        <button 
                          className="text-blue-500 hover:text-blue-600 transition-colors"
                          title="View scorecard photo"
                          onClick={() => window.open(player.scorecard_photo_url, '_blank')}
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Table */}
        <div className="lg:hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-600">Pos</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-600">Player</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-600">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {playerScores.map((player, index) => (
                <tr key={player.player_id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => handlePlayerClick(player)}>
                  <td className="px-3 py-3">
                    <div className="flex items-center space-x-2">
                      {getPositionIcon(index + 1)}
                      <span className="text-sm font-medium text-neutral-600">
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-brand-black text-sm">
                        {player.first_name} {player.last_name}
                      </span>
                      {index === 0 && <Crown className="w-3 h-3 text-yellow-500" />}
                    </div>
                    <div className="text-xs text-neutral-600">{player.club}</div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-lg font-bold text-brand-neon-green">
                        {player.total_score}
                      </span>
                      {player.score_to_par !== undefined && (
                        <span className={`text-sm font-semibold ${getScoreColor(player.score_to_par)}`}>
                          ({formatScoreToPar(player.score_to_par)})
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Scorecard Modal */}
      {showDetailedScorecard && selectedPlayerScore && (
        <StrokeplayDetailedScorecard
          playerScore={selectedPlayerScore}
          courseData={courseData}
          tournamentSettings={tournamentSettings}
          onClose={handleCloseDetailedScorecard}
        />
      )}
    </div>
  );
};

export default StrokeplayLeaderboard;