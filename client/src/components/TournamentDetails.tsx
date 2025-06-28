import React from 'react';
import { Edit, Trash2, UserPlus, CheckCircle, Clock } from 'lucide-react';

interface TournamentDetailsProps {
  selectedTournament: any;
  tournamentStats: any;
  onEdit: () => void;
  onDelete: () => void;
  onRegister: () => void;
  onCheckIn: () => void;
  onGenerateMatches: () => void;
  getCheckedInPlayersCount: () => number;
  disabledMatchGeneration: boolean;
}

const TournamentDetails: React.FC<TournamentDetailsProps> = ({
  selectedTournament,
  tournamentStats,
  onEdit,
  onDelete,
  onRegister,
  onCheckIn,
  onGenerateMatches,
  getCheckedInPlayersCount,
  disabledMatchGeneration
}) => {
  if (!selectedTournament) return null;

  return (
    <div className="bg-neutral-50 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-brand-black">{selectedTournament.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          selectedTournament.status === 'active' ? 'bg-green-100 text-green-800' :
          selectedTournament.status === 'open' ? 'bg-blue-100 text-blue-800' :
          selectedTournament.status === 'completed' ? 'bg-gray-100 text-gray-800' :
          selectedTournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {selectedTournament.status || 'draft'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
        <div className="space-y-2">
          <p><strong>Type:</strong> {selectedTournament.type}</p>
          <p><strong>Format:</strong> {selectedTournament.tournament_format || 'match_play'}</p>
          <p><strong>Start Date:</strong> {selectedTournament.start_date ? new Date(selectedTournament.start_date).toLocaleDateString() : 'N/A'}</p>
          <p><strong>End Date:</strong> {selectedTournament.end_date ? new Date(selectedTournament.end_date).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Registration Deadline:</strong> {selectedTournament.registration_deadline ? new Date(selectedTournament.registration_deadline).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="space-y-2">
          <p><strong>Location:</strong> {selectedTournament.location || 'N/A'}</p>
          <p><strong>Course:</strong> {selectedTournament.course || 'N/A'}</p>
          <p><strong>Entry Fee:</strong> ${selectedTournament.entry_fee || 0}</p>
          <p><strong>Registration:</strong> {selectedTournament.registration_open ? 'Open' : 'Closed'}</p>
          <p><strong>Participants:</strong> {selectedTournament.min_participants || 2} - {selectedTournament.max_participants || 'No limit'}</p>
        </div>
      </div>
      
      {selectedTournament.description && (
        <div className="mb-4">
          <p className="text-sm"><strong>Description:</strong></p>
          <p className="text-sm text-neutral-600 bg-white p-2 rounded border">{selectedTournament.description}</p>
        </div>
      )}
      
      {selectedTournament.rules && (
        <div className="mb-4">
          <p className="text-sm"><strong>Rules:</strong></p>
          <p className="text-sm text-neutral-600 bg-white p-2 rounded border">{selectedTournament.rules}</p>
        </div>
      )}
      
      {selectedTournament.notes && (
        <div className="mb-4">
          <p className="text-sm"><strong>Notes:</strong></p>
          <p className="text-sm text-neutral-600 bg-white p-2 rounded border">{selectedTournament.notes}</p>
        </div>
      )}
      
      {tournamentStats && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="font-bold text-brand-neon-green">{tournamentStats.total_participants}</p>
            <p className="text-neutral-600">Participants</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-brand-neon-green">{tournamentStats.checked_in_count}</p>
            <p className="text-neutral-600">Checked In</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-brand-neon-green">{tournamentStats.total_matches}</p>
            <p className="text-neutral-600">Matches</p>
          </div>
        </div>
      )}
      <div className="mt-4 flex space-x-2">
        <button onClick={onEdit} className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          <Edit className="w-3 h-3 mr-1" />Edit
        </button>
        <button onClick={onDelete} className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
          <Trash2 className="w-3 h-3 mr-1" />Delete
        </button>
      </div>
    </div>
  );
};

export default TournamentDetails; 