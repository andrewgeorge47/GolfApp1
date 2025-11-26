import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Calendar, DollarSign, Users, CheckCircle, XCircle, Camera, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getChallenges,
  getChallengePot,
  getChallengeEntries,
  createChallenge,
  verifyChallengeEntry,
  verifyChallengePhoto,
  finalizeChallenge,
  markPayoutComplete,
  getSimulatorCourses,
  getChallengeTypes,
  getHIOJackpot,
  deleteChallenge,
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
  ConfirmationDialog
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
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEntryVerifyModal, setShowEntryVerifyModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ChallengeEntry | null>(null);

  // Create form state
  const [newChallenge, setNewChallenge] = useState({
    challenge_name: '',
    designated_hole: 1,
    entry_fee: 5,
    week_start_date: '',
    week_end_date: '',
    course_id: '',
    challenge_type_id: '',
    required_distance_yards: ''
  });

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
    if (courseSearchTerm.trim()) {
      const filtered = simulatorCourses.filter(course =>
        course.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
        (course.location && course.location.toLowerCase().includes(courseSearchTerm.toLowerCase()))
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
  }, [courseSearchTerm, simulatorCourses]);

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

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const challengeData = {
        challenge_name: newChallenge.challenge_name,
        designated_hole: newChallenge.designated_hole,
        entry_fee: newChallenge.entry_fee,
        week_start_date: newChallenge.week_start_date,
        week_end_date: newChallenge.week_end_date,
        course_id: newChallenge.course_id ? parseInt(newChallenge.course_id) : undefined,
        challenge_type_id: newChallenge.challenge_type_id ? parseInt(newChallenge.challenge_type_id) : undefined,
        required_distance_yards: newChallenge.required_distance_yards ? parseInt(newChallenge.required_distance_yards) : undefined
      };
      await createChallenge(challengeData);
      toast.success('Challenge created successfully!');
      setShowCreateModal(false);
      loadData();
      setNewChallenge({
        challenge_name: '',
        designated_hole: 1,
        entry_fee: 5,
        week_start_date: '',
        week_end_date: '',
        course_id: '',
        challenge_type_id: '',
        required_distance_yards: ''
      });
      setSelectedCourse(null);
      setCourseSearchTerm('');
    } catch (err: any) {
      console.error('Error creating challenge:', err);
      toast.error(err.response?.data?.error || 'Failed to create challenge');
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

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <Modal open={true} onClose={() => setShowCreateModal(false)} size="md">
          <form onSubmit={handleCreateChallenge} className="flex flex-col overflow-hidden h-full">
            <ModalHeader>
              Create New Challenge
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
                        entry_fee: selectedType ? Number(selectedType.default_entry_fee) : 5
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select a challenge type...</option>
                    {challengeTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.type_name} (${type.default_entry_fee} entry / ${type.default_reup_fee} re-up)
                      </option>
                    ))}
                  </select>
                  {newChallenge.challenge_type_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      {challengeTypes.find(t => t.id.toString() === newChallenge.challenge_type_id)?.description}
                    </p>
                  )}
                </div>

                <Input
                  label="Challenge Name"
                  value={newChallenge.challenge_name}
                  onChange={(e) => setNewChallenge({ ...newChallenge, challenge_name: e.target.value })}
                  required
                  placeholder="Week 1 Five-Shot Challenge"
                />

                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course <span className="text-xs text-gray-500">(Optional)</span>
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
                              <div className="font-medium text-gray-900">{course.name}</div>
                              {course.location && (
                                <div className="text-sm text-gray-500">{course.location}</div>
                              )}
                            </button>
                          ))
                        ) : courseSearchTerm ? (
                          <div className="px-4 py-3 text-gray-500 text-sm">
                            No courses found
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

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
                <Input
                  label="Entry Fee ($)"
                  type="number"
                  min="1"
                  step="0.01"
                  value={newChallenge.entry_fee}
                  onChange={(e) => setNewChallenge({ ...newChallenge, entry_fee: parseFloat(e.target.value) })}
                  required
                />
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
