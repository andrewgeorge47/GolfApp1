import React, { useEffect } from 'react';
import { User, Calendar, Target } from 'lucide-react';
import { PlayerInfo as PlayerInfoType } from '../hooks/useScoreCalculator';

interface PlayerInfoProps {
  playerInfo: PlayerInfoType;
  onUpdate: (field: keyof PlayerInfoType, value: string | number) => void;
  errors?: string[];
  userInfo?: {
    name: string;
    handicap: number;
  };
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  playerInfo,
  onUpdate,
  errors = [],
  userInfo
}) => {
  // Auto-populate with user info if provided and fields are empty
  useEffect(() => {
    if (userInfo) {
      if (!playerInfo.name && userInfo.name) {
        onUpdate('name', userInfo.name);
      }
      if (playerInfo.handicap === 0 && userInfo.handicap) {
        onUpdate('handicap', userInfo.handicap);
      }
    }
  }, [userInfo, playerInfo.name, playerInfo.handicap, onUpdate]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center">
        <User className="w-5 h-5 mr-2" />
        Player Information
      </h2>

      {errors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <ul className="list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Player Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Name *
          </label>
          <div className="relative">
            <input
              type="text"
              value={playerInfo.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              placeholder="Enter your name"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date *
          </label>
          <div className="relative">
            <input
              type="date"
              value={playerInfo.date}
              onChange={(e) => onUpdate('date', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Handicap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Handicap
          </label>
          <div className="relative">
            <input
              type="number"
              value={playerInfo.handicap}
              onChange={(e) => onUpdate('handicap', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              max="54"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
            <Target className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerInfo; 