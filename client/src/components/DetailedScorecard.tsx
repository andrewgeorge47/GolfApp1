import React from 'react';
import { X, Crown, Users } from 'lucide-react';

interface TeamScore {
  id: number;
  team_id: number;
  tournament_id: number;
  total_score: number;
  hole_scores?: any;
  submitted_by: number;
  submitted_at: string;
  team_name: string;
  captain_first_name: string;
  captain_last_name: string;
  captain_club: string;
  players: Array<{
    user_member_id: number;
    first_name: string;
    last_name: string;
    club: string;
    is_captain: boolean;
  }>;
}

interface DetailedScorecardProps {
  teamScore: TeamScore;
  courseData: any;
  tournamentSettings: any;
  onClose: () => void;
}

const getScoreType = (score: number, par: number) => {
  if (score === 0) return '';
  if (score === par - 2) return 'eagle';
  if (score === par - 1) return 'birdie';
  if (score === par) return 'par';
  if (score === par + 1) return 'bogey';
  if (score >= par + 2) return 'double';
  return '';
};

const getScoreColorClass = (type: string) => {
  switch (type) {
    case 'eagle': return 'bg-yellow-200 text-yellow-900';
    case 'birdie': return 'bg-green-200 text-green-900';
    case 'bogey': return 'bg-red-200 text-red-900';
    case 'double': return 'bg-blue-200 text-blue-900';
    default: return '';
  }
};

const getScoreLabel = (type: string) => {
  switch (type) {
    case 'eagle': return 'EAGLE';
    case 'birdie': return 'BIRDIE';
    case 'bogey': return 'BOGEY';
    case 'double': return 'DBL BOGEY OR MORE';
    default: return '';
  }
};

const DetailedScorecard: React.FC<DetailedScorecardProps> = ({
  teamScore,
  courseData,
  tournamentSettings,
  onClose
}) => {
  const getHoleConfiguration = () => {
    const holeConfig = tournamentSettings?.holeConfiguration || '18';
    if (holeConfig === '9' || holeConfig === '9_front') return { holeCount: 9, startHole: 1 };
    if (holeConfig === '9_back') return { holeCount: 9, startHole: 10 };
    if (holeConfig === '18') return { holeCount: 18, startHole: 1 };
    return { holeCount: 18, startHole: 1 };
  };
  const { holeCount, startHole } = getHoleConfiguration();

  // Prepare par and score arrays
  const parValues: number[] = courseData?.par_values?.slice(startHole - 1, startHole - 1 + holeCount) || Array(holeCount).fill(4);
  const scores: number[] = Array.from({ length: holeCount }, (_, i) => teamScore.hole_scores?.[startHole + i] || 0);

  // OUT/IN/TOT calculations
  const outPar = parValues.slice(0, 9).reduce((a, b) => a + b, 0);
  const inPar = parValues.slice(9, 18).reduce((a, b) => a + b, 0);
  const totPar = parValues.reduce((a, b) => a + b, 0);
  const outScore = scores.slice(0, 9).reduce((a, b) => a + b, 0);
  const inScore = scores.slice(9, 18).reduce((a, b) => a + b, 0);
  const totScore = scores.reduce((a, b) => a + b, 0);

  // Score type for each hole
  const scoreTypes = scores.map((score, i) => getScoreType(score, parValues[i]));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-brand-black">
            Detailed Scorecard - {teamScore.team_name}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Team Members */}
        <div className="bg-neutral-50 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-brand-black mb-3">Players</h4>
          <div className="space-y-1">
            {teamScore.players?.map((player, index) => (
              <div key={player.user_member_id} className="flex items-center space-x-2">
                <span className="text-sm text-neutral-600">
                  {player.first_name} {player.last_name}
                </span>
                {player.is_captain && <Crown className="w-3 h-3 text-yellow-500" />}
                <span className="text-xs text-neutral-500">({player.club})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="border-b px-2 py-1 text-xs font-bold text-neutral-600">HOLE</th>
                {Array.from({ length: 9 }, (_, i) => (
                  <th key={i} className="border-b px-2 py-1 text-xs font-bold text-neutral-600">{i + 1}</th>
                ))}
                <th className="border-b px-2 py-1 text-xs font-bold text-neutral-600">OUT</th>
                {holeCount > 9 && Array.from({ length: 9 }, (_, i) => (
                  <th key={i+9} className="border-b px-2 py-1 text-xs font-bold text-neutral-600">{i + 10}</th>
                ))}
                {holeCount > 9 && <th className="border-b px-2 py-1 text-xs font-bold text-neutral-600">IN</th>}
                <th className="border-b px-2 py-1 text-xs font-bold text-neutral-600">TOT</th>
              </tr>
            </thead>
            <tbody>
              {/* Par row */}
              <tr>
                <td className="font-bold text-neutral-600">Par</td>
                {parValues.slice(0, 9).map((par, i) => (
                  <td key={i} className="font-medium text-neutral-700">{par}</td>
                ))}
                <td className="font-bold text-neutral-700">{outPar}</td>
                {holeCount > 9 && parValues.slice(9, 18).map((par, i) => (
                  <td key={i+9} className="font-medium text-neutral-700">{par}</td>
                ))}
                {holeCount > 9 && <td className="font-bold text-neutral-700">{inPar}</td>}
                <td className="font-bold text-neutral-900">{totPar}</td>
              </tr>
              {/* Score row */}
              <tr>
                <td className="font-bold text-neutral-600">Score</td>
                {scores.slice(0, 9).map((score, i) => (
                  <td key={i} className={`font-bold rounded ${getScoreColorClass(scoreTypes[i])}`}>{score > 0 ? score : ''}</td>
                ))}
                <td className="font-bold text-neutral-900">{outScore}</td>
                {holeCount > 9 && scores.slice(9, 18).map((score, i) => (
                  <td key={i+9} className={`font-bold rounded ${getScoreColorClass(scoreTypes[i+9])}`}>{score > 0 ? score : ''}</td>
                ))}
                {holeCount > 9 && <td className="font-bold text-neutral-900">{inScore}</td>}
                <td className="font-bold text-neutral-900">{totScore}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-6 text-xs">
          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-yellow-200 border border-yellow-400 mr-1"></span> EAGLE</div>
          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-green-200 border border-green-400 mr-1"></span> BIRDIE</div>
          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-red-200 border border-red-400 mr-1"></span> BOGEY</div>
          <div className="flex items-center gap-1"><span className="inline-block w-4 h-4 bg-blue-200 border border-blue-400 mr-1"></span> DBL BOGEY OR MORE</div>
        </div>
      </div>
    </div>
  );
};

export default DetailedScorecard; 