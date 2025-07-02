import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { getUserProfile, updateUser, getMatches, getTournaments, getTournamentParticipants, registerUserForTournament, unregisterUserFromTournament, User, UserProfile, Match, Tournament, saveScorecard, createTournament, getUserSimStats, getUserGrassStats, getUserCombinedStats, uploadProfilePhoto, SimStats, getCurrentUser } from '../services/api';
import { User as UserIcon, Edit3, Save, X, Trophy, Target, TrendingUp, Calendar, MapPin, LogOut, Clock, Users, Plus, Minus, Award, Circle, Settings, Camera, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrackRoundModal from './TrackRoundModal';
import ScoreCard from './ScoreCard';
import StrokePlayScoreCard from './StrokePlayScoreCard';
import ProfileTournaments from './ProfileTournaments';

const Profile: React.FC = () => {
  const { user, token, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<number[]>([]);
  const [tournamentParticipants, setTournamentParticipants] = useState<{[key: number]: number}>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournamentLoading, setTournamentLoading] = useState<number | null>(null);
  const [simStats, setSimStats] = useState<SimStats | null>(null);
  const [combinedStats, setCombinedStats] = useState<SimStats | null>(null);
  const [statsTab, setStatsTab] = useState<'overview' | 'sim'>('overview');
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
        
        const [profileResponse, matchesResponse, tournamentsResponse, simStatsResponse, combinedStatsResponse] = await Promise.all([
          getUserProfile(user.member_id),
          getMatches(),
          getTournaments(),
          getUserSimStats(user.member_id),
          getUserCombinedStats(user.member_id)
        ]);
        
        console.log('Sim stats response:', simStatsResponse.data);
        console.log('Combined stats response:', combinedStatsResponse.data);
        
        // Check for handicap changes before updating state
        const oldSimHandicap = user?.sim_handicap || 0;
        const oldGrassHandicap = user?.grass_handicap || 0;
        
        setProfile(profileResponse.data);
        setMatches(matchesResponse.data);
        setTournaments(tournamentsResponse.data);
        setSimStats(simStatsResponse.data);
        setCombinedStats(combinedStatsResponse.data);
        
        // After updating stats, we need to refresh the user data to get updated handicaps
        // This will be handled by the parent component or context
        
        // Fetch user's tournament registrations
        const userTournamentIds: number[] = [];
        const participantCounts: {[key: number]: number} = {};
        
        for (const tournament of tournamentsResponse.data) {
          try {
            const participantsResponse = await getTournamentParticipants(tournament.id);
            const isRegistered = participantsResponse.data.some((participant: any) => 
              participant.member_id === user.member_id
            );
            if (isRegistered) {
              userTournamentIds.push(tournament.id);
            }
            participantCounts[tournament.id] = participantsResponse.data.length;
          } catch (err) {
            console.error(`Error checking registration for tournament ${tournament.id}:`, err);
            participantCounts[tournament.id] = 0;
          }
        }
        setUserTournaments(userTournamentIds);
        setTournamentParticipants(participantCounts);
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
      sim_handicap: user?.sim_handicap || 0,
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
      setTournamentLoading(tournamentId);
      await registerUserForTournament(tournamentId, user.member_id);
      setUserTournaments([...userTournaments, tournamentId]);
      setError(null);
      
      // Show success message
      alert('Successfully registered for tournament!');
      
      // Refresh tournament data and participant counts
      const tournamentsResponse = await getTournaments();
      setTournaments(tournamentsResponse.data);
      
      // Update participant count for this tournament
      try {
        const participantsResponse = await getTournamentParticipants(tournamentId);
        setTournamentParticipants(prev => ({
          ...prev,
          [tournamentId]: participantsResponse.data.length
        }));
      } catch (err) {
        console.error('Error updating participant count:', err);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to register for tournament';
      setError(errorMessage);
      console.error('Error registering for tournament:', err);
    } finally {
      setTournamentLoading(null);
    }
  };

  const handleTournamentUnregister = async (tournamentId: number) => {
    if (!user?.member_id) return;

    try {
      setTournamentLoading(tournamentId);
      await unregisterUserFromTournament(tournamentId, user.member_id);
      setUserTournaments(userTournaments.filter(id => id !== tournamentId));
      setError(null);
      
      // Show success message
      alert('Successfully unregistered from tournament!');
      
      // Refresh tournament data and participant counts
      const tournamentsResponse = await getTournaments();
      setTournaments(tournamentsResponse.data);
      
      // Update participant count for this tournament
      try {
        const participantsResponse = await getTournamentParticipants(tournamentId);
        setTournamentParticipants(prev => ({
          ...prev,
          [tournamentId]: participantsResponse.data.length
        }));
      } catch (err) {
        console.error('Error updating participant count:', err);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to unregister from tournament';
      setError(errorMessage);
      console.error('Error unregistering from tournament:', err);
    } finally {
      setTournamentLoading(null);
    }
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
        final_score: scoreCardData.finalScore || scoreCardData.final_score || scoreCardData.totalStrokes || 0,
        round_type: roundType || 'sim',
        course_name: selectedCourse?.name || scoreCardData.course_name || '',
        teebox: selectedCourse?.teeboxData?.teebox || scoreCardData.teebox || null,
        course_rating: selectedCourse?.teeboxData?.courseRating || scoreCardData.course_rating || null,
        course_slope: selectedCourse?.teeboxData?.courseSlope || scoreCardData.course_slope || null
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

  const isRegisteredForTournament = (tournamentId: number) => {
    return userTournaments.includes(tournamentId);
  };

  const getTournamentStatus = (tournament: Tournament) => {
    // Use the status field from the database if available
    if (tournament.status) {
      return tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1);
    }
    
    // Fallback to date-based logic for backward compatibility
    if (!tournament.start_date) return 'No date set';
    
    const startDate = new Date(tournament.start_date);
    const endDate = tournament.end_date ? new Date(tournament.end_date) : null;
    const now = new Date();
    
    if (endDate && endDate < now) {
      return 'Completed';
    } else if (startDate > now) {
      const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`;
    } else {
      return 'In Progress';
    }
  };

  const isTournamentAvailable = (tournament: Tournament) => {
    // Check if tournament status allows registration
    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return false;
    }
    
    // Check if registration is open
    if (tournament.registration_open === false) {
      return false;
    }
    
    // Check registration deadline
    if (tournament.registration_deadline) {
      const deadline = new Date(tournament.registration_deadline);
      const now = new Date();
      if (deadline < now) {
        return false;
      }
    }
    
    // Check participant limits
    if (tournament.max_participants) {
      const currentParticipants = tournamentParticipants[tournament.id] || 0;
      if (currentParticipants >= tournament.max_participants) {
        return false;
      }
    }
    
    // Allow registration for draft, open, and active tournaments
    return true;
  };

  const isTournamentActive = (tournament: Tournament) => {
    // Tournament is active if status is 'active' and currently running
    if (tournament.status !== 'active') {
      return false;
    }
    
    if (!tournament.start_date) return false;
    
    const startDate = new Date(tournament.start_date);
    const endDate = tournament.end_date ? new Date(tournament.end_date) : null;
    const now = new Date();
    
    // Tournament is active if it's currently running
    return startDate <= now && (!endDate || endDate >= now);
  };

  // Filter tournaments to show only available ones
  const availableTournaments = tournaments.filter(tournament => 
    isTournamentAvailable(tournament) && !isRegisteredForTournament(tournament.id)
  );

  // Get user's registered tournaments (including completed ones)
  const userRegisteredTournaments = tournaments.filter(tournament => 
    isRegisteredForTournament(tournament.id)
  );



  // Debug function to create a test tournament
  const createTestTournament = async () => {
    try {
      const testTournament = {
        name: 'Test Tournament ' + new Date().toLocaleTimeString(),
        description: 'This is a test tournament',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        end_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 days from now
        registration_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 days from now
        max_participants: 20,
        min_participants: 4,
        tournament_format: 'match_play',
        status: 'draft',
        registration_open: true,
        entry_fee: 25,
        location: 'Test Golf Club',
        course: 'Championship Course',
        rules: 'Standard match play rules apply',
        notes: 'Test tournament for debugging',
        type: 'tournament'
      };
      
      const result = await createTournament(testTournament);
      console.log('Test tournament created:', result.data);
      
      // Refresh tournaments
      const tournamentsResponse = await getTournaments();
      setTournaments(tournamentsResponse.data);
      console.log('Tournaments after creating test:', tournamentsResponse.data);
      
      alert('Test tournament created! Check console for details.');
    } catch (error) {
      console.error('Error creating test tournament:', error);
      alert('Error creating test tournament: ' + error);
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
    <div className="max-w-6xl mx-auto">
      {/* Golf Passport Header */}
      <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-2xl shadow-xl p-6 mb-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-6 mb-6 lg:mb-0">
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-20 h-20 flex items-center justify-center">
                {user?.profile_photo_url ? (
                  <img 
                    src={user.profile_photo_url} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-white" />
                )}
              </div>
              {isEditing && (
                <button
                  onClick={triggerPhotoUpload}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 bg-brand-neon-green text-brand-black rounded-full p-2 hover:bg-green-400 transition-colors disabled:opacity-50"
                  title="Upload profile photo"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black"></div>
                  ) : (
                    <Camera className="w-4 h-4" />
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
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl lg:text-4xl font-bold">
                  {user?.first_name} {user?.last_name}
                </h1>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium">
                  {user?.role?.toLowerCase() === 'admin' ? 'Admin' : 'Member'}
                </div>
              </div>
              <div className="flex items-center space-x-4 text-white/90">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {user?.club || 'No club specified'}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleTrackRound}
                  className="flex items-center justify-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
                >
                  <Circle className="w-5 h-5 mr-2" />
                  Track Round
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center px-6 py-3 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center justify-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors font-medium disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-center px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Handicap Information in Hero */}
        {user?.sim_handicap !== null && user?.sim_handicap !== undefined && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 flex items-center space-x-3">
                <div className="bg-blue-500/20 rounded-full p-1">
                  <TrendingUp className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">NN Handicap</span>
                  <span className="text-lg font-bold text-blue-300 ml-2">
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
                <div className="text-xs text-white/60 ml-2">
                  App Tracked
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Form - Inline in hero when editing */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t border-white/20">
            {error && (
              <div className="bg-red-500/20 border border-red-400/50 text-white px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50"
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50"
                  placeholder="Last Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50"
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
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
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
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
                      <Calendar className="w-5 h-5 text-green-600 mr-2" />
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

      {/* Tournament Section - Only visible to admins */}
      {user?.role?.toLowerCase() === 'admin' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* User's Registered Tournaments */}
            {userRegisteredTournaments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
                  <Trophy className="w-6 h-6 mr-3" />
                  My Tournaments
                </h2>
                <div className="space-y-4">
                  {userRegisteredTournaments.slice(0, 3).map((tournament) => {
                    const status = getTournamentStatus(tournament);
                    const isActive = isTournamentActive(tournament);
                    const isAvailable = isTournamentAvailable(tournament);
                    
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
                                status === 'Active' ? 'bg-green-100 text-green-600' :
                                status === 'Draft' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {status}
                              </span>
                            </div>
                          </div>
                          <div className="sm:ml-4">
                            {isAvailable ? (
                              <button
                                onClick={() => handleTournamentUnregister(tournament.id)}
                                disabled={tournamentLoading === tournament.id}
                                className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {tournamentLoading === tournament.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Minus className="w-4 h-4 mr-1" />
                                    Unregister
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-500 px-3 py-2">
                                {status === 'Completed' ? 'Completed' : 'Registered'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Tournaments */}
            {availableTournaments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
                  <Award className="w-6 h-6 mr-3" />
                  Available Tournaments
                </h2>
                <div className="space-y-4">
                  {availableTournaments.slice(0, 3).map((tournament) => {
                    const status = getTournamentStatus(tournament);
                    const isActive = isTournamentActive(tournament);
                    
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
                                status === 'Active' ? 'bg-green-100 text-green-600' :
                                status === 'Draft' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {status}
                              </span>
                            </div>
                          </div>
                          <div className="sm:ml-4">
                            <button
                              onClick={() => handleTournamentSignup(tournament.id)}
                              disabled={tournamentLoading === tournament.id}
                              className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {tournamentLoading === tournament.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-1"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Sign Up
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* No Available Tournaments Message */}
          {tournaments.length > 0 && availableTournaments.length === 0 && userRegisteredTournaments.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
                <Award className="w-6 h-6 mr-3" />
                Tournaments
              </h2>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-2">No tournaments are currently available for registration.</p>
                <p className="text-sm text-gray-500">All tournaments are either completed or you're already registered for them.</p>
              </div>
            </div>
          )}

          {/* My Tournaments Management Section */}
          <ProfileTournaments />
        </>
      )}

      {/* Admin Section - Only visible to admins */}
      {user?.role?.toLowerCase() === 'admin' && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
            <Settings className="w-6 h-6 mr-3" />
            Admin Panel
          </h2>
          <p className="text-sm text-gray-600 mb-6">Administrative tools and tournament management.</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center justify-center px-8 py-4 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium text-lg"
            >
              <Settings className="w-6 h-6 mr-3" />
              Tournament Management
            </button>
          </div>
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