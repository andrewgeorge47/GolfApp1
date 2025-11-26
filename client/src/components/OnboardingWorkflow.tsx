import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Calendar, ArrowLeft, RotateCcw } from 'lucide-react';
import { useAuth } from '../AuthContext';
import api from '../services/api';
import ClubWelcome from './ClubWelcome';
import WaiverAcknowledgement from './WaiverAcknowledgement';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { SimpleLoading } from './ui/SimpleLoading';

type OnboardingStep = 'welcome' | 'waiver' | 'complete';

interface OnboardingStatus {
  welcome_completed: boolean;
  waiver_acknowledged: boolean;
  onboarding_complete: boolean;
}

const OnboardingWorkflow: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const clubName = user?.club || 'No. 5'; // User's assigned club
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  // Fetch current onboarding status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await api.get('/user/onboarding-status');
        const status = response.data;
        setOnboardingStatus(status);

        // Determine which step to show
        if (status.onboarding_complete) {
          setCurrentStep('complete');
        } else if (status.welcome_completed) {
          setCurrentStep('waiver');
        } else {
          setCurrentStep('welcome');
        }
      } catch (err: any) {
        console.error('Error fetching onboarding status:', err);
        // If no record exists, start from beginning
        setCurrentStep('welcome');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleWelcomeComplete = async (score: number) => {
    try {
      await api.post('/user/onboarding/welcome', { quiz_score: score });
      setCurrentStep('waiver');
      setOnboardingStatus((prev) => prev ? { ...prev, welcome_completed: true } : null);
    } catch (err: any) {
      console.error('Error saving welcome completion:', err);
      setError('Failed to save progress. Please try again.');
    }
  };

  const handleWaiverComplete = async () => {
    try {
      await api.post('/user/onboarding/waiver');
      setCurrentStep('complete');
      setOnboardingStatus((prev) => prev ? { ...prev, waiver_acknowledged: true, onboarding_complete: true } : null);
      // Refresh user permissions
      await refreshUser();
    } catch (err: any) {
      console.error('Error saving waiver acknowledgement:', err);
      setError('Failed to save progress. Please try again.');
    }
  };

  const handleGoToBooking = () => {
    navigate('/simulator-booking');
  };

  const handleGoBack = () => {
    navigate('/profile');
  };

  const handleResetOnboarding = async () => {
    try {
      await api.delete('/user/onboarding');
      setOnboardingStatus(null);
      setCurrentStep('welcome');
    } catch (err) {
      console.error('Error resetting onboarding:', err);
      setError('Failed to reset onboarding');
    }
  };

  const steps = [
    { id: 'welcome', label: 'Welcome Video & Quiz', complete: onboardingStatus?.welcome_completed },
    { id: 'waiver', label: 'Waiver Acknowledgement', complete: onboardingStatus?.waiver_acknowledged },
  ];

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <SimpleLoading text="Loading your onboarding progress..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          icon={ArrowLeft}
          onClick={handleGoBack}
          className="mb-4"
        >
          Back to Profile
        </Button>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Club Onboarding
        </h1>
        <p className="text-white/80">
          Complete these steps to unlock simulator bay booking
        </p>
      </div>

      {/* Progress Indicator */}
      <Card variant="elevated" padding="md" className="mb-6">
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-3">
                  {step.complete ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : currentStep === step.id ? (
                    <div className="w-6 h-6 rounded-full bg-brand-dark-green text-white flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      step.complete
                        ? 'text-green-700'
                        : currentStep === step.id
                        ? 'text-brand-dark-green'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      step.complete ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      {currentStep === 'welcome' && (
        <ClubWelcome onComplete={handleWelcomeComplete} onBack={handleGoBack} />
      )}

      {currentStep === 'waiver' && (
        <WaiverAcknowledgement
          onComplete={handleWaiverComplete}
          onBack={() => setCurrentStep('welcome')}
        />
      )}

      {currentStep === 'complete' && (
        <Card variant="elevated" padding="lg">
          <CardContent className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Onboarding Complete!
            </h2>

            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You've completed all the required steps. You now have full access to
              book simulator bays at {clubName}.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                icon={Calendar}
                size="lg"
                onClick={handleGoToBooking}
              >
                Go to Booking
              </Button>
              <Button variant="outline" onClick={handleGoBack}>
                Back to Profile
              </Button>
            </div>

            {/* Testing only */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-400 mb-2">Testing</p>
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={handleResetOnboarding}
                className="text-gray-400 hover:text-gray-600"
              >
                Reset Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OnboardingWorkflow;
