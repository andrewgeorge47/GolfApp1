import React, { useEffect, useState } from 'react';
import { getClubProHandicaps, getClubProPlayerTournaments } from '../services/api';
import { useAuth } from '../AuthContext';

const ClubProDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [memberData, setMemberData] = useState<{
    club: string;
    members: Array<{
      member_id: number;
      first_name: string;
      last_name: string;
      sim_handicap?: number;
      total_rounds: number | string;
      tournaments: Array<{
        tournament_id: number;
        tournament_name: string;
        tournament_status: string;
        start_date?: string;
        end_date?: string;
        participation_status: string;
      }>;
    }>;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Loading club pro data...', { user: user?.member_id, role: user?.role });
        
        const [handicapsRes, tournamentsRes] = await Promise.all([
          getClubProHandicaps(),
          getClubProPlayerTournaments(),
        ]);
        
        console.log('Handicaps response:', handicapsRes.data);
        console.log('Tournaments response:', tournamentsRes.data);
        
        // Combine the data
        const combinedData = {
          club: handicapsRes.data.club,
          members: handicapsRes.data.players.map(player => {
            const playerTournaments = tournamentsRes.data.players.find(p => p.member_id === player.member_id);
            return {
              member_id: player.member_id,
              first_name: player.first_name,
              last_name: player.last_name,
              sim_handicap: player.sim_handicap,
              total_rounds: player.total_rounds,
              tournaments: playerTournaments?.tournaments || []
            };
          })
        };
        
        setMemberData(combinedData);
      } catch (e) {
        console.error('Failed to load club pro data', e);
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      load();
    }
  }, [user]);

  const toggleRowExpansion = (memberId: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(memberId)) {
      newExpandedRows.delete(memberId);
    } else {
      newExpandedRows.add(memberId);
    }
    setExpandedRows(newExpandedRows);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white/95 backdrop-blur-sm shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Member Summary {memberData?.club ? `- ${memberData.club}` : ''}</h2>
        {loading && <div>Loading...</div>}
        {!loading && memberData && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SIM HCP</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rounds</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tournaments</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {memberData.members.map((member) => {
                  const isExpanded = expandedRows.has(member.member_id);
                  const activeTournaments = member.tournaments.filter(t => t.participation_status === 'active').length;
                  const completedTournaments = member.tournaments.filter(t => t.participation_status === 'completed').length;
                  const registeredTournaments = member.tournaments.filter(t => t.participation_status === 'registered').length;
                  
                  return (
                    <React.Fragment key={member.member_id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRowExpansion(member.member_id)}>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                          {member.sim_handicap ?? '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                          {member.total_rounds}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                          {member.tournaments.length}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex gap-1">
                            {activeTournaments > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {activeTournaments} active
                              </span>
                            )}
                            {completedTournaments > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {completedTournaments} completed
                              </span>
                            )}
                            {registeredTournaments > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {registeredTournaments} registered
                              </span>
                            )}
                            {member.tournaments.length === 0 && (
                              <span className="text-gray-400 text-xs">No tournaments</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400">
                          <svg 
                            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-3 py-2 bg-gray-50">
                            <div className="ml-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Tournament Details</h4>
                              {member.tournaments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {member.tournaments.map((tournament) => (
                                    <div key={tournament.tournament_id} className="bg-white rounded p-2 text-sm border">
                                      <div className="font-medium text-gray-900">{tournament.tournament_name}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          tournament.participation_status === 'completed' 
                                            ? 'bg-green-100 text-green-800'
                                            : tournament.participation_status === 'active'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {tournament.participation_status}
                                        </span>
                                        {tournament.start_date && (
                                          <span className="text-gray-500 text-xs">
                                            {new Date(tournament.start_date).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-500 text-sm">No tournament participation</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubProDashboard;


