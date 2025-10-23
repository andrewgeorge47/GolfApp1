import React, { useState, useEffect } from 'react';
import { Edit, Save, RefreshCw, Target, Trophy } from 'lucide-react';
import { getAdminMatchplayMatches, updateAdminMatchplayMatch } from '../services/api';
import { toast } from 'react-toastify';

interface AdminMatchplayEditorProps {
  tournamentId: number;
  tournamentName: string;
  onMatchUpdated: () => void;
}

interface Match {
  id: number;
  match_number: number;
  player1_id: number;
  player1_first_name: string;
  player1_last_name: string;
  player1_club: string;
  player1_score: number | null;
  player2_id: number;
  player2_first_name: string;
  player2_last_name: string;
  player2_club: string;
  player2_score: number | null;
  winner_id: number | null;
  scores: any;
  status: string;
  created_at: string;
  updated_at: string;
}

const AdminMatchplayEditor: React.FC<AdminMatchplayEditorProps> = ({
  tournamentId,
  tournamentName,
  onMatchUpdated
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editForm, setEditForm] = useState<{
    player1_score: number;
    player2_score: number;
    winner_id: number | null;
  }>({
    player1_score: 0,
    player2_score: 0,
    winner_id: null
  });
  const [saving, setSaving] = useState(false);

  // Fetch matches
  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await getAdminMatchplayMatches(tournamentId);
      setMatches(response.data);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  // Handle edit button click
  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    setEditForm({
      player1_score: match.player1_score || 0,
      player2_score: match.player2_score || 0,
      winner_id: match.winner_id
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingMatch(null);
    setEditForm({
      player1_score: 0,
      player2_score: 0,
      winner_id: null
    });
  };

  // Handle score change
  const handleScoreChange = (player: 'player1' | 'player2', value: string) => {
    const numValue = parseInt(value) || 0;
    setEditForm({
      ...editForm,
      [player === 'player1' ? 'player1_score' : 'player2_score']: numValue
    });
  };

  // Handle winner change
  const handleWinnerChange = (winnerId: string) => {
    setEditForm({
      ...editForm,
      winner_id: winnerId === 'null' ? null : parseInt(winnerId)
    });
  };

  // Handle save
  const handleSave = async () => {
    if (!editingMatch) return;

    try {
      setSaving(true);
      await updateAdminMatchplayMatch(tournamentId, editingMatch.id, {
        player1_score: editForm.player1_score,
        player2_score: editForm.player2_score,
        winner_id: editForm.winner_id,
        scores: editingMatch.scores // Keep existing scores structure
      });

      toast.success('Match updated successfully');
      setEditingMatch(null);
      fetchMatches();
      onMatchUpdated();
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
          <Trophy className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">No matchplay matches found</h3>
        <p className="text-neutral-600">
          No matchplay matches have been generated for this tournament yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-brand-black">Admin Matchplay Editor</h3>
          <p className="text-sm text-neutral-600">
            Edit matchplay matches for {tournamentName}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMatches}
            className="px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
            title="Refresh matches"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Match Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-brand-black">
                  Match #{match.match_number}
                </h4>
                <p className="text-sm text-neutral-500">
                  {match.status === 'completed' ? 'Completed' : 'Pending'}
                </p>
              </div>
              <div className="text-right">
                {match.winner_id && (
                  <div className="text-sm text-green-600 font-medium">
                    Winner: {match.winner_id === match.player1_id ? 
                      `${match.player1_first_name} ${match.player1_last_name}` : 
                      `${match.player2_first_name} ${match.player2_last_name}`}
                  </div>
                )}
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-2">Player 1</h5>
                <p className="text-sm font-medium text-blue-900">
                  {match.player1_first_name} {match.player1_last_name}
                </p>
                <p className="text-xs text-blue-700">{match.player1_club}</p>
                <p className="text-lg font-bold text-blue-600 mt-1">
                  Score: {match.player1_score || '-'}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-medium text-green-800 mb-2">Player 2</h5>
                <p className="text-sm font-medium text-green-900">
                  {match.player2_first_name} {match.player2_last_name}
                </p>
                <p className="text-xs text-green-700">{match.player2_club}</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  Score: {match.player2_score || '-'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2">
              {editingMatch?.id === match.id ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-2 border border-neutral-300 text-neutral-600 rounded hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-2 bg-brand-neon-green text-brand-black rounded font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleEdit(match)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
              )}
            </div>

            {/* Edit Form */}
            {editingMatch?.id === match.id && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-3">Editing Match</h5>
                
                {/* Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Player 1 Score:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.player1_score}
                      onChange={(e) => handleScoreChange('player1', e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Player 2 Score:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.player2_score}
                      onChange={(e) => handleScoreChange('player2', e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Winner */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Winner:
                  </label>
                  <select
                    value={editForm.winner_id || 'null'}
                    onChange={(e) => handleWinnerChange(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="null">No winner (tie)</option>
                    <option value={match.player1_id}>
                      {match.player1_first_name} {match.player1_last_name}
                    </option>
                    <option value={match.player2_id}>
                      {match.player2_first_name} {match.player2_last_name}
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-neutral-700">Summary</h4>
            <p className="text-sm text-neutral-600">
              {matches.length} match{matches.length !== 1 ? 'es' : ''} loaded
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-600">
              Completed: {matches.filter(m => m.status === 'completed').length}
            </div>
            <div className="text-sm text-neutral-600">
              Pending: {matches.filter(m => m.status === 'pending').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMatchplayEditor; 