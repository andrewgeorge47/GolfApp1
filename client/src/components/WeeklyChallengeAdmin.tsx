import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Calendar, DollarSign, Users, CheckCircle, XCircle, Camera, Edit } from 'lucide-react';
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
  type WeeklyChallenge,
  type ChallengeEntry,
  type ChallengePot
} from '../services/api';
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
  const [selectedChallenge, setSelectedChallenge] = useState<WeeklyChallenge | null>(null);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showEntryVerifyModal, setShowEntryVerifyModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ChallengeEntry | null>(null);

  // Create form state
  const [newChallenge, setNewChallenge] = useState({
    challenge_name: '',
    designated_hole: 1,
    entry_fee: 10,
    week_start_date: '',
    week_end_date: ''
  });

  // Verify entry form state
  const [verifyDistance, setVerifyDistance] = useState('');
  const [verifyReason, setVerifyReason] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengesRes, potRes] = await Promise.all([
        getChallenges({ status: activeTab === 'history' ? 'completed' : 'active' }),
        getChallengePot()
      ]);

      setChallenges(challengesRes.data);
      setPot(potRes.data);

      if (challengesRes.data.length > 0 && activeTab === 'current') {
        selectChallenge(challengesRes.data[0]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load challenge data');
    } finally {
      setLoading(false);
    }
  };

  const selectChallenge = async (challenge: WeeklyChallenge) => {
    setSelectedChallenge(challenge);
    try {
      const entriesRes = await getChallengeEntries(challenge.id);
      setEntries(entriesRes.data);
      setActiveTab('entries');
    } catch (err) {
      console.error('Error loading entries:', err);
      toast.error('Failed to load entries');
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createChallenge(newChallenge);
      toast.success('Challenge created successfully!');
      setShowCreateModal(false);
      loadData();
      setNewChallenge({
        challenge_name: '',
        designated_hole: 1,
        entry_fee: 10,
        week_start_date: '',
        week_end_date: ''
      });
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Challenge Administration</h2>
                <p className="text-gray-600">Manage weekly hole-in-one challenges</p>
              </div>
            </div>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Challenge
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pot && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Current Pot</div>
                <div className="text-2xl font-bold text-green-600">${pot.current_amount.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Weeks Accumulated</div>
                <div className="text-2xl font-bold text-blue-600">{pot.weeks_accumulated}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Paid Out</div>
                <div className="text-2xl font-bold text-purple-600">${pot.total_contributions.toFixed(2)}</div>
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
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{challenge.challenge_name}</h3>
                            <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600">Hole:</span>
                                <span className="ml-2 font-semibold">{challenge.designated_hole}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Entries:</span>
                                <span className="ml-2 font-semibold">{challenge.total_entries}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Pot:</span>
                                <span className="ml-2 font-semibold text-green-600">
                                  ${((challenge.starting_pot || 0) + (challenge.total_entry_fees * 0.5)).toFixed(2)}
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
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChallenge(challenge);
                                setShowFinalizeDialog(true);
                              }}
                            >
                              Finalize
                            </Button>
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
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Player</TableHeader>
                        <TableHeader>Distance</TableHeader>
                        <TableHeader>Photo</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={entry.profile_photo_url}
                                alt={`${entry.first_name} ${entry.last_name}`}
                                size="sm"
                              />
                              <div>
                                <div className="font-semibold">{entry.first_name} {entry.last_name}</div>
                                <div className="text-xs text-gray-500">{entry.club}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={entry.hole_in_one ? 'font-bold text-yellow-600' : ''}>
                              {formatDistance(entry.distance_from_pin_inches)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {entry.photo_url ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={entry.photo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  <Camera className="w-4 h-4" />
                                </a>
                                {entry.photo_verified && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.status === 'winner' ? 'success' :
                                entry.status === 'verified' ? 'success' :
                                entry.status === 'submitted' ? 'info' : 'warning'
                              }
                            >
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {entry.photo_url && !entry.photo_verified && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleVerifyPhoto(entry)}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                              )}
                              {!entry.distance_verified && (
                                <Button
                                  variant="primary"
                                  size="sm"
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <div className="space-y-4">
                    {challenges.map((challenge) => (
                      <div key={challenge.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{challenge.challenge_name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Winner Type:</span>
                            <span className="ml-2 font-semibold">
                              {challenge.has_hole_in_one ? 'Hole-in-One' : 'Closest to Pin'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Payout:</span>
                            <span className="ml-2 font-semibold text-green-600">
                              ${challenge.payout_amount.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rollover:</span>
                            <span className="ml-2 font-semibold">${challenge.rollover_amount.toFixed(2)}</span>
                          </div>
                          <div>
                            {!challenge.payout_completed && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleMarkPayoutComplete(challenge.id)}
                              >
                                Mark Paid
                              </Button>
                            )}
                            {challenge.payout_completed && (
                              <Badge variant="success">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid Out
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
          <form onSubmit={handleCreateChallenge}>
            <ModalHeader>
              Create New Challenge
            </ModalHeader>
            <ModalContent>
              <div className="space-y-4">
                <Input
                  label="Challenge Name"
                  value={newChallenge.challenge_name}
                  onChange={(e) => setNewChallenge({ ...newChallenge, challenge_name: e.target.value })}
                  required
                  placeholder="Weekly Hole-in-One Challenge"
                />
                <Input
                  label="Designated Hole"
                  type="number"
                  min="1"
                  max="9"
                  value={newChallenge.designated_hole}
                  onChange={(e) => setNewChallenge({ ...newChallenge, designated_hole: parseInt(e.target.value) })}
                  required
                />
                <Input
                  label="Entry Fee"
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
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Challenge
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
            <Button variant="secondary" onClick={() => setShowEntryVerifyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleVerifyEntry}>
              Verify Entry
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
    </div>
  );
};

export default WeeklyChallengeAdmin;
