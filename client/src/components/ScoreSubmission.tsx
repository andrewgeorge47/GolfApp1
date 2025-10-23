import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { saveScorecard, submitTeamScore, submitTournamentStrokeplayScore } from '../services/api';

interface ScoreSubmissionProps {
  tournamentId: number;
  tournamentMatches?: any[];
  tournamentFormat?: string;
  onScoreSubmitted?: () => void;
  requiresMatches?: boolean;
  teams?: any[];
  tournamentSettings?: any;
  courseId?: number;
}

const ScoreSubmission: React.FC<ScoreSubmissionProps> = ({
  tournamentId,
  tournamentMatches = [],
  tournamentFormat = 'match_play',
  onScoreSubmitted,
  requiresMatches = false,
  teams = [],
  tournamentSettings = {},
  courseId
}) => {
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  useEffect(() => {
    // Initialize scores based on tournament format
    if (tournamentFormat === 'scramble' && teams.length > 0) {
      // Initialize team scores
      const teamScores: { [key: string]: number } = {};
      teams.forEach(team => {
        teamScores[team.id] = 0;
      });
      setScores(teamScores);
    } else if (requiresMatches && tournamentMatches.length > 0) {
      // Initialize match scores
      const matchScores: { [key: string]: number } = {};
      tournamentMatches.forEach(match => {
        matchScores[`${match.id}_player1`] = 0;
        matchScores[`${match.id}_player2`] = 0;
      });
      setScores(matchScores);
    }
  }, [tournamentFormat, teams, tournamentMatches, requiresMatches]);

  const handleScoreChange = (key: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      if (tournamentFormat === 'scramble' && selectedTeam) {
        // Submit team score for scramble format
        await submitTeamScore(tournamentId, selectedTeam.id, {
          total_score: scores[selectedTeam.id] || 0,
          submitted_by: 1 // TODO: Get actual user ID from auth context
        });
      } else if (tournamentFormat === 'stroke_play') {
        // Submit strokeplay score
        await submitTournamentStrokeplayScore(tournamentId, {
          total_score: Object.values(scores).reduce((sum, score) => sum + score, 0),
          hole_scores: Object.entries(scores).map(([key, score], index) => ({
            hole: index + 1,
            score: score
          }))
        });
      } else if (requiresMatches && selectedMatch) {
        // Submit match play score using saveScorecard
        await saveScorecard({
          type: 'stroke_play',
          player_name: `${selectedMatch.player1_name} vs ${selectedMatch.player2_name}`,
          date_played: new Date().toISOString().split('T')[0],
          handicap: 0,
          scores: {
            player1: scores[`${selectedMatch.id}_player1`] || 0,
            player2: scores[`${selectedMatch.id}_player2`] || 0
          },
          total_strokes: (scores[`${selectedMatch.id}_player1`] || 0) + (scores[`${selectedMatch.id}_player2`] || 0),
          total_mulligans: 0,
          final_score: Math.min(scores[`${selectedMatch.id}_player1`] || 0, scores[`${selectedMatch.id}_player2`] || 0),
          tournament_id: tournamentId
        });
      }
      
      toast.success('Score submitted successfully!');
      onScoreSubmitted?.();
      
      // Reset form
      setScores({});
      setSelectedMatch(null);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderScrambleForm = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Team
        </label>
        <select
          value={selectedTeam?.id || ''}
          onChange={(e) => {
            const team = teams.find(t => t.id === e.target.value);
            setSelectedTeam(team);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a team</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name} - {team.captain.first_name} {team.captain.last_name}
            </option>
          ))}
        </select>
      </div>

      {selectedTeam && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Team Score
          </label>
          <input
            type="number"
            value={scores[selectedTeam.id] || ''}
            onChange={(e) => handleScoreChange(selectedTeam.id, parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter team score"
          />
        </div>
      )}
    </div>
  );

  const renderMatchPlayForm = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Match
        </label>
        <select
          value={selectedMatch?.id || ''}
          onChange={(e) => {
            const match = tournamentMatches.find(m => m.id === parseInt(e.target.value));
            setSelectedMatch(match);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a match</option>
          {tournamentMatches.map(match => (
            <option key={match.id} value={match.id}>
              {match.player1_name} vs {match.player2_name}
            </option>
          ))}
        </select>
      </div>

      {selectedMatch && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedMatch.player1_name} Score
            </label>
            <input
              type="number"
              value={scores[`${selectedMatch.id}_player1`] || ''}
              onChange={(e) => handleScoreChange(`${selectedMatch.id}_player1`, parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter score"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedMatch.player2_name} Score
            </label>
            <input
              type="number"
              value={scores[`${selectedMatch.id}_player2`] || ''}
              onChange={(e) => handleScoreChange(`${selectedMatch.id}_player2`, parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter score"
            />
          </div>
        </div>
      )}
    </div>
  );

  const canSubmit = () => {
    if (tournamentFormat === 'scramble') {
      return selectedTeam && scores[selectedTeam.id] > 0;
    } else if (requiresMatches) {
      return selectedMatch && 
             scores[`${selectedMatch.id}_player1`] > 0 && 
             scores[`${selectedMatch.id}_player2`] > 0;
    }
    return false;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Submit Score - {tournamentFormat === 'scramble' ? 'Scramble Format' : 'Match Play'}
      </h2>

      {tournamentFormat === 'scramble' ? renderScrambleForm() : renderMatchPlayForm()}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit() || submitting}
          className={`px-6 py-2 rounded-md font-medium ${
            canSubmit() && !submitting
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit Score'}
        </button>
      </div>
    </div>
  );
};

export default ScoreSubmission;