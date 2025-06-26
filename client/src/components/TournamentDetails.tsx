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
      <h3 className="text-lg font-semibold text-brand-black mb-3">{selectedTournament.name}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><strong>Type:</strong> {selectedTournament.type}</p>
          <p><strong>Start Date:</strong> {selectedTournament.start_date || 'N/A'}</p>
          <p><strong>End Date:</strong> {selectedTournament.end_date || 'N/A'}</p>
        </div>
        <div>
          <p><strong>Notes:</strong> {selectedTournament.notes || 'N/A'}</p>
        </div>
      </div>
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