import React from 'react';

interface MatchesTableProps {
  matches: any[];
  onUpdateMatchResult: (matchId: number, winnerId: number) => void;
}

const MatchesTable: React.FC<MatchesTableProps> = ({ matches, onUpdateMatchResult }) => {
  if (!matches.length) return null;
  return (
    <div>
      <h4 className="text-lg font-semibold text-brand-black mb-3">Tournament Matches</h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-neutral-300 rounded-lg">
          <thead className="bg-neutral-50">
            <tr>
              <th className="border border-neutral-300 px-4 py-2 text-left">Match</th>
              <th className="border border-neutral-300 px-4 py-2 text-left">Player 1</th>
              <th className="border border-neutral-300 px-4 py-2 text-left">Player 2</th>
              <th className="border border-neutral-300 px-4 py-2 text-left">Status</th>
              <th className="border border-neutral-300 px-4 py-2 text-left">Winner</th>
              <th className="border border-neutral-300 px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(match => (
              <tr key={match.id}>
                <td className="border border-neutral-300 px-4 py-2">{match.match_number}</td>
                <td className="border border-neutral-300 px-4 py-2">
                  {match.player1_first_name} {match.player1_last_name}
                </td>
                <td className="border border-neutral-300 px-4 py-2">
                  {match.player2_first_name} {match.player2_last_name}
                </td>
                <td className="border border-neutral-300 px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    match.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {match.status}
                  </span>
                </td>
                <td className="border border-neutral-300 px-4 py-2">
                  {match.winner_first_name ? 
                    `${match.winner_first_name} ${match.winner_last_name}` : 
                    'Not decided'
                  }
                </td>
                <td className="border border-neutral-300 px-4 py-2">
                  {match.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onUpdateMatchResult(match.id, match.player1_id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {match.player1_first_name} Wins
                      </button>
                      <button
                        onClick={() => onUpdateMatchResult(match.id, match.player2_id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {match.player2_first_name} Wins
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatchesTable; 