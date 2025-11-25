import React, { useState, useEffect } from 'react';
import { Target, Trophy, DollarSign, Calendar, Users, Award, TrendingUp, Camera, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getActiveChallenge,
  getMyChallengeEntry,
  getChallengePot,
  getHIOJackpot,
  getChallengeTypes,
  type WeeklyChallenge,
  type ChallengeEntry,
  type ChallengePot,
  type ChallengeEntryExtended,
  type ChallengeShotGroup,
  type ChallengeType,
  type ChallengeHIOJackpot
} from '../services/api';
import { useAuth } from '../AuthContext';
import { Card, CardHeader, CardContent, Button, Badge, StatCard, SimpleLoading } from './ui';
import ChallengeEntryModal from './ChallengeEntryModal';
import ChallengeDistanceSubmission from './ChallengeDistanceSubmission';
import GroupPurchaseModal from './GroupPurchaseModal';
import ShotGroupSubmission from './ShotGroupSubmission';

interface WeeklyChallengeCardProps {
  onEntrySuccess?: () => void;
  onViewLeaderboard?: (challengeId: number) => void;
}

const WeeklyChallengeCard: React.FC<WeeklyChallengeCardProps> = ({
  onEntrySuccess,
  onViewLeaderboard
}) => {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<WeeklyChallenge | null>(null);
  const [myEntry, setMyEntry] = useState<ChallengeEntryExtended | null>(null);
  const [pot, setPot] = useState<ChallengePot | null>(null);
  const [hioJackpot, setHioJackpot] = useState<ChallengeHIOJackpot | null>(null);
  const [challengeType, setChallengeType] = useState<ChallengeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [showGroupPurchaseModal, setShowGroupPurchaseModal] = useState(false);
  const [showShotSubmissionModal, setShowShotSubmissionModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChallengeShotGroup | null>(null);
  const [isReup, setIsReup] = useState(false);

  // Check if this is a Five-Shot challenge
  const isFiveShotChallenge = Boolean(challenge && (challenge as any).challenge_type_id);

  useEffect(() => {
    loadChallengeData();
  }, []);

  const loadChallengeData = async () => {
    setLoading(true);
    try {
      // Load active challenge
      const challengeRes = await getActiveChallenge();
      setChallenge(challengeRes.data);

      // Load pot info
      const potRes = await getChallengePot();
      setPot(potRes.data);

      // Load HIO jackpot for Five-Shot challenges
      try {
        const hioRes = await getHIOJackpot();
        setHioJackpot(hioRes.data);
      } catch (err) {
        // HIO jackpot table might not exist yet
      }

      // Load challenge type if this is a Five-Shot challenge
      const challengeData = challengeRes.data as any;
      if (challengeData?.challenge_type_id) {
        try {
          const typesRes = await getChallengeTypes();
          const type = typesRes.data.find((t: ChallengeType) => t.id === challengeData.challenge_type_id);
          if (type) setChallengeType(type);
        } catch (err) {
          console.error('Error loading challenge type:', err);
        }
      }

      // Load user's entry if logged in
      if (user && challengeRes.data) {
        try {
          const entryRes = await getMyChallengeEntry(challengeRes.data.id);
          setMyEntry(entryRes.data as ChallengeEntryExtended);
        } catch (err: any) {
          if (err.response?.status !== 404) {
            console.error('Error loading entry:', err);
          }
        }
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Error loading challenge:', err);
        toast.error('Failed to load challenge');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return '$0';
    return `$${Number(amount).toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDistance = (inches: number | undefined) => {
    if (inches === undefined || inches === null) return '--';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}' ${remainingInches}"`;
  };

  const handleEntrySuccess = () => {
    setShowEntryModal(false);
    loadChallengeData();
    onEntrySuccess?.();
    toast.success('Successfully entered the challenge!');
  };

  const handleDistanceSuccess = () => {
    setShowDistanceModal(false);
    loadChallengeData();
    toast.success('Distance and photo submitted successfully!');
  };

  const handleGroupPurchaseSuccess = () => {
    setShowGroupPurchaseModal(false);
    setIsReup(false);
    loadChallengeData();
    toast.success(isReup ? 'Re-up purchased successfully!' : 'Successfully entered the challenge!');
    onEntrySuccess?.();
  };

  const handleShotSubmissionSuccess = () => {
    setShowShotSubmissionModal(false);
    setSelectedGroup(null);
    loadChallengeData();
    toast.success('Shots submitted successfully!');
  };

  const handleEnterClick = () => {
    if (isFiveShotChallenge) {
      setIsReup(false);
      setShowGroupPurchaseModal(true);
    } else {
      setShowEntryModal(true);
    }
  };

  const handleReupClick = () => {
    setIsReup(true);
    setShowGroupPurchaseModal(true);
  };

  const handleSubmitShotsClick = (group: ChallengeShotGroup) => {
    setSelectedGroup(group);
    setShowShotSubmissionModal(true);
  };

  // Get groups that need shots submitted
  const groupsNeedingSubmission = myEntry?.groups?.filter(
    g => !g.shots || g.shots.length === 0 || g.status === 'purchased'
  ) || [];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <SimpleLoading text="Loading challenge..." />
        </CardContent>
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No active hole-in-one challenge this week</p>
        </CardContent>
      </Card>
    );
  }

  const totalPot = Number(challenge.starting_pot || 0) + (Number(challenge.total_entry_fees) * 0.5);
  const potentialWinnings = challenge.has_hole_in_one ? totalPot + Number(challenge.total_entry_fees) : Number(challenge.total_entry_fees) * 0.5;

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{challenge.challenge_name}</h3>
                <p className="text-sm text-gray-600">
                  {formatDate(challenge.week_start_date)} - {formatDate(challenge.week_end_date)}
                </p>
              </div>
            </div>
            <Badge variant={myEntry ? 'success' : 'warning'} size="lg">
              {myEntry ? 'Entered' : 'Open'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Key Stats */}
          {isFiveShotChallenge ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={<Target className="w-5 h-5" />}
                label="Designated Hole"
                value={`Hole ${challenge.designated_hole}`}
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Entries"
                value={challenge.total_entries.toString()}
              />
              <StatCard
                icon={<Trophy className="w-5 h-5" />}
                label="CTP Prize"
                value={formatCurrency(Number(challenge.total_entry_fees) * 0.5)}
              />
              <StatCard
                icon={<Award className="w-5 h-5" />}
                label="HIO Jackpot"
                value={formatCurrency(hioJackpot?.current_amount || 0)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={<Target className="w-5 h-5" />}
                label="Designated Hole"
                value={`Hole ${challenge.designated_hole}`}
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5" />}
                label="Entry Fee"
                value={formatCurrency(challenge.entry_fee)}
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Entries"
                value={challenge.total_entries.toString()}
              />
              <StatCard
                icon={<Trophy className="w-5 h-5" />}
                label="Challenge Pot"
                value={formatCurrency(totalPot)}
              />
            </div>
          )}

          {/* Pot Breakdown */}
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Prize Pool Breakdown
            </h4>
            {isFiveShotChallenge ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">CTP Prize Pool (50% of entries)</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(Number(challenge.total_entry_fees) * 0.5)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">HIO Jackpot (rolling)</span>
                  <span className="font-semibold text-green-600">{formatCurrency(hioJackpot?.current_amount || 0)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <p className="text-xs text-gray-500">
                    Each entry: 50% to CTP, 30% to HIO jackpot, 20% admin fee
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Carried Over from Previous Weeks</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(challenge.starting_pot)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">This Week's Entries (50%)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(Number(challenge.total_entry_fees) * 0.5)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Challenge Pot</span>
                  <span className="font-bold text-lg text-indigo-600">{formatCurrency(totalPot)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payout Info */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6 border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              How it Works
            </h4>
            {isFiveShotChallenge ? (
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold mt-0.5">1.</span>
                  <span><strong>Enter for ${challenge.entry_fee}</strong> and get {challengeType?.shots_per_group || 5} shots at hole {challenge.designated_hole}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold mt-0.5">2.</span>
                  <span><strong>Re-up for ${challengeType?.default_reup_fee || 3}</strong> to purchase additional {challengeType?.shots_per_group || 5}-shot groups (unlimited)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">3.</span>
                  <span><strong>Closest to Pin:</strong> Top 3 split 50% of pot (50/30/20) = <strong className="text-blue-600">{formatCurrency(Number(challenge.total_entry_fees) * 0.5)}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold mt-0.5">4.</span>
                  <span><strong>Hole-in-One:</strong> Split the rolling jackpot = <strong className="text-green-600">{formatCurrency(hioJackpot?.current_amount || 0)}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 font-bold mt-0.5">•</span>
                  <span>30% of entries go to HIO jackpot each week (rolls over if no ace)</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold mt-0.5">•</span>
                  <span><strong>Hole-in-One:</strong> Win entire pot ({formatCurrency(totalPot)}) + full week's entries ({formatCurrency(challenge.total_entry_fees)}) = <strong className="text-green-600">{formatCurrency(totalPot + Number(challenge.total_entry_fees))}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span><strong>Closest to Pin:</strong> Win 50% of this week's entries = <strong className="text-blue-600">{formatCurrency(Number(challenge.total_entry_fees) * 0.5)}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 font-bold mt-0.5">•</span>
                  <span>Remaining 50% rolls over to grow next week's pot!</span>
                </li>
              </ul>
            )}
          </div>

          {/* My Entry Status */}
          {myEntry && (
            <div className="bg-white rounded-lg p-4 mb-6 border-2 border-green-200">
              <h4 className="font-semibold text-gray-900 mb-3">Your Entry Status</h4>

              {/* Five-Shot Challenge: Show groups */}
              {isFiveShotChallenge && myEntry.groups && myEntry.groups.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Groups Purchased</span>
                    <span className="font-semibold">{myEntry.groups_purchased || myEntry.groups.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-semibold text-green-600">{formatCurrency(myEntry.total_paid || myEntry.payment_amount)}</span>
                  </div>

                  {/* Group list */}
                  <div className="space-y-2 pt-2 border-t">
                    {myEntry.groups.map(group => (
                      <div
                        key={group.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          group.status === 'purchased' ? 'bg-yellow-50' :
                          group.status === 'submitted' ? 'bg-blue-50' :
                          group.status === 'verified' ? 'bg-green-50' : 'bg-gray-50'
                        }`}
                      >
                        <div>
                          <span className="font-medium">Group {group.group_number}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {group.shots?.length || 0} shots
                          </span>
                        </div>
                        {group.status === 'purchased' ? (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleSubmitShotsClick(group)}
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Submit
                          </Button>
                        ) : (
                          <Badge variant={
                            group.status === 'verified' ? 'success' :
                            group.status === 'submitted' ? 'info' : 'warning'
                          }>
                            {group.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Best shot info */}
                  {myEntry.best_shot && (
                    <div className="pt-2 border-t">
                      <span className="text-gray-600 text-sm">Best Shot</span>
                      <p className="font-bold text-lg">
                        {myEntry.best_shot.is_hole_in_one
                          ? <span className="text-green-600">HOLE-IN-ONE!</span>
                          : formatDistance(myEntry.best_shot.distance_from_pin_inches)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Legacy challenge: Show old format */
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Payment Status</span>
                    <p className="font-semibold text-green-600">Paid ({formatCurrency(myEntry.payment_amount)})</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status</span>
                    <Badge variant={
                      myEntry.status === 'winner' ? 'success' :
                      myEntry.status === 'verified' ? 'success' :
                      myEntry.status === 'submitted' ? 'info' : 'warning'
                    }>
                      {myEntry.status.charAt(0).toUpperCase() + myEntry.status.slice(1)}
                    </Badge>
                  </div>
                  {myEntry.hole_in_one && (
                    <div className="col-span-2">
                      <Badge variant="success" size="lg" className="w-full justify-center">
                        <Trophy className="w-4 h-4 mr-2" />
                        HOLE IN ONE!
                      </Badge>
                    </div>
                  )}
                  {myEntry.distance_from_pin_inches !== null && !myEntry.hole_in_one && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Distance from Pin</span>
                      <p className="font-semibold text-gray-900">{formatDistance(myEntry.distance_from_pin_inches)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!myEntry ? (
              <Button
                onClick={handleEnterClick}
                className="flex-1"
                variant="primary"
                size="lg"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Enter Challenge ({formatCurrency(challenge.entry_fee)})
              </Button>
            ) : isFiveShotChallenge ? (
              /* Five-Shot Challenge actions */
              <>
                <Button
                  onClick={handleReupClick}
                  className="flex-1"
                  variant="secondary"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Re-up ({formatCurrency(challengeType?.default_reup_fee || 3)})
                </Button>
                <Button
                  onClick={() => onViewLeaderboard?.(challenge.id)}
                  className="flex-1"
                  variant="primary"
                  size="lg"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Leaderboard
                </Button>
              </>
            ) : (
              /* Legacy challenge actions */
              <>
                {(myEntry.distance_from_pin_inches === null || myEntry.distance_from_pin_inches === undefined) && (
                  <Button
                    onClick={() => setShowDistanceModal(true)}
                    className="flex-1"
                    variant="success"
                    size="lg"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Submit Distance & Photo
                  </Button>
                )}
                <Button
                  onClick={() => onViewLeaderboard?.(challenge.id)}
                  className="flex-1"
                  variant="primary"
                  size="lg"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  View Leaderboard
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entry Modal (Legacy) */}
      {showEntryModal && challenge && (
        <ChallengeEntryModal
          challenge={challenge}
          onClose={() => setShowEntryModal(false)}
          onSuccess={handleEntrySuccess}
        />
      )}

      {/* Distance Submission Modal (Legacy) */}
      {showDistanceModal && challenge && myEntry && (
        <ChallengeDistanceSubmission
          challenge={challenge}
          entry={myEntry as ChallengeEntry}
          onClose={() => setShowDistanceModal(false)}
          onSuccess={handleDistanceSuccess}
        />
      )}

      {/* Five-Shot: Group Purchase Modal */}
      {showGroupPurchaseModal && challenge && (
        <GroupPurchaseModal
          challenge={challenge as any}
          challengeType={challengeType || undefined}
          isReup={isReup}
          currentGroups={myEntry?.groups?.length || 0}
          onClose={() => {
            setShowGroupPurchaseModal(false);
            setIsReup(false);
          }}
          onSuccess={handleGroupPurchaseSuccess}
        />
      )}

      {/* Five-Shot: Shot Submission Modal */}
      {showShotSubmissionModal && challenge && selectedGroup && (
        <ShotGroupSubmission
          challenge={challenge as any}
          group={selectedGroup}
          shotsPerGroup={challengeType?.shots_per_group || 5}
          onClose={() => {
            setShowShotSubmissionModal(false);
            setSelectedGroup(null);
          }}
          onSuccess={handleShotSubmissionSuccess}
        />
      )}
    </>
  );
};

export default WeeklyChallengeCard;
