import React, { useState, useEffect } from 'react';
import { Trophy, Target, Medal, Camera, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { getChallengeLeaderboard, getChallenge, type ChallengeEntry, type WeeklyChallenge, type WeeklyChallengeExtended } from '../services/api';
import { useAuth } from '../AuthContext';
import { Card, CardHeader, CardContent, Button, Badge, Avatar, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, SimpleLoading, EmptyState } from './ui';
import DualLeaderboard from './DualLeaderboard';

interface ChallengeLeaderboardProps {
  challengeId: number;
  onBack?: () => void;
  onSubmitDistance?: (entry: ChallengeEntry) => void;
}

const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({
  challengeId,
  onBack,
  onSubmitDistance
}) => {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<WeeklyChallenge | null>(null);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiveShotChallenge, setIsFiveShotChallenge] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [challengeId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // First fetch challenge to check type
      const challengeRes = await getChallenge(challengeId);
      setChallenge(challengeRes.data);

      // Check if this is a Five-Shot challenge
      const isFiveShot = Boolean((challengeRes.data as any).challenge_type_id);
      setIsFiveShotChallenge(isFiveShot);

      // Only fetch legacy leaderboard for non-Five-Shot challenges
      if (!isFiveShot) {
        const leaderboardRes = await getChallengeLeaderboard(challengeId);
        setEntries(leaderboardRes.data);
      }
    } catch (err: any) {
      console.error('Error loading leaderboard:', err);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (inches: number | undefined) => {
    if (inches === undefined || inches === null) return '--';
    if (inches === 0) return 'Hole-in-One!';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}' ${remainingInches}"`;
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-orange-600';
      default: return 'text-gray-300';
    }
  };

  const getRankDisplay = (rank: number, entry: ChallengeEntry) => {
    if (entry.hole_in_one) {
      return (
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-yellow-600">ACE!</span>
        </div>
      );
    }

    if (rank <= 3) {
      return (
        <div className="flex items-center gap-2">
          <Medal className={`w-5 h-5 ${getMedalColor(rank)}`} />
          <span className="font-bold">{rank}</span>
        </div>
      );
    }

    return <span className="font-semibold text-gray-600">{rank}</span>;
  };

  const getStatusBadge = (entry: ChallengeEntry) => {
    if (entry.status === 'winner') {
      return <Badge variant="success"><Trophy className="w-3 h-3 mr-1" />Winner</Badge>;
    }
    if (entry.status === 'verified') {
      return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
    }
    if (entry.status === 'submitted') {
      return <Badge variant="info"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
    }
    return <Badge variant="error">Pending</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <SimpleLoading text="Loading leaderboard..." />
        </CardContent>
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={Target}
            title="Challenge Not Found"
            description="Unable to load challenge information"
          />
        </CardContent>
      </Card>
    );
  }

  // Render DualLeaderboard for Five-Shot challenges
  if (isFiveShotChallenge) {
    return (
      <Card>
        <CardContent>
          <DualLeaderboard
            challenge={challenge as WeeklyChallengeExtended}
            onBack={onBack}
          />
        </CardContent>
      </Card>
    );
  }

  const myEntry = entries.find(e => e.user_id === user?.member_id);
  const holeInOneEntries = entries.filter(e => e.hole_in_one);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mb-3"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Challenge Leaderboard</h2>
                <p className="text-gray-600">{challenge.challenge_name}</p>
              </div>
            </div>
          </div>
          <Badge variant={challenge.status === 'active' ? 'success' : 'default'} size="lg">
            {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Challenge Info */}
        {Number(challenge.entry_fee || 0) === 0 ? (
          // Free Challenge - Show prizes
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 mb-1">Designated Hole</div>
              <div className="text-2xl font-bold text-indigo-600">Hole {challenge.designated_hole}</div>
            </div>

            {/* Prize Images */}
            {((challenge as any).prize_1st_image_url || (challenge as any).prize_2nd_image_url || (challenge as any).prize_3rd_image_url) && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Prizes
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {(challenge as any).prize_1st_image_url && (
                    <div className="text-center">
                      <img
                        src={(challenge as any).prize_1st_image_url}
                        alt="1st Place Prize"
                        className="w-full h-40 object-cover rounded-lg border-2 border-yellow-400 mb-2"
                      />
                      <Badge variant="warning">1st Place</Badge>
                    </div>
                  )}
                  {(challenge as any).prize_2nd_image_url && (
                    <div className="text-center">
                      <img
                        src={(challenge as any).prize_2nd_image_url}
                        alt="2nd Place Prize"
                        className="w-full h-40 object-cover rounded-lg border-2 border-gray-400 mb-2"
                      />
                      <Badge variant="default">2nd Place</Badge>
                    </div>
                  )}
                  {(challenge as any).prize_3rd_image_url && (
                    <div className="text-center">
                      <img
                        src={(challenge as any).prize_3rd_image_url}
                        alt="3rd Place Prize"
                        className="w-full h-40 object-cover rounded-lg border-2 border-orange-600 mb-2"
                      />
                      <Badge variant="error">3rd Place</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Paid Challenge - Show stats
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Designated Hole</div>
              <div className="text-2xl font-bold text-indigo-600">Hole {challenge.designated_hole}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Entries</div>
              <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Prize Pool</div>
              <div className="text-2xl font-bold text-green-600">
                ${(Number(challenge.starting_pot || 0) + (Number(challenge.total_entry_fees) * 0.5)).toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Hole-in-Ones</div>
              <div className="text-2xl font-bold text-yellow-600">{holeInOneEntries.length}</div>
            </div>
          </div>
        )}

        {/* My Entry */}
        {myEntry && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border-2 border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">Your Standing</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Rank</div>
                <div className="text-lg font-bold">{myEntry.rank || '--'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Distance</div>
                <div className="text-lg font-bold">{formatDistance(myEntry.distance_from_pin_inches)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div>{getStatusBadge(myEntry)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Photo</div>
                <div>
                  {myEntry.photo_url ? (
                    <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Uploaded</Badge>
                  ) : (
                    <Badge variant="error"><Camera className="w-3 h-3 mr-1" />Required</Badge>
                  )}
                </div>
              </div>
            </div>
            {!myEntry.distance_from_pin_inches && onSubmitDistance && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSubmitDistance(myEntry)}
                className="mt-3"
              >
                <Target className="w-4 h-4 mr-2" />
                Submit Distance & Photo
              </Button>
            )}
          </div>
        )}

        {/* Leaderboard Table */}
        {entries.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No Entries Yet"
            description="Be the first to enter this challenge!"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-20">Rank</TableHeader>
                  <TableHeader>Player</TableHeader>
                  <TableHeader>Distance</TableHeader>
                  <TableHeader>Score</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-center">Photo</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow
                    key={entry.id}
                    className={entry.user_id === user?.member_id ? 'bg-blue-50' : ''}
                  >
                    <TableCell>
                      {getRankDisplay(entry.rank || index + 1, entry)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={entry.profile_photo_url}
                          alt={`${entry.first_name} ${entry.last_name}`}
                          size="sm"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {entry.first_name} {entry.last_name}
                            {entry.user_id === user?.member_id && (
                              <span className="ml-2 text-xs text-blue-600">(You)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{entry.club}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={entry.hole_in_one ? 'font-bold text-yellow-600' : 'font-semibold'}>
                        {formatDistance(entry.distance_from_pin_inches)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.score_on_hole !== null && entry.score_on_hole !== undefined ? (
                        <Badge variant={entry.score_on_hole === 1 ? 'success' : 'default'}>
                          {entry.score_on_hole}
                        </Badge>
                      ) : '--'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(entry)}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.photo_url ? (
                        <a
                          href={entry.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <Camera className="w-4 h-4" />
                          {entry.photo_verified && <CheckCircle className="w-3 h-3 text-green-600" />}
                        </a>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Winner Announcement */}
        {challenge.status === 'completed' && Number(challenge.payout_amount) > 0 && (
          <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-300">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-yellow-600" />
              <h3 className="text-xl font-bold text-gray-900">Challenge Complete!</h3>
            </div>
            {challenge.has_hole_in_one ? (
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Congratulations to our hole-in-one winner(s)!
                </p>
                <p className="text-gray-700">
                  Payout: ${Number(challenge.payout_amount).toFixed(2)}
                  {challenge.hole_in_one_winners && challenge.hole_in_one_winners.length > 1 &&
                    ` (split ${challenge.hole_in_one_winners.length} ways)`
                  }
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Winner: Closest to Pin
                </p>
                <p className="text-gray-700">
                  Distance: {formatDistance(challenge.closest_distance_inches)} |
                  Payout: ${Number(challenge.payout_amount).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  ${Number(challenge.rollover_amount).toFixed(2)} carried over to next week's pot!
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChallengeLeaderboard;
