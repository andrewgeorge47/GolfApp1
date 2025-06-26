import React from 'react';
import { Plus, Minus, Circle } from 'lucide-react';
import { HoleScore } from '../hooks/useScoreCalculator';

interface ScoreRowProps {
  hole: HoleScore;
  onUpdateStrokes: (value: number) => void;
  onUseMulligan: () => void;
  onRemoveMulligan: () => void;
  remainingMulligans: number;
  isPar?: number;
}

const ScoreRow: React.FC<ScoreRowProps> = ({
  hole,
  onUpdateStrokes,
  onUseMulligan,
  onRemoveMulligan,
  remainingMulligans,
  isPar
}) => {
  const getScoreColor = (strokes: number, par?: number) => {
    if (!par) return 'text-gray-900';
    if (strokes === par) return 'text-green-600';
    if (strokes === par - 1) return 'text-blue-600';
    if (strokes === par - 2) return 'text-purple-600';
    if (strokes === par + 1) return 'text-orange-600';
    if (strokes >= par + 2) return 'text-red-600';
    return 'text-gray-900';
  };

  const getScoreLabel = (strokes: number, par?: number) => {
    if (!par || strokes === 0) return '';
    if (strokes === par - 2) return 'EAGLE';
    if (strokes === par - 1) return 'BIRDIE';
    if (strokes === par) return 'PAR';
    if (strokes === par + 1) return 'BOGEY';
    if (strokes === par + 2) return 'DOUBLE';
    return `+${strokes - par}`;
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Hole Number */}
      <div className="col-span-1 text-center">
        <span className="font-semibold text-gray-700">{hole.hole}</span>
        {isPar && (
          <div className="text-xs text-gray-500">Par {isPar}</div>
        )}
      </div>

      {/* Strokes Input */}
      <div className="col-span-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onUpdateStrokes(Math.max(0, hole.strokes - 1))}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          
          <input
            type="number"
            value={hole.strokes || ''}
            onChange={(e) => onUpdateStrokes(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-16 text-center border border-gray-300 rounded-lg py-1 focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            min="0"
            max="20"
          />
          
          <button
            onClick={() => onUpdateStrokes(hole.strokes + 1)}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Score Display */}
      <div className="col-span-2 text-center">
        {hole.strokes > 0 && (
          <div className={`font-bold ${getScoreColor(hole.strokes, isPar)}`}>
            {hole.strokes}
            {getScoreLabel(hole.strokes, isPar) && (
              <div className="text-xs font-normal">{getScoreLabel(hole.strokes, isPar)}</div>
            )}
          </div>
        )}
      </div>

      {/* Mulligan Controls */}
      <div className="col-span-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={onRemoveMulligan}
            disabled={hole.mulligans <= 0}
            className="w-8 h-8 bg-red-200 hover:bg-red-300 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4 text-red-600" />
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: hole.mulligans }, (_, i) => (
              <Circle key={i} className="w-4 h-4 text-green-600" />
            ))}
          </div>
          
          <button
            onClick={onUseMulligan}
            disabled={remainingMulligans <= 0}
            className="w-8 h-8 bg-green-200 hover:bg-green-300 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-green-600" />
          </button>
        </div>
      </div>

      {/* Mulligan Count */}
      <div className="col-span-1 text-center">
        {hole.mulligans > 0 && (
          <span className="text-sm font-medium text-green-600">{hole.mulligans}</span>
        )}
      </div>

      {/* Total for Hole */}
      <div className="col-span-2 text-center">
        {hole.total > 0 && (
          <div className="font-bold text-gray-900">
            {hole.total}
            {hole.mulligans > 0 && (
              <div className="text-xs text-green-600">
                +{hole.mulligans} mully
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreRow; 