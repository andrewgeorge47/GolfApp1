import React, { useState, useEffect } from 'react';
import { Users, Save, Plus, X, Clock, Trophy } from 'lucide-react';
import { getPlayers, createMatch, getLeagueSettings, getTournaments, getTournamentMatches, updateTournamentMatch } from '../services/api';
import type { User, LeagueSettings } from '../services/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Scoring: React.FC = () => {
  const [players, setPlayers] = useState<User[]>([]);
  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'tournament' | 'manual'>('tournament');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Manual scoring state
  const [player1Id, setPlayer1Id] = useState<number | ''>('');
  const [player2Id, setPlayer2Id] = useState<number | ''>('');
  const [scores, setScores] = useState({
    player1: { hole1: '', hole2: '', hole3: '' },
    player2: { hole1: '', hole2: '', hole3: '' }
  });
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playersData, settingsData, tournamentsData] = await Promise.all([
          getPlayers(),
          getLeagueSettings(),
          getTournaments()
        ]);

        setPlayers(playersData.data);
        setSettings(settingsData.data);
        setTournaments(tournamentsData.data);
      } catch (error) {
        console.error('Error fetching scoring data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Load tournament matches when tournament is selected
  useEffect(() => {
    if (selectedTournament) {
      const loadTournamentMatches = async () => {
        try {
          const matchesRes = await getTournamentMatches(selectedTournament.id);
          setTournamentMatches(matchesRes.data);
        } catch (error) {
          console.error('Error loading tournament matches:', error);
        }
      };
      
      loadTournamentMatches();
    }
  }, [selectedTournament]);

  const handleTournamentSelect = (tournament: any) => {
    setSelectedTournament(tournament);
    setSelectedMatch(null);
    resetForm();
  };

  const handleMatchSelect = (match: any) => {
    setSelectedMatch(match);
    setPlayer1Id(match.player1_id);
    setPlayer2Id(match.player2_id);
    setScores({
      player1: { hole1: '', hole2: '', hole3: '' },
      player2: { hole1: '', hole2: '', hole3: '' }
    });
  };

  const handleScoreChange = (player: 'player1' | 'player2', hole: string, value: string) => {
    setScores(prev => ({
      ...prev,
      [player]: {
        ...prev[player],
        [hole]: value
      }
    }));
  };

  const calculateWinner = () => {
    let player1Wins = 0;
    let player2Wins = 0;

    for (let i = 1; i <= 3; i++) {
      const hole = `hole${i}` as keyof typeof scores.player1;
      const p1Score = parseInt(scores.player1[hole]) || 0;
      const p2Score = parseInt(scores.player2[hole]) || 0;

      if (p1Score < p2Score) player1Wins++;
      else if (p2Score < p1Score) player2Wins++;
    }

    if (player1Wins > player2Wins) return 'player1';
    if (player2Wins > player1Wins) return 'player2';
    return 'tie';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!player1Id || !player2Id) {
      toast.error('Please select both players');
      return;
    }

    if (player1Id === player2Id) {
      toast.error('Players cannot play against themselves');
      return;
    }

    // Validate scores
    const hasValidScores = Object.values(scores.player1).some(score => score !== '') ||
                          Object.values(scores.player2).some(score => score !== '');
    
    if (!hasValidScores) {
      toast.error('Please enter at least some scores');
      return;
    }

    setSubmitting(true);

    try {
      const winner = calculateWinner();
      const player1 = players.find(p => p.member_id === player1Id);
      const player2 = players.find(p => p.member_id === player2Id);
      
      const winnerName = winner === 'player1' ? `${player1?.first_name} ${player1?.last_name}` :
                        winner === 'player2' ? `${player2?.first_name} ${player2?.last_name}` : 'Tie';

      const matchData = {
        player1_id: player1Id,
        player2_id: player2Id,
        scores: scores,
        winner: winnerName,
        match_date: matchDate
      };

      await createMatch(matchData);
      
      // Reset form
      resetForm();
      
      toast.success('Match saved successfully!');
    } catch (error) {
      console.error('Error saving match:', error);
      toast.error('Error saving match. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTournamentMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMatch || !selectedTournament) {
      toast.error('Please select a tournament match');
      return;
    }

    // Validate scores
    const hasValidScores = Object.values(scores.player1).some(score => score !== '') ||
                          Object.values(scores.player2).some(score => score !== '');
    
    if (!hasValidScores) {
      toast.error('Please enter at least some scores');
      return;
    }

    setSubmitting(true);

    try {
      const winner = calculateWinner();
      const player1 = players.find(p => p.member_id === player1Id);
      const player2 = players.find(p => p.member_id === player2Id);
      
      const winnerId = winner === 'player1' ? player1Id :
                      winner === 'player2' ? player2Id : null;

      const matchData = {
        winner_id: winnerId,
        scores: scores,
        status: 'completed'
      };

      await updateTournamentMatch(selectedTournament.id, selectedMatch.id, matchData);
      
      // Refresh tournament matches
      const matchesRes = await getTournamentMatches(selectedTournament.id);
      setTournamentMatches(matchesRes.data);
      
      // Reset form
      setSelectedMatch(null);
      resetForm();
      
      toast.success('Tournament match scored successfully!');
    } catch (error) {
      console.error('Error scoring tournament match:', error);
      toast.error('Error scoring match. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPlayer1Id('');
    setPlayer2Id('');
    setScores({
      player1: { hole1: '', hole2: '', hole3: '' },
      player2: { hole1: '', hole2: '', hole3: '' }
    });
    setMatchDate(new Date().toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss={false} pauseOnHover={false} />
      {/* Header */}
      <div className="text-center bg-white/95 rounded-2xl p-8 shadow-lg">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-brand-black mb-4">Match Scoring</h1>
        <p className="text-xl text-neutral-600">
          Score tournament matches or create manual matches
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/95 rounded-2xl shadow-lg">
        <div className="border-b border-neutral-200">
          <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8 px-6">
            <button
              onClick={() => setActiveTab('tournament')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tournament'
                  ? 'border-brand-neon-green text-brand-black'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800'
              }`}
            >
              <Trophy className="w-5 h-5 inline mr-2" />
              Tournament Matches
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manual'
                  ? 'border-brand-neon-green text-brand-black'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800'
              }`}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Manual Scoring
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'tournament' && (
            <div className="space-y-6">
              {/* Tournament Selection */}
              <div>
                <h2 className="text-2xl font-bold text-brand-black mb-4">Tournament Matches</h2>
                {tournaments.length > 0 ? (
                  <div className="space-y-6">
                    {/* Tournament Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tournaments.map(tournament => (
                        <div
                          key={tournament.id}
                          onClick={() => handleTournamentSelect(tournament)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedTournament?.id === tournament.id
                              ? 'border-brand-neon-green bg-brand-neon-green/10'
                              : 'border-neutral-300 hover:border-neutral-400 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-brand-black">{tournament.name}</h3>
                            <Trophy className="w-5 h-5 text-brand-neon-green" />
                          </div>
                          <p className="text-sm text-neutral-600 mb-2">{tournament.type}</p>
                          {tournament.start_date && (
                            <p className="text-xs text-neutral-500">
                              {new Date(tournament.start_date).toLocaleDateString()}
                            </p>
                          )}
                          {tournament.notes && (
                            <p className="text-xs text-neutral-600 mt-2 line-clamp-2">
                              {tournament.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Tournament Matches */}
                    {selectedTournament && (
                      <div className="bg-neutral-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-brand-black mb-3">
                          Matches for {selectedTournament.name}
                        </h3>
                        
                        {!selectedMatch ? (
                          // Match Queue (Card View)
                          tournamentMatches.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {tournamentMatches.map(match => (
                                <div
                                  key={match.id}
                                  onClick={() => handleMatchSelect(match)}
                                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                                    match.status === 'completed'
                                      ? 'border-green-300 bg-green-50 opacity-75'
                                      : 'border-neutral-300 hover:border-neutral-400 bg-white hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-brand-black">
                                      Match #{match.match_number}
                                    </h4>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      match.status === 'completed' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {match.status}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <p className="font-medium text-neutral-700">
                                        {match.player1_first_name} {match.player1_last_name}
                                      </p>
                                      <p className="text-xs text-neutral-500">vs</p>
                                      <p className="font-medium text-neutral-700">
                                        {match.player2_first_name} {match.player2_last_name}
                                      </p>
                                    </div>
                                    
                                    {match.status === 'completed' && match.winner_first_name && (
                                      <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                                        <p className="font-medium text-green-800">
                                          Winner: {match.winner_first_name} {match.winner_last_name}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {match.status === 'pending' && (
                                      <div className="mt-2">
                                        <button className="w-full text-sm bg-brand-neon-green text-brand-black py-2 px-3 rounded hover:bg-green-400 transition-colors">
                                          Score Match
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-neutral-600 py-4">
                              No matches found for this tournament.
                            </p>
                          )
                        ) : (
                          // Scoring UI
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                              <h4 className="text-lg font-semibold text-brand-black">
                                Score Match #{selectedMatch.match_number}
                              </h4>
                              <button
                                onClick={() => {
                                  setSelectedMatch(null);
                                  resetForm();
                                }}
                                className="flex items-center px-3 py-1 text-sm border border-neutral-300 rounded text-neutral-600 hover:bg-neutral-50 transition-colors w-full sm:w-auto justify-center"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Back to Queue
                              </button>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 sm:p-6 border border-neutral-200">
                              <form onSubmit={handleTournamentMatchSubmit} className="space-y-6">
                                {/* Match Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <label className="block text-sm font-medium text-neutral-600 mb-2">
                                      Player 1
                                    </label>
                                    <input
                                      type="text"
                                      value={`${selectedMatch.player1_first_name} ${selectedMatch.player1_last_name}`}
                                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-100"
                                      disabled
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-neutral-600 mb-2">
                                      Player 2
                                    </label>
                                    <input
                                      type="text"
                                      value={`${selectedMatch.player2_first_name} ${selectedMatch.player2_last_name}`}
                                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-100"
                                      disabled
                                    />
                                  </div>
                                </div>

                                {/* Scores Table - Mobile Optimized */}
                                <div className="space-y-4">
                                  <h3 className="font-medium text-brand-black">Hole Scores</h3>
                                  {[1, 2, 3].map(hole => (
                                    <div key={hole} className="bg-neutral-50 rounded-lg p-4">
                                      <h4 className="font-medium text-brand-black mb-3">Hole {hole}</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                                            {selectedMatch.player1_first_name}
                                          </label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={scores.player1[`hole${hole}` as keyof typeof scores.player1]}
                                            onChange={(e) => handleScoreChange('player1', `hole${hole}`, e.target.value)}
                                            className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                                            placeholder="Score"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-neutral-600 mb-1">
                                            {selectedMatch.player2_first_name}
                                          </label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={scores.player2[`hole${hole}` as keyof typeof scores.player2]}
                                            onChange={(e) => handleScoreChange('player2', `hole${hole}`, e.target.value)}
                                            className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                                            placeholder="Score"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMatch(null);
                                      resetForm();
                                    }}
                                    className="flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center justify-center px-6 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
                                  >
                                    {submitting ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
                                    ) : (
                                      <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {submitting ? 'Saving...' : 'Save Score'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-neutral-600 py-4">
                    No tournaments available.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-brand-black">Manual Match Scoring</h2>
              
              <div className="bg-neutral-50 rounded-lg p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Match Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-2">
                        Player 1
                      </label>
                      <select
                        value={player1Id}
                        onChange={(e) => setPlayer1Id(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent bg-white"
                        required
                      >
                        <option value="">Select Player 1</option>
                        {players.map(player => (
                          <option key={player.member_id} value={player.member_id}>
                            {player.first_name} {player.last_name} ({player.club})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-2">
                        Player 2
                      </label>
                      <select
                        value={player2Id}
                        onChange={(e) => setPlayer2Id(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent bg-white"
                        required
                      >
                        <option value="">Select Player 2</option>
                        {players.map(player => (
                          <option key={player.member_id} value={player.member_id}>
                            {player.first_name} {player.last_name} ({player.club})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-600 mb-2">
                        Match Date
                      </label>
                      <input
                        type="date"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent bg-white"
                      />
                    </div>
                  </div>

                  {/* Scores Table - Mobile Optimized */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-brand-black">Hole Scores</h3>
                    {[1, 2, 3].map(hole => (
                      <div key={hole} className="bg-white rounded-lg p-4 border border-neutral-200">
                        <h4 className="font-medium text-brand-black mb-3">Hole {hole}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">
                              Player 1
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={scores.player1[`hole${hole}` as keyof typeof scores.player1]}
                              onChange={(e) => handleScoreChange('player1', `hole${hole}`, e.target.value)}
                              className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                              placeholder="Score"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-600 mb-1">
                              Player 2
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={scores.player2[`hole${hole}` as keyof typeof scores.player2]}
                              onChange={(e) => handleScoreChange('player2', `hole${hole}`, e.target.value)}
                              className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                              placeholder="Score"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scoring Rules Info */}
                  {settings && (
                    <div className="bg-white rounded-lg p-4 border border-neutral-200">
                      <h3 className="font-medium text-brand-black mb-2">Scoring Rules</h3>
                      <p className="text-sm text-neutral-600">
                        Win: {settings.scoring_rules?.win || 3} pts | 
                        Tie: {settings.scoring_rules?.tie || 1} pt | 
                        Loss: {settings.scoring_rules?.loss || 0} pts
                      </p>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex items-center justify-center px-4 py-2 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center justify-center px-6 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
                    >
                      {submitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {submitting ? 'Saving...' : 'Save Match'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scoring; 