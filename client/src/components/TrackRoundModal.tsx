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
  const [selectedRoundType, setSelectedRoundType] = useState<'sim' | 'grass' | null>(null);
  const [selectedHoles, setSelectedHoles] = useState<9 | 18 | null>(null);

  const handleStartRound = () => {
    if (selectedRoundType && selectedHoles) {
      onSelectRoundType(selectedRoundType, selectedHoles);
    }
  };

  const handleClose = () => {
    setSelectedRoundType(null);
    setSelectedHoles(null);
    onClose();
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
            <button
              onClick={() => setSelectedRoundType('sim')}
              className={`w-full p-4 border-2 rounded-lg transition-all duration-200 group ${
                selectedRoundType === 'sim' 
                  ? 'border-brand-neon-green bg-brand-neon-green/5' 
                  : 'border-gray-200 hover:border-brand-neon-green hover:bg-brand-neon-green/5'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`rounded-full p-3 transition-colors ${
                  selectedRoundType === 'sim' ? 'bg-blue-200' : 'bg-blue-100 group-hover:bg-blue-200'
                }`}>
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Simulator</h3>
                  <p className="text-sm text-gray-600">
                    Golf simulator round
                  </p>
                </div>
              </div>
            </button>

            {/* Outdoor Option */}
            <button
              onClick={() => setSelectedRoundType('grass')}
              className={`w-full p-4 border-2 rounded-lg transition-all duration-200 group ${
                selectedRoundType === 'grass' 
                  ? 'border-brand-neon-green bg-brand-neon-green/5' 
                  : 'border-gray-200 hover:border-brand-neon-green hover:bg-brand-neon-green/5'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`rounded-full p-3 transition-colors ${
                  selectedRoundType === 'grass' ? 'bg-green-200' : 'bg-green-100 group-hover:bg-green-200'
                }`}>
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Outdoor</h3>
                  <p className="text-sm text-gray-600">
                    Grass golf course round
                  </p>
                </div>
              </div>
            </button>
          </div>

          {selectedRoundType && (
            <>
              <p className="text-gray-600 mb-6">
                How many holes are you playing?
              </p>

              <div className="space-y-4 mb-6">
                {/* 9 Holes Option */}
                <button
                  onClick={() => setSelectedHoles(9)}
                  className={`w-full p-4 border-2 rounded-lg transition-all duration-200 group ${
                    selectedHoles === 9 
                      ? 'border-brand-neon-green bg-brand-neon-green/5' 
                      : 'border-gray-200 hover:border-brand-neon-green hover:bg-brand-neon-green/5'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-full p-3 transition-colors ${
                      selectedHoles === 9 ? 'bg-orange-200' : 'bg-orange-100 group-hover:bg-orange-200'
                    }`}>
                      <span className="text-orange-600 font-bold text-lg">9</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">9 Holes</h3>
                      <p className="text-sm text-gray-600">
                        Front or back nine
                      </p>
                    </div>
                  </div>
                </button>

                {/* 18 Holes Option */}
                <button
                  onClick={() => setSelectedHoles(18)}
                  className={`w-full p-4 border-2 rounded-lg transition-all duration-200 group ${
                    selectedHoles === 18 
                      ? 'border-brand-neon-green bg-brand-neon-green/5' 
                      : 'border-gray-200 hover:border-brand-neon-green hover:bg-brand-neon-green/5'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-full p-3 transition-colors ${
                      selectedHoles === 18 ? 'bg-purple-200' : 'bg-purple-100 group-hover:bg-purple-200'
                    }`}>
                      <span className="text-purple-600 font-bold text-lg">18</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">18 Holes</h3>
                      <p className="text-sm text-gray-600">
                        Full round
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {selectedHoles && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartRound}
                    className="px-6 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors font-medium"
                  >
                    Start Round
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - only show if no round type selected */}
        {!selectedRoundType && (
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRoundModal; 