import React, { useState, useEffect } from 'react';
import { Users, Calendar, Trophy, Settings, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';

interface LeagueManagementProps {
  tournamentId: number;
  tournamentName: string;
  isLeague: boolean;
  leagueConfig?: any;
  onLeagueUpdated: () => void;
}

interface LeagueParticipant {
  id: number;
  user_member_id: number;
  first_name: string;
  last_name: string;
  club: string;
  status: 'active' | 'inactive' | 'suspended';
  joined_at: string;
  total_points: number;
  matches_played: number;
  matches_won: number;
}

const LeagueManagement: React.FC<LeagueManagementProps> = ({
  tournamentId,
  tournamentName,
  isLeague,
  leagueConfig,
  onLeagueUpdated
}) => {
  const [participants, setParticipants] = useState<LeagueParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'weeks' | 'settings'>('participants');

  // League state
  const [leagueStatus, setLeagueStatus] = useState<'active' | 'paused' | 'completed'>('active');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalWeeks, setTotalWeeks] = useState<number>(0);

  useEffect(() => {
    if (isLeague && tournamentId) {
      loadLeagueData();
    }
  }, [isLeague, tournamentId]);

  const loadLeagueData = async () => {
    setLoading(true);
    try {
      // TODO: Implement API calls to load league data
      // For now, using mock data
      setParticipants([
        {
          id: 1,
          user_member_id: 1,
          first_name: 'John',
          last_name: 'Doe',
          club: 'Neighborhood National',
          status: 'active',
          joined_at: '2024-01-01',
          total_points: 45,
          matches_played: 12,
          matches_won: 8
        }
      ]);
      setTotalWeeks(12);
      setCurrentWeek(5);
    } catch (error) {
      console.error('Error loading league data:', error);
      toast.error('Failed to load league data');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantStatusChange = async (participantId: number, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      // TODO: Implement API call to update participant status
      setParticipants(prev => 
        prev.map(p => 
          p.id === participantId ? { ...p, status: newStatus } : p
        )
      );
      toast.success('Participant status updated');
    } catch (error) {
      console.error('Error updating participant status:', error);
      toast.error('Failed to update participant status');
    }
  };

  const handleAdvanceWeek = async () => {
    try {
      // TODO: Implement API call to advance to next week
      setCurrentWeek(prev => prev + 1);
      toast.success('Advanced to next week');
      onLeagueUpdated();
    } catch (error) {
      console.error('Error advancing week:', error);
      toast.error('Failed to advance week');
    }
  };

  const handlePauseLeague = async () => {
    try {
      // TODO: Implement API call to pause league
      setLeagueStatus('paused');
      toast.success('League paused');
      onLeagueUpdated();
    } catch (error) {
      console.error('Error pausing league:', error);
      toast.error('Failed to pause league');
    }
  };

  const handleResumeLeague = async () => {
    try {
      // TODO: Implement API call to resume league
      setLeagueStatus('active');
      toast.success('League resumed');
      onLeagueUpdated();
    } catch (error) {
      console.error('Error resuming league:', error);
      toast.error('Failed to resume league');
    }
  };

  if (!isLeague) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* League Management Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-brand-neon-green" />
          <h3 className="text-xl font-semibold text-brand-black">League Management</h3>
        </div>
        
        {/* League Status and Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-neutral-600">Week:</span>
            <span className="text-lg font-bold text-brand-neon-green">
              {currentWeek} / {totalWeeks}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {leagueStatus === 'active' ? (
              <>
                <button
                  onClick={handleAdvanceWeek}
                  className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Advance Week</span>
                </button>
                <button
                  onClick={handlePauseLeague}
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleResumeLeague}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* League Status Indicator */}
      <div className={`p-4 rounded-lg ${
        leagueStatus === 'active' ? 'bg-green-50 border border-green-200' :
        leagueStatus === 'paused' ? 'bg-yellow-50 border border-yellow-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            leagueStatus === 'active' ? 'bg-green-500' :
            leagueStatus === 'paused' ? 'bg-yellow-500' :
            'bg-gray-500'
          }`} />
          <span className={`font-medium ${
            leagueStatus === 'active' ? 'text-green-800' :
            leagueStatus === 'paused' ? 'text-yellow-800' :
            'text-gray-800'
          }`}>
            League Status: {leagueStatus.charAt(0).toUpperCase() + leagueStatus.slice(1)}
          </span>
        </div>
        <p className={`text-sm mt-1 ${
          leagueStatus === 'active' ? 'text-green-600' :
          leagueStatus === 'paused' ? 'text-yellow-600' :
          'text-gray-600'
        }`}>
          {leagueStatus === 'active' ? 'League is currently running. New weeks will be created automatically if enabled.' :
           leagueStatus === 'paused' ? 'League is paused. No new weeks will be created until resumed.' :
           'League has been completed.'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('participants')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'participants'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Participants
          </button>
          <button
            onClick={() => setActiveTab('weeks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'weeks'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Week Management
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-brand-neon-green text-brand-neon-green'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            League Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-brand-black">League Participants</h4>
              <span className="text-sm text-neutral-600">
                {participants.length} participants
              </span>
            </div>
            
            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Club
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Record
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {participants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-black">
                          {participant.first_name} {participant.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {participant.club}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          participant.status === 'active' ? 'bg-green-100 text-green-800' :
                          participant.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {participant.total_points}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {participant.matches_won}-{participant.matches_played - participant.matches_won}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select
                          value={participant.status}
                          onChange={(e) => handleParticipantStatusChange(participant.id, e.target.value as any)}
                          className="text-sm border border-neutral-300 rounded px-2 py-1"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'weeks' && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-brand-black">Week Management</h4>
            <div className="bg-neutral-50 rounded-lg p-6">
              <p className="text-neutral-600 mb-4">
                Week management features will be implemented in Phase 2. This will include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-neutral-600">
                <li>Automatic week progression</li>
                <li>Week-specific tournament creation</li>
                <li>Week scoring deadlines</li>
                <li>Week result aggregation</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-brand-black">League Settings</h4>
            <div className="bg-neutral-50 rounded-lg p-6">
              <p className="text-neutral-600 mb-4">
                League settings are configured in the tournament form. This view will show:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-neutral-600">
                <li>Current league configuration</li>
                <li>Season progress</li>
                <li>Scoring rules</li>
                <li>Week configuration</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueManagement; 