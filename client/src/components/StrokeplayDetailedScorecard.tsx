import React from 'react';
import { X, Camera } from 'lucide-react';

interface PlayerScore {
  player_id: number;
  first_name: string;
  last_name: string;
  club: string;
  total_score: number;
  score_to_par?: number;
  submitted_at: string;
  holes?: Array<{
    hole: number;
    score: number;
  }> | {
    [key: number]: number;
    hole_scores?: { [key: number]: number };
  };
  scorecard_photo_url?: string;
}

interface StrokeplayDetailedScorecardProps {
  playerScore: PlayerScore;
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

const StrokeplayDetailedScorecard: React.FC<StrokeplayDetailedScorecardProps> = ({
  playerScore,
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
  
  const scores: number[] = Array.from({ length: holeCount }, (_, i) => {
    const holeNumber = startHole + i;
    
    // Try different possible data structures
    let holeData = null;
    
    // Check if holes is an array of objects with hole and score properties
    if (playerScore.holes && Array.isArray(playerScore.holes)) {
      holeData = playerScore.holes.find(h => h.hole === holeNumber);
    }
    
    // If not found, check if the scores are stored in a different format
    // (e.g., as an object with hole numbers as keys)
    if (!holeData && playerScore.holes && typeof playerScore.holes === 'object' && !Array.isArray(playerScore.holes)) {
      holeData = { score: (playerScore.holes as any)[holeNumber] };
    }
    
    // If still not found, check if there's a hole_scores property
    if (!holeData && (playerScore.holes as any)?.hole_scores) {
      holeData = { score: (playerScore.holes as any).hole_scores[holeNumber] };
    }
    
    return holeData?.score || 0;
  });

  // OUT/IN/TOT calculations
  const outPar = parValues.slice(0, 9).reduce((a, b) => a + b, 0);
  const inPar = parValues.slice(9, 18).reduce((a, b) => a + b, 0);
  const totPar = parValues.reduce((a, b) => a + b, 0);
  const outScore = scores.slice(0, 9).reduce((a, b) => a + b, 0);
  const inScore = scores.slice(9, 18).reduce((a, b) => a + b, 0);
  const totScore = scores.reduce((a, b) => a + b, 0);

  // Score type for each hole
  const scoreTypes = scores.map((score, i) => getScoreType(score, parValues[i]));

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      const cleanDate = dateString.replace(/\.\d+$/, '');
      return new Date(cleanDate).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-brand-black">
            Detailed Scorecard - {playerScore.first_name} {playerScore.last_name}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Player Info */}
        <div className="bg-neutral-50 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-brand-black mb-3">Player Information</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-neutral-600">
                {playerScore.first_name} {playerScore.last_name}
              </span>
              <span className="text-xs text-neutral-500">({playerScore.club})</span>
            </div>
            <div className="text-sm text-neutral-600">
              Submitted: {formatDate(playerScore.submitted_at)}
            </div>
            <div className="text-sm text-neutral-600">
              Total Score: <span className="font-semibold text-brand-neon-green">{playerScore.total_score}</span>
              {playerScore.score_to_par !== undefined && (
                <span className="ml-2">
                  ({playerScore.score_to_par > 0 ? '+' : ''}{playerScore.score_to_par})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scorecard Photo */}
        {playerScore.scorecard_photo_url && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-brand-black mb-3">Scorecard Photo</h4>
            <div className="relative">
              <img 
                src={playerScore.scorecard_photo_url} 
                alt="Scorecard" 
                className="w-full max-w-md rounded-lg border border-neutral-200"
              />
              <button
                onClick={() => window.open(playerScore.scorecard_photo_url, '_blank')}
                className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-colors"
                title="View full size"
              >
                <Camera className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
          </div>
        )}

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

export default StrokeplayDetailedScorecard; 