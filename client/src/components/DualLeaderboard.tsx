import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, Medal, CheckCircle, Clock, Image } from 'lucide-react';
import {
  WeeklyChallengeExtended,
  CTPLeaderboardEntry,
  HIOLeaderboardEntry,
  ChallengeHIOJackpot,
  getWeeklyCTPLeaderboard,
  getWeeklyHIOLeaderboard,
  getHIOJackpot
} from '../services/api';
import { useAuth } from '../AuthContext';
import { Alert } from './ui';
import { getAbsoluteUrl } from '../config/environment';

interface DualLeaderboardProps {
  challenge: WeeklyChallengeExtended;
  onBack?: () => void;
}

const DualLeaderboard: React.FC<DualLeaderboardProps> = ({ challenge, onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ctp' | 'hio'>('ctp');
  const [ctpEntries, setCtpEntries] = useState<CTPLeaderboardEntry[]>([]);
  const [hioEntries, setHioEntries] = useState<HIOLeaderboardEntry[]>([]);
  const [hioJackpot, setHioJackpot] = useState<ChallengeHIOJackpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, [challenge.id]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const [ctpRes, hioRes, jackpotRes] = await Promise.all([
        getWeeklyCTPLeaderboard(challenge.id),
        getWeeklyHIOLeaderboard(challenge.id),
        getHIOJackpot()
      ]);
      setCtpEntries(ctpRes.data);
      setHioEntries(hioRes.data);
      setHioJackpot(jackpotRes.data);
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (inches: number) => {
    if (inches === 0) return 'HOLE-IN-ONE!';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    if (feet === 0) return `${remainingInches}"`;
    if (remainingInches === 0) return `${feet}'`;
    return `${feet}' ${remainingInches}"`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center text-gray-500">{rank}</span>;
  };

  const userCTPEntry = ctpEntries.find(e => e.user_id === user?.member_id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold">{challenge.challenge_name}</h2>
          <p className="text-sm text-gray-600">
            Hole {challenge.designated_hole}
            {challenge.required_distance_yards && ` • ${challenge.required_distance_yards} yds`}
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{ctpEntries.length}</p>
          <p className="text-xs text-blue-700">Entries</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            ${((challenge.total_entry_fees || 0) * 0.5).toFixed(0)}
          </p>
          <p className="text-xs text-green-700">CTP Prize</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">
            ${Number(hioJackpot?.current_amount || 0).toFixed(0)}
          </p>
          <p className="text-xs text-purple-700">HIO Jackpot</p>
        </div>
      </div>

      {/* User's Standing */}
      {userCTPEntry && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Your Best Shot</p>
              <p className="text-lg font-bold text-yellow-900">
                {userCTPEntry.is_hole_in_one
                  ? 'HOLE-IN-ONE!'
                  : formatDistance(userCTPEntry.distance_inches)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-yellow-800">Rank</p>
              <p className="text-2xl font-bold text-yellow-900">#{userCTPEntry.rank}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('ctp')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ctp'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Closest to Pin ({ctpEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('hio')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'hio'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          Hole-in-Ones ({hioEntries.length})
        </button>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="py-8 text-center text-gray-500">
          Loading leaderboard...
        </div>
      )}

      {error && (
        <Alert variant="error" className="my-4">{error}</Alert>
      )}

      {/* CTP Leaderboard */}
      {!loading && activeTab === 'ctp' && (
        <div className="space-y-2">
          {ctpEntries.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No shots submitted yet
            </p>
          ) : (
            ctpEntries.map(entry => (
              <div
                key={entry.shot_id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  entry.user_id === user?.member_id
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankBadge(entry.rank)}
                </div>

                {entry.profile_photo_url ? (
                  <img
                    src={entry.profile_photo_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {entry.first_name?.[0]}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {entry.first_name} {entry.last_name}
                    {entry.user_id === user?.member_id && (
                      <span className="text-yellow-600 text-xs ml-2">(You)</span>
                    )}
                  </p>
                  {entry.club && (
                    <p className="text-xs text-gray-500 truncate">{entry.club}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className={`font-bold ${
                    entry.is_hole_in_one ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {entry.is_hole_in_one ? 'ACE!' : formatDistance(entry.distance_inches)}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-xs">
                    {entry.verified ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <Clock className="w-3 h-3 text-yellow-500" />
                    )}
                    <span className="text-gray-400">
                      {entry.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* HIO Entries */}
      {!loading && activeTab === 'hio' && (
        <div className="space-y-2">
          {hioEntries.length === 0 ? (
            <div className="py-8 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hole-in-ones yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Jackpot: ${Number(hioJackpot?.current_amount || 0).toFixed(2)}
                {hioJackpot && hioJackpot.weeks_accumulated > 0 && (
                  <span> ({hioJackpot.weeks_accumulated} weeks)</span>
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-purple-50 rounded-lg p-4 text-center mb-4">
                <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700">
                  {hioEntries.length} Hole-in-One{hioEntries.length !== 1 ? 's' : ''}!
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  Jackpot split: ${(
                    Number(hioJackpot?.current_amount || 0) / hioEntries.length
                  ).toFixed(2)} each
                </p>
              </div>

              {hioEntries.map(entry => (
                <div
                  key={entry.shot_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    entry.user_id === user?.member_id
                      ? 'bg-purple-50 border border-purple-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <Trophy className="w-6 h-6 text-yellow-500" />

                  {entry.profile_photo_url ? (
                    <img
                      src={entry.profile_photo_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {entry.first_name?.[0]}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {entry.first_name} {entry.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Group {entry.group_number}, Shot {entry.shot_number}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.detail_screenshot_url && (
                      <a
                        href={getAbsoluteUrl(entry.detail_screenshot_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Image className="w-4 h-4" />
                      </a>
                    )}
                    {entry.verified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Payout Info */}
      {challenge.status === 'completed' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">Challenge Complete!</h3>
          {/* Show winner info based on challenge data */}
          <p className="text-sm text-green-700">
            Results have been finalized. Payouts will be processed shortly.
          </p>
        </div>
      )}
    </div>
  );
};

export default DualLeaderboard;
