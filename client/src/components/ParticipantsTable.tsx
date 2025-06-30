import React from 'react';

interface ParticipantsTableProps {
  participants: any[];
  checkIns: any[];
  onCheckIn: (userId: number) => void;
  onCheckOut: (userId: number) => void;
  onUnregister: (userId: number) => void;
  setSelectedUserForCheckIn: (user: any) => void;
}

const ParticipantsTable: React.FC<ParticipantsTableProps> = ({
  participants,
  checkIns,
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
            <th className="border border-neutral-300 px-4 py-2 text-left">Email</th>
            <th className="border border-neutral-300 px-4 py-2 text-left">Club</th>
            <th className="border border-neutral-300 px-4 py-2 text-left">Status</th>
            <th className="border border-neutral-300 px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {participants.map(participant => {
            const checkIn = checkIns.find(c => c.user_member_id === participant.user_member_id);
            return (
              <tr key={participant.user_member_id}>
                <td className="border border-neutral-300 px-4 py-2">
                  {participant.first_name} {participant.last_name}
                </td>
                <td className="border border-neutral-300 px-4 py-2">{participant.email}</td>
                <td className="border border-neutral-300 px-4 py-2">{participant.club}</td>
                <td className="border border-neutral-300 px-4 py-2">
                  {checkIn ? (
                    <span className={`px-2 py-1 rounded text-xs ${
                      checkIn.status === 'checked_in' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {checkIn.status === 'checked_in' ? 'Checked In' : 'Checked Out'}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                      Not Checked In
                    </span>
                  )}
                </td>
                <td className="border border-neutral-300 px-4 py-2">
                  <div className="flex space-x-2">
                    {!checkIn && (
                      <button
                        onClick={() => {
                          setSelectedUserForCheckIn(participant);
                          onCheckIn(participant.user_member_id);
                        }}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Check In
                      </button>
                    )}
                    {checkIn && checkIn.status === 'checked_in' && (
                      <button
                        onClick={() => onCheckOut(participant.user_member_id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Check Out
                      </button>
                    )}
                    <button
                      onClick={() => onUnregister(participant.user_member_id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
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