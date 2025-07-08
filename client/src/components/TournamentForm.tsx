import React, { useState, useEffect } from 'react';
import { Trophy, Users, Settings, Plus, Search, MapPin } from 'lucide-react';
import { createTournament, updateTournament, getSimulatorCourses } from '../services/api';
import { toast } from 'react-toastify';

interface TournamentFormProps {
  mode: 'create' | 'edit';
  tournament?: any;
  onSuccess: () => void;
  onCancel: () => void;
  currentUser?: any;
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
    rules: tournament?.rules || '',
    notes: tournament?.notes || '',
    type: tournament?.type || 'tournament',
    club_restriction: tournament?.club_restriction || 'open',
    team_size: tournament?.team_size?.toString() || '4',
    hole_configuration: tournament?.hole_configuration?.toString() || '18',
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
    handicap_enabled: tournament?.handicap_enabled || false
  });

  // Course selector state
  const [simulatorCourses, setSimulatorCourses] = useState<any[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseLoading, setCourseLoading] = useState(false);

  // Load simulator courses
  useEffect(() => {
    const fetchSimulatorCourses = async () => {
      try {
        setCourseLoading(true);
        const response = await getSimulatorCourses('', '', 1000);
        setSimulatorCourses(response.data.courses || []);
      } catch (error) {
        console.error('Error fetching simulator courses:', error);
      } finally {
        setCourseLoading(false);
      }
    };

    fetchSimulatorCourses();
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
        hole_count: '18',
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
        hole_count: '18',
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
        hole_count: '18',
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
        team_size: '4',
        hole_count: '18',
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
        team_size: '2',
        hole_count: '18',
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
        hole_count: '18',
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

  // Template selection handler
  const handleTemplateSelect = (template: any) => {
    setTournamentForm(prev => ({
      ...prev,
      ...template.settings
    }));
    toast.success(`Applied ${template.name} template`);
  };

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

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!selectedCourse) {
      toast.error('Please select a course for the tournament');
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
        course: selectedCourse ? selectedCourse.name : tournamentForm.course,
        course_id: tournamentForm.course_id ? parseInt(tournamentForm.course_id) : undefined,
        rules: tournamentForm.rules,
        notes: tournamentForm.notes,
        type: tournamentForm.type,
        club_restriction: tournamentForm.club_restriction,
        team_size: tournamentForm.team_size ? parseInt(tournamentForm.team_size) : undefined,
        hole_configuration: tournamentForm.hole_configuration,
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
          {/* Template Selection Section - Only show for create mode */}
          {mode === 'create' && (
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
          )}

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
            
            {/* Course Selector */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">Course *</label>
              <div className="relative course-dropdown-container">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={courseSearchTerm}
                      onChange={e => handleCourseSearchChange(e.target.value)}
                      onFocus={() => setShowCourseDropdown(true)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent pr-10 ${
                        !selectedCourse ? 'border-red-300 focus:border-red-500' : 'border-neutral-300'
                      }`}
                      placeholder="Search for a course (required)..."
                    />
                    {courseLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-neon-green"></div>
                      </div>
                    )}
                    {!courseLoading && courseSearchTerm && (
                      <button
                        onClick={clearCourseSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Course Dropdown */}
                {showCourseDropdown && (filteredCourses.length > 0 || courseSearchTerm) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCourses.length > 0 ? (
                      filteredCourses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => handleCourseSelect(course)}
                          className="w-full px-4 py-3 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0"
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
                            {course.platforms?.map((platform: string) => (
                              <span
                                key={platform}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-1 ${
                                  platform === 'GSPro' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {platform}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))
                    ) : courseSearchTerm ? (
                      <div className="px-4 py-3 text-neutral-500">
                        No courses found matching "{courseSearchTerm}"
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* Selected Course Display */}
              {selectedCourse && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-800">{selectedCourse.name}</div>
                      <div className="text-sm text-green-600">
                        {selectedCourse.location && (
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {selectedCourse.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
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