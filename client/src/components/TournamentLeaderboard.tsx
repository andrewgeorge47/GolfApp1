import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Eye, ChevronRight } from 'lucide-react';
import { getTeamScores, getSimulatorCourse } from '../services/api';
import DetailedScorecard from './DetailedScorecard';

interface TeamScore {
  id: number;
  team_id: number;
  tournament_id: number;
  total_score: number;
  hole_scores?: any;
  submitted_by: number;
  submitted_at: string;
  team_name: string;
  captain_first_name: string;
  captain_last_name: string;
  captain_club: string;
  players: Array<{
    user_member_id: number;
    first_name: string;
    last_name: string;
    club: string;
    is_captain: boolean;
  }>;
}

interface TournamentLeaderboardProps {
  tournamentId: number;
  tournamentFormat: string;
  onRefresh?: () => void;
  courseId?: number;
  tournamentSettings?: any;
}

const TournamentLeaderboard: React.FC<TournamentLeaderboardProps> = ({
  tournamentId,
  tournamentFormat,
  onRefresh,
  courseId,
  tournamentSettings
}) => {
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseData, setCourseData] = useState<any>(null);
  const [selectedTeamScore, setSelectedTeamScore] = useState<TeamScore | null>(null);
  const [showDetailedScorecard, setShowDetailedScorecard] = useState(false);

  const fetchTeamScores = async () => {
    try {
      setLoading(true);
      const response = await getTeamScores(tournamentId);
      setTeamScores(response.data || []);
    } catch (error) {
      console.error('Error fetching team scores:', error);
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

  const calculateRelativeScore = (totalScore: number) => {
    if (!courseData?.par_values) return { relative: `${totalScore}`, total: '', color: 'text-brand-black' };
    
    // Get hole configuration from tournament settings
    const holeConfig = tournamentSettings?.holeConfiguration || '18';
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
    const relativeScore = totalScore - totalPar;
    
    if (relativeScore === 0) {
      return { relative: 'E', total: `(${totalScore})`, color: 'text-neutral-900' };
    } else if (relativeScore > 0) {
      return { relative: `+${relativeScore}`, total: `(${totalScore})`, color: 'text-blue-600' };
    } else {
      return { relative: `${relativeScore}`, total: `(${totalScore})`, color: 'text-red-600' };
    }
  };

  useEffect(() => {
    fetchTeamScores();
  }, [tournamentId]);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

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
      return new Date(cleanDate).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleTeamClick = (teamScore: TeamScore) => {
    setSelectedTeamScore(teamScore);
    setShowDetailedScorecard(true);
  };

  const handleCloseDetailedScorecard = () => {
    setShowDetailedScorecard(false);
    setSelectedTeamScore(null);
  };

  const sortedScores = [...teamScores].sort((a, b) => a.total_score - b.total_score);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (teamScores.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
          <Trophy className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">No scores submitted yet</h3>
        <p className="text-neutral-600">
          Team captains need to submit their scores to see the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-brand-neon-green" />
          <h3 className="text-xl font-bold text-brand-black">Tournament Leaderboard</h3>
        </div>
        <button
          onClick={fetchTeamScores}
          className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">Position</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">Team</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-600">Players</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Score</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sortedScores.map((score, index) => (
                <tr key={score.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => handleTeamClick(score)}>
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
                      <span className="font-semibold text-brand-black">{score.team_name}</span>
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {score.players?.map((player, playerIndex) => (
                        <div key={player.user_member_id} className="flex items-center space-x-2">
                          <span className="text-sm text-neutral-900">
                            {player.first_name} {player.last_name}
                          </span>
                          {player.is_captain && <Crown className="w-3 h-3 text-yellow-500" />}
                          <span className="text-xs text-neutral-500">({player.club})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center align-middle">
                    {(() => {
                      const scoreData = calculateRelativeScore(score.total_score);
                      return (
                        <span className="flex items-center justify-center gap-2 text-2xl">
                          <span className={`font-bold ${scoreData.color}`}>{scoreData.relative}</span>
                          <span className="text-neutral-600 ml-2">{scoreData.total}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTeamClick(score);
                        }}
                        className="px-3 py-1 bg-brand-neon-green text-brand-black rounded-lg text-sm font-medium hover:bg-green-400 transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
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
                <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-600">Team</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-600">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sortedScores.map((score, index) => (
                <tr key={score.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => handleTeamClick(score)}>
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
                      <span className="font-semibold text-brand-black text-sm">{score.team_name}</span>
                      {index === 0 && <Crown className="w-3 h-3 text-yellow-500" />}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {(() => {
                        const scoreData = calculateRelativeScore(score.total_score);
                        return (
                          <span className="flex items-center justify-center gap-1 text-lg">
                            <span className={`font-bold ${scoreData.color}`}>{scoreData.relative}</span>
                            <span className="text-neutral-600 text-sm">{scoreData.total}</span>
                          </span>
                        );
                      })()}
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
      {showDetailedScorecard && selectedTeamScore && (
        <DetailedScorecard
          teamScore={selectedTeamScore}
          courseData={courseData}
          tournamentSettings={tournamentSettings}
          onClose={handleCloseDetailedScorecard}
        />
      )}
    </div>
  );
};

export default TournamentLeaderboard; 