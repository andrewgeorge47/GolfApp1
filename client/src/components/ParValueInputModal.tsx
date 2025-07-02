import React, { useState } from 'react';
import { X, Save, Info } from 'lucide-react';

interface ParValueInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (parValues: number[]) => void;
  courseName: string;
  holes: 9 | 18;
}

const ParValueInputModal: React.FC<ParValueInputModalProps> = ({
  isOpen,
  onClose,
  onSave,
  courseName,
  holes
}) => {
  const [parValues, setParValues] = useState<number[]>(
    Array.from({ length: holes }, () => 4)
  );
  const [errors, setErrors] = useState<string[]>([]);

  const handleParChange = (holeIndex: number, value: number) => {
    const newParValues = [...parValues];
    newParValues[holeIndex] = Math.max(3, Math.min(6, value)); // Limit to 3-6
    setParValues(newParValues);
  };

  const handleSave = () => {
    const validationErrors: string[] = [];
    
    // Validate that all holes have par values
    if (parValues.some(par => par < 3 || par > 6)) {
      validationErrors.push('Par values must be between 3 and 6');
    }
    
    // Validate total par is reasonable (typically 70-74 for 18 holes, 35-37 for 9 holes)
    const totalPar = parValues.reduce((sum, par) => sum + par, 0);
    const expectedRange = holes === 18 ? [70, 74] : [35, 37];
    
    if (totalPar < expectedRange[0] || totalPar > expectedRange[1]) {
      validationErrors.push(`Total par should typically be between ${expectedRange[0]} and ${expectedRange[1]} for ${holes} holes`);
    }
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    onSave(parValues);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Set Par Values</h2>
            <p className="text-sm text-gray-600 mt-1">
              Help the community by setting par values for {courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">You're the first to submit a score for this course!</p>
                <p>You're helping the community by setting the par values. Once saved, all future players will see the correct par for each hole.</p>
              </div>
            </div>
          </div>

          {/* Par Values Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Hole-by-Hole Par Values</h3>
            <div className={`grid ${holes === 18 ? 'grid-cols-9' : 'grid-cols-9'} gap-3`}>
              {parValues.map((par, index) => (
                <div key={index} className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hole {index + 1}
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="6"
                    value={par}
                    onChange={(e) => handleParChange(index, parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700">Total Par:</span>
                <span className="text-xl font-bold text-gray-900 ml-2">
                  {parValues.reduce((sum, par) => sum + par, 0)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {holes} holes • {parValues.filter(par => par === 3).length} par 3s • {parValues.filter(par => par === 4).length} par 4s • {parValues.filter(par => par === 5).length} par 5s
              </div>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <ul className="list-disc list-inside text-sm text-red-800">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Par Values</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParValueInputModal; 