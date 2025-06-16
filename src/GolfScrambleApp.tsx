import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, UserPlus, Settings, TrendingUp, Clock, MapPin } from 'lucide-react';
import LiveScore from './LiveScore';

interface Player {
  id: number;
  name: string;
  email: string;
  handicap: number;
  totalEvents: number;
  avgScore: number;
}

interface Event {
  id: number;
  date: string;
  teeTime: string;
  signedUp: number[];
  teams: Player[][];
}

const GolfScrambleApp = () => {
  const [activeTab, setActiveTab] = useState('signup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  // Initialize with sample data
  useEffect(() => {
    const samplePlayers: Player[] = [
      { id: 1, name: 'John Smith', email: 'john@email.com', handicap: 12, totalEvents: 15, avgScore: 78 },
      { id: 2, name: 'Mike Johnson', email: 'mike@email.com', handicap: 8, totalEvents: 12, avgScore: 74 },
      { id: 3, name: 'Dave Wilson', email: 'dave@email.com', handicap: 15, totalEvents: 18, avgScore: 82 },
      { id: 4, name: 'Tom Brown', email: 'tom@email.com', handicap: 10, totalEvents: 10, avgScore: 76 },
    ];
    setPlayers(samplePlayers);

    const thisWeekEvent: Event = {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      teeTime: '8:00 AM',
      signedUp: [1, 2, 3],
      teams: []
    };
    setEvents([thisWeekEvent]);
    setCurrentEvent(thisWeekEvent);
  }, []);

  const addPlayer = (playerData: Omit<Player, 'id' | 'totalEvents' | 'avgScore'>) => {
    const newPlayer: Player = {
      id: Date.now(),
      ...playerData,
      totalEvents: 0,
      avgScore: 0
    };
    setPlayers([...players, newPlayer]);
  };

  const signUpPlayer = (playerId: number) => {
    if (currentEvent && !currentEvent.signedUp.includes(playerId)) {
      const updatedEvent: Event = {
        ...currentEvent,
        signedUp: [...currentEvent.signedUp, playerId]
      };
      setCurrentEvent(updatedEvent);
      setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }
  };

  const removeSignUp = (playerId: number) => {
    if (currentEvent) {
      const updatedEvent: Event = {
        ...currentEvent,
        signedUp: currentEvent.signedUp.filter(id => id !== playerId)
      };
      setCurrentEvent(updatedEvent);
      setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }
  };

  const generateTeams = () => {
    if (!currentEvent) return;
    
    const signedUpPlayers = players.filter(p => currentEvent.signedUp.includes(p.id));
    const shuffled = [...signedUpPlayers].sort(() => Math.random() - 0.5);
    
    const teams: Player[][] = [];
    for (let i = 0; i < shuffled.length; i += 4) {
      teams.push(shuffled.slice(i, i + 4));
    }
    
    const updatedEvent: Event = {
      ...currentEvent,
      teams: teams
    };
    setCurrentEvent(updatedEvent);
    setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const getSignedUpPlayers = () => {
    return players.filter(p => currentEvent?.signedUp.includes(p.id));
  };

  const getAvailablePlayers = () => {
    return players.filter(p => !currentEvent?.signedUp.includes(p.id));
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-green-800 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8" />
            Gladstone Golf Course Weekly Scramble
          </h1>
          <p className="mt-2 text-green-100">Manage your weekly golf scramble events</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto">
          <nav className="flex space-x-8">
            {[
              { id: 'signup', label: 'Sign Up', icon: UserPlus },
              { id: 'teams', label: 'Teams', icon: Users },
              { id: 'players', label: 'Player Stats', icon: TrendingUp },
              { id: 'live', label: 'Live Scores', icon: Trophy },
              { id: 'manage', label: 'Manage', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Event Info Bar */}
        {currentEvent && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{new Date(currentEvent.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span>{currentEvent.teeTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span>Gladstone Golf Course</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {currentEvent.signedUp.length} players signed up
              </div>
            </div>
          </div>
        )}

        {/* Sign Up Tab */}
        {activeTab === 'signup' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Weekly Sign Up</h2>
              
              {/* Signed Up Players */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Signed Up Players ({getSignedUpPlayers().length})</h3>
                <div className="space-y-2">
                  {getSignedUpPlayers().map(player => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
                          {player.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-600">Handicap: {player.handicap}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSignUp(player.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Players */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Available Players</h3>
                <div className="space-y-2">
                  {getAvailablePlayers().map(player => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium">
                          {player.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-600">Handicap: {player.handicap}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => signUpPlayer(player.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Sign Up
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Team Formation</h2>
                <button
                  onClick={generateTeams}
                  disabled={getSignedUpPlayers().length < 4}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Generate Teams
                </button>
              </div>

              {currentEvent && Array.isArray(currentEvent.teams) && currentEvent.teams.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentEvent.teams.map((team, index) => (
                    <div key={index} className="bg-green-50 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800 mb-3">Team {index + 1}</h3>
                      <div className="space-y-2">
                        {team.map(player => (
                          <div key={player.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {player.name.charAt(0)}
                            </div>
                            <span className="text-sm">{player.name} (HC: {player.handicap})</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="text-xs text-green-700">
                          Avg Team HC: {(team.reduce((sum, p) => sum + p.handicap, 0) / team.length).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {getSignedUpPlayers().length < 4 ? (
                    <p>Need at least 4 players to generate teams</p>
                  ) : (
                    <p>Click "Generate Teams" to create teams</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Scores Tab */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <LiveScore />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GolfScrambleApp; 