import React from 'react';
import { X, Info, Circle, Target, AlertTriangle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-brand-black flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Mully Golf Rules
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Circle className="w-5 h-5 mr-2 text-green-600" />
                What is Mully Golf?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Mully Golf is a fun variation of golf where players get a limited number of mulligans 
                (do-over shots) to use strategically throughout their round. The goal is to complete 
                the course with the lowest total score, including any mulligans used.
              </p>
            </div>

            {/* Basic Rules */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                Basic Rules
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-neon-green rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Each player gets <strong>3 mulligans</strong> per round</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-neon-green rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Mulligans can be used on any shot, including putts</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-neon-green rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>You can use multiple mulligans on the same hole</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-neon-green rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Final score = Total strokes + Total mulligans used</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-brand-neon-green rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Lowest total score wins</span>
                </li>
              </ul>
            </div>

            {/* Strategy Tips */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Strategy Tips</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Save mulligans for difficult holes or crucial putts</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Consider using mulligans on approach shots to set up easier putts</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Don't waste mulligans on shots that are already good</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Plan your mulligan usage based on the course layout</span>
                </li>
              </ul>
            </div>

            {/* Scoring Example */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Scoring Example</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-3">
                  <strong>Example Round:</strong>
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Hole 1: 4 strokes + 1 mulligan = 5 total</li>
                  <li>• Hole 2: 3 strokes + 0 mulligans = 3 total</li>
                  <li>• Hole 3: 5 strokes + 1 mulligan = 6 total</li>
                  <li>• ... (remaining holes)</li>
                  <li className="font-semibold text-gray-900 mt-2">
                    Final Score: 72 strokes + 3 mulligans = 75 total
                  </li>
                </ul>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                Important Notes
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Mulligans must be declared before taking the shot</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Once a mulligan is used, it cannot be "unused"</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>All standard golf rules apply except for mulligan usage</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Have fun and be honest about your mulligan usage!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-brand-neon-green/90 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesModal; 