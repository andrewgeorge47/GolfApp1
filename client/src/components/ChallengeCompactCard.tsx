import React, { useState, useMemo } from 'react';
import { Clock, Trophy, Users, DollarSign, Camera } from 'lucide-react';
import {
  type WeeklyChallenge,
  type ChallengeEntryExtended,
  type ChallengeShotGroup,
  type ChallengeType
} from '../services/api';
import { FeedItem, SegmentedControlOption } from './ui';
import GroupPurchaseModal from './GroupPurchaseModal';
import ShotGroupSubmission from './ShotGroupSubmission';

interface ChallengeCompactCardProps {
  challenge: WeeklyChallenge & {
    challenge_type_id?: number;
    course_id?: number;
    course_name?: string;
    par?: number;
    yardage?: number;
    required_distance_yards?: number;
  };
  challengeType?: ChallengeType;
  myEntry?: ChallengeEntryExtended | null;
  onEnterSuccess?: () => void;
  onSubmitSuccess?: () => void;
  onViewLeaderboard: () => void;
}

const ChallengeCompactCard: React.FC<ChallengeCompactCardProps> = ({
  challenge,
  challengeType,
  myEntry,
  onEnterSuccess,
  onSubmitSuccess,
  onViewLeaderboard
}) => {
  const [showGroupPurchaseModal, setShowGroupPurchaseModal] = useState(false);
  const [showShotSubmissionModal, setShowShotSubmissionModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChallengeShotGroup | null>(null);
  const [isReup, setIsReup] = useState(false);
  const [segmentedValue, setSegmentedValue] = useState<'submit' | 'reup'>('submit');

  const { timeRemaining, hoursRemaining, challengeDuration } = useMemo(() => {
    const now = new Date();
    const start = new Date(challenge.week_start_date);
    const end = new Date(challenge.week_end_date);
    const diff = end.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    // Calculate challenge duration in days
    const durationMs = end.getTime() - start.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    let timeStr = '';
    if (days > 1) timeStr = `${days}d`;
    else if (hours > 0) timeStr = `${hours}h`;
    else timeStr = `${Math.floor(diff / (1000 * 60))}m`;

    return {
      timeRemaining: timeStr,
      hoursRemaining: hours,
      challengeDuration: `${durationDays}d open`
    };
  }, [challenge.week_start_date, challenge.week_end_date]);

  const groupsNeedingSubmission = myEntry?.groups?.filter(
    g => !g.shots || g.shots.length === 0 || g.status === 'purchased'
  ) || [];
  const needsSubmission = groupsNeedingSubmission.length > 0;

  const ctpPot = Number(challenge.total_entry_fees || 0) * 0.5;

  const formatCurrency = (amount: number | undefined) => {
    const num = Number(amount) || 0;
    return num >= 1000 ? `$${(num / 1000).toFixed(1)}k` : `$${num.toFixed(0)}`;
  };

  const formatDistance = (inches: number | undefined) => {
    if (inches === undefined || inches === null) return '--';
    if (inches === 0) return 'ACE!';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}' ${remainingInches}"`;
  };

  const handleEnterClick = () => {
    setIsReup(false);
    setShowGroupPurchaseModal(true);
  };

  const handleReupClick = () => {
    setIsReup(true);
    setShowGroupPurchaseModal(true);
  };

  const handleSubmitShotsClick = () => {
    if (groupsNeedingSubmission.length > 0) {
      setSelectedGroup(groupsNeedingSubmission[0]);
      setShowShotSubmissionModal(true);
    }
  };

  // Determine status based on time and user entry
  const getStatus = (): 'open' | 'ending-soon' | 'full' | 'closed' => {
    if (hoursRemaining < 0) return 'closed';
    if (hoursRemaining < 24) return 'ending-soon';
    return 'open';
  };

  // Determine action button label and handler
  const getActionConfig = () => {
    if (!myEntry) {
      return {
        label: 'Join',
        handler: handleEnterClick
      };
    }
    if (needsSubmission) {
      return {
        label: 'Submit',
        handler: handleSubmitShotsClick
      };
    }
    return {
      label: 'Re-up',
      handler: handleReupClick
    };
  };

  const actionConfig = getActionConfig();

  // Build segmented control options for joined challenges with pending submission
  const segmentedActionsConfig = needsSubmission ? {
    options: [
      { value: 'reup' as const, label: 'Re-up $3' },
      {
        value: 'submit' as const,
        label: 'Submit',
        badge: groupsNeedingSubmission.length // Show count of groups needing submission
      }
    ],
    value: segmentedValue,
    onChange: (value: string) => {
      const typedValue = value as 'submit' | 'reup';
      setSegmentedValue(typedValue);
      if (typedValue === 'reup') {
        handleReupClick();
      } else if (typedValue === 'submit') {
        handleSubmitShotsClick();
      }
    }
  } : undefined;

  // Build comprehensive subtitle with challenge details
  const buildSubtitle = () => {
    const parts: string[] = [];

    // Debug: Log challenge data to see what's available
    console.log('Challenge data:', {
      course_name: challenge.course_name,
      course_id: challenge.course_id,
      yardage: challenge.yardage,
      required_distance_yards: challenge.required_distance_yards,
      full_challenge: challenge
    });

    // 1. Challenge type (CTP, Long Drive, etc.)
    if (challengeType?.type_name) {
      parts.push(challengeType.type_name);
    }

    // 2. Course name
    if (challenge.course_name) {
      parts.push(challenge.course_name);
    }

    // 3. Hole number
    if (challenge.designated_hole) {
      parts.push(`Hole ${challenge.designated_hole}`);
    }

    // 4. Yardage (check both possible fields)
    const yardage = challenge.yardage || challenge.required_distance_yards;
    if (yardage) {
      parts.push(`${yardage} yds`);
    }

    return parts.join(' • ');
  };

  // Format duration for badge (e.g., "6d")
  const getDurationBadge = () => {
    const match = challengeDuration.match(/(\d+)d/);
    return match ? `${match[1]} day` : null;
  };

  return (
    <>
      <FeedItem
        variant="compact-minimal"
        title={challenge.challenge_name}
        titleBadge={getDurationBadge() || undefined}
        subtitle={buildSubtitle()}
        status={getStatus()}
        participants={{ current: challenge.total_entries }}
        endDate={timeRemaining}
        prize={myEntry?.best_shot ? formatDistance(myEntry.best_shot.distance_from_pin_inches) : formatCurrency(ctpPot)}
        {...(needsSubmission
          ? { segmentedActions: segmentedActionsConfig }
          : { onAction: actionConfig.handler, actionLabel: actionConfig.label }
        )}
        onClick={onViewLeaderboard}
      />

      {showGroupPurchaseModal && (
        <GroupPurchaseModal
          challenge={challenge as any}
          challengeType={challengeType}
          isReup={isReup}
          currentGroups={myEntry?.groups?.length || 0}
          onClose={() => {
            setShowGroupPurchaseModal(false);
            setIsReup(false);
          }}
          onSuccess={() => {
            setShowGroupPurchaseModal(false);
            setIsReup(false);
            onEnterSuccess?.();
          }}
        />
      )}

      {showShotSubmissionModal && selectedGroup && (
        <ShotGroupSubmission
          challenge={challenge as any}
          group={selectedGroup}
          shotsPerGroup={challengeType?.shots_per_group || 5}
          onClose={() => {
            setShowShotSubmissionModal(false);
            setSelectedGroup(null);
          }}
          onSuccess={() => {
            setShowShotSubmissionModal(false);
            setSelectedGroup(null);
            onSubmitSuccess?.();
          }}
        />
      )}
    </>
  );
};

export default ChallengeCompactCard;
