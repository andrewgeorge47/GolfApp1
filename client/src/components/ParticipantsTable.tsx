import React from 'react';

interface ParticipantsTableProps {
  participants: any[];
  checkIns: any[];
  scores?: any[];
  payouts?: any[];
  onCheckIn: (userId: number) => void;
  onCheckOut: (userId: number) => void;
  onUnregister: (userId: number) => void;
  setSelectedUserForCheckIn: (user: any) => void;
}

const ParticipantsTable: React.FC<ParticipantsTableProps> = ({
  participants,
  checkIns,
  scores = [],
  payouts = [],
  onCheckIn,
  onCheckOut,
  onUnregister,
  setSelectedUserForCheckIn
}) => (
      <div>
    <h4 className="text-lg font-semibold text-brand-black mb-3">Registered Participants</h4>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-neutral-300 rounded-lg">
        <thead className="bg-neutral-50">
          <tr>
            <th className="border border-neutral-300 px-4 py-2 text-left">Name</th>
            <th className="border border-neutral-300 px-4 py-2 text-left">Club</th>
            <th className="border border-neutral-300 px-4 py-2 text-left">Payment Status</th>
            <th className="border border-neutral-300 px-4 py-2 text-left">Score Submitted</th>
            <th className="border border-neutral-300 px-4 py-2 text-left">Payout</th>
          </tr>
        </thead>
        <tbody>
          {participants.map(participant => {
            const checkIn = checkIns.find(c => c.user_member_id === participant.user_member_id);
            const hasScore = scores.find(s => s.user_id === participant.user_member_id);
            const payout = payouts.find(p => p.user_member_id === participant.user_member_id);
            return (
              <tr key={participant.user_member_id}>
                <td className="border border-neutral-300 px-4 py-2">
                  {participant.first_name} {participant.last_name}
                </td>
                <td className="border border-neutral-300 px-4 py-2">{participant.club}</td>
                <td className="border border-neutral-300 px-4 py-2">
                  <div className="flex items-center space-x-2">
                    {checkIn ? (
                      <span className={`px-2 py-1 rounded text-xs ${
                        checkIn.status === 'checked_in' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {checkIn.status === 'checked_in' ? 'Paid' : 'Unpaid'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                        Unpaid
                      </span>
                    )}
                    <div className="flex space-x-1">
                      {!checkIn && (
                        <button
                          onClick={() => {
                            setSelectedUserForCheckIn(participant);
                            onCheckIn(participant.user_member_id);
                          }}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          title="Mark as Paid"
                        >
                          ✓
                        </button>
                      )}
                                              {checkIn && checkIn.status === 'checked_in' && (
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
                <td className="border border-neutral-300 px-4 py-2">
                  {hasScore ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      Submitted
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </td>
                <td className="border border-neutral-300 px-4 py-2">
                  {payout ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      ${payout.amount}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                      TBD
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default ParticipantsTable; 