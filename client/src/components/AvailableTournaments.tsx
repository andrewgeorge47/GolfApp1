import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, Users, DollarSign, UserPlus, Clock, Search } from 'lucide-react';
import { getAvailableTournaments, registerUserForTournament, unregisterUserFromTournament, getUserTournaments } from '../services/api';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

interface Tournament {
  id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string;
  max_participants?: number;
  min_participants?: number;
  tournament_format?: string;
  status?: string;
  registration_open?: boolean;
  entry_fee?: number;
  location?: string;
  course?: string;
  rules?: string;
  notes?: string;
  type: string;
  club_restriction?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

const AvailableTournaments: React.FC = () => {
  const { user } = useAuth();
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState<string>('all');

  // Get user's registered tournament IDs for comparison
  const userTournamentIds = new Set(userTournaments.map(t => t.id));

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const [availableRes, userRes] = await Promise.all([
          getAvailableTournaments(),
          getUserTournaments(user?.member_id || 0)
        ]);
        
        setAvailableTournaments(availableRes.data);
        setUserTournaments(userRes.data);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        toast.error('Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };

    if (user?.member_id) {
      fetchTournaments();
    }
  }, [user?.member_id]);

  const handleRegister = async (tournamentId: number) => {
    if (!user?.member_id) {
      toast.error('You must be logged in to register for tournaments');
      return;
    }

    try {
      await registerUserForTournament(tournamentId, user.member_id);
      toast.success('Successfully registered for tournament!');
      
      // Refresh user tournaments
      const userRes = await getUserTournaments(user.member_id);
      setUserTournaments(userRes.data);
    } catch (error: any) {
      console.error('Error registering for tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to register for tournament');
    }
  };

  const handleUnregister = async (tournamentId: number) => {
    if (!user?.member_id) {
      toast.error('You must be logged in to unregister from tournaments');
      return;
    }

    try {
      await unregisterUserFromTournament(tournamentId, user.member_id);
      toast.success('Successfully unregistered from tournament!');
      
      // Refresh user tournaments
      const userRes = await getUserTournaments(user.member_id);
      setUserTournaments(userRes.data);
    } catch (error: any) {
      console.error('Error unregistering from tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to unregister from tournament');
    }
  };

  const isUserRegistered = (tournamentId: number) => {
    return userTournamentIds.has(tournamentId);
  };

  const filteredTournaments = availableTournaments.filter(tournament => {
    // Only show tournaments with registration open
    if (!tournament.registration_open) {
      return false;
    }

    // Search filter
    const matchesSearch = !searchTerm || 
      tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tournament.location?.toLowerCase().includes(searchTerm.toLowerCase());

    // Format filter
    const matchesFormat = filterFormat === 'all' || tournament.tournament_format === filterFormat;

    return matchesSearch && matchesFormat;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getFormatDisplayName = (format: string) => {
    switch (format) {
      case 'match_play': return 'Match Play';
      case 'par3_match_play': return '3 Hole Matchplay';
      case 'stroke_play': return 'Stroke Play';
      case 'scramble': return 'Scramble';
      case 'best_ball': return 'Best Ball';
      case 'stableford': return 'Stableford';
      default: return format;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-black flex items-center">
            <Trophy className="w-6 h-6 mr-3" />
            Available Tournaments
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Register for tournaments that are open for participation
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
          >
            <option value="all">All Formats</option>
            <option value="match_play">Match Play</option>
            <option value="par3_match_play">3 Hole Matchplay</option>
            <option value="stroke_play">Stroke Play</option>
            <option value="scramble">Scramble</option>
            <option value="best_ball">Best Ball</option>
            <option value="stableford">Stableford</option>
          </select>
        </div>
      </div>

      {/* Tournaments Grid */}
      {filteredTournaments.length === 0 ? (
        <div className="text-center py-12 text-neutral-600">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
          <p className="text-lg font-medium mb-2">
            {searchTerm || filterFormat !== 'all' ? 'No tournaments match your search' : 'No tournaments available'}
          </p>
          <p className="text-sm text-neutral-500">
            {searchTerm || filterFormat !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Check back later for new tournaments'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTournaments.map((tournament) => (
            <div key={tournament.id} className={`p-4 bg-white border rounded-lg shadow-sm transition-all group ${
              isUserRegistered(tournament.id) 
                ? 'border-green-300 bg-green-50/30' 
                : 'border-neutral-200 hover:border-brand-neon-green'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <h3 className="font-semibold text-brand-black group-hover:text-brand-neon-green transition-colors">
                    {tournament.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status || 'draft')}`}>
                    {tournament.status || 'draft'}
                  </span>
                </div>
              </div>
              
              {tournament.description && (
                <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                  {tournament.description}
                </p>
              )}
              
              <div className="text-sm text-neutral-600 mb-2">
                {getFormatDisplayName(tournament.tournament_format || 'match_play')} • {tournament.type || 'tournament'}
              </div>
              
              {tournament.start_date && (
                <div className="text-xs text-neutral-500 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  {new Date(tournament.start_date).toLocaleDateString()}
                  {tournament.end_date && tournament.end_date !== tournament.start_date && (
                    <> - {new Date(tournament.end_date).toLocaleDateString()}</>
                  )}
                </div>
              )}
              
              {tournament.location && (
                <div className="text-xs text-neutral-500 mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  {tournament.location}
                </div>
              )}
              
              {tournament.entry_fee && tournament.entry_fee > 0 && (
                <div className="text-xs text-neutral-500 mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1" />
                  ${tournament.entry_fee} entry fee
                </div>
              )}
              
              {tournament.registration_deadline && (
                <div className="text-xs text-neutral-500 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Registration deadline: {new Date(tournament.registration_deadline).toLocaleDateString()}
                </div>
              )}
              
              {tournament.max_participants && (
                <div className="text-xs text-neutral-500 mb-3">
                  <Users className="inline w-4 h-4 mr-1" />
                  Max {tournament.max_participants} participants
                </div>
              )}
              
              <div className="mt-4 space-y-2">
                {isUserRegistered(tournament.id) ? (
                  <>
                    <div className="flex items-center justify-center px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      ✓ Registered
                    </div>
                    <button
                      onClick={() => handleUnregister(tournament.id)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 mr-2 rotate-45" />
                      Unregister
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRegister(tournament.id)}
                    className="w-full flex items-center justify-center px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors shadow-sm hover:shadow-md"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableTournaments; 