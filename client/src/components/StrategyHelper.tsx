import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Target, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
  Trophy,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

interface CourseHole {
  hole_number: number;
  par: number;
  handicap_index: number;
  yardage: number;
  description?: string;
}

interface Course {
  id: number;
  name: string;
  holes: CourseHole[];
  total_par: number;
  total_yardage: number;
}

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  strengths: string[];
  weaknesses: string[];
  avg_score_by_hole: { [hole: number]: number };
}

interface OpponentTeam {
  id: number;
  name: string;
  players: Player[];
  team_handicap: number;
}

interface StrategyRecommendation {
  hole_number: number;
  recommended_player: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  alternative_player?: string;
}

interface MatchStrategy {
  course: Course;
  opponent_team: OpponentTeam;
  our_team: Player[];
  recommendations: StrategyRecommendation[];
  team_handicap: number;
  opponent_handicap: number;
  handicap_advantage: number;
}

const StrategyHelper: React.FC = () => {
  const { user } = useAuth();
  const [matchStrategy, setMatchStrategy] = useState<MatchStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadStrategyData();
  }, []);

  const loadStrategyData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Mock data for now
      const mockCourse: Course = {
        id: 1,
        name: 'Augusta National',
        total_par: 36,
        total_yardage: 3240,
        holes: [
          { hole_number: 1, par: 4, handicap_index: 10, yardage: 445, description: 'Dogleg right, bunker on left' },
          { hole_number: 2, par: 5, handicap_index: 1, yardage: 575, description: 'Long par 5, water hazard' },
          { hole_number: 3, par: 4, handicap_index: 6, yardage: 350, description: 'Short par 4, precision required' },
          { hole_number: 4, par: 3, handicap_index: 3, yardage: 240, description: 'Long par 3, bunkers front and back' },
          { hole_number: 5, par: 4, handicap_index: 8, yardage: 455, description: 'Uphill par 4, narrow fairway' },
          { hole_number: 6, par: 3, handicap_index: 5, yardage: 180, description: 'Short par 3, elevation change' },
          { hole_number: 7, par: 4, handicap_index: 2, yardage: 450, description: 'Tight fairway, trees on both sides' },
          { hole_number: 8, par: 5, handicap_index: 4, yardage: 570, description: 'Long par 5, strategic bunkering' },
          { hole_number: 9, par: 4, handicap_index: 7, yardage: 460, description: 'Downhill par 4, water on right' }
        ]
      };

      const mockOurTeam: Player[] = [
        {
          id: 1,
          first_name: user?.first_name || 'John',
          last_name: user?.last_name || 'Doe',
          handicap: 12,
          strengths: ['Driving accuracy', 'Short game'],
          weaknesses: ['Long irons', 'Putting'],
          avg_score_by_hole: { 1: 4.2, 2: 5.8, 3: 4.1, 4: 3.3, 5: 4.5, 6: 3.2, 7: 4.8, 8: 5.9, 9: 4.6 }
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          handicap: 15,
          strengths: ['Putting', 'Course management'],
          weaknesses: ['Driving distance', 'Sand shots'],
          avg_score_by_hole: { 1: 4.5, 2: 6.2, 3: 4.3, 4: 3.5, 5: 4.8, 6: 3.4, 7: 5.1, 8: 6.3, 9: 4.9 }
        },
        {
          id: 3,
          first_name: 'Mike',
          last_name: 'Johnson',
          handicap: 18,
          strengths: ['Driving distance', 'Recovery shots'],
          weaknesses: ['Accuracy', 'Short game'],
          avg_score_by_hole: { 1: 4.8, 2: 6.5, 3: 4.6, 4: 3.8, 5: 5.1, 6: 3.6, 7: 5.4, 8: 6.6, 9: 5.2 }
        }
      ];

      const mockOpponentTeam: OpponentTeam = {
        id: 2,
        name: 'Birdie Brigade',
        team_handicap: 14,
        players: [
          {
            id: 4,
            first_name: 'Alex',
            last_name: 'Thompson',
            handicap: 10,
            strengths: ['All-around game', 'Mental toughness'],
            weaknesses: ['Course knowledge'],
            avg_score_by_hole: { 1: 4.0, 2: 5.5, 3: 3.9, 4: 3.1, 5: 4.3, 6: 3.0, 7: 4.6, 8: 5.7, 9: 4.4 }
          },
          {
            id: 5,
            first_name: 'Sam',
            last_name: 'Wilson',
            handicap: 16,
            strengths: ['Short game', 'Course strategy'],
            weaknesses: ['Driving accuracy'],
            avg_score_by_hole: { 1: 4.6, 2: 6.0, 3: 4.4, 4: 3.4, 5: 4.9, 6: 3.3, 7: 5.0, 8: 6.2, 9: 4.8 }
          },
          {
            id: 6,
            first_name: 'Jordan',
            last_name: 'Davis',
            handicap: 16,
            strengths: ['Putting', 'Course management'],
            weaknesses: ['Distance control'],
            avg_score_by_hole: { 1: 4.7, 2: 6.1, 3: 4.5, 4: 3.5, 5: 5.0, 6: 3.4, 7: 5.1, 8: 6.3, 9: 4.9 }
          }
        ]
      };

      const mockRecommendations: StrategyRecommendation[] = [
        {
          hole_number: 1,
          recommended_player: 'John Doe',
          reason: 'Strong driving accuracy needed for dogleg right',
          confidence: 'high'
        },
        {
          hole_number: 2,
          recommended_player: 'Mike Johnson',
          reason: 'Long par 5 requires driving distance',
          confidence: 'medium',
          alternative_player: 'John Doe'
        },
        {
          hole_number: 3,
          recommended_player: 'Jane Smith',
          reason: 'Short par 4 requires precision and course management',
          confidence: 'high'
        },
        {
          hole_number: 4,
          recommended_player: 'Jane Smith',
          reason: 'Long par 3 requires accuracy and putting skills',
          confidence: 'high'
        },
        {
          hole_number: 5,
          recommended_player: 'John Doe',
          reason: 'Uphill par 4 needs driving accuracy',
          confidence: 'medium'
        },
        {
          hole_number: 6,
          recommended_player: 'Jane Smith',
          reason: 'Short par 3 with elevation change suits precision player',
          confidence: 'high'
        },
        {
          hole_number: 7,
          recommended_player: 'Mike Johnson',
          reason: 'Tight fairway requires recovery shot ability',
          confidence: 'low',
          alternative_player: 'John Doe'
        },
        {
          hole_number: 8,
          recommended_player: 'Mike Johnson',
          reason: 'Long par 5 needs driving distance',
          confidence: 'medium'
        },
        {
          hole_number: 9,
          recommended_player: 'John Doe',
          reason: 'Downhill par 4 requires accuracy and course knowledge',
          confidence: 'high'
        }
      ];

      const teamHandicap = Math.round(mockOurTeam.reduce((sum, p) => sum + p.handicap, 0) / mockOurTeam.length);
      const handicapAdvantage = teamHandicap - mockOpponentTeam.team_handicap;

      const strategy: MatchStrategy = {
        course: mockCourse,
        opponent_team: mockOpponentTeam,
        our_team: mockOurTeam,
        recommendations: mockRecommendations,
        team_handicap: teamHandicap,
        opponent_handicap: mockOpponentTeam.team_handicap,
        handicap_advantage: handicapAdvantage
      };

      setMatchStrategy(strategy);
    } catch (error) {
      console.error('Error loading strategy data:', error);
      toast.error('Failed to load strategy data');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      case 'low': return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getHandicapAdvantageColor = (advantage: number) => {
    if (advantage > 0) return 'text-red-600';
    if (advantage < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getHandicapAdvantageIcon = (advantage: number) => {
    if (advantage > 0) return <TrendingUp className="w-4 h-4" />;
    if (advantage < 0) return <TrendingDown className="w-4 h-4" />;
    return <BarChart3 className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!matchStrategy) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Strategy Data</h3>
        <p className="text-gray-600">Unable to load strategy information for this match.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MapPin className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Strategy Helper</h1>
            <p className="text-neutral-600">Strategic recommendations for {matchStrategy.course.name}</p>
          </div>
        </div>
        
        <button 
          onClick={loadStrategyData}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Match Overview */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="w-6 h-6 text-brand-neon-green" />
            </div>
            <h3 className="text-lg font-semibold text-brand-black">Our Team</h3>
            <p className="text-2xl font-bold text-brand-black">Handicap: {matchStrategy.team_handicap}</p>
            <p className="text-sm text-neutral-600">{matchStrategy.our_team.length} players</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-brand-black">Opponent</h3>
            <p className="text-2xl font-bold text-brand-black">Handicap: {matchStrategy.opponent_handicap}</p>
            <p className="text-sm text-neutral-600">{matchStrategy.opponent_team.name}</p>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center justify-center mb-2 ${getHandicapAdvantageColor(matchStrategy.handicap_advantage)}`}>
              {getHandicapAdvantageIcon(matchStrategy.handicap_advantage)}
            </div>
            <h3 className="text-lg font-semibold text-brand-black">Advantage</h3>
            <p className={`text-2xl font-bold ${getHandicapAdvantageColor(matchStrategy.handicap_advantage)}`}>
              {matchStrategy.handicap_advantage > 0 ? '+' : ''}{matchStrategy.handicap_advantage}
            </p>
            <p className="text-sm text-neutral-600">
              {matchStrategy.handicap_advantage > 0 ? 'Opponent advantage' : 
               matchStrategy.handicap_advantage < 0 ? 'Our advantage' : 'Even match'}
            </p>
          </div>
        </div>
      </div>

      {/* Course Information */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brand-black">Course Information</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-brand-neon-green hover:text-green-600 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-neutral-600">Total Par</p>
            <p className="text-xl font-bold text-brand-black">{matchStrategy.course.total_par}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600">Total Yardage</p>
            <p className="text-xl font-bold text-brand-black">{matchStrategy.course.total_yardage.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600">Course</p>
            <p className="text-xl font-bold text-brand-black">{matchStrategy.course.name}</p>
          </div>
        </div>

        {showDetails && (
          <div className="border-t border-neutral-200 pt-4">
            <h4 className="font-medium text-brand-black mb-3">Hole Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matchStrategy.course.holes.map((hole) => (
                <div key={hole.hole_number} className="border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-brand-black">Hole {hole.hole_number}</h5>
                    <span className="text-sm text-neutral-600">Par {hole.par}</span>
                  </div>
                  <div className="text-sm text-neutral-600 space-y-1">
                    <p>Handicap: {hole.handicap_index}</p>
                    <p>Yardage: {hole.yardage}</p>
                    {hole.description && <p className="text-xs">{hole.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strategic Recommendations */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-brand-neon-green" />
            <h3 className="text-lg font-semibold text-brand-black">Strategic Recommendations</h3>
          </div>
          <p className="text-sm text-neutral-600 mt-1">AI-powered suggestions for optimal player assignments</p>
        </div>
        
        <div className="divide-y divide-neutral-200">
          {matchStrategy.recommendations.map((recommendation) => (
            <div key={recommendation.hole_number} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-brand-neon-green rounded-full flex items-center justify-center">
                      <span className="text-brand-black font-bold text-lg">
                        {recommendation.hole_number}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-brand-black">
                        Hole {recommendation.hole_number}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(recommendation.confidence)}`}>
                        {getConfidenceIcon(recommendation.confidence)}
                        <span className="ml-1 capitalize">{recommendation.confidence} confidence</span>
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium text-brand-black">Recommended Player:</p>
                        <p className="text-brand-neon-green font-semibold">{recommendation.recommended_player}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-brand-black">Reasoning:</p>
                        <p className="text-neutral-700">{recommendation.reason}</p>
                      </div>
                      
                      {recommendation.alternative_player && (
                        <div>
                          <p className="font-medium text-brand-black">Alternative:</p>
                          <p className="text-neutral-600">{recommendation.alternative_player}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setSelectedHole(selectedHole === recommendation.hole_number ? null : recommendation.hole_number)}
                    className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {selectedHole === recommendation.hole_number && (
                <div className="mt-4 pl-16 border-t border-neutral-200 pt-4">
                  <h5 className="font-medium text-brand-black mb-2">Detailed Analysis</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-600 mb-1">Hole Characteristics:</p>
                      <p className="text-sm text-neutral-700">
                        {matchStrategy.course.holes.find(h => h.hole_number === recommendation.hole_number)?.description || 'No description available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-600 mb-1">Player Strengths:</p>
                      <p className="text-sm text-neutral-700">
                        {matchStrategy.our_team.find(p => `${p.first_name} ${p.last_name}` === recommendation.recommended_player)?.strengths.join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Team Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Our Team */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-brand-black">Our Team Analysis</h3>
          </div>
          
          <div className="p-6 space-y-4">
            {matchStrategy.our_team.map((player) => (
              <div key={player.id} className="border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium text-brand-black mb-2">
                  {player.first_name} {player.last_name}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-600">Handicap: <span className="font-medium">{player.handicap}</span></p>
                    <p className="text-neutral-600">Strengths:</p>
                    <ul className="text-neutral-700 list-disc list-inside">
                      {player.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-neutral-600">Weaknesses:</p>
                    <ul className="text-neutral-700 list-disc list-inside">
                      {player.weaknesses.map((weakness, index) => (
                        <li key={index}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opponent Team */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-brand-black">Opponent Analysis</h3>
            <p className="text-sm text-neutral-600">{matchStrategy.opponent_team.name}</p>
          </div>
          
          <div className="p-6 space-y-4">
            {matchStrategy.opponent_team.players.map((player) => (
              <div key={player.id} className="border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium text-brand-black mb-2">
                  {player.first_name} {player.last_name}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-600">Handicap: <span className="font-medium">{player.handicap}</span></p>
                    <p className="text-neutral-600">Strengths:</p>
                    <ul className="text-neutral-700 list-disc list-inside">
                      {player.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-neutral-600">Weaknesses:</p>
                    <ul className="text-neutral-700 list-disc list-inside">
                      {player.weaknesses.map((weakness, index) => (
                        <li key={index}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyHelper;
