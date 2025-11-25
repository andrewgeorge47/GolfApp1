import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getChallenges,
  getMyChallengeEntry,
  getHIOJackpot,
  getChallengeTypes,
  type WeeklyChallenge,
  type ChallengeEntryExtended,
  type ChallengeType,
  type ChallengeHIOJackpot
} from '../services/api';
import { useAuth } from '../AuthContext';
import SharedJackpotHeader from './SharedJackpotHeader';
import ChallengeCompactCard from './ChallengeCompactCard';
import { EmptyState, SimpleLoading } from './ui';

type ChallengeSortOption = 'ending' | 'newest' | 'pot' | 'entries';
type ChallengeFilterOption = 'all' | 'not_entered' | 'entered' | 'needs_submission';

interface WeeklyChallengeExtended extends WeeklyChallenge {
  course_name?: string;
  par?: number;
  yardage?: number;
  challenge_type_id?: number;
}

const ChallengesList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [challenges, setChallenges] = useState<WeeklyChallengeExtended[]>([]);
  const [myEntries, setMyEntries] = useState<Map<number, ChallengeEntryExtended>>(new Map());
  const [challengeTypes, setChallengeTypes] = useState<ChallengeType[]>([]);
  const [hioJackpot, setHioJackpot] = useState<ChallengeHIOJackpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<ChallengeSortOption>('ending');
  const [filterBy, setFilterBy] = useState<ChallengeFilterOption>('all');

  useEffect(() => {
    loadAllChallenges();
  }, []);

  const loadAllChallenges = async () => {
    setLoading(true);
    try {
      // Fetch all active challenges
      const [challengesRes, typesRes, jackpotRes] = await Promise.all([
        getChallenges({ status: 'active' }),
        getChallengeTypes(),
        getHIOJackpot().catch(() => ({ data: null }))
      ]);

      setChallenges(challengesRes.data);
      setChallengeTypes(typesRes.data);
      if (jackpotRes.data) setHioJackpot(jackpotRes.data);

      // Fetch user's entries for all challenges if logged in
      if (user) {
        const entriesMap = new Map<number, ChallengeEntryExtended>();

        await Promise.all(
          challengesRes.data.map(async (challenge) => {
            try {
              const entryRes = await getMyChallengeEntry(challenge.id);
              entriesMap.set(challenge.id, entryRes.data as ChallengeEntryExtended);
            } catch (err: any) {
              // User hasn't entered this challenge (404 is expected)
              if (err.response?.status !== 404) {
                console.error(`Error loading entry for challenge ${challenge.id}:`, err);
              }
            }
          })
        );

        setMyEntries(entriesMap);
      }
    } catch (err) {
      console.error('Error loading challenges:', err);
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterSuccess = () => {
    // Silently reload - payment modal already shows success
    loadAllChallenges();
  };

  const handleSubmitSuccess = () => {
    // Silently reload - submission modal already shows success
    loadAllChallenges();
  };

  // Helper: Get hours remaining for a challenge
  const getHoursRemaining = (endDate: string): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  };

  // Sort challenges
  const sortChallenges = (
    challengesToSort: WeeklyChallengeExtended[],
    sortOption: ChallengeSortOption
  ): WeeklyChallengeExtended[] => {
    const sorted = [...challengesToSort];

    switch (sortOption) {
      case 'ending':
        return sorted.sort((a, b) =>
          new Date(a.week_end_date).getTime() - new Date(b.week_end_date).getTime()
        );
      case 'newest':
        return sorted.sort((a, b) =>
          new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
        );
      case 'pot':
        return sorted.sort((a, b) =>
          (Number(b.total_entry_fees) * 0.5) - (Number(a.total_entry_fees) * 0.5)
        );
      case 'entries':
        return sorted.sort((a, b) => b.total_entries - a.total_entries);
      default:
        return sorted;
    }
  };

  // Filter challenges
  const filterChallenges = (
    challengesToFilter: WeeklyChallengeExtended[],
    filterOption: ChallengeFilterOption
  ): WeeklyChallengeExtended[] => {
    switch (filterOption) {
      case 'all':
        return challengesToFilter;
      case 'not_entered':
        return challengesToFilter.filter(c => !myEntries.has(c.id));
      case 'entered':
        return challengesToFilter.filter(c => myEntries.has(c.id));
      case 'needs_submission':
        return challengesToFilter.filter(c => {
          const entry = myEntries.get(c.id);
          if (!entry || !entry.groups) return false;
          return entry.groups.some(g => !g.shots || g.shots.length === 0 || g.status === 'purchased');
        });
      default:
        return challengesToFilter;
    }
  };

  // Group challenges by urgency
  const groupedChallenges = useMemo(() => {
    const sorted = sortChallenges(challenges, sortBy);
    const filtered = filterChallenges(sorted, filterBy);

    const endingSoon: WeeklyChallengeExtended[] = [];
    const active: WeeklyChallengeExtended[] = [];
    const closed: WeeklyChallengeExtended[] = [];

    filtered.forEach(challenge => {
      const hoursRemaining = getHoursRemaining(challenge.week_end_date);
      if (hoursRemaining < 0) {
        closed.push(challenge);
      } else if (hoursRemaining < 24) {
        endingSoon.push(challenge);
      } else {
        active.push(challenge);
      }
    });

    return { endingSoon, active, closed, total: filtered.length };
  }, [challenges, sortBy, filterBy, myEntries]);

  // Get challenge type for a challenge
  const getChallengeType = (challenge: WeeklyChallengeExtended): ChallengeType | undefined => {
    if (!challenge.challenge_type_id) return undefined;
    return challengeTypes.find(t => t.id === challenge.challenge_type_id);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* <SharedJackpotHeader amount={0} loading={true} /> */}
        <SimpleLoading text="Loading challenges..." />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="space-y-6">
        {/* <SharedJackpotHeader amount={hioJackpot?.current_amount || 0} /> */}
        <EmptyState
          icon={Target}
          title="No Active Challenges"
          description="There are no CTP challenges running right now. Check back soon for new challenges!"
        >
          <p className="text-sm text-gray-500 mt-2">
            Challenges typically run throughout the week with different durations and prize pools.
          </p>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shared Jackpot Header - Temporarily hidden */}
      {/* <SharedJackpotHeader amount={hioJackpot?.current_amount || 0} /> */}

      {/* No Results After Filtering */}
      {groupedChallenges.total === 0 && (
        <EmptyState
          icon={Target}
          title="No Challenges Match Your Filter"
          description={
            filterBy === 'not_entered' ? "You've entered all active challenges!" :
            filterBy === 'entered' ? "You haven't entered any challenges yet." :
            filterBy === 'needs_submission' ? "All your shot groups are submitted. Nice work!" :
            "Try adjusting your filters."
          }
        />
      )}

      {/* Ending Soon Section */}
      {groupedChallenges.endingSoon.length > 0 && (
        <div className="space-y-4">
          {groupedChallenges.endingSoon.map(challenge => (
            <ChallengeCompactCard
              key={challenge.id}
              challenge={challenge}
              challengeType={getChallengeType(challenge)}
              myEntry={myEntries.get(challenge.id)}
              onEnterSuccess={handleEnterSuccess}
              onSubmitSuccess={handleSubmitSuccess}
              onViewLeaderboard={() => navigate(`/challenges/${challenge.id}`)}
            />
          ))}
        </div>
      )}

      {/* Active Challenges Section */}
      {groupedChallenges.active.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-brand-neon-green/30">
            <div className="flex items-center gap-2 text-brand-neon-green">
              <Target className="w-5 h-5" />
              <h2 className="text-lg font-bold">Active Challenges</h2>
            </div>
            <span className="text-sm text-white/70">
              ({groupedChallenges.active.length} challenge{groupedChallenges.active.length !== 1 ? 's' : ''})
            </span>
          </div>
          {groupedChallenges.active.map(challenge => (
            <ChallengeCompactCard
              key={challenge.id}
              challenge={challenge}
              challengeType={getChallengeType(challenge)}
              myEntry={myEntries.get(challenge.id)}
              onEnterSuccess={handleEnterSuccess}
              onSubmitSuccess={handleSubmitSuccess}
              onViewLeaderboard={() => navigate(`/challenges/${challenge.id}`)}
            />
          ))}
        </div>
      )}

      {/* Closed Challenges Section */}
      {groupedChallenges.closed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/20">
            <div className="flex items-center gap-2 text-white/60">
              <Target className="w-5 h-5" />
              <h2 className="text-lg font-bold">Closed Challenges</h2>
            </div>
            <span className="text-sm text-white/40">
              ({groupedChallenges.closed.length} challenge{groupedChallenges.closed.length !== 1 ? 's' : ''})
            </span>
          </div>
          {groupedChallenges.closed.map(challenge => (
            <ChallengeCompactCard
              key={challenge.id}
              challenge={challenge}
              challengeType={getChallengeType(challenge)}
              myEntry={myEntries.get(challenge.id)}
              onEnterSuccess={handleEnterSuccess}
              onSubmitSuccess={handleSubmitSuccess}
              onViewLeaderboard={() => navigate(`/challenges/${challenge.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChallengesList;
