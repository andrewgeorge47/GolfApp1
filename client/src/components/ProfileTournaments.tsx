import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Users, Calendar, Trophy, Search, MapPin, Settings, DollarSign, BarChart3 } from 'lucide-react';
import { getTournaments, getUserTournaments, createTournament, updateTournament, deleteTournament, updateTournamentRegistration, getSimulatorCourses } from '../services/api';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

interface Tournament {
  id: number;
  name: string;
  tournament_format: string;
  type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  registration_open?: boolean;
  max_participants?: number;
  min_participants?: number;
  created_by?: number;
  course?: string;
  location?: string;
  rules?: string;
  notes?: string;
  description?: string;
  club_restriction?: string;
  entry_fee?: number;
}

interface SimulatorCourse {
  id: number;
  name: string;
  platforms: string[];
  location?: string;
  designer?: string;
  elevation?: number;
  course_types: string[];
}

interface TournamentFormErrors {
  name?: string;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string;
  min_participants?: string;
  max_participants?: string;
  entry_fee?: string;
  course?: string;
}

const ProfileTournaments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participatingTournaments, setParticipatingTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'created' | 'participating'>('created');

  // Tournament form state
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    max_participants: '',
    min_participants: '2',
    tournament_format: 'match_play',
    status: 'draft',
    registration_open: true,
    entry_fee: '0',
    location: '',
    course: '',
    rules: '',
    notes: '',
    type: 'tournament',
    club_restriction: 'open',
    // Registration form settings
    has_registration_form: false,
    registration_form_template: '',
    registration_form_data: null
  });
  const [formErrors, setFormErrors] = useState<TournamentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditTournamentForm, setShowEditTournamentForm] = useState(false);
  const [editTournamentForm, setEditTournamentForm] = useState<any>(null);

  // Simulator courses state
  const [simulatorCourses, setSimulatorCourses] = useState<SimulatorCourse[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<SimulatorCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SimulatorCourse | null>(null);

  // Course selection handlers
  const handleCourseSelect = (course: SimulatorCourse) => {
    setSelectedCourse(course);
    setTournamentForm(prev => ({
      ...prev,
      course: course.name,
      location: course.location || prev.location
    }));
    setCourseSearchTerm(course.name);
    setShowCourseDropdown(false);
  };

  const handleCourseSearchChange = (value: string) => {
    setCourseSearchTerm(value);
    setShowCourseDropdown(true);
    if (!value.trim()) {
      setSelectedCourse(null);
      setTournamentForm(prev => ({ ...prev, course: '', location: prev.location }));
    }
  };

  const clearCourseSelection = () => {
    setSelectedCourse(null);
    setCourseSearchTerm('');
    setTournamentForm(prev => ({ ...prev, course: '' }));
    setShowCourseDropdown(false);
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: TournamentFormErrors = {};
    if (!tournamentForm.name.trim()) {
      errors.name = 'Tournament name is required';
    }
    if (tournamentForm.start_date && tournamentForm.end_date) {
      if (new Date(tournamentForm.start_date) > new Date(tournamentForm.end_date)) {
        errors.end_date = 'End date must be after start date';
      }
    }
    if (tournamentForm.registration_deadline && tournamentForm.start_date) {
      if (new Date(tournamentForm.registration_deadline) > new Date(tournamentForm.start_date)) {
        errors.registration_deadline = 'Registration deadline must be before start date';
      }
    }
    if (tournamentForm.min_participants && tournamentForm.max_participants) {
      const min = parseInt(tournamentForm.min_participants);
      const max = parseInt(tournamentForm.max_participants);
      if (min > max) {
        errors.max_participants = 'Max participants must be greater than min participants';
      }
    }
    if (tournamentForm.entry_fee && parseFloat(tournamentForm.entry_fee) < 0) {
      errors.entry_fee = 'Entry fee cannot be negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch tournaments for this user
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const [allTournamentsRes, participatingRes] = await Promise.all([
          getTournaments(),
          getUserTournaments(user?.member_id || 0)
        ]);
        
        console.log('All tournaments:', allTournamentsRes.data);
        console.log('Participating tournaments:', participatingRes.data);
        console.log('User member_id:', user?.member_id, 'Type:', typeof user?.member_id);
        
        const myTournaments = allTournamentsRes.data.filter((t: Tournament) => {
          console.log('Tournament:', t.name, 'created_by:', t.created_by, 'Type:', typeof t.created_by);
          // Show all tournaments for admins, or tournaments created by this user
          if (user?.role?.toLowerCase() === 'admin') {
            return true;
          }
          return t.created_by === user?.member_id;
        });
        
        console.log('My tournaments:', myTournaments);
        setTournaments(myTournaments);
        setParticipatingTournaments(participatingRes.data);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        setTournaments([]);
        setParticipatingTournaments([]);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchTournaments();
  }, [user]);

  // Fetch simulator courses
  useEffect(() => {
    const fetchSimulatorCourses = async () => {
      try {
        const res = await getSimulatorCourses(undefined, undefined, 10000);
        console.log('Simulator courses response:', res.data);
        // The API returns { courses: [...], total: number, page: number, totalPages: number }
        setSimulatorCourses(res.data.courses || []);
      } catch (err) {
        console.error('Error fetching simulator courses:', err);
        setSimulatorCourses([]);
      }
    };
    fetchSimulatorCourses();
  }, []);

  // Filter courses based on search term
  useEffect(() => {
    if (!Array.isArray(simulatorCourses)) {
      console.warn('simulatorCourses is not an array:', simulatorCourses);
      setFilteredCourses([]);
      return;
    }
    
    if (courseSearchTerm.trim()) {
      const filtered = simulatorCourses.filter(course =>
        course.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
        (course.location && course.location.toLowerCase().includes(courseSearchTerm.toLowerCase()))
      );
      setFilteredCourses(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredCourses([]);
    }
  }, [courseSearchTerm, simulatorCourses]);

  // Handle clicking outside course dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.course-dropdown-container')) {
        setShowCourseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Create Tournament Handler
  const handleTournamentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const tournamentData = {
        name: tournamentForm.name,
        description: tournamentForm.description,
        start_date: tournamentForm.start_date || undefined,
        end_date: tournamentForm.end_date || undefined,
        registration_deadline: tournamentForm.registration_deadline || undefined,
        max_participants: tournamentForm.max_participants ? parseInt(tournamentForm.max_participants) : undefined,
        min_participants: parseInt(tournamentForm.min_participants),
        tournament_format: tournamentForm.tournament_format,
        status: tournamentForm.status,
        registration_open: tournamentForm.registration_open,
        entry_fee: parseFloat(tournamentForm.entry_fee),
        location: tournamentForm.location,
        course: selectedCourse ? selectedCourse.name : tournamentForm.course,
        rules: tournamentForm.rules,
        notes: tournamentForm.notes,
        type: tournamentForm.type,
        club_restriction: tournamentForm.club_restriction,
        has_registration_form: tournamentForm.has_registration_form,
        registration_form_template: tournamentForm.registration_form_template,
        registration_form_data: tournamentForm.registration_form_data,
        created_by: user?.member_id
      };
      await createTournament(tournamentData);
      toast.success('Tournament created successfully!');
      setShowTournamentForm(false);
      setTournamentForm({
        name: '', description: '', start_date: '', end_date: '', registration_deadline: '', max_participants: '', min_participants: '2', tournament_format: 'match_play', status: 'draft', registration_open: true, entry_fee: '0', location: '', course: '', rules: '', notes: '', type: 'tournament', club_restriction: 'open', has_registration_form: false, registration_form_template: '', registration_form_data: null
      });
      setFormErrors({});
      setSelectedCourse(null);
      setCourseSearchTerm('');
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data.filter((t: Tournament) => t.created_by === user?.member_id));
    } catch (error) {
      toast.error('Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Tournament Handler
  const handleEditTournament = (t: Tournament) => {
    setEditTournamentForm({
      ...t,
      max_participants: t.max_participants ? t.max_participants.toString() : '',
      min_participants: t.min_participants ? t.min_participants.toString() : '2',
      entry_fee: t.entry_fee ? t.entry_fee.toString() : '0'
    });
    setShowEditTournamentForm(true);
  };

  const handleUpdateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tournamentData = {
        ...editTournamentForm,
        max_participants: editTournamentForm.max_participants ? parseInt(editTournamentForm.max_participants) : undefined,
        min_participants: parseInt(editTournamentForm.min_participants),
        entry_fee: parseFloat(editTournamentForm.entry_fee)
      };
      await updateTournament(editTournamentForm.id, tournamentData);
      setShowEditTournamentForm(false);
      setEditTournamentForm(null);
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data.filter((t: Tournament) => t.created_by === user?.member_id));
      toast.success('Tournament updated successfully!');
    } catch (error) {
      toast.error('Error updating tournament.');
    }
  };

  // Delete Tournament Handler
  const handleDeleteTournament = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await deleteTournament(id);
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data.filter((t: Tournament) => t.created_by === user?.member_id));
      toast.success('Tournament deleted successfully!');
    } catch (error) {
      toast.error('Error deleting tournament.');
    }
  };

  // Registration Toggle Handler
  const handleToggleRegistration = async (tournament: Tournament) => {
    try {
      await updateTournamentRegistration(tournament.id, !tournament.registration_open);
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data.filter((t: Tournament) => t.created_by === user?.member_id));
      toast.success('Registration status updated!');
    } catch (error) {
      toast.error('Error updating registration status.');
    }
  };

  // Submit Score Handler
  const handleSubmitScore = (tournament: Tournament) => {
    // Navigate to the tournament scoring page for this tournament
    navigate(`/tournament-scoring?tournament=${tournament.id}`);
  };

  // View Leaderboard Handler
  const handleViewLeaderboard = (tournament: Tournament) => {
    // Navigate to the leaderboard page for this tournament
    window.location.href = `/leaderboard?tournament=${tournament.id}`;
  };

  // UI
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-black flex items-center">
            <Trophy className="w-6 h-6 mr-3" />
            {user?.role?.toLowerCase() === 'admin' ? 'Tournament Management' : 'My Tournaments'}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            {user?.role?.toLowerCase() === 'admin' 
              ? 'Manage all tournaments in the system' 
              : 'Create and manage tournaments you\'ve organized'
            }
          </p>
        </div>
        <button onClick={() => setShowTournamentForm(true)} className="flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Create Tournament
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-neutral-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('created')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'created'
              ? 'bg-white text-brand-black shadow-sm'
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Created ({tournaments.length})
        </button>
        <button
          onClick={() => setActiveTab('participating')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'participating'
              ? 'bg-white text-brand-black shadow-sm'
              : 'text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Participating ({participatingTournaments.length})
        </button>
      </div>
      {loading ? (
        <div className="text-center py-12 text-neutral-500">Loading tournaments...</div>
      ) : (activeTab === 'created' ? tournaments : participatingTournaments).length === 0 ? (
        <div className="text-center py-12 text-neutral-600">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
          <p className="text-lg font-medium mb-2">
            {activeTab === 'created' 
              ? (user?.role?.toLowerCase() === 'admin' ? 'No Tournaments Found' : 'No Tournaments Created Yet')
              : 'No Participating Tournaments'
            }
          </p>
          <p className="text-sm text-neutral-500 mb-4">
            {activeTab === 'created' 
              ? (user?.role?.toLowerCase() === 'admin' 
                ? 'There are no tournaments in the system yet. Create the first tournament to get started!'
                : 'This section shows tournaments you\'ve created. Create your first tournament to get started!'
              )
              : 'You haven\'t registered for any tournaments yet. Check the available tournaments to join!'
            }
          </p>
          {activeTab === 'created' && (
            <button onClick={() => setShowTournamentForm(true)} className="mt-4 px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              {user?.role?.toLowerCase() === 'admin' ? 'Create Tournament' : 'Create Your First Tournament'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === 'created' ? tournaments : participatingTournaments).map(tournament => (
            <div key={tournament.id} className="p-4 bg-white border border-neutral-200 rounded-lg shadow-sm hover:border-brand-neon-green transition-all group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-brand-black group-hover:text-brand-neon-green transition-colors">
                  {tournament.name}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tournament.status === 'active' ? 'bg-green-100 text-green-800' :
                  tournament.status === 'open' ? 'bg-blue-100 text-blue-800' :
                  tournament.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  tournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {tournament.status || 'draft'}
                </span>
              </div>
              <div className="text-sm text-neutral-600 mb-2">
                {tournament.tournament_format || 'match_play'} • {tournament.type || 'tournament'}
              </div>
              {tournament.start_date && (
                <div className="text-xs text-neutral-500 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  {new Date(tournament.start_date).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1">
                {activeTab === 'created' ? (
                  <>
                    <button onClick={() => handleEditTournament(tournament)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center">
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDeleteTournament(tournament.id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors flex items-center">
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                    <button onClick={() => handleToggleRegistration(tournament)} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      tournament.registration_open ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}>
                      {tournament.registration_open ? 'Registration Open' : 'Registration Closed'}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleSubmitScore(tournament)} 
                      className="px-3 py-1 bg-brand-neon-green text-brand-black rounded text-xs hover:bg-green-400 transition-colors flex items-center"
                    >
                      <Trophy className="w-4 h-4 mr-1" /> Submit Score
                    </button>
                    <button 
                      onClick={() => handleViewLeaderboard(tournament)} 
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" /> Leaderboard
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tournament Form Modal (Create) */}
      {showTournamentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-brand-black">Create Tournament/League</h3>
              <button
                onClick={() => setShowTournamentForm(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleTournamentSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-neutral-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Trophy className="w-5 h-5 text-brand-neon-green mr-2" />
                  <h4 className="text-lg font-semibold text-brand-black">Basic Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">
                      Tournament Name *
                    </label>
                    <input
                      type="text"
                      value={tournamentForm.name}
                      onChange={e => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-neutral-300'
                      }`}
                      required
                      placeholder="e.g., Spring Championship 2024"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Type</label>
                    <select
                      value={tournamentForm.type || 'tournament'}
                      onChange={e => setTournamentForm({ ...tournamentForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    >
                      <option value="tournament">Tournament</option>
                      <option value="league">League</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Status</label>
                    <select
                      value={tournamentForm.status}
                      onChange={e => setTournamentForm({ ...tournamentForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="open">Open for Registration</option>
                      <option value="closed">Registration Closed</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Tournament Format</label>
                    <select
                      value={tournamentForm.tournament_format}
                      onChange={e => setTournamentForm({ ...tournamentForm, tournament_format: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    >
                      <option value="match_play">Match Play</option>
                      <option value="stroke_play">Stroke Play</option>
                      <option value="scramble">Scramble</option>
                      <option value="best_ball">Best Ball</option>
                      <option value="stableford">Stableford</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div className="bg-neutral-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Calendar className="w-5 h-5 text-brand-neon-green mr-2" />
                  <h4 className="text-lg font-semibold text-brand-black">Dates & Schedule</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={tournamentForm.start_date}
                      onChange={e => setTournamentForm({ ...tournamentForm, start_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                        formErrors.start_date ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                    {formErrors.start_date && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.start_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={tournamentForm.end_date}
                      onChange={e => setTournamentForm({ ...tournamentForm, end_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                        formErrors.end_date ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                    {formErrors.end_date && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.end_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Registration Deadline</label>
                    <input
                      type="date"
                      value={tournamentForm.registration_deadline}
                      onChange={e => setTournamentForm({ ...tournamentForm, registration_deadline: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                        formErrors.registration_deadline ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                    {formErrors.registration_deadline && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.registration_deadline}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Course Selection Section */}
              <div className="bg-neutral-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <MapPin className="w-5 h-5 text-brand-neon-green mr-2" />
                  <h4 className="text-lg font-semibold text-brand-black">Course & Location</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Simulator Course</label>
                    <div className="relative course-dropdown-container">
                      <div className="relative">
                        <input
                          type="text"
                          value={courseSearchTerm}
                          onChange={e => handleCourseSearchChange(e.target.value)}
                          onFocus={() => setShowCourseDropdown(true)}
                          placeholder="Search for a simulator course..."
                          className="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <Search className="h-4 w-4 text-neutral-400" />
                        </div>
                      </div>
                      {selectedCourse && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-green-800">{selectedCourse.name}</p>
                              {selectedCourse.location && (
                                <p className="text-sm text-green-600">{selectedCourse.location}</p>
                              )}
                              {selectedCourse.designer && (
                                <p className="text-sm text-green-600">Designed by {selectedCourse.designer}</p>
                              )}
                              <div className="flex gap-1 mt-1">
                                {selectedCourse.platforms.map(platform => (
                                  <span key={platform} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                    {platform}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={clearCourseSelection}
                              className="text-green-600 hover:text-green-800"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      {showCourseDropdown && filteredCourses.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCourses.map(course => (
                            <div
                              key={course.id}
                              onClick={() => handleCourseSelect(course)}
                              className="px-4 py-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0"
                            >
                              <div className="font-medium text-neutral-900">{course.name}</div>
                              {course.location && (
                                <div className="text-sm text-neutral-600">{course.location}</div>
                              )}
                              <div className="flex gap-1 mt-1">
                                {course.platforms.map(platform => (
                                  <span key={platform} className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded">
                                    {platform}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Location</label>
                    <input
                      type="text"
                      value={tournamentForm.location}
                      onChange={e => setTournamentForm({ ...tournamentForm, location: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                      placeholder="e.g., Pine Valley Golf Club"
                    />
                  </div>
                </div>
              </div>

              {/* Participants & Fees Section */}
              <div className="bg-neutral-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Users className="w-5 h-5 text-brand-neon-green mr-2" />
                  <h4 className="text-lg font-semibold text-brand-black">Participants & Fees</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Min Participants</label>
                    <input
                      type="number"
                      min="2"
                      value={tournamentForm.min_participants}
                      onChange={e => setTournamentForm({ ...tournamentForm, min_participants: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                        formErrors.min_participants ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    />
                    {formErrors.min_participants && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.min_participants}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Max Participants</label>
                    <input
                      type="number"
                      min="2"
                      value={tournamentForm.max_participants}
                      onChange={e => setTournamentForm({ ...tournamentForm, max_participants: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                        formErrors.max_participants ? 'border-red-500' : 'border-neutral-300'
                      }`}
                      placeholder="No limit"
                    />
                    {formErrors.max_participants && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.max_participants}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Entry Fee ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tournamentForm.entry_fee}
                        onChange={e => setTournamentForm({ ...tournamentForm, entry_fee: e.target.value })}
                        className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent ${
                          formErrors.entry_fee ? 'border-red-500' : 'border-neutral-300'
                        }`}
                      />
                    </div>
                    {formErrors.entry_fee && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.entry_fee}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tournamentForm.registration_open}
                      onChange={e => setTournamentForm({ ...tournamentForm, registration_open: e.target.checked })}
                      className="rounded border-neutral-300 text-brand-neon-green focus:ring-brand-neon-green"
                    />
                    <span className="ml-2 text-sm text-neutral-600">Registration is currently open</span>
                  </label>
                </div>
              </div>

              {/* Club Registration Section */}
              <div className="bg-neutral-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <MapPin className="w-5 h-5 text-brand-neon-green mr-2" />
                  <h4 className="text-lg font-semibold text-brand-black">Club Registration</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Registration Access</label>
                    <select
                      value={tournamentForm.club_restriction}
                      onChange={e => setTournamentForm({ ...tournamentForm, club_restriction: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    >
                      <option value="open">Open to All Clubs</option>
                      <option value={user?.club || 'club_specific'}>
                        {user?.club || 'My Club Only'}
                      </option>
                    </select>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Current Setting:</strong> {
                        tournamentForm.club_restriction === 'open' 
                          ? 'Open to all clubs' 
                          : `Restricted to ${tournamentForm.club_restriction}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="bg-neutral-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Settings className="w-5 h-5 text-brand-neon-green mr-2" />
                  <h4 className="text-lg font-semibold text-brand-black">Additional Information</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Description</label>
                    <textarea
                      value={tournamentForm.description}
                      onChange={e => setTournamentForm({ ...tournamentForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                      rows={3}
                      placeholder="Brief description of the tournament..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Rules</label>
                    <textarea
                      value={tournamentForm.rules}
                      onChange={e => setTournamentForm({ ...tournamentForm, rules: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                      rows={4}
                      placeholder="Tournament rules and regulations..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">Notes</label>
                    <textarea
                      value={tournamentForm.notes}
                      onChange={e => setTournamentForm({ ...tournamentForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                      rows={2}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTournamentForm(false)}
                  className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Tournament'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tournament Edit Modal */}
      {showEditTournamentForm && editTournamentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-brand-black mb-4">Edit Tournament/League</h3>
            <form onSubmit={handleUpdateTournament} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editTournamentForm.name}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Type</label>
                  <select
                    value={editTournamentForm.type || 'tournament'}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value="tournament">Tournament</option>
                    <option value="league">League</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Status</label>
                  <select
                    value={editTournamentForm.status || 'draft'}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open for Registration</option>
                    <option value="closed">Registration Closed</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Tournament Format</label>
                  <select
                    value={editTournamentForm.tournament_format || 'match_play'}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, tournament_format: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value="match_play">Match Play</option>
                    <option value="stroke_play">Stroke Play</option>
                    <option value="scramble">Scramble</option>
                    <option value="best_ball">Best Ball</option>
                    <option value="stableford">Stableford</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editTournamentForm.start_date}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editTournamentForm.end_date}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Registration Deadline</label>
                  <input
                    type="date"
                    value={editTournamentForm.registration_deadline}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, registration_deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Min Participants</label>
                  <input
                    type="number"
                    min="2"
                    value={editTournamentForm.min_participants}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, min_participants: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Max Participants</label>
                  <input
                    type="number"
                    min="2"
                    value={editTournamentForm.max_participants}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, max_participants: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    placeholder="No limit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Entry Fee ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editTournamentForm.entry_fee}
                      onChange={e => setEditTournamentForm({ ...editTournamentForm, entry_fee: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Registration Open</label>
                  <select
                    value={editTournamentForm.registration_open?.toString() || 'true'}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, registration_open: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value="true">Open</option>
                    <option value="false">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Club Restriction</label>
                  <select
                    value={editTournamentForm.club_restriction || 'open'}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, club_restriction: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value="open">Open to All Clubs</option>
                    <option value={user?.club || 'club_specific'}>
                      {user?.club || 'My Club Only'}
                    </option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Location</label>
                <input
                  type="text"
                  value={editTournamentForm.location || ''}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  placeholder="e.g., Pine Valley Golf Club"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Course</label>
                <input
                  type="text"
                  value={editTournamentForm.course || ''}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, course: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  placeholder="e.g., Championship Course"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Description</label>
                <textarea
                  value={editTournamentForm.description || ''}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the tournament..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Rules</label>
                <textarea
                  value={editTournamentForm.rules || ''}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, rules: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={4}
                  placeholder="Tournament rules and regulations..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  value={editTournamentForm.notes || ''}
                  onChange={e => setEditTournamentForm({ ...editTournamentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditTournamentForm(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTournaments; 