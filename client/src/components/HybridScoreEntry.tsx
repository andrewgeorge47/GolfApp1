import React, { useState, useEffect } from 'react';
import { Save, Calculator, Users, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';

interface HoleScore {
  hole: number;
  gross: number;
  par: number;
  net?: number;
}

interface PlayerScore {
  player_id: number;
  player_name: string;
  assigned_holes: number[];
  hole_scores: { [hole: string]: HoleScore };
  gross_total: number;
  net_total: number;
  player_handicap: number;
  course_handicap: number;
}

interface TeamScore {
  team_id: number;
  lineup_id: number;
  hole_scores: { [hole: string]: HoleScore };
  gross_total: number;
  net_total: number;
  team_handicap: number;
  team_course_handicap: number;
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
  player1_handicap: number;
  player2_handicap: number;
  player3_handicap: number;
}

interface HybridScoreEntryProps {
  matchupId: number;
  teamId: number;
  lineup: Lineup;
  coursePar: number[];
  courseHandicapIndexes: number[];
  onScoreSubmitted?: () => void;
}

const HybridScoreEntry: React.FC<HybridScoreEntryProps> = ({
  matchupId,
  teamId,
  lineup,
  coursePar,
  courseHandicapIndexes,
  onScoreSubmitted
}) => {
  const { user } = useAuth();
  const [individualScores, setIndividualScores] = useState<PlayerScore[]>([]);
  const [alternateShotScore, setAlternateShotScore] = useState<TeamScore>({
    team_id: teamId,
    lineup_id: lineup.id,
    hole_scores: {},
    gross_total: 0,
    net_total: 0,
    team_handicap: 0,
    team_course_handicap: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [sectionComplete, setSectionComplete] = useState({
    individual: false,
    alternateShot: false
  });

  // Initialize individual scores for each player
  useEffect(() => {
    const players = [
      { id: lineup.player1_id, name: lineup.player1_name, handicap: lineup.player1_handicap },
      { id: lineup.player2_id, name: lineup.player2_name, handicap: lineup.player2_handicap },
      { id: lineup.player3_id, name: lineup.player3_name, handicap: lineup.player3_handicap }
    ];

    const initialScores: PlayerScore[] = players.map((player, index) => ({
      player_id: player.id,
      player_name: player.name,
      assigned_holes: [index * 3 + 1, index * 3 + 2, index * 3 + 3], // Holes 1-3, 4-6, 7-9
      hole_scores: {
        // Pre-fill with example scores for demonstration
        [(index * 3 + 1).toString()]: { hole: index * 3 + 1, gross: 4, par: 4, net: 3 },
        [(index * 3 + 2).toString()]: { hole: index * 3 + 2, gross: 5, par: 4, net: 4 },
        [(index * 3 + 3).toString()]: { hole: index * 3 + 3, gross: 3, par: 3, net: 2 }
      },
      gross_total: 12,
      net_total: 9,
      player_handicap: player.handicap,
      course_handicap: Math.round(player.handicap * (courseHandicapIndexes.length > 0 ? 1.2 : 1.0)) // Simplified calculation
    }));

    setIndividualScores(initialScores);

    // Calculate team handicap (average of 3 players)
    const teamHandicap = players.reduce((sum, player) => sum + player.handicap, 0) / 3;
    setAlternateShotScore(prev => ({
      ...prev,
      team_handicap: teamHandicap,
      team_course_handicap: Math.round(teamHandicap * 1.2) // Simplified calculation
    }));
  }, [lineup, courseHandicapIndexes]);

  // Initialize alternate shot hole scores (holes 10-18)
  useEffect(() => {
    const initialHoleScores: { [hole: string]: HoleScore } = {};
    for (let hole = 10; hole <= 18; hole++) {
      initialHoleScores[hole.toString()] = {
        hole,
        gross: hole === 10 ? 4 : hole === 11 ? 5 : hole === 12 ? 4 : hole === 13 ? 3 : hole === 14 ? 5 : hole === 15 ? 4 : hole === 16 ? 3 : hole === 17 ? 5 : 4, // Example scores
        par: coursePar[hole - 1] || 4,
        net: hole === 10 ? 3 : hole === 11 ? 4 : hole === 12 ? 3 : hole === 13 ? 2 : hole === 14 ? 4 : hole === 15 ? 3 : hole === 16 ? 2 : hole === 17 ? 4 : 3
      };
    }
    setAlternateShotScore(prev => ({
      ...prev,
      hole_scores: initialHoleScores,
      gross_total: 37,
      net_total: 28
    }));
  }, [coursePar]);

  const updateIndividualScore = (playerIndex: number, hole: number, gross: number) => {
    setIndividualScores(prev => {
      const updated = [...prev];
      const player = updated[playerIndex];
      const holeStr = hole.toString();
      
      player.hole_scores[holeStr] = {
        hole,
        gross,
        par: coursePar[hole - 1] || 4,
        net: gross - Math.floor(player.course_handicap / 18) // Simplified net calculation
      };

      // Recalculate totals
      player.gross_total = Object.values(player.hole_scores).reduce((sum, score) => sum + score.gross, 0);
      player.net_total = Object.values(player.hole_scores).reduce((sum, score) => sum + (score.net || score.gross), 0);

      return updated;
    });
  };

  const updateAlternateShotScore = (hole: number, gross: number) => {
    setAlternateShotScore(prev => {
      const updated = { ...prev };
      const holeStr = hole.toString();
      
      updated.hole_scores[holeStr] = {
        hole,
        gross,
        par: coursePar[hole - 1] || 4,
        net: gross - Math.floor(updated.team_course_handicap / 18) // Simplified net calculation
      };

      // Recalculate totals
      updated.gross_total = Object.values(updated.hole_scores).reduce((sum, score) => sum + score.gross, 0);
      updated.net_total = Object.values(updated.hole_scores).reduce((sum, score) => sum + (score.net || score.gross), 0);

      return updated;
    });
  };

  const checkSectionComplete = () => {
    const individualComplete = individualScores.every(player => 
      player.assigned_holes.every(hole => player.hole_scores[hole.toString()]?.gross > 0)
    );
    
    const alternateShotComplete = Object.values(alternateShotScore.hole_scores).every(score => score.gross > 0);
    
    setSectionComplete({
      individual: individualComplete,
      alternateShot: alternateShotComplete
    });
  };

  useEffect(() => {
    checkSectionComplete();
  }, [individualScores, alternateShotScore]);

  const submitIndividualScores = async () => {
    if (!sectionComplete.individual) {
      toast.error('Please complete all individual hole scores');
      return;
    }

    setSubmitting(true);
    try {
      for (const playerScore of individualScores) {
        const response = await fetch(`/api/matchups/${matchupId}/scores/individual`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            team_id: teamId,
            player_id: playerScore.player_id,
            lineup_id: lineup.id,
            assigned_holes: playerScore.assigned_holes,
            hole_scores: playerScore.hole_scores,
            player_handicap: playerScore.player_handicap,
            course_handicap: playerScore.course_handicap
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to submit individual scores for ${playerScore.player_name}`);
        }
      }

      toast.success('Individual scores submitted successfully!');
    } catch (error) {
      console.error('Error submitting individual scores:', error);
      toast.error('Failed to submit individual scores');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAlternateShotScores = async () => {
    if (!sectionComplete.alternateShot) {
      toast.error('Please complete all alternate shot hole scores');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/matchups/${matchupId}/scores/alternate-shot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          team_id: teamId,
          lineup_id: lineup.id,
          hole_scores: alternateShotScore.hole_scores,
          team_handicap: alternateShotScore.team_handicap,
          team_course_handicap: alternateShotScore.team_course_handicap
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit alternate shot scores');
      }

      toast.success('Alternate shot scores submitted successfully!');
    } catch (error) {
      console.error('Error submitting alternate shot scores:', error);
      toast.error('Failed to submit alternate shot scores');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAllScores = async () => {
    if (!sectionComplete.individual || !sectionComplete.alternateShot) {
      toast.error('Please complete both sections before submitting');
      return;
    }

    await submitIndividualScores();
    await submitAlternateShotScores();
    
    onScoreSubmitted?.();
  };

  const calculateIndividualNetTotal = () => {
    return individualScores.reduce((sum, player) => sum + player.net_total, 0);
  };

  const calculateTotalNet = () => {
    return calculateIndividualNetTotal() + alternateShotScore.net_total;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hybrid Format Score Entry</h2>
        <p className="text-gray-600">Team: {lineup.team_name}</p>
      </div>

      {/* Section 1: Individual 9 Holes */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Users className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">Section 1: Individual 9 Holes</h3>
          {sectionComplete.individual && <CheckCircle className="w-5 h-5 text-green-500 ml-2" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {individualScores.map((player, playerIndex) => (
            <div key={player.player_id} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{player.player_name}</h4>
              <p className="text-sm text-gray-600 mb-3">
                Handicap: {player.player_handicap} | Course: {player.course_handicap}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Assigned Holes: {player.assigned_holes.join(', ')}
              </p>

              <div className="space-y-2">
                {player.assigned_holes.map(hole => (
                  <div key={hole} className="flex items-center justify-between">
                    <span className="text-sm font-medium">Hole {hole} (Par {coursePar[hole - 1] || 4})</span>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={player.hole_scores[hole.toString()]?.gross || ''}
                      onChange={(e) => updateIndividualScore(playerIndex, hole, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      placeholder="Score"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span>Gross Total:</span>
                  <span className="font-semibold">{player.gross_total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Net Total:</span>
                  <span className="font-semibold text-blue-600">{player.net_total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-lg font-semibold">
            Individual Net Total: <span className="text-blue-600">{calculateIndividualNetTotal()}</span>
          </div>
          <button
            onClick={submitIndividualScores}
            disabled={!sectionComplete.individual || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Submit Individual Scores
          </button>
        </div>
      </div>

      {/* Section 2: Alternate Shot 9 Holes */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Target className="w-6 h-6 text-green-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">Section 2: Alternate Shot 9 Holes</h3>
          {sectionComplete.alternateShot && <CheckCircle className="w-5 h-5 text-green-500 ml-2" />}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">Team Alternate Shot</h4>
            <p className="text-sm text-gray-600">
              Team Handicap: {alternateShotScore.team_handicap.toFixed(1)} | Course: {alternateShotScore.team_course_handicap}
            </p>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.values(alternateShotScore.hole_scores).map(score => (
              <div key={score.hole} className="text-center">
                <div className="text-sm font-medium text-gray-600">Hole {score.hole}</div>
                <div className="text-xs text-gray-500 mb-1">Par {score.par}</div>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={score.gross || ''}
                  onChange={(e) => updateAlternateShotScore(score.hole, parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                  placeholder="Score"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span>Gross Total:</span>
              <span className="font-semibold">{alternateShotScore.gross_total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Net Total:</span>
              <span className="font-semibold text-green-600">{alternateShotScore.net_total}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-lg font-semibold">
            Alternate Shot Net Total: <span className="text-green-600">{alternateShotScore.net_total}</span>
          </div>
          <button
            onClick={submitAlternateShotScores}
            disabled={!sectionComplete.alternateShot || submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Submit Alternate Shot Scores
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Calculator className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Score Summary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Individual Net</div>
            <div className="text-xl font-bold text-blue-600">{calculateIndividualNetTotal()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Alternate Shot Net</div>
            <div className="text-xl font-bold text-green-600">{alternateShotScore.net_total}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Net</div>
            <div className="text-2xl font-bold text-gray-900">{calculateTotalNet()}</div>
          </div>
        </div>
      </div>

      {/* Submit All Button */}
      <div className="flex justify-center">
        <button
          onClick={submitAllScores}
          disabled={!sectionComplete.individual || !sectionComplete.alternateShot || submitting}
          className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-semibold"
        >
          <Save className="w-5 h-5 mr-2" />
          Submit All Scores
        </button>
      </div>

      {submitting && (
        <div className="mt-4 text-center text-gray-600">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
            Submitting scores...
          </div>
        </div>
      )}
    </div>
  );
};

export default HybridScoreEntry;
