import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, MapPin, Users, DollarSign, UserPlus, Clock, FileText, Info, Share2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getAvailableTournaments, 
  registerUserForTournament, 
  registerUserForTournamentWithForm, 
  unregisterUserFromTournament, 
  getUserTournaments, 
  submitPayment, 
  getPaymentStatus, 
  getUserCheckInStatuses 
} from '../services/api';

interface RegistrationFormQuestion {
  id: string;
  question: string;
  type: 'radio' | 'checkbox' | 'text';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface RegistrationFormTemplate {
  questions: RegistrationFormQuestion[];
}

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
  registration_form_template?: string | RegistrationFormTemplate;
  registration_form_data?: any;
  payment_organizer?: 'jeff' | 'adam' | 'other';
  payment_organizer_name?: string;
  payment_venmo_url?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

interface TournamentModalProps {
  tournamentId?: number;
  onClose: () => void;
}

const TournamentModal: React.FC<TournamentModalProps> = ({ tournamentId, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [serverCheckInStatuses, setServerCheckInStatuses] = useState<any[]>([]);
  const [userPaymentStatuses, setUserPaymentStatuses] = useState<{[key: number]: boolean}>({});
  
  // Registration form state
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationFormData, setRegistrationFormData] = useState<any>({});
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Get user's registered tournament IDs for comparison
  const userTournamentIds = new Set(userTournaments.map(t => t.id));

  // Registration form templates (same as in TournamentForm.tsx)
  const registrationFormTemplates = {
    live_rounds: {
      name: 'Live Rounds',
      description: 'Ask participants about their participation in live rounds and night availability',
      questions: [
        {
          id: 'participation_type',
          type: 'radio' as const,
          question: 'Are you planning to participate in Live rounds this week or will you be playing solo?',
          options: ['Live', 'Solo'],
          required: true
        },
        {
          id: 'night_availability',
          type: 'checkbox' as const,
          question: 'Choose which of the following nights absolutely work for you THIS week.',
          options: [
            'Wednesday (7-10)',
            'Thursday (7-10)',
            'Friday (7-10)',
            'Saturday (7-10)'
          ],
          required: true
        }
      ]
    },
    night_availability: {
      name: 'Night Availability',
      description: 'Simple night availability selection',
      questions: [
        {
          id: 'available_nights',
          type: 'checkbox' as const,
          question: 'Which nights are you available this week?',
          options: [
            'Monday (7-10)',
            'Tuesday (7-10)',
            'Wednesday (7-10)',
            'Thursday (7-10)',
            'Friday (7-10)',
            'Saturday (7-10)',
            'Sunday (7-10)'
          ],
          required: true
        }
      ]
    }
  };

  const getRegistrationFormTemplate = (tournament: Tournament): RegistrationFormTemplate | null => {
    console.log('Getting registration form template for tournament:', tournament.id);
    console.log('has_registration_form:', tournament.has_registration_form);
    console.log('registration_form_template:', tournament.registration_form_template);
    
    if (!tournament.registration_form_template) {
      console.log('No registration form template found');
      return null;
    }
    
    if (typeof tournament.registration_form_template === 'string') {
      const template = tournament.registration_form_template.trim();
      
      // Check if it's a template key (like "live_rounds")
      if (registrationFormTemplates[template as keyof typeof registrationFormTemplates]) {
        console.log('Found predefined template:', template);
        return registrationFormTemplates[template as keyof typeof registrationFormTemplates];
      }
      
      // Check if it's JSON
      if (template.startsWith('{') || template.startsWith('[')) {
        try {
          const parsed = JSON.parse(tournament.registration_form_template);
          console.log('Parsed registration form template:', parsed);
          return parsed;
        } catch (error) {
          console.error('Error parsing registration form template:', error);
          return null;
        }
      }
      
      // If it's neither a template key nor JSON, return null
      console.log('Unknown template format:', template);
      return null;
    }
    
    console.log('Using registration form template as object:', tournament.registration_form_template);
    return tournament.registration_form_template as RegistrationFormTemplate;
  };

  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!tournamentId) return;
      
      setLoading(true);
      try {
        const [availableRes, userRes, checkInStatusesRes] = await Promise.all([
          getAvailableTournaments(),
          getUserTournaments(user?.member_id || 0),
          getUserCheckInStatuses(user?.member_id || 0)
        ]);
        
        const foundTournament = availableRes.data.find((t: Tournament) => t.id === tournamentId);
        if (foundTournament) {
          setTournament(foundTournament);
        } else {
          toast.error('Tournament not found');
          onClose();
        }
        
        setUserTournaments(userRes.data);
        setServerCheckInStatuses(checkInStatusesRes.data);
        
        // Load payment statuses
        const paymentStatuses: {[key: number]: boolean} = {};
        for (const tournament of userRes.data) {
          try {
            const paymentRes = await getPaymentStatus(tournament.id, user?.member_id || 0);
            paymentStatuses[tournament.id] = paymentRes.data.payment_submitted || false;
          } catch (error) {
            paymentStatuses[tournament.id] = false;
          }
        }
        setUserPaymentStatuses(paymentStatuses);
        
      } catch (err) {
        console.error('Error fetching tournament data:', err);
        toast.error('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentData();
  }, [tournamentId, user?.member_id, onClose]);

  const handleRegister = async (tournamentId: number) => {
    if (!user) {
      toast.error('Please log in to register for tournaments');
      return;
    }

    // Check if the current tournament has a registration form
    if (tournament && tournament.has_registration_form) {
      console.log('Tournament has registration form, showing form modal');
      setShowRegistrationForm(true);
    } else {
      console.log('Tournament does not have registration form, performing direct registration');
      await performRegistration(tournamentId);
    }
  };

  const performRegistration = async (tournamentId: number) => {
    try {
      await registerUserForTournament(tournamentId, user?.member_id || 0);
      toast.success('Successfully registered for tournament!');
      
      // Refresh user tournaments
      const userRes = await getUserTournaments(user?.member_id || 0);
      setUserTournaments(userRes.data);
      
      // Refresh tournament data
      const availableRes = await getAvailableTournaments();
      const updatedTournament = availableRes.data.find((t: Tournament) => t.id === tournamentId);
      if (updatedTournament) {
        setTournament(updatedTournament);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.error || 'Failed to register for tournament');
    }
  };

  const handleRegistrationFormSubmit = async () => {
    if (!tournament || !user) return;
    
    setIsSubmittingRegistration(true);
    try {
      await registerUserForTournamentWithForm(tournament.id, user.member_id, registrationFormData);
      toast.success('Successfully registered for tournament!');
      setShowRegistrationForm(false);
      setRegistrationFormData({});
      
      // Refresh data
      const [availableRes, userRes] = await Promise.all([
        getAvailableTournaments(),
        getUserTournaments(user.member_id)
      ]);
      
      const updatedTournament = availableRes.data.find((t: Tournament) => t.id === tournament.id);
      if (updatedTournament) {
        setTournament(updatedTournament);
      }
      setUserTournaments(userRes.data);
      
    } catch (error: any) {
      console.error('Registration form error:', error);
      toast.error(error.response?.data?.error || 'Failed to register for tournament');
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const validateRegistrationForm = () => {
    if (!tournament) return true;
    
    const template = getRegistrationFormTemplate(tournament);
    if (!template) return true;
    
    const questions = template.questions || [];
    
    for (const question of questions) {
      if (question.required) {
        const answer = registrationFormData[question.id];
        
        if (question.type === 'radio') {
          if (!answer || answer.trim() === '') {
            return false;
          }
        } else if (question.type === 'checkbox') {
          if (!answer || !Array.isArray(answer) || answer.length === 0) {
            return false;
          }
        } else if (question.type === 'text') {
          if (!answer || answer.trim() === '') {
            return false;
          }
        }
      }
    }
    return true;
  };

  const isFormValid = () => {
    return validateRegistrationForm();
  };

  const isQuestionAnswered = (questionId: string) => {
    const answer = registrationFormData[questionId];
    if (!answer) return false;
    
    // For radio buttons and text, check if there's a value
    if (typeof answer === 'string') {
      return answer.trim() !== '';
    }
    
    // For checkboxes, check if there are selected options
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    
    return false;
  };

  const handlePaymentClick = (tournament: Tournament) => {
    setShowPaymentModal(true);
  };

  const isPaymentSubmitted = (tournamentId: number) => {
    return userPaymentStatuses[tournamentId] || false;
  };

  const handleUnregister = async (tournamentId: number) => {
    if (!user) return;
    
    try {
      await unregisterUserFromTournament(tournamentId, user.member_id);
      toast.success('Successfully unregistered from tournament');
      
      // Refresh data
      const [availableRes, userRes] = await Promise.all([
        getAvailableTournaments(),
        getUserTournaments(user.member_id)
      ]);
      
      const updatedTournament = availableRes.data.find((t: Tournament) => t.id === tournamentId);
      if (updatedTournament) {
        setTournament(updatedTournament);
      }
      setUserTournaments(userRes.data);
      
    } catch (error: any) {
      console.error('Unregistration error:', error);
      toast.error(error.response?.data?.error || 'Failed to unregister from tournament');
    }
  };

  const isUserRegistered = (tournamentId: number) => {
    return userTournamentIds.has(tournamentId);
  };

  const handleViewLeaderboard = (tournamentId: number) => {
    navigate(`/leaderboard/tournament/${tournamentId}`);
    onClose();
  };

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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTournamentLink = (tournamentId: number) => {
    return `${window.location.origin}/#/tournaments?tournament=${tournamentId}`;
  };

  const copyTournamentLink = async (tournamentId: number) => {
    try {
      await navigator.clipboard.writeText(getTournamentLink(tournamentId));
      toast.success('Tournament link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tournament details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const registrationFormTemplate = getRegistrationFormTemplate(tournament);

  console.log('Rendering tournament modal for tournament:', tournament.id);
  console.log('showRegistrationForm:', showRegistrationForm);
  console.log('registrationFormTemplate:', registrationFormTemplate);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-brand-neon-green" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{tournament.name}</h2>
              <p className="text-sm text-gray-500">
                {tournament.status && (
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                    {tournament.status}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tournament Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">{formatDate(tournament.start_date || '')}</p>
                </div>
              </div>
              
              {tournament.end_date && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">{formatDate(tournament.end_date)}</p>
                  </div>
                </div>
              )}

              {tournament.location && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{tournament.location}</p>
                  </div>
                </div>
              )}

              {tournament.course && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p className="font-medium">{tournament.course}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Format</p>
                  <p className="font-medium">{getFormatDisplayName(tournament.tournament_format || '')}</p>
                </div>
              </div>

              {tournament.entry_fee && tournament.entry_fee > 0 && (
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Entry Fee</p>
                    <p className="font-medium">${tournament.entry_fee}</p>
                  </div>
                </div>
              )}

              {tournament.registration_deadline && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Registration Deadline</p>
                    <p className="font-medium">{formatDateTime(tournament.registration_deadline)}</p>
                  </div>
                </div>
              )}

              {tournament.max_participants && (
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Max Participants</p>
                    <p className="font-medium">{tournament.max_participants}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {tournament.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{tournament.description}</p>
            </div>
          )}

          {/* Rules */}
          {tournament.rules && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Rules</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{tournament.rules}</p>
            </div>
          )}

          {/* Notes */}
          {tournament.notes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <p className="text-gray-700">{tournament.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
            {isUserRegistered(tournament.id) ? (
              <>
                <button
                  onClick={() => handleUnregister(tournament.id)}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Unregister
                </button>
                <button
                  onClick={() => handleViewLeaderboard(tournament.id)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Leaderboard
                </button>
              </>
            ) : (
              <>
                {tournament.registration_open && (
                  <button
                    onClick={() => handleRegister(tournament.id)}
                    className="flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-md hover:bg-green-400 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register
                  </button>
                )}
                <button
                  onClick={() => handleViewLeaderboard(tournament.id)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Leaderboard
                </button>
              </>
            )}

            {/* Payment Button */}
            {isUserRegistered(tournament.id) && tournament.entry_fee && tournament.entry_fee > 0 && !isPaymentSubmitted(tournament.id) && (
              <button
                onClick={() => handlePaymentClick(tournament)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Submit Payment
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={() => copyTournamentLink(tournament.id)}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
          </div>
        </div>

        {/* Registration Form Modal */}
        {showRegistrationForm && tournament && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Tournament Registration</h3>
                <button
                  onClick={() => setShowRegistrationForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {registrationFormTemplate && registrationFormTemplate.questions && registrationFormTemplate.questions.length > 0 ? (
                <div className="space-y-4">
                  {registrationFormTemplate.questions.map((question: RegistrationFormQuestion) => (
                    <div key={question.id} className={`p-3 rounded-lg border ${
                      question.required && !isQuestionAnswered(question.id) 
                        ? 'border-red-200 bg-red-50' 
                        : isQuestionAnswered(question.id)
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {question.question}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                        {isQuestionAnswered(question.id) && (
                          <span className="text-green-600 ml-2 text-xs">✓ Answered</span>
                        )}
                      </label>
                      {question.type === 'text' && (
                        <input
                          type="text"
                          value={registrationFormData[question.id] || ''}
                          onChange={(e) => setRegistrationFormData({
                            ...registrationFormData,
                            [question.id]: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                          placeholder={question.placeholder || ''}
                        />
                      )}
                      {question.type === 'radio' && question.options && question.options.length > 0 && (
                        <div className="space-y-2">
                          {question.options.map(option => (
                            <label key={option} className="flex items-center">
                              <input
                                type="radio"
                                value={option}
                                checked={registrationFormData[question.id] === option}
                                onChange={(e) => setRegistrationFormData({
                                  ...registrationFormData,
                                  [question.id]: e.target.value
                                })}
                                className="mr-2"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      )}
                      {question.type === 'checkbox' && question.options && question.options.length > 0 && (
                        <div className="space-y-2">
                          {question.options.map(option => (
                            <label key={option} className="flex items-center">
                              <input
                                type="checkbox"
                                value={option}
                                checked={registrationFormData[question.id]?.includes(option) || false}
                                onChange={(e) => {
                                  const currentOptions = registrationFormData[question.id] || [];
                                  if (e.target.checked) {
                                    setRegistrationFormData({
                                      ...registrationFormData,
                                      [question.id]: [...currentOptions, option]
                                    });
                                  } else {
                                    setRegistrationFormData({
                                      ...registrationFormData,
                                      [question.id]: currentOptions.filter((o: string) => o !== option)
                                    });
                                  }
                                }}
                                className="mr-2"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No registration form questions found.</p>
                  <p className="text-sm text-gray-500 mt-2">Click submit to register without additional questions.</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRegistrationForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegistrationFormSubmit}
                  disabled={!isFormValid() || isSubmittingRegistration}
                  className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-md hover:bg-green-400 disabled:opacity-50"
                >
                  {isSubmittingRegistration ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && tournament && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Submit Payment</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm font-medium mb-1">Payment Instructions:</p>
                  <ol className="text-blue-700 text-sm space-y-1">
                    <li>1. Click the Venmo link below</li>
                    <li>2. Send ${tournament.entry_fee} to the organizer</li>
                    <li>3. Include your name in the payment note</li>
                    <li>4. The organizer will mark you as paid once they confirm payment</li>
                  </ol>
                </div>

                {/* Payment Organizer */}
                {tournament.payment_organizer && tournament.payment_organizer !== 'other' && (
                  <div className={`border rounded-lg p-3 ${
                    tournament.payment_organizer === 'jeff' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-sm mb-2 ${
                      tournament.payment_organizer === 'jeff' 
                        ? 'text-green-700' 
                        : 'text-blue-700'
                    }`}>
                      {tournament.payment_organizer === 'jeff' ? 'Jeff Testa' : 'Adam Christopher'}
                    </p>
                    <a 
                      href={tournament.payment_organizer === 'jeff' 
                        ? 'https://venmo.com/u/JeffTesta' 
                        : 'https://venmo.com/u/NN_No10'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`inline-flex items-center px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                        tournament.payment_organizer === 'jeff' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Pay ${tournament.entry_fee} on Venmo
                    </a>
                  </div>
                )}
                
                {/* Custom Payment Organizer */}
                {tournament.payment_organizer === 'other' && tournament.payment_organizer_name && (
                  <div className="border rounded-lg p-3 bg-purple-50 border-purple-200">
                    <p className="text-sm mb-2 text-purple-700">
                      {tournament.payment_organizer_name}
                    </p>
                    {tournament.payment_venmo_url && (
                      <a 
                        href={tournament.payment_venmo_url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Pay ${tournament.entry_fee} on Venmo
                      </a>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentModal; 