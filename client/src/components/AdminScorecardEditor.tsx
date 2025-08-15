import React, { useState, useEffect } from 'react';
import { Edit, Save, Trash2, Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { getAdminScorecards, updateAdminScorecard, deleteAdminScorecard } from '../services/api';
import { toast } from 'react-toastify';

interface AdminScorecardEditorProps {
  tournamentId: number;
  tournamentName: string;
  weekStartDate?: string;
  onScorecardUpdated: () => void;
}

interface Scorecard {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  club: string;
  email_address: string;
  hole_scores: number[];
  total_score: number;
  notes?: string;
  week_start_date: string;
  created_at: string;
  updated_at: string;
}

const AdminScorecardEditor: React.FC<AdminScorecardEditorProps> = ({
  tournamentId,
  tournamentName,
  weekStartDate,
  onScorecardUpdated
}) => {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScorecard, setEditingScorecard] = useState<Scorecard | null>(null);
  const [editForm, setEditForm] = useState<{
    hole_scores: number[];
    total_score: number;
    notes: string;
  }>({
    hole_scores: [],
    total_score: 0,
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Fetch scorecards
  const fetchScorecards = async () => {
    try {
      setLoading(true);
      const response = await getAdminScorecards(tournamentId, weekStartDate);
      setScorecards(response.data);
    } catch (error) {
      console.error('Error fetching scorecards:', error);
      toast.error('Failed to load scorecards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScorecards();
  }, [tournamentId, weekStartDate]);

  // Handle edit button click
  const handleEdit = (scorecard: Scorecard) => {
    setEditingScorecard(scorecard);
    setEditForm({
      hole_scores: [...scorecard.hole_scores],
      total_score: scorecard.total_score,
      notes: scorecard.notes || ''
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingScorecard(null);
    setEditForm({
      hole_scores: [],
      total_score: 0,
      notes: ''
    });
  };

  // Handle hole score change
  const handleHoleScoreChange = (holeIndex: number, value: string) => {
    const newHoleScores = [...editForm.hole_scores];
    const numValue = parseInt(value) || 0;
    newHoleScores[holeIndex] = numValue;
    
    // Recalculate total
    const newTotal = newHoleScores.reduce((sum, score) => sum + score, 0);
    
    setEditForm({
      ...editForm,
      hole_scores: newHoleScores,
      total_score: newTotal
    });
  };

  // Handle total score change
  const handleTotalScoreChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setEditForm({
      ...editForm,
      total_score: numValue
    });
  };

  // Handle save
  const handleSave = async () => {
    if (!editingScorecard) return;

    try {
      setSaving(true);
      await updateAdminScorecard(tournamentId, editingScorecard.id, {
        hole_scores: editForm.hole_scores,
        total_score: editForm.total_score
      });

      toast.success('Scorecard updated successfully');
      setEditingScorecard(null);
      fetchScorecards();
      onScorecardUpdated();
    } catch (error: any) {
      console.error('Error updating scorecard:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(`Failed to update scorecard: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (scorecard: Scorecard) => {
    if (!window.confirm(`Are you sure you want to delete the scorecard for ${scorecard.first_name} ${scorecard.last_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteAdminScorecard(tournamentId, scorecard.id);
      toast.success('Scorecard deleted successfully');
      fetchScorecards();
      onScorecardUpdated();
    } catch (error) {
      console.error('Error deleting scorecard:', error);
      toast.error('Failed to delete scorecard');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (scorecards.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
          <Eye className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">No scorecards found</h3>
        <p className="text-neutral-600">
          No scorecards have been submitted for this tournament yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-brand-black">Admin Scorecard Editor</h3>
          <p className="text-sm text-neutral-600">
            Edit or delete player scorecards for {tournamentName}
            {weekStartDate && ` (Week of ${new Date(weekStartDate).toLocaleDateString()})`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchScorecards}
            className="px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
            title="Refresh scorecards"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`px-3 py-2 rounded-lg transition-colors ${
              showDeleted 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
            title={showDeleted ? 'Hide deleted scorecards' : 'Show deleted scorecards'}
          >
            {showDeleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Scorecards List */}
      <div className="space-y-4">
        {scorecards.map((scorecard) => (
          <div
            key={scorecard.id}
            className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Scorecard Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-brand-black">
                  {scorecard.first_name} {scorecard.last_name}
                </h4>
                <p className="text-sm text-neutral-600">{scorecard.club}</p>
                <p className="text-xs text-neutral-500">{scorecard.email_address}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-brand-neon-green">
                  {scorecard.total_score}
                </div>
                <div className="text-sm text-neutral-500">Total Score</div>
                <div className="text-xs text-neutral-400">
                  {new Date(scorecard.updated_at || scorecard.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Hole Scores */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-neutral-700 mb-2">Hole Scores:</h5>
              <div className="grid grid-cols-9 gap-1">
                {scorecard.hole_scores.map((score, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-neutral-500 mb-1">H{index + 1}</div>
                    <div className="text-sm font-medium text-neutral-700">{score}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {scorecard.notes && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-neutral-700 mb-1">Notes:</h5>
                <p className="text-sm text-neutral-600 bg-neutral-50 p-2 rounded">
                  {scorecard.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2">
              {editingScorecard?.id === scorecard.id ? (
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
                <>
                  <button
                    onClick={() => handleEdit(scorecard)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(scorecard)}
                    disabled={deleting}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {deleting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* Edit Form */}
            {editingScorecard?.id === scorecard.id && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-3">Editing Scorecard</h5>
                
                {/* Hole Scores Editor */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Hole Scores:
                  </label>
                  <div className="grid grid-cols-9 gap-2">
                    {editForm.hole_scores.map((score, index) => (
                      <div key={index} className="text-center">
                        <label className="block text-xs text-blue-700 mb-1">H{index + 1}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={score || ''}
                          onChange={(e) => handleHoleScoreChange(index, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Score */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Total Score:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.total_score}
                    onChange={(e) => handleTotalScoreChange(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Notes:
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any notes about this scorecard..."
                  />
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
              {scorecards.length} scorecard{scorecards.length !== 1 ? 's' : ''} loaded
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-600">
              Average Score: {scorecards.length > 0 ? Math.round(scorecards.reduce((sum, sc) => sum + sc.total_score, 0) / scorecards.length) : 0}
            </div>
            <div className="text-sm text-neutral-600">
              Best Score: {scorecards.length > 0 ? Math.min(...scorecards.map(sc => sc.total_score)) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminScorecardEditor; 