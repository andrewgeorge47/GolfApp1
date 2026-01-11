import React, { useState } from 'react';
import {
  MapPin,
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Info,
  Trophy,
  BarChart3,
  Lightbulb
} from 'lucide-react';
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

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
}

interface UpcomingMatch {
  id: number;
  week_start_date: string;
  opponent_team_id: number;
  opponent_team_name: string;
  course_name: string;
  course_id: number;
  lineup_submitted: boolean;
  lineup_deadline: string;
  status: 'upcoming' | 'in_progress' | 'completed';
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

interface StrategyHelperProps {
  teamId: number;
  leagueId: number;
  members: TeamMember[];
  upcomingMatches: UpcomingMatch[];
  teamStats: {
    total_points: number;
    wins: number;
    losses: number;
    ties: number;
    current_standing: number;
    total_teams: number;
  } | null;
}

const StrategyHelper: React.FC<StrategyHelperProps> = ({ members, upcomingMatches, teamStats }) => {
  const [selectedHole, setSelectedHole] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Build strategy from provided data
  const buildMatchStrategy = (): MatchStrategy | null => {
    if (upcomingMatches.length === 0) return null;

    const nextMatch = upcomingMatches[0];

    // Build mock course data (in a real app, this would come from the API)
    const mockCourse: Course = {
      id: nextMatch.course_id || 1,
      name: nextMatch.course_name || 'TBD',
      total_par: 36,
      total_yardage: 3240,
      holes: Array.from({ length: 9 }, (_, i) => ({
        hole_number: i + 1,
        par: i % 3 === 0 ? 3 : i % 3 === 1 ? 5 : 4,
        handicap_index: i + 1,
        yardage: i % 3 === 0 ? 180 : i % 3 === 1 ? 550 : 400,
        description: `Hole ${i + 1} description`
      }))
    };

    // Convert team members to players
    const ourTeam: Player[] = members.map(member => ({
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      handicap: member.handicap,
      strengths: ['Consistent play'],
      weaknesses: [],
      avg_score_by_hole: {}
    }));

    // Mock opponent team
    const opponentTeam: OpponentTeam = {
      id: nextMatch.opponent_team_id,
      name: nextMatch.opponent_team_name,
      team_handicap: teamStats ? Math.round(members.reduce((sum, m) => sum + m.handicap, 0) / members.length) : 15,
      players: []
    };

    const teamHandicap = teamStats ? Math.round(members.reduce((sum, m) => sum + m.handicap, 0) / members.length) : 15;
    const handicapAdvantage = teamHandicap - opponentTeam.team_handicap;

    // Generate basic recommendations
    const recommendations: StrategyRecommendation[] = Array.from({ length: 9 }, (_, i) => ({
      hole_number: i + 1,
      recommended_player: members[i % members.length] ? `${members[i % members.length].first_name} ${members[i % members.length].last_name}` : 'TBD',
      reason: 'Strategic assignment based on hole difficulty',
      confidence: 'medium' as const
    }));

    return {
      course: mockCourse,
      opponent_team: opponentTeam,
      our_team: ourTeam,
      recommendations,
      team_handicap: teamHandicap,
      opponent_handicap: opponentTeam.team_handicap,
      handicap_advantage: handicapAdvantage
    };
  };

  const matchStrategy = buildMatchStrategy();

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
