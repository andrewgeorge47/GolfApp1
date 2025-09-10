import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Trophy, Users, Target, CheckCircle } from 'lucide-react';

interface ChampionshipPlayerScoringProps {
  tournamentId: number;
  tournamentName: string;
  onScoreSubmitted: () => void;
}

interface Match {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_name: string;
  player1_last_name: string;
  player2_name: string;
  player2_last_name: string;
  match_number: number;
  match_status: string;
  winner_id?: number;
  course_id?: number;
  teebox?: string;
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
  onScoreSubmitted
}) => {
  const { user } = useAuth();
  const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [holeScores, setHoleScores] = useState<number[]>(new Array(18).fill(0));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlayerMatches();
  }, [tournamentId, user?.member_id]);

  const loadPlayerMatches = async () => {
    if (!user?.member_id) return;

    try {
      setLoading(true);
      const response = await api.get(`/tournaments/${tournamentId}/championship-matches`);
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
      // Get player handicap for net score calculation
      const handicap = user?.handicap || user?.sim_handicap || 0;
      
      // For now, we'll submit the player's scores
      // The opponent would need to submit their own scores separately
      // This is a simplified version - in a full implementation, both players would submit scores
      
      const isPlayer1 = selectedMatch.player1_id === user.member_id;
      
      const response = await api.put(`/tournaments/${tournamentId}/championship-matches/${selectedMatch.id}/result`, {
        [isPlayer1 ? 'player1_hole_scores' : 'player2_hole_scores']: JSON.stringify(holeScores),
        [isPlayer1 ? 'player1_net_hole_scores' : 'player2_net_hole_scores']: JSON.stringify(holeScores), // Simplified - would need handicap calculation
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
      return match.winner_id === user?.member_id ? 'Won' : 'Lost';
    }
    if (match.match_status === 'in_progress') {
      return 'In Progress';
    }
    return 'Pending';
  };

  const getMatchStatusColor = (match: Match) => {
    if (match.match_status === 'completed') {
      return match.winner_id === user?.member_id ? 'text-green-600' : 'text-red-600';
    }
    if (match.match_status === 'in_progress') {
      return 'text-blue-600';
    }
    return 'text-yellow-600';
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
            {playerMatches.map((playerMatch) => (
              <div key={playerMatch.match.id} className="bg-white border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium text-neutral-600">
                        Match {playerMatch.match.match_number}
                      </div>
                      <div className="text-lg font-semibold text-brand-black">
                        vs {playerMatch.opponent.name} {playerMatch.opponent.last_name}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className={`text-sm font-medium ${getMatchStatusColor(playerMatch.match)}`}>
                        {getMatchStatus(playerMatch.match)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {playerMatch.match.match_status === 'pending' && (
                      <button
                        onClick={() => handleScoreMatch(playerMatch.match)}
                        className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Enter Score
                      </button>
                    )}
                    {playerMatch.match.match_status === 'in_progress' && (
                      <div className="flex items-center text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm font-medium">Waiting for opponent</span>
                      </div>
                    )}
                    {playerMatch.match.match_status === 'completed' && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-5 h-5 mr-1" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scoring Modal */}
      {showScoringModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">
              Enter Scores - Match {selectedMatch.match_number}
            </h4>
            
            <div className="mb-4">
              <p className="text-sm text-neutral-600">
                vs {selectedMatch.player1_id === user?.member_id ? 
                  `${selectedMatch.player2_name} ${selectedMatch.player2_last_name}` : 
                  `${selectedMatch.player1_name} ${selectedMatch.player1_last_name}`
                }
              </p>
            </div>

            {/* Hole Scores Grid */}
            <div className="grid grid-cols-6 gap-2 mb-6">
              {Array.from({ length: 18 }, (_, i) => (
                <div key={i} className="text-center">
                  <label className="block text-xs text-neutral-600 mb-1">
                    Hole {i + 1}
                  </label>
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
                    className="w-full px-2 py-1 border border-neutral-300 rounded text-center focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    placeholder="0"
                  />
                </div>
              ))}
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

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowScoringModal(false)}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitScore}
                disabled={submitting}
                className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
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
