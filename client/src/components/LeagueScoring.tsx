import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Calendar,
  Users,
  Trophy,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import HybridScoreEntry from './HybridScoreEntry';
import MatchScoringView from './MatchScoringView';
import ScoreVerification from './ScoreVerification';
// TODO: Re-enable when league endpoints are rebuilt with permission system
// import {
//   getLeagueMatchups,
//   getMatchupScores,
//   getMatchupLineups,
//   type LeagueMatchup,
//   type WeeklyLineup,
//   type IndividualScore,
//   type AlternateShotScore
// } from '../services/api';

// Temporary stub types until league endpoints are rebuilt
interface LeagueMatchup {
  id: number;
  league_id: number;
  week_number: number;
  [key: string]: any; // Allow any additional properties
}

interface WeeklyLineup {
  id: number;
  matchup_id?: number;
  team_id?: number;
  week_number?: number;
  [key: string]: any; // Allow any additional properties
}

interface IndividualScore {
  id: number;
  matchup_id?: number;
  player_id?: number;
  [key: string]: any; // Allow any additional properties
}

interface AlternateShotScore {
  id: number;
  matchup_id?: number;
  [key: string]: any; // Allow any additional properties
}

interface LeagueScoringProps {
  leagueId?: number;
  onBack?: () => void;
}

const LeagueScoring: React.FC<LeagueScoringProps> = ({
  leagueId = 1, // Default to league 1
  onBack
}) => {
  const { matchupId } = useParams<{ matchupId?: string }>();
  const { user } = useAuth();
  const [matchups, setMatchups] = useState<LeagueMatchup[]>([]);
  const [selectedMatchup, setSelectedMatchup] = useState<LeagueMatchup | null>(null);
  const [lineups, setLineups] = useState<WeeklyLineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'entry' | 'view' | 'verify'>('entry');
  const [currentWeek, setCurrentWeek] = useState<number>(1);

  useEffect(() => {
    loadMatchups();
  }, [leagueId]);

  useEffect(() => {
    if (matchupId) {
      loadMatchupDetails(parseInt(matchupId));
    }
  }, [matchupId]);

  const loadMatchups = async () => {
    try {
      // Mock data for demonstration
      const mockMatchups: LeagueMatchup[] = [
        {
          id: 1,
          league_id: 1,
          week_number: currentWeek,
          division_id: 1,
          team1_id: 1,
          team1_name: "Eagle Hunters",
          team2_id: 2,
          team2_name: "Birdie Brigade",
          course_id: 1,
          course_name: "Augusta National",
          course_rating: 76.2,
          course_slope: 148,
          course_par: 72,
          hole_indexes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
          status: "in_progress",
          winner_team_id: 0,
          team1_individual_net: 0,
          team2_individual_net: 0,
          team1_alternate_shot_net: 0,
          team2_alternate_shot_net: 0,
          team1_total_net: 0,
          team2_total_net: 0,
          team1_points: 0,
          team2_points: 0,
          match_date: "2025-01-15T10:00:00Z",
          completed_at: "",
          verified_at: "",
          verified_by: 0
        },
        {
          id: 2,
          league_id: 1,
          week_number: currentWeek,
          division_id: 1,
          team1_id: 3,
          team1_name: "Par Masters",
          team2_id: 4,
          team2_name: "Bogey Busters",
          course_id: 2,
          course_name: "Pebble Beach",
          course_rating: 75.5,
          course_slope: 142,
          course_par: 72,
          hole_indexes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
          status: "scores_submitted",
          winner_team_id: 0,
          team1_individual_net: 0,
          team2_individual_net: 0,
          team1_alternate_shot_net: 0,
          team2_alternate_shot_net: 0,
          team1_total_net: 0,
          team2_total_net: 0,
          team1_points: 0,
          team2_points: 0,
          match_date: "2025-01-15T10:00:00Z",
          completed_at: "",
          verified_at: "",
          verified_by: 0
        }
      ];
      
      setMatchups(mockMatchups);
      
      // Auto-select first matchup if none selected
      if (mockMatchups.length > 0 && !selectedMatchup) {
        setSelectedMatchup(mockMatchups[0]);
        loadMatchupDetails(mockMatchups[0].id);
      }
    } catch (error) {
      console.error('Error loading matchups:', error);
      toast.error('Failed to load matchups');
    } finally {
      setLoading(false);
    }
  };

  const loadMatchupDetails = async (matchupId: number) => {
    try {
      // Mock data for demonstration
      const mockLineups: WeeklyLineup[] = [
        {
          id: 1,
          matchup_id: matchupId,
          team_id: 1,
          team_name: "Eagle Hunters",
          player1_id: 1,
          player1_name: "John Smith",
          player2_id: 2,
          player2_name: "Mike Johnson",
          player3_id: 3,
          player3_name: "Tom Wilson",
          player1_handicap: 12,
          player2_handicap: 15,
          player3_handicap: 18,
          week_number: currentWeek,
          league_id: 1,
          is_locked: true,
          submitted_at: "2025-01-15T09:00:00Z",
          submitted_by: 1
        },
        {
          id: 2,
          matchup_id: matchupId,
          team_id: 2,
          team_name: "Birdie Brigade",
          player1_id: 4,
          player1_name: "Sarah Davis",
          player2_id: 5,
          player2_name: "Lisa Brown",
          player3_id: 6,
          player3_name: "Amy Taylor",
          player1_handicap: 10,
          player2_handicap: 14,
          player3_handicap: 16,
          week_number: currentWeek,
          league_id: 1,
          is_locked: true,
          submitted_at: "2025-01-15T09:00:00Z",
          submitted_by: 4
        }
      ];

      const mockIndividualScores: IndividualScore[] = [
        {
          id: 1,
          matchup_id: matchupId,
          lineup_id: 1,
          team_id: 1,
          player_id: 1,
          assigned_holes: [1, 2, 3],
          hole_scores: {
            "1": { gross: 4, net: 3, par: 4, strokes_received: 1 },
            "2": { gross: 5, net: 4, par: 4, strokes_received: 1 },
            "3": { gross: 3, net: 2, par: 3, strokes_received: 1 }
          },
          gross_total: 12,
          net_total: 9,
          player_handicap: 12,
          course_handicap: 14,
          submitted_at: "2025-01-15T10:30:00Z"
        },
        {
          id: 2,
          matchup_id: matchupId,
          lineup_id: 1,
          team_id: 1,
          player_id: 2,
          assigned_holes: [4, 5, 6],
          hole_scores: {
            "4": { gross: 4, net: 3, par: 4, strokes_received: 1 },
            "5": { gross: 6, net: 5, par: 5, strokes_received: 1 },
            "6": { gross: 3, net: 2, par: 3, strokes_received: 1 }
          },
          gross_total: 13,
          net_total: 10,
          player_handicap: 15,
          course_handicap: 17,
          submitted_at: "2025-01-15T10:35:00Z"
        },
        {
          id: 3,
          matchup_id: matchupId,
          lineup_id: 1,
          team_id: 1,
          player_id: 3,
          assigned_holes: [7, 8, 9],
          hole_scores: {
            "7": { gross: 5, net: 4, par: 4, strokes_received: 1 },
            "8": { gross: 4, net: 3, par: 4, strokes_received: 1 },
            "9": { gross: 4, net: 3, par: 4, strokes_received: 1 }
          },
          gross_total: 13,
          net_total: 10,
          player_handicap: 18,
          course_handicap: 20,
          submitted_at: "2025-01-15T10:40:00Z"
        }
      ];

      const mockAlternateShotScores: AlternateShotScore[] = [
        {
          id: 1,
          matchup_id: matchupId,
          lineup_id: 1,
          team_id: 1,
          hole_scores: {
            "10": { gross: 4, net: 3, par: 4, strokes_received: 1 },
            "11": { gross: 5, net: 4, par: 5, strokes_received: 1 },
            "12": { gross: 4, net: 3, par: 4, strokes_received: 1 },
            "13": { gross: 3, net: 2, par: 3, strokes_received: 1 },
            "14": { gross: 5, net: 4, par: 4, strokes_received: 1 },
            "15": { gross: 4, net: 3, par: 4, strokes_received: 1 },
            "16": { gross: 3, net: 2, par: 3, strokes_received: 1 },
            "17": { gross: 5, net: 4, par: 5, strokes_received: 1 },
            "18": { gross: 4, net: 3, par: 4, strokes_received: 1 }
          },
          gross_total: 37,
          net_total: 28,
          team_handicap: 15,
          team_course_handicap: 17,
          submitted_at: "2025-01-15T11:00:00Z"
        }
      ];

      setLineups(mockLineups);
      
      // Determine which view to show based on matchup status and user role
      const matchup = matchups.find(m => m.id === matchupId) || matchups[0];
      setSelectedMatchup(matchup);
      
      // Determine active view based on status and user permissions
      if (matchup.status === 'scores_submitted' || matchup.status === 'verified') {
        setActiveView('view');
      } else if (matchup.status === 'in_progress' && canVerifyScores(matchup)) {
        setActiveView('verify');
      } else {
        setActiveView('entry');
      }
    } catch (error) {
      console.error('Error loading matchup details:', error);
      toast.error('Failed to load matchup details');
    }
  };

  const canVerifyScores = (matchup: LeagueMatchup) => {
    if (!user) return false;
    
    // Check if user is captain of either team
    const userLineup = lineups.find(lineup => 
      lineup.player1_id === user.member_id || 
      lineup.player2_id === user.member_id || 
      lineup.player3_id === user.member_id
    );
    
    return userLineup !== undefined;
  };

  const getUserTeam = () => {
    if (!user) return null;
    
    return lineups.find(lineup => 
      lineup.player1_id === user.member_id || 
      lineup.player2_id === user.member_id || 
      lineup.player3_id === user.member_id
    );
  };

  const handleScoreSubmitted = () => {
    toast.success('Scores submitted successfully!');
    if (selectedMatchup) {
      loadMatchupDetails(selectedMatchup.id);
    }
  };

  const handleVerificationComplete = () => {
    toast.success('Verification completed!');
    if (selectedMatchup) {
      loadMatchupDetails(selectedMatchup.id);
    }
  };

  const handleWeekChange = (week: number) => {
    setCurrentWeek(week);
    setSelectedMatchup(null);
    setLineups([]);
    loadMatchups();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mr-3"></div>
          <span className="text-gray-600">Loading league scoring...</span>
        </div>
      </div>
    );
  }

  if (matchups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p>No matchups found for this week</p>
        </div>
      </div>
    );
  }

  const userTeam = getUserTeam();
  const canEnterScores = userTeam && selectedMatchup && 
    (selectedMatchup.status === 'lineup_submitted' || selectedMatchup.status === 'in_progress');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">League Scoring</h2>
            <p className="text-gray-600">Week {currentWeek}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadMatchups()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Week Selector */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Select Week:</span>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(week => (
              <button
                key={week}
                onClick={() => handleWeekChange(week)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentWeek === week
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matchup Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Matchup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchups.map(matchup => (
            <button
              key={matchup.id}
              onClick={() => {
                setSelectedMatchup(matchup);
                loadMatchupDetails(matchup.id);
              }}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                selectedMatchup?.id === matchup.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{matchup.team1_name}</span>
                <span className="text-gray-500">vs</span>
                <span className="font-semibold text-gray-900">{matchup.team2_name}</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {matchup.course_name}
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  matchup.status === 'completed' ? 'bg-green-100 text-green-800' :
                  matchup.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  matchup.status === 'scores_submitted' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {matchup.status.replace('_', ' ').toUpperCase()}
                </span>
                {matchup.winner_team_id && (
                  <Trophy className="w-4 h-4 text-yellow-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      {selectedMatchup && (
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveView('entry')}
              disabled={!canEnterScores}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                activeView === 'entry'
                  ? 'bg-blue-600 text-white'
                  : canEnterScores
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Target className="w-4 h-4 mr-2" />
              Enter Scores
            </button>
            
            <button
              onClick={() => setActiveView('view')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                activeView === 'view'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Scores
            </button>
            
            {canVerifyScores(selectedMatchup) && (
              <button
                onClick={() => setActiveView('verify')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                  activeView === 'verify'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Scores
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Component */}
      {selectedMatchup && userTeam && (
        <div>
          {activeView === 'entry' && canEnterScores && (
            <HybridScoreEntry
              matchupId={selectedMatchup.id}
              teamId={userTeam.team_id || 0}
              lineup={userTeam as any}
              coursePar={Array(18).fill(4)} // Default par values
              courseHandicapIndexes={selectedMatchup.hole_indexes || []}
              onScoreSubmitted={handleScoreSubmitted}
            />
          )}
          
          {activeView === 'view' && (
            <MatchScoringView
              matchupId={selectedMatchup.id}
              onVerify={() => setActiveView('verify')}
            />
          )}
          
          {activeView === 'verify' && canVerifyScores(selectedMatchup) && (
            <ScoreVerification
              matchupId={selectedMatchup.id}
              onVerificationComplete={handleVerificationComplete}
            />
          )}
        </div>
      )}

      {/* No Team Message */}
      {!userTeam && selectedMatchup && (
        <div className="text-center text-gray-600 py-8">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>You are not part of any team in this matchup</p>
          <p className="text-sm">Contact your league administrator if this is incorrect</p>
        </div>
      )}
    </div>
  );
};

export default LeagueScoring;