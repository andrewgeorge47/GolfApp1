import React from 'react';

interface TournamentListProps {
  tournaments: any[];
  selectedTournament: any | null;
  setSelectedTournament: (t: any) => void;
  onEdit: (t: any) => void;
  onDelete: (id: number) => void;
  statsByTournamentId: Record<string, any>;
}

const TournamentList: React.FC<TournamentListProps> = ({ tournaments, selectedTournament, setSelectedTournament, onEdit, onDelete, statsByTournamentId }) => (
  <div className="lg:col-span-1">
    <h3 className="text-lg font-semibold text-brand-black mb-3">Tournaments</h3>
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {tournaments.map(tournament => {
        const stats = statsByTournamentId[tournament.id] || {};
        return (
          <div
            key={tournament.id}
            className={`p-3 rounded-lg border transition-colors ${
              selectedTournament?.id === tournament.id
                ? 'border-brand-neon-green bg-brand-neon-green/10'
                : 'border-neutral-300 hover:border-neutral-400'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-brand-black">{tournament.name}</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(tournament)}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(tournament.id)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedTournament(tournament)}
                  className={`px-2 py-1 rounded text-xs ${selectedTournament?.id === tournament.id ? 'bg-brand-neon-green text-brand-black' : 'bg-neutral-200 text-brand-black hover:bg-brand-neon-green/20'}`}
                >
                  View
                </button>
              </div>
            </div>
            <div className="text-xs text-neutral-600 mb-1">{tournament.type}</div>
            {tournament.start_date && (
              <div className="text-xs text-neutral-500 mb-1">
                {new Date(tournament.start_date).toLocaleDateString()} {tournament.end_date ? `- ${new Date(tournament.end_date).toLocaleDateString()}` : ''}
              </div>
            )}
            <div className="flex space-x-4 text-xs mt-2">
              <div><strong>{stats.total_participants || 0}</strong> Participants</div>
              <div><strong>{stats.checked_in_count || 0}</strong> Checked In</div>
              <div><strong>{stats.total_matches || 0}</strong> Matches</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default TournamentList; 