import React from 'react';
import { X, Target, Circle } from 'lucide-react';

interface TrackRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoundType: (type: 'stroke' | 'mully') => void;
}

const TrackRoundModal: React.FC<TrackRoundModalProps> = ({
  isOpen,
  onClose,
  onSelectRoundType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-brand-black">Track a Round</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            What type of round do you want to track?
          </p>

          <div className="space-y-4">
            {/* Stroke Play Option */}
            <button
              onClick={() => onSelectRoundType('stroke')}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 rounded-full p-3 group-hover:bg-blue-200 transition-colors">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Stroke Play</h3>
                  <p className="text-sm text-gray-600">
                    Traditional golf scoring - count total strokes
                  </p>
                </div>
              </div>
            </button>

            {/* Mully Golf Option */}
            <button
              onClick={() => onSelectRoundType('mully')}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-brand-neon-green hover:bg-brand-neon-green/5 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 rounded-full p-3 group-hover:bg-green-200 transition-colors">
                  <Circle className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Mully Golf</h3>
                  <p className="text-sm text-gray-600">
                    Use mulligans strategically throughout the round
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
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