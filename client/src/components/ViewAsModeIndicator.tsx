import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../AuthContext';

const ViewAsModeIndicator: React.FC = () => {
  const { viewAsMode, exitViewAsMode } = useAuth();

  if (!viewAsMode.isActive) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-40 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg border-2 border-yellow-600 flex items-center space-x-2">
      <AlertTriangle className="w-4 h-4" />
      <span className="font-semibold">Viewing as:</span>
      <span className="font-bold">{viewAsMode.viewAsPrimaryRole}</span>
      <span className="text-yellow-800">from</span>
      <span className="font-bold">{viewAsMode.viewAsClub}</span>
      <button
        onClick={exitViewAsMode}
        className="ml-2 p-1 hover:bg-yellow-600 rounded transition-colors"
        title="Exit view-as mode"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewAsModeIndicator;
