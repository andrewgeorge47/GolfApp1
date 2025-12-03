import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageSquare, AlertTriangle, Eye, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';

interface HoleScore {
  gross: number;
  net: number;
  par: number;
  strokes_received: number;
}

interface IndividualScore {
  id: number;
  matchup_id: number;
  lineup_id: number;
  team_id: number;
  player_id: number;
  player_name: string;
  assigned_holes: number[];
  hole_scores: { [hole: string]: HoleScore | undefined };
  gross_total: number;
  net_total: number;
  player_handicap: number;
  course_handicap: number;
  submitted_at: string;
}

interface AlternateShotScore {
  id: number;
  team_id: number;
  hole_scores: { [hole: string]: HoleScore | undefined };
  gross_total: number;
  net_total: number;
  team_handicap: number;
  team_course_handicap: number;
  submitted_at: string;
}

interface Lineup {
  id: number;
  team_id: number;
  team_name: string;
  player1_id: number;
  player1_name: string;
  player2_id: number;
  player2_name: string;
  player3_id: number;
  player3_name: string;
}

interface Matchup {
  id: number;
  week_number: number;
  team1_id: number;
  team1_name: string;
  team2_id: number;
  team2_name: string;
  course_name: string;
  status: string;
}

interface ScoreVerificationProps {
  matchupId: number;
  onVerificationComplete?: () => void;
}

const ScoreVerification: React.FC<ScoreVerificationProps> = ({
  matchupId,
  onVerificationComplete
}) => {
  const { user } = useAuth();
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [individualScores, setIndividualScores] = useState<IndividualScore[]>([]);
  const [alternateShotScores, setAlternateShotScores] = useState<AlternateShotScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const fetchMatchupScores = async () => {
    try {
      // Mock data for demonstration
      const mockData = {
        matchup: {
          id: matchupId,
          week_number: 1,
          team1_id: 1,
          team1_name: "Eagle Hunters",
          team2_id: 2,
          team2_name: "Birdie Brigade",
          course_name: "Augusta National",
          status: "in_progress"
        },
        lineups: [
          {
            id: 1,
            matchup_id: matchupId,
            team_id: 1,
            team_name: "Eagle Hunters",
            player1_id: 1,
            player1_name: "John Smith",
            player2_id: 2,
            player2_name: "Mike Johnson",
            player3_id: 3,
            player3_name: "Tom Wilson",
            player1_handicap: 12,
            player2_handicap: 15,
            player3_handicap: 18,
            week_number: 1,
            league_id: 1,
            is_locked: true,
            submitted_at: "2025-01-15T09:00:00Z",
            submitted_by: 1
          },
          {
            id: 2,
            matchup_id: matchupId,
            team_id: 2,
            team_name: "Birdie Brigade",
            player1_id: 4,
            player1_name: "Sarah Davis",
            player2_id: 5,
            player2_name: "Lisa Brown",
            player3_id: 6,
            player3_name: "Amy Taylor",
            player1_handicap: 10,
            player2_handicap: 14,
            player3_handicap: 16,
            week_number: 1,
            league_id: 1,
            is_locked: true,
            submitted_at: "2025-01-15T09:00:00Z",
            submitted_by: 4
          }
        ],
        individualScores: [
          {
            id: 4,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            player_id: 4,
            player_name: "Sarah Davis",
            assigned_holes: [1, 2, 3],
            hole_scores: {
              "1": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "2": { gross: 4, net: 3, par: 4, strokes_received: 1 },
              "3": { gross: 4, net: 3, par: 3, strokes_received: 1 }
            },
            gross_total: 13,
            net_total: 10,
            player_handicap: 10,
            course_handicap: 12,
            submitted_at: "2025-01-15T10:30:00Z"
          },
          {
            id: 5,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            player_id: 5,
            player_name: "Lisa Brown",
            assigned_holes: [4, 5, 6],
            hole_scores: {
              "4": { gross: 5, net: 4, par: 4, strokes_received: 1 },
              "5": { hole: 5, gross: 6, net: 5, par: 5, strokes_received: 1 },
              "6": { hole: 6, gross: 4, net: 3, par: 3, strokes_received: 1 }
            },
            gross_total: 15,
            net_total: 12,
            player_handicap: 14,
            course_handicap: 16,
            submitted_at: "2025-01-15T10:35:00Z"
          },
          {
            id: 6,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            player_id: 6,
            player_name: "Amy Taylor",
            assigned_holes: [7, 8, 9],
            hole_scores: {
              "7": { hole: 7, gross: 6, net: 5, par: 4, strokes_received: 1 },
              "8": { hole: 8, gross: 5, net: 4, par: 4, strokes_received: 1 },
              "9": { hole: 9, gross: 5, net: 4, par: 4, strokes_received: 1 }
            },
            gross_total: 16,
            net_total: 13,
            player_handicap: 16,
            course_handicap: 18,
            submitted_at: "2025-01-15T10:40:00Z"
          }
        ],
        alternateShotScores: [
          {
            id: 2,
            matchup_id: matchupId,
            lineup_id: 2,
            team_id: 2,
            hole_scores: {
              "10": { hole: 10, gross: 5, net: 4, par: 4, strokes_received: 1 },
              "11": { hole: 11, gross: 6, net: 5, par: 5, strokes_received: 1 },
              "12": { hole: 12, gross: 5, net: 4, par: 4, strokes_received: 1 },
              "13": { hole: 13, gross: 4, net: 3, par: 3, strokes_received: 1 },
              "14": { hole: 14, gross: 6, net: 5, par: 4, strokes_received: 1 },
              "15": { hole: 15, gross: 5, net: 4, par: 4, strokes_received: 1 },
              "16": { hole: 16, gross: 4, net: 3, par: 3, strokes_received: 1 },
              "17": { hole: 17, gross: 6, net: 5, par: 5, strokes_received: 1 },
              "18": { hole: 18, gross: 5, net: 4, par: 4, strokes_received: 1 }
            },
            gross_total: 46,
            net_total: 37,
            team_handicap: 13,
            team_course_handicap: 15,
            submitted_at: "2025-01-15T11:00:00Z"
          }
        ]
      };

      setMatchup(mockData.matchup);
      setLineups(mockData.lineups);
      setIndividualScores(mockData.individualScores);
      setAlternateShotScores(mockData.alternateShotScores);
    } catch (error) {
      console.error('Error fetching matchup scores:', error);
      toast.error('Failed to load matchup scores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchupScores();
  }, [matchupId]);

  const getOpponentTeamId = () => {
    if (!matchup || !user) return null;
    
    // Find which team the current user is NOT on
    const userTeamId = lineups.find(lineup => 
      lineup.player1_id === user.member_id || 
      lineup.player2_id === user.member_id || 
      lineup.player3_id === user.member_id
    )?.team_id;

    if (!userTeamId) return null;
    
    return matchup.team1_id === userTeamId ? matchup.team2_id : matchup.team1_id;
  };

  const getOpponentScores = (): {
    individualScores: IndividualScore[];
    alternateShotScore: AlternateShotScore | null;
  } => {
    const opponentTeamId = getOpponentTeamId();
    if (!opponentTeamId) return { individualScores: [], alternateShotScore: null };

    const opponentIndividualScores: IndividualScore[] = individualScores.filter(score => 
      lineups.some(lineup => 
        lineup.team_id === opponentTeamId && 
        (lineup.player1_id === score.player_id || 
         lineup.player2_id === score.player_id || 
         lineup.player3_id === score.player_id)
      )
    );

    const opponentAlternateShotScore = alternateShotScores.find(score => score.team_id === opponentTeamId) || null;

    return {
      individualScores: opponentIndividualScores,
      alternateShotScore: opponentAlternateShotScore
    };
  };

  const handleApprove = async () => {
    if (!verificationNotes.trim()) {
      toast.error('Please add verification notes before approving');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/matchups/${matchupId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'approve',
          notes: verificationNotes,
          verified_by: user?.member_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve scores');
      }

      toast.success('Scores approved successfully!');
      onVerificationComplete?.();
    } catch (error) {
      console.error('Error approving scores:', error);
      toast.error('Failed to approve scores');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for disputing the scores');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/matchups/${matchupId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reason: disputeReason,
          disputed_by: user?.member_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to dispute scores');
      }

      toast.success('Scores disputed successfully!');
      onVerificationComplete?.();
    } catch (error) {
      console.error('Error disputing scores:', error);
      toast.error('Failed to dispute scores');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
          <span className="text-gray-600">Loading scores for verification...</span>
        </div>
      </div>
    );
  }

  if (!matchup) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-600">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p>Matchup not found</p>
        </div>
      </div>
    );
  }

  const opponentScores = getOpponentScores();
  const opponentTeamId = getOpponentTeamId();
  const opponentTeamName = opponentTeamId === matchup.team1_id ? matchup.team1_name : matchup.team2_name;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Score Verification</h2>
        <p className="text-gray-600">Week {matchup.week_number} • {matchup.course_name}</p>
        <p className="text-sm text-gray-500 mt-1">Reviewing scores for: <span className="font-semibold">{opponentTeamName}</span></p>
      </div>

      {/* Verification Status */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <span className="font-semibold text-yellow-800">Verification Required</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Please review the opponent's scores and either approve or dispute them.
        </p>
      </div>

      {/* Opponent Scores Review */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Opponent Scores Review</h3>
        
        {/* Individual Scores */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Individual 9 Holes</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            {opponentScores.individualScores.length > 0 ? (
              <div className="space-y-3">
                {opponentScores.individualScores.map(score => (
                  <div key={score.id} className="bg-white rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold text-gray-900">{score.player_name}</span>
                        <p className="text-sm text-gray-600">
                          Handicap: {score.player_handicap} | Course: {score.course_handicap}
                        </p>
                        <p className="text-sm text-gray-600">
                          Assigned Holes: {score.assigned_holes.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{score.net_total}</div>
                        <div className="text-sm text-gray-500">({score.gross_total})</div>
                      </div>
                    </div>
                    
                    {/* Hole-by-hole breakdown */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {score.assigned_holes.map(hole => {
                        const holeScore = score.hole_scores[hole.toString()];
                        return (
                          <div key={hole} className="text-center text-sm">
                            <div className="font-medium">Hole {hole}</div>
                            <div className="text-blue-600 font-semibold">
                              {holeScore ? (holeScore.net || holeScore.gross) : '-'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              ({holeScore ? holeScore.gross : '-'})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                <div className="bg-blue-100 rounded p-3 font-semibold">
                  <div className="flex justify-between">
                    <span>Individual Total</span>
                    <span className="text-blue-600">
                      {opponentScores.individualScores.reduce((sum: number, score: IndividualScore) => sum + score.net_total, 0)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No individual scores submitted
              </div>
            )}
          </div>
        </div>

        {/* Alternate Shot Scores */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Alternate Shot 9 Holes</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            {opponentScores.alternateShotScore ? (
              <div className="bg-white rounded p-3">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-semibold text-gray-900">Team Score</span>
                    <p className="text-sm text-gray-600">
                      Team Handicap: {opponentScores.alternateShotScore.team_handicap.toFixed(1)} | 
                      Course: {opponentScores.alternateShotScore.team_course_handicap}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{opponentScores.alternateShotScore.net_total}</div>
                    <div className="text-sm text-gray-500">({opponentScores.alternateShotScore.gross_total})</div>
                  </div>
                </div>
                
                {/* Hole-by-hole breakdown */}
                <div className="grid grid-cols-3 gap-2">
                  {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => {
                    const holeScore = opponentScores.alternateShotScore?.hole_scores[hole.toString()];
                    return (
                      <div key={hole} className="text-center text-sm">
                        <div className="font-medium">Hole {hole}</div>
                        <div className="text-green-600 font-semibold">
                          {holeScore ? (holeScore.net || holeScore.gross) : '-'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          ({holeScore ? holeScore.gross : '-'})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No alternate shot scores submitted
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Verification Notes
        </label>
        <textarea
          value={verificationNotes}
          onChange={(e) => setVerificationNotes(e.target.value)}
          placeholder="Add your verification notes here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
        />
        <p className="text-sm text-gray-500 mt-1">
          Required for approval. Describe what you verified and any observations.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setShowDisputeForm(!showDisputeForm)}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
        >
          <XCircle className="w-5 h-5 mr-2" />
          Dispute Scores
        </button>

        <button
          onClick={handleApprove}
          disabled={!verificationNotes.trim() || submitting}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Approve Scores
        </button>
      </div>

      {/* Dispute Form */}
      {showDisputeForm && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-3">Dispute Scores</h4>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reason for Dispute
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain why you are disputing these scores..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDisputeForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleDispute}
              disabled={!disputeReason.trim() || submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Submit Dispute
            </button>
          </div>
        </div>
      )}

      {submitting && (
        <div className="mt-4 text-center text-gray-600">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
            Processing...
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreVerification;
