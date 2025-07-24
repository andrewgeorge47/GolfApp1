import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, Users, DollarSign, UserPlus, Clock, Search, Eye, ChevronDown, ChevronUp, FileText, Info } from 'lucide-react';
import { getAvailableTournaments, registerUserForTournament, registerUserForTournamentWithForm, unregisterUserFromTournament, getUserTournaments, submitPayment, getPaymentStatus, getUserCheckInStatuses } from '../services/api';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
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
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [expandedTournaments, setExpandedTournaments] = useState<Set<number>>(new Set());
  
  // Registration form state
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrationFormData, setRegistrationFormData] = useState<any>({});
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTournamentForPayment, setSelectedTournamentForPayment] = useState<Tournament | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [userPaymentStatuses, setUserPaymentStatuses] = useState<{[key: number]: boolean}>({});
  const [serverCheckInStatuses, setServerCheckInStatuses] = useState<any[]>([]);

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
        setServerCheckInStatuses(checkInStatusesRes.data);
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

  // Refresh payment statuses when the page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.member_id) {
        refreshCheckInStatuses();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.member_id]);

  const handleRegister = async (tournamentId: number) => {
    if (!user?.member_id) {
      toast.error('You must be logged in to register for tournaments');
      return;
    }

    // Find the tournament
    const tournament = availableTournaments.find(t => t.id === tournamentId);
    if (!tournament) {
      toast.error('Tournament not found');
      return;
    }

    // Check if tournament has a registration form
    if (tournament.has_registration_form && tournament.registration_form_data) {
      // Show registration form modal
      setSelectedTournament(tournament);
      setRegistrationFormData({});
      setShowRegistrationForm(true);
    } else {
      // Direct registration without form
      await performRegistration(tournamentId);
    }
  };

  const performRegistration = async (tournamentId: number) => {
    if (!user?.member_id) return;

    try {
      await registerUserForTournament(tournamentId, user.member_id);
      toast.success('Successfully registered for tournament!');
      
      // Refresh user tournaments and check-in statuses
      const [userRes] = await Promise.all([
        getUserTournaments(user.member_id),
        refreshCheckInStatuses()
      ]);
      setUserTournaments(userRes.data);
    } catch (error: any) {
      console.error('Error registering for tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to register for tournament');
    }
  };

  const handleRegistrationFormSubmit = async () => {
    if (!selectedTournament || !user?.member_id) return;

    // Validate required form fields
    const validationErrors = validateRegistrationForm();
    if (validationErrors.length > 0) {
      toast.error(`Please complete all required fields: ${validationErrors.join(', ')}`);
      return;
    }

    setIsSubmittingRegistration(true);
    try {
      // Register user with form data
      await registerUserForTournamentWithForm(selectedTournament.id, user.member_id, registrationFormData);
      
      toast.success('Successfully registered for tournament!');
      setShowRegistrationForm(false);
      setSelectedTournament(null);
      setRegistrationFormData({});
      
      // Refresh user tournaments and check-in statuses
      const [userRes] = await Promise.all([
        getUserTournaments(user.member_id),
        refreshCheckInStatuses()
      ]);
      setUserTournaments(userRes.data);
    } catch (error: any) {
      console.error('Error registering for tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to register for tournament');
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  // Validate registration form - check that all required questions are answered
  const validateRegistrationForm = () => {
    if (!selectedTournament?.registration_form_data?.questions) return [];

    const errors: string[] = [];
    
    selectedTournament.registration_form_data.questions.forEach((question: any) => {
      if (question.required) {
        const answer = registrationFormData[question.id];
        
        if (question.type === 'radio') {
          if (!answer || answer.trim() === '') {
            errors.push(question.question);
          }
        } else if (question.type === 'checkbox') {
          if (!answer || !Array.isArray(answer) || answer.length === 0) {
            errors.push(question.question);
          }
        }
      }
    });
    
    return errors;
  };

  // Check if form is valid for enabling/disabling submit button
  const isFormValid = () => {
    return validateRegistrationForm().length === 0;
  };

  // Check if a specific question is answered (for styling)
  const isQuestionAnswered = (questionId: string) => {
    const answer = registrationFormData[questionId];
    if (!answer) return false;
    
    // For radio buttons, check if there's a value
    if (typeof answer === 'string') {
      return answer.trim() !== '';
    }
    
    // For checkboxes, check if there are selected options
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    
    return false;
  };

  const refreshCheckInStatuses = async () => {
    if (!user?.member_id) return;
    
    try {
      const checkInStatusesRes = await getUserCheckInStatuses(user.member_id);
      setServerCheckInStatuses(checkInStatusesRes.data);
    } catch (error) {
      console.error('Error refreshing check-in statuses:', error);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedTournamentForPayment || !user?.member_id) return;

    setIsSubmittingPayment(true);
    try {
      await submitPayment(selectedTournamentForPayment.id, user.member_id, {
        payment_method: 'venmo',
        payment_amount: paymentAmount,
        payment_notes: paymentNotes
      });
      
      toast.success('Payment submitted successfully! Tournament admin will verify your payment.');
      setShowPaymentModal(false);
      setSelectedTournamentForPayment(null);
      setPaymentAmount(0);
      setPaymentNotes('');
      
      // Refresh check-in statuses from server
      await refreshCheckInStatuses();
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      toast.error(error.response?.data?.error || 'Failed to submit payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePaymentClick = (tournament: Tournament) => {
    setSelectedTournamentForPayment(tournament);
    setPaymentAmount(tournament.entry_fee || 0);
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const isPaymentSubmitted = (tournamentId: number) => {
    // Check server check-in statuses first
    const serverStatus = serverCheckInStatuses.find(status => status.tournament_id === tournamentId);
    if (serverStatus) {
      return serverStatus.check_in_status === 'checked_in';
    }
    // Fallback to local state
    return userPaymentStatuses[tournamentId] || false;
  };

  const handleUnregister = async (tournamentId: number) => {
    if (!user?.member_id) {
      toast.error('You must be logged in to unregister from tournaments');
      return;
    }

    try {
      await unregisterUserFromTournament(tournamentId, user.member_id);
      toast.success('Successfully unregistered from tournament!');
      
      // Refresh user tournaments and check-in statuses
      const [userRes] = await Promise.all([
        getUserTournaments(user.member_id),
        refreshCheckInStatuses()
      ]);
      setUserTournaments(userRes.data);
    } catch (error: any) {
      console.error('Error unregistering from tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to unregister from tournament');
    }
  };

  const isUserRegistered = (tournamentId: number) => {
    return userTournamentIds.has(tournamentId);
  };

  const handleViewLeaderboard = (tournamentId: number) => {
    navigate(`/leaderboard/tournament/${tournamentId}`);
  };

  const toggleExpanded = (tournamentId: number) => {
    const newExpanded = new Set(expandedTournaments);
    if (newExpanded.has(tournamentId)) {
      newExpanded.delete(tournamentId);
    } else {
      newExpanded.add(tournamentId);
    }
    setExpandedTournaments(newExpanded);
  };

  const isExpanded = (tournamentId: number) => expandedTournaments.has(tournamentId);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                  {isUserRegistered(tournament.id) ? (
                    <div className="flex items-center px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      Registered
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status || 'draft')}`}>
                      {tournament.status || 'draft'}
                    </span>
                  )}
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

              {/* Hint that more details are available */}
              {(tournament.course || tournament.rules || tournament.notes || tournament.club_restriction) && !isExpanded(tournament.id) && (
                <div className="text-xs text-neutral-400 mb-3 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  More details available
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded(tournament.id) && (
                <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
                  {/* Course Information */}
                  {tournament.course && (
                    <div className="text-sm">
                      <div className="font-medium text-neutral-700 mb-1 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        Course
                      </div>
                      <p className="text-neutral-600">{tournament.course}</p>
                    </div>
                  )}

                  {/* Dates and Times */}
                  <div className="text-sm">
                    <div className="font-medium text-neutral-700 mb-1 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Tournament Schedule
                    </div>
                    <div className="space-y-1 text-neutral-600">
                      {tournament.start_date && (
                        <div>Start: {formatDate(tournament.start_date)}</div>
                      )}
                      {tournament.end_date && tournament.end_date !== tournament.start_date && (
                        <div>End: {formatDate(tournament.end_date)}</div>
                      )}
                      {tournament.registration_deadline && (
                        <div>Registration Deadline: {formatDateTime(tournament.registration_deadline)}</div>
                      )}
                    </div>
                  </div>

                  {/* Participant Limits */}
                  {(tournament.min_participants || tournament.max_participants) && (
                    <div className="text-sm">
                      <div className="font-medium text-neutral-700 mb-1 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Participant Limits
                      </div>
                      <div className="space-y-1 text-neutral-600">
                        {tournament.min_participants && (
                          <div>Minimum: {tournament.min_participants} participants</div>
                        )}
                        {tournament.max_participants && (
                          <div>Maximum: {tournament.max_participants} participants</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Entry Fee */}
                  {tournament.entry_fee && tournament.entry_fee > 0 && (
                    <div className="text-sm">
                      <div className="font-medium text-neutral-700 mb-1 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Entry Fee
                      </div>
                      <p className="text-neutral-600">${tournament.entry_fee}</p>
                    </div>
                  )}

                  {/* Club Restrictions */}
                  {tournament.club_restriction && (
                    <div className="text-sm">
                      <div className="font-medium text-neutral-700 mb-1 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Club Restrictions
                      </div>
                      <p className="text-neutral-600">{tournament.club_restriction}</p>
                    </div>
                  )}

                  {/* Rules */}
                  {tournament.rules && (
                    <div className="text-sm">
                      <div className="font-medium text-neutral-700 mb-1 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Tournament Rules
                      </div>
                      <div className="text-neutral-600 whitespace-pre-wrap">{tournament.rules}</div>
                    </div>
                  )}

                  {/* Notes */}
                  {tournament.notes && (
                    <div className="text-sm">
                      <div className="font-medium text-neutral-700 mb-1 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Additional Notes
                      </div>
                      <div className="text-neutral-600 whitespace-pre-wrap">{tournament.notes}</div>
                    </div>
                  )}

                  {/* Tournament Status */}
                  <div className="text-sm">
                    <div className="font-medium text-neutral-700 mb-1">Tournament Status</div>
                    <div className="space-y-1 text-neutral-600">
                      <div>Status: <span className="capitalize">{tournament.status || 'draft'}</span></div>
                      <div>Registration: {tournament.registration_open ? 'Open' : 'Closed'}</div>
                      {tournament.created_at && (
                        <div>Created: {formatDate(tournament.created_at)}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 space-y-2">
                {/* View Details Button */}
                {(tournament.course || tournament.rules || tournament.notes || tournament.club_restriction) && (
                  <button
                    onClick={() => toggleExpanded(tournament.id)}
                    className="w-full flex items-center justify-center px-3 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors"
                  >
                    {isExpanded(tournament.id) ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        View Details
                      </>
                    )}
                  </button>
                )}

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2">
                  {isUserRegistered(tournament.id) ? (
                    <>
                      {tournament.entry_fee && tournament.entry_fee > 0 && !isPaymentSubmitted(tournament.id) ? (
                        <>
                          <button
                            onClick={() => handleUnregister(tournament.id)}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                          >
                            <UserPlus className="w-4 h-4 mr-1 rotate-45" />
                            Unregister
                          </button>
                          <button
                            onClick={() => handlePaymentClick(tournament)}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Pay ${tournament.entry_fee}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleViewLeaderboard(tournament.id)}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Leaderboard
                          </button>
                          <button
                            onClick={() => handleUnregister(tournament.id)}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                          >
                            <UserPlus className="w-4 h-4 mr-1 rotate-45" />
                            Unregister
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleViewLeaderboard(tournament.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Leaderboard
                      </button>
                      <button
                        onClick={() => handleRegister(tournament.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors shadow-sm hover:shadow-md"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Register
                      </button>
                    </>
                  )}
                </div>


              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration Form Modal */}
      {showRegistrationForm && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-brand-black">
                Register for {selectedTournament.name}
              </h3>
              <button
                onClick={() => setShowRegistrationForm(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Tournament Info */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="font-semibold text-brand-black mb-2">Tournament Details</h4>
                <div className="text-sm text-neutral-600 space-y-1">
                  <div>Format: {getFormatDisplayName(selectedTournament.tournament_format || 'match_play')}</div>
                  {selectedTournament.start_date && (
                    <div>Start Date: {formatDate(selectedTournament.start_date)}</div>
                  )}
                  {selectedTournament.entry_fee && selectedTournament.entry_fee > 0 && (
                    <div>Entry Fee: ${selectedTournament.entry_fee}</div>
                  )}
                </div>
              </div>

              {/* Registration Form */}
              {selectedTournament.registration_form_data && (
                <div className={`space-y-4 ${
                  !isFormValid() ? 'border-l-4 border-red-400 pl-4' : ''
                }`}>
                  <h4 className="font-semibold text-brand-black">Registration Form</h4>
                  
                  {selectedTournament.registration_form_data.questions?.map((question: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <label className={`block text-sm font-medium ${
                        question.required && !isQuestionAnswered(question.id) 
                          ? 'text-red-600' 
                          : 'text-neutral-700'
                      }`}>
                        {question.question}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {question.type === 'radio' && (
                        <div className="space-y-2">
                          {question.options.map((option: string, optionIndex: number) => (
                            <label key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`question_${index}`}
                                value={option}
                                onChange={(e) => setRegistrationFormData((prev: any) => ({
                                  ...prev,
                                  [question.id]: e.target.value
                                }))}
                                className="text-brand-neon-green focus:ring-brand-neon-green"
                                required={question.required}
                              />
                              <span className="text-sm text-neutral-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {question.type === 'checkbox' && (
                        <div className="space-y-2">
                          {question.options.map((option: string, optionIndex: number) => (
                            <label key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                value={option}
                                onChange={(e) => {
                                  const currentValues = registrationFormData[question.id] || [];
                                  const newValues = e.target.checked
                                    ? [...currentValues, option]
                                    : currentValues.filter((v: string) => v !== option);
                                  
                                  setRegistrationFormData((prev: any) => ({
                                    ...prev,
                                    [question.id]: newValues
                                  }));
                                }}
                                className="text-brand-neon-green focus:ring-brand-neon-green"
                              />
                              <span className="text-sm text-neutral-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRegistrationForm(false)}
                  className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegistrationFormSubmit}
                  disabled={isSubmittingRegistration || !isFormValid()}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center ${
                    isSubmittingRegistration || !isFormValid()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-brand-neon-green text-brand-black hover:bg-green-400'
                  }`}
                >
                  {isSubmittingRegistration ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
                      Registering...
                    </>
                  ) : !isFormValid() ? (
                    'Complete Required Fields'
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTournamentForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-brand-black">
                Pay ${selectedTournamentForPayment.entry_fee}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Organizer */}
              {selectedTournamentForPayment.payment_organizer && selectedTournamentForPayment.payment_organizer !== 'other' && (
                <div className={`border rounded-lg p-3 ${
                  selectedTournamentForPayment.payment_organizer === 'jeff' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-sm mb-2 ${
                    selectedTournamentForPayment.payment_organizer === 'jeff' 
                      ? 'text-green-700' 
                      : 'text-blue-700'
                  }`}>
                    {selectedTournamentForPayment.payment_organizer === 'jeff' ? 'Jeff Testa' : 'Adam Christopher'}
                  </p>
                  <a 
                    href={selectedTournamentForPayment.payment_organizer === 'jeff' 
                      ? 'https://venmo.com/u/JeffTesta' 
                      : 'https://venmo.com/u/NN_No10'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`inline-flex items-center px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                      selectedTournamentForPayment.payment_organizer === 'jeff' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay on Venmo
                  </a>
                </div>
              )}
              
              {/* Custom Payment Organizer */}
              {selectedTournamentForPayment.payment_organizer === 'other' && selectedTournamentForPayment.payment_organizer_name && (
                <div className="border rounded-lg p-3 bg-purple-50 border-purple-200">
                  <p className="text-sm mb-2 text-purple-700">
                    {selectedTournamentForPayment.payment_organizer_name}
                  </p>
                  {selectedTournamentForPayment.payment_venmo_url && (
                    <a 
                      href={selectedTournamentForPayment.payment_venmo_url}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Pay on Venmo
                    </a>
                  )}
                </div>
              )}

              {/* Payment Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm font-medium mb-1">Payment Instructions:</p>
                <ol className="text-blue-700 text-sm space-y-1">
                  <li>1. Click the Venmo link above</li>
                  <li>2. Send ${selectedTournamentForPayment.entry_fee} to the organizer</li>
                  <li>3. Include your name in the payment note</li>
                  <li>4. The organizer will mark you as paid once they confirm payment</li>
                </ol>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors text-sm"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableTournaments; 