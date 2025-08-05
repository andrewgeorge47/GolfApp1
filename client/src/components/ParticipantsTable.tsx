import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, Users, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { getWeeklyScorecards } from '../services/api';

interface Participant {
  user_member_id: number;
  first_name: string;
  last_name: string;
  email_address: string;
  club: string;
  role: string;
  registration_form_data?: any;
}

interface CheckIn {
  user_member_id: number;
  status: string;
}

interface Score {
  user_id: number;
}

interface Payout {
  user_member_id: number;
  amount?: number;
}

interface ParticipantsTableProps {
  participants: Participant[];
  checkIns: CheckIn[];
  scores: Score[];
  payouts: Payout[];
  tournamentId: number;
  onCheckIn: (userIds: number[]) => void;
  onCheckOut: (userId: number) => void;
  onUnregister?: (userId: number) => void;
}

type SortField = 'name' | 'club' | 'participation_type' | 'night_availability' | 'payment_status';
type SortDirection = 'asc' | 'desc';

const ParticipantsTable: React.FC<ParticipantsTableProps> = ({
  participants,
  checkIns,
  scores,
  payouts,
  tournamentId,
  onCheckIn,
  onCheckOut,
  onUnregister
}) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [weeklyScorecards, setWeeklyScorecards] = useState<any[]>([]);
  const [loadingScorecards, setLoadingScorecards] = useState(false);

  // Fetch weekly scorecards for this tournament
  useEffect(() => {
    const fetchWeeklyScorecards = async () => {
      setLoadingScorecards(true);
      try {
        const response = await getWeeklyScorecards(tournamentId);
        setWeeklyScorecards(response.data);
      } catch (error) {
        console.error('Error fetching weekly scorecards:', error);
      } finally {
        setLoadingScorecards(false);
      }
    };

    fetchWeeklyScorecards();
  }, [tournamentId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getParticipationType = (participant: Participant): string => {
    if (!participant.registration_form_data) return 'No Response';
    
    try {
      const formData = typeof participant.registration_form_data === 'string' 
        ? JSON.parse(participant.registration_form_data) 
        : participant.registration_form_data;
      
      return formData.participation_type || 'No Response';
    } catch (error) {
      return 'No Response';
    }
  };

  const getNightAvailability = (participant: Participant): string => {
    if (!participant.registration_form_data) return 'No Response';
    
    try {
      const formData = typeof participant.registration_form_data === 'string' 
        ? JSON.parse(participant.registration_form_data) 
        : participant.registration_form_data;
      
      const nights = formData.night_availability || formData.available_nights || [];
      return nights.length > 0 ? nights.join(', ') : 'No Response';
    } catch (error) {
      return 'No Response';
    }
  };

  const getNightAvailabilityCount = (participant: Participant): number => {
    if (!participant.registration_form_data) return 0;
    
    try {
      const formData = typeof participant.registration_form_data === 'string' 
        ? JSON.parse(participant.registration_form_data) 
        : participant.registration_form_data;
      
      const nights = formData.night_availability || formData.available_nights || [];
      return nights.length;
    } catch (error) {
      return 0;
    }
  };

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'club':
          aValue = a.club?.toLowerCase() || '';
          bValue = b.club?.toLowerCase() || '';
          break;
        case 'participation_type':
          aValue = getParticipationType(a);
          bValue = getParticipationType(b);
          break;
        case 'night_availability':
          aValue = getNightAvailabilityCount(a);
          bValue = getNightAvailabilityCount(b);
          break;
        case 'payment_status':
          const aCheckIn = checkIns.find(c => c.user_member_id === a.user_member_id);
          const bCheckIn = checkIns.find(c => c.user_member_id === b.user_member_id);
          aValue = aCheckIn?.status === 'checked_in' ? 1 : 0;
          bValue = bCheckIn?.status === 'checked_in' ? 1 : 0;
          break;
        default:
          aValue = a[sortField as keyof Participant];
          bValue = b[sortField as keyof Participant];
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [participants, checkIns, sortField, sortDirection]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-brand-black">Player Management</h4>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">
              {checkIns.filter(c => c.status === 'checked_in').length} paid
            </span>
            <span className="text-sm text-neutral-600">
              / {participants.length} registered
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              const notCheckedIn = participants.filter(p => 
                !checkIns.find(c => c.user_member_id === p.user_member_id && c.status === 'checked_in')
              );
              if (notCheckedIn.length > 0) {
                onCheckIn(notCheckedIn.map(p => p.user_member_id));
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
            disabled={participants.filter(p => 
              !checkIns.find(c => c.user_member_id === p.user_member_id && c.status === 'checked_in')
            ).length === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All as Paid
          </button>
        </div>

        {/* Participants Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-neutral-300 rounded-lg">
            <thead className="bg-neutral-50">
              <tr>
                <th 
                  className="border border-neutral-300 px-4 py-3 text-left font-medium cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="border border-neutral-300 px-4 py-3 text-left font-medium cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('club')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Club</span>
                    {getSortIcon('club')}
                  </div>
                </th>
                <th 
                  className="border border-neutral-300 px-4 py-3 text-left font-medium cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('participation_type')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Participation Type</span>
                    {getSortIcon('participation_type')}
                  </div>
                </th>
                <th 
                  className="border border-neutral-300 px-4 py-3 text-left font-medium cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('night_availability')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Available Nights</span>
                    {getSortIcon('night_availability')}
                  </div>
                </th>
                <th 
                  className="border border-neutral-300 px-4 py-3 text-left font-medium cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('payment_status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Payment Status</span>
                    {getSortIcon('payment_status')}
                  </div>
                </th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Score Submitted</th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Payout</th>
                <th className="border border-neutral-300 px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
                                {sortedParticipants.map(participant => {
                    const checkIn = checkIns.find(c => c.user_member_id === participant.user_member_id);
                    const isCheckedIn = checkIn && checkIn.status === 'checked_in';
                    const hasScore = scores.find(s => s.user_id === participant.user_member_id);
                    const hasWeeklyScorecard = weeklyScorecards.find(wsc => wsc.user_id === participant.user_member_id);
                    const payout = payouts.find(p => p.user_member_id === participant.user_member_id);
                    const participationType = getParticipationType(participant);
                    const nightAvailability = getNightAvailability(participant);
                
                return (
                  <tr key={participant.user_member_id} className="hover:bg-neutral-50">
                    <td className="border border-neutral-300 px-4 py-3 font-medium">
                      {participant.first_name} {participant.last_name}
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-sm rounded">
                        {participant.club}
                      </span>
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        participationType === 'Live' 
                          ? 'bg-green-100 text-green-800' 
                          : participationType === 'Solo'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {participationType}
                      </span>
                    </td>
                    <td className="border border-neutral-300 px-4 py-3 text-sm text-neutral-600">
                      {nightAvailability}
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {isCheckedIn ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Paid
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Unpaid
                          </span>
                        )}
                        <div className="flex space-x-1">
                          {!isCheckedIn && (
                            <button
                              onClick={() => onCheckIn([participant.user_member_id])}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                              title="Mark as Paid"
                            >
                              ✓
                            </button>
                          )}
                          {isCheckedIn && (
                            <button
                              onClick={() => onCheckOut(participant.user_member_id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                              title="Mark as Unpaid"
                            >
                              ✗
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      {hasWeeklyScorecard ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Submitted
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      {payout && payout.amount ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ${payout.amount}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          -
                        </span>
                      )}
                    </td>
                    <td className="border border-neutral-300 px-4 py-3">
                      {onUnregister && (
                        <button
                          onClick={() => onUnregister(participant.user_member_id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          title="Unregister from tournament"
                        >
                          Unregister
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {sortedParticipants.length === 0 && (
          <div className="text-center py-8 text-neutral-600">
            <Users className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
            <p>No participants found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantsTable; 