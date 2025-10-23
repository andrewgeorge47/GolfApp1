import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserTrackingWidget from './UserTrackingWidget';
import { useAuth } from '../AuthContext';

const UserTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  React.useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate, isAdmin]);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">User Tracking Dashboard</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserTrackingWidget />
      </div>
    </div>
  );
};

export default UserTrackingPage; 