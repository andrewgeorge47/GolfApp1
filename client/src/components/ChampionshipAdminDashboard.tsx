import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Settings, 
  Play, 
  Crown, 
  BarChart3, 
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Move,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useUserCourse } from '../hooks/useUserCourse';
import { useAuth } from '../AuthContext';

interface ChampionshipAdminDashboardProps {
  tournamentId: number;
  tournamentName: string;
  tournamentParticipants: any[];
  tournamentMatches: any[];
  tournamentCourse?: string;
  tournamentCourseId?: number;
  tournament?: any; // Add tournament object for course assignment
  onDataRefresh: () => void;
}

interface ClubGroup {
  id: number;
  group_name: string;
  participating_clubs: string[];
  participant_count: number;
  min_participants: number;
  user_ids: number[];
}

interface ClubParticipant {
  club: string;
  participant_count: number;
  participants: any[];
}

interface Match {
  id: number;
  club_group: string;
  player1_id: number;
  player2_id: number;
  match_number: number;
  match_status: string;
  player1_name?: string;
  player2_name?: string;
  winner_id?: number;
  player1_score?: number;
  player2_score?: number;
  // Match play fields
  player1_hole_scores?: string;
  player2_hole_scores?: string;
  player1_net_hole_scores?: string;
  player2_net_hole_scores?: string;
  player1_holes_won?: number;
  player2_holes_won?: number;
  player1_holes_lost?: number;
  player2_holes_lost?: number;
  player1_net_holes?: number;
  player2_net_holes?: number;
  course_id?: number;
  teebox?: string;
  // Scorecard photo fields
  player1_scorecard_photo_url?: string;
  player2_scorecard_photo_url?: string;
}

interface MatchResult {
  player1_score: number;
  player2_score: number;
  winner_id: number;
}

const ChampionshipAdminDashboard: React.FC<ChampionshipAdminDashboardProps> = ({
  tournamentId,
  tournamentName,
  tournamentParticipants,
  tournamentMatches,
  tournamentCourse,
  tournamentCourseId,
  tournament,
  onDataRefresh
}) => {
  const [clubGroups, setClubGroups] = useState<ClubGroup[]>([]);
  const [clubParticipants, setClubParticipants] = useState<ClubParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'matches' | 'scoring' | 'standings'>('overview');
  
  // Manual editing states
  const [editingGroup, setEditingGroup] = useState<ClubGroup | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  
  // Match management states
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);
  const [newMatchGroupId, setNewMatchGroupId] = useState<number | null>(null);
  const [newMatchPlayer1Id, setNewMatchPlayer1Id] = useState<number | null>(null);
  const [newMatchPlayer2Id, setNewMatchPlayer2Id] = useState<number | null>(null);
  const [showEditMatchModal, setShowEditMatchModal] = useState(false);
  
  // Scoring states
  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  
  // Match play scoring states
  const [player1HoleScores, setPlayer1HoleScores] = useState<number[]>(new Array(18).fill(0));
  const [player2HoleScores, setPlayer2HoleScores] = useState<number[]>(new Array(18).fill(0));
  const [player1NetScores, setPlayer1NetScores] = useState<number[]>(new Array(18).fill(0));
  const [player2NetScores, setPlayer2NetScores] = useState<number[]>(new Array(18).fill(0));
  const [player1Handicap, setPlayer1Handicap] = useState<number>(0);
  const [player2Handicap, setPlayer2Handicap] = useState<number>(0);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedTeebox, setSelectedTeebox] = useState<string>('');
  const [holeIndexes, setHoleIndexes] = useState<number[]>([]);
  const [courseParValues, setCourseParValues] = useState<number[]>([]);
  const [showMatchPlayScoring, setShowMatchPlayScoring] = useState(false);
  
  // Current match course assignment
  const [currentMatchCourse, setCurrentMatchCourse] = useState<{
    courseId: number | null;
    courseName: string | null;
    platform: string;
    reason: string;
  } | null>(null);
  
  // Scorecard photo modal states
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [selectedScorecardUrl, setSelectedScorecardUrl] = useState<string>('');
  const [selectedScorecardPlayer, setSelectedScorecardPlayer] = useState<string>('');

  // Get user's appropriate course based on their club (for reference only)
  const { courseData: userCourseData, loading: userCourseLoading, courseId: userCourseId } = useUserCourse(tournamentId, tournament);

  // Function to determine course based on players' clubs
  const getCourseForPlayers = (player1Id: number, player2Id: number) => {
    const player1 = tournamentParticipants.find(p => p.user_member_id === player1Id);
    const player2 = tournamentParticipants.find(p => p.user_member_id === player2Id);
    
    // If either player is from Club No. 8, use Trackman course
    if (player1?.club === 'No. 8' || player2?.club === 'No. 8') {
      return {
        courseId: tournament?.trackman_course_id,
        courseName: tournament?.trackman_course,
        platform: 'trackman',
        reason: 'One or both players are from Club No. 8 (Trackman)'
      };
    }
    
    // Otherwise use GSPro course
    return {
      courseId: tournament?.gspro_course_id,
      courseName: tournament?.gspro_course,
      platform: 'gspro',
      reason: 'Both players are from other clubs (GSPro)'
    };
  };

  useEffect(() => {
    console.log('ChampionshipAdminDashboard mounted with:', {
      tournamentId,
      tournamentCourse,
      tournamentCourseId,
      tournamentParticipants: tournamentParticipants?.length,
      userCourseId,
      userCourseLoading
    });
    loadDashboardData();
  }, [tournamentId, tournamentParticipants, tournamentMatches, userCourseId, userCourseLoading]);



  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use passed participants data to calculate club participants
      const clubParticipantMap = new Map<string, any[]>();
      tournamentParticipants.forEach(participant => {
        if (participant.club) {
          if (!clubParticipantMap.has(participant.club)) {
            clubParticipantMap.set(participant.club, []);
          }
          clubParticipantMap.get(participant.club)!.push(participant);
        }
      });
      
      const clubParticipantsData = Array.from(clubParticipantMap.entries()).map(([club, participants]) => ({
        club,
        participant_count: participants.length,
        participants: participants.map(p => ({
          user_id: p.user_member_id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email_address
        }))
      }));
      
      setClubParticipants(clubParticipantsData);
      
      // Load club groups
      try {
        const groupsResponse = await api.get(`/tournaments/${tournamentId}/club-groups`);
        setClubGroups(groupsResponse.data);
      } catch (error) {
        console.error('Error loading club groups:', error);
      }
      
      // Load championship-specific matches
      try {
        const matchesResponse = await api.get(`/tournaments/${tournamentId}/championship-matches`);
        setMatches(matchesResponse.data);
      } catch (error) {
        console.error('Error loading championship matches:', error);
        setMatches(tournamentMatches);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Get participants not already assigned to groups
  const getAvailableParticipants = () => {
    const assignedUserIds = clubGroups.flatMap(group => group.user_ids || []);
    return tournamentParticipants.filter(participant => 
      !assignedUserIds.includes(participant.user_member_id)
    );
  };

  // Get participants not already assigned to other groups (for editing)
  const getAvailableParticipantsForEdit = (currentGroupId: number) => {
    const assignedUserIds = clubGroups
      .filter(group => group.id !== currentGroupId)
      .flatMap(group => group.user_ids || []);
    return tournamentParticipants.filter(participant => 
      !assignedUserIds.includes(participant.user_member_id)
    );
  };

  // Manual Group Management
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedParticipants.length === 0) {
      toast.error('Please provide a group name and select participants');
      return;
    }

    try {
      const response = await api.post(`/tournaments/${tournamentId}/create-club-group`, {
        groupName: newGroupName,
        participantIds: selectedParticipants
      });

      toast.success('Group created successfully');
      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedParticipants([]);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleEditGroup = (group: ClubGroup) => {
    setEditingGroup(group);
    setSelectedParticipants(group.user_ids);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || selectedParticipants.length === 0) {
      toast.error('Please select participants');
      return;
    }

    if (!editingGroup.group_name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      const response = await api.put(`/tournaments/${tournamentId}/club-groups/${editingGroup.id}`, {
        groupName: editingGroup.group_name,
        participantIds: selectedParticipants
      });

      toast.success('Group updated successfully');
      setEditingGroup(null);
      setSelectedParticipants([]);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Are you sure you want to delete this group? This will also delete all associated matches.')) {
      return;
    }

    try {
      await api.delete(`/tournaments/${tournamentId}/club-groups/${groupId}`);
      toast.success('Group deleted successfully');
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  // Manual Match Management

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setNewMatchPlayer1Id(match.player1_id);
    setNewMatchPlayer2Id(match.player2_id);
    setShowEditMatchModal(true);
  };

  const handleUpdateMatch = async () => {
    if (!editingMatch || !newMatchPlayer1Id || !newMatchPlayer2Id) {
      toast.error('Please select both players');
      return;
    }

    try {
      const response = await api.put(`/tournaments/${tournamentId}/championship-matches/${editingMatch.id}`, {
        player1Id: newMatchPlayer1Id,
        player2Id: newMatchPlayer2Id
      });

      toast.success('Match updated successfully');
      setShowEditMatchModal(false);
      setEditingMatch(null);
      setNewMatchPlayer1Id(null);
      setNewMatchPlayer2Id(null);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match');
    }
  };

  const handleCreateNewMatch = async () => {
    if (!newMatchGroupId || !newMatchPlayer1Id || !newMatchPlayer2Id) {
      toast.error('Please select a group and both players');
      return;
    }

    if (newMatchPlayer1Id === newMatchPlayer2Id) {
      toast.error('Players must be different');
      return;
    }

    try {
      const response = await api.post(`/tournaments/${tournamentId}/create-match`, {
        groupId: newMatchGroupId,
        player1Id: newMatchPlayer1Id,
        player2Id: newMatchPlayer2Id
      });

      toast.success('Match created successfully');
      setShowCreateMatch(false);
      setNewMatchGroupId(null);
      setNewMatchPlayer1Id(null);
      setNewMatchPlayer2Id(null);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Failed to create match');
    }
  };

  const handleSelectMatch = (matchId: number) => {
    setSelectedMatches(prev => 
      prev.includes(matchId) 
        ? prev.filter(id => id !== matchId)
        : [...prev, matchId]
    );
  };

  const handleSelectAllMatches = () => {
    if (selectedMatches.length === matches.length) {
      setSelectedMatches([]);
    } else {
      setSelectedMatches(matches.map(match => match.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMatches.length === 0) {
      toast.error('No matches selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedMatches.length} selected matches?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedMatches.map(matchId => 
          api.delete(`/tournaments/${tournamentId}/matches/${matchId}`)
        )
      );
      
      toast.success(`${selectedMatches.length} matches deleted successfully`);
      setSelectedMatches([]);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error deleting matches:', error);
      toast.error('Failed to delete some matches');
    }
  };

  const handleUpdateMatchResult = async (matchId: number, result: MatchResult) => {
    try {
      const response = await api.put(`/tournaments/${tournamentId}/matches/${matchId}/result`, result);
      toast.success('Match result updated successfully');
      setEditingMatch(null);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error updating match result:', error);
      toast.error('Failed to update match result');
    }
  };

  // Scoring functions
  const handleOpenScoring = (match: Match) => {
    setScoringMatch(match);
    setPlayer1Score(match.player1_score || 0);
    setPlayer2Score(match.player2_score || 0);
    setWinnerId(match.winner_id || null);
    setShowScoringModal(true);
  };

  const handleSubmitScore = async () => {
    if (!scoringMatch) return;

    // Determine winner based on scores
    let determinedWinner = winnerId;
    if (!determinedWinner) {
      if (player1Score > player2Score) {
        determinedWinner = scoringMatch.player1_id;
      } else if (player2Score > player1Score) {
        determinedWinner = scoringMatch.player2_id;
      }
      // If scores are equal, winner remains null (tie)
    }

    try {
      await handleUpdateMatchResult(scoringMatch.id, {
        player1_score: player1Score,
        player2_score: player2Score,
        winner_id: determinedWinner || 0
      });
      
      setShowScoringModal(false);
      setScoringMatch(null);
      setPlayer1Score(0);
      setPlayer2Score(0);
      setWinnerId(null);
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score');
    }
  };

  const handleCloseScoring = () => {
    setShowScoringModal(false);
    setScoringMatch(null);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setWinnerId(null);
  };

  // Match play scoring functions

  const handleOpenMatchPlayScoring = async (match: Match) => {
    console.log('Opening match play scoring for match:', match);
    setScoringMatch(match);
    
    // Load player handicaps
    const player1 = tournamentParticipants.find(p => p.user_member_id === match.player1_id);
    const player2 = tournamentParticipants.find(p => p.user_member_id === match.player2_id);
    
    if (player1) {
      const handicap = Number(player1.sim_handicap || player1.handicap || 0);
      console.log('Player 1 handicap:', handicap, 'from fields:', { sim_handicap: player1.sim_handicap, handicap: player1.handicap });
      setPlayer1Handicap(handicap);
    }
    if (player2) {
      const handicap = Number(player2.sim_handicap || player2.handicap || 0);
      console.log('Player 2 handicap:', handicap, 'from fields:', { sim_handicap: player2.sim_handicap, handicap: player2.handicap });
      setPlayer2Handicap(handicap);
    }
    
    // Determine course based on players' clubs
    const matchCourse = getCourseForPlayers(match.player1_id, match.player2_id);
    setCurrentMatchCourse(matchCourse);
    
    console.log('Match course assignment:', matchCourse);
    console.log('Player 1 club:', player1?.club, 'Player 2 club:', player2?.club);
    
    // Load course data based on players' clubs
    const effectiveCourseId = matchCourse.courseId || tournamentCourseId;
    
    if (effectiveCourseId) {
      console.log('Loading course data for ID:', effectiveCourseId, 'matchCourseId:', matchCourse.courseId, 'tournamentCourseId:', tournamentCourseId);
      try {
        const response = await api.get(`/simulator-courses?id=${effectiveCourseId}`);
        const courses = response.data.courses || response.data;
        const course = Array.isArray(courses) ? courses[0] : courses;
        
        if (course && course.id) {
          console.log('Loaded course:', course.name, 'for platform:', matchCourse.platform);
          setSelectedCourse(effectiveCourseId);
          
          // Load hole indexes
          if (course.hole_indexes) {
            try {
              let indexes;
              if (Array.isArray(course.hole_indexes)) {
                indexes = course.hole_indexes;
              } else {
                indexes = JSON.parse(course.hole_indexes);
              }
              setHoleIndexes(indexes);
              console.log('Loaded hole indexes:', indexes);
            } catch (e) {
              console.error('Error parsing hole indexes:', e);
              setHoleIndexes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
            }
          } else {
            console.log('No hole indexes found, using default');
            setHoleIndexes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
          }
          
          // Load par values
          if (course.par_values) {
            try {
              // Check if par_values is already an array or needs parsing
              const parValues = Array.isArray(course.par_values) ? course.par_values : JSON.parse(course.par_values);
              setCourseParValues(parValues);
              console.log('Set par values:', parValues);
            } catch (e) {
              console.error('Error parsing par values:', e);
              console.log('Using default par values');
              setCourseParValues(new Array(18).fill(4));
            }
          } else {
            console.log('No par values found, using default');
            setCourseParValues(new Array(18).fill(4));
          }
        } else {
          console.error('Course not found. Response:', response.data);
          toast.error(`Course (ID: ${effectiveCourseId}) not found`);
        }
      } catch (error) {
        console.error('Error loading course:', error);
        toast.error('Failed to load course data');
      }
    } else {
      console.log('No tournament course ID available');
      toast.error('No tournament course selected');
    }
    
    // Initialize hole scores with existing data if available
    const parseHoleScores = (scoreData: any): number[] => {
      if (!scoreData) {
        return new Array(18).fill(0);
      }
      
      try {
        // If it's already an array, return it
        if (Array.isArray(scoreData)) {
          return scoreData.length === 18 ? scoreData : new Array(18).fill(0);
        }
        
        // If it's a string, try to parse it
        if (typeof scoreData === 'string') {
          // Clean the string - remove any extra characters
          const cleaned = scoreData.trim();
          
          // If it looks like an array string, try to parse it
          if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            const parsed = JSON.parse(cleaned);
            return Array.isArray(parsed) && parsed.length === 18 ? parsed : new Array(18).fill(0);
          }
          
          // If it's a comma-separated string, split and convert to numbers
          if (cleaned.includes(',')) {
            const scores = cleaned.split(',').map(s => parseInt(s.trim()) || 0);
            return scores.length === 18 ? scores : new Array(18).fill(0);
          }
        }
        
        return new Array(18).fill(0);
      } catch (e) {
        console.error('Error parsing hole scores:', e, 'Raw data:', scoreData);
        return new Array(18).fill(0);
      }
    };
    
    console.log('Loading existing scores - player1_hole_scores:', match.player1_hole_scores);
    console.log('Loading existing scores - player2_hole_scores:', match.player2_hole_scores);
    console.log('Loading existing scores - player1_net_hole_scores:', match.player1_net_hole_scores);
    console.log('Loading existing scores - player2_net_hole_scores:', match.player2_net_hole_scores);
    
    const player1Scores = parseHoleScores(match.player1_hole_scores);
    const player2Scores = parseHoleScores(match.player2_hole_scores);
    const player1NetScores = parseHoleScores(match.player1_net_hole_scores);
    const player2NetScores = parseHoleScores(match.player2_net_hole_scores);
    
    console.log('Parsed player1 scores:', player1Scores);
    console.log('Parsed player2 scores:', player2Scores);
    console.log('Parsed player1 net scores:', player1NetScores);
    console.log('Parsed player2 net scores:', player2NetScores);
    
    setPlayer1HoleScores(player1Scores);
    setPlayer2HoleScores(player2Scores);
    setPlayer1NetScores(player1NetScores);
    setPlayer2NetScores(player2NetScores);
    
    setShowMatchPlayScoring(true);
  };


  const calculateNetScore = (grossScore: number, handicap: number, holeIndex: number, opponentHandicap: number = 0): number => {
    // Use hole number (1-18) if holeIndex is invalid
    const actualHoleIndex = holeIndex > 0 ? holeIndex : 1;
    
    // Calculate the handicap differential (max 8 strokes)
    const rawDifferential = Math.abs(handicap - opponentHandicap);
    const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
    
    // Determine who gets the strokes (higher handicap player)
    // Higher handicap = more strokes needed = worse player
    const higherHandicap = Math.max(handicap, opponentHandicap);
    const isHigherHandicapPlayer = handicap === higherHandicap;
    
    // Debug logging for stroke calculation
    console.log('Admin calculateNetScore debug:', {
      grossScore,
      handicap,
      opponentHandicap,
      holeIndex,
      actualHoleIndex,
      rawDifferential,
      handicapDifferential,
      higherHandicap,
      isHigherHandicapPlayer
    });
    
    // If this player is the higher handicap player, they get strokes
    if (isHigherHandicapPlayer) {
      // Calculate strokes for the higher handicap player (capped at 8)
      const handicapStrokes = Math.floor(handicapDifferential / 18) + (handicapDifferential % 18 >= actualHoleIndex ? 1 : 0);
      const netScore = Math.max(1, grossScore - handicapStrokes);
      console.log(`Higher handicap player gets ${handicapStrokes} strokes on hole ${actualHoleIndex}: ${grossScore} -> ${netScore}`);
      return netScore;
    } else {
      // This player is the lower handicap player (better player)
      // They don't get strokes, but their opponent does
      console.log(`Lower handicap player gets no strokes on hole ${actualHoleIndex}: ${grossScore}`);
      return grossScore;
    }
  };

  const calculateMatchResult = () => {
    let player1HolesWon = 0;
    let player2HolesWon = 0;
    
    for (let i = 0; i < 18; i++) {
      const p1Gross = player1HoleScores[i];
      const p2Gross = player2HoleScores[i];
      
      if (p1Gross === 0 || p2Gross === 0) continue; // Skip holes with no scores
      
      const p1Net = calculateNetScore(p1Gross, player1Handicap, holeIndexes[i] || 0, player2Handicap);
      const p2Net = calculateNetScore(p2Gross, player2Handicap, holeIndexes[i] || 0, player1Handicap);
      
      if (p1Net < p2Net) {
        player1HolesWon++;
      } else if (p2Net < p1Net) {
        player2HolesWon++;
      }
      // If equal, hole is halved
    }
    
    const netHoles = player1HolesWon - player2HolesWon;
    let winner = null;
    if (netHoles > 0) {
      winner = scoringMatch?.player1_id;
    } else if (netHoles < 0) {
      winner = scoringMatch?.player2_id;
    }
    
    return {
      player1HolesWon,
      player2HolesWon,
      player1HolesLost: player2HolesWon,
      player2HolesLost: player1HolesWon,
      player1NetHoles: netHoles,
      player2NetHoles: -netHoles,
      winner
    };
  };

  const handleSubmitMatchPlayScore = async () => {
    if (!scoringMatch || !selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    const matchResult = calculateMatchResult();
    
    try {
      const response = await api.put(`/tournaments/${tournamentId}/championship-matches/${scoringMatch.id}/result`, {
        player1_hole_scores: JSON.stringify(player1HoleScores),
        player2_hole_scores: JSON.stringify(player2HoleScores),
        player1_net_hole_scores: JSON.stringify(player1NetScores),
        player2_net_hole_scores: JSON.stringify(player2NetScores),
        player1_holes_won: matchResult.player1HolesWon,
        player2_holes_won: matchResult.player2HolesWon,
        player1_holes_lost: matchResult.player1HolesLost,
        player2_holes_lost: matchResult.player2HolesLost,
        player1_net_holes: matchResult.player1NetHoles,
        player2_net_holes: matchResult.player2NetHoles,
        winner_id: matchResult.winner,
        course_id: selectedCourse,
        teebox: selectedTeebox,
        match_status: 'completed'
      });
      
      toast.success('Match play score submitted successfully');
      setShowMatchPlayScoring(false);
      setScoringMatch(null);
      setPlayer1HoleScores(new Array(18).fill(0));
      setPlayer2HoleScores(new Array(18).fill(0));
      setPlayer1Handicap(0);
      setPlayer2Handicap(0);
      setSelectedCourse(null);
      setSelectedTeebox('');
      setHoleIndexes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error submitting match play score:', error);
      toast.error('Failed to submit match play score');
    }
  };

  const handleCloseMatchPlayScoring = () => {
    setShowMatchPlayScoring(false);
    setScoringMatch(null);
    setPlayer1HoleScores(new Array(18).fill(0));
    setPlayer2HoleScores(new Array(18).fill(0));
    setPlayer1Handicap(0);
    setPlayer2Handicap(0);
    setSelectedCourse(null);
    setSelectedTeebox('');
    setHoleIndexes([]);
  };

  const handleOpenScorecard = (photoUrl: string, playerName: string) => {
    setSelectedScorecardUrl(photoUrl);
    setSelectedScorecardPlayer(playerName);
    setShowScorecardModal(true);
  };

  const handleCloseScorecard = () => {
    setShowScorecardModal(false);
    setSelectedScorecardUrl('');
    setSelectedScorecardPlayer('');
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }

    try {
      await api.delete(`/tournaments/${tournamentId}/matches/${matchId}`);
      toast.success('Match deleted successfully');
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  // Auto functions
  const handleAutoGroup = async () => {
    try {
      const response = await api.post(`/tournaments/${tournamentId}/auto-group-clubs`, {
        minParticipants: 4
      });

      toast.success(response.data.message);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error auto-grouping clubs:', error);
      toast.error('Failed to auto-group clubs');
    }
  };

  const handleGenerateMatches = async () => {
    try {
      const response = await api.post(`/tournaments/${tournamentId}/generate-championship-matches`);
      toast.success(response.data.message);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error generating matches:', error);
      toast.error('Failed to generate matches');
    }
  };

  const handleDetermineChampions = async () => {
    try {
      const response = await api.post(`/tournaments/${tournamentId}/determine-champions`);
      toast.success(response.data.message);
      loadDashboardData();
      onDataRefresh();
    } catch (error) {
      console.error('Error determining champions:', error);
      toast.error('Failed to determine champions');
    }
  };

  const calculateTiebreakerPoints = (wins: number, losses: number, ties: number, holesWon: number, holesLost: number) => {
    // Use simple sum of holes won (consistent with server-side implementation)
    return holesWon;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading championship data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
              {tournamentName} - Championship Management
            </h2>
            <p className="text-gray-600 mt-1">Manage club groups, matches, and determine champions</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'groups', label: 'Groups', icon: Users },
              { id: 'matches', label: 'Matches', icon: Play },
              { id: 'scoring', label: 'Scoring', icon: CheckCircle },
              { id: 'standings', label: 'Standings', icon: Trophy }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600">Total Participants</p>
                      <p className="text-2xl font-bold text-blue-900">{tournamentParticipants.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Trophy className="w-8 h-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600">Club Groups</p>
                      <p className="text-2xl font-bold text-green-900">{clubGroups.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <Play className="w-8 h-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-purple-600">Total Matches</p>
                      <p className="text-2xl font-bold text-purple-900">{matches.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={handleAutoGroup}
                    className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Auto-Group Clubs
                  </button>
                  <button
                    onClick={handleGenerateMatches}
                    className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Generate Matches
                  </button>
                  <button
                    onClick={handleDetermineChampions}
                    className="flex items-center justify-center px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Determine Champions
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Club Groups</h3>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </button>
              </div>

              {/* Create Group Modal */}
              {showCreateGroup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h4 className="text-lg font-semibold mb-4">Create New Group</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter group name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Participants</label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {getAvailableParticipants().length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                              <p>All participants have been assigned to groups</p>
                            </div>
                          ) : (
                            getAvailableParticipants().map(participant => (
                              <label key={participant.user_member_id} className="flex items-center p-2 hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={selectedParticipants.includes(participant.user_member_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedParticipants([...selectedParticipants, participant.user_member_id]);
                                    } else {
                                      setSelectedParticipants(selectedParticipants.filter(id => id !== participant.user_member_id));
                                    }
                                  }}
                                  className="mr-3"
                                />
                                <span className="text-sm">{participant.first_name} {participant.last_name} ({participant.club})</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            setShowCreateGroup(false);
                            setNewGroupName('');
                            setSelectedParticipants([]);
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateGroup}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Create Group
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Group Modal */}
              {editingGroup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h4 className="text-lg font-semibold mb-4">Edit Group: {editingGroup.group_name}</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                        <input
                          type="text"
                          value={editingGroup.group_name}
                          onChange={(e) => setEditingGroup({...editingGroup, group_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter group name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Participants</label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {(() => {
                            const availableParticipants = getAvailableParticipantsForEdit(editingGroup.id);
                            const currentGroupParticipants = tournamentParticipants.filter(p => 
                              editingGroup.user_ids?.includes(p.user_member_id)
                            );
                            
                            // Create a map to avoid duplicates - combine current group participants with available participants
                            const participantMap = new Map();
                            
                            // Add current group participants first
                            currentGroupParticipants.forEach(participant => {
                              participantMap.set(participant.user_member_id, {
                                ...participant,
                                isCurrentlyInGroup: true,
                                isAvailable: true
                              });
                            });
                            
                            // Add available participants (this won't duplicate current group participants)
                            availableParticipants.forEach(participant => {
                              if (!participantMap.has(participant.user_member_id)) {
                                participantMap.set(participant.user_member_id, {
                                  ...participant,
                                  isCurrentlyInGroup: false,
                                  isAvailable: true
                                });
                              }
                            });
                            
                            const allParticipants = Array.from(participantMap.values());
                            
                            return allParticipants.length === 0 ? (
                              <div className="text-center py-4 text-gray-500">
                                <p>No participants available</p>
                              </div>
                            ) : (
                              allParticipants.map(participant => {
                                return (
                                  <label key={participant.user_member_id} className={`flex items-center p-2 hover:bg-gray-50 ${!participant.isAvailable ? 'opacity-50' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={selectedParticipants.includes(participant.user_member_id)}
                                      disabled={!participant.isAvailable}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedParticipants([...selectedParticipants, participant.user_member_id]);
                                        } else {
                                          setSelectedParticipants(selectedParticipants.filter(id => id !== participant.user_member_id));
                                        }
                                      }}
                                      className="mr-3"
                                    />
                                    <span className="text-sm">
                                      {participant.first_name} {participant.last_name} ({participant.club})
                                      {participant.isCurrentlyInGroup && <span className="text-blue-600 text-xs ml-1">(Current)</span>}
                                      {!participant.isAvailable && <span className="text-gray-400 text-xs ml-1">(Assigned to another group)</span>}
                                    </span>
                                  </label>
                                );
                              })
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => {
                            setEditingGroup(null);
                            setSelectedParticipants([]);
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateGroup}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Update Group
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Groups List */}
              <div className="space-y-4">
                {clubGroups && clubGroups.length > 0 ? clubGroups.map(group => (
                  <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{group.group_name}</h4>
                        <p className="text-sm text-gray-600">
                          {group.participating_clubs && group.participating_clubs.length > 0 ? group.participating_clubs.join(', ') : 'No clubs'} • {group.participant_count || 0} participants
                        </p>
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Participants:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {group.user_ids && group.user_ids.length > 0 ? group.user_ids.map(userId => {
                              const participant = tournamentParticipants.find(p => p.user_member_id === userId);
                              return participant ? (
                                <span key={userId} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                  {participant.first_name} {participant.last_name}
                                </span>
                              ) : null;
                            }) : (
                              <span className="text-gray-500 text-sm">No participants assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No groups created yet</p>
                    <p className="text-sm">Click "Create Group" to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-gray-900">Championship Matches</h3>
                  {matches.length > 0 && (
                    <label className="flex items-center space-x-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedMatches.length === matches.length && matches.length > 0}
                        onChange={handleSelectAllMatches}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span>Select All ({matches.length})</span>
                    </label>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCreateMatch(true)}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Match
                  </button>
                  {selectedMatches.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedMatches.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Matches by Group */}
              {clubGroups && clubGroups.length > 0 ? clubGroups.map(group => {
                const groupMatches = matches && matches.length > 0 ? matches.filter(match => match.club_group === group.group_name) : [];
                return (
                  <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">{group.group_name}</h4>
                      <button
                        onClick={() => {
                          setNewMatchGroupId(group.id);
                          setShowCreateMatch(true);
                        }}
                        className="flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Match
                      </button>
                    </div>
                    
                    {groupMatches.length > 0 ? (
                      <div className="space-y-2">
                        {groupMatches.map(match => (
                          <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <input
                                type="checkbox"
                                checked={selectedMatches.includes(match.id)}
                                onChange={() => handleSelectMatch(match.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-600">Match {match.match_number}</span>
                              <span className="text-sm">
                                {match.player1_name} vs {match.player2_name}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                match.match_status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {match.match_status}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditMatch(match)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit Match"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Delete Match"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No matches created yet</p>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-500">
                  <Play className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No groups created yet</p>
                  <p className="text-sm">Create groups first to manage matches</p>
                </div>
              )}
            </div>
          )}

          {/* Scoring Tab */}
          {activeTab === 'scoring' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Match Scoring</h3>
                <p className="text-sm text-gray-600">Enter scores for completed matches</p>
              </div>

              {/* Matches by Group for Scoring */}
              {clubGroups && clubGroups.length > 0 ? clubGroups.map(group => {
                const groupMatches = matches && matches.length > 0 ? matches.filter(match => match.club_group === group.group_name) : [];
                
                return (
                  <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{group.group_name}</h4>
                    
                    {groupMatches.length > 0 ? (
                      <div className="space-y-3">
                        {groupMatches.map(match => (
                          <div key={match.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <span className="text-sm font-medium text-gray-600">Match {match.match_number}</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{match.player1_name}</span>
                                <span className="text-gray-500">vs</span>
                                <span className="font-medium">{match.player2_name}</span>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                match.match_status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {match.match_status}
                              </span>
                              {match.match_status === 'completed' && (
                                <span className="text-sm text-gray-600">
                                  {match.player1_score} - {match.player2_score}
                                  {match.winner_id && (
                                    <span className="ml-2 font-medium">
                                      Winner: {match.winner_id === match.player1_id ? match.player1_name : match.player2_name}
                                    </span>
                                  )}
                                </span>
                              )}
                              {/* Scorecard Photos */}
                              {(() => {
                                console.log('Match scorecard photos:', {
                                  matchId: match.id,
                                  player1Photo: match.player1_scorecard_photo_url,
                                  player2Photo: match.player2_scorecard_photo_url,
                                  hasPhotos: !!(match.player1_scorecard_photo_url || match.player2_scorecard_photo_url)
                                });
                                return null;
                              })()}
                              {(match.player1_scorecard_photo_url || match.player2_scorecard_photo_url) && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-xs text-gray-500">Scorecard Photos:</span>
                                  {match.player1_scorecard_photo_url && (
                                    <button
                                      onClick={() => handleOpenScorecard(match.player1_scorecard_photo_url!, match.player1_name!)}
                                      className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                      title={`${match.player1_name}'s scorecard`}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span>{match.player1_name}</span>
                                    </button>
                                  )}
                                  {match.player2_scorecard_photo_url && (
                                    <button
                                      onClick={() => handleOpenScorecard(match.player2_scorecard_photo_url!, match.player2_name!)}
                                      className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                                      title={`${match.player2_name}'s scorecard`}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span>{match.player2_name}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleOpenMatchPlayScoring(match)}
                                className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                              >
                                {match.match_status === 'completed' ? 'Edit Match Play' : 'Enter Match Play'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No matches created yet</p>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No groups created yet</p>
                  <p className="text-sm">Create groups and matches first to enter scores</p>
                </div>
              )}
            </div>
          )}

          {/* Standings Tab */}
          {activeTab === 'standings' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Group Standings</h3>
                <button
                  onClick={handleDetermineChampions}
                  className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Determine Champions
                </button>
              </div>

              {/* Standings by Group */}
              {clubGroups && clubGroups.length > 0 ? clubGroups.map(group => {
                const groupMatches = matches && matches.length > 0 ? matches.filter(match => match.club_group === group.group_name) : [];
                const groupParticipants = group.user_ids && group.user_ids.length > 0 ? group.user_ids.map(userId => 
                  tournamentParticipants.find(p => p.user_member_id === userId)
                ).filter(Boolean) : [];

                return (
                  <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{group.group_name}</h4>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ties</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holes Won</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holes Lost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiebreaker Points</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupParticipants.map(participant => {
                            const participantMatches = groupMatches.filter(match => 
                              match.player1_id === participant.user_member_id || match.player2_id === participant.user_member_id
                            );
                            
                            const wins = participantMatches.filter(match => 
                              match.winner_id === participant.user_member_id
                            ).length;
                            
                            const losses = participantMatches.filter(match => 
                              match.winner_id && match.winner_id !== participant.user_member_id
                            ).length;
                            
                            const ties = participantMatches.filter(match => 
                              !match.winner_id && match.match_status === 'completed'
                            ).length;

                            // Calculate holes won/lost (placeholder - would need actual match data)
                            const holesWon = 0;
                            const holesLost = 0;
                            const tiebreakerPoints = calculateTiebreakerPoints(wins, losses, ties, holesWon, holesLost);

                            return (
                              <tr key={participant.user_member_id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {participant.first_name} {participant.last_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{wins}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{losses}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ties}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holesWon}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holesLost}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {tiebreakerPoints.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No groups created yet</p>
                  <p className="text-sm">Create groups first to view standings</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scoring Modal */}
      {showScoringModal && scoringMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Enter Match Score</h4>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Match {scoringMatch.match_number}</p>
                <p className="font-medium">{scoringMatch.player1_name} vs {scoringMatch.player2_name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {scoringMatch.player1_name} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={player1Score}
                    onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {scoringMatch.player2_name} Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={player2Score}
                    onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Winner (Optional)</label>
                <select
                  value={winnerId || ''}
                  onChange={(e) => setWinnerId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Auto-determine from scores</option>
                  <option value={scoringMatch.player1_id}>{scoringMatch.player1_name}</option>
                  <option value={scoringMatch.player2_id}>{scoringMatch.player2_name}</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseScoring}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitScore}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Submit Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Play Scoring Modal */}
      {showMatchPlayScoring && scoringMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Match Play Scoring</h4>
            <div className="space-y-6">
              {/* Match Info */}
              <div className="text-center border-b pb-4">
                <p className="text-sm text-gray-600 mb-2">Match {scoringMatch.match_number}</p>
                <p className="font-medium text-lg">{scoringMatch.player1_name} vs {scoringMatch.player2_name}</p>
              </div>

              {/* Course Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-medium">
                    {currentMatchCourse?.courseName || tournamentCourse || 'No course selected'}
                  </div>
                  <div className="text-xs text-green-600 mt-1 font-medium">
                    ✅ {currentMatchCourse ? `Assigned course (${currentMatchCourse.platform.toUpperCase()})` : 'Tournament course automatically loaded'}
                  </div>
                  {currentMatchCourse && (
                    <div className="text-xs text-blue-600 mt-1">
                      {currentMatchCourse.reason}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teebox</label>
                  <input
                    type="text"
                    value={selectedTeebox}
                    onChange={(e) => setSelectedTeebox(e.target.value)}
                    placeholder="e.g., Blue, White, Red"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Player Handicaps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {scoringMatch.player1_name} Handicap
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={player1Handicap}
                    onChange={(e) => setPlayer1Handicap(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {scoringMatch.player2_name} Handicap
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={player2Handicap}
                    onChange={(e) => setPlayer2Handicap(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Handicap Differential Display */}
              {player1Handicap !== 0 && player2Handicap !== 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Handicap Differential</h4>
                  <div className="text-sm text-blue-700">
                    <p>Raw differential: {Math.abs(player1Handicap - player2Handicap).toFixed(1)} strokes</p>
                    <p className="font-medium">
                      Applied differential: {Math.min(Math.abs(player1Handicap - player2Handicap), 8).toFixed(1)} strokes (max 8)
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {player1Handicap > player2Handicap 
                        ? `${scoringMatch.player1_name} gets strokes on the ${Math.round(Math.min(Math.abs(player1Handicap - player2Handicap), 8))} hardest holes`
                        : player2Handicap > player1Handicap
                        ? `${scoringMatch.player2_name} gets strokes on the ${Math.round(Math.min(Math.abs(player1Handicap - player2Handicap), 8))} hardest holes`
                        : 'No strokes given - handicaps are equal'
                      }
                    </p>
                    {(player1Handicap < 0 || player2Handicap < 0) && (
                      <p className="text-xs text-purple-600 mt-2 font-medium">
                        💡 Negative handicaps (better than scratch) don't receive strokes - their opponents do
                      </p>
                    )}
                  </div>
                  
                  {/* Debug Information */}
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <p className="font-semibold text-yellow-800">Debug Info:</p>
                    <p>Player 1 ({scoringMatch.player1_name}): {player1Handicap}</p>
                    <p>Player 2 ({scoringMatch.player2_name}): {player2Handicap}</p>
                    <p>Higher handicap: {player1Handicap > player2Handicap ? scoringMatch.player1_name : scoringMatch.player2_name}</p>
                    <p>Strokes to give: {Math.round(Math.min(Math.abs(player1Handicap - player2Handicap), 8))}</p>
                  </div>
                </div>
              )}

              {/* Hole-by-Hole Scoring */}
              <div className="space-y-4">
                <h5 className="text-md font-semibold">Hole-by-Hole Scoring</h5>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-2 py-1 text-xs">Hole</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs">Index</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs">Par</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs">{scoringMatch.player1_name} Gross</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs">{scoringMatch.player1_name} Net</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs">{scoringMatch.player2_name} Gross</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs">{scoringMatch.player2_name} Net</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs">Winner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 18 }, (_, i) => {
                        const holeIndex = holeIndexes[i] || (i + 1);
                        const parValue = courseParValues[i] || 4;
                        const p1Gross = player1HoleScores[i] || 0;
                        const p2Gross = player2HoleScores[i] || 0;
                        // Use loaded net scores from database, or calculate if not available
                        const p1Net = player1NetScores[i] || (p1Gross > 0 ? calculateNetScore(p1Gross, player1Handicap, holeIndex, player2Handicap) : 0);
                        const p2Net = player2NetScores[i] || (p2Gross > 0 ? calculateNetScore(p2Gross, player2Handicap, holeIndex, player1Handicap) : 0);
                        const winner = p1Gross > 0 && p2Gross > 0 ? 
                          (p1Net < p2Net ? 'P1' : p2Net < p1Net ? 'P2' : 'H') : '';
                        
                        // Check which player gets strokes on this hole
                        const rawDifferential = Math.abs(player1Handicap - player2Handicap);
                        const handicapDifferential = Math.min(Math.round(rawDifferential), 8);
                        const p1GetsStrokes = player1Handicap > player2Handicap && handicapDifferential % 18 >= holeIndex;
                        const p2GetsStrokes = player2Handicap > player1Handicap && handicapDifferential % 18 >= holeIndex;
                        
                        // Debug logging for first few holes
                        if (i < 3) {
                          console.log(`Hole ${i + 1} stroke calculation:`, {
                            holeIndex,
                            player1Handicap,
                            player2Handicap,
                            rawDifferential,
                            handicapDifferential,
                            p1GetsStrokes,
                            p2GetsStrokes,
                            condition: `${handicapDifferential} % 18 >= ${holeIndex} = ${handicapDifferential % 18 >= holeIndex}`
                          });
                        }
                        
                        return (
                          <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${p1GetsStrokes ? 'bg-green-50' : ''} ${p2GetsStrokes ? 'bg-orange-50' : ''}`}>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium">
                              <div className="flex items-center justify-center">
                                {i + 1}
                                {p1GetsStrokes && <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">P1</span>}
                                {p2GetsStrokes && <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded">P2</span>}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs">{holeIndex}</td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs">{parValue}</td>
                            <td className="border border-gray-300 px-2 py-1">
                              <input
                                type="number"
                                min="1"
                                max="15"
                                value={p1Gross || ''}
                                onChange={(e) => {
                                  const newScores = [...player1HoleScores];
                                  newScores[i] = parseInt(e.target.value) || 0;
                                  setPlayer1HoleScores(newScores);
                                  
                                  // Recalculate net scores
                                  const newNetScores = [...player1NetScores];
                                  newNetScores[i] = newScores[i] > 0 ? calculateNetScore(newScores[i], player1Handicap, holeIndex, player2Handicap) : 0;
                                  setPlayer1NetScores(newNetScores);
                                }}
                                className="w-full px-1 py-1 text-xs border border-gray-300 rounded text-center"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs bg-gray-100">{p1Net || ''}</td>
                            <td className="border border-gray-300 px-2 py-1">
                              <input
                                type="number"
                                min="1"
                                max="15"
                                value={p2Gross || ''}
                                onChange={(e) => {
                                  const newScores = [...player2HoleScores];
                                  newScores[i] = parseInt(e.target.value) || 0;
                                  setPlayer2HoleScores(newScores);
                                  
                                  // Recalculate net scores
                                  const newNetScores = [...player2NetScores];
                                  newNetScores[i] = newScores[i] > 0 ? calculateNetScore(newScores[i], player2Handicap, holeIndex, player1Handicap) : 0;
                                  setPlayer2NetScores(newNetScores);
                                }}
                                className="w-full px-1 py-1 text-xs border border-gray-300 rounded text-center"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs bg-gray-100">{p2Net || ''}</td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium">
                              {winner === 'P1' ? 'P1' : winner === 'P2' ? 'P2' : winner === 'H' ? 'H' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Match Result Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="text-md font-semibold mb-2">Match Result</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>{scoringMatch.player1_name}:</strong> {calculateMatchResult().player1HolesWon} holes won</p>
                    <p><strong>Net Holes:</strong> {calculateMatchResult().player1NetHoles > 0 ? '+' : ''}{calculateMatchResult().player1NetHoles}</p>
                  </div>
                  <div>
                    <p><strong>{scoringMatch.player2_name}:</strong> {calculateMatchResult().player2HolesWon} holes won</p>
                    <p><strong>Net Holes:</strong> {calculateMatchResult().player2NetHoles > 0 ? '+' : ''}{calculateMatchResult().player2NetHoles}</p>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="font-semibold">
                    {calculateMatchResult().winner ? 
                      `Winner: ${calculateMatchResult().winner === scoringMatch.player1_id ? scoringMatch.player1_name : scoringMatch.player2_name}` :
                      'Match Tied'
                    }
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseMatchPlayScoring}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitMatchPlayScore}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Submit Match Play Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Match Modal */}
      {showCreateMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Create New Match</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
                <select
                  value={newMatchGroupId || ''}
                  onChange={(e) => setNewMatchGroupId(parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a group</option>
                  {clubGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.group_name}</option>
                  ))}
                </select>
              </div>
              
              {newMatchGroupId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Player 1</label>
                    <select
                      value={newMatchPlayer1Id || ''}
                      onChange={(e) => setNewMatchPlayer1Id(parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Player 1</option>
                      {(() => {
                        const group = clubGroups.find(g => g.id === newMatchGroupId);
                        return group?.user_ids?.map(userId => {
                          const participant = tournamentParticipants.find(p => p.user_member_id === userId);
                          return participant ? (
                            <option key={userId} value={userId}>
                              {participant.first_name} {participant.last_name}
                            </option>
                          ) : null;
                        }).filter(Boolean);
                      })()}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Player 2</label>
                    <select
                      value={newMatchPlayer2Id || ''}
                      onChange={(e) => setNewMatchPlayer2Id(parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Player 2</option>
                      {(() => {
                        const group = clubGroups.find(g => g.id === newMatchGroupId);
                        return group?.user_ids?.map(userId => {
                          const participant = tournamentParticipants.find(p => p.user_member_id === userId);
                          return participant ? (
                            <option key={userId} value={userId}>
                              {participant.first_name} {participant.last_name}
                            </option>
                          ) : null;
                        }).filter(Boolean);
                      })()}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateMatch(false);
                    setNewMatchGroupId(null);
                    setNewMatchPlayer1Id(null);
                    setNewMatchPlayer2Id(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewMatch}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Create Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {showEditMatchModal && editingMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Edit Match</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Player 1</label>
                <select
                  value={newMatchPlayer1Id || ''}
                  onChange={(e) => setNewMatchPlayer1Id(parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Player 1</option>
                  {(() => {
                    const group = clubGroups.find(g => g.group_name === editingMatch.club_group);
                    return group?.user_ids?.map(userId => {
                      const participant = tournamentParticipants.find(p => p.user_member_id === userId);
                      return participant ? (
                        <option key={userId} value={userId}>
                          {participant.first_name} {participant.last_name}
                        </option>
                      ) : null;
                    }).filter(Boolean);
                  })()}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Player 2</label>
                <select
                  value={newMatchPlayer2Id || ''}
                  onChange={(e) => setNewMatchPlayer2Id(parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Player 2</option>
                  {(() => {
                    const group = clubGroups.find(g => g.group_name === editingMatch.club_group);
                    return group?.user_ids?.map(userId => {
                      const participant = tournamentParticipants.find(p => p.user_member_id === userId);
                      return participant ? (
                        <option key={userId} value={userId}>
                          {participant.first_name} {participant.last_name}
                        </option>
                      ) : null;
                    }).filter(Boolean);
                  })()}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditMatchModal(false);
                    setEditingMatch(null);
                    setNewMatchPlayer1Id(null);
                    setNewMatchPlayer2Id(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMatch}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Update Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scorecard Photo Modal */}
      {showScorecardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {selectedScorecardPlayer}'s Scorecard
              </h3>
              <button
                onClick={handleCloseScorecard}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[80vh]">
              <img 
                src={selectedScorecardUrl} 
                alt={`${selectedScorecardPlayer}'s scorecard`}
                className="w-full h-auto rounded-lg border border-gray-200"
              />
            </div>
            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                onClick={() => window.open(selectedScorecardUrl, '_blank')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Open in New Tab
              </button>
              <button
                onClick={handleCloseScorecard}
                className="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChampionshipAdminDashboard;