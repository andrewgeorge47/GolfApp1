import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Calendar, DollarSign, Users, CheckCircle, XCircle, Camera, Edit, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getChallenges,
  getChallengePot,
  getChallengeEntries,
  createChallenge,
  updateChallenge,
  verifyChallengeEntry,
  verifyChallengePhoto,
  finalizeChallenge,
  markPayoutComplete,
  getSimulatorCourses,
  getChallengeTypes,
  getHIOJackpot,
  deleteChallenge,
  getCTPEligibleCourses,
  getCourseHoleDetails,
  uploadPrizePhoto,
  type WeeklyChallenge,
  type ChallengeEntry,
  type ChallengePot,
  type ChallengeType,
  type ChallengeHIOJackpot
} from '../services/api';
import { getAbsoluteUrl } from '../config/environment';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Input,
  Textarea,
  Tabs,
  TabPanel,
  SimpleLoading,
  EmptyState,
  Avatar,
  ConfirmationDialog,
  Switch
} from './ui';

const WeeklyChallengeAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'entries' | 'history' | 'create'>('current');
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [pot, setPot] = useState<ChallengePot | null>(null);
  const [hioJackpot, setHioJackpot] = useState<ChallengeHIOJackpot | null>(null);
  const [challengeTypes, setChallengeTypes] = useState<ChallengeType[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<WeeklyChallenge | null>(null);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<WeeklyChallenge | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEntryVerifyModal, setShowEntryVerifyModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ChallengeEntry | null>(null);

  // Create form state
  const [newChallenge, setNewChallenge] = useState({
    challenge_name: '',
    designated_hole: 1,
    entry_fee: 5,
    reup_fee: 3,
    week_start_date: '',
    week_end_date: '',
    course_id: '',
    challenge_type_id: '',
    required_distance_yards: ''
  });

  // CTP-specific state
  const [isCTPChallenge, setIsCTPChallenge] = useState(false);
  const [isFreeChallenge, setIsFreeChallenge] = useState(false);
  const [ctpConfig, setCtpConfig] = useState({
    pin_day: 'Thursday',
    attempts_per_hole: 3,
    selected_options: [] as string[], // Array of selected option IDs like "hole-5-white" or "hole-12-par3"
    mode: 'par3-holes' as 'par3-holes' | 'par3-tees',
    tee_type: 'White'
  });

  // Challenge settings state
  const [challengeSettings, setChallengeSettings] = useState({
    instructions: '',
    platforms: ['GSPro', 'Trackman'],
    gsproSettings: {
      pins: 'Friday',
      putting: 'No Gimme',
      elevation: 'Course',
      stimp: '11',
      mulligan: 'No',
      gameplay: 'Force Realistic',
      fairway_firmness: 'Normal',
      green_firmness: 'Normal',
      wind: 'None'
    },
    trackmanSettings: {
      pins: 'Medium',
      putting: 'No Gimme',
      stimp: '11',
      fairway_firmness: 'Medium',
      green_firmness: 'Medium',
      wind: 'Calm'
    },
    prize1stUrl: '',
    prize2ndUrl: '',
    prize3rdUrl: ''
  });
  const [uploadingPrize, setUploadingPrize] = useState<{
    first: boolean;
    second: boolean;
    third: boolean;
  }>({ first: false, second: false, third: false });
  const [ctpEligibleCourses, setCtpEligibleCourses] = useState<any[]>([]);
  const [courseHoleDetails, setCourseHoleDetails] = useState<any>(null);
  const [ctpOptions, setCtpOptions] = useState<any[]>([]); // All available par 3 options

  // Course selection state
  const [simulatorCourses, setSimulatorCourses] = useState<any[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  // Verify entry form state
  const [verifyDistance, setVerifyDistance] = useState('');
  const [verifyReason, setVerifyReason] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await getSimulatorCourses(undefined, undefined, 10000);
        setSimulatorCourses(response.data.courses || []);
      } catch (error) {
        console.error('Error fetching simulator courses:', error);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    // Fetch CTP-eligible courses when CTP mode is enabled
    const fetchCTPCourses = async () => {
      if (isCTPChallenge) {
        try {
          const response = await getCTPEligibleCourses();
          setCtpEligibleCourses(response.data);
        } catch (error) {
          console.error('Error fetching CTP-eligible courses:', error);
          toast.error('Failed to load CTP-eligible courses');
        }
      }
    };
    fetchCTPCourses();
  }, [isCTPChallenge]);

  useEffect(() => {
    // Fetch hole details when a course is selected in CTP mode
    const fetchHoleDetails = async () => {
      if (isCTPChallenge && selectedCourse && selectedCourse.id) {
        try {
          const response = await getCourseHoleDetails(selectedCourse.id);
          setCourseHoleDetails(response.data);
        } catch (error) {
          console.error('Error fetching course hole details:', error);
          toast.error('Failed to load course hole details');
        }
      }
    };
    fetchHoleDetails();
  }, [isCTPChallenge, selectedCourse]);

  useEffect(() => {
    // Calculate all available par 3 options when course details or pin day changes
    if (!courseHoleDetails || !courseHoleDetails.holes) {
      setCtpOptions([]);
      return;
    }

    const options: any[] = [];
    const teeTypes = ['Black', 'Blue', 'White', 'Yellow', 'Green', 'Red', 'Junior', 'Par3'];

    courseHoleDetails.holes.forEach((hole: any) => {
      // Add options for each tee type
      teeTypes.forEach(teeType => {
        const teePos = hole.tees?.[teeType];
        const pinPos = hole.pins?.[ctpConfig.pin_day];

        if (teePos && pinPos) {
          const dx = teePos.x - pinPos.x;
          const dz = teePos.z - pinPos.z;
          const distanceYards = Math.round(Math.sqrt(dx * dx + dz * dz) * 1.09361);

          options.push({
            id: `hole-${hole.hole}-${teeType.toLowerCase()}`,
            hole: hole.hole,
            par: hole.par,
            teeType: teeType,
            pinDay: ctpConfig.pin_day,
            distanceYards: distanceYards,
            teePos: teePos,
            pinPos: pinPos
          });
        }
      });
    });

    // Sort by distance (shortest to longest)
    options.sort((a, b) => a.distanceYards - b.distanceYards);

    setCtpOptions(options);
  }, [courseHoleDetails, ctpConfig.pin_day]);

  useEffect(() => {
    if (courseSearchTerm.trim()) {
      const coursesToSearch = isCTPChallenge ? ctpEligibleCourses : simulatorCourses;
      const filtered = coursesToSearch.filter(course =>
        course.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
        (course.location && course.location.toLowerCase().includes(courseSearchTerm.toLowerCase()))
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
  }, [courseSearchTerm, simulatorCourses, ctpEligibleCourses, isCTPChallenge]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.course-dropdown-container')) {
        setShowCourseDropdown(false);
      }
    };

    if (showCourseDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCourseDropdown]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengesRes, potRes, typesRes, hioRes] = await Promise.all([
        getChallenges({ status: activeTab === 'history' ? 'completed' : 'active' }),
        getChallengePot(),
        getChallengeTypes(),
        getHIOJackpot().catch(() => ({ data: null }))
      ]);

      setChallenges(challengesRes.data);
      setPot(potRes.data);
      setChallengeTypes(typesRes.data);
      if (hioRes.data) setHioJackpot(hioRes.data);

      if (challengesRes.data.length > 0 && activeTab === 'current') {
        selectChallenge(challengesRes.data[0], false);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load challenge data');
    } finally {
      setLoading(false);
    }
  };

  const selectChallenge = async (challenge: WeeklyChallenge, switchTab: boolean = true) => {
    setSelectedChallenge(challenge);
    try {
      const entriesRes = await getChallengeEntries(challenge.id);
      setEntries(entriesRes.data);
      if (switchTab) {
        setActiveTab('entries');
      }
    } catch (err) {
      console.error('Error loading entries:', err);
      toast.error('Failed to load entries');
    }
  };

  const handleCourseSelect = (course: any) => {
    setSelectedCourse(course);
    setNewChallenge({ ...newChallenge, course_id: course.id.toString() });
    setCourseSearchTerm(course.name);
    setShowCourseDropdown(false);
  };

  const handleCourseSearchChange = (value: string) => {
    setCourseSearchTerm(value);
    setShowCourseDropdown(true);
    if (!value) {
      setSelectedCourse(null);
      setNewChallenge({ ...newChallenge, course_id: '' });
    }
  };

  const clearCourseSelection = () => {
    setSelectedCourse(null);
    setCourseSearchTerm('');
    setNewChallenge({ ...newChallenge, course_id: '' });
    setShowCourseDropdown(false);
  };

  const handlePrizePhotoUpload = async (file: File, position: 'first' | 'second' | 'third') => {
    try {
      setUploadingPrize({ ...uploadingPrize, [position]: true });
      toast.info('Uploading prize photo...', { autoClose: 1000 });

      const response = await uploadPrizePhoto(file, position);
      const urlField = position === 'first' ? 'prize1stUrl' : position === 'second' ? 'prize2ndUrl' : 'prize3rdUrl';

      setChallengeSettings({
        ...challengeSettings,
        [urlField]: response.data.photoUrl
      });

      toast.success('Prize photo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading prize photo:', error);
      toast.error(error.response?.data?.error || 'Failed to upload prize photo');
    } finally {
      setUploadingPrize({ ...uploadingPrize, [position]: false });
    }
  };

  const handlePrizePhotoRemove = (position: 'first' | 'second' | 'third') => {
    const urlField = position === 'first' ? 'prize1stUrl' : position === 'second' ? 'prize2ndUrl' : 'prize3rdUrl';
    setChallengeSettings({
      ...challengeSettings,
      [urlField]: ''
    });
  };

  const handleEditClick = (challenge: WeeklyChallenge) => {
    setEditingChallenge(challenge);
    // Pre-fill form with challenge data
    setNewChallenge({
      challenge_name: challenge.challenge_name,
      designated_hole: challenge.designated_hole,
      entry_fee: challenge.entry_fee || 0,
      reup_fee: challenge.reup_fee || 0,
      week_start_date: challenge.week_start_date.split('T')[0],
      week_end_date: challenge.week_end_date.split('T')[0],
      course_id: challenge.course_id?.toString() || '',
      challenge_type_id: challenge.challenge_type_id?.toString() || '',
      required_distance_yards: challenge.required_distance_yards?.toString() || ''
    });
    // Pre-fill challenge settings
    if (challenge.instructions || challenge.gspro_settings || challenge.trackman_settings) {
      setChallengeSettings({
        instructions: challenge.instructions || '',
        platforms: challenge.platforms || ['GSPro', 'Trackman'],
        gsproSettings: {
          pins: challenge.gspro_settings?.pins || 'Friday',
          putting: challenge.gspro_settings?.putting || 'No Gimme',
          elevation: challenge.gspro_settings?.elevation || 'Course',
          stimp: challenge.gspro_settings?.stimp || '11',
          mulligan: challenge.gspro_settings?.mulligan || 'No',
          gameplay: challenge.gspro_settings?.gameplay || 'Force Realistic',
          fairway_firmness: challenge.gspro_settings?.fairway_firmness || 'Normal',
          green_firmness: challenge.gspro_settings?.green_firmness || 'Normal',
          wind: challenge.gspro_settings?.wind || 'None'
        },
        trackmanSettings: {
          pins: challenge.trackman_settings?.pins || 'Medium',
          putting: challenge.trackman_settings?.putting || 'No Gimme',
          stimp: challenge.trackman_settings?.stimp || '11',
          fairway_firmness: challenge.trackman_settings?.fairway_firmness || 'Medium',
          green_firmness: challenge.trackman_settings?.green_firmness || 'Medium',
          wind: challenge.trackman_settings?.wind || 'Calm'
        },
        prize1stUrl: challenge.prize_1st_image_url || '',
        prize2ndUrl: challenge.prize_2nd_image_url || '',
        prize3rdUrl: challenge.prize_3rd_image_url || ''
      });
    }
    // Set course search
    if (challenge.course_name) {
      setCourseSearchTerm(challenge.course_name);
      setSelectedCourse({ id: challenge.course_id, name: challenge.course_name });
    }
    setIsFreeChallenge(challenge.entry_fee === 0);
    setShowCreateModal(true);
  };

  const handleSubmitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingChallenge;

    try {
      const challengeData: any = {
        challenge_name: newChallenge.challenge_name,
        designated_hole: newChallenge.designated_hole,
        entry_fee: newChallenge.entry_fee,
        reup_fee: newChallenge.reup_fee,
        week_start_date: newChallenge.week_start_date,
        week_end_date: newChallenge.week_end_date,
        course_id: newChallenge.course_id ? parseInt(newChallenge.course_id) : undefined,
        challenge_type_id: newChallenge.challenge_type_id ? parseInt(newChallenge.challenge_type_id) : undefined,
        required_distance_yards: newChallenge.required_distance_yards ? parseInt(newChallenge.required_distance_yards) : undefined
      };

      // Add CTP-specific fields if CTP mode is enabled
      if (isCTPChallenge) {
        challengeData.is_ctp_challenge = true;
        challengeData.ctp_pin_day = ctpConfig.pin_day;
        challengeData.ctp_attempts_per_hole = ctpConfig.attempts_per_hole;

        // Build the selected holes configuration from selected options
        const selectedHoles = ctpOptions
          .filter(opt => ctpConfig.selected_options.includes(opt.id))
          .map(opt => ({
            hole: opt.hole,
            par: opt.par,
            teeType: opt.teeType,
            distance: opt.distanceYards,
            teePos: opt.teePos,
            pinPos: opt.pinPos
          }));

        challengeData.ctp_holes_config = selectedHoles;
        challengeData.sim_id = 'nn-no5';
      }

      // Add instructions and settings if provided
      if (challengeSettings.instructions) {
        challengeData.instructions = challengeSettings.instructions;
      }
      if (challengeSettings.platforms.length > 0) {
        challengeData.platforms = challengeSettings.platforms;
      }
      challengeData.gspro_settings = challengeSettings.gsproSettings;
      challengeData.trackman_settings = challengeSettings.trackmanSettings;

      // Add prize image URLs if provided
      if (challengeSettings.prize1stUrl) {
        challengeData.prize_1st_image_url = challengeSettings.prize1stUrl;
      }
      if (challengeSettings.prize2ndUrl) {
        challengeData.prize_2nd_image_url = challengeSettings.prize2ndUrl;
      }
      if (challengeSettings.prize3rdUrl) {
        challengeData.prize_3rd_image_url = challengeSettings.prize3rdUrl;
      }

      if (isEditing) {
        await updateChallenge(editingChallenge.id, challengeData);
        toast.success('Challenge updated successfully!');
      } else {
        await createChallenge(challengeData);
        toast.success('Challenge created successfully!');
      }

      setShowCreateModal(false);
      setEditingChallenge(null);
      loadData();

      // Reset form
      setNewChallenge({
        challenge_name: '',
        designated_hole: 1,
        entry_fee: 5,
        reup_fee: 3,
        week_start_date: '',
        week_end_date: '',
        course_id: '',
        challenge_type_id: '',
        required_distance_yards: ''
      });
      setIsFreeChallenge(false);
      setIsCTPChallenge(false);
      setChallengeSettings({
        instructions: '',
        platforms: ['GSPro', 'Trackman'],
        gsproSettings: {
          pins: 'Friday',
          putting: 'No Gimme',
          elevation: 'Course',
          stimp: '11',
          mulligan: 'No',
          gameplay: 'Force Realistic',
          fairway_firmness: 'Normal',
          green_firmness: 'Normal',
          wind: 'None'
        },
        trackmanSettings: {
          pins: 'Medium',
          putting: 'No Gimme',
          stimp: '11',
          fairway_firmness: 'Medium',
          green_firmness: 'Medium',
          wind: 'Calm'
        },
        prize1stUrl: '',
        prize2ndUrl: '',
        prize3rdUrl: ''
      });
      setCtpConfig({
        pin_day: 'Thursday',
        attempts_per_hole: 3,
        selected_options: [],
        mode: 'par3-holes',
        tee_type: 'White'
      });
      setSelectedCourse(null);
      setCourseSearchTerm('');
      setCourseHoleDetails(null);
      setCtpOptions([]);
    } catch (err: any) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} challenge:`, err);
      toast.error(err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} challenge`);
    }
  };

  const handleVerifyPhoto = async (entry: ChallengeEntry) => {
    try {
      await verifyChallengePhoto(entry.challenge_id, entry.id);
      toast.success('Photo verified!');
      if (selectedChallenge) {
        selectChallenge(selectedChallenge);
      }
    } catch (err) {
      console.error('Error verifying photo:', err);
      toast.error('Failed to verify photo');
    }
  };

  const handleVerifyEntry = async () => {
    if (!selectedEntry) return;

    const distanceInches = parseInt(verifyDistance) || 0;
    if (distanceInches < 0 || distanceInches > 600) {
      toast.error('Invalid distance');
      return;
    }

    try {
      await verifyChallengeEntry(selectedEntry.challenge_id, selectedEntry.id, {
        distance_from_pin_inches: distanceInches,
        distance_override_reason: verifyReason
      });
      toast.success('Entry verified!');
      setShowEntryVerifyModal(false);
      setSelectedEntry(null);
      if (selectedChallenge) {
        selectChallenge(selectedChallenge);
      }
    } catch (err) {
      console.error('Error verifying entry:', err);
      toast.error('Failed to verify entry');
    }
  };

  const handleFinalizeChallenge = async () => {
    if (!selectedChallenge) return;

    try {
      const result = await finalizeChallenge(selectedChallenge.id);
      toast.success(`Challenge finalized! Winner determined.`);
      setShowFinalizeDialog(false);
      loadData();
    } catch (err: any) {
      console.error('Error finalizing challenge:', err);
      toast.error(err.response?.data?.error || 'Failed to finalize challenge');
    }
  };

  const handleDeleteChallenge = async () => {
    if (!selectedChallenge) return;

    try {
      await deleteChallenge(selectedChallenge.id);
      toast.success('Challenge deleted successfully');
      setShowDeleteDialog(false);
      setSelectedChallenge(null);
      loadData();
    } catch (err: any) {
      console.error('Error deleting challenge:', err);
      toast.error(err.response?.data?.error || 'Failed to delete challenge');
    }
  };

  const handleMarkPayoutComplete = async (challengeId: number) => {
    try {
      await markPayoutComplete(challengeId);
      toast.success('Payout marked as complete!');
      loadData();
    } catch (err) {
      console.error('Error marking payout complete:', err);
      toast.error('Failed to mark payout complete');
    }
  };

  const formatDistance = (inches: number | undefined) => {
    if (inches === undefined || inches === null) return '--';
    if (inches === 0) return 'Hole-in-One!';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}' ${remainingInches}"`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Pot Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500 p-2 sm:p-3 rounded-lg">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Challenge Admin</h2>
                <p className="text-xs sm:text-sm text-gray-600">Manage weekly challenges</p>
              </div>
            </div>
            <Button variant="primary" size="sm" responsive onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pot && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-green-50 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Current Pot</div>
                <div className="text-sm sm:text-2xl font-bold text-green-600">${Number(pot.current_amount).toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Weeks</div>
                <div className="text-sm sm:text-2xl font-bold text-blue-600">{pot.weeks_accumulated}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Paid Out</div>
                <div className="text-sm sm:text-2xl font-bold text-purple-600">${Number(pot.total_contributions).toFixed(2)}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          tabs={[
            { label: 'Current Challenge', id: 'current' },
            { label: 'Entries', id: 'entries' },
            { label: 'History', id: 'history' }
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as any)}
        />

        <CardContent>
          {loading ? (
            <SimpleLoading text="Loading..." />
          ) : (
            <>
              <TabPanel value="current" activeValue={activeTab}>
                {challenges.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No Active Challenge"
                    description="Create a new challenge to get started"
                  />
                ) : (
                  <div className="space-y-4">
                    {challenges.map((challenge) => (
                      <div
                        key={challenge.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectChallenge(challenge)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{challenge.challenge_name}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm">
                              <div>
                                <span className="text-gray-600">Hole:</span>
                                <span className="ml-1 sm:ml-2 font-semibold">{challenge.designated_hole}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Entries:</span>
                                <span className="ml-1 sm:ml-2 font-semibold">{challenge.total_entries}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Pot:</span>
                                <span className="ml-1 sm:ml-2 font-semibold text-green-600">
                                  ${(Number(challenge.starting_pot || 0) + (Number(challenge.total_entry_fees) * 0.5)).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <Badge variant={challenge.status === 'active' ? 'success' : 'default'}>
                                  {challenge.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {challenge.status === 'active' && (
                            <div className="flex gap-2 self-end sm:self-start">
                              <Button
                                variant="secondary"
                                size="xs"
                                responsive
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(challenge);
                                }}
                              >
                                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="xs"
                                responsive
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChallenge(challenge);
                                  setShowFinalizeDialog(true);
                                }}
                              >
                                Finalize
                              </Button>
                              <Button
                                variant="secondary"
                                size="xs"
                                responsive
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChallenge(challenge);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabPanel>

              <TabPanel value="entries" activeValue={activeTab}>
                {!selectedChallenge ? (
                  <EmptyState
                    icon={Users}
                    title="No Challenge Selected"
                    description="Select a challenge to view entries"
                  />
                ) : entries.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No Entries Yet"
                    description="Waiting for players to enter the challenge"
                  />
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {entries.map((entry: any) => (
                      <div key={entry.id} className="border rounded-lg p-3 sm:p-4">
                        {/* Entry Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar
                              src={entry.profile_photo_url}
                              alt={`${entry.first_name} ${entry.last_name}`}
                              size="sm"
                            />
                            <div>
                              <div className="font-semibold text-sm sm:text-base">{entry.first_name} {entry.last_name}</div>
                              <div className="text-xs text-gray-500">{entry.club}</div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right ml-9 sm:ml-0">
                            {entry.best_shot ? (
                              <div>
                                <span className="text-xs sm:text-sm text-gray-500">Best: </span>
                                <span className={`font-bold text-sm sm:text-base ${entry.best_shot.is_hole_in_one ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {entry.best_shot.is_hole_in_one ? 'ACE!' : formatDistance(entry.best_shot.distance_from_pin_inches)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No shots</span>
                            )}
                            {entry.total_shots > 0 && (
                              <div className="text-xs text-gray-500">
                                {entry.verified_shots}/{entry.total_shots} verified
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Shot Groups */}
                        {entry.groups && entry.groups.length > 0 && (
                          <div className="space-y-2 sm:space-y-3">
                            {entry.groups.map((group: any) => (
                              <div key={group.id} className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-xs sm:text-sm">Group {group.group_number}</span>
                                  {group.group_screenshot_url && (
                                    <a
                                      href={getAbsoluteUrl(group.group_screenshot_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 text-xs"
                                    >
                                      <Camera className="w-3 h-3 inline mr-1" />
                                      Screenshot
                                    </a>
                                  )}
                                </div>

                                {/* Individual Shots */}
                                {group.shots && group.shots.length > 0 ? (
                                  <div className="space-y-1.5 sm:space-y-2">
                                    {group.shots.map((shot: any) => (
                                      <div
                                        key={shot.id}
                                        className={`flex items-center justify-between p-1.5 sm:p-2 rounded ${
                                          shot.verified ? 'bg-green-50' : 'bg-yellow-50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1 sm:gap-2">
                                          <span className="text-[10px] sm:text-xs text-gray-500">#{shot.shot_number}:</span>
                                          <span className={`font-medium text-xs sm:text-sm ${shot.is_hole_in_one ? 'text-yellow-600' : ''}`}>
                                            {shot.is_hole_in_one ? 'HIO!' : formatDistance(shot.distance_from_pin_inches)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2">
                                          <Badge variant={shot.verified ? 'success' : 'warning'} className="text-[10px] sm:text-xs">
                                            {shot.verified ? 'OK' : 'Pending'}
                                          </Badge>
                                          {!shot.verified && (
                                            <Button
                                              variant="success"
                                              size="xs"
                                              onClick={async () => {
                                                try {
                                                  const { verifyShot } = await import('../services/api');
                                                  await verifyShot(selectedChallenge!.id, shot.id);
                                                  toast.success('Shot verified!');
                                                  selectChallenge(selectedChallenge!, false);
                                                } catch (err) {
                                                  toast.error('Failed to verify shot');
                                                }
                                              }}
                                            >
                                              <CheckCircle className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">No shots submitted yet</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Legacy entry display */}
                        {!entry.groups && (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`text-sm ${entry.hole_in_one ? 'font-bold text-yellow-600' : ''}`}>
                                {formatDistance(entry.distance_from_pin_inches)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Badge
                                variant={
                                  entry.status === 'winner' ? 'success' :
                                  entry.status === 'verified' ? 'success' :
                                  entry.status === 'submitted' ? 'info' : 'warning'
                                }
                                className="text-xs"
                              >
                                {entry.status}
                              </Badge>
                              {!entry.distance_verified && (
                                <Button
                                  variant="primary"
                                  size="xs"
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setVerifyDistance(entry.distance_from_pin_inches?.toString() || '');
                                    setShowEntryVerifyModal(true);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabPanel>

              <TabPanel value="history" activeValue={activeTab}>
                {challenges.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No Completed Challenges"
                    description="Completed challenges will appear here"
                  />
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {challenges.map((challenge) => (
                      <div key={challenge.id} className="border rounded-lg p-3 sm:p-4">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2">{challenge.challenge_name}</h3>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <span className="text-gray-600">Type:</span>
                            <span className="ml-1 sm:ml-2 font-semibold">
                              {challenge.has_hole_in_one ? 'HIO' : 'CTP'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Payout:</span>
                            <span className="ml-1 sm:ml-2 font-semibold text-green-600">
                              ${Number(challenge.payout_amount).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rollover:</span>
                            <span className="ml-1 sm:ml-2 font-semibold">${Number(challenge.rollover_amount).toFixed(2)}</span>
                          </div>
                          <div>
                            {!challenge.payout_completed && (
                              <Button
                                variant="success"
                                size="xs"
                                responsive
                                onClick={() => handleMarkPayoutComplete(challenge.id)}
                              >
                                Mark Paid
                              </Button>
                            )}
                            {challenge.payout_completed && (
                              <Badge variant="success" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabPanel>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Challenge Modal */}
      {showCreateModal && (
        <Modal open={true} onClose={() => {
          setShowCreateModal(false);
          setEditingChallenge(null);
        }} size="md">
          <form onSubmit={handleSubmitChallenge} className="flex flex-col overflow-hidden h-full">
            <ModalHeader>
              {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
            </ModalHeader>
            <ModalContent>
              <div className="space-y-4">
                {/* Challenge Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challenge Type
                  </label>
                  <select
                    value={newChallenge.challenge_type_id}
                    onChange={(e) => {
                      const typeId = e.target.value;
                      const selectedType = challengeTypes.find(t => t.id.toString() === typeId);
                      setNewChallenge({
                        ...newChallenge,
                        challenge_type_id: typeId,
                        entry_fee: selectedType ? Number(selectedType.default_entry_fee) : 5,
                        reup_fee: selectedType ? Number(selectedType.default_reup_fee) : 3
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select a challenge type...</option>
                    {challengeTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.type_name}
                      </option>
                    ))}
                  </select>
                  {newChallenge.challenge_type_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      {challengeTypes.find(t => t.id.toString() === newChallenge.challenge_type_id)?.description}
                    </p>
                  )}
                </div>

                {/* CTP Challenge Toggle */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCTPChallenge}
                      onChange={(e) => {
                        setIsCTPChallenge(e.target.checked);
                        if (e.target.checked) {
                          // Set CTP challenge type if available
                          const ctpType = challengeTypes.find(t => t.type_key === 'ctp-auto');
                          if (ctpType) {
                            setNewChallenge({
                              ...newChallenge,
                              challenge_type_id: ctpType.id.toString(),
                              entry_fee: Number(ctpType.default_entry_fee),
                              reup_fee: Number(ctpType.default_reup_fee)
                            });
                          }
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-sm font-medium text-indigo-900">
                      Automated CTP Challenge (Simulator)
                    </span>
                  </label>
                  <p className="mt-2 text-xs text-indigo-700">
                    Enable for automated shot capture from simulator. Challenges will be available as custom rounds in GSPro.
                  </p>
                </div>

                <Input
                  label="Challenge Name"
                  value={newChallenge.challenge_name}
                  onChange={(e) => setNewChallenge({ ...newChallenge, challenge_name: e.target.value })}
                  required
                  placeholder={isCTPChallenge ? "Saturday CTP Challenge" : "Week 1 Five-Shot Challenge"}
                />

                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course {isCTPChallenge ? <span className="text-red-500">*</span> : <span className="text-xs text-gray-500">(Optional)</span>}
                  </label>
                  <div className="relative course-dropdown-container">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={courseSearchTerm}
                          onChange={(e) => handleCourseSearchChange(e.target.value)}
                          onFocus={() => setShowCourseDropdown(true)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Search for a course..."
                        />
                        {courseSearchTerm && (
                          <button
                            type="button"
                            onClick={clearCourseSelection}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Course Dropdown */}
                    {showCourseDropdown && (filteredCourses.length > 0 || courseSearchTerm) && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCourses.length > 0 ? (
                          filteredCourses.map((course) => (
                            <button
                              key={course.id}
                              type="button"
                              onClick={() => handleCourseSelect(course)}
                              className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{course.name}</div>
                                  {course.location && (
                                    <div className="text-sm text-gray-500">{course.location}</div>
                                  )}
                                </div>
                                {isCTPChallenge && !course.ctp_ready && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                    Needs Sync
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                        ) : courseSearchTerm ? (
                          <div className="px-4 py-3 text-gray-500 text-sm">
                            No courses found
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Warning for courses that need sync */}
                    {isCTPChallenge && selectedCourse && !selectedCourse.ctp_ready && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                          <strong>⚠️ Course needs hole data sync:</strong> This course doesn't have detailed tee/pin position data yet.
                          The sim PC needs to sync this course's .gspcrse file data before CTP challenges can be created.
                          You can select it now, but the challenge won't be fully configured until the data is synced.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTP Configuration Section */}
                {isCTPChallenge && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-gray-900">CTP Configuration</h4>

                    {/* Mode Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Challenge Mode <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={ctpConfig.mode}
                        onChange={(e) => setCtpConfig({
                          ...ctpConfig,
                          mode: e.target.value as 'par3-holes' | 'par3-tees'
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      >
                        <option value="par3-holes">Par 3 Holes Only</option>
                        <option value="par3-tees">All Holes from Par 3 Tees</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {ctpConfig.mode === 'par3-holes'
                          ? 'Play only the par 3 holes on this course'
                          : 'Play all 18 holes from the par 3 tee boxes'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Tee Type Selector - only show for par3-holes mode */}
                      {ctpConfig.mode === 'par3-holes' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tee Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={ctpConfig.tee_type}
                            onChange={(e) => setCtpConfig({ ...ctpConfig, tee_type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                          >
                            <option value="Black">Black Tees</option>
                            <option value="Blue">Blue Tees</option>
                            <option value="White">White Tees</option>
                            <option value="Yellow">Yellow Tees</option>
                            <option value="Green">Green Tees</option>
                            <option value="Red">Red Tees</option>
                            <option value="Junior">Junior Tees</option>
                          </select>
                        </div>
                      )}

                      {/* Pin Day Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pin Position <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={ctpConfig.pin_day}
                          onChange={(e) => setCtpConfig({ ...ctpConfig, pin_day: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        >
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </select>
                      </div>

                      {/* Attempts Per Hole */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Attempts Per Hole <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={ctpConfig.attempts_per_hole}
                          onChange={(e) => setCtpConfig({ ...ctpConfig, attempts_per_hole: parseInt(e.target.value) || 3 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    {/* Hole Preview/Selection */}
                    {courseHoleDetails && courseHoleDetails.holes && courseHoleDetails.holes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Holes Preview
                        </label>
                        <div className="bg-white rounded-lg border border-gray-300 p-3 max-h-48 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {courseHoleDetails.holes.map((hole: any, idx: number) => {
                              const teeKey = ctpConfig.mode === 'par3-tees' ? 'Par3' : ctpConfig.tee_type;
                              const teePos = hole.tees?.[teeKey];
                              const pinPos = hole.pins?.[ctpConfig.pin_day];

                              let distanceYards = 0;
                              if (teePos && pinPos) {
                                const dx = teePos.x - pinPos.x;
                                const dz = teePos.z - pinPos.z;
                                distanceYards = Math.round(Math.sqrt(dx * dx + dz * dz) * 1.09361);
                              }

                              return (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="font-medium">Hole {hole.hole}</span>
                                  <span className="text-gray-600">
                                    Par {hole.par} • {distanceYards || '?'} yds
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {ctpConfig.mode === 'par3-holes'
                            ? `${courseHoleDetails.holes.length} par 3 hole${courseHoleDetails.holes.length !== 1 ? 's' : ''} available`
                            : '18 holes from par 3 tees'}
                        </p>
                      </div>
                    )}

                    {/* Available Par 3 Options Table */}
                    {ctpOptions.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Available Par 3 Options <span className="text-red-500">*</span>
                          <span className="ml-2 text-xs text-gray-500 font-normal">
                            (sorted by distance)
                          </span>
                        </label>
                        <div className="bg-white rounded-lg border border-gray-300 max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left w-12"></th>
                                <th className="px-3 py-2 text-left">Hole</th>
                                <th className="px-3 py-2 text-left">Tees</th>
                                <th className="px-3 py-2 text-left">Par</th>
                                <th className="px-3 py-2 text-right">Yards</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {ctpOptions.map((option) => (
                                <tr
                                  key={option.id}
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
                                    const isSelected = ctpConfig.selected_options.includes(option.id);
                                    setCtpConfig({
                                      ...ctpConfig,
                                      selected_options: isSelected
                                        ? ctpConfig.selected_options.filter(id => id !== option.id)
                                        : [...ctpConfig.selected_options, option.id]
                                    });
                                  }}
                                >
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={ctpConfig.selected_options.includes(option.id)}
                                      onChange={() => {}}
                                      className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-medium">#{option.hole}</td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                                      option.teeType === 'Par3' ? 'bg-purple-100 text-purple-800' :
                                      option.teeType === 'Black' ? 'bg-gray-800 text-white' :
                                      option.teeType === 'Blue' ? 'bg-blue-100 text-blue-800' :
                                      option.teeType === 'White' ? 'bg-gray-100 text-gray-800' :
                                      option.teeType === 'Yellow' ? 'bg-yellow-100 text-yellow-800' :
                                      option.teeType === 'Green' ? 'bg-green-100 text-green-800' :
                                      option.teeType === 'Red' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {option.teeType}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">{option.par}</td>
                                  <td className="px-3 py-2 text-right font-semibold">{option.distanceYards}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {ctpConfig.selected_options.length} option{ctpConfig.selected_options.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}

                    {ctpOptions.length === 0 && selectedCourse && selectedCourse.ctp_ready && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          No par 3 options available for the selected pin position. Try selecting a different pin day.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Designated Hole and Distance - Only for non-CTP challenges */}
                {!isCTPChallenge && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Designated Hole"
                      type="number"
                      min="1"
                      max="18"
                      value={newChallenge.designated_hole}
                      onChange={(e) => setNewChallenge({ ...newChallenge, designated_hole: parseInt(e.target.value) })}
                      required
                    />
                    <Input
                      label="Required Distance (yards)"
                      type="number"
                      min="50"
                      max="250"
                      value={newChallenge.required_distance_yards}
                      onChange={(e) => setNewChallenge({ ...newChallenge, required_distance_yards: e.target.value })}
                      placeholder="150"
                    />
                  </div>
                )}

                {/* Free Challenge Toggle */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-semibold text-gray-900">Free Challenge</div>
                        <div className="text-sm text-gray-600">No entry fee, one entry per member, no re-ups</div>
                      </div>
                    </div>
                    <Switch
                      checked={isFreeChallenge}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setIsFreeChallenge(isChecked);
                        if (isChecked) {
                          setNewChallenge({
                            ...newChallenge,
                            entry_fee: 0,
                            reup_fee: 0
                          });
                        } else {
                          // Reset to default fees
                          setNewChallenge({
                            ...newChallenge,
                            entry_fee: 5,
                            reup_fee: 3
                          });
                        }
                      }}
                      switchSize="lg"
                    />
                  </div>
                </div>

                {/* Entry and Re-up Fee Inputs (disabled for free challenges) */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Entry Fee ($)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newChallenge.entry_fee}
                    onChange={(e) => setNewChallenge({ ...newChallenge, entry_fee: parseFloat(e.target.value) })}
                    disabled={isFreeChallenge}
                    required
                  />
                  <Input
                    label="Re-up Fee ($)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newChallenge.reup_fee}
                    onChange={(e) => setNewChallenge({ ...newChallenge, reup_fee: parseFloat(e.target.value) })}
                    disabled={isFreeChallenge}
                    required
                  />
                </div>
                <Input
                  label="Week Start Date"
                  type="date"
                  value={newChallenge.week_start_date}
                  onChange={(e) => setNewChallenge({ ...newChallenge, week_start_date: e.target.value })}
                  required
                />
                <Input
                  label="Week End Date"
                  type="date"
                  value={newChallenge.week_end_date}
                  onChange={(e) => setNewChallenge({ ...newChallenge, week_end_date: e.target.value })}
                  required
                />

                {/* Instructions Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Challenge Settings (Optional)</h4>

                  <Textarea
                    label="Instructions/Notes"
                    rows={3}
                    value={challengeSettings.instructions}
                    onChange={(e) => setChallengeSettings({...challengeSettings, instructions: e.target.value})}
                    placeholder="Add any special instructions or notes for participants..."
                  />

                  {/* Prize Image Uploads */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prize Images (Optional)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* 1st Place */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">1st Place</label>
                        {challengeSettings.prize1stUrl ? (
                          <div className="relative">
                            <img
                              src={challengeSettings.prize1stUrl}
                              alt="1st Place Prize"
                              className="w-full h-32 object-cover rounded-lg border-2 border-yellow-400"
                            />
                            <button
                              type="button"
                              onClick={() => handlePrizePhotoRemove('first')}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPrize.first}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePrizePhotoUpload(file, 'first');
                              }}
                            />
                            {uploadingPrize.first ? (
                              <div className="text-xs text-gray-500">Uploading...</div>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Upload</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>

                      {/* 2nd Place */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">2nd Place</label>
                        {challengeSettings.prize2ndUrl ? (
                          <div className="relative">
                            <img
                              src={challengeSettings.prize2ndUrl}
                              alt="2nd Place Prize"
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-400"
                            />
                            <button
                              type="button"
                              onClick={() => handlePrizePhotoRemove('second')}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPrize.second}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePrizePhotoUpload(file, 'second');
                              }}
                            />
                            {uploadingPrize.second ? (
                              <div className="text-xs text-gray-500">Uploading...</div>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Upload</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>

                      {/* 3rd Place */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">3rd Place</label>
                        {challengeSettings.prize3rdUrl ? (
                          <div className="relative">
                            <img
                              src={challengeSettings.prize3rdUrl}
                              alt="3rd Place Prize"
                              className="w-full h-32 object-cover rounded-lg border-2 border-orange-600"
                            />
                            <button
                              type="button"
                              onClick={() => handlePrizePhotoRemove('third')}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPrize.third}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePrizePhotoUpload(file, 'third');
                              }}
                            />
                            {uploadingPrize.third ? (
                              <div className="text-xs text-gray-500">Uploading...</div>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Upload</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ModalContent>
            <ModalFooter>
              <Button type="button" variant="secondary" size="sm" responsive onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" responsive>
                Create
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Verify Entry Modal */}
      {showEntryVerifyModal && selectedEntry && (
        <Modal open={true} onClose={() => setShowEntryVerifyModal(false)} size="md">
          <ModalHeader>
            Verify Entry
          </ModalHeader>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Player: <strong>{selectedEntry.first_name} {selectedEntry.last_name}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Reported Distance: <strong>{formatDistance(selectedEntry.distance_from_pin_inches)}</strong>
                </p>
              </div>
              <Input
                label="Verified Distance (inches)"
                type="number"
                min="0"
                max="600"
                value={verifyDistance}
                onChange={(e) => setVerifyDistance(e.target.value)}
                required
              />
              <Textarea
                label="Override Reason (if different)"
                rows={3}
                value={verifyReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVerifyReason(e.target.value)}
                placeholder="Explain any distance adjustments..."
              />
            </div>
          </ModalContent>
          <ModalFooter>
            <Button variant="secondary" size="sm" responsive onClick={() => setShowEntryVerifyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" responsive onClick={handleVerifyEntry}>
              Verify
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Finalize Challenge Dialog */}
      {showFinalizeDialog && selectedChallenge && (
        <ConfirmationDialog
          open={true}
          title="Finalize Challenge?"
          message={`This will determine the winner and update the pot. Total entries: ${selectedChallenge.total_entries}. This action cannot be undone.`}
          confirmText="Finalize"
          variant="danger"
          onConfirm={handleFinalizeChallenge}
          onClose={() => setShowFinalizeDialog(false)}
        />
      )}

      {/* Delete Challenge Dialog */}
      {showDeleteDialog && selectedChallenge && (
        <ConfirmationDialog
          open={true}
          title="Delete Challenge?"
          message={`This will permanently delete "${selectedChallenge.challenge_name}" and all associated entries, shots, and payments. This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={handleDeleteChallenge}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
};

export default WeeklyChallengeAdmin;
