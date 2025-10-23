import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Users, Target, Award, ChevronRight, RefreshCw, Zap, MapPin } from 'lucide-react';
import api from '../services/api';

interface BracketPlayer {
  user_id: number;
  first_name: string;
  last_name: string;
  club: string;
  group_name: string;
  position: number;
  match_wins: number;
  match_losses: number;
  match_ties: number;
  total_matches: number;
  tiebreaker_points: number;
  total_holes_won: number;
  total_holes_lost: number;
  net_holes: number;
}

interface BracketMatch {
  id: string;
  round: number;
  match_number: number;
  player1?: BracketPlayer;
  player2?: BracketPlayer;
  winner?: BracketPlayer;
  division: 'east' | 'west';
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

interface NationalChampionshipBracketProps {
  tournamentId: number;
  standings: GroupStanding[];
}

const NationalChampionshipBracket: React.FC<NationalChampionshipBracketProps> = ({
  tournamentId,
  standings
}) => {
  const [qualifiedPlayers, setQualifiedPlayers] = useState<BracketPlayer[]>([]);
  const [bracket, setBracket] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine qualified players based on standings
  const determineQualifiedPlayers = () => {
    const qualified: BracketPlayer[] = [];
    
    // Get the highest ranked player from each group (group champions)
    standings.forEach(group => {
      if (group.participants.length > 0) {
        const groupChampion = group.participants[0]; // First player is highest ranked
        qualified.push({
          user_id: groupChampion.user_id,
          first_name: groupChampion.first_name,
          last_name: groupChampion.last_name,
          club: groupChampion.club,
          group_name: group.group_name,
          position: 1,
          match_wins: groupChampion.match_wins,
          match_losses: groupChampion.match_losses,
          match_ties: groupChampion.match_ties,
          total_matches: groupChampion.total_matches,
          tiebreaker_points: groupChampion.tiebreaker_points,
          total_holes_won: groupChampion.total_holes_won,
          total_holes_lost: groupChampion.total_holes_lost,
          net_holes: groupChampion.net_holes
        });
      }
    });

    // Get all remaining players (excluding group champions) and sort by overall ranking
    const remainingPlayers: BracketPlayer[] = [];
    standings.forEach(group => {
      group.participants.slice(1).forEach((participant, index) => {
        remainingPlayers.push({
          user_id: participant.user_id,
          first_name: participant.first_name,
          last_name: participant.last_name,
          club: participant.club,
          group_name: group.group_name,
          position: index + 2,
          match_wins: participant.match_wins,
          match_losses: participant.match_losses,
          match_ties: participant.match_ties,
          total_matches: participant.total_matches,
          tiebreaker_points: participant.tiebreaker_points,
          total_holes_won: participant.total_holes_won,
          total_holes_lost: participant.total_holes_lost,
          net_holes: participant.net_holes
        });
      });
    });

    // Sort remaining players by wins, then tiebreaker points, then net holes
    remainingPlayers.sort((a, b) => {
      if (b.match_wins !== a.match_wins) {
        return b.match_wins - a.match_wins;
      }
      if (b.tiebreaker_points !== a.tiebreaker_points) {
        return b.tiebreaker_points - a.tiebreaker_points;
      }
      return b.net_holes - a.net_holes;
    });

    // Add top remaining players to fill 8 total spots
    const spotsNeeded = 8 - qualified.length;
    const topRemaining = remainingPlayers.slice(0, spotsNeeded);
    qualified.push(...topRemaining);

    return qualified.slice(0, 8); // Ensure exactly 8 players
  };

  // Generate bracket structure
  const generateBracket = (players: BracketPlayer[]) => {
    if (players.length !== 8) return [];

    // Split into East and West divisions (4 players each)
    const eastPlayers = players.slice(0, 4);
    const westPlayers = players.slice(4, 8);

    const matches: BracketMatch[] = [];

    // East Division - Quarterfinals
    matches.push({
      id: 'east-qf-1',
      round: 1,
      match_number: 1,
      player1: eastPlayers[0],
      player2: eastPlayers[3],
      division: 'east'
    });
    matches.push({
      id: 'east-qf-2',
      round: 1,
      match_number: 2,
      player1: eastPlayers[1],
      player2: eastPlayers[2],
      division: 'east'
    });

    // West Division - Quarterfinals
    matches.push({
      id: 'west-qf-1',
      round: 1,
      match_number: 3,
      player1: westPlayers[0],
      player2: westPlayers[3],
      division: 'west'
    });
    matches.push({
      id: 'west-qf-2',
      round: 1,
      match_number: 4,
      player1: westPlayers[1],
      player2: westPlayers[2],
      division: 'west'
    });

    // East Division - Semifinals
    matches.push({
      id: 'east-sf-1',
      round: 2,
      match_number: 5,
      division: 'east'
    });

    // West Division - Semifinals
    matches.push({
      id: 'west-sf-1',
      round: 2,
      match_number: 6,
      division: 'west'
    });

    // Championship Final
    matches.push({
      id: 'championship',
      round: 3,
      match_number: 7,
      division: 'east' // Will be updated to show it's the final
    });

    return matches;
  };

  useEffect(() => {
    const qualified = determineQualifiedPlayers();
    setQualifiedPlayers(qualified);
    setBracket(generateBracket(qualified));
    setLoading(false);
  }, [standings]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="text-xs font-semibold text-gray-500">{position}</span>;
    }
  };

  const getDivisionColor = (division: 'east' | 'west') => {
    return division === 'east' ? 'text-blue-600' : 'text-red-600';
  };

  const getDivisionBgColor = (division: 'east' | 'west') => {
    return division === 'east' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
          <span className="ml-3 text-gray-600">Loading bracket...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Error Loading Bracket</h4>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bracket Visualization */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Trophy className="w-6 h-6 text-brand-neon-green" />
          <h3 className="text-xl font-semibold text-gray-900">National Championship Bracket</h3>
        </div>

        {/* Bracket Layout */}
        <div className="overflow-x-auto">
          {/* Desktop Layout */}
          <div className="hidden lg:flex min-w-max space-x-8 py-4">
            {/* Quarterfinals */}
            <div className="flex flex-col space-y-8">
              <div className="text-center">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Quarterfinals</h4>
              </div>
              
              {/* East Quarterfinals */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    <MapPin className="w-3 h-3" />
                    <span>East</span>
                  </div>
                </div>
                
                {bracket.filter(m => m.round === 1 && m.division === 'east').map((match, index) => (
                  <div key={match.id} className="w-64">
                    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="text-xs font-medium text-gray-600 text-center">
                          Match {match.match_number}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-3 py-3 hover:bg-gray-50">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : 'TBD'}
                          </div>
                          {match.player1 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player1.club}
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-3 hover:bg-gray-50">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : 'TBD'}
                          </div>
                          {match.player2 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player2.club}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* West Quarterfinals */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    <MapPin className="w-3 h-3" />
                    <span>West</span>
                  </div>
                </div>
                
                {bracket.filter(m => m.round === 1 && m.division === 'west').map((match, index) => (
                  <div key={match.id} className="w-64">
                    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="text-xs font-medium text-gray-600 text-center">
                          Match {match.match_number}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-3 py-3 hover:bg-gray-50">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : 'TBD'}
                          </div>
                          {match.player1 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player1.club}
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-3 hover:bg-gray-50">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : 'TBD'}
                          </div>
                          {match.player2 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player2.club}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semifinals */}
            <div className="flex flex-col justify-center space-y-8">
              <div className="text-center">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Semifinals</h4>
              </div>
              
              {/* East Semifinal */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    <MapPin className="w-3 h-3" />
                    <span>East Final</span>
                  </div>
                </div>
                
                {bracket.filter(m => m.round === 2 && m.division === 'east').map((match) => (
                  <div key={match.id} className="w-64">
                    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="text-xs font-medium text-gray-600 text-center">
                          East Semifinal
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-3 py-3">
                          <div className="font-medium text-gray-500 text-center">
                            Winner of East QF1
                          </div>
                        </div>
                        <div className="px-3 py-3">
                          <div className="font-medium text-gray-500 text-center">
                            Winner of East QF2
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* West Semifinal */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    <MapPin className="w-3 h-3" />
                    <span>West Final</span>
                  </div>
                </div>
                
                {bracket.filter(m => m.round === 2 && m.division === 'west').map((match) => (
                  <div key={match.id} className="w-64">
                    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="text-xs font-medium text-gray-600 text-center">
                          West Semifinal
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-3 py-3">
                          <div className="font-medium text-gray-500 text-center">
                            Winner of West QF1
                          </div>
                        </div>
                        <div className="px-3 py-3">
                          <div className="font-medium text-gray-500 text-center">
                            Winner of West QF2
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Championship Final */}
            <div className="flex flex-col justify-center">
              <div className="text-center">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Championship</h4>
              </div>
              
              {bracket.filter(m => m.round === 3).map((match) => (
                <div key={match.id} className="w-64">
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-yellow-200 border-b border-yellow-300">
                      <div className="text-xs font-medium text-yellow-800 text-center flex items-center justify-center space-x-1">
                        <Trophy className="w-3 h-3" />
                        <span>National Championship</span>
                      </div>
                    </div>
                    <div className="divide-y divide-yellow-200">
                      <div className="px-3 py-4">
                        <div className="font-medium text-gray-700 text-center">
                          East Division Champion
                        </div>
                      </div>
                      <div className="px-3 py-4">
                        <div className="font-medium text-gray-700 text-center">
                          West Division Champion
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-6">
            {/* Quarterfinals - Mobile */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">Quarterfinals</h4>
              
              {/* East Quarterfinals - Mobile */}
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    <MapPin className="w-4 h-4" />
                    <span>East Division</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bracket.filter(m => m.round === 1 && m.division === 'east').map((match) => (
                    <div key={match.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-600 text-center">
                          Match {match.match_number}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : 'TBD'}
                          </div>
                          {match.player1 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player1.club}
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : 'TBD'}
                          </div>
                          {match.player2 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player2.club}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* West Quarterfinals - Mobile */}
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    <MapPin className="w-4 h-4" />
                    <span>West Division</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bracket.filter(m => m.round === 1 && m.division === 'west').map((match) => (
                    <div key={match.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-600 text-center">
                          Match {match.match_number}
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player1 ? `${match.player1.first_name} ${match.player1.last_name}` : 'TBD'}
                          </div>
                          {match.player1 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player1.club}
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-900 text-center">
                            {match.player2 ? `${match.player2.first_name} ${match.player2.last_name}` : 'TBD'}
                          </div>
                          {match.player2 && (
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {match.player2.club}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Semifinals - Mobile */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">Semifinals</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* East Semifinal - Mobile */}
                <div>
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <MapPin className="w-3 h-3" />
                      <span>East Final</span>
                    </div>
                  </div>
                  
                  {bracket.filter(m => m.round === 2 && m.division === 'east').map((match) => (
                    <div key={match.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-600 text-center">
                          East Semifinal
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-500 text-center text-sm">
                            Winner of East QF1
                          </div>
                        </div>
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-500 text-center text-sm">
                            Winner of East QF2
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* West Semifinal - Mobile */}
                <div>
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      <MapPin className="w-3 h-3" />
                      <span>West Final</span>
                    </div>
                  </div>
                  
                  {bracket.filter(m => m.round === 2 && m.division === 'west').map((match) => (
                    <div key={match.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-600 text-center">
                          West Semifinal
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-500 text-center text-sm">
                            Winner of West QF1
                          </div>
                        </div>
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-500 text-center text-sm">
                            Winner of West QF2
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Championship Final - Mobile */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">Championship</h4>
              
              <div className="flex justify-center">
                {bracket.filter(m => m.round === 3).map((match) => (
                  <div key={match.id} className="w-full max-w-sm">
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-yellow-200 border-b border-yellow-300">
                        <div className="text-sm font-medium text-yellow-800 text-center flex items-center justify-center space-x-2">
                          <Trophy className="w-4 h-4" />
                          <span>National Championship</span>
                        </div>
                      </div>
                      <div className="divide-y divide-yellow-200">
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-700 text-center">
                            East Division Champion
                          </div>
                        </div>
                        <div className="px-4 py-4">
                          <div className="font-medium text-gray-700 text-center">
                            West Division Champion
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NationalChampionshipBracket;
