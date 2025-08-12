import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Building, 
  Trophy, 
  Users, 
  Target, 
  Calendar, 
  Award, 
  Activity, 
  Medal, 
  TrendingUp, 
  TrendingDown,
  Flag,
  BarChart3,
  Clock,
  Eye,
  ChevronRight,
  Share2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { getGlobalLeaderboard, getClubLeaderboard, getAllClubs, GlobalLeaderboardData, getTournaments, getSimulatorCourse } from '../services/api';
import api from '../services/api';
import ClubLeaderboard from './ClubLeaderboard';
import TournamentLeaderboard from './TournamentLeaderboard';
import MatchplayLeaderboard from './MatchplayLeaderboard';
import StrokeplayLeaderboard from './StrokeplayLeaderboard';
import NewWeeklyLeaderboard from './NewWeeklyLeaderboard';

// Define the ClubLeaderboardData interface to match what the server returns
interface ClubLeaderboardData {
  clubStats: {
    total_players: number;
    total_rounds: number;
    total_records: number;
  };
  playerRankings: {
    courseRecords: {
      monthly: Array<{
        player_id: string;
        player_name: string;
        record_count?: number;
      }>;
      allTime: Array<{
        player_id: string;
        player_name: string;
        record_count?: number;
      }>;
    };
    roundsLogged: {
      monthly: Array<{
        player_id: string;
        player_name: string;
        rounds_count?: number;
      }>;
      allTime: Array<{
        player_id: string;
        player_name: string;
        rounds_count?: number;
      }>;
    };
    averageScore: {
      monthly: Array<{
        player_id: string;
        player_name: string;
        avg_score?: number;
        rounds_count?: number;
      }>;
      allTime: Array<{
        player_id: string;
        player_name: string;
        avg_score?: number;
        rounds_count?: number;
      }>;
    };
  };
}

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const [globalData, setGlobalData] = useState<GlobalLeaderboardData | null>(null);
  const [clubData, setClubData] = useState<ClubLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clubLoading, setClubLoading] = useState(false);
  const [clubError, setClubError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'club' | 'tournaments'>('global');

  // Global leaderboard specific state
  const [timeFrame, setTimeFrame] = useState<'monthly' | 'allTime'>('allTime');
  const [activeCategory, setActiveCategory] = useState<'courseRecords' | 'roundsLogged' | 'averageScore'>('courseRecords');

  // Tournaments state
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [courseData, setCourseData] = useState<any>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'Admin';

  // Handle URL parameters for direct tournament navigation
  useEffect(() => {
    if (params.tournamentId) {
      setActiveTab('tournaments');
      // Find the tournament by ID
      const tournament = tournaments.find((t: any) => t.id.toString() === params.tournamentId);
      if (tournament) {
        setSelectedTournament(tournament);
        // Fetch course data if course_id is available
        if (tournament.course_id) {
          const fetchCourseData = async () => {
            try {
              const response = await getSimulatorCourse(tournament.course_id);
              if (response.data) {
                setCourseData(response.data);
              }
            } catch (error) {
              console.error('Error fetching course data:', error);
            }
          };
          fetchCourseData();
        }
      }
    }
  }, [params.tournamentId, tournaments]);

  // Fetch tournaments when needed and handle URL navigation
  useEffect(() => {
    const fetchTournaments = async () => {
      setTournamentsLoading(true);
      try {
        const response = await getTournaments();
        const tournamentsData = response.data || [];
        setTournaments(tournamentsData);
        
        // If we have a tournament ID in URL, find and select it
        if (params.tournamentId) {
          const tournament = tournamentsData.find((t: any) => t.id.toString() === params.tournamentId);
          if (tournament) {
            setSelectedTournament(tournament);
          }
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setTournamentsLoading(false);
      }
    };

    if (activeTab === 'tournaments') {
      fetchTournaments();
    }
  }, [activeTab, params.tournamentId]);

  // Handle tab changes and URL updates
  const handleTabChange = (tab: 'global' | 'club' | 'tournaments') => {
    setActiveTab(tab);
    if (tab === 'tournaments') {
      navigate('/leaderboard');
    } else {
      navigate('/leaderboard');
    }
  };

  // Handle tournament selection and URL updates
  const handleTournamentSelect = async (tournament: any) => {
    setSelectedTournament(tournament);
    navigate(`/leaderboard/tournament/${tournament.id}`);
    
    // Fetch course data if course_id is available
    if (tournament.course_id) {
      try {
        const response = await getSimulatorCourse(tournament.course_id);
        if (response.data) {
          setCourseData(response.data);
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
      }
    }
  };

  // Handle back to tournaments list
  const handleBackToTournaments = () => {
    setSelectedTournament(null);
    setCourseData(null);
    navigate('/leaderboard');
  };

  // Handle share tournament leaderboard
  const handleShareTournament = () => {
    if (selectedTournament) {
      const shareUrl = `${window.location.origin}/#/leaderboard/tournament/${selectedTournament.id}`;
      
      // Try Web Share API first
      if (navigator.share) {
        navigator.share({
          title: `${selectedTournament.name} Leaderboard`,
          text: `Check out the leaderboard for ${selectedTournament.name}!`,
          url: shareUrl
        }).catch((error) => {
          // If share is canceled or fails, fall back to clipboard
          console.log('Share was canceled or failed:', error);
          copyToClipboard(shareUrl);
        });
      } else {
        // Fallback: copy to clipboard
        copyToClipboard(shareUrl);
      }
    }
  };

  // Helper function to copy to clipboard
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        // Show a temporary notification
        showNotification('Link copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link copied to clipboard!');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('Link copied to clipboard!');
    }
  };

  // Simple notification function
  const showNotification = (message: string) => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-brand-neon-green text-brand-black px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch global data
        const globalResponse = await getGlobalLeaderboard();
        setGlobalData(globalResponse.data);
        

      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.club, isAdmin, location.pathname]);

  // Fetch club data when needed
  useEffect(() => {
    const fetchClubData = async () => {
      if (!user?.club) return;
      
      setClubLoading(true);
      setClubError(null);
      
      try {
        const response = await api.get(`/leaderboard/club/${encodeURIComponent(user.club)}?timeFrame=${timeFrame}`);
        setClubData(response.data as any);
      } catch (err) {
        console.error('Error fetching club leaderboard data:', err);
        setClubError('Failed to load club leaderboard data');
      } finally {
        setClubLoading(false);
      }
    };

    if (activeTab === 'club' && user?.club) {
      fetchClubData();
    }
  }, [user?.club, activeTab, timeFrame]);



  // Fetch specific club data
  const fetchClubData = async () => {
    if (!user?.club) return;
    
    try {
      setClubLoading(true);
      const response = await getClubLeaderboard(user.club);
      setClubData(response.data as any);
    } catch (error) {
      console.error(`Error fetching data for club ${user.club}:`, error);
      setClubError('Failed to load club data');
    } finally {
      setClubLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!globalData) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-600">Failed to load leaderboard data.</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-gray-500">{rank}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Global Leaderboard Component
  const GlobalLeaderboard = () => {
    const getCurrentData = () => {
      const standings = globalData.clubStandings;
      switch (activeCategory) {
        case 'courseRecords':
          return timeFrame === 'monthly' ? standings.courseRecords.monthly : standings.courseRecords.allTime;
        case 'roundsLogged':
          return timeFrame === 'monthly' ? standings.roundsLogged.monthly : standings.roundsLogged.allTime;
        case 'averageScore':
          return timeFrame === 'monthly' ? standings.averageScore.monthly : standings.averageScore.allTime;
        default:
          return [];
      }
    };

    const getCategoryIcon = () => {
      switch (activeCategory) {
        case 'courseRecords':
          return <Trophy className="w-5 h-5" />;
        case 'roundsLogged':
          return <Target className="w-5 h-5" />;
        case 'averageScore':
          return <BarChart3 className="w-5 h-5" />;
        default:
          return <Activity className="w-5 h-5" />;
      }
    };

    const getCategoryTitle = () => {
      switch (activeCategory) {
        case 'courseRecords':
          return 'Course Records';
        case 'roundsLogged':
          return 'Rounds Logged';
        case 'averageScore':
          return 'Average Score';
        default:
          return 'Statistics';
      }
    };

    const getValueDisplay = (item: any) => {
      switch (activeCategory) {
        case 'courseRecords':
          return item.record_count;
        case 'roundsLogged':
          return item.rounds_count;
        case 'averageScore':
          return item.avg_score;
        default:
          return '';
      }
    };

    const getValueSuffix = () => {
      switch (activeCategory) {
        case 'courseRecords':
          return 'records';
        case 'roundsLogged':
          return 'rounds';
        case 'averageScore':
          return '';
        default:
          return '';
      }
    };

      return (
    <div className="space-y-6 sm:space-y-8">



                {/* Main Content Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* Content Header with Filter */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-900">Club Rankings</h2>
              </div>
              
              {/* Toggle Button - Time Frame Filter */}
              <div className="relative inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTimeFrame('allTime')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    timeFrame === 'allTime'
                      ? 'bg-brand-neon-green text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimeFrame('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    timeFrame === 'monthly'
                      ? 'bg-brand-neon-green text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {timeFrame === 'monthly' ? 'Last 30 Days' : 'All Time'}
            </p>
          </div>

          {/* Mobile: Category Tabs */}
          <div className="lg:hidden border-b border-gray-200">
            <div className="flex p-1">
              <button
                onClick={() => setActiveCategory('courseRecords')}
                className={`flex-1 py-3 px-3 sm:px-4 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'courseRecords'
                    ? 'bg-brand-neon-green text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Trophy className="w-4 h-4 inline mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Records</span>
                <span className="sm:hidden">Rec</span>
              </button>
              <button
                onClick={() => setActiveCategory('roundsLogged')}
                className={`flex-1 py-3 px-3 sm:px-4 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'roundsLogged'
                    ? 'bg-brand-neon-green text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Target className="w-4 h-4 inline mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Rounds</span>
                <span className="sm:hidden">Rnd</span>
              </button>
              <button
                onClick={() => setActiveCategory('averageScore')}
                className={`flex-1 py-3 px-3 sm:px-4 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'averageScore'
                    ? 'bg-brand-neon-green text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Average</span>
                <span className="sm:hidden">Avg</span>
              </button>
            </div>
          </div>

          {/* Mobile: Card Layout */}
          <div className="lg:hidden space-y-3">
            {getCurrentData().length > 0 ? (
              getCurrentData().map((item, index) => (
                <div key={item.club} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full flex-shrink-0">
                        {getRankIcon(index + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h3 className="font-semibold text-gray-900 text-base truncate">{item.club}</h3>
                          {item.club === user?.club && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded-full border border-brand-neon-green/20 flex-shrink-0">
                              My Club
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-gray-900">
                        {getValueDisplay(item)}
                        {getValueSuffix() && <span className="text-sm text-gray-500 ml-1">{getValueSuffix()}</span>}
                      </div>
                      {activeCategory === 'averageScore' && 'rounds_count' in item && (
                        <div className="text-xs text-gray-500 mt-1">({item.rounds_count} rounds)</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-500">No clubs have data for this category and time frame.</p>
              </div>
            )}
          </div>

          {/* Desktop: Three Column Layout */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-3 gap-6 p-6">
              {/* Course Records Column */}
              <div>
                <div className="flex items-center mb-4">
                  <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Course Records</h3>
                </div>
                <div className="space-y-3">
                  {globalData.clubStandings.courseRecords[timeFrame === 'monthly' ? 'monthly' : 'allTime'].map((item, index) => (
                    <div key={item.club} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{item.club}</div>
                          {item.club === user?.club && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded border border-brand-neon-green/20">
                              My Club
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.record_count} records
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rounds Logged Column */}
              <div>
                <div className="flex items-center mb-4">
                  <Target className="w-5 h-5 text-purple-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Rounds Logged</h3>
                </div>
                <div className="space-y-3">
                  {globalData.clubStandings.roundsLogged[timeFrame === 'monthly' ? 'monthly' : 'allTime'].map((item, index) => (
                    <div key={item.club} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{item.club}</div>
                          {item.club === user?.club && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded border border-brand-neon-green/20">
                              My Club
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.rounds_count} rounds
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Average Score Column */}
              <div>
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Average Score</h3>
                </div>
                <div className="space-y-3">
                  {globalData.clubStandings.averageScore[timeFrame === 'monthly' ? 'monthly' : 'allTime'].map((item, index) => (
                    <div key={item.club} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="flex items-center">
                          <div className="font-medium text-gray-900">{item.club}</div>
                          {item.club === user?.club && (
                            <span className="ml-2 bg-brand-neon-green/10 text-brand-neon-green text-xs font-medium px-2 py-0.5 rounded border border-brand-neon-green/20">
                              My Club
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {item.avg_score}
                        </div>
                        <div className="text-sm text-gray-500">({item.rounds_count} rounds)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4">
      {/* Tab Content */}
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Neighborhood National Community Leaderboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">See where your club stacks up!</p>
        </div>

        {/* Navigation Chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => handleTabChange('global')}
            className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-brand-neon-green text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            NN Community
          </button>
          {user?.club && (
            <button
              onClick={() => handleTabChange('club')}
              className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'club'
                  ? 'bg-brand-neon-green text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building className="w-4 h-4 mr-2" />
              My Club
            </button>
          )}
          <button
            onClick={() => handleTabChange('tournaments')}
            className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'tournaments'
                ? 'bg-brand-neon-green text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Tournaments
          </button>
        </div>

        {activeTab === 'global' && <GlobalLeaderboard />}

        {/* Club Leaderboard */}
        {activeTab === 'club' && user?.club && (
          <ClubLeaderboard 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
            clubData={clubData as any}
            loading={clubLoading}
            error={clubError}
            timeFrame={timeFrame}
            onTimeFrameChange={setTimeFrame}
          />
        )}

        {/* Tournaments Tab */}
        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {selectedTournament ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={handleBackToTournaments}
                    className="flex items-center space-x-2 text-brand-neon-green hover:text-green-600 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Back to Tournaments</span>
                  </button>
                  <button
                    onClick={handleShareTournament}
                    className="flex items-center space-x-2 text-brand-neon-green hover:text-green-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Leaderboard</span>
                  </button>
                </div>
                {selectedTournament.tournament_format === 'match_play' ? (
                  <MatchplayLeaderboard
                    tournamentId={selectedTournament.id}
                    tournamentFormat={selectedTournament.tournament_format}
                    tournamentInfo={{
                      name: selectedTournament.name,
                      description: selectedTournament.description,
                      start_date: selectedTournament.start_date,
                      course_name: courseData?.name || selectedTournament.course_name || selectedTournament.course_id?.toString()
                    }}
                  />
                ) : selectedTournament.tournament_format === 'par3_match_play' ? (
                  <NewWeeklyLeaderboard
                    tournamentId={selectedTournament.id}
                    tournamentName={selectedTournament.name}
                    weekStartDate={selectedTournament.week_start_date}
                    tournamentStartDate={selectedTournament.start_date}
                    tournamentEndDate={selectedTournament.end_date}
                  />
                ) : selectedTournament.tournament_format === 'stroke_play' ? (
                  <StrokeplayLeaderboard
                    tournamentId={selectedTournament.id}
                    tournamentFormat={selectedTournament.tournament_format}
                    courseId={selectedTournament.course_id}
                    tournamentInfo={{
                      name: selectedTournament.name,
                      description: selectedTournament.description,
                      start_date: selectedTournament.start_date,
                      course_name: courseData?.name || selectedTournament.course_name || selectedTournament.course_id?.toString()
                    }}
                    tournamentSettings={{
                      holeConfiguration: selectedTournament.hole_configuration || '18',
                      tee: selectedTournament.tee || 'Red',
                      pins: selectedTournament.pins || 'Friday',
                      puttingGimme: selectedTournament.putting_gimme || '8'
                    }}
                  />
                ) : selectedTournament.tournament_format === 'weekly' ? (
                  <NewWeeklyLeaderboard
                    tournamentId={selectedTournament.id}
                    tournamentName={selectedTournament.name}
                    weekStartDate={selectedTournament.week_start_date}
                    tournamentStartDate={selectedTournament.start_date}
                    tournamentEndDate={selectedTournament.end_date}
                  />
                ) : (
                  <TournamentLeaderboard
                    tournamentId={selectedTournament.id}
                    tournamentFormat={selectedTournament.tournament_format}
                    courseId={selectedTournament.course_id}
                    tournamentInfo={{
                      name: selectedTournament.name,
                      description: selectedTournament.description,
                      start_date: selectedTournament.start_date,
                      course_name: courseData?.name || selectedTournament.course_name || selectedTournament.course_id?.toString()
                    }}
                    tournamentSettings={{
                      holeConfiguration: selectedTournament.hole_configuration || '18',
                      tee: selectedTournament.tee || 'Red',
                      pins: selectedTournament.pins || 'Friday',
                      puttingGimme: selectedTournament.putting_gimme || '8'
                    }}
                  />
                )}
              </div>
            ) : params.tournamentId && tournamentsLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
                  <span className="ml-3 text-gray-600">Loading tournament...</span>
                </div>
              </div>
            ) : params.tournamentId && !tournamentsLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Tournament Not Found</h4>
                  <p className="text-gray-500 text-sm mb-4">
                    The tournament you're looking for doesn't exist or is no longer available.
                  </p>
                  <button
                    onClick={handleBackToTournaments}
                    className="flex items-center space-x-2 text-brand-neon-green hover:text-green-600 transition-colors mx-auto"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Back to Tournaments</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-6 h-6 text-brand-neon-green" />
                    <h3 className="text-xl font-semibold text-gray-900">Tournament Leaderboards</h3>
                  </div>
                </div>

                {tournamentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
                  </div>
                ) : tournaments.length > 0 ? (
                  <div className="space-y-4">
                    {tournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                        onClick={() => handleTournamentSelect(tournament)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{tournament.name}</h4>
                            <p className="text-sm text-gray-600 mb-2">{tournament.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{tournament.tournament_format?.replace('_', ' ') || 'Unknown'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Tournaments Available</h4>
                    <p className="text-gray-500 text-sm">
                      There are no tournaments available to view at this time.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 