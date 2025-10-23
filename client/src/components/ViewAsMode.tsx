import React, { useState, useEffect } from 'react';
import { Eye, X, User, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import api from '../services/api';
import { getAvailableRoles } from '../utils/roleUtils';

interface ViewAsModeProps {
  className?: string;
}

const ViewAsMode: React.FC<ViewAsModeProps> = ({ className = '' }) => {
  const { user, viewAsMode, enterViewAsMode, exitViewAsMode, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Array<{value: string, label: string}>>([]);
  const [availableClubs, setAvailableClubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Fetch available roles and clubs from API
    const fetchViewAsData = async () => {
      if (!isAdmin) return;
      
      try {
        setDataLoading(true);
        const response = await api.get('/admin/view-as-data');
        setAvailableRoles(response.data.roles);
        setAvailableClubs(response.data.clubs);
        
        // Set default club to user's current club if available
        if (user?.club && selectedClub === '') {
          setSelectedClub(user.club);
        }
      } catch (error) {
        console.error('Error fetching view-as data:', error);
        // Fallback to centralized role data (excluding Admin and Deactivated for view-as mode)
        const allRoles = getAvailableRoles();
        setAvailableRoles(
          allRoles.filter(r => r.value !== 'Admin' && r.value !== 'Deactivated')
        );
        setAvailableClubs([
          'No. 1', 'No. 2', 'No. 3', 'No. 4', 'No. 5', 'No. 6',
          'No. 7', 'No. 8', 'No. 9', 'No. 10', 'No. 11', 'No. 12'
        ]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchViewAsData();
  }, [isAdmin, user, selectedClub]);

  const handleEnterViewAsMode = () => {
    if (!selectedRole || !selectedClub) {
      alert('Please select both a role and club');
      return;
    }

    setLoading(true);
    try {
      enterViewAsMode(selectedRole, selectedClub);
      setIsOpen(false);
    } catch (error) {
      console.error('Error entering view-as mode:', error);
      alert('Failed to enter view-as mode');
    } finally {
      setLoading(false);
    }
  };

  const handleExitViewAsMode = () => {
    exitViewAsMode();
  };

  // Don't render if user is not an admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* View-As Mode Toggle Button */}
      {!viewAsMode.isActive && (
        <button
          onClick={() => {
            setIsOpen(true);
            // Reset selections when opening modal
            setSelectedRole('');
            setSelectedClub(user?.club || '');
          }}
          className="flex items-center justify-center p-1.5 sm:p-2 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl"
          title="Enter view-as mode"
        >
          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* View-As Mode Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">View As Mode</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Admin View-As Mode:</strong> Experience the platform from a different user's perspective. 
                  This helps with testing, debugging, and user support.
                </p>
              </div>

              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  disabled={dataLoading}
                >
                  <option value="">Select a role...</option>
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Club Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Select Club
                </label>
                <select
                  value={selectedClub}
                  onChange={(e) => setSelectedClub(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  disabled={dataLoading}
                >
                  <option value="">Select a club...</option>
                  {availableClubs.map((club) => (
                    <option key={club} value={club}>
                      {club}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Selection Preview */}
              {selectedRole && selectedClub && (
                <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>You will view the platform as a <strong>{selectedRole}</strong> from <strong>{selectedClub}</strong></span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnterViewAsMode}
                  disabled={!selectedRole || !selectedClub || loading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 text-sm shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Entering...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Activate View As</span>
                    </>
                  )}
                </button>
              </div>

              {/* Warning */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• Your admin privileges are preserved</li>
                      <li>• You can exit view-as mode anytime</li>
                      <li>• Changes made in view-as mode affect the actual user experience</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAsMode;
