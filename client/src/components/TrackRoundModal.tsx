import React, { useState } from 'react';
import { X, Target, MapPin } from 'lucide-react';

interface TrackRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoundType: (roundType: 'sim' | 'grass', holes: 9 | 18) => void;
}

const TrackRoundModal: React.FC<TrackRoundModalProps> = ({
  isOpen,
  onClose,
  onSelectRoundType
}) => {
  const handleClose = () => {
    onClose();
  };

  const handleStartRound = (roundType: 'sim' | 'grass', holes: 9 | 18) => {
    onSelectRoundType(roundType, holes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-brand-black">Track a Round</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Where are you playing today?
          </p>

          <div className="space-y-4 mb-6">
            {/* Simulator Option */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-4 mb-4">
                <div className="rounded-full p-3 bg-blue-100">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Simulator</h3>
                  <p className="text-sm text-gray-600">
                    Golf simulator round
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleStartRound('sim', 9)}
                  className="flex-1 py-2 px-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="rounded-full p-2 bg-orange-100 group-hover:bg-orange-200 transition-colors">
                      <span className="text-orange-600 font-bold text-sm">9</span>
                    </div>
                    <span className="font-medium text-gray-900">9 Holes</span>
                  </div>
                </button>
                <button
                  onClick={() => handleStartRound('sim', 18)}
                  className="flex-1 py-2 px-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="rounded-full p-2 bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <span className="text-purple-600 font-bold text-sm">18</span>
                    </div>
                    <span className="font-medium text-gray-900">18 Holes</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Outdoor Option */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-4 mb-4">
                <div className="rounded-full p-3 bg-green-100">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Outdoor</h3>
                  <p className="text-sm text-gray-600">
                    Grass golf course round
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleStartRound('grass', 9)}
                  className="flex-1 py-2 px-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="rounded-full p-2 bg-orange-100 group-hover:bg-orange-200 transition-colors">
                      <span className="text-orange-600 font-bold text-sm">9</span>
                    </div>
                    <span className="font-medium text-gray-900">9 Holes</span>
                  </div>
                </button>
                <button
                  onClick={() => handleStartRound('grass', 18)}
                  className="flex-1 py-2 px-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="rounded-full p-2 bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <span className="text-purple-600 font-bold text-sm">18</span>
                    </div>
                    <span className="font-medium text-gray-900">18 Holes</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackRoundModal; 