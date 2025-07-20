import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, CheckCircle, Clock, Search, MapPin, Calendar, Users, DollarSign, Trophy, Settings, BarChart3 } from 'lucide-react';
import { 
  createTournament,
  getTournaments,
  updateTournament,
  deleteTournament,
  getTournamentParticipants,
  registerUserForTournament,
  unregisterUserFromTournament,
  getTournamentCheckIns,
  getTournamentScores,
  checkInUser,
  checkOutUser,
  getTournamentStats,
  getTournamentMatches,
  generateTournamentMatches,
  updateTournamentMatch,
  getUsers,
  updateTournamentRegistration
} from '../services/api';
import type { User } from '../services/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TournamentList from './TournamentList';
import TournamentDetails from './TournamentDetails';
import ParticipantsTable from './ParticipantsTable';
import MatchesTable from './MatchesTable';

import api from '../services/api';
import { useAuth } from '../AuthContext';

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

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simulator courses state
  const [simulatorCourses, setSimulatorCourses] = useState<SimulatorCourse[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<SimulatorCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SimulatorCourse | null>(null);
  
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
    club_restriction: 'open' // 'open', 'club_specific', or specific club name
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState<TournamentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user is super admin (Andrew George)
  const isSuperAdmin = currentUser?.first_name === 'Andrew' && currentUser?.last_name === 'George';

  // Tournament templates
  const tournamentTemplates = [
    {
      id: 'championship',
      name: 'Championship Tournament',
      icon: '🏆',
      description: 'Major championship with stroke play format',
      settings: {
        tournament_format: 'stroke_play',
        min_participants: '8',
        max_participants: '32',
        entry_fee: '50',
        status: 'draft',
        rules: 'Standard stroke play rules apply. Lowest total score wins. Ties will be decided by scorecard playoff.',
        notes: 'Championship format - individual stroke play'
      }
    },
    {
      id: 'match_play',
      name: 'Match Play Championship',
      icon: '⚔️',
      description: 'Head-to-head match play tournament',
      settings: {
        tournament_format: 'match_play',
        min_participants: '4',
        max_participants: '16',
        entry_fee: '25',
        status: 'draft',
        rules: 'Match play format. Win holes to win matches. Ties result in halved holes.',
        notes: 'Match play format - head-to-head competition'
      }
    },
    {
      id: 'league',
      name: 'Season League',
      icon: '📅',
      description: 'Ongoing league with multiple rounds',
      settings: {
        type: 'league',
        tournament_format: 'match_play',
        min_participants: '8',
        max_participants: '24',
        entry_fee: '100',
        status: 'draft',
        rules: 'League format with multiple rounds. Points awarded for wins, ties, and losses.',
        notes: 'League format - ongoing competition'
      }
    },
    {
      id: 'scramble',
      name: 'Scramble Tournament',
      icon: '🎉',
      description: 'Team scramble format tournament',
      settings: {
        tournament_format: 'scramble',
        min_participants: '4',
        max_participants: '20',
        entry_fee: '10',
        status: 'draft',
        rules: 'Scramble format. Teams of 4 players. All players hit, best shot is selected. Team captain submits final score.',
        notes: 'Scramble format - team competition with 4 players per team'
      }
    },
    {
      id: 'best_ball',
      name: 'Best Ball Tournament',
      icon: '🎯',
      description: 'Best ball format tournament',
      settings: {
        tournament_format: 'best_ball',
        min_participants: '4',
        max_participants: '16',
        entry_fee: '15',
        status: 'draft',
        rules: 'Best ball format. Teams of 2 players. Each player plays their own ball, best score on each hole counts.',
        notes: 'Best ball format - team competition with 2 players per team'
      }
    },
    {
      id: 'stableford',
      name: 'Stableford Tournament',
      icon: '📊',
      description: 'Stableford scoring tournament',
      settings: {
        tournament_format: 'stableford',
        min_participants: '4',
        max_participants: '20',
        entry_fee: '20',
        status: 'draft',
        rules: 'Stableford scoring. Points awarded based on score relative to par. Highest total points wins.',
        notes: 'Stableford format - points-based scoring'
      }
    },
    {
      id: 'custom',
      name: 'Custom Tournament',
      icon: '⚙️',
      description: 'Start from scratch with custom settings',
      settings: {}
    }
  ];

  // Tournament state
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [showEditTournamentForm, setShowEditTournamentForm] = useState(false);
  const [editTournamentForm, setEditTournamentForm] = useState<any>(null);

  // Tournament management state
  const [tournamentParticipants, setTournamentParticipants] = useState<any[]>([]);
  const [tournamentCheckIns, setTournamentCheckIns] = useState<any[]>([]);
  const [tournamentScores, setTournamentScores] = useState<any[]>([]);
  const [tournamentPayouts, setTournamentPayouts] = useState<any[]>([]);
  const [tournamentStats, setTournamentStats] = useState<any>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedUserForCheckIn, setSelectedUserForCheckIn] = useState<any | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');

  // Tournament matches state
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [showMatchGenerationModal, setShowMatchGenerationModal] = useState(false);
  const [matchGenerationForm, setMatchGenerationForm] = useState({
    format: 'optimized',
    minMatchesPerPlayer: 3
  });

  // Add state for multi-select registration
  const [selectedRegistrationUserIds, setSelectedRegistrationUserIds] = useState<number[]>([]);

  // Add state for multi-select payment tracking
  const [selectedCheckInUserIds, setSelectedCheckInUserIds] = useState<number[]>([]);

  // Add tab state
  const [activeTab, setActiveTab] = useState<'registration' | 'checkin' | 'matches' | 'tracking'>('registration');


  // Add state for registration search
  const [registrationSearch, setRegistrationSearch] = useState('');

  // Add state for club filter
  const [registrationClubFilter, setRegistrationClubFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData] = await Promise.all([
          getUsers()
        ]);

        setUsers(usersData.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch simulator courses
  useEffect(() => {
    const fetchSimulatorCourses = async () => {
      try {
        const response = await api.get('/simulator-courses?limit=1000');
        setSimulatorCourses(response.data.courses);
      } catch (error) {
        console.error('Error fetching simulator courses:', error);
      }
    };

    fetchSimulatorCourses();
  }, []);

  // Filter courses based on search term
  useEffect(() => {
    if (courseSearchTerm.trim()) {
      const filtered = simulatorCourses.filter(course =>
        course.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
        (course.location && course.location.toLowerCase().includes(courseSearchTerm.toLowerCase())) ||
        (course.designer && course.designer.toLowerCase().includes(courseSearchTerm.toLowerCase()))
      ).slice(0, 10);
      setFilteredCourses(filtered);
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

    if (showCourseDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCourseDropdown]);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await getTournaments();
        setTournaments(res.data);
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchTournaments();
  }, []);

  // Load tournament data when selected
  useEffect(() => {
    if (selectedTournament) {
      const loadTournamentData = async () => {
        try {
          const [participantsRes, checkInsRes, statsRes, matchesRes, scoresRes] = await Promise.all([
            getTournamentParticipants(selectedTournament.id),
            getTournamentCheckIns(selectedTournament.id),
            getTournamentStats(selectedTournament.id),
            getTournamentMatches(selectedTournament.id),
            getTournamentScores(selectedTournament.id)
          ]);
          
          setTournamentParticipants(participantsRes.data);
          setTournamentCheckIns(checkInsRes.data);
          setTournamentStats(statsRes.data);
          setTournamentMatches(matchesRes.data);
          setTournamentScores(scoresRes.data || []);
        } catch (error) {
          console.error('Error loading tournament data:', error);
        }
      };
      
      loadTournamentData();
    }
  }, [selectedTournament]);

  // Validation functions
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

  // Template selection handler
  const handleTemplateSelect = (template: any) => {
    setTournamentForm(prev => ({
      ...prev,
      ...template.settings
    }));
    toast.success(`Applied ${template.name} template`);
  };

  const handleTournamentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
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
        created_by: currentUser?.member_id
      };
      
      await createTournament(tournamentData);
      
      toast.success('Tournament created successfully!');
      setShowTournamentForm(false);
      setTournamentForm({ 
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
        club_restriction: 'open'
      });
      setFormErrors({});
      setSelectedCourse(null);
      setCourseSearchTerm('');
      
      // Refresh tournaments list
      const res = await getTournaments();
      setTournaments(res.data);
      
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTournament = (t: any) => {
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
      setTournaments(res.data);
      toast.success('Tournament updated successfully!');
    } catch (error) {
      toast.error('Error updating tournament.');
    }
  };

  const handleDeleteTournament = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await deleteTournament(id);
      // Refresh tournaments
      const res = await getTournaments();
      setTournaments(res.data);
      toast.success('Tournament deleted successfully!');
      if (selectedTournament && selectedTournament.id === id) setSelectedTournament(null);
    } catch (error) {
      toast.error('Error deleting tournament.');
    }
  };

  // Tournament registration functions
  const handleRegisterUsers = async (userIds: number[]) => {
    if (!selectedTournament) return;
    try {
      await Promise.all(userIds.map(userId => registerUserForTournament(selectedTournament.id, userId)));
      // Refresh tournament data
      const [participantsRes, statsRes] = await Promise.all([
        getTournamentParticipants(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      setTournamentParticipants(participantsRes.data);
      setTournamentStats(statsRes.data);
      setShowRegistrationModal(false);
      setSelectedRegistrationUserIds([]);
      toast.success('Users registered successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error registering users');
    }
  };

  const handleUnregisterUser = async (userId: number) => {
    if (!selectedTournament) return;
    
    if (!window.confirm('Are you sure you want to unregister this user?')) return;
    
    try {
      await unregisterUserFromTournament(selectedTournament.id, userId);
      
      // Refresh tournament data
      const [participantsRes, statsRes] = await Promise.all([
        getTournamentParticipants(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      
      setTournamentParticipants(participantsRes.data);
      setTournamentStats(statsRes.data);
      
      alert('User unregistered successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error unregistering user');
    }
  };

  // Tournament payment tracking functions
  const handleCheckInUsers = async (userIds: number[]) => {
    if (!selectedTournament) return;
    try {
      await Promise.all(userIds.map(userId => checkInUser(selectedTournament.id, userId, checkInNotes)));
      // Refresh tournament data
      const [checkInsRes, statsRes] = await Promise.all([
        getTournamentCheckIns(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      setTournamentCheckIns(checkInsRes.data);
      setTournamentStats(statsRes.data);
      setShowCheckInModal(false);
      setSelectedCheckInUserIds([]);
      setCheckInNotes('');
      toast.success('Users checked in successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error checking in users');
    }
  };

  const handleCheckOutUser = async (userId: number) => {
    if (!selectedTournament) return;
    
    if (!window.confirm('Are you sure you want to check out this user?')) return;
    
    try {
      await checkOutUser(selectedTournament.id, userId);
      
      // Refresh tournament data
      const [checkInsRes, statsRes] = await Promise.all([
        getTournamentCheckIns(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      
      setTournamentCheckIns(checkInsRes.data);
      setTournamentStats(statsRes.data);
      
      alert('User checked out successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error checking out user');
    }
  };

  // Get available users for registration (not already registered)
  const getAvailableUsers = () => {
    const registeredUserIds = tournamentParticipants.map(p => p.user_member_id);
    return users.filter(user => !registeredUserIds.includes(user.member_id));
  };

  // Get registered users not checked in
  const getRegisteredNotCheckedIn = () => {
    const checkedInUserIds = tournamentCheckIns.map(c => c.user_member_id);
    return tournamentParticipants.filter(p => !checkedInUserIds.includes(p.user_member_id));
  };

  // Match generation functions
  const handleGenerateMatches = async () => {
    if (!selectedTournament) return;
    
    try {
      const response = await generateTournamentMatches(
        selectedTournament.id, 
        matchGenerationForm.format, 
        matchGenerationForm.minMatchesPerPlayer
      );
      
      // Refresh tournament data
      const [matchesRes, statsRes] = await Promise.all([
        getTournamentMatches(selectedTournament.id),
        getTournamentStats(selectedTournament.id)
      ]);
      
      setTournamentMatches(matchesRes.data);
      setTournamentStats(statsRes.data);
      setShowMatchGenerationModal(false);
      
      alert(response.data.message || 'Matches generated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error generating matches');
    }
  };

  const handleUpdateMatchResult = async (matchId: number, winnerId: number, scores?: any) => {
    if (!selectedTournament) return;
    
    try {
      await updateTournamentMatch(selectedTournament.id, matchId, {
        winner_id: winnerId,
        scores: scores || {},
        status: 'completed'
      });
      
      // Refresh matches
      const matchesRes = await getTournamentMatches(selectedTournament.id);
      setTournamentMatches(matchesRes.data);
      
      alert('Match result updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating match result');
    }
  };

  // Get checked-in players count for match generation
  const getCheckedInPlayersCount = () => {
    return tournamentCheckIns.filter(c => c.status === 'checked_in').length;
  };

  // Calculate tournament formation stats
  const getTournamentFormationStats = () => {
    if (!selectedTournament) return null;
    
    const totalUsers = users.length;
    const registeredUsers = tournamentParticipants.length;
    const checkedInUsers = tournamentCheckIns.length;
    const minParticipants = selectedTournament.min_participants || 2;
    const maxParticipants = selectedTournament.max_participants;
    
    const registrationProgress = totalUsers > 0 ? (registeredUsers / totalUsers) * 100 : 0;
    const minParticipantsMet = registeredUsers >= minParticipants;
    const maxParticipantsReached = maxParticipants ? registeredUsers >= maxParticipants : false;
    
    return {
      totalUsers,
      registeredUsers,
      checkedInUsers,
      minParticipants,
      maxParticipants,
      registrationProgress,
      minParticipantsMet,
      maxParticipantsReached
    };
  };

  // Calculate stats for all tournaments
  const statsByTournamentId = tournaments.reduce((acc, tournament) => {
    // This would need to be populated with actual stats from the API
    // For now, we'll use placeholder data
    acc[tournament.id] = {
      total_participants: 0,
      checked_in_count: 0,
      total_matches: 0
    };
    return acc;
  }, {} as Record<string, any>);

  // Helper to get all clubs from all users
  function getAllClubs() {
    return Array.from(new Set(users.map(u => u.club))).sort();
  }
  // Helper to get total users in a club
  function getTotalUsersInClub(club: string) {
    return users.filter(u => u.club === club).length;
  }
  // Helper to get registered users in a club
  function getRegisteredUsersInClub(club: string) {
    return tournamentParticipants.filter(p => p.club === club).length;
  }
  // Helper to get available (unregistered) users, filtered by club if set
  function getAvailableUsersFiltered() {
    if (!selectedTournament) return [];
    
    // Get all available users (not registered for this tournament)
    const availableUsers = getAvailableUsers();
    
    // Filter by search term
    let filtered = availableUsers.filter(user => {
      const searchLower = registrationSearch.toLowerCase();
      return (
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.club.toLowerCase().includes(searchLower)
      );
    });
    
    // Filter by club if specified
    if (registrationClubFilter) {
      filtered = filtered.filter(user => user.club === registrationClubFilter);
    }
    
    // Apply tournament club restrictions
    if (selectedTournament.club_restriction && selectedTournament.club_restriction !== 'open') {
      filtered = filtered.filter(user => user.club === selectedTournament.club_restriction);
    }
    
    // If not super admin, only show users from their club or open tournaments
    if (!isSuperAdmin) {
      if (selectedTournament.club_restriction === 'open') {
        // For open tournaments, show all users
    return filtered;
      } else {
        // For club-specific tournaments, only show users from the admin's club
        return filtered.filter(user => user.club === currentUser?.club);
      }
    }
    
    return filtered;
  }

  // Helper to determine if payment tracking functionality should be shown
  const shouldShowCheckIn = () => {
    if (!selectedTournament) return false;
    
    // Show payment tracking for tournaments with entry fees or if explicitly enabled
    // For simulator tournaments, payment tracking might not be needed
    const isInPerson = selectedTournament.location && selectedTournament.location.toLowerCase().includes('club');
    const isSimulator = selectedTournament.course && selectedTournament.course.toLowerCase().includes('simulator');
    
    return isInPerson || !isSimulator;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main Content */}
      <div className="bg-white/95 rounded-2xl shadow-lg">
        <div className="p-6">
          <div className="space-y-6">
            {/* Tournament Management */}
            <div className="space-y-6">
              {/* Tournament Overview Grid */}
              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {selectedTournament && (
                      <button
                        onClick={() => setSelectedTournament(null)}
                        className="flex items-center px-3 py-1 text-neutral-600 hover:text-neutral-800 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to List
                      </button>
                    )}
                    <h3 className="text-lg font-semibold text-brand-black">
                      {selectedTournament ? `Managing: ${selectedTournament.name}` : 'Tournaments'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowTournamentForm(true)}
                    className="flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Tournament
                  </button>
                </div>

                {/* Selected Tournament Quick Info */}
                {selectedTournament && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-brand-neon-green/10 to-blue-50 rounded-lg border border-brand-neon-green/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-black">{selectedTournament.name}</div>
                        <div className="text-sm text-neutral-600 capitalize">{selectedTournament.type}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-brand-black">
                          {(() => {
                            const stats = getTournamentFormationStats();
                            return stats ? stats.registeredUsers : 0;
                          })()}
                        </div>
                        <div className="text-sm text-neutral-600">Participants</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-brand-black">
                          {(() => {
                            const stats = getTournamentFormationStats();
                            return stats ? stats.checkedInUsers : 0;
                          })()}
                        </div>
                        <div className="text-sm text-neutral-600">Checked In</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-brand-black">
                          {tournamentMatches.length}
                        </div>
                        <div className="text-sm text-neutral-600">Matches</div>
                      </div>
                    </div>
                    
                    {/* Compact Progress Bar */}
                    {(() => {
                      const stats = getTournamentFormationStats();
                      if (!stats) return null;
                      
                      return (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-neutral-600 mb-1">
                            <span>Registration Progress</span>
                            <span>{Math.round(stats.registrationProgress)}%</span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(stats.registrationProgress, 100)}%`,
                                background: stats.minParticipantsMet ? '#22c55e' : '#4ade80'
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-neutral-500 mt-1">
                            <span>0</span>
                            <span>{stats.totalUsers}</span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedTournament.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedTournament.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          selectedTournament.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          selectedTournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedTournament.status || 'draft'}
                        </span>
                        <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs">
                          {selectedTournament.tournament_format || 'match_play'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedTournament.registration_open ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                          {selectedTournament.registration_open ? 'Registration Open' : 'Registration Closed'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditTournament(selectedTournament)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTournament(selectedTournament.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            const newRegistrationOpen = !selectedTournament.registration_open;
                            updateTournamentRegistration(selectedTournament.id, newRegistrationOpen);
                          }}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            selectedTournament.registration_open 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {selectedTournament.registration_open ? 'Close Registration' : 'Open Registration'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tournament Overview Grid */}
                {!selectedTournament && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tournaments.map(tournament => (
                        <div
                          key={tournament.id}
                          onClick={() => setSelectedTournament(tournament)}
                          className="p-4 bg-white border border-neutral-200 rounded-lg hover:border-brand-neon-green hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-brand-black group-hover:text-brand-neon-green transition-colors">
                              {tournament.name}
                            </h5>
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
                            <div className="text-xs text-neutral-500">
                              {new Date(tournament.start_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {tournaments.length === 0 && (
                      <div className="text-center py-8 text-neutral-600">
                        <Trophy className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                        <p>No tournaments found.</p>
                        <p className="text-sm">Create your first tournament to get started.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tournament Management Content */}
              {selectedTournament && (
                <div className="space-y-6">
                  {/* Tabs */}
                  <div className="bg-white rounded-xl border border-neutral-200">
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 border-b border-neutral-200 p-6 pb-0">
                    <button
                      className={`py-2 px-4 font-medium ${activeTab === 'registration' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                      onClick={() => setActiveTab('registration')}
                    >
                      Registration
                    </button>
                      {shouldShowCheckIn() && (
                    <button
                      className={`py-2 px-4 font-medium ${activeTab === 'checkin' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                      onClick={() => setActiveTab('checkin')}
                    >
                      Players
                    </button>
                      )}
                    <button
                      className={`py-2 px-4 font-medium ${activeTab === 'matches' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                      onClick={() => setActiveTab('matches')}
                    >
                      Matches
                    </button>
                    <button
                      className={`py-2 px-4 font-medium ${activeTab === 'tracking' ? 'border-b-2 border-brand-neon-green text-brand-black' : 'text-neutral-600 hover:text-brand-black'}`}
                      onClick={() => setActiveTab('tracking')}
                    >
                      <BarChart3 className="w-4 h-4 mr-2 inline" />
                      User Tracking
                    </button>
                  </div>

                  {/* Tab Content */}
                    <div className="p-6">
                  {activeTab === 'registration' && (
                        <div className="space-y-6">
                          {/* Registration Overview */}
                          <div className="bg-white rounded-xl p-6 border border-neutral-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-brand-black">Registration Management</h4>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-neutral-600">
                                  {tournamentParticipants.length} registered
                                </span>
                                {selectedTournament.max_participants && (
                                  <span className="text-sm text-neutral-600">
                                    / {selectedTournament.max_participants} max
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Club Restriction Info */}
                            {selectedTournament.club_restriction && (
                              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 text-blue-600 mr-2" />
                                  <span className="text-sm font-medium text-blue-800">
                                    Registration Access: {
                                      selectedTournament.club_restriction === 'open' 
                                        ? 'Open to All Clubs' 
                                        : `Restricted to ${selectedTournament.club_restriction}`
                                    }
                                  </span>
                                </div>
                                {!isSuperAdmin && selectedTournament.club_restriction !== 'open' && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    As a club admin, you can only manage users from your club for this tournament.
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Quick Actions */}
                      <div className="flex flex-wrap gap-3 mb-6">
                              <button
                                onClick={() => {
                                  setRegistrationClubFilter(null);
                                  setRegistrationSearch('');
                                }}
                                className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
                              >
                                <Users className="w-4 h-4 mr-2" />
                                View All Users
                              </button>
                              <button
                                onClick={() => {
                                  const availableUsers = getAvailableUsers();
                                  if (availableUsers.length > 0) {
                                    handleRegisterUsers(availableUsers.map(u => u.member_id));
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                                disabled={getAvailableUsers().length === 0}
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Register All Available
                              </button>
                            </div>

                            {/* Search and Filter */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div>
                                <label className="block text-sm font-medium text-neutral-600 mb-1">Search Users</label>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                  <input
                                    type="text"
                                    value={registrationSearch}
                                    onChange={e => setRegistrationSearch(e.target.value)}
                                    placeholder="Search by name, email, or club..."
                                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-neutral-600 mb-1">Filter by Club</label>
                                <select
                                  value={registrationClubFilter || ''}
                                  onChange={e => setRegistrationClubFilter(e.target.value || null)}
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                                >
                                  <option value="">All Clubs</option>
                                  {(() => {
                                    const clubs = getAllClubs();
                                    // Filter clubs based on tournament restrictions and user role
                                    const availableClubs = clubs.filter(club => {
                                      if (selectedTournament.club_restriction === 'open') {
                                        return true; // Show all clubs for open tournaments
                                      }
                                      if (selectedTournament.club_restriction === club) {
                                        return true; // Show the specific club
                                      }
                                      if (!isSuperAdmin && club === currentUser?.club) {
                                        return true; // Club admins can see their club
                                      }
                                      return false;
                                    });
                                    return availableClubs.map(club => (
                                      <option key={club} value={club}>{club}</option>
                                    ));
                                  })()}
                                </select>
                              </div>
                            </div>

                            {/* Club Registration Progress */}
                            <div className="mb-6">
                              <h5 className="text-sm font-medium text-neutral-700 mb-3">Club Registration Progress</h5>
                              <div className="flex flex-wrap gap-3">
                        <div
                          onClick={() => setRegistrationClubFilter(null)}
                                  className={`cursor-pointer flex flex-col items-center px-4 py-3 rounded-lg border transition-all ${
                                    registrationClubFilter === null 
                                      ? 'bg-brand-neon-green/80 border-brand-neon-green text-brand-black shadow-md' 
                                      : 'bg-neutral-50 border-neutral-300 text-neutral-700 hover:bg-brand-neon-green/30 hover:border-brand-neon-green'
                                  }`}
                                  style={{ minWidth: 120 }}
                                >
                                  <span className="font-medium">All Clubs</span>
                                  <div className="text-sm text-neutral-600 mt-1">
                                    {tournamentParticipants.length} / {users.length}
                                  </div>
                        </div>
                        {getAllClubs().map(club => {
                          const total = getTotalUsersInClub(club);
                          const registered = getRegisteredUsersInClub(club);
                          const percent = total > 0 ? Math.round((registered / total) * 100) : 0;
                          return (
                            <div
                              key={club}
                              onClick={() => setRegistrationClubFilter(club)}
                                      className={`cursor-pointer flex flex-col items-center px-4 py-3 rounded-lg border transition-all ${
                                        registrationClubFilter === club 
                                          ? 'bg-brand-neon-green/80 border-brand-neon-green text-brand-black shadow-md' 
                                          : 'bg-neutral-50 border-neutral-300 text-neutral-700 hover:bg-brand-neon-green/30 hover:border-brand-neon-green'
                                      }`}
                                      style={{ minWidth: 120 }}
                                    >
                                      <span className="font-medium">{club}</span>
                                      <div className="w-full h-2 bg-neutral-200 rounded mt-2 mb-1">
                                        <div
                                          className="h-2 rounded transition-all duration-300"
                                          style={{ 
                                            width: `${percent}%`, 
                                            background: percent === 100 ? '#22c55e' : '#4ade80' 
                                          }}
                                />
                              </div>
                                      <div className="text-sm text-neutral-600">
                                        {registered}/{total} ({percent}%)
                                      </div>
                            </div>
                          );
                        })}
                      </div>
                      </div>

                            {/* Users Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                              <thead className="bg-neutral-50">
                                <tr>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">
                                    <input
                                      type="checkbox"
                                        checked={getAvailableUsersFiltered().length > 0 && selectedRegistrationUserIds.length === getAvailableUsersFiltered().length}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedRegistrationUserIds(getAvailableUsersFiltered().map(u => u.member_id));
                                        } else {
                                          setSelectedRegistrationUserIds([]);
                                        }
                                      }}
                                    />
                                  </th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Name</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Email</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Club</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Handicap</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getAvailableUsersFiltered().map(user => (
                                    <tr key={user.member_id} className="hover:bg-neutral-50">
                                      <td className="border border-neutral-300 px-4 py-3">
                                      <input
                                        type="checkbox"
                                        checked={selectedRegistrationUserIds.includes(user.member_id)}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setSelectedRegistrationUserIds(prev => [...prev, user.member_id]);
                                          } else {
                                            setSelectedRegistrationUserIds(prev => prev.filter(id => id !== user.member_id));
                                          }
                                        }}
                                      />
                                    </td>
                                      <td className="border border-neutral-300 px-4 py-3 font-medium">
                                      {user.first_name} {user.last_name}
                                    </td>
                                      <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                                        {user.email}
                                      </td>
                                      <td className="border border-neutral-300 px-4 py-3">
                                        <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-sm rounded">
                                          {user.club}
                                        </span>
                                      </td>
                                      <td className="border border-neutral-300 px-4 py-3 text-neutral-600">
                                        {user.handicap ? user.handicap : 'N/A'}
                                      </td>
                                      <td className="border border-neutral-300 px-4 py-3">
                                        <button
                                          onClick={() => handleRegisterUsers([user.member_id])}
                                          className="px-3 py-1 bg-brand-neon-green text-brand-black text-sm rounded hover:bg-green-400 transition-colors"
                                        >
                                          Register
                                        </button>
                                      </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                            
                          {getAvailableUsersFiltered().length === 0 && (
                              <div className="text-center py-8 text-neutral-600">
                                <Users className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                                <p>No available users found.</p>
                                <p className="text-sm">Try adjusting your search or club filter.</p>
                              </div>
                            )}
                            
                            {selectedRegistrationUserIds.length > 0 && (
                              <div className="flex justify-end mt-4">
                            <button
                              onClick={() => handleRegisterUsers(selectedRegistrationUserIds)}
                                  className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors flex items-center"
                            >
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Register {selectedRegistrationUserIds.length} Selected
                            </button>
                          </div>
                      )}
                          </div>
                    </div>
                  )}
                  {activeTab === 'checkin' && (
                        <div className="space-y-6">
                          {/* Check-in Overview */}
                          <div className="bg-white rounded-xl p-6 border border-neutral-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-brand-black">Payment Management</h4>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-neutral-600">
                                  {tournamentCheckIns.filter(c => c.status === 'checked_in').length} checked in
                                </span>
                                <span className="text-sm text-neutral-600">
                                  / {tournamentParticipants.length} registered
                                </span>
                              </div>
                            </div>

                            {/* Info Note for Simulator Tournaments */}
                            {!shouldShowCheckIn() && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">
                                      Simulator Tournament
                                    </h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                      <p>
                                        This appears to be a simulator tournament. Payment tracking functionality is typically used for tournaments where entry fees need to be collected.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Check-in Status Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-green-600">
                                      {tournamentCheckIns.filter(c => c.status === 'checked_in').length}
                                    </div>
                                    <div className="text-sm text-green-700">Checked In</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-yellow-600">
                                      {tournamentParticipants.length - tournamentCheckIns.filter(c => c.status === 'checked_in').length}
                                    </div>
                                    <div className="text-sm text-yellow-700">Pending Payment</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                      {tournamentCheckIns.filter(c => c.status === 'checked_out').length}
                                    </div>
                                    <div className="text-sm text-blue-700">Checked Out</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <Users className="w-5 h-5 text-neutral-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-neutral-600">
                                      {tournamentParticipants.length}
                                    </div>
                                    <div className="text-sm text-neutral-700">Total Registered</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Check-in Progress Bar */}
                            <div className="mb-6">
                              <div className="flex justify-between text-sm text-neutral-600 mb-2">
                                <span>Payment Progress</span>
                                <span>
                                  {tournamentParticipants.length > 0 
                                    ? Math.round((tournamentCheckIns.filter(c => c.status === 'checked_in').length / tournamentParticipants.length) * 100)
                                    : 0}%
                                </span>
                              </div>
                              <div className="w-full bg-neutral-200 rounded-full h-3">
                                <div 
                                  className="h-3 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${tournamentParticipants.length > 0 
                                      ? (tournamentCheckIns.filter(c => c.status === 'checked_in').length / tournamentParticipants.length) * 100
                                      : 0}%`,
                                    background: '#22c55e'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-3 mb-6">
                      <button
                                onClick={() => {
                                  const notCheckedIn = tournamentParticipants.filter(p => 
                                    !tournamentCheckIns.find(c => c.user_member_id === p.user_member_id && c.status === 'checked_in')
                                  );
                                  if (notCheckedIn.length > 0) {
                                    handleCheckInUsers(notCheckedIn.map(p => p.user_member_id));
                                  }
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
                                disabled={tournamentParticipants.filter(p => 
                                  !tournamentCheckIns.find(c => c.user_member_id === p.user_member_id && c.status === 'checked_in')
                                ).length === 0}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark All as Paid
                      </button>
                              
                              <button
                                onClick={() => {
                                  const checkedIn = tournamentCheckIns.filter(c => c.status === 'checked_in');
                                  if (checkedIn.length > 0) {
                                    checkedIn.forEach(c => handleCheckOutUser(c.user_member_id));
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                                disabled={tournamentCheckIns.filter(c => c.status === 'checked_in').length === 0}
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Mark All as Unpaid
                              </button>
                            </div>

                            {/* Participants Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                                <thead className="bg-neutral-50">
                                  <tr>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Name</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Club</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Payment Status</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Score Submitted</th>
                                    <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Payout</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tournamentParticipants.map(participant => {
                                    const checkIn = tournamentCheckIns.find(c => c.user_member_id === participant.user_member_id);
                                    const isCheckedIn = checkIn && checkIn.status === 'checked_in';
                                    const isCheckedOut = checkIn && checkIn.status === 'checked_out';
                                    const hasScore = tournamentScores.find(s => s.user_id === participant.user_member_id);
                                    const payout = tournamentPayouts.find(p => p.user_member_id === participant.user_member_id);
                                    
                                    return (
                                      <tr key={participant.user_member_id} className="hover:bg-neutral-50">
                                        <td className="border border-neutral-300 px-4 py-3 font-medium">
                                          {participant.first_name} {participant.last_name}
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-sm rounded">
                                            {participant.club}
                                          </span>
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          <div className="flex items-center space-x-2">
                                            {isCheckedIn ? (
                                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                                Paid
                                              </span>
                                            ) : isCheckedOut ? (
                                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                Unpaid
                                              </span>
                                            ) : (
                                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                Unpaid
                                              </span>
                                            )}
                                            <div className="flex space-x-1">
                                              {!isCheckedIn && (
                                                <button
                                                  onClick={() => handleCheckInUsers([participant.user_member_id])}
                                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                                  title="Mark as Paid"
                                                >
                                                  ✓
                                                </button>
                                              )}
                                              {isCheckedIn && (
                                                <button
                                                  onClick={() => handleCheckOutUser(participant.user_member_id)}
                                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                                                  title="Mark as Unpaid"
                                                >
                                                  ✗
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          {hasScore ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              <CheckCircle className="w-3 h-3 inline mr-1" />
                                              Submitted
                                            </span>
                                          ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                              <Clock className="w-3 h-3 inline mr-1" />
                                              Pending
                                            </span>
                                          )}
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          {payout ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              <CheckCircle className="w-3 h-3 inline mr-1" />
                                              ${payout.amount}
                                            </span>
                                          ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                              <Clock className="w-3 h-3 inline mr-1" />
                                              TBD
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                  )}
                  {activeTab === 'matches' && (
                        <div className="space-y-6">
                          {/* Matches Overview */}
                          <div className="bg-white rounded-xl p-6 border border-neutral-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-brand-black">Match Management</h4>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-neutral-600">
                                  {tournamentMatches.filter(m => m.status === 'completed').length} completed
                                </span>
                                <span className="text-sm text-neutral-600">
                                  / {tournamentMatches.length} total
                                </span>
                              </div>
                            </div>

                            {/* Match Status Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-green-600">
                                      {tournamentMatches.filter(m => m.status === 'completed').length}
                                    </div>
                                    <div className="text-sm text-green-700">Completed</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-yellow-600">
                                      {tournamentMatches.filter(m => m.status === 'pending').length}
                                    </div>
                                    <div className="text-sm text-yellow-700">Pending</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                      {tournamentParticipants.length}
                                    </div>
                                    <div className="text-sm text-blue-700">Participants</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <Trophy className="w-5 h-5 text-purple-600 mr-2" />
                                  <div>
                                    <div className="text-2xl font-bold text-purple-600">
                                      {Math.ceil(tournamentMatches.length / 2)}
                                    </div>
                                    <div className="text-sm text-purple-700">Rounds</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Match Generation Section */}
                            {tournamentMatches.length === 0 && (
                              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200 mb-6">
                                <div className="flex items-center mb-4">
                                  <Trophy className="w-5 h-5 text-purple-600 mr-2" />
                                  <h5 className="text-lg font-semibold text-purple-900">Generate Tournament Matches</h5>
                                </div>
                                <p className="text-purple-700 mb-4">
                                  Create match pairings for your tournament. You can choose from different generation formats.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-2">Generation Format</label>
                                    <select
                                      value={matchGenerationForm.format}
                                      onChange={e => setMatchGenerationForm({ ...matchGenerationForm, format: e.target.value })}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                      <option value="optimized">Optimized (Balanced)</option>
                                      <option value="random">Random</option>
                                      <option value="seeded">Seeded (by Handicap)</option>
                                      <option value="round_robin">Round Robin</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-2">Min Matches Per Player</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={matchGenerationForm.minMatchesPerPlayer}
                                      onChange={e => setMatchGenerationForm({ ...matchGenerationForm, minMatchesPerPlayer: parseInt(e.target.value) })}
                                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-3">
                      <button
                                    onClick={handleGenerateMatches}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
                                    disabled={tournamentParticipants.length < 2}
                      >
                                    <Trophy className="w-4 h-4 mr-2" />
                        Generate Matches
                      </button>
                                  
                                  {tournamentParticipants.length < 2 && (
                                    <div className="flex items-center text-sm text-purple-600">
                                      <Clock className="w-4 h-4 mr-2" />
                                      Need at least 2 participants to generate matches
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Match Progress */}
                            {tournamentMatches.length > 0 && (
                              <div className="mb-6">
                                <div className="flex justify-between text-sm text-neutral-600 mb-2">
                                  <span>Match Progress</span>
                                  <span>
                                    {tournamentMatches.length > 0 
                                      ? Math.round((tournamentMatches.filter(m => m.status === 'completed').length / tournamentMatches.length) * 100)
                                      : 0}%
                                  </span>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-3">
                                  <div 
                                    className="h-3 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${tournamentMatches.length > 0 
                                        ? (tournamentMatches.filter(m => m.status === 'completed').length / tournamentMatches.length) * 100
                                        : 0}%`,
                                      background: '#22c55e'
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Quick Actions */}
                            {tournamentMatches.length > 0 && (
                              <div className="flex flex-wrap gap-3 mb-6">
                                <button
                                  onClick={() => setShowMatchGenerationModal(true)}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
                                >
                                  <Trophy className="w-4 h-4 mr-2" />
                                  Regenerate Matches
                                </button>
                                
                                <button
                                  onClick={() => {
                                    const pendingMatches = tournamentMatches.filter(m => m.status === 'pending');
                                    if (pendingMatches.length > 0) {
                                      // Auto-complete all pending matches (for testing)
                                      pendingMatches.forEach(match => {
                                        handleUpdateMatchResult(match.id, match.player1_id);
                                      });
                                    }
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
                                  disabled={tournamentMatches.filter(m => m.status === 'pending').length === 0}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Complete All Pending
                                </button>
                </div>
              )}

                            {/* Matches Table */}
                            {tournamentMatches.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                                  <thead className="bg-neutral-50">
                                    <tr>
                                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Match #</th>
                                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Player 1</th>
                                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Player 2</th>
                                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Status</th>
                                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Winner</th>
                                      <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tournamentMatches.map(match => (
                                      <tr key={match.id} className="hover:bg-neutral-50">
                                        <td className="border border-neutral-300 px-4 py-3 font-medium">
                                          #{match.match_number}
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          <div className="font-medium">
                                            {match.player1_first_name} {match.player1_last_name}
            </div>
                                          <div className="text-sm text-neutral-600">
                                            {match.player1_club}
          </div>
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          <div className="font-medium">
                                            {match.player2_first_name} {match.player2_last_name}
        </div>
                                          <div className="text-sm text-neutral-600">
                                            {match.player2_club}
                                          </div>
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          {match.status === 'completed' ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              <CheckCircle className="w-3 h-3 inline mr-1" />
                                              Completed
                                            </span>
                                          ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                              <Clock className="w-3 h-3 inline mr-1" />
                                              Pending
                                            </span>
                                          )}
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          {match.winner_first_name ? (
                                            <div className="font-medium text-green-600">
                                              {match.winner_first_name} {match.winner_last_name}
                                            </div>
                                          ) : (
                                            <span className="text-neutral-500">Not decided</span>
                                          )}
                                        </td>
                                        <td className="border border-neutral-300 px-4 py-3">
                                          {match.status === 'pending' ? (
                                            <div className="flex space-x-2">
                                              <button
                                                onClick={() => handleUpdateMatchResult(match.id, match.player1_id)}
                                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                              >
                                                {match.player1_first_name} Wins
                                              </button>
                                              <button
                                                onClick={() => handleUpdateMatchResult(match.id, match.player2_id)}
                                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                              >
                                                {match.player2_first_name} Wins
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-sm text-neutral-500">Completed</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                                  <Trophy className="w-8 h-8 text-neutral-400" />
                                </div>
                                <h3 className="text-lg font-medium text-neutral-900 mb-2">No matches generated yet</h3>
                                <p className="text-neutral-600 mb-4">
                                  Generate matches to start the tournament competition.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {activeTab === 'tracking' && (
                        <div className="space-y-6">
                          <div className="bg-white rounded-xl p-6 border border-neutral-200">
                            <div className="text-center py-8">
                              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-xl font-medium text-gray-900 mb-2">User Tracking Dashboard</h3>
                              <p className="text-gray-600 mb-4">
                                View detailed user tracking statistics and analytics.
                              </p>
                              <a
                                href="/user-tracking"
                                className="inline-flex items-center px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
                              >
                                <BarChart3 className="w-5 h-5 mr-2" />
                                Open User Tracking Dashboard
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tournament Overview (when no tournament selected) */}
              {!selectedTournament && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl p-6 border border-neutral-200">
                    <h4 className="text-lg font-semibold text-brand-black mb-4">Tournament Overview</h4>
                    <p className="text-neutral-600 mb-6">Select a tournament from the dropdown above to manage it, or create a new tournament to get started.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tournaments.map(tournament => {
                        const stats = statsByTournamentId[tournament.id] || {};
                        return (
                          <div
                            key={tournament.id}
                            className="p-4 border border-neutral-200 rounded-lg hover:border-brand-neon-green transition-colors cursor-pointer"
                            onClick={() => setSelectedTournament(tournament)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-brand-black">{tournament.name}</h5>
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
                            
                            <div className="text-sm text-neutral-600 mb-3">
                              <div className="capitalize">{tournament.type}</div>
                              <div className="text-xs">{tournament.tournament_format || 'match_play'}</div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <div className="font-semibold text-brand-black">{stats.total_participants || 0}</div>
                                <div className="text-neutral-500">Participants</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-brand-black">{stats.checked_in_count || 0}</div>
                                <div className="text-neutral-500">Checked In</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-brand-black">{stats.total_matches || 0}</div>
                                <div className="text-neutral-500">Matches</div>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex items-center justify-between">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${tournament.registration_open ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                {tournament.registration_open ? 'Registration Open' : 'Registration Closed'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTournament(tournament);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {tournaments.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                          <Trophy className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 mb-2">No tournaments yet</h3>
                        <p className="text-neutral-600 mb-4">
                          Create your first tournament to get started with tournament management.
                        </p>
                        <button
                          onClick={() => setShowTournamentForm(true)}
                          className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
                        >
                          Create Tournament
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* User Tracking Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">User Tracking Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  View detailed user tracking statistics and analytics.
                </p>
                <a
                  href="/user-tracking"
                  className="inline-flex items-center px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Open User Tracking Dashboard
                </a>
              </div>
            </div>
          </div>


        </div>
      </div>

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
              {/* Template Selection Section */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <Trophy className="w-5 h-5 text-brand-neon-green mr-2" />
                  <h4 className="text-lg font-semibold text-brand-black">Choose a Template (Optional)</h4>
                </div>
                <p className="text-sm text-neutral-600 mb-4">
                  Select a template to pre-fill common tournament settings, or start with a custom tournament.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tournamentTemplates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="p-4 bg-white rounded-lg border border-neutral-200 hover:border-brand-neon-green hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{template.icon}</span>
                        <h5 className="font-medium text-brand-black group-hover:text-brand-neon-green transition-colors">
                          {template.name}
                        </h5>
                      </div>
                      <p className="text-sm text-neutral-600">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

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
                      {!isSuperAdmin && (
                        <option value={currentUser?.club || 'club_specific'}>
                          {currentUser?.club || 'My Club Only'}
                        </option>
                      )}
                      {isSuperAdmin && (
                        <>
                          <option value="club_specific">Specific Club</option>
                          {getAllClubs().map(club => (
                            <option key={club} value={club}>{club}</option>
                          ))}
                        </>
                      )}
                  </select>
              </div>
              
                  {tournamentForm.club_restriction === 'club_specific' && isSuperAdmin && (
              <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Select Club</label>
                      <select
                        value={tournamentForm.club_restriction}
                        onChange={e => setTournamentForm({ ...tournamentForm, club_restriction: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                      >
                        <option value="club_specific">Choose a club...</option>
                        {getAllClubs().map(club => (
                          <option key={club} value={club}>{club}</option>
                        ))}
                      </select>
              </div>
                  )}
                  
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Current Setting:</strong> {
                        tournamentForm.club_restriction === 'open' 
                          ? 'Open to all clubs' 
                          : tournamentForm.club_restriction === 'club_specific'
                          ? 'Please select a specific club'
                          : `Restricted to ${tournamentForm.club_restriction}`
                      }
                    </p>
                    {!isSuperAdmin && (
                      <p className="text-xs text-blue-600 mt-1">
                        As a club admin, you can only create tournaments for your club or open tournaments.
                      </p>
                    )}
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
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editTournamentForm.entry_fee}
                    onChange={e => setEditTournamentForm({ ...editTournamentForm, entry_fee: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
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

      {/* Check-in Modal */}
      {showCheckInModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-brand-black mb-4">
              Mark Players as Paid for {selectedTournament.name}
            </h3>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="border border-neutral-300 px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={getRegisteredNotCheckedIn().length > 0 && selectedCheckInUserIds.length === getRegisteredNotCheckedIn().length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCheckInUserIds(getRegisteredNotCheckedIn().map(u => u.user_member_id));
                            } else {
                              setSelectedCheckInUserIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="border border-neutral-300 px-4 py-2 text-left">Name</th>
                      <th className="border border-neutral-300 px-4 py-2 text-left">Email</th>
                      <th className="border border-neutral-300 px-4 py-2 text-left">Club</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRegisteredNotCheckedIn().map(participant => (
                      <tr key={participant.user_member_id}>
                        <td className="border border-neutral-300 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedCheckInUserIds.includes(participant.user_member_id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedCheckInUserIds(prev => [...prev, participant.user_member_id]);
                              } else {
                                setSelectedCheckInUserIds(prev => prev.filter(id => id !== participant.user_member_id));
                              }
                            }}
                          />
                        </td>
                        <td className="border border-neutral-300 px-4 py-2">
                          {participant.first_name} {participant.last_name}
                        </td>
                        <td className="border border-neutral-300 px-4 py-2">{participant.email}</td>
                        <td className="border border-neutral-300 px-4 py-2">{participant.club}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {getRegisteredNotCheckedIn().length === 0 && (
                <p className="text-center text-neutral-600 py-4">
                  All registered players are already marked as paid.
                </p>
              )}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCheckInUsers(selectedCheckInUserIds)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  disabled={selectedCheckInUserIds.length === 0}
                >
                  Mark Selected as Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Notes Modal */}
      {selectedUserForCheckIn && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">
              Mark {selectedUserForCheckIn.first_name} {selectedUserForCheckIn.last_name} as Paid
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Notes (Optional)</label>
                <textarea
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={3}
                  placeholder="Any special notes for this payment..."
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  onClick={() => {
                    setSelectedUserForCheckIn(null);
                    setCheckInNotes('');
                  }}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCheckInUsers(selectedCheckInUserIds)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Mark as Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Generation Modal */}
      {showMatchGenerationModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-brand-black mb-4">
              Generate Matches for {selectedTournament.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Format</label>
                <select
                  value={matchGenerationForm.format}
                  onChange={(e) => setMatchGenerationForm({ ...matchGenerationForm, format: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="optimized">Optimized (Recommended)</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="random_pairs">Random Pairs</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Minimum Matches Per Player</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={matchGenerationForm.minMatchesPerPlayer}
                  onChange={(e) => setMatchGenerationForm({ ...matchGenerationForm, minMatchesPerPlayer: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Note: This setting is only applicable for optimized format
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Checked-in Players:</strong> {getCheckedInPlayersCount()}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Format:</strong> {matchGenerationForm.format.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  onClick={() => setShowMatchGenerationModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateMatches}
                  disabled={getCheckedInPlayersCount() < 2}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    getCheckedInPlayersCount() >= 2
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  Generate Matches
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin; 