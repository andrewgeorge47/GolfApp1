import React, { useState, useEffect } from 'react';
import {
  Users, Target, Trophy, Calculator, MapPin, Calendar,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, Lock, Smartphone
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getSimulatorCourse, saveLeagueLineup, getLeagueLineup } from '../services/api';
import LeagueScoreSubmission from './LeagueScoreSubmission';
import MobileLiveScoring from './MobileLiveScoring';

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  availability_status?: 'available' | 'unavailable' | 'pending';
}

interface UpcomingMatch {
  id: number;
  week_number: number;
  week_start_date: string;
  week_end_date: string;
  opponent_team_id: number;
  opponent_team_name: string;
  course_name: string;
  course_id: number;
  lineup_submitted: boolean;
  lineup_deadline: string;
  status: 'scheduled' | 'lineup_submitted' | 'active' | 'completed';
  team1_id: number;
  team2_id: number;
  team1_playing_time?: string;
  team2_playing_time?: string;
}

interface CourseData {
  id: number;
  name: string;
  location: string;
  par_values: number[];
  hole_indexes: number[];
}

interface Player {
  id: number;
  user_id: number;
  name: string;
  handicap: number;
}

interface HoleScore {
  hole: number;
  player_id?: number;
  gross: number;
  net: number;
  par: number;
  index: number;
  stroke_received: boolean;
}

interface ImprovedLineupSelectorProps {
  teamId: number;
  leagueId: number;
  members: TeamMember[];
  upcomingMatches: UpcomingMatch[];
  onScoreSubmit?: () => void;
}

const ImprovedLineupSelector: React.FC<ImprovedLineupSelectorProps> = ({
  teamId,
  leagueId,
  members,
  upcomingMatches,
  onScoreSubmit
}) => {
  // Debug logging
  console.log('ImprovedLineupSelector rendered with:', {
    teamId,
    leagueId,
    membersCount: members?.length,
    upcomingMatchesCount: upcomingMatches?.length,
    firstMatch: upcomingMatches?.[0]
  });

  const [selectedWeek, setSelectedWeek] = useState<UpcomingMatch | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Player selection (3 players)
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

  // Front 9: Individual assignments and scores
  const [holeAssignments, setHoleAssignments] = useState<{ [hole: number]: number }>({});
  const [frontNineScores, setFrontNineScores] = useState<{ [hole: number]: HoleScore }>({});

  // Back 9: Alternate shot scores
  const [backNineScores, setBackNineScores] = useState<{ [hole: number]: HoleScore }>({});

  // Back 9: Player order (1, 2, 3) - determines who tees off on which holes
  const [back9PlayerOrder, setBack9PlayerOrder] = useState<number[]>([]);

  // Team handicap
  const [teamHandicap, setTeamHandicap] = useState(0);

  // UI state
  const [expandedSection, setExpandedSection] = useState<'front9' | 'back9' | null>(null);
  const [lineupSaved, setLineupSaved] = useState(false);
  const [scoresSubmitted, setScoresSubmitted] = useState(false); // NEW: Track if scores have been submitted
  const [isEditMode, setIsEditMode] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showMobileLiveScoring, setShowMobileLiveScoring] = useState(false);

  const getLineupStorageKey = (weekId: number) => {
    return `lineup_${teamId}_${leagueId}_${weekId}`;
  };

  const saveLineup = async (weekId: number, isManualSave: boolean = false) => {
    // Save to localStorage as a backup
    const key = getLineupStorageKey(weekId);
    const lineupData = {
      selectedPlayers,
      holeAssignments,
      frontNineScores,
      backNineScores,
      back9PlayerOrder,
      savedAt: new Date().toISOString(),
      lineupSaved: isManualSave ? true : lineupSaved
    };
    localStorage.setItem(key, JSON.stringify(lineupData));

    // Save to backend if we have at least one player selected
    if (selectedPlayers.length > 0) {
      try {
        const player_ids = selectedPlayers.map(p => p.user_id);
        const player_handicaps = selectedPlayers.map(p => p.handicap);

        // back9PlayerOrder is already an array of player IDs (numbers)
        // Convert to user_ids by finding the corresponding user_id for each player id
        const back9_user_ids = back9PlayerOrder.map(playerId => {
          const player = selectedPlayers.find(p => p.id === playerId);
          return player ? player.user_id : 0;
        }).filter((id: number) => id !== 0);

        await saveLeagueLineup(weekId, {
          team_id: teamId,
          player_ids,
          player_handicaps,
          hole_assignments: holeAssignments,
          back9_player_order: back9_user_ids,
          is_finalized: isManualSave  // True when captain clicks "Save Lineup"
        });
      } catch (error) {
        console.error('Error saving lineup to backend:', error);
        // Don't show error toast for auto-saves, only for manual saves
        if (isManualSave) {
          toast.error('Failed to save lineup to server, but saved locally');
        }
      }
    }
  };

  const loadLineup = async (weekId: number) => {
    try {
      // Try to load from backend first
      const response = await getLeagueLineup(weekId, teamId);
      const lineup = response.data;

      // Find the full player objects from members
      const playerIds = [lineup.player1_id, lineup.player2_id, lineup.player3_id].filter(Boolean);
      const loadedPlayers = members.filter(m => playerIds.includes(m.user_id)).map(m => ({
        id: m.id,
        user_id: m.user_id,
        name: `${m.first_name} ${m.last_name}`,
        handicap: Number(m.handicap || 0)
      }));

      setSelectedPlayers(loadedPlayers);
      setHoleAssignments(lineup.hole_assignments || {});

      // Convert back9_player_order from user_ids to player ids
      const back9_ids = (lineup.back9_player_order || []).map((userId: number) => {
        const player = loadedPlayers.find(p => p.user_id === userId);
        return player ? player.id : 0;
      }).filter((id: number) => id !== 0);
      setBack9PlayerOrder(back9_ids);

      // Set lineup as saved if it's finalized OR if it has 3 players
      // is_finalized = true means captain clicked "Save Lineup"
      setLineupSaved(lineup.is_finalized === true || loadedPlayers.length === 3);

      // IMPORTANT: Check if scores have been submitted (scores_submitted flag)
      // This is separate from lineup being saved - it means actual scores were entered
      setScoresSubmitted(lineup.scores_submitted === true);

      // Also save to localStorage for offline backup
      const key = getLineupStorageKey(weekId);
      localStorage.setItem(key, JSON.stringify({
        selectedPlayers: loadedPlayers,
        holeAssignments: lineup.hole_assignments || {},
        back9PlayerOrder: back9_ids,
        savedAt: new Date().toISOString(),
        lineupSaved: lineup.is_finalized === true,
        scoresSubmitted: lineup.scores_submitted === true
      }));

      // Mark initial load as complete
      console.log('loadLineup completed successfully, setting isInitialLoad to false');
      setIsInitialLoad(false);

    } catch (error: any) {
      // If backend fails (404 = not found), try localStorage and migrate to backend
      if (error?.response?.status === 404) {
        const key = getLineupStorageKey(weekId);
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const lineupData = JSON.parse(saved);
            const loadedPlayers = (lineupData.selectedPlayers || []).map((p: any) => ({
              ...p,
              handicap: Number(p.handicap || 0)
            }));

            setSelectedPlayers(loadedPlayers);
            setHoleAssignments(lineupData.holeAssignments || {});
            setFrontNineScores(lineupData.frontNineScores || {});
            setBackNineScores(lineupData.backNineScores || {});
            setBack9PlayerOrder(lineupData.back9PlayerOrder || []);

            // Set lineup as saved if it has 3 players (localStorage fallback)
            if (loadedPlayers.length === 3) {
              setLineupSaved(true);
            }

            // Check if scores were submitted (from localStorage)
            setScoresSubmitted(lineupData.scoresSubmitted === true);

            // MIGRATION: If lineup was finalized in localStorage, save it to backend
            if (lineupData.lineupSaved && loadedPlayers.length === 3) {
              console.log('Migrating localStorage lineup to database...');
              try {
                const player_ids = loadedPlayers.map((p: any) => p.user_id);
                const player_handicaps = loadedPlayers.map((p: any) => p.handicap);
                const back9_user_ids = (lineupData.back9PlayerOrder || []).map((playerId: number) => {
                  const player = loadedPlayers.find((p: any) => p.id === playerId);
                  return player ? player.user_id : 0;
                }).filter((id: number) => id !== 0);

                await saveLeagueLineup(weekId, {
                  team_id: teamId,
                  player_ids,
                  player_handicaps,
                  hole_assignments: lineupData.holeAssignments || {},
                  back9_player_order: back9_user_ids,
                  is_finalized: true  // Migration from localStorage - lineup was saved
                });

                toast.success('Your saved lineup has been migrated to the cloud!', {
                  autoClose: 5000,
                  position: 'top-center'
                });
                console.log('Migration successful!');
              } catch (migrationError) {
                console.error('Failed to migrate lineup to backend:', migrationError);
                // Don't show error to user - they still have localStorage backup
              }
            }
          } catch (error) {
            console.error('Error loading saved lineup from localStorage:', error);
          }
        }
        // Mark initial load as complete even if we loaded from localStorage
        console.log('loadLineup completed (localStorage), setting isInitialLoad to false');
        setIsInitialLoad(false);
      } else {
        console.error('Error loading lineup:', error);
        // Mark initial load as complete even on error
        console.log('loadLineup failed, setting isInitialLoad to false');
        setIsInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    try {
      if (upcomingMatches.length > 0) {
        // Only set selectedWeek if it's null OR if the current selectedWeek is no longer in the list
        if (!selectedWeek) {
          setSelectedWeek(upcomingMatches[0]);
        } else {
          // Check if current selectedWeek still exists in upcomingMatches
          const stillExists = upcomingMatches.some(m => m.id === selectedWeek.id);
          if (!stillExists) {
            // Current week no longer exists, select first available
            setSelectedWeek(upcomingMatches[0]);
          } else {
            // Update selectedWeek with fresh data but don't reset state
            const updatedWeek = upcomingMatches.find(m => m.id === selectedWeek.id);
            if (updatedWeek && JSON.stringify(updatedWeek) !== JSON.stringify(selectedWeek)) {
              setSelectedWeek(updatedWeek);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in initial week useEffect:', error);
    }
  }, [upcomingMatches]);

  // Track the last loaded week ID to prevent unnecessary reloads
  const [lastLoadedWeekId, setLastLoadedWeekId] = React.useState<number | null>(null);

  useEffect(() => {
    try {
      if (selectedWeek && selectedWeek.course_id) {
        // Only reload if this is a different week than what's currently loaded
        if (selectedWeek.id !== lastLoadedWeekId) {
          setIsInitialLoad(true);
          setLastLoadedWeekId(selectedWeek.id);
          loadCourseData(selectedWeek.course_id);
          loadLineup(selectedWeek.id);
          setIsEditMode(false);
          // Reset scores submitted state when changing weeks
          setScoresSubmitted(false);
        }
      }
    } catch (error) {
      console.error('Error in selectedWeek useEffect:', error);
    }
  }, [selectedWeek?.id]);

  // Auto-save lineup to backend whenever it changes (but not during initial load)
  useEffect(() => {
    if (!isInitialLoad && selectedWeek && selectedPlayers.length > 0) {
      console.log('Auto-save triggered');
      // Debounce the save to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveLineup(selectedWeek.id, false);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedPlayers, holeAssignments, frontNineScores, backNineScores, back9PlayerOrder, selectedWeek, isInitialLoad]);

  useEffect(() => {
    if (selectedPlayers.length === 3) {
      const avgHandicap = selectedPlayers.reduce((sum, p) => sum + p.handicap, 0) / 3;
      setTeamHandicap(Math.round(avgHandicap * 10) / 10);
    } else {
      setTeamHandicap(0);
    }
  }, [selectedPlayers]);

  // Clean up assignments when players are removed from active lineup
  useEffect(() => {
    const selectedPlayerIds = selectedPlayers.map(p => p.id);

    // Clean up front 9 hole assignments for removed players
    const updatedHoleAssignments = { ...holeAssignments };
    let hasHoleChanges = false;
    Object.keys(updatedHoleAssignments).forEach(hole => {
      const assignedPlayerId = updatedHoleAssignments[parseInt(hole)];
      if (!selectedPlayerIds.includes(assignedPlayerId)) {
        delete updatedHoleAssignments[parseInt(hole)];
        hasHoleChanges = true;
      }
    });

    // Clean up back 9 player order for removed players
    const updatedBack9Order = back9PlayerOrder.filter(id => selectedPlayerIds.includes(id));
    const hasOrderChanges = updatedBack9Order.length !== back9PlayerOrder.length;

    // Show notification if any changes were made
    if (hasHoleChanges || hasOrderChanges) {
      toast.warning('Player removed - lineup assignments have been cleared for that player');

      if (hasHoleChanges) {
        setHoleAssignments(updatedHoleAssignments);
      }
      if (hasOrderChanges) {
        setBack9PlayerOrder(updatedBack9Order);
      }
    }
  }, [selectedPlayers]);

  const loadCourseData = async (courseId: number) => {
    setLoading(true);
    try {
      const response = await getSimulatorCourse(courseId);
      const courseData = response.data;

      const parValues = Array.isArray(courseData.par_values)
        ? courseData.par_values
        : Array(18).fill(4);

      const holeIndexes = Array.isArray(courseData.hole_indexes)
        ? courseData.hole_indexes
        : Array.from({ length: 18 }, (_, i) => i + 1);

      setCourse({
        id: courseData.id,
        name: courseData.name,
        location: courseData.location || 'Unknown',
        par_values: parValues,
        hole_indexes: holeIndexes
      });

      // Initialize scores for all holes
      initializeScores(parValues, holeIndexes);
    } catch (error: any) {
      console.error('Error loading course:', error);
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const initializeScores = (parValues: number[], holeIndexes: number[]) => {
    console.log('initializeScores called with:', { parValues, holeIndexes });

    // Front 9
    const front9: { [hole: number]: HoleScore } = {};
    for (let hole = 1; hole <= 9; hole++) {
      front9[hole] = {
        hole,
        gross: 0,
        net: 0,
        par: parValues[hole - 1] || 4,
        index: holeIndexes[hole - 1] || hole,
        stroke_received: false
      };
    }
    console.log('Setting frontNineScores:', front9);
    setFrontNineScores(front9);

    // Back 9
    const back9: { [hole: number]: HoleScore } = {};
    for (let hole = 10; hole <= 18; hole++) {
      back9[hole] = {
        hole,
        gross: 0,
        net: 0,
        par: parValues[hole - 1] || 4,
        index: holeIndexes[hole - 1] || hole,
        stroke_received: false
      };
    }
    console.log('Setting backNineScores:', back9);
    setBackNineScores(back9);
  };

  const togglePlayerSelection = (member: TeamMember) => {
    const player: Player = {
      id: member.id,
      user_id: member.user_id,
      name: `${member.first_name} ${member.last_name}`,
      handicap: Number(member.handicap || 0)
    };

    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else if (selectedPlayers.length < 3) {
      setSelectedPlayers([...selectedPlayers, player]);
    } else {
      toast.error('You can only select 3 players');
    }
  };

  const updateFrontNineScore = (hole: number, gross: number) => {
    const score = frontNineScores[hole];
    const assignedPlayerId = holeAssignments[hole];
    const player = selectedPlayers.find(p => p.id === assignedPlayerId);

    if (!player) {
      toast.error(`Please assign a player to hole ${hole} first`);
      return;
    }

    // Calculate strokes received based on player handicap and hole index
    const strokesReceived = Math.floor(player.handicap / 18) +
      (player.handicap % 18 >= score.index ? 1 : 0);

    const net = Math.max(0, gross - strokesReceived);

    setFrontNineScores(prev => ({
      ...prev,
      [hole]: {
        ...score,
        player_id: assignedPlayerId,
        gross,
        net,
        stroke_received: strokesReceived > 0
      }
    }));
  };

  const updateBackNineScore = (hole: number, gross: number) => {
    const score = backNineScores[hole];

    // Calculate strokes for alternate shot using team handicap
    const strokesReceived = Math.floor(teamHandicap / 18) +
      (teamHandicap % 18 >= score.index ? 1 : 0);

    const net = Math.max(0, gross - strokesReceived);

    setBackNineScores(prev => ({
      ...prev,
      [hole]: {
        ...score,
        gross,
        net,
        stroke_received: strokesReceived > 0
      }
    }));
  };

  const calculateTotals = () => {
    const front9Gross = Object.values(frontNineScores).reduce((sum, s) => sum + s.gross, 0);
    const front9Net = Object.values(frontNineScores).reduce((sum, s) => sum + s.net, 0);
    const back9Gross = Object.values(backNineScores).reduce((sum, s) => sum + s.gross, 0);
    const back9Net = Object.values(backNineScores).reduce((sum, s) => sum + s.net, 0);

    return {
      front9Gross,
      front9Net,
      back9Gross,
      back9Net,
      totalGross: front9Gross + back9Gross,
      totalNet: front9Net + back9Net
    };
  };

  const handleSaveLineup = async () => {
    if (!selectedWeek) {
      toast.error('No week selected');
      return;
    }

    if (selectedPlayers.length !== 3) {
      toast.error('Please select exactly 3 players');
      return;
    }

    // Validate all front 9 holes have assignments
    for (let hole = 1; hole <= 9; hole++) {
      if (!holeAssignments[hole]) {
        toast.error(`Please assign a player to hole ${hole}`);
        return;
      }
    }

    // Validate back 9 order is complete
    if (back9PlayerOrder.length !== 3) {
      toast.error('Please set all 3 teeing positions for the back 9');
      return;
    }

    try {
      setLineupSaved(true);
      setIsEditMode(false);
      await saveLineup(selectedWeek.id, true); // Save with lineupSaved flag
      toast.success('Lineup saved successfully and synced across all devices!');
    } catch (error) {
      toast.error('Failed to save lineup to server');
      setLineupSaved(false);
    }
  };

  const handleEditLineup = () => {
    if (!selectedWeek) return;
    setIsEditMode(true);
    setLineupSaved(false);
    saveLineup(selectedWeek.id, false); // Update backend and localStorage
  };

  const handleSubmitScore = async () => {
    if (!lineupSaved) {
      toast.error('Please save your lineup first');
      return;
    }
    setShowScoreModal(true);
  };

  // Player color assignments (same as AvailabilityView) - Must be before any early returns (hooks rule)
  const playerColors = React.useMemo(() => [
    { selected: 'bg-blue-500 text-white', unselected: 'bg-blue-100 text-blue-700 border-blue-200' },
    { selected: 'bg-purple-500 text-white', unselected: 'bg-purple-100 text-purple-700 border-purple-200' },
    { selected: 'bg-pink-500 text-white', unselected: 'bg-pink-100 text-pink-700 border-pink-200' },
    { selected: 'bg-orange-500 text-white', unselected: 'bg-orange-100 text-orange-700 border-orange-200' },
    { selected: 'bg-teal-500 text-white', unselected: 'bg-teal-100 text-teal-700 border-teal-200' },
    { selected: 'bg-indigo-500 text-white', unselected: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { selected: 'bg-rose-500 text-white', unselected: 'bg-rose-100 text-rose-700 border-rose-200' },
    { selected: 'bg-cyan-500 text-white', unselected: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { selected: 'bg-amber-500 text-white', unselected: 'bg-amber-100 text-amber-700 border-amber-200' },
    { selected: 'bg-emerald-500 text-white', unselected: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  ], []);

  // Assign consistent colors to members - memoize to prevent unnecessary re-renders
  const memberColorMap = React.useMemo(() => {
    const colorMap: { [memberId: number]: typeof playerColors[0] } = {};
    members.forEach((member, index) => {
      if (member.id) {
        colorMap[member.id] = playerColors[index % playerColors.length];
      }
    });
    console.log('memberColorMap created:', colorMap);
    console.log('members:', members.map(m => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })));
    return colorMap;
  }, [members, playerColors]);

  if (!selectedWeek) {
    console.log('ImprovedLineupSelector: No selectedWeek, showing empty state');
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <p className="text-neutral-600">No weeks available for this league</p>
      </div>
    );
  }

  console.log('ImprovedLineupSelector: Rendering main content, selectedPlayers:', selectedPlayers.length, 'course:', !!course);

  const totals = calculateTotals();
  const hasScores = selectedWeek.status !== 'scheduled';
  const isLineupLocked = lineupSaved && !isEditMode;

  return (
    <div className="space-y-6 pb-8">
      {/* Week Selector */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-brand-black mb-2">
          Select Week:
        </label>
        <select
          value={selectedWeek.id}
          onChange={(e) => {
            const week = upcomingMatches.find(w => w.id === parseInt(e.target.value));
            if (week) setSelectedWeek(week);
          }}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-transparent"
        >
          {upcomingMatches.map((week) => {
            const statusLabel = week.status === 'completed' ? ' - COMPLETED' :
                              week.status === 'active' ? ' - ACTIVE' : '';
            return (
              <option key={week.id} value={week.id}>
                Week {week.week_number} - {week.course_name} ({new Date(week.week_start_date).toLocaleDateString()}){statusLabel}
              </option>
            );
          })}
        </select>
      </div>

      {/* Player Selection Section */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="p-4 sm:px-6 sm:py-4 bg-neutral-50">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold text-brand-black">Active Players</h3>
                <span className="text-xs sm:text-sm text-neutral-600">
                  ({selectedPlayers.length}/3)
                </span>
              </div>
              {selectedPlayers.length === 3 && (
                <div className="flex items-center space-x-2 ml-7 sm:ml-0">
                  <span className="text-xs sm:text-sm text-neutral-600">Team Handicap:</span>
                  <span className="text-sm sm:text-base font-bold text-green-700">
                    {teamHandicap.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Player Chips */}
            <div className="flex flex-wrap gap-2">
              {members.map(member => {
                const isSelected = selectedPlayers.some(p => p.id === member.id);
                const colorScheme = memberColorMap[member.id] || playerColors[0];
                const colorClass = isSelected ? colorScheme.selected : colorScheme.unselected;

                return (
                  <button
                    key={member.id}
                    onClick={() => !isLineupLocked && togglePlayerSelection(member)}
                    disabled={isLineupLocked}
                    className={`inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-medium border-2 transition-all ${colorClass} ${
                      !isSelected && !isLineupLocked ? 'hover:opacity-80' : ''
                    } ${isLineupLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span className="text-xs sm:text-sm whitespace-nowrap">
                      {member.first_name} {member.last_name} ({Number(member.handicap || 0).toFixed(1)})
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Helper text for mobile */}
            {selectedPlayers.length < 3 && (
              <p className="text-xs text-neutral-500 ml-7 sm:ml-0">
                Tap {3 - selectedPlayers.length} more {3 - selectedPlayers.length === 1 ? 'player' : 'players'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Front 9 Section - Only show if players are selected */}
      {selectedPlayers.length === 3 && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'front9' ? null : 'front9')}
            className="w-full px-6 py-4 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Target className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-brand-black">Front 9: Individual Stroke Play</h3>
                  {isLineupLocked && (
                    <Lock className="w-4 h-4 text-neutral-500" />
                  )}
                </div>
                <p className="text-sm text-neutral-600">
                  {isLineupLocked ? 'Lineup locked - click Edit Lineup to make changes' : 'Assign one player to each hole (1-9)'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-neutral-600">Assigned</div>
                <div className="text-xl font-bold text-blue-600">
                  {Object.keys(holeAssignments).filter(h => parseInt(h) <= 9).length}/9
                </div>
              </div>
              {expandedSection === 'front9' ? (
                <ChevronUp className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              )}
            </div>
          </button>

          {expandedSection === 'front9' && course && (() => {
            console.log('Rendering Front 9 expanded section. frontNineScores:', frontNineScores, 'course:', course);
            return (
            <div className="p-4 sm:p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-neutral-200">
                    <th className="text-left p-2 text-sm font-semibold">Hole</th>
                    <th className="text-center p-2 text-sm font-semibold">Par</th>
                    <th className="text-center p-2 text-sm font-semibold">Index</th>
                    <th className="text-center p-2 text-sm font-semibold">Assigned Player</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => {
                    try {
                      const score = frontNineScores[hole];
                      const assignedPlayerId = holeAssignments[hole];

                      console.log(`Rendering hole ${hole}:`, { score, assignedPlayerId, memberColorMap });

                      // Defensive check - if score is undefined, skip this hole
                      if (!score) {
                        console.error(`frontNineScores[${hole}] is undefined!`);
                        return null;
                      }

                    return (
                      <tr
                        key={hole}
                        className="border-b border-neutral-100 hover:bg-neutral-50"
                        style={{ position: 'relative', zIndex: assignedPlayerId ? 10 : 1 }}
                      >
                        <td className="p-2">
                          <div className="flex items-center">
                            <span className="text-base font-bold text-brand-black w-6">{hole}</span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className="text-sm text-neutral-600">{score.par}</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                            {score.index}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-2 transition-all duration-300">
                            {selectedPlayers.map((player, index) => {
                              const isAssigned = assignedPlayerId === player.id;
                              const colorScheme = memberColorMap[player.id] || playerColors[0];
                              const holeHasAssignment = !!assignedPlayerId;

                              if (!colorScheme) {
                                console.error('No colorScheme for player:', player);
                              }

                              // Count how many front 9 holes this player is assigned to
                              const playerHoleCount = Object.entries(holeAssignments).filter(
                                ([h, id]) => parseInt(h) <= 9 && id === player.id
                              ).length;

                              // Calculate if player would receive stroke on this hole
                              const strokesReceived = Math.floor(player.handicap / 18) +
                                (player.handicap % 18 >= score.index ? 1 : 0);
                              const getsStroke = strokesReceived > 0;

                              // Get player initials
                              const nameParts = player.name.split(' ');
                              const initials = nameParts.length >= 2
                                ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                                : nameParts[0][0];

                              const canAssign = isAssigned || (playerHoleCount < 3 && !holeHasAssignment);

                              return (
                                <button
                                  key={player.id}
                                  onClick={() => {
                                    if (isLineupLocked) return;

                                    if (isAssigned) {
                                      // Remove assignment
                                      const newAssignments = { ...holeAssignments };
                                      delete newAssignments[hole];
                                      setHoleAssignments(newAssignments);
                                    } else if (canAssign) {
                                      // Add assignment
                                      setHoleAssignments(prev => ({
                                        ...prev,
                                        [hole]: player.id
                                      }));
                                    } else if (holeHasAssignment) {
                                      toast.error('This hole already has a player assigned');
                                    } else {
                                      toast.error(`${player.name.split(' ')[0]} is already assigned to 3 holes`);
                                    }
                                  }}
                                  disabled={isLineupLocked || (!canAssign && !isAssigned)}
                                  style={{
                                    order: isAssigned ? -1 : index,
                                    opacity: holeHasAssignment && !isAssigned ? 0 : 1,
                                    width: holeHasAssignment && !isAssigned ? 0 : '36px',
                                    padding: holeHasAssignment && !isAssigned ? 0 : undefined,
                                    margin: holeHasAssignment && !isAssigned ? 0 : undefined,
                                    zIndex: isAssigned ? 20 : 1,
                                  }}
                                  className={`relative h-9 rounded-full font-bold text-xs transition-all duration-300 ease-in-out ${
                                    isAssigned
                                      ? colorScheme.selected + ' shadow-lg scale-110'
                                      : !canAssign || isLineupLocked
                                      ? 'bg-neutral-200 text-neutral-400 border-2 border-neutral-300 cursor-not-allowed opacity-50'
                                      : colorScheme.unselected + ' border-2 hover:scale-105'
                                  } ${isLineupLocked ? 'cursor-not-allowed' : ''}`}
                                  title={`${player.name} (${Number(player.handicap || 0).toFixed(1)}) - ${playerHoleCount}/3 holes`}
                                >
                                  {initials}
                                  {isAssigned && getsStroke && (
                                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-white z-10">
                                      <span className="text-white text-[9px] font-bold">+1</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                    } catch (error) {
                      console.error(`Error rendering hole ${hole}:`, error);
                      return <tr key={hole}><td colSpan={4}>Error rendering hole {hole}</td></tr>;
                    }
                  })}
                </tbody>
              </table>
            </div>
            );
          })()}
        </div>
      )}

      {/* Back 9 Section */}
      {selectedPlayers.length === 3 && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'back9' ? null : 'back9')}
            className="w-full px-6 py-4 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6 text-brand-purple" />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-brand-black">Back 9: Alternate Shot</h3>
                  {isLineupLocked && (
                    <Lock className="w-4 h-4 text-neutral-500" />
                  )}
                </div>
                <p className="text-sm text-neutral-600">
                  {isLineupLocked ? 'Lineup locked - click Edit Lineup to make changes' : 'Set teeing order for holes 10-18'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-neutral-600">Order Set</div>
                <div className="text-xl font-bold text-brand-purple">{back9PlayerOrder.length}/3</div>
              </div>
              {expandedSection === 'back9' ? (
                <ChevronUp className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              )}
            </div>
          </button>

          {expandedSection === 'back9' && course && (
            <div className="p-4 sm:p-6">
              {/* Order Selection */}
              <div className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-brand-black mb-3">Set Teeing Order</h4>
                <p className="text-xs text-neutral-600 mb-3">
                  Click each player circle below to set positions 1, 2, 3. Order determines who tees off on which holes.
                </p>

                <div className="flex items-center justify-center gap-4">
                  {selectedPlayers.map((player, index) => {
                    const playerPosition = back9PlayerOrder.indexOf(player.id) + 1;
                    const hasPosition = playerPosition > 0;
                    const colorScheme = memberColorMap[player.id] || playerColors[0];

                    const nameParts = player.name.split(' ');
                    const initials = nameParts.length >= 2
                      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                      : nameParts[0][0];

                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (isLineupLocked) return;

                          if (hasPosition) {
                            // Remove from order
                            setBack9PlayerOrder(back9PlayerOrder.filter(id => id !== player.id));
                          } else {
                            // Add to order
                            setBack9PlayerOrder([...back9PlayerOrder, player.id]);
                          }
                        }}
                        disabled={isLineupLocked}
                        className={`relative transition-all ${
                          hasPosition ? 'scale-110' : 'scale-100 hover:scale-105'
                        } ${isLineupLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <div className={`w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center border-2 transition-all ${
                          hasPosition
                            ? colorScheme.selected + ' shadow-lg'
                            : colorScheme.unselected
                        }`}>
                          {initials}
                        </div>
                        {hasPosition && (
                          <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white z-10">
                            <span className="text-white text-xs font-bold">{playerPosition}</span>
                          </div>
                        )}
                        <div className="text-xs text-neutral-600 mt-1 text-center">
                          {player.name.split(' ')[0]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hole Assignment Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-neutral-200">
                      <th className="text-left p-2 text-sm font-semibold">Hole</th>
                      <th className="text-center p-2 text-sm font-semibold">Par</th>
                      <th className="text-center p-2 text-sm font-semibold">Index</th>
                      <th className="text-center p-2 text-sm font-semibold">Tee Shot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole, idx) => {
                      const score = backNineScores[hole];

                      // Determine which player tees off (cycle through 1, 2, 3)
                      const position = (idx % 3) + 1;
                      const teeingPlayerId = back9PlayerOrder[position - 1];
                      const teeingPlayer = selectedPlayers.find(p => p.id === teeingPlayerId);
                      const colorScheme = teeingPlayer ? (memberColorMap[teeingPlayerId] || playerColors[0]) : null;

                      // Calculate if team gets stroke on this hole
                      const strokesReceived = Math.floor(teamHandicap / 18) +
                        (teamHandicap % 18 >= score.index ? 1 : 0);
                      const getsStroke = strokesReceived > 0;

                      // Get player initials
                      const nameParts = teeingPlayer ? teeingPlayer.name.split(' ') : [];
                      const initials = nameParts.length >= 2
                        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                        : nameParts[0] ? nameParts[0][0] : '?';

                      return (
                        <tr
                          key={hole}
                          className="border-b border-neutral-100 hover:bg-neutral-50"
                          style={{ position: 'relative', zIndex: 1 }}
                        >
                          <td className="p-2">
                            <div className="flex items-center">
                              <span className="text-base font-bold text-brand-black w-6">{hole}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-sm text-neutral-600">{score.par}</span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                              {score.index}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center">
                              {colorScheme ? (
                                <div className="relative" style={{ zIndex: 10 }}>
                                  <div
                                    className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-all ${colorScheme.selected} shadow-md`}
                                    title={`${teeingPlayer?.name} tees off (Position ${position})`}
                                  >
                                    {initials}
                                  </div>
                                  {getsStroke && (
                                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-white z-10">
                                      <span className="text-white text-[9px] font-bold">+1</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center">
                                  <span className="text-neutral-400 text-xs font-bold">{position}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {selectedPlayers.length === 3 && (
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          {!lineupSaved || isEditMode ? (
            // Show Save Lineup button when not saved or in edit mode
            <button
              onClick={handleSaveLineup}
              disabled={hasScores}
              className={`w-full sm:w-auto px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
                hasScores
                  ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                  : 'bg-brand-neon-green text-brand-black shadow-lg hover:shadow-xl hover:scale-105'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Save Lineup</span>
              </div>
            </button>
          ) : scoresSubmitted ? (
            // Show completion message when scores have been submitted (is_finalized = true)
            <div className="w-full p-6 bg-success-50 border-2 border-success-200 rounded-lg">
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="w-6 h-6 text-success-600" />
                <span className="text-lg font-semibold text-success-700">
                  Scores submitted for this week
                </span>
              </div>
            </div>
          ) : (
            // Show Edit Lineup and Submit Score buttons when saved
            <>
              <button
                onClick={handleEditLineup}
                className="w-full sm:w-auto px-6 py-4 rounded-lg font-semibold text-base transition-all bg-white border-2 border-brand-neon-green text-brand-black shadow-lg hover:shadow-xl hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Edit Lineup</span>
                </div>
              </button>
              <button
                onClick={() => setShowMobileLiveScoring(true)}
                disabled={hasScores}
                className={`w-full sm:w-auto px-6 py-4 rounded-lg font-semibold text-base transition-all ${
                  hasScores
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                    : 'bg-brand-muted-green text-white shadow-lg hover:shadow-xl hover:scale-105'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Smartphone className="w-5 h-5" />
                  <span>Live Scoring</span>
                </div>
              </button>
              <button
                onClick={handleSubmitScore}
                disabled={hasScores}
                className={`w-full sm:w-auto px-6 py-4 rounded-lg font-semibold text-base transition-all ${
                  hasScores
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                    : 'bg-brand-neon-green text-brand-black shadow-lg hover:shadow-xl hover:scale-105'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Calculator className="w-5 h-5" />
                  <span>Submit Score</span>
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {/* Score Submission Modal */}
      {showScoreModal && selectedWeek && (
        <LeagueScoreSubmission
          scheduleId={selectedWeek.id}
          teamId={teamId}
          opponentTeamId={selectedWeek.opponent_team_id}
          courseId={selectedWeek.course_id}
          players={selectedPlayers.map(p => ({
            id: p.id,
            user_id: p.user_id,
            name: p.name,
            sim_handicap: p.handicap
          }))}
          initialHoleAssignments={holeAssignments}
          initialBack9PlayerOrder={back9PlayerOrder}
          onClose={() => setShowScoreModal(false)}
          onSubmit={() => {
            setShowScoreModal(false);
            setScoresSubmitted(true); // Mark scores as submitted
            onScoreSubmit?.();
          }}
        />
      )}

      {/* Mobile Live Scoring */}
      {showMobileLiveScoring && selectedWeek && (
        <MobileLiveScoring
          scheduleId={selectedWeek.id}
          teamId={teamId}
          courseId={selectedWeek.course_id}
          players={selectedPlayers.map(p => ({
            id: p.id,
            user_id: p.user_id,
            name: p.name,
            sim_handicap: p.handicap
          }))}
          initialHoleAssignments={holeAssignments}
          initialBack9PlayerOrder={back9PlayerOrder}
          onClose={() => setShowMobileLiveScoring(false)}
          onSubmit={() => {
            setShowMobileLiveScoring(false);
            setScoresSubmitted(true); // Mark scores as submitted
            onScoreSubmit?.();
          }}
        />
      )}
    </div>
  );
};

export default ImprovedLineupSelector;
