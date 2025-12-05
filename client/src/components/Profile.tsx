import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import api, { getUserProfile, updateUser, getMatches, User, UserProfile, Match, saveScorecard, getUserSimStats, getUserGrassStats, getUserCombinedStats, getUserCourseRecords, uploadProfilePhoto, SimStats, UserCourseRecord, getCurrentUser, getUserTournaments } from '../services/api';
import { User as UserIcon, Edit3, Save, X, Target, TrendingUp, MapPin, Clock, Circle, Settings, Camera, BarChart3, Award, Trophy, Calendar, DollarSign, MessageSquare, Eye, CheckCircle, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import TrackRoundModal from './TrackRoundModal';
import ScoreCard from './ScoreCard';
import StrokePlayScoreCard from './StrokePlayScoreCard';
import ViewAsMode from './ViewAsMode';
import { SegmentedControl } from './ui/SegmentedControl';

const Profile: React.FC = () => {
  const { user, token, logout, refreshUser } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const hasBetaAccess = hasPermission('access_beta_features');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simStats, setSimStats] = useState<SimStats | null>(null);
  const [combinedStats, setCombinedStats] = useState<SimStats | null>(null);
  const [courseRecords, setCourseRecords] = useState<UserCourseRecord[]>([]);
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [showAllTournaments, setShowAllTournaments] = useState(false);
  const [statsTab, setStatsTab] = useState<'overview' | 'sim' | 'records'>('overview');
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    club: user?.club || '',
    handicap: user?.handicap || 0,
    sim_handicap: user?.sim_handicap || 0,
  });

  // Track Round Modal State
  const [showTrackRoundModal, setShowTrackRoundModal] = useState(false);
  const [showScoreCard, setShowScoreCard] = useState(false);
  const [scoreCardType, setScoreCardType] = useState<'mully' | 'stroke' | null>(null);
  const [roundType, setRoundType] = useState<'sim' | null>(null);
  const [holes, setHoles] = useState<9 | 18 | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any & { teeboxData?: { teebox: string; courseRating: number; courseSlope: number } }>(null);
  const [nineType, setNineType] = useState<'front' | 'back' | null>(null);

  // Photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Handicap animation state
  const [simHandicapAnimating, setSimHandicapAnimating] = useState(false);
  const [simHandicapDirection, setSimHandicapDirection] = useState<'up' | 'down' | null>(null);
  const [grassHandicapAnimating, setGrassHandicapAnimating] = useState(false);
  const [grassHandicapDirection, setGrassHandicapDirection] = useState<'up' | 'down' | null>(null);

  const fetchData = async () => {
    if (user?.member_id) {
      try {
        setLoading(true);
        console.log('Fetching data for user ID:', user.member_id);
        console.log('User data:', user);
        
        const [profileResponse, matchesResponse, nationalChampionshipMatchesResponse, simStatsResponse, combinedStatsResponse, courseRecordsResponse, userTournamentsResponse] = await Promise.all([
          getUserProfile(user.member_id),
          getMatches(),
          api.get('/user/national-championship-matches').catch(() => ({ data: [] })), // Fetch national championship matches
          getUserSimStats(user.member_id),
          getUserCombinedStats(user.member_id),
          getUserCourseRecords(user.member_id),
          getUserTournaments(user.member_id)
        ]);
        
        console.log('Sim stats response:', simStatsResponse.data);
        console.log('Combined stats response:', combinedStatsResponse.data);
        
        // Check for handicap changes before updating state
        const oldSimHandicap = user?.sim_handicap || 0;
        const oldGrassHandicap = user?.grass_handicap || 0;
        
        setProfile(profileResponse.data);
        // Combine regular matches with national championship matches
        const allMatches = [
          ...matchesResponse.data,
          ...(nationalChampionshipMatchesResponse.data || [])
        ];
        setMatches(allMatches);
        setSimStats(simStatsResponse.data);
        setCombinedStats(combinedStatsResponse.data);
        setCourseRecords(courseRecordsResponse.data);
        setUserTournaments(userTournamentsResponse.data);
        
        // Debug: Log tournament data to verify has_submitted_score is included
        console.log('User tournaments with score submission status:', userTournamentsResponse.data);
        
        // After updating stats, we need to refresh the user data to get updated handicaps
        // This will be handled by the parent component or context
      } catch (err) {
        setError('Failed to load profile data');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.member_id]);

  const handleSave = async () => {
    if (!user?.member_id) return;

    try {
      setLoading(true);
      
      // Test API connection first
      try {
        const testResponse = await api.get('/health');
        console.log('API health check:', testResponse.status);
      } catch (err) {
        console.error('API health check failed:', err);
      }

      // Update user
      const updatedUser = await updateUser(user.member_id, formData);
      // Refresh user data
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      setError('Failed to save profile changes');
      console.error(err);
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
      sim_handicap: user?.sim_handicap || 0,
    });
    setIsEditing(false);
    setError(null);
  };





  // Track Round Handlers
  const handleTrackRound = () => {
    setShowTrackRoundModal(true);
  };

  const handleSelectRoundType = (roundType: 'sim', holes: 9 | 18, course: any, nineType: 'front' | 'back' | null = null, teeboxData?: { teebox: string; courseRating: number | null; courseSlope: number | null }) => {
    console.log('handleSelectRoundType called with:', { roundType, holes, course, nineType, teeboxData }); // Debug log
    setScoreCardType('stroke'); // Default to stroke play
    setRoundType(roundType);
    setHoles(holes);
    setNineType(nineType);
    setShowTrackRoundModal(false);
    setShowScoreCard(true);
    setSelectedCourse(course);
    // Store teebox data for use when saving scorecard
    if (teeboxData) {
      console.log('Setting teebox data:', teeboxData); // Debug log
      setSelectedCourse((prev: any) => ({ ...prev, teeboxData }));
    } else {
      console.log('No teebox data provided'); // Debug log
    }
  };

  const handleCloseScoreCard = () => {
    setShowScoreCard(false);
    setScoreCardType(null);
    setRoundType(null);
    setHoles(null);
    setSelectedCourse(null);
    setNineType(null);
  };

  const handleSaveScoreCard = async (scoreCardData: any) => {
    try {
      console.log('ScoreCard data received:', scoreCardData); // Debug log
      
              // Test API connection first
        try {
          const testResponse = await api.get('/health');
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
        final_score: scoreCardData.finalScore || scoreCardData.final_score || scoreCardData.totalStrokes || 0,
        round_type: roundType || 'sim',
        course_name: selectedCourse?.name || scoreCardData.course_name || '',
        teebox: selectedCourse?.teeboxData?.teebox || scoreCardData.teebox || null,
        course_rating: selectedCourse?.teeboxData?.courseRating || scoreCardData.course_rating || null,
        course_slope: selectedCourse?.teeboxData?.courseSlope || scoreCardData.course_slope || null,
        holes_played: holes || 18,
        nine_type: nineType || null
      };

      console.log('Selected course teebox data:', selectedCourse?.teeboxData); // Debug log
      console.log('API data being sent:', apiData); // Debug log

      // Save to the backend
      const response = await saveScorecard(apiData);
      console.log('Save response:', response); // Debug log
      
      if (response && response.data) {
        console.log('Scorecard saved with ID:', response.data.id);
        
        // Store current user data for comparison
        const oldUser = user;
        
        // Refresh user data to get updated handicaps
        await refreshUser();
        
        // Refresh profile data to show the new round
        await fetchData();
        
        // Get the updated user data by calling the API directly
        try {
          const updatedUserResponse = await getCurrentUser(token!);
          const updatedUser = updatedUserResponse.data.user;
          
          // Check for handicap changes
          checkHandicapChanges(oldUser, updatedUser);
        } catch (error) {
          console.error('Error getting updated user data:', error);
        }
        
        // Close the scorecard without showing success message
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



  // Photo upload handlers
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const response = await uploadProfilePhoto(file);
      if (response.data.success) {
        // Refresh user data to get updated photo URL
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleViewLeaderboard = (tournamentId: number) => {
    navigate(`/leaderboard/tournament/${tournamentId}`);
  };

  const handleSubmitScore = (tournamentId: number) => {
    // Navigate to the tournament scoring page for this tournament
    navigate(`/tournament-scoring?tournament=${tournamentId}`);
  };

  // Helper function to determine if a tournament is eligible for score submission
  const isTournamentEligibleForScore = (tournament: any) => {
    return (tournament.status === 'open' || tournament.status === 'active') && !tournament.has_submitted_score;
  };

  // Helper function to sort tournaments with those needing scores first
  const getSortedTournaments = (tournaments: any[]) => {
    return [...tournaments].sort((a, b) => {
      const aNeedsScore = isTournamentEligibleForScore(a);
      const bNeedsScore = isTournamentEligibleForScore(b);
      
      // If one needs score and the other doesn't, prioritize the one that needs score
      if (aNeedsScore && !bNeedsScore) return -1;
      if (!aNeedsScore && bNeedsScore) return 1;
      
      // If both need scores or both don't need scores, sort by start date (newest first)
      if (a.start_date && b.start_date) {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }
      
      // If no start dates, maintain original order
      return 0;
    });
  };

  // Get tournaments to display (limited to 3 initially, or all if showAllTournaments is true)
  const getDisplayedTournaments = () => {
    const sortedTournaments = getSortedTournaments(userTournaments);
    return showAllTournaments ? sortedTournaments : sortedTournaments.slice(0, 3);
  };

  // Function to determine which rounds are used for handicap calculation
  const getHandicapRounds = (rounds: Array<{ id: number; date_played: string; course_name: string; total_strokes: number; differential: number | null; round_type: string }>) => {
    // Filter rounds with valid differentials and sort by date (newest first)
    const validRounds = rounds
      .filter(round => round.differential !== null)
      .sort((a, b) => new Date(b.date_played).getTime() - new Date(a.date_played).getTime());
    
    console.log('Handicap calculation debug:', {
      totalRounds: rounds.length,
      roundsWithDifferentials: validRounds.length,
      roundsWithoutDifferentials: rounds.length - validRounds.length,
      roundsWithoutDifferentialsList: rounds.filter(round => round.differential === null).map(r => ({ id: r.id, course: r.course_name, date: r.date_played }))
    });
    
    if (validRounds.length === 0) return [];
    
    let roundsToUse: typeof validRounds = [];
    
    // USGA Handicap System 2020+ rules
    if (validRounds.length >= 20) {
      // Use best 8 out of last 20
      roundsToUse = validRounds.slice(0, 20).sort((a, b) => (a.differential || 0) - (b.differential || 0)).slice(0, 8);
      console.log('Using best 8 out of last 20 (20+ rounds available)');
    } else if (validRounds.length >= 15) {
      // Use best 7 out of last 15
      roundsToUse = validRounds.slice(0, 15).sort((a, b) => (a.differential || 0) - (b.differential || 0)).slice(0, 7);
      console.log('Using best 7 out of last 15 (15-19 rounds available)');
    } else if (validRounds.length >= 10) {
      // Use best 6 out of last 10
      roundsToUse = validRounds.slice(0, 10).sort((a, b) => (a.differential || 0) - (b.differential || 0)).slice(0, 6);
      console.log('Using best 6 out of last 10 (10-14 rounds available)');
    } else if (validRounds.length >= 5) {
      // Use best 5 out of last 5
      roundsToUse = validRounds.slice(0, 5).sort((a, b) => (a.differential || 0) - (b.differential || 0)).slice(0, 5);
      console.log('Using best 5 out of last 5 (5-9 rounds available)');
    } else if (validRounds.length >= 3) {
      // Use best 3 out of last 3
      roundsToUse = validRounds.slice(0, 3).sort((a, b) => (a.differential || 0) - (b.differential || 0)).slice(0, 3);
      console.log('Using best 3 out of last 3 (3-4 rounds available)');
    } else if (validRounds.length >= 1) {
      // Use best 1 out of last 1
      roundsToUse = validRounds.slice(0, 1).sort((a, b) => (a.differential || 0) - (b.differential || 0)).slice(0, 1);
      console.log('Using best 1 out of last 1 (1-2 rounds available)');
    }
    
    console.log('Rounds being used for handicap:', roundsToUse.map(r => ({ id: r.id, course: r.course_name, differential: r.differential })));
    
    // Return the IDs of rounds being used for handicap calculation
    return roundsToUse.map(round => round.id);
  };

  // Function to check for handicap changes
  const checkHandicapChanges = (oldUser: User | null, newUser: User | null) => {
    console.log('checkHandicapChanges called with:', { oldUser, newUser });
    
    if (!oldUser || !newUser) {
      console.log('Missing user data, returning early');
      return;
    }
    
    const oldSimHandicap = oldUser.sim_handicap || 0;
    const oldGrassHandicap = oldUser.grass_handicap || 0;
    const newSimHandicap = newUser.sim_handicap || 0;
    const newGrassHandicap = newUser.grass_handicap || 0;
    
    console.log('Handicap comparison:', {
      oldSimHandicap,
      newSimHandicap,
      oldGrassHandicap,
      newGrassHandicap
    });
    
    // Detect sim handicap change
    if (Math.abs(newSimHandicap - oldSimHandicap) > 0.01) { // Account for floating point precision
      const direction = newSimHandicap > oldSimHandicap ? 'up' : 'down';
      console.log('Sim handicap changed:', { direction, oldValue: oldSimHandicap, newValue: newSimHandicap });
      setSimHandicapDirection(direction);
      setSimHandicapAnimating(true);
    }
    
    // Detect grass handicap change
    if (Math.abs(newGrassHandicap - oldGrassHandicap) > 0.01) { // Account for floating point precision
      const direction = newGrassHandicap > oldGrassHandicap ? 'up' : 'down';
      console.log('Grass handicap changed:', { direction, oldValue: oldGrassHandicap, newValue: newGrassHandicap });
      setGrassHandicapDirection(direction);
      setGrassHandicapAnimating(true);
    }
  };

  // Animated handicap number component
  const AnimatedHandicapNumber = ({ 
    value, 
    isAnimating, 
    direction, 
    onAnimationComplete 
  }: { 
    value: number; 
    isAnimating: boolean; 
    direction: 'up' | 'down' | null; 
    onAnimationComplete: () => void;
  }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [color, setColor] = useState('text-blue-300');
    const [size, setSize] = useState('text-lg');

    useEffect(() => {
      if (isAnimating && direction) {
        // Initial delay
        setTimeout(() => {
          // Set color based on direction
          // Green for handicap going down (improvement), red for going up (worsening)
          setColor(direction === 'down' ? 'text-green-400' : 'text-red-400');
          
          // Grow in size
          setSize('text-2xl');
          
          // Animate the number with variable speed
          const startValue = direction === 'down' ? value + 0.7 : value - 0.7;
          const endValue = value;
          const steps = 7; // 7 steps to count by 0.1
          const stepValue = (endValue - startValue) / steps;
          
          let currentStep = 0;
          
          const animateStep = () => {
            currentStep++;
            const currentValue = startValue + (stepValue * currentStep);
            setDisplayValue(currentValue);
            
            if (currentStep >= steps) {
              // Pause at the end
              setTimeout(() => {
                // Shrink back to original size
                setSize('text-lg');
                setTimeout(() => {
                  setColor('text-blue-300'); // Reset to normal color
                  onAnimationComplete();
                }, 300); // Wait for size transition to complete
              }, 500); // 500ms pause before shrinking
              return;
            }
            
            // Variable speed: slow -> fast -> slow
            let delay;
            if (currentStep <= 2) {
              delay = 150; // Slow start
            } else if (currentStep >= 5) {
              delay = 150; // Slow end
            } else {
              delay = 80; // Fast middle
            }
            
            setTimeout(animateStep, delay);
          };
          
          // Start the animation
          setTimeout(animateStep, 200); // 200ms delay before starting
          
        }, 300); // 300ms initial delay
      }
    }, [isAnimating, direction, value, onAnimationComplete]);

    return (
      <span className={`font-bold transition-all duration-300 ${color} ${size}`}>
        {displayValue.toFixed(1)}
      </span>
    );
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
      handicap: user?.sim_handicap || user?.handicap || 0
    };

    if (scoreCardType === 'mully') {
      return (
        <ScoreCard 
          onClose={handleCloseScoreCard}
          onSave={handleSaveScoreCard}
          userInfo={userInfo}
          holes={holes || 18}
          course={selectedCourse}
          nineType={nineType}
        />
      );
    } else {
      return (
        <StrokePlayScoreCard 
          onClose={handleCloseScoreCard}
          onSave={handleSaveScoreCard}
          userInfo={userInfo}
          holes={holes || 18}
          course={selectedCourse}
          nineType={nineType}
        />
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto relative pb-16 sm:pb-6">
      {/* Golf Passport Header */}
      <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6 lg:mb-0">
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                {user?.profile_photo_url ? (
                  <img 
                    src={user.profile_photo_url} 
                    alt="Profile" 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                )}
              </div>
              {isEditing && (
                <button
                  onClick={triggerPhotoUpload}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 bg-brand-neon-green text-brand-black rounded-full p-1.5 sm:p-2 hover:bg-green-400 transition-colors disabled:opacity-50"
                  title="Upload profile photo"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-brand-black"></div>
                  ) : (
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center">
                  {user?.first_name} {user?.last_name}
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-2 sm:ml-3 flex items-center justify-center p-1.5 sm:p-2 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                  {user?.role?.toLowerCase() === 'admin' && !isEditing && (
                    <>
                      <button
                        onClick={() => navigate('/admin')}
                        className="ml-2 sm:ml-3 flex items-center justify-center p-1.5 sm:p-2 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl"
                        title="Admin Dashboard"
                      >
                        <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <div className="ml-2 sm:ml-3">
                        <ViewAsMode />
                      </div>
                    </>
                  )}
                </h1>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium">
                    {user?.role?.toLowerCase() === 'admin' ? 'Admin' :
                     user?.role?.toLowerCase() === 'club pro' ? 'Club Pro' :
                     user?.role?.toLowerCase() === 'ambassador' ? 'Ambassador' : 'Member'}
                  </div>
                  {hasBetaAccess && (
                    <div className="profile-view-toggle">
                      <SegmentedControl
                        options={[
                          { value: 'classic', label: 'Classic' },
                          { value: 'beta', label: 'Beta', icon: <span>✨</span> }
                        ]}
                        value="classic"
                        onChange={(value) => value === 'beta' && navigate('/beta-profile')}
                        size="sm"
                        variant="compact"
                        className="backdrop-blur-sm"
                      />
                      <style>{`
                        /* Active Classic button - solid white */
                        .profile-view-toggle button:first-child[aria-pressed="true"] {
                          background: white !important;
                          color: rgb(22 101 52) !important;
                          font-weight: 600;
                        }

                        /* Inactive Classic button */
                        .profile-view-toggle button:first-child[aria-pressed="false"] {
                          color: rgba(255, 255, 255, 0.7);
                        }

                        /* Active Beta button - purple gradient */
                        .profile-view-toggle button:last-child[aria-pressed="true"] {
                          background: linear-gradient(to right, rgb(168 85 247), rgb(59 130 246)) !important;
                          color: white !important;
                          font-weight: 600;
                        }

                        /* Inactive Beta button - subtle purple tint */
                        .profile-view-toggle button:last-child[aria-pressed="false"] {
                          background: rgba(168, 85, 247, 0.15) !important;
                          color: rgba(192, 132, 252, 0.9) !important;
                        }

                        .profile-view-toggle button:last-child[aria-pressed="false"]:hover {
                          background: rgba(168, 85, 247, 0.25) !important;
                          color: rgb(192, 132, 252) !important;
                        }
                      `}</style>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-white/90 text-sm sm:text-base">
                <span className="flex items-center">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {user?.club || 'No club specified'}
                </span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {/* Removed Track Round and User Tracking Dashboard buttons from here */}
          </div>
        </div>

        {/* Handicap Information in Hero */}
        {user?.sim_handicap !== null && user?.sim_handicap !== undefined && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/20">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-start sm:items-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 border border-white/20 flex items-center space-x-2 sm:space-x-3">
                <div className="bg-blue-500/20 rounded-full p-1">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-medium text-white">NN Handicap</span>
                  <span className="text-base sm:text-lg font-bold text-blue-300 ml-1 sm:ml-2">
                    <AnimatedHandicapNumber
                      value={parseFloat(user.sim_handicap)}
                      isAnimating={simHandicapAnimating}
                      direction={simHandicapDirection}
                      onAnimationComplete={() => {
                        setSimHandicapAnimating(false);
                        setSimHandicapDirection(null);
                      }}
                    />
                  </span>
                </div>
                <div className="text-xs text-white/60 ml-1 sm:ml-2">
                  App Tracked
                </div>
              </div>
              {user?.role?.toLowerCase() === 'admin' && (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSdgJYkNMW4RzG8wZFVt8zS1sfe_m8Ejtvg23OSUUggOVtQOSw/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-neon-green/90 hover:bg-brand-neon-green text-brand-black rounded-full px-3 sm:px-4 py-2 border border-brand-neon-green/40 flex items-center justify-center space-x-2 shadow-sm transition-colors font-medium text-sm sm:text-base"
                  >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Platform Feedback</span>
                    <span className="sm:hidden">Feedback</span>
                  </a>
                </div>
              )}
              {(user?.role?.toLowerCase() === 'club pro' || user?.role?.toLowerCase() === 'admin') && (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => navigate('/club-pro')}
                    className="bg-brand-neon-green/90 hover:bg-brand-neon-green text-brand-black rounded-full px-3 sm:px-4 py-2 border border-brand-neon-green/40 flex items-center justify-center space-x-2 shadow-sm transition-colors font-medium text-sm sm:text-base"
                  >
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Club Pro Dashboard</span>
                    <span className="sm:hidden">Club Dashboard</span>
                  </button>
                </div>
              )}
              {user?.role?.toLowerCase() === 'ambassador' && (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSdgJYkNMW4RzG8wZFVt8zS1sfe_m8Ejtvg23OSUUggOVtQOSw/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-neon-green/90 hover:bg-brand-neon-green text-brand-black rounded-full px-3 sm:px-4 py-2 border border-brand-neon-green/40 flex items-center justify-center space-x-2 shadow-sm transition-colors font-medium text-sm sm:text-base"
                  >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Platform Feedback</span>
                    <span className="sm:hidden">Feedback</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Form - Inline in hero when editing */}
        {isEditing && (
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/20">
            {error && (
              <div className="bg-red-500/20 border border-red-400/50 text-white px-3 sm:px-4 py-2 sm:py-3 rounded mb-3 sm:mb-4 text-sm sm:text-base">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/90 mb-1 sm:mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50 text-sm sm:text-base"
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/90 mb-1 sm:mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50 text-sm sm:text-base"
                  placeholder="Last Name"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/90 mb-1 sm:mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50 text-sm sm:text-base"
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-white/90 mb-1 sm:mb-2">
                  Club
                </label>
                <input
                  type="text"
                  value={formData.club}
                  onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50"
                  placeholder="Club"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Official GHIN Handicap
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.handicap}
                  onChange={(e) => setFormData({ ...formData, handicap: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50"
                  placeholder="GHIN Handicap"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Statistics */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 relative">
        {/* Track Round Floating Action Button (FAB) */}
        {!isEditing && (
          <button
            onClick={handleTrackRound}
            className="
              fixed bottom-6 left-1/2 -translate-x-1/2 w-[90vw] max-w-xs rounded-full px-6 py-4 z-50 flex items-center justify-center
              bg-brand-neon-green text-brand-black shadow-2xl hover:bg-green-400 transition-all font-bold text-lg
              focus:outline-none focus:ring-4 focus:ring-brand-neon-green/40 group
              sm:absolute sm:top-6 sm:right-6 sm:left-auto sm:bottom-auto sm:translate-x-0
              sm:w-auto sm:max-w-none sm:px-6 sm:py-2 sm:rounded-full
            "
            title="Track your golf round and update your stats!"
          >
            <Circle className="w-7 h-7 mr-3" />
            <span>Track Round</span>
          </button>
        )}
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setStatsTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statsTab === 'overview'
                ? 'bg-brand-neon-green text-brand-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setStatsTab('sim')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statsTab === 'sim'
                ? 'bg-brand-neon-green text-brand-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Simulator
          </button>
          <button
            onClick={() => setStatsTab('records')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statsTab === 'records'
                ? 'bg-brand-neon-green text-brand-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            Course Records
          </button>
        </div>

        {/* Overview Tab */}
        {statsTab === 'overview' && (
          <div>
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3" />
              Overall Performance
            </h2>
            
            {/* Combined Stats Overview */}
            {simStats && simStats.total_rounds > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {simStats.total_rounds}
                    </div>
                    <div className="text-sm text-gray-600">Total Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {simStats.unique_courses}
                    </div>
                    <div className="text-sm text-gray-600">Courses Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {simStats.avg_differential ? Number(simStats.avg_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Avg Differential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {simStats.best_differential ? Number(simStats.best_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Best Differential</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Simulator Summary */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <Target className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-800">Performance</h3>
                    </div>
                    {simStats && simStats.total_rounds > 0 ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Differential:</span>
                          <span className="font-semibold">
                            {simStats.avg_differential ? Number(simStats.avg_differential).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Best Differential:</span>
                          <span className="font-semibold">
                            {simStats.best_differential ? Number(simStats.best_differential).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Courses Played:</span>
                          <span className="font-semibold">{simStats.unique_courses}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No simulator rounds yet</p>
                    )}
                  </div>

                  {/* Activity Summary */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <Clock className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-800">Activity</h3>
                    </div>
                    {simStats && simStats.total_rounds > 0 ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days Played:</span>
                          <span className="font-semibold">{simStats.unique_dates}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">First Round:</span>
                          <span className="font-semibold">
                            {simStats.first_round ? new Date(simStats.first_round).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Round:</span>
                          <span className="font-semibold">
                            {simStats.last_round ? new Date(simStats.last_round).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No activity data yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Rounds Tracked Yet</h3>
                <p className="text-gray-600 mb-6">Start tracking your simulator rounds to see your performance statistics here.</p>
                <button
                  onClick={handleTrackRound}
                  className="inline-flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium"
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Track Your First Round
                </button>
              </div>
            )}
          </div>
        )}

        {/* Simulator Tab */}
        {statsTab === 'sim' && (
          <div>
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <Target className="w-6 h-6 mr-3" />
              Simulator Performance
            </h2>
            
            {/* Simulator Round Stats */}
            {simStats && simStats.total_rounds > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{simStats.total_rounds}</div>
                    <div className="text-sm text-gray-600">Total Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {simStats.avg_differential ? Number(simStats.avg_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Avg Differential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {simStats.best_differential ? Number(simStats.best_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Best Differential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{simStats.unique_courses}</div>
                    <div className="text-sm text-gray-600">Courses Played</div>
                  </div>
                </div>
                
                {/* Additional Sim Stats */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Scoring</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {simStats.avg_strokes && simStats.avg_strokes > 0 ? Number(simStats.avg_strokes).toFixed(1) : 
                       simStats.avg_differential ? Number(simStats.avg_differential).toFixed(1) : 'N/A'} avg
                    </div>
                    <div className="text-sm text-gray-500">
                      {simStats.avg_strokes && simStats.avg_strokes > 0 ? 
                        `Best: ${simStats.best_strokes || 'N/A'} • Worst: ${simStats.worst_strokes || 'N/A'}` :
                        `Best: ${simStats.best_differential ? Number(simStats.best_differential).toFixed(1) : 'N/A'} • Worst: ${simStats.worst_differential ? Number(simStats.worst_differential).toFixed(1) : 'N/A'}`
                      }
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {simStats.avg_strokes && simStats.avg_strokes > 0 ? 'Strokes' : 'Differential'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Activity</div>
                    <div className="text-lg font-semibold text-gray-800">{simStats.unique_dates} days</div>
                    <div className="text-sm text-gray-500">
                      {simStats.first_round && simStats.last_round ? 
                        `${new Date(simStats.first_round).toLocaleDateString()} - ${new Date(simStats.last_round).toLocaleDateString()}` : 
                        'No date range'
                      }
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Recent Activity</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {simStats.recent_rounds.length} rounds
                    </div>
                    <div className="text-sm text-gray-500">
                      Last: {simStats.last_round ? new Date(simStats.last_round).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Recent Simulator Rounds */}
                {simStats.recent_rounds.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Recent Simulator Rounds ({simStats.recent_rounds.slice(0, 20).length} of {simStats.total_rounds})
                    </h3>
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                      {(() => {
                        const handicapRoundIds = getHandicapRounds(simStats.recent_rounds);
                        return simStats.recent_rounds.slice(0, 20).map((round, index) => {
                          const isHandicapRound = handicapRoundIds.includes(round.id);
                          return (
                            <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                              isHandicapRound ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}>
                                                          <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-medium text-gray-900">{round.course_name}</div>
                                <div className="text-sm text-gray-600">
                                  {new Date(round.date_played).toLocaleDateString()} • {round.round_type}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                {isHandicapRound && (
                                  <>
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-green-700 font-medium">Handicap</span>
                                  </>
                                )}
                                {!round.differential && (
                                  <>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <span className="text-xs text-gray-600">No Differential</span>
                                  </>
                                )}
                              </div>
                            </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-900">{round.total_strokes} strokes</div>
                                {round.differential && (
                                  <div className={`text-sm ${isHandicapRound ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                    {Number(round.differential).toFixed(1)} differential
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    {(() => {
                      const handicapRoundIds = getHandicapRounds(simStats.recent_rounds);
                      const handicapRoundsCount = handicapRoundIds.length;
                      const totalRounds = simStats.recent_rounds.length;
                      const roundsWithDifferentials = simStats.recent_rounds.filter(r => r.differential !== null).length;
                      const roundsWithoutDifferentials = totalRounds - roundsWithDifferentials;
                      
                      if (handicapRoundsCount > 0) {
                        return (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm text-blue-800 space-y-1">
                              <div><strong>Handicap Calculation:</strong> Using {handicapRoundsCount} best differential{handicapRoundsCount !== 1 ? 's' : ''} from your recent rounds</div>
                              <div className="text-xs text-blue-600">
                                {roundsWithDifferentials} of {totalRounds} rounds have differentials
                                {roundsWithoutDifferentials > 0 && ` • ${roundsWithoutDifferentials} rounds missing course rating/slope data`}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Simulator Rounds Yet</h3>
                <p className="text-gray-600 mb-4">Start tracking your simulator rounds to see your performance statistics here.</p>
                <button
                  onClick={handleTrackRound}
                  className="inline-flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium"
                >
                  <Circle className="w-4 h-4 mr-2" />
                  Track Your First Round
                </button>
              </div>
            )}
          </div>
        )}

        {/* Course Records Tab */}
        {statsTab === 'records' && (
          <div>
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <Award className="w-6 h-6 mr-3" />
              Course Records
            </h2>
            
            {/* Merge club and community records for the same course */}
            {(() => {
              // Map course_id to { club: record, community: record }
              const merged: Record<number, { club?: UserCourseRecord; community?: UserCourseRecord }> = {};
              courseRecords.forEach(record => {
                if (!merged[record.course_id]) merged[record.course_id] = {};
                if (record.record_club === null) {
                  merged[record.course_id].community = record;
                } else {
                  merged[record.course_id].club = record;
                }
              });
              const mergedList = Object.values(merged);

              if (mergedList.length > 0) {
                return (
                  <div>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {mergedList.length}
                        </div>
                        <div className="text-sm text-gray-600">Unique Courses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {user && courseRecords.filter(r => r.record_club === user.club).length}
                        </div>
                        <div className="text-sm text-gray-600">No5 Records</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {courseRecords.filter(r => r.record_club === null).length}
                        </div>
                        <div className="text-sm text-gray-600">Community Records</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {courseRecords.length > 0 ? Math.max(...courseRecords.map(r => r.days_standing)) : 0}
                        </div>
                        <div className="text-sm text-gray-600">Longest Standing (Days)</div>
                      </div>
                    </div>

                    {/* Course Records List */}
                    <div className="space-y-4">
                      {mergedList.map(({ club, community }) => {
                        // Prefer to show the best score and most recent date
                        const record = club && community
                          ? (club.best_score <= community.best_score ? club : community)
                          : club || community;
                        if (!record) return null;
                        return (
                          <div key={record.course_id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{record.course_name}</h3>
                                  {club && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                      No5 Record
                                    </span>
                                  )}
                                  {community && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                      Community Record
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                                  {record.location && (
                                    <span className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-1" />
                                      {record.location}
                                    </span>
                                  )}
                                  {record.designer && (
                                    <span className="flex items-center">
                                      <UserIcon className="w-4 h-4 mr-1" />
                                      {record.designer}
                                    </span>
                                  )}
                                  <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {new Date(record.date_played).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900 mb-1">
                                  {record.best_score} strokes
                                </div>
                                <div className="text-sm text-gray-600">
                                  {record.days_standing} days standing
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="text-center py-8">
                    <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No Course Records Yet</h3>
                    <p className="text-gray-600 mb-6">Start playing simulator rounds to set course records for your club and the community.</p>
                    <button
                      onClick={handleTrackRound}
                      className="inline-flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium"
                    >
                      <Circle className="w-4 h-4 mr-2" />
                      Track Your First Round
                    </button>
                  </div>
                );
              }
            })()}
          </div>
        )}
      </div>

      {/* Recent Matches */}
      {userMatches.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
            <Clock className="w-6 h-6 mr-3" />
            Recent Matches
          </h2>
          <div className="space-y-4">
            {userMatches.slice(0, 5).map((match) => {
              const result = getMatchResult(match);
              return (
                <div key={match.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-5 h-5 text-gray-500" />
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

      {/* My Tournaments */}
      {user && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-brand-black flex items-center">
              <Trophy className="w-6 h-6 mr-3" />
              My Tournaments
            </h2>
            <Link
              to="/tournaments"
              className="flex items-center justify-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors w-full sm:w-auto"
            >
              <Award className="w-4 h-4 mr-2" />
              Browse All Tournaments
            </Link>
          </div>
          
          {/* Tournament Summary */}
          {userTournaments.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center text-sm text-blue-800">
                <Info className="w-4 h-4 mr-2" />
                <span>
                  {userTournaments.filter(t => isTournamentEligibleForScore(t)).length} tournament(s) open for score submission
                </span>
              </div>
            </div>
          )}
          
          {userTournaments.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getDisplayedTournaments().map((tournament) => (
                <div key={tournament.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-neon-green transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-brand-black group-hover:text-brand-neon-green transition-colors">
                      {tournament.name}
                    </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tournament.status === 'active' ? 'bg-green-100 text-green-800' :
                    tournament.status === 'open' ? 'bg-blue-100 text-blue-800' :
                    tournament.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    tournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tournament.status === 'active' ? 'Active' :
                     tournament.status === 'open' ? 'Open' :
                     tournament.status === 'completed' ? 'Completed' :
                     tournament.status === 'cancelled' ? 'Cancelled' :
                     tournament.status || 'Draft'}
                  </span>
                  </div>
                  <div className="text-sm text-neutral-600 mb-2">
                    {tournament.tournament_format || 'match_play'} • {tournament.type || 'tournament'}
                  </div>
                  {tournament.start_date && (
                    <div className="text-xs text-neutral-500 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      {new Date(tournament.start_date).toLocaleDateString()}
                    </div>
                  )}
                  {tournament.location && (
                    <div className="text-xs text-neutral-500 mb-2">
                      <MapPin className="inline w-4 h-4 mr-1" />
                      {tournament.location}
                    </div>
                  )}
                  {tournament.entry_fee && tournament.entry_fee > 0 && (
                    <div className="text-xs text-neutral-500 mb-2">
                      <DollarSign className="inline w-4 h-4 mr-1" />
                      ${tournament.entry_fee} entry fee
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    {/* Only show Submit Score button if tournament is open/active and user hasn't submitted */}
                    {isTournamentEligibleForScore(tournament) ? (
                      <button
                        onClick={() => handleSubmitScore(tournament.id)}
                        className="flex items-center justify-center w-full px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors text-sm"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        {tournament.type === 'club_championship' ? 'My Matches' : 'Submit Score'}
                      </button>
                    ) : tournament.has_submitted_score ? (
                      <div className="flex flex-col items-center justify-center w-full px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                        <div className="flex items-center font-medium">
                          <Circle className="w-4 h-4 mr-2" />
                          Score Submitted
                        </div>
                        {tournament.last_score_date && (
                          <div className="text-xs text-green-600 mt-1">
                            {new Date(tournament.last_score_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full px-3 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        Tournament Closed
                      </div>
                    )}
                    <button
                      onClick={() => handleViewLeaderboard(tournament.id)}
                      className="flex items-center justify-center w-full px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Leaderboard
                    </button>
                  </div>
                </div>
              ))}
              </div>
              
              {/* Load More Button */}
              {userTournaments.length > 3 && !showAllTournaments && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAllTournaments(true)}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Load More Tournaments ({userTournaments.length - 3} more)
                  </button>
                </div>
              )}
              
              {/* Show Less Button */}
              {showAllTournaments && userTournaments.length > 3 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAllTournaments(false)}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Show Less
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Tournaments Yet</h3>
              <p className="text-gray-600 mb-6">You haven't registered for any tournaments yet. Browse available tournaments to get started!</p>
              <Link
                to="/tournaments"
                className="inline-flex items-center px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
              >
                <Award className="w-4 h-4 mr-2" />
                Browse Tournaments
              </Link>
            </div>
          )}
        </div>
      )}


      {/* Track Round Modal */}
      <TrackRoundModal
        isOpen={showTrackRoundModal}
        onClose={() => setShowTrackRoundModal(false)}
        onSelectRoundType={(roundType, holes, course, nineType, teeboxData) => handleSelectRoundType(roundType, holes, course, nineType, teeboxData)}
      />
    </div>
  );
};

export default Profile; 