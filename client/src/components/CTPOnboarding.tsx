import React, { useState } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, Target, Users, Settings, Camera, Trophy, Upload } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface CTPOnboardingProps {
  onComplete: () => void;
  onBack?: () => void;
  challengeHole?: number;
  courseName?: string;
}

const CTPOnboarding: React.FC<CTPOnboardingProps> = ({
  onComplete,
  onBack,
  challengeHole,
  courseName
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Closest to the Pin',
      icon: <Trophy className="w-6 h-6 text-yellow-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            You're about to enter a Closest to the Pin challenge! This is a fun, competitive way to test your accuracy on a specific hole.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Here's how it works:</strong> You'll set up a one-person scramble in GSPro, taking four shots at the designated hole.
            Your best shot counts, and the closest to the pin wins!
          </p>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">This Week's Challenge</h4>
            {courseName && (
              <div className="text-sm mb-1">
                <span className="text-gray-600">Course:</span>{' '}
                <span className="font-medium">{courseName}</span>
              </div>
            )}
            {challengeHole && (
              <div className="text-sm">
                <span className="text-gray-600">Hole:</span>{' '}
                <span className="font-medium">#{challengeHole}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 italic">
            Don't worry - we'll walk you through the entire setup process step by step.
          </p>
        </div>
      )
    },
    {
      title: 'Step 1: Start the Match',
      icon: <Target className="w-6 h-6 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Launch GSPro and start your match:</h4>
            <ol className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                <span>Launch <strong>GSPro</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                <span>From the welcome screen, select <strong>Local Match</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                <span>Search for <strong>{courseName || 'the course listed for this week\'s challenge'}</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                <span>Click <strong>Play Now</strong></span>
              </li>
            </ol>
          </div>

          {/* Image placeholder for Step 1 */}
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <img
              src="/ctp-tutorial/image2.png"
              alt="GSPro Local Match Screen"
              className="w-full h-auto"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Step 2: Add Players (The Key Part!)',
      icon: <Users className="w-6 h-6 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-yellow-600" />
              This is the important part!
            </h4>
            <p className="text-gray-700">
              You're going to add <strong>yourself four times</strong>. This creates a scramble format where you can take four shots.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Here's how:</h4>
            <ol className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-green-600 flex-shrink-0">1.</span>
                <span>Add your player</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-green-600 flex-shrink-0">2.</span>
                <span>Add the same player again</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-green-600 flex-shrink-0">3.</span>
                <span>Add the same player again</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-green-600 flex-shrink-0">4.</span>
                <span>Add the same player again</span>
              </li>
            </ol>
            <p className="mt-3 text-gray-700">
              You should now see your name listed <strong>four times</strong>.
            </p>
            <p className="mt-2 text-gray-700">
              Then, <strong>assign all four to the same team color</strong>.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>Playing with a friend?</strong> Player 1 adds themselves four times with one team color,
              Player 2 adds themselves four times with a different team color. GSPro supports up to 8 total players.
            </p>
          </div>

          {/* Image placeholder for Step 2 */}
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <img
              src="/ctp-tutorial/image3.png"
              alt="Adding Players in GSPro"
              className="w-full h-auto"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Step 3: Match Settings',
      icon: <Settings className="w-6 h-6 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Open <strong>Match Settings</strong> and configure the following to ensure fair play:
          </p>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Essential Settings:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Format:</span>{' '}
                <span className="font-medium">Scramble</span>
              </div>
              <div>
                <span className="text-gray-600">Pin Placement:</span>{' '}
                <span className="font-medium">As designated for challenge</span>
              </div>
              <div>
                <span className="text-gray-600">Mulligans:</span>{' '}
                <span className="font-medium text-red-600">OFF</span>
              </div>
              <div>
                <span className="text-gray-600">Tee Box:</span>{' '}
                <span className="font-medium">As designated for challenge</span>
              </div>
              <div>
                <span className="text-gray-600">Putting:</span>{' '}
                <span className="font-medium">Pick Your Putt</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Course Setup:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Green Firmness:</span>{' '}
                <span className="font-medium">Normal</span>
              </div>
              <div>
                <span className="text-gray-600">Fairway Firmness:</span>{' '}
                <span className="font-medium">Normal</span>
              </div>
              <div>
                <span className="text-gray-600">Elevation:</span>{' '}
                <span className="font-medium">Course</span>
              </div>
              <div>
                <span className="text-gray-600">Stimp:</span>{' '}
                <span className="font-medium">11</span>
              </div>
              <div>
                <span className="text-gray-600">Wind:</span>{' '}
                <span className="font-medium">No wind</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              *Unless noted otherwise in the challenge settings
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Holes:</h4>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-purple-600">•</span>
                <span>Deselect all holes</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-purple-600">•</span>
                <span>Select only <strong>Hole {challengeHole || '[challenge hole]'}</strong></span>
              </li>
            </ol>
          </div>

          <div className="text-center">
            <Button variant="primary" size="sm" className="pointer-events-none">
              Click Play
            </Button>
          </div>

          {/* Image placeholder for Step 3 */}
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <img
              src="/ctp-tutorial/image4.png"
              alt="Match Settings in GSPro"
              className="w-full h-auto"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Step 4: Take Your Shots',
      icon: <Target className="w-6 h-6 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            You'll be placed on the tee. Now it's time to show what you've got!
          </p>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Taking Your Shots:</h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Hit all four shots at the pin</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>If a shot goes into water or a hazard, choose <strong>Drop Zone</strong> so you can finish the sequence</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-gray-700">
              After all four shots, GSPro will show the <strong>Pick Your Shot</strong> screen.
              This is where the magic happens!
            </p>
          </div>

        </div>
      )
    },
    {
      title: 'Step 5: Pick Your Shot Screen (Critical!)',
      icon: <Camera className="w-6 h-6 text-red-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Camera className="w-5 h-5 text-red-600" />
              This screen is your official distance summary!
            </h4>
            <p className="text-gray-700">
              The Pick Your Shot screen shows each shot and how far it finished from the pin.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">What you'll see:</h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Each of your four shots</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>How far each shot finished from the pin</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Which shot is closest (this is what you'll submit!)</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">📸 What you need to do:</h4>
            <ol className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-yellow-600">1.</span>
                <span>Note which shot is closest and the distance</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-yellow-600">2.</span>
                <span><strong>Take a picture of this screen with your phone</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-yellow-600">3.</span>
                <span>Make sure the player name and distances are visible</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-yellow-600">4.</span>
                <span>Make sure the Windows date/time (bottom right) is visible</span>
              </li>
            </ol>
          </div>

          {/* Image placeholder for Step 5 */}
          <div className="rounded-lg overflow-hidden border border-gray-300">
            <img
              src="/ctp-tutorial/image5.png"
              alt="Pick Your Shot Screen in GSPro"
              className="w-full h-auto"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Step 6: Submit to the Portal',
      icon: <Upload className="w-6 h-6 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Now that you have your photo and know your best distance, it's time to submit your entry!
          </p>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Submission Steps:</h4>
            <ol className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-indigo-600">1.</span>
                <span>After entering the challenge, click <strong>"Submit Distance & Photo"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-indigo-600">2.</span>
                <span>Enter the distance of your closest shot</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-indigo-600">3.</span>
                <span>Upload the photo you took of the Pick Your Shot screen</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-indigo-600">4.</span>
                <span>Submit and check the leaderboard to see where you rank!</span>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Optional: Re-Up!</h4>
            <p className="text-gray-700 text-sm">
              After finishing, you can tap <strong>Play Again</strong> on the scorecard.
              You'll be taken right back to the tee to do another set of four shots.
              Want to improve your score? Just re-enter the challenge!
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-center text-gray-700 font-medium">
              That's it! You're ready to compete. Good luck! 🎯
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (isFirstStep && onBack) {
      onBack();
    } else if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card variant="elevated" padding="lg">
        <CardHeader
          title={
            <div className="flex items-center gap-3">
              {currentStepData.icon}
              <span>{currentStepData.title}</span>
            </div>
          }
        />

        <CardContent>
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="animate-fade-in">
            {currentStepData.content}
          </div>
        </CardContent>

        <CardFooter divided>
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={handleBack}
              disabled={isFirstStep && !onBack}
            >
              {isFirstStep ? 'Cancel' : 'Back'}
            </Button>

            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-blue-600 w-4'
                      : index < currentStep
                      ? 'bg-blue-400'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="primary"
              icon={isLastStep ? CheckCircle : ArrowRight}
              iconPosition="right"
              onClick={handleNext}
            >
              {isLastStep ? 'Got It!' : 'Next'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CTPOnboarding;
