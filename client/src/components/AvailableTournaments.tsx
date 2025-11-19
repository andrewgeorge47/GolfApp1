import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, Users, DollarSign, UserPlus, Clock, Search, Eye, ChevronDown, ChevronUp, FileText, Info, Share2 } from 'lucide-react';
import { getAvailableTournaments, registerUserForTournament, registerUserForTournamentWithForm, unregisterUserFromTournament, getUserTournaments, submitPayment, getPaymentStatus, getUserCheckInStatuses } from '../services/api';
import { useAuth } from '../AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import TournamentModal from './TournamentModal';
import { PageContainer, PageHeader, PageContent } from './ui/PageContainer';

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
  has_registration_form?: boolean;
  registration_form_template?: string;
  registration_form_data?: any;
  payment_organizer?: 'jeff' | 'adam' | 'other';
  payment_organizer_name?: string;
  payment_venmo_url?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

const AvailableTournaments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  
  // Modal state
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Get user's registered tournament IDs for comparison
  const userTournamentIds = new Set(userTournaments.map(t => t.id));

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const [availableRes, userRes, checkInStatusesRes] = await Promise.all([
          getAvailableTournaments(),
          getUserTournaments(user?.member_id || 0),
          getUserCheckInStatuses(user?.member_id || 0)
        ]);
        
        setAvailableTournaments(availableRes.data);
        setUserTournaments(userRes.data);
        
        // Handle direct tournament link
        const tournamentId = searchParams.get('tournament');
        if (tournamentId) {
          const tournament = availableRes.data.find((t: Tournament) => t.id === parseInt(tournamentId));
          if (tournament) {
            // Open the modal for the specific tournament
            setSelectedTournamentId(parseInt(tournamentId));
            setShowModal(true);
            // Clear the URL parameter
            setSearchParams({});
          }
        }
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        toast.error('Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [user?.member_id, searchParams, setSearchParams]);

  const handleTournamentClick = (tournamentId: number) => {
    setSelectedTournamentId(tournamentId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTournamentId(null);
  };

  const handleModalClose = () => {
    handleCloseModal();
    // Refresh tournament data when modal closes
    const fetchTournaments = async () => {
      try {
        const [availableRes, userRes] = await Promise.all([
          getAvailableTournaments(),
          getUserTournaments(user?.member_id || 0)
        ]);
        setAvailableTournaments(availableRes.data);
        setUserTournaments(userRes.data);
      } catch (err) {
        console.error('Error refreshing tournaments:', err);
      }
    };
    fetchTournaments();
  };

  const filteredTournaments = availableTournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.course?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFormat = filterFormat === 'all' || tournament.tournament_format === filterFormat;
    
    return matchesSearch && matchesFormat;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'open':
        return 'text-green-600';
      case 'draft':
        return 'text-gray-600';
      case 'closed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getFormatDisplayName = (format: string) => {
    switch (format) {
      case 'match_play':
        return 'Match Play';
      case 'stroke_play':
        return 'Stroke Play';
      case 'team_match_play':
        return 'Team Match Play';
      case 'team_stroke_play':
        return 'Team Stroke Play';
      default:
        return format?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isUserRegistered = (tournamentId: number) => {
    return userTournamentIds.has(tournamentId);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading tournaments...</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Available Tournaments"
        subtitle="Register for upcoming tournaments and events"
        icon={<Trophy className="w-7 h-7 text-brand-neon-green" />}
        action={
          !user ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <Info className="w-4 h-4 inline mr-1" />
                Please log in to register
              </p>
            </div>
          ) : undefined
        }
      />

      <PageContent>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="sm:w-48">
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
          >
            <option value="all">All Formats</option>
            <option value="match_play">Match Play</option>
            <option value="stroke_play">Stroke Play</option>
            <option value="team_match_play">Team Match Play</option>
            <option value="team_stroke_play">Team Stroke Play</option>
          </select>
        </div>
      </div>

      {/* Tournaments Grid */}
      {filteredTournaments.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments found</h3>
          <p className="text-gray-600">
            {searchTerm || filterFormat !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Check back later for new tournaments'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
              onClick={() => handleTournamentClick(tournament.id)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{tournament.name}</h3>
                    <div className="flex items-center space-x-2">
                      {tournament.status && (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                          {tournament.status}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {getFormatDisplayName(tournament.tournament_format || '')}
                      </span>
                    </div>
                  </div>
                  <Trophy className="w-6 h-6 text-brand-neon-green flex-shrink-0" />
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(tournament.start_date || '')}</span>
                  </div>
                  
                  {tournament.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{tournament.location}</span>
                    </div>
                  )}
                  
                  {tournament.course && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{tournament.course}</span>
                    </div>
                  )}
                  
                  {tournament.entry_fee && tournament.entry_fee > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span>${tournament.entry_fee} entry fee</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {tournament.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                {/* Registration Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isUserRegistered(tournament.id) ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <UserPlus className="w-3 h-3 mr-1" />
                        Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <Users className="w-3 h-3 mr-1" />
                        Available
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTournamentClick(tournament.id);
                    }}
                    className="text-brand-neon-green hover:text-brand-dark-green text-sm font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tournament Modal */}
      {showModal && selectedTournamentId && (
        <TournamentModal
          tournamentId={selectedTournamentId}
          onClose={handleModalClose}
        />
      )}
      </PageContent>
    </PageContainer>
  );
};

export default AvailableTournaments; 