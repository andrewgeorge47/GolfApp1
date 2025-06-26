import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { getUserProfile, updateUser, getMatches, getTournaments, getTournamentParticipants, registerUserForTournament, unregisterUserFromTournament, User, UserProfile, Match, Tournament, saveScorecard } from '../services/api';
import { User as UserIcon, Edit3, Save, X, Trophy, Target, TrendingUp, Calendar, MapPin, LogOut, Clock, Users, Plus, Minus, Award, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrackRoundModal from './TrackRoundModal';
import ScoreCard from './ScoreCard';
import StrokePlayScoreCard from './StrokePlayScoreCard';

const Profile: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    club: user?.club || '',
    handicap: user?.handicap || 0,
  });

  // Track Round Modal State
  const [showTrackRoundModal, setShowTrackRoundModal] = useState(false);
  const [showScoreCard, setShowScoreCard] = useState(false);
  const [scoreCardType, setScoreCardType] = useState<'mully' | 'stroke' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.member_id) {
        try {
          setLoading(true);
          const [profileResponse, matchesResponse, tournamentsResponse] = await Promise.all([
            getUserProfile(user.member_id),
            getMatches(),
            getTournaments()
          ]);
          setProfile(profileResponse.data);
          setMatches(matchesResponse.data);
          setTournaments(tournamentsResponse.data);
          
          // Fetch user's tournament registrations
          const userTournamentIds: number[] = [];
          for (const tournament of tournamentsResponse.data) {
            try {
              const participantsResponse = await getTournamentParticipants(tournament.id);
              const isRegistered = participantsResponse.data.some((participant: any) => 
                participant.member_id === user.member_id
              );
              if (isRegistered) {
                userTournamentIds.push(tournament.id);
              }
            } catch (err) {
              console.error(`Error checking registration for tournament ${tournament.id}:`, err);
            }
          }
          setUserTournaments(userTournamentIds);
        } catch (err) {
          setError('Failed to load profile data');
          console.error('Error fetching profile:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [user?.member_id]);

  const handleSave = async () => {
    if (!user?.member_id) return;

    try {
      setLoading(true);
      await updateUser(user.member_id, formData);
      setIsEditing(false);
      setError(null);
      // Refresh user data
      window.location.reload();
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      club: user?.club || '',
      handicap: user?.handicap || 0,
    });
    setIsEditing(false);
    setError(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTournamentSignup = async (tournamentId: number) => {
    if (!user?.member_id) return;

    try {
      await registerUserForTournament(tournamentId, user.member_id);
      setUserTournaments([...userTournaments, tournamentId]);
      setError(null);
    } catch (err) {
      setError('Failed to register for tournament');
      console.error('Error registering for tournament:', err);
    }
  };

  const handleTournamentUnregister = async (tournamentId: number) => {
    if (!user?.member_id) return;

    try {
      await unregisterUserFromTournament(tournamentId, user.member_id);
      setUserTournaments(userTournaments.filter(id => id !== tournamentId));
      setError(null);
    } catch (err) {
      setError('Failed to unregister from tournament');
      console.error('Error unregistering from tournament:', err);
    }
  };

  // Track Round Handlers
  const handleTrackRound = () => {
    setShowTrackRoundModal(true);
  };

  const handleSelectRoundType = (type: 'stroke' | 'mully') => {
    setScoreCardType(type);
    setShowTrackRoundModal(false);
    setShowScoreCard(true);
  };

  const handleCloseScoreCard = () => {
    setShowScoreCard(false);
    setScoreCardType(null);
  };

  const handleSaveScoreCard = async (scoreCardData: any) => {
    try {
      console.log('ScoreCard data received:', scoreCardData); // Debug log
      
      // Test API connection first
      try {
        const testResponse = await fetch('http://localhost:3001/api/health');
        console.log('API health check:', testResponse.status);
      } catch (err) {
        console.error('API health check failed:', err);
      }
      
      // Prepare the data for the API
      const apiData = {
        type: scoreCardData.type || (scoreCardType === 'mully' ? 'mully_golf' : 'stroke_play'),
        player_name: scoreCardData.playerInfo?.name || scoreCardData.player_name || '',
        date_played: scoreCardData.playerInfo?.date || scoreCardData.date_played || new Date().toISOString().split('T')[0],
        handicap: scoreCardData.playerInfo?.handicap || scoreCardData.handicap || 0,
        scores: scoreCardData.holes || scoreCardData.scores || [],
        total_strokes: scoreCardData.totalStrokes || scoreCardData.total_strokes || 0,
        total_mulligans: scoreCardData.totalMulligans || scoreCardData.total_mulligans || 0,
        final_score: scoreCardData.finalScore || scoreCardData.final_score || scoreCardData.totalStrokes || 0
      };

      console.log('API data being sent:', apiData); // Debug log

      // Save to the backend
      const response = await saveScorecard(apiData);
      console.log('Save response:', response); // Debug log
      
      if (response && response.data) {
        console.log('Scorecard saved with ID:', response.data.id);
        // Show success message
        alert('Scorecard saved successfully!');
        handleCloseScoreCard();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error saving scorecard:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save scorecard';
      alert(`Failed to save scorecard: ${errorMessage}`);
    }
  };

  // Filter matches for current user
  const userMatches = matches.filter(match => 
    match.player1_id === user?.member_id || match.player2_id === user?.member_id
  ).slice(0, 5); // Show only last 5 matches

  const getMatchResult = (match: Match) => {
    if (match.winner === 'player1' && match.player1_id === user?.member_id) return 'Won';
    if (match.winner === 'player2' && match.player2_id === user?.member_id) return 'Won';
    if (match.winner === 'tie') return 'Tied';
    return 'Lost';
  };

  const getMatchResultColor = (result: string) => {
    switch (result) {
      case 'Won': return 'text-green-600';
      case 'Lost': return 'text-red-600';
      case 'Tied': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const isRegisteredForTournament = (tournamentId: number) => {
    return userTournaments.includes(tournamentId);
  };

  const getTournamentStatus = (tournament: Tournament) => {
    if (!tournament.start_date) return 'No date set';
    
    const startDate = new Date(tournament.start_date);
    const now = new Date();
    
    if (startDate > now) {
      const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`;
    } else if (tournament.end_date && new Date(tournament.end_date) < now) {
      return 'Completed';
    } else {
      return 'In Progress';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  // If scorecard is being shown, render it instead of the profile
  if (showScoreCard && scoreCardType) {
    const userInfo = {
      name: `${user?.first_name} ${user?.last_name}`.trim(),
      handicap: user?.handicap || 0
    };

    if (scoreCardType === 'mully') {
      return (
        <ScoreCard 
          onClose={handleCloseScoreCard}
          onSave={handleSaveScoreCard}
          userInfo={userInfo}
        />
      );
    } else {
      return (
        <StrokePlayScoreCard 
          onClose={handleCloseScoreCard}
          onSave={handleSaveScoreCard}
          userInfo={userInfo}
        />
      );
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="bg-brand-neon-green rounded-full p-3">
              <UserIcon className="w-8 h-8 text-brand-black" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-brand-muted-green flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {user?.club || 'No club specified'}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleTrackRound}
                  className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Track a Round
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-brand-neon-green/90 transition-colors"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-brand-neon-green/90 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Profile Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            ) : (
              <p className="text-lg text-gray-900">{user?.first_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            ) : (
              <p className="text-lg text-gray-900">{user?.last_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            ) : (
              <p className="text-lg text-gray-900">{user?.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Club
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.club}
                onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            ) : (
              <p className="text-lg text-gray-900">{user?.club || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Handicap
            </label>
            {isEditing ? (
              <input
                type="number"
                value={formData.handicap}
                onChange={(e) => setFormData({ ...formData, handicap: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            ) : (
              <p className="text-lg text-gray-900">{user?.handicap || 'Not specified'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Available Tournaments */}
      {tournaments.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Available Tournaments
          </h2>
          <div className="space-y-4">
            {tournaments.map((tournament) => {
              const isRegistered = isRegisteredForTournament(tournament.id);
              const status = getTournamentStatus(tournament);
              
              return (
                <div key={tournament.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2 text-sm text-gray-600">
                        {tournament.start_date && (
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(tournament.start_date).toLocaleDateString()}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          status === 'Completed' ? 'bg-gray-100 text-gray-600' :
                          status === 'In Progress' ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {status}
                        </span>
                      </div>
                      {tournament.notes && (
                        <p className="text-sm text-gray-600 mt-2">{tournament.notes}</p>
                      )}
                    </div>
                    <div className="sm:ml-4">
                      {isRegistered ? (
                        <button
                          onClick={() => handleTournamentUnregister(tournament.id)}
                          className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          <Minus className="w-4 h-4 mr-1" />
                          Unregister
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTournamentSignup(tournament.id)}
                          className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-brand-neon-green/90 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Sign Up
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Statistics */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Matches</p>
                <p className="text-2xl font-bold text-gray-900">{profile.total_matches}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Wins</p>
                <p className="text-2xl font-bold text-gray-900">{profile.wins}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-red-100 rounded-full p-3 mr-4">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {profile.total_matches > 0 ? ((profile.wins / profile.total_matches) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-full p-3 mr-4">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-gray-900">{profile.total_points}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Matches */}
      {userMatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent Matches
          </h2>
          <div className="space-y-3">
            {userMatches.map((match) => {
              const result = getMatchResult(match);
              return (
                <div key={match.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Match #{match.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(match.match_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className={`font-bold ${getMatchResultColor(result)}`}>
                      {result}
                    </span>
                    {match.scores && (
                      <p className="text-sm text-gray-600">
                        Score: {JSON.stringify(match.scores)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      {profile && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-brand-black mb-4">Match Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{profile.wins}</div>
              <div className="text-sm text-gray-600">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{profile.losses}</div>
              <div className="text-sm text-gray-600">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{profile.ties}</div>
              <div className="text-sm text-gray-600">Ties</div>
            </div>
          </div>
          
          {profile.total_matches > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Win Rate</span>
                <span>{((profile.wins / profile.total_matches) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-brand-neon-green h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(profile.wins / profile.total_matches) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Member Since */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-xl font-bold text-brand-black mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Member Since</p>
            <p className="text-lg text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Role</p>
            <p className="text-lg text-gray-900 capitalize">{user?.role || 'Player'}</p>
          </div>
        </div>
      </div>

      {/* Track Round Modal */}
      <TrackRoundModal
        isOpen={showTrackRoundModal}
        onClose={() => setShowTrackRoundModal(false)}
        onSelectRoundType={handleSelectRoundType}
      />
    </div>
  );
};

export default Profile; 