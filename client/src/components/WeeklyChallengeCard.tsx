import React, { useState, useEffect } from 'react';
import { Target, Trophy, DollarSign, Calendar, Users, Award, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { getActiveChallenge, getMyChallengeEntry, getChallengePot, type WeeklyChallenge, type ChallengeEntry, type ChallengePot } from '../services/api';
import { useAuth } from '../AuthContext';
import { Card, CardHeader, CardContent, Button, Badge, StatCard, SimpleLoading } from './ui';
import ChallengeEntryModal from './ChallengeEntryModal';

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
  const [myEntry, setMyEntry] = useState<ChallengeEntry | null>(null);
  const [pot, setPot] = useState<ChallengePot | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);

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

      // Load user's entry if logged in
      if (user && challengeRes.data) {
        try {
          const entryRes = await getMyChallengeEntry(challengeRes.data.id);
          setMyEntry(entryRes.data);
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

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '$0';
    return `$${amount.toFixed(2)}`;
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

  const totalPot = (challenge.starting_pot || 0) + (challenge.total_entry_fees * 0.5);
  const potentialWinnings = challenge.has_hole_in_one ? totalPot + challenge.total_entry_fees : challenge.total_entry_fees * 0.5;

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

          {/* Pot Breakdown */}
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Prize Pool Breakdown
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Carried Over from Previous Weeks</span>
                <span className="font-semibold text-gray-900">{formatCurrency(challenge.starting_pot)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Week's Entries (50%)</span>
                <span className="font-semibold text-gray-900">{formatCurrency(challenge.total_entry_fees * 0.5)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total Challenge Pot</span>
                <span className="font-bold text-lg text-indigo-600">{formatCurrency(totalPot)}</span>
              </div>
            </div>
          </div>

          {/* Payout Info */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6 border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              How it Works
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">•</span>
                <span><strong>Hole-in-One:</strong> Win entire pot ({formatCurrency(totalPot)}) + full week's entries ({formatCurrency(challenge.total_entry_fees)}) = <strong className="text-green-600">{formatCurrency(totalPot + challenge.total_entry_fees)}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>Closest to Pin:</strong> Win 50% of this week's entries = <strong className="text-blue-600">{formatCurrency(challenge.total_entry_fees * 0.5)}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-600 font-bold mt-0.5">•</span>
                <span>Remaining 50% rolls over to grow next week's pot!</span>
              </li>
            </ul>
          </div>

          {/* My Entry Status */}
          {myEntry && (
            <div className="bg-white rounded-lg p-4 mb-6 border-2 border-green-200">
              <h4 className="font-semibold text-gray-900 mb-3">Your Entry Status</h4>
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
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!myEntry ? (
              <Button
                onClick={() => setShowEntryModal(true)}
                className="flex-1"
                variant="primary"
                size="lg"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Enter Challenge ({formatCurrency(challenge.entry_fee)})
              </Button>
            ) : (
              <Button
                onClick={() => onViewLeaderboard?.(challenge.id)}
                className="flex-1"
                variant="primary"
                size="lg"
              >
                <Trophy className="w-5 h-5 mr-2" />
                View Leaderboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entry Modal */}
      {showEntryModal && challenge && (
        <ChallengeEntryModal
          challenge={challenge}
          onClose={() => setShowEntryModal(false)}
          onSuccess={handleEntrySuccess}
        />
      )}
    </>
  );
};

export default WeeklyChallengeCard;
