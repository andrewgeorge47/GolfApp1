import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../AuthContext';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { SimpleLoading } from './ui/SimpleLoading';

interface BookingGuardProps {
  children: React.ReactNode;
  clubName?: string;
}

// Note: This component assumes BetaProtectedRoute has already verified beta access
const BookingGuard: React.FC<BookingGuardProps> = ({ children, clubName }) => {
  const { user } = useAuth();
  // Use prop clubName if provided, otherwise use user's club, fallback to 'No. 5'
  const effectiveClubName = clubName || user?.club || 'No. 5';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);

        // Check onboarding status
        const onboardingResponse = await api.get('/user/onboarding-status');
        console.log('BookingGuard: onboarding-status response:', onboardingResponse.data);
        const isOnboardingComplete = onboardingResponse.data.onboarding_complete || false;
        setOnboardingComplete(isOnboardingComplete);

        // Check if booking is enabled for this club
        try {
          const settingsResponse = await api.get(`/club-booking-settings/${effectiveClubName}`);
          console.log('BookingGuard: club settings response:', settingsResponse.data);
          setBookingEnabled(settingsResponse.data.enabled || false);
        } catch (err: any) {
          console.error('Error checking club settings:', err);
          if (err.response?.status === 404) {
            setError('Booking settings not configured for this club');
          }
          setBookingEnabled(false);
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        setOnboardingComplete(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [effectiveClubName]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <SimpleLoading text="Checking booking access..." />
      </div>
    );
  }

  // User has completed onboarding AND booking is enabled - show booking page
  if (onboardingComplete && bookingEnabled) {
    return <>{children}</>;
  }

  // Booking is disabled for this club
  if (onboardingComplete && !bookingEnabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card variant="elevated" padding="lg">
          <CardHeader
            title={
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                <span>Booking Currently Unavailable</span>
              </div>
            }
          />

          <CardContent>
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-orange-600" />
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Booking is Disabled
              </h2>

              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {error || `Simulator bay booking is currently disabled for ${effectiveClubName}. Please check back later or contact the club for more information.`}
              </p>

              <Button variant="outline" onClick={() => navigate('/profile')}>
                Back to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User needs to complete onboarding
  return (
    <div className="max-w-2xl mx-auto">
      <Card variant="elevated" padding="lg">
        <CardHeader
          title={
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-yellow-500" />
              <span>Complete Onboarding to Unlock</span>
            </div>
          }
        />

        <CardContent>
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-yellow-600" />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Almost There!
            </h2>

            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Before you can book simulator bays, you need to complete a quick
              onboarding process. This includes watching a welcome video, answering
              a few questions, and acknowledging our waiver.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                icon={ArrowRight}
                iconPosition="right"
                size="lg"
                onClick={() => navigate('/club-onboarding')}
              >
                Start Onboarding
              </Button>
              <Button variant="ghost" onClick={() => navigate('/profile')}>
                Back to Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingGuard;
