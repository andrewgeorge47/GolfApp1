import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle, Clock, Users } from 'lucide-react';
import { generateTournamentMatches, updateTournamentMatch } from '../services/api';
import { toast } from 'react-toastify';

interface Match {
  id: number;
  match_number: number;
  player1_id: number;
  player1_first_name: string;
  player1_last_name: string;
  player1_club: string;
  player2_id: number;
  player2_first_name: string;
  player2_last_name: string;
  player2_club: string;
  status: 'pending' | 'completed';
  winner_id?: number;
  winner_first_name?: string;
  winner_last_name?: string;
}

interface MatchGeneratorProps {
  tournamentId: number;
  tournamentMatches: Match[];
  tournamentParticipants: any[];
  tournamentCheckIns: any[];
  onMatchesGenerated: () => void;
  onMatchUpdated: () => void;
}

const MatchGenerator: React.FC<MatchGeneratorProps> = ({
  tournamentId,
  tournamentMatches,
  tournamentParticipants,
  tournamentCheckIns,
  onMatchesGenerated,
  onMatchUpdated
}) => {
  // Debug: Log when participants data changes
  useEffect(() => {
    console.log('MatchGenerator - participants updated:', tournamentParticipants);
  }, [tournamentParticipants]);
  const [showMatchGenerationModal, setShowMatchGenerationModal] = useState(false);
  const [matchGenerationForm, setMatchGenerationForm] = useState({
    format: 'optimized',
    minMatchesPerPlayer: 3
  });

  const handleGenerateMatches = async () => {
    try {
      await generateTournamentMatches(tournamentId, matchGenerationForm.format, matchGenerationForm.minMatchesPerPlayer);
      toast.success('Matches generated successfully');
      setShowMatchGenerationModal(false);
      onMatchesGenerated();
    } catch (error) {
      console.error('Error generating matches:', error);
      toast.error('Failed to generate matches');
    }
  };

  const handleUpdateMatchResult = async (matchId: number, winnerId: number, scores?: any) => {
    try {
      await updateTournamentMatch(tournamentId, matchId, { winner_id: winnerId, scores });
      toast.success('Match result updated successfully');
      onMatchUpdated();
    } catch (error) {
      console.error('Error updating match result:', error);
      toast.error('Failed to update match result');
    }
  };

  const getCheckedInPlayersCount = () => {
    // Use actual check-in data
    console.log('MatchGenerator - tournamentCheckIns:', tournamentCheckIns);
    return tournamentCheckIns.filter(c => c.status === 'checked_in').length;
  };

  return (
    <div className="space-y-6">
      {/* Matches Overview */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-brand-black">Match Management</h4>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">
              {tournamentMatches.filter(m => m.status === 'completed').length} completed
            </span>
            <span className="text-sm text-neutral-600">
              / {tournamentMatches.length} total
            </span>
          </div>
        </div>

        {/* Match Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {tournamentMatches.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {tournamentMatches.filter(m => m.status === 'pending').length}
                </div>
                <div className="text-sm text-yellow-700">Pending</div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {tournamentParticipants.length}
                </div>
                <div className="text-sm text-blue-700">Participants</div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <Trophy className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.ceil(tournamentMatches.length / 2)}
                </div>
                <div className="text-sm text-purple-700">Rounds</div>
              </div>
            </div>
          </div>
        </div>

        {/* Match Generation Section */}
        {tournamentMatches.length === 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200 mb-6">
            <div className="flex items-center mb-4">
              <Trophy className="w-5 h-5 text-purple-600 mr-2" />
              <h5 className="text-lg font-semibold text-purple-900">Generate Tournament Matches</h5>
            </div>
            <p className="text-purple-700 mb-4">
              Create match pairings for your tournament. You can choose from different generation formats.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">Generation Format</label>
                <select
                  value={matchGenerationForm.format}
                  onChange={e => setMatchGenerationForm({ ...matchGenerationForm, format: e.target.value })}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="optimized">Optimized (Balanced)</option>
                  <option value="random">Random</option>
                  <option value="seeded">Seeded (by Handicap)</option>
                  <option value="round_robin">Round Robin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">Min Matches Per Player</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={matchGenerationForm.minMatchesPerPlayer}
                  onChange={e => setMatchGenerationForm({ ...matchGenerationForm, minMatchesPerPlayer: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleGenerateMatches}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
                disabled={tournamentParticipants.length < 2}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Generate Matches
              </button>
              
              {tournamentParticipants.length < 2 && (
                <div className="flex items-center text-sm text-purple-600">
                  <Clock className="w-4 h-4 mr-2" />
                  Need at least 2 participants to generate matches
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match Progress */}
        {tournamentMatches.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-neutral-600 mb-2">
              <span>Match Progress</span>
              <span>
                {tournamentMatches.length > 0 
                  ? Math.round((tournamentMatches.filter(m => m.status === 'completed').length / tournamentMatches.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${tournamentMatches.length > 0 
                    ? (tournamentMatches.filter(m => m.status === 'completed').length / tournamentMatches.length) * 100
                    : 0}%`,
                  background: '#22c55e'
                }}
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {tournamentMatches.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setShowMatchGenerationModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Regenerate Matches
            </button>
            
            <button
              onClick={() => {
                const pendingMatches = tournamentMatches.filter(m => m.status === 'pending');
                if (pendingMatches.length > 0) {
                  // Auto-complete all pending matches (for testing)
                  pendingMatches.forEach(match => {
                    handleUpdateMatchResult(match.id, match.player1_id);
                  });
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
              disabled={tournamentMatches.filter(m => m.status === 'pending').length === 0}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete All Pending
            </button>
          </div>
        )}

        {/* Matches Table */}
        {tournamentMatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-neutral-300 rounded-lg">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Match #</th>
                  <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Player 1</th>
                  <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Player 2</th>
                  <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Status</th>
                  <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Winner</th>
                  <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournamentMatches.map(match => (
                  <tr key={match.id} className="hover:bg-neutral-50">
                    <td className="border border-neutral-300 px-4 py-3 font-medium">
                      #{match.match_number}
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      <div className="font-medium">
                        {match.player1_first_name} {match.player1_last_name}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {match.player1_club}
                      </div>
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      <div className="font-medium">
                        {match.player2_first_name} {match.player2_last_name}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {match.player2_club}
                      </div>
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      {match.status === 'completed' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Completed
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      {match.winner_first_name ? (
                        <div className="font-medium text-green-600">
                          {match.winner_first_name} {match.winner_last_name}
                        </div>
                      ) : (
                        <span className="text-neutral-500">Not decided</span>
                      )}
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      {match.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateMatchResult(match.id, match.player1_id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            {match.player1_first_name} Wins
                          </button>
                          <button
                            onClick={() => handleUpdateMatchResult(match.id, match.player2_id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            {match.player2_first_name} Wins
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-500">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No matches generated yet</h3>
            <p className="text-neutral-600 mb-4">
              Generate matches to start the tournament competition.
            </p>
          </div>
        )}
      </div>

      {/* Match Generation Modal */}
      {showMatchGenerationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">
              Generate Matches
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Format</label>
                <select
                  value={matchGenerationForm.format}
                  onChange={(e) => setMatchGenerationForm({ ...matchGenerationForm, format: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="optimized">Optimized (Recommended)</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="random_pairs">Random Pairs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Minimum Matches Per Player</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={matchGenerationForm.minMatchesPerPlayer}
                  onChange={(e) => setMatchGenerationForm({ ...matchGenerationForm, minMatchesPerPlayer: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Note: This setting is only applicable for optimized format
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Participants:</strong> {tournamentParticipants.length}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Format:</strong> {matchGenerationForm.format.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  onClick={() => setShowMatchGenerationModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateMatches}
                  disabled={tournamentParticipants.length < 2}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    tournamentParticipants.length >= 2
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  Generate Matches
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchGenerator; 