import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, UserPlus, Settings, TrendingUp, Clock, MapPin } from 'lucide-react';

const GolfScrambleApp = () => {
  const [activeTab, setActiveTab] = useState('signup');
  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  // Initialize with sample data
  useEffect(() => {
    const samplePlayers = [
      { id: 1, name: 'John Smith', email: 'john@email.com', handicap: 12, totalEvents: 15, avgScore: 78 },
      { id: 2, name: 'Mike Johnson', email: 'mike@email.com', handicap: 8, totalEvents: 12, avgScore: 74 },
      { id: 3, name: 'Dave Wilson', email: 'dave@email.com', handicap: 15, totalEvents: 18, avgScore: 82 },
      { id: 4, name: 'Tom Brown', email: 'tom@email.com', handicap: 10, totalEvents: 10, avgScore: 76 },
    ];
    setPlayers(samplePlayers);

    const thisWeekEvent = {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      teeTime: '8:00 AM',
      signedUp: [1, 2, 3],
      teams: []
    };
    setEvents([thisWeekEvent]);
    setCurrentEvent(thisWeekEvent);
  }, []);

  const addPlayer = (playerData) => {
    const newPlayer = {
      id: Date.now(),
      ...playerData,
      totalEvents: 0,
      avgScore: 0
    };
    setPlayers([...players, newPlayer]);
  };

  const signUpPlayer = (playerId) => {
    if (!currentEvent.signedUp.includes(playerId)) {
      const updatedEvent = {
        ...currentEvent,
        signedUp: [...currentEvent.signedUp, playerId]
      };
      setCurrentEvent(updatedEvent);
      setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    }
  };

  const removeSignUp = (playerId) => {
    const updatedEvent = {
      ...currentEvent,
      signedUp: currentEvent.signedUp.filter(id => id !== playerId)
    };
    setCurrentEvent(updatedEvent);
    setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const generateTeams = () => {
    const signedUpPlayers = players.filter(p => currentEvent.signedUp.includes(p.id));
    const shuffled = [...signedUpPlayers].sort(() => Math.random() - 0.5);
    
    const teams = [];
    for (let i = 0; i < shuffled.length; i += 4) {
      teams.push(shuffled.slice(i, i + 4));
    }
    
    const updatedEvent = {
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

              {currentEvent?.teams.length > 0 ? (
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
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Generate teams to see the pairings</p>
                  <p className="text-sm mt-1">Need at least 4 signed up players</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Player Stats Tab */}
        {activeTab === 'players' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Player Statistics</h2>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4">Player Name</th>
                      <th className="text-left py-3 px-4">Handicap</th>
                      <th className="text-left py-3 px-4">Events Played</th>
                      <th className="text-left py-3 px-4">Avg Score</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => (
                      <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
                              {player.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{player.name}</div>
                              <div className="text-sm text-gray-600">{player.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{player.handicap}</td>
                        <td className="py-3 px-4">{player.totalEvents}</td>
                        <td className="py-3 px-4">{player.avgScore || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            currentEvent?.signedUp.includes(player.id)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {currentEvent?.signedUp.includes(player.id) ? 'Signed Up' : 'Available'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Player</h2>
              <AddPlayerForm onAddPlayer={addPlayer} />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Event Settings</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Event Date
                  </label>
                  <input
                    type="date"
                    value={currentEvent?.date || ''}
                    onChange={(e) => {
                      const updatedEvent = { ...currentEvent, date: e.target.value };
                      setCurrentEvent(updatedEvent);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tee Time
                  </label>
                  <input
                    type="text"
                    value={currentEvent?.teeTime || ''}
                    onChange={(e) => {
                      const updatedEvent = { ...currentEvent, teeTime: e.target.value };
                      setCurrentEvent(updatedEvent);
                    }}
                    placeholder="e.g., 8:00 AM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AddPlayerForm = ({ onAddPlayer }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    handicap: ''
  });

  const handleSubmit = () => {
    if (formData.name && formData.email && formData.handicap) {
      onAddPlayer({
        name: formData.name,
        email: formData.email,
        handicap: parseInt(formData.handicap)
      });
      setFormData({ name: '', email: '', handicap: '' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">
            Player Name
          </div>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="John Smith"
          />
        </div>
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </div>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="john@email.com"
          />
        </div>
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">
            Handicap
          </div>
          <input
            type="number"
            value={formData.handicap}
            onChange={(e) => setFormData({ ...formData, handicap: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="12"
            min="0"
            max="36"
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        Add Player
      </button>
    </div>
  );
};

export default GolfScrambleApp;