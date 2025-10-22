import React, { useState, useEffect } from 'react';
import { Trophy, Users, Settings, Plus, Minus, Crown } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllClubs } from '../services/api';

interface ClubChampionshipManagerProps {
  tournamentId: number;
  onChampionshipComplete: (clubChampions: any[]) => void;
}

interface ClubGroup {
  id?: number;
  group_name: string;
  participating_clubs: string[];
  min_participants: number;
  max_participants?: number;
  participant_count: number;
}

interface ClubParticipantCount {
  club: string;
  participant_count: number;
  participants: any[];
}

interface MatchResult {
  player1_id: number;
  player2_id: number;
  player1_holes_won: number;
  player2_holes_won: number;
  player1_net_holes: number;
  player2_net_holes: number;
  winner_id: number;
  match_number: number;
}

const ClubChampionshipManager: React.FC<ClubChampionshipManagerProps> = ({
  tournamentId,
  onChampionshipComplete
}) => {
  const [clubGroups, setClubGroups] = useState<ClubGroup[]>([]);
  const [clubParticipantCounts, setClubParticipantCounts] = useState<ClubParticipantCount[]>([]);
  const [availableClubs, setAvailableClubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupingModal, setShowGroupingModal] = useState(false);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [minParticipants, setMinParticipants] = useState(4);

  // Load club participant counts
  useEffect(() => {
    loadClubParticipantCounts();
  }, [tournamentId]);

  const loadClubParticipantCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch available clubs
      const clubsResponse = await getAllClubs();
      setAvailableClubs(clubsResponse.data || []);
      
      // Fetch club participant counts
      const response = await fetch(`/api/tournaments/${tournamentId}/club-participants`);
      if (!response.ok) {
        throw new Error('Failed to fetch club participants');
      }
      const data = await response.json();
      setClubParticipantCounts(data);
      
      // Load existing club groups
      const groupsResponse = await fetch(`/api/tournaments/${tournamentId}/club-groups`);
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setClubGroups(groupsData);
      }
    } catch (error) {
      console.error('Error loading club participant counts:', error);
      toast.error('Failed to load club participant data');
    } finally {
      setLoading(false);
    }
  };

  const createClubGroup = async (groupName: string, clubs: string[], minParticipants: number) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/club-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_name: groupName,
          participating_clubs: clubs,
          min_participants: minParticipants
        }),
      });

      if (response.ok) {
        const newGroup = await response.json();
        setClubGroups([...clubGroups, newGroup]);
        toast.success(`Created group "${groupName}" with ${clubs.length} clubs`);
        setShowGroupingModal(false);
        setSelectedClubs([]);
        setNewGroupName('');
      } else {
        throw new Error('Failed to create club group');
      }
    } catch (error) {
      console.error('Error creating club group:', error);
      toast.error('Failed to create club group');
    }
  };

  const autoGroupSmallClubs = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/auto-group-clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ minParticipants }),
      });

      if (!response.ok) {
        throw new Error('Failed to auto-group clubs');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Refresh data
      loadClubParticipantCounts();
    } catch (error) {
      console.error('Error auto-grouping clubs:', error);
      toast.error('Failed to auto-group clubs');
    }
  };

  const generateMatches = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/generate-matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate matches');
      }

      const result = await response.json();
      toast.success(result.message);
    } catch (error) {
      console.error('Error generating matches:', error);
      toast.error('Failed to generate matches');
    }
  };

  const determineClubChampions = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/determine-champions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        onChampionshipComplete(result.champions);
        toast.success(result.message);
      } else {
        throw new Error('Failed to determine club champions');
      }
    } catch (error) {
      console.error('Error determining club champions:', error);
      toast.error('Failed to determine club champions');
    }
  };

  const calculateTiebreakerPoints = (matches: MatchResult[], playerId: number): number => {
    return matches
      .filter(match => match.player1_id === playerId || match.player2_id === playerId)
      .reduce((total, match) => {
        if (match.player1_id === playerId) {
          return total + match.player1_holes_won;
        } else {
          return total + match.player2_holes_won;
        }
      }, 0);
  };

  const handleClubSelection = (club: string) => {
    setSelectedClubs(prev => 
      prev.includes(club) 
        ? prev.filter(c => c !== club)
        : [...prev, club]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Trophy className="w-6 h-6 text-brand-neon-green mr-2" />
          <h3 className="text-xl font-bold text-brand-black">Club Championship Management</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowGroupingModal(true)}
            className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </button>
          <button
            onClick={autoGroupSmallClubs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Settings className="w-4 h-4 mr-2" />
            Auto-Group Small Clubs
          </button>
        </div>
      </div>

      {/* Club Participant Counts */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h4 className="text-lg font-semibold text-brand-black mb-4">Club Participant Counts</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubParticipantCounts.map((club, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                club.participant_count >= minParticipants
                  ? 'border-green-200 bg-green-50'
                  : 'border-yellow-200 bg-yellow-50'
              }`}
              onClick={() => handleClubSelection(club.club)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-brand-black">{club.club}</h5>
                  <p className="text-sm text-neutral-600">
                    {club.participant_count} participants
                  </p>
                </div>
                <div className="flex items-center">
                  {club.participant_count >= minParticipants ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Club Groups */}
      {clubGroups.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h4 className="text-lg font-semibold text-brand-black mb-4">Championship Groups</h4>
          <div className="space-y-4">
            {clubGroups.map((group, index) => (
              <div key={index} className="p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-brand-black">{group.group_name}</h5>
                  <span className="text-sm text-neutral-600">
                    {group.participating_clubs.length} clubs
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.participating_clubs.map((club, clubIndex) => (
                    <span
                      key={clubIndex}
                      className="px-2 py-1 bg-brand-neon-green text-brand-black rounded-full text-xs font-medium"
                    >
                      {club}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tiebreaker Information */}
      <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
        <div className="flex items-center mb-3">
          <Trophy className="w-5 h-5 text-yellow-600 mr-2" />
          <h4 className="text-lg font-semibold text-yellow-900">Tiebreaker System</h4>
        </div>
        <div className="text-sm text-yellow-800 space-y-2">
          <p><strong>Primary:</strong> Match play record (wins, losses, ties)</p>
          <p><strong>Tiebreaker:</strong> Cumulative holes won across all matches</p>
          <p><strong>Example:</strong> Player beats opponent "3up with 2 to play" = 3 tiebreaker points</p>
          <p><strong>Ranking:</strong> 1st by match record, then by total tiebreaker points</p>
        </div>
      </div>

      {/* Admin Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={generateMatches}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
        >
          <Settings className="w-5 h-5 mr-2" />
          Generate Matches
        </button>
        
        <button
          onClick={determineClubChampions}
          className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
        >
          <Crown className="w-5 h-5 mr-2" />
          Determine Champions
        </button>
      </div>

      {/* Grouping Modal */}
      {showGroupingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">Create Club Group</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  placeholder="e.g., Regional Group A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Select Clubs
                </label>
                <div className="max-h-40 overflow-y-auto border border-neutral-300 rounded-lg p-2">
                  {availableClubs.map((club, index) => {
                    const participantCount = clubParticipantCounts.find(c => c.club === club)?.participant_count || 0;
                    return (
                      <label key={index} className="flex items-center p-2 hover:bg-neutral-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClubs.includes(club)}
                          onChange={() => handleClubSelection(club)}
                          className="w-4 h-4 text-brand-neon-green border-neutral-300 rounded focus:ring-brand-neon-green focus:ring-2"
                        />
                        <span className="ml-2 text-sm text-neutral-700">
                          {club} ({participantCount} participants)
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Minimum Participants
                </label>
                <input
                  type="number"
                  min="1"
                  value={minParticipants}
                  onChange={e => setMinParticipants(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGroupingModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createClubGroup(newGroupName, selectedClubs, minParticipants)}
                disabled={!newGroupName || selectedClubs.length === 0}
                className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubChampionshipManager;
