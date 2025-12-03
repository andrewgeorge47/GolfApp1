import React, { useState, useEffect } from 'react';
import { Trophy, Users, Settings, Plus, Search, MapPin } from 'lucide-react';
import {
  createTournament,
  updateTournament,
  getSimulatorCourses,
  getAllClubs,
  getPublicRegistrationTemplates,
  type RegistrationFormTemplate
} from '../services/api';
import { toast } from 'react-toastify';
import LeagueSettings from './LeagueSettings';

interface TournamentFormProps {
  mode: 'create' | 'edit';
  tournament?: any;
  onSuccess: () => void;
  onCancel: () => void;
  currentUser?: any;
}

interface LeagueConfig {
  // Basic league info
  name: string;
  description: string;
  
  // Season configuration
  season_start_date: string;
  season_end_date: string;
  auto_progression: boolean;
  
  // Scoring configuration
  min_matches_per_week: number;
  max_matches_per_week: number;
  live_match_bonus: number;
  tie_break_rules: string;
  
  // Participant management
  max_participants: number;
  min_participants: number;
  registration_open: boolean;
  
  // Week configuration
  week_start_day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  scoring_deadline_hours: number;
  
  // Advanced settings
  playoff_enabled: boolean;
  playoff_weeks: number;
  drop_worst_weeks: number;
}

const TournamentForm: React.FC<TournamentFormProps> = ({
  mode,
  tournament,
  onSuccess,
  onCancel,
  currentUser
}) => {
  // Helper function to format date for HTML input
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    name: tournament?.name || '',
    description: tournament?.description || '',
    start_date: formatDateForInput(tournament?.start_date),
    end_date: formatDateForInput(tournament?.end_date),
    registration_deadline: formatDateForInput(tournament?.registration_deadline),
    max_participants: tournament?.max_participants?.toString() || '',
    min_participants: tournament?.min_participants?.toString() || '2',
    tournament_format: tournament?.tournament_format || 'match_play',
    status: tournament?.status || 'draft',
    registration_open: tournament?.registration_open ?? true,
    entry_fee: tournament?.entry_fee?.toString() || '0',
    location: tournament?.location || '',
    course: tournament?.course || '',
    course_id: tournament?.course_id || '',
    // Platform-specific course selections
    gspro_course: tournament?.gspro_course || '',
    gspro_course_id: tournament?.gspro_course_id || '',
    trackman_course: tournament?.trackman_course || '',
    trackman_course_id: tournament?.trackman_course_id || '',
    rules: tournament?.rules || '',
    notes: tournament?.notes || '',
    type: tournament?.type || 'tournament',
    club_restriction: tournament?.club_restriction || 'open',
    team_size: tournament?.team_size?.toString() || '4',
    hole_configuration: tournament?.hole_configuration?.toString() || '18',
    // Payment settings
    payment_organizer: tournament?.payment_organizer || '',
    payment_organizer_name: tournament?.payment_organizer_name || '',
    payment_venmo_url: tournament?.payment_venmo_url || '',
    // Simulator settings
    tee: tournament?.tee || 'Red',
    pins: tournament?.pins || 'Friday',
    putting_gimme: tournament?.putting_gimme || '8',
    elevation: tournament?.elevation || 'Course',
    stimp: tournament?.stimp || '11',
    mulligan: tournament?.mulligan || 'No',
    game_play: tournament?.game_play || 'Force Realistic',
    firmness: tournament?.firmness || 'Normal',
    wind: tournament?.wind || 'None',
    handicap_enabled: tournament?.handicap_enabled || false,
    // Registration form settings
    has_registration_form: tournament?.has_registration_form || false,
    registration_form_template: tournament?.registration_form_template || '',
    registration_form_data: tournament?.registration_form_data || null,
    // NEW: Championship settings
    tournament_series: tournament?.tournament_series || 'regular',
    is_club_championship: tournament?.is_club_championship || false,
    is_national_tournament: tournament?.is_national_tournament || false,
    championship_round: tournament?.championship_round || 1,
    championship_club: tournament?.championship_club || '',
    parent_tournament_id: tournament?.parent_tournament_id || '',
    championship_type: tournament?.championship_type || 'single_club',
    participating_clubs: tournament?.participating_clubs || '',
    min_club_participants: tournament?.min_club_participants || '4',
    auto_group_clubs: tournament?.auto_group_clubs || false,
    auto_seed_champions: tournament?.auto_seed_champions || false
  });

  // Course selector state
  const [simulatorCourses, setSimulatorCourses] = useState<any[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  
  // Platform-specific course selection state
  const [gsproCourses, setGsproCourses] = useState<any[]>([]);
  const [trackmanCourses, setTrackmanCourses] = useState<any[]>([]);
  const [gsproSearchTerm, setGsproSearchTerm] = useState('');
  const [trackmanSearchTerm, setTrackmanSearchTerm] = useState('');
  const [showGsproDropdown, setShowGsproDropdown] = useState(false);
  const [showTrackmanDropdown, setShowTrackmanDropdown] = useState(false);
  const [filteredGsproCourses, setFilteredGsproCourses] = useState<any[]>([]);
  const [filteredTrackmanCourses, setFilteredTrackmanCourses] = useState<any[]>([]);
  const [selectedGsproCourse, setSelectedGsproCourse] = useState<any>(null);
  const [selectedTrackmanCourse, setSelectedTrackmanCourse] = useState<any>(null);
  const [gsproLoading, setGsproLoading] = useState(false);
  const [trackmanLoading, setTrackmanLoading] = useState(false);

  // Club selection state
  const [clubs, setClubs] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [clubSearchTerm, setClubSearchTerm] = useState('');
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [filteredClubs, setFilteredClubs] = useState<string[]>([]);

  // Registration templates state
  const [registrationTemplates, setRegistrationTemplates] = useState<RegistrationFormTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // League configuration state
  const [leagueConfig, setLeagueConfig] = useState<LeagueConfig>({
    name: tournament?.league_config?.name || 'Weekly Golf League',
    description: tournament?.league_config?.description || '',
    season_start_date: tournament?.league_config?.season_start_date || '',
    season_end_date: tournament?.league_config?.season_end_date || '',
    auto_progression: tournament?.league_config?.auto_progression || false,
    min_matches_per_week: tournament?.league_config?.min_matches_per_week || 3,
    max_matches_per_week: tournament?.league_config?.max_matches_per_week || 5,
    live_match_bonus: tournament?.league_config?.live_match_bonus || 1,
    tie_break_rules: tournament?.league_config?.tie_break_rules || 'total_points',
    max_participants: tournament?.league_config?.max_participants || 50,
    min_participants: tournament?.league_config?.min_participants || 8,
    registration_open: tournament?.league_config?.registration_open || true,
    week_start_day: tournament?.league_config?.week_start_day || 'monday',
    scoring_deadline_hours: tournament?.league_config?.scoring_deadline_hours || 72,
    playoff_enabled: tournament?.league_config?.playoff_enabled || false,
    playoff_weeks: tournament?.league_config?.playoff_weeks || 2,
    drop_worst_weeks: tournament?.league_config?.drop_worst_weeks || 0
  });

  // Load simulator courses and registration templates
  useEffect(() => {
    const fetchSimulatorCourses = async () => {
      try {
        setCourseLoading(true);
        const response = await getSimulatorCourses(undefined, undefined, 10000);
        setSimulatorCourses(response.data.courses || []);
      } catch (error) {
        console.error('Error fetching simulator courses:', error);
      } finally {
        setCourseLoading(false);
      }
    };

    const fetchClubs = async () => {
      try {
        const response = await getAllClubs();
        setClubs(response.data || []);
        setFilteredClubs(response.data || []);
      } catch (error) {
        console.error('Error fetching clubs:', error);
        toast.error('Failed to load clubs');
      }
    };

    const fetchRegistrationTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const response = await getPublicRegistrationTemplates();
        setRegistrationTemplates(response.data);
      } catch (error) {
        console.error('Error fetching registration templates:', error);
        toast.error('Failed to load registration templates');
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchSimulatorCourses();
    fetchClubs();
    fetchRegistrationTemplates();
  }, []);

  // Load platform-specific courses
  useEffect(() => {
    const fetchPlatformCourses = async () => {
      try {
        // Fetch GSPro courses
        setGsproLoading(true);
        const gsproResponse = await getSimulatorCourses(undefined, 'gspro', 10000);
        setGsproCourses(gsproResponse.data.courses || []);
        setGsproLoading(false);

        // Fetch Trackman courses
        setTrackmanLoading(true);
        const trackmanResponse = await getSimulatorCourses(undefined, 'trackman', 10000);
        setTrackmanCourses(trackmanResponse.data.courses || []);
        setTrackmanLoading(false);
      } catch (error) {
        console.error('Error fetching platform courses:', error);
        setGsproLoading(false);
        setTrackmanLoading(false);
      }
    };

    fetchPlatformCourses();
  }, []);

  // Initialize course selection when editing
  useEffect(() => {
    if (mode === 'edit' && tournament?.course_id && simulatorCourses.length > 0) {
      const existingCourse = simulatorCourses.find(course => course.id === tournament.course_id);
      if (existingCourse) {
        setSelectedCourse(existingCourse);
        setCourseSearchTerm(existingCourse.name);
      }
    }
  }, [mode, tournament, simulatorCourses]);

  // Initialize GSPro course selection when editing
  useEffect(() => {
    if (mode === 'edit' && tournament?.gspro_course_id && gsproCourses.length > 0) {
      console.log('Initializing GSPro course:', { tournament: tournament.gspro_course_id, gsproCourses: gsproCourses.length });
      const existingGsproCourse = gsproCourses.find(course => course.id === tournament.gspro_course_id);
      if (existingGsproCourse) {
        console.log('Found GSPro course:', existingGsproCourse);
        setSelectedGsproCourse(existingGsproCourse);
        setGsproSearchTerm(existingGsproCourse.name);
      } else {
        console.log('GSPro course not found in available courses');
      }
    }
  }, [mode, tournament, gsproCourses]);

  // Initialize Trackman course selection when editing
  useEffect(() => {
    if (mode === 'edit' && tournament?.trackman_course_id && trackmanCourses.length > 0) {
      console.log('Initializing Trackman course:', { tournament: tournament.trackman_course_id, trackmanCourses: trackmanCourses.length });
      const existingTrackmanCourse = trackmanCourses.find(course => course.id === tournament.trackman_course_id);
      if (existingTrackmanCourse) {
        console.log('Found Trackman course:', existingTrackmanCourse);
        setSelectedTrackmanCourse(existingTrackmanCourse);
        setTrackmanSearchTerm(existingTrackmanCourse.name);
      } else {
        console.log('Trackman course not found in available courses');
      }
    }
  }, [mode, tournament, trackmanCourses]);

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

  // Filter GSPro courses based on search term
  useEffect(() => {
    if (gsproSearchTerm.trim()) {
      const filtered = gsproCourses.filter(course =>
        course.name.toLowerCase().includes(gsproSearchTerm.toLowerCase()) ||
        (course.location && course.location.toLowerCase().includes(gsproSearchTerm.toLowerCase())) ||
        (course.designer && course.designer.toLowerCase().includes(gsproSearchTerm.toLowerCase()))
      ).slice(0, 10);
      setFilteredGsproCourses(filtered);
    } else {
      setFilteredGsproCourses([]);
    }
  }, [gsproSearchTerm, gsproCourses]);

  // Filter Trackman courses based on search term
  useEffect(() => {
    if (trackmanSearchTerm.trim()) {
      const filtered = trackmanCourses.filter(course =>
        course.name.toLowerCase().includes(trackmanSearchTerm.toLowerCase()) ||
        (course.location && course.location.toLowerCase().includes(trackmanSearchTerm.toLowerCase())) ||
        (course.designer && course.designer.toLowerCase().includes(trackmanSearchTerm.toLowerCase()))
      ).slice(0, 10);
      setFilteredTrackmanCourses(filtered);
    } else {
      setFilteredTrackmanCourses([]);
    }
  }, [trackmanSearchTerm, trackmanCourses]);

  // Filter clubs based on search term
  useEffect(() => {
    if (clubSearchTerm.trim()) {
      const filtered = clubs.filter(club =>
        club.toLowerCase().includes(clubSearchTerm.toLowerCase())
      );
      setFilteredClubs(filtered);
    } else {
      setFilteredClubs(clubs);
    }
  }, [clubSearchTerm, clubs]);

  // Handle clicking outside course dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.course-dropdown-container')) {
        setShowCourseDropdown(false);
      }
      if (!target.closest('.gspro-dropdown-container')) {
        setShowGsproDropdown(false);
      }
      if (!target.closest('.trackman-dropdown-container')) {
        setShowTrackmanDropdown(false);
      }
      if (!target.closest('.club-dropdown-container')) {
        setShowClubDropdown(false);
      }
    };

    if (showCourseDropdown || showGsproDropdown || showTrackmanDropdown || showClubDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCourseDropdown, showGsproDropdown, showTrackmanDropdown, showClubDropdown]);

  // Initialize selected clubs from form data
  useEffect(() => {
    if (tournamentForm.participating_clubs) {
      const clubsArray = tournamentForm.participating_clubs
        .split(',')
        .map((club: string) => club.trim())
        .filter((club: string) => club.length > 0);
      setSelectedClubs(clubsArray);
    }
  }, [tournamentForm.participating_clubs]);

  // Course selection handlers
  const handleCourseSelect = (course: any) => {
    setSelectedCourse(course);
    setTournamentForm(prev => ({
      ...prev,
      course: course.name,
      course_id: course.id.toString()
    }));
    setCourseSearchTerm(course.name);
    setShowCourseDropdown(false);
  };

  // Club selection handlers
  const handleClubToggle = (club: string) => {
    setSelectedClubs((prev: string[]) => {
      const newSelection = prev.includes(club) 
        ? prev.filter((c: string) => c !== club)
        : [...prev, club];
      
      setTournamentForm(prev => ({
        ...prev,
        participating_clubs: newSelection.join(', ')
      }));
      
      return newSelection;
    });
  };

  const handleClubSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClubSearchTerm(e.target.value);
    setShowClubDropdown(true);
  };

  const handleCourseSearchChange = (value: string) => {
    setCourseSearchTerm(value);
    setShowCourseDropdown(true);
    if (!value.trim()) {
      setSelectedCourse(null);
      setTournamentForm(prev => ({ ...prev, course: '', course_id: '' }));
    }
  };

  const clearCourseSelection = () => {
    setSelectedCourse(null);
    setCourseSearchTerm('');
    setTournamentForm(prev => ({ ...prev, course: '', course_id: '' }));
    setShowCourseDropdown(false);
  };

  // GSPro course selection handlers
  const handleGsproCourseSelect = (course: any) => {
    setSelectedGsproCourse(course);
    setTournamentForm(prev => ({
      ...prev,
      gspro_course: course.name,
      gspro_course_id: course.id.toString()
    }));
    setGsproSearchTerm(course.name);
    setShowGsproDropdown(false);
  };

  const handleGsproCourseSearchChange = (value: string) => {
    setGsproSearchTerm(value);
    setShowGsproDropdown(true);
    if (!value.trim()) {
      setSelectedGsproCourse(null);
      setTournamentForm(prev => ({ ...prev, gspro_course: '', gspro_course_id: '' }));
    }
  };

  const clearGsproCourseSelection = () => {
    setSelectedGsproCourse(null);
    setGsproSearchTerm('');
    setTournamentForm(prev => ({ ...prev, gspro_course: '', gspro_course_id: '' }));
    setShowGsproDropdown(false);
  };

  // Trackman course selection handlers
  const handleTrackmanCourseSelect = (course: any) => {
    setSelectedTrackmanCourse(course);
    setTournamentForm(prev => ({
      ...prev,
      trackman_course: course.name,
      trackman_course_id: course.id.toString()
    }));
    setTrackmanSearchTerm(course.name);
    setShowTrackmanDropdown(false);
  };

  const handleTrackmanCourseSearchChange = (value: string) => {
    setTrackmanSearchTerm(value);
    setShowTrackmanDropdown(true);
    if (!value.trim()) {
      setSelectedTrackmanCourse(null);
      setTournamentForm(prev => ({ ...prev, trackman_course: '', trackman_course_id: '' }));
    }
  };

  const clearTrackmanCourseSelection = () => {
    setSelectedTrackmanCourse(null);
    setTrackmanSearchTerm('');
    setTournamentForm(prev => ({ ...prev, trackman_course: '', trackman_course_id: '' }));
    setShowTrackmanDropdown(false);
  };

  // Handle registration form template selection
  const handleRegistrationTemplateSelect = (template: RegistrationFormTemplate) => {
    setTournamentForm(prev => ({
      ...prev,
      registration_form_template: template.template_key,
      registration_form_data: {
        name: template.name,
        description: template.description,
        questions: template.questions
      }
    }));
    toast.success(`Applied ${template.name} template`);
  };

  // Handle championship type changes
  const handleChampionshipTypeChange = (type: string) => {
    setTournamentForm(prev => ({
      ...prev,
      type,
      tournament_series: type === 'club_championship' ? 'club_championship' : 
                       type === 'national_championship' ? 'national_championship' : 'regular',
      is_club_championship: type === 'club_championship',
      is_national_tournament: type === 'national_championship',
      tournament_format: type === 'club_championship' ? 'match_play' : 
                        type === 'national_championship' ? 'match_play' : prev.tournament_format
    }));
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        course: selectedCourse ? selectedCourse.name : tournamentForm.course || undefined,
        course_id: tournamentForm.course_id ? parseInt(tournamentForm.course_id) : undefined,
        // Platform-specific course selections
        gspro_course: selectedGsproCourse ? selectedGsproCourse.name : tournamentForm.gspro_course || undefined,
        gspro_course_id: tournamentForm.gspro_course_id ? parseInt(tournamentForm.gspro_course_id) : undefined,
        trackman_course: selectedTrackmanCourse ? selectedTrackmanCourse.name : tournamentForm.trackman_course || undefined,
        trackman_course_id: tournamentForm.trackman_course_id ? parseInt(tournamentForm.trackman_course_id) : undefined,
        rules: tournamentForm.rules,
        notes: tournamentForm.notes,
        type: tournamentForm.type,
        club_restriction: tournamentForm.club_restriction,
        team_size: tournamentForm.team_size ? parseInt(tournamentForm.team_size) : undefined,
        hole_configuration: tournamentForm.hole_configuration,
        // Payment settings
        payment_organizer: tournamentForm.payment_organizer || undefined,
        payment_organizer_name: tournamentForm.payment_organizer_name || undefined,
        payment_venmo_url: tournamentForm.payment_venmo_url || undefined,
        // Simulator settings
        tee: tournamentForm.tee,
        pins: tournamentForm.pins,
        putting_gimme: tournamentForm.putting_gimme,
        elevation: tournamentForm.elevation,
        stimp: tournamentForm.stimp,
        mulligan: tournamentForm.mulligan,
        game_play: tournamentForm.game_play,
        firmness: tournamentForm.firmness,
        wind: tournamentForm.wind,
        handicap_enabled: tournamentForm.handicap_enabled,
        // Registration form settings
        has_registration_form: tournamentForm.has_registration_form,
        registration_form_template: tournamentForm.registration_form_template,
        registration_form_data: tournamentForm.registration_form_data,
        // NEW: Championship settings
        tournament_series: tournamentForm.tournament_series,
        is_club_championship: tournamentForm.is_club_championship,
        is_national_tournament: tournamentForm.is_national_tournament,
        championship_round: tournamentForm.championship_round,
        championship_club: tournamentForm.championship_club || undefined,
        parent_tournament_id: tournamentForm.parent_tournament_id ? parseInt(tournamentForm.parent_tournament_id) : undefined,
        championship_type: tournamentForm.championship_type,
        participating_clubs: tournamentForm.participating_clubs || undefined,
        min_club_participants: tournamentForm.min_club_participants ? parseInt(tournamentForm.min_club_participants) : undefined,
        auto_group_clubs: tournamentForm.auto_group_clubs,
        auto_seed_champions: tournamentForm.auto_seed_champions,
        // League configuration
        league_config: tournamentForm.type === 'league' ? leagueConfig : undefined,
        created_by: currentUser?.member_id
      };
      
      console.log('Tournament data being saved:', tournamentData);
      
      if (mode === 'create') {
        await createTournament(tournamentData);
        toast.success('Tournament created successfully!');
      } else {
        await updateTournament(tournament!.id, tournamentData);
        toast.success('Tournament updated successfully!');
      }
      
      onSuccess();
      
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} tournament:`, error);
      toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} tournament. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-brand-black">
            {mode === 'create' ? 'Create New Tournament' : 'Edit Tournament'}
          </h3>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  required
                  placeholder="e.g., Spring Championship 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Type</label>
                <select
                  value={tournamentForm.type || 'tournament'}
                  onChange={e => handleChampionshipTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="tournament">Regular Tournament</option>
                  <option value="league">League</option>
                  <option value="club_championship">Club Championship</option>
                  <option value="national_championship">National Championship</option>
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
                  <option value="par3_match_play">3 Hole Matchplay</option>
                  <option value="stroke_play">Stroke Play</option>
                  <option value="scramble">Scramble</option>
                  <option value="best_ball">Best Ball</option>
                  <option value="stableford">Stableford</option>
                </select>
              </div>
            </div>
          </div>

          {/* NEW: Championship Configuration Section */}
          {(tournamentForm.type === 'club_championship' || tournamentForm.type === 'national_championship') && (
            <div className="bg-blue-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Trophy className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="text-lg font-semibold text-blue-900">Championship Configuration</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournamentForm.type === 'club_championship' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Championship Type</label>
                      <select
                        value={tournamentForm.championship_type || 'single_club'}
                        onChange={e => setTournamentForm({ ...tournamentForm, championship_type: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                      >
                        <option value="single_club">Single Club Championship</option>
                        <option value="multi_club">Multi-Club Championship (Combined)</option>
                        <option value="regional">Regional Championship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Participating Clubs</label>
                      <div className="relative club-dropdown-container">
                        <input
                          type="text"
                          value={clubSearchTerm}
                          onChange={handleClubSearchChange}
                          onFocus={() => setShowClubDropdown(true)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                          placeholder="Search and select clubs..."
                        />
                        {showClubDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredClubs.length > 0 ? (
                              filteredClubs.map((club) => (
                                <div
                                  key={club}
                                  className="px-3 py-2 hover:bg-neutral-50 cursor-pointer flex items-center"
                                  onClick={() => handleClubToggle(club)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedClubs.includes(club)}
                                    onChange={() => handleClubToggle(club)}
                                    className="mr-2"
                                  />
                                  <span className="text-sm">{club}</span>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-neutral-500 text-sm">
                                No clubs found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {selectedClubs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedClubs.map((club) => (
                            <span
                              key={club}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-brand-neon-green text-brand-black"
                            >
                              {club}
                              <button
                                type="button"
                                onClick={() => handleClubToggle(club)}
                                className="ml-1 hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Minimum Participants per Club</label>
                      <input
                        type="number"
                        min="1"
                        value={tournamentForm.min_club_participants || '4'}
                        onChange={e => setTournamentForm({ ...tournamentForm, min_club_participants: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Auto-Group Small Clubs</label>
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id="auto_group_clubs"
                          checked={tournamentForm.auto_group_clubs || false}
                          onChange={e => setTournamentForm({ ...tournamentForm, auto_group_clubs: e.target.checked })}
                          className="w-4 h-4 text-brand-neon-green border-neutral-300 rounded focus:ring-brand-neon-green focus:ring-2"
                        />
                        <label htmlFor="auto_group_clubs" className="ml-2 text-sm text-neutral-600">
                          Automatically combine small clubs
                        </label>
                      </div>
                    </div>
                  </>
                )}
                {tournamentForm.type === 'national_championship' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Parent Championship ID</label>
                      <input
                        type="number"
                        value={tournamentForm.parent_tournament_id}
                        onChange={e => setTournamentForm({ ...tournamentForm, parent_tournament_id: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                        placeholder="ID of the main championship tournament"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Auto-Seed from Club Champions</label>
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id="auto_seed_champions"
                          checked={tournamentForm.auto_seed_champions || false}
                          onChange={e => setTournamentForm({ ...tournamentForm, auto_seed_champions: e.target.checked })}
                          className="w-4 h-4 text-brand-neon-green border-neutral-300 rounded focus:ring-brand-neon-green focus:ring-2"
                        />
                        <label htmlFor="auto_seed_champions" className="ml-2 text-sm text-neutral-600">
                          Automatically seed club champions
                        </label>
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Championship Round</label>
                  <select
                    value={tournamentForm.championship_round}
                    onChange={e => setTournamentForm({ ...tournamentForm, championship_round: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value={1}>Round 1</option>
                    <option value={2}>Round 2</option>
                    <option value={3}>Round 3</option>
                    <option value={4}>Round 4</option>
                    <option value={5}>Round 5</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  {tournamentForm.type === 'club_championship' 
                    ? 'Club Championship: 3 match play matches per club group. Players are grouped by club, with small clubs combined automatically. Winner advances to National Championship.'
                    : 'National Championship: Single-elimination tournament for club champions. Automatically seeded from completed club championships.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* League Configuration Section */}
          <LeagueSettings
            tournamentId={tournament?.id}
            isLeague={tournamentForm.type === 'league'}
            onSettingsChange={setLeagueConfig}
            initialSettings={leagueConfig}
          />

          {/* Dates Section */}
          <div className="bg-neutral-50 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Trophy className="w-5 h-5 text-brand-neon-green mr-2" />
              <h4 className="text-lg font-semibold text-brand-black">Dates & Registration</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={tournamentForm.start_date}
                  onChange={e => setTournamentForm({ ...tournamentForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={tournamentForm.end_date}
                  onChange={e => setTournamentForm({ ...tournamentForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Registration Deadline</label>
                <input
                  type="date"
                  value={tournamentForm.registration_deadline}
                  onChange={e => setTournamentForm({ ...tournamentForm, registration_deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Max Participants</label>
                <input
                  type="number"
                  min="2"
                  value={tournamentForm.max_participants}
                  onChange={e => setTournamentForm({ ...tournamentForm, max_participants: e.target.value })}
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
                  value={tournamentForm.entry_fee}
                  onChange={e => setTournamentForm({ ...tournamentForm, entry_fee: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Payment Organizer - Only show if entry fee > 0 */}
            {parseFloat(tournamentForm.entry_fee) > 0 && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1">Payment Organizer</label>
                  <select
                    value={tournamentForm.payment_organizer}
                    onChange={e => setTournamentForm({ ...tournamentForm, payment_organizer: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  >
                    <option value="">Select payment organizer...</option>
                    <option value="jeff">Jeff Testa (Neighborhood National)</option>
                    <option value="adam">Adam Christopher (No. 10)</option>
                    <option value="other">Other (Custom)</option>
                  </select>
                </div>
                
                {tournamentForm.payment_organizer === 'other' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Organizer Name *</label>
                      <input
                        type="text"
                        value={tournamentForm.payment_organizer_name}
                        onChange={e => setTournamentForm({ ...tournamentForm, payment_organizer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                        placeholder="Enter organizer name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-1">Venmo URL *</label>
                      <input
                        type="url"
                        value={tournamentForm.payment_venmo_url}
                        onChange={e => setTournamentForm({ ...tournamentForm, payment_venmo_url: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                        placeholder="https://venmo.com/u/..."
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Team Size Field - Only show for team formats */}
            {(tournamentForm.tournament_format === 'scramble' || tournamentForm.tournament_format === 'best_ball') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-600 mb-1">Team Size</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="2"
                    max="6"
                    value={tournamentForm.team_size}
                    onChange={e => setTournamentForm({ ...tournamentForm, team_size: e.target.value })}
                    className="w-24 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  />
                  <span className="text-sm text-neutral-600">players per team</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {tournamentForm.tournament_format === 'scramble' 
                    ? 'Recommended: 4 players for scramble format'
                    : 'Recommended: 2 players for best ball format'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Course Section */}
          <div className="bg-neutral-50 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-brand-neon-green mr-2" />
              <h4 className="text-lg font-semibold text-brand-black">Course & Format</h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1">Hole Count</label>
              <select
                value={tournamentForm.hole_configuration}
                onChange={e => setTournamentForm({ ...tournamentForm, hole_configuration: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              >
                <option value="3">3 Holes</option>
                <option value="9">9 Holes (Any)</option>
                <option value="9_front">9 Holes Front</option>
                <option value="9_back">9 Holes Back</option>
                <option value="18">18 Holes</option>
              </select>
            </div>
            
            {/* Platform-Specific Course Selectors */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-600 mb-3">Course Selection</label>
              
              {/* GSPro Course Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  GSPro Course <span className="text-xs text-neutral-400">(Optional)</span>
                </label>
                <div className="relative gspro-dropdown-container">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={gsproSearchTerm}
                        onChange={e => handleGsproCourseSearchChange(e.target.value)}
                        onFocus={() => setShowGsproDropdown(true)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Search for a GSPro course..."
                      />
                      {gsproLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                      {!gsproLoading && gsproSearchTerm && (
                        <button
                          onClick={clearGsproCourseSelection}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* GSPro Course Dropdown */}
                  {showGsproDropdown && (filteredGsproCourses.length > 0 || gsproSearchTerm) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredGsproCourses.length > 0 ? (
                        filteredGsproCourses.map(course => (
                          <button
                            key={course.id}
                            onClick={() => handleGsproCourseSelect(course)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-neutral-100 last:border-b-0"
                          >
                            <div className="font-medium text-brand-black">{course.name}</div>
                            <div className="text-sm text-neutral-600 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {course.location || 'Unknown location'}
                              {course.designer && (
                                <span className="ml-2">• {course.designer}</span>
                              )}
                            </div>
                            <div className="flex items-center mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                GSPro
                              </span>
                            </div>
                          </button>
                        ))
                      ) : gsproSearchTerm ? (
                        <div className="px-4 py-3 text-neutral-500">
                          No GSPro courses found matching "{gsproSearchTerm}"
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                
                {/* Selected GSPro Course Display */}
                {selectedGsproCourse && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-800">{selectedGsproCourse.name}</div>
                        <div className="text-sm text-blue-600">
                          {selectedGsproCourse.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {selectedGsproCourse.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={clearGsproCourseSelection}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Trackman Course Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-600 mb-1">
                  Trackman Course <span className="text-xs text-neutral-400">(Optional)</span>
                </label>
                <div className="relative trackman-dropdown-container">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={trackmanSearchTerm}
                        onChange={e => handleTrackmanCourseSearchChange(e.target.value)}
                        onFocus={() => setShowTrackmanDropdown(true)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                        placeholder="Search for a Trackman course..."
                      />
                      {trackmanLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                        </div>
                      )}
                      {!trackmanLoading && trackmanSearchTerm && (
                        <button
                          onClick={clearTrackmanCourseSelection}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Trackman Course Dropdown */}
                  {showTrackmanDropdown && (filteredTrackmanCourses.length > 0 || trackmanSearchTerm) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredTrackmanCourses.length > 0 ? (
                        filteredTrackmanCourses.map(course => (
                          <button
                            key={course.id}
                            onClick={() => handleTrackmanCourseSelect(course)}
                            className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-neutral-100 last:border-b-0"
                          >
                            <div className="font-medium text-brand-black">{course.name}</div>
                            <div className="text-sm text-neutral-600 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {course.location || 'Unknown location'}
                              {course.designer && (
                                <span className="ml-2">• {course.designer}</span>
                              )}
                            </div>
                            <div className="flex items-center mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Trackman
                              </span>
                            </div>
                          </button>
                        ))
                      ) : trackmanSearchTerm ? (
                        <div className="px-4 py-3 text-neutral-500">
                          No Trackman courses found matching "{trackmanSearchTerm}"
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                
                {/* Selected Trackman Course Display */}
                {selectedTrackmanCourse && (
                  <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-purple-800">{selectedTrackmanCourse.name}</div>
                        <div className="text-sm text-purple-600">
                          {selectedTrackmanCourse.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {selectedTrackmanCourse.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={clearTrackmanCourseSelection}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Course Selection Note */}
              <p className="text-xs text-neutral-500 mt-2">
                You can select courses for both platforms, one platform, or neither. This allows players to choose their preferred simulator platform.
              </p>
              
              {/* Course Assignment Rules */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Course Assignment Rules</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                      📊 Trackman
                    </span>
                    <span>Club No. 8 members will automatically use the Trackman course</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      🎯 GSPro
                    </span>
                    <span>All other clubs will automatically use the GSPro course</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Simulator Settings Section */}
          <div className="bg-neutral-50 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-brand-neon-green mr-2" />
              <h4 className="text-lg font-semibold text-brand-black">Simulator Settings</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Tee</label>
                <select
                  value={tournamentForm.tee}
                  onChange={e => setTournamentForm({ ...tournamentForm, tee: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="Par 3">Par 3</option>
                  <option value="Red">Red</option>
                  <option value="White">White</option>
                  <option value="Blue">Blue</option>
                  <option value="Black">Black</option>
                  <option value="Gold">Gold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Pins</label>
                <select
                  value={tournamentForm.pins}
                  onChange={e => setTournamentForm({ ...tournamentForm, pins: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Easy">Easy</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Putting Gimme</label>
                <select
                  value={tournamentForm.putting_gimme}
                  onChange={e => setTournamentForm({ ...tournamentForm, putting_gimme: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="0">No gimme</option>
                  <option value="3">3' gimme</option>
                  <option value="5">5' gimme</option>
                  <option value="8">8' gimme</option>
                  <option value="10">10' gimme</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Elevation</label>
                <select
                  value={tournamentForm.elevation}
                  onChange={e => setTournamentForm({ ...tournamentForm, elevation: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="Course">Course</option>
                  <option value="Off">Off</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Stimp</label>
                <select
                  value={tournamentForm.stimp}
                  onChange={e => setTournamentForm({ ...tournamentForm, stimp: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                  <option value="13">13</option>
                  <option value="14">14</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Mulligan</label>
                <select
                  value={tournamentForm.mulligan}
                  onChange={e => setTournamentForm({ ...tournamentForm, mulligan: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="1 per hole">1 per hole</option>
                  <option value="2 per round">2 per round</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Game Play</label>
                <select
                  value={tournamentForm.game_play}
                  onChange={e => setTournamentForm({ ...tournamentForm, game_play: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="Force Realistic">Force Realistic</option>
                  <option value="Allow Unrealistic">Allow Unrealistic</option>
                  <option value="Tournament Mode">Tournament Mode</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Firmness</label>
                <select
                  value={tournamentForm.firmness}
                  onChange={e => setTournamentForm({ ...tournamentForm, firmness: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="Normal">Normal</option>
                  <option value="Soft">Soft</option>
                  <option value="Firm">Firm</option>
                  <option value="Very Firm">Very Firm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Wind</label>
                <select
                  value={tournamentForm.wind}
                  onChange={e => setTournamentForm({ ...tournamentForm, wind: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                >
                  <option value="None">None</option>
                  <option value="Light">Light</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Strong">Strong</option>
                  <option value="Random">Random</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">Handicap</label>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="handicap_enabled"
                    checked={tournamentForm.handicap_enabled}
                    onChange={e => setTournamentForm({ ...tournamentForm, handicap_enabled: e.target.checked })}
                    className="w-4 h-4 text-brand-neon-green border-neutral-300 rounded focus:ring-brand-neon-green focus:ring-2"
                  />
                  <label htmlFor="handicap_enabled" className="ml-2 text-sm text-neutral-600">
                    Enable handicap adjustments
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Form Settings Section */}
          <div className="bg-neutral-50 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-brand-neon-green mr-2" />
              <h4 className="text-lg font-semibold text-brand-black">Registration Form</h4>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <label className="block text-sm font-medium text-neutral-600">
                Enable Registration Form
              </label>
              <input
                type="checkbox"
                id="has_registration_form"
                checked={tournamentForm.has_registration_form}
                onChange={e => setTournamentForm({ ...tournamentForm, has_registration_form: e.target.checked })}
                className="w-4 h-4 text-brand-neon-green border-neutral-300 rounded focus:ring-brand-neon-green focus:ring-2"
              />
            </div>

            {tournamentForm.has_registration_form && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-2">
                      Registration Form Template
                    </label>
                    {templatesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-neon-green mx-auto"></div>
                      </div>
                    ) : registrationTemplates.length === 0 ? (
                      <p className="text-sm text-neutral-500">No templates available. Please create one first.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {registrationTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleRegistrationTemplateSelect(template)}
                            className={`p-4 rounded-lg border transition-all text-left ${
                              tournamentForm.registration_form_template === template.template_key
                                ? 'border-brand-neon-green bg-green-50'
                                : 'border-neutral-200 hover:border-brand-neon-green'
                            }`}
                          >
                            <h5 className="font-medium text-brand-black mb-1">{template.name}</h5>
                            <p className="text-sm text-neutral-600">{template.description}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {tournamentForm.registration_form_template && tournamentForm.registration_form_data && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-2">
                        Selected Template Preview
                      </label>
                      <div className="bg-neutral-100 p-4 rounded-lg">
                        <h6 className="font-medium text-brand-black mb-2">
                          {tournamentForm.registration_form_data.name}
                        </h6>
                        {tournamentForm.registration_form_data.questions.map((question: any, index: number) => (
                          <div key={index} className="mb-3">
                            <p className="text-sm font-medium text-neutral-700 mb-1">
                              {question.question}
                              {question.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            {question.options && (
                              <div className="ml-4">
                                {question.options.map((option: string, optIndex: number) => (
                                  <div key={optIndex} className="text-xs text-neutral-600">
                                    • {option}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                mode === 'create' ? 'Create Tournament' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentForm;