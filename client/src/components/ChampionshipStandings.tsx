import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Users, Target, Award, ChevronRight, RefreshCw, Zap } from 'lucide-react';
import api from '../services/api';
import NationalChampionshipBracket from './NationalChampionshipBracket';

interface ChampionshipStandingsProps {
  tournamentId: number;
  tournamentName: string;
  onRefresh?: () => void;
}

interface GroupStanding {
  group_id: number;
  group_name: string;
  participants: Array<{
    user_id: number;
    first_name: string;
    last_name: string;
    club: string;
    match_wins: number;
    match_losses: number;
    match_ties: number;
    total_matches: number;
    tiebreaker_points: number;
    total_holes_won: number;
    total_holes_lost: number;
    net_holes: number;
    group_name?: string;
    position?: number;
  }>;
}

const ChampionshipStandings: React.FC<ChampionshipStandingsProps> = ({
  tournamentId,
  tournamentName,
  onRefresh
}) => {
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'bracket'>('standings');

  const fetchStandings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch championship standings directly
      const response = await api.get(`/tournaments/${tournamentId}/championship-standings`);
      setStandings(response.data);
    } catch (err) {
      console.error('Error fetching championship standings:', err);
      setError('Failed to load championship standings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [tournamentId]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-gray-500">{position}</span>;
    }
  };

  const getWinRate = (wins: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((wins / total) * 100)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
          <span className="ml-3 text-gray-600">Loading championship standings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Error Loading Standings</h4>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchStandings}
            className="flex items-center space-x-2 text-brand-neon-green hover:text-green-600 transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-brand-neon-green" />
            <h3 className="text-xl font-semibold text-gray-900">Championship Standings</h3>
          </div>
          <button
            onClick={() => {
              fetchStandings();
              onRefresh?.();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Tournament:</strong> {tournamentName}</p>
          <p><strong>Format:</strong> Match Play Championship</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('standings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'standings'
                  ? 'border-brand-neon-green text-brand-neon-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4" />
                <span>Club Standings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bracket'
                  ? 'border-brand-neon-green text-brand-neon-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>National Championship Bracket</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'standings' ? (
        <>
          {/* Group Standings */}
          {standings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Groups Found</h4>
            <p className="text-gray-500 text-sm">
              No championship groups have been created yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {standings.map((group) => (
            <div key={group.group_id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* Group Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-brand-neon-green" />
                  <h4 className="text-lg font-semibold text-gray-900">{group.group_name}</h4>
                  <span className="text-sm text-gray-500">
                    ({group.participants.length} participants)
                  </span>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Club
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        W-L-T
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Holes Won
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Holes
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiebreaker
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.participants.map((participant, index) => (
                      <tr key={participant.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {getPositionIcon(index + 1)}
                            <span className="text-sm font-medium text-gray-600">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">
                              {participant.first_name} {participant.last_name}
                            </span>
                            {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{participant.club}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {participant.match_wins}-{participant.match_losses}-{participant.match_ties}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {getWinRate(participant.match_wins, participant.total_matches)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {participant.total_holes_won}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm font-medium ${
                            participant.net_holes > 0 ? 'text-green-600' : 
                            participant.net_holes < 0 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {participant.net_holes > 0 ? '+' : ''}{participant.net_holes}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {participant.tiebreaker_points}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {group.participants.map((participant, index) => (
                  <div key={participant.user_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getPositionIcon(index + 1)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">
                              {participant.first_name} {participant.last_name}
                            </span>
                            {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {participant.club}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {participant.match_wins}-{participant.match_losses}-{participant.match_ties}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getWinRate(participant.match_wins, participant.total_matches)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-sm text-gray-600">
                        Tiebreaker Points
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {participant.tiebreaker_points}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      ) : (
        <NationalChampionshipBracket 
          tournamentId={tournamentId}
          standings={standings}
        />
      )}
    </div>
  );
};

export default ChampionshipStandings;
