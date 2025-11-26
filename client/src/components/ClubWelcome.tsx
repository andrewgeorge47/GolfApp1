import React, { useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, Trophy, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import { RadioGroup } from './ui/Checkbox';

interface ClubWelcomeProps {
  onComplete: (score: number) => void;
  onBack?: () => void;
}

const agreementQuestions = [
  {
    id: 1,
    question: 'Will you treat this club like it\'s yours?',
  },
  {
    id: 2,
    question: 'Will you live by both rules?',
  },
  {
    id: 3,
    question: 'Do you get what makes this different — more importantly, is it something you want to be part of?',
  },
];

const ClubWelcome: React.FC<ClubWelcomeProps> = ({ onComplete, onBack }) => {
  const [videoWatched, setVideoWatched] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [showManualContinue, setShowManualContinue] = useState(false);
  const [error, setError] = useState('');

  const handleVideoComplete = () => {
    setVideoWatched(true);
    setTimeout(() => setShowAgreement(true), 500);
  };

  const handleAnswerChange = (questionId: number, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: String(value) }));
    setError('');
  };

  const allAnswered = Object.keys(answers).length === agreementQuestions.length;
  const allYes = allAnswered && agreementQuestions.every((q) => answers[q.id] === 'yes');

  const handleSubmit = () => {
    if (!allAnswered) {
      setError('Please answer all questions.');
      return;
    }

    setSubmitted(true);

    if (allYes) {
      // Auto-redirect on success
      setTimeout(() => onComplete(3), 1500);
      // Show manual button after delay as fallback
      setTimeout(() => setShowManualContinue(true), 3000);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setShowManualContinue(false);
    setError('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card variant="elevated" padding="lg">
        <CardHeader
          title={
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Welcome to the Club</span>
            </div>
          }
        />

        <CardContent>
          {/* Intro Text */}
          <div className="prose prose-gray max-w-none mb-8">
            <p className="text-gray-700 leading-relaxed">
              Important that we levelset across all locations and all members.
            </p>
            <p className="text-gray-700 leading-relaxed">
              First thing — watch the quick video below. It's just 2 minutes, but it matters.
              You'll not only better understand who we are, what we're doing, and why — but also
              how we make everything work, with your help.
            </p>
          </div>

          {/* Video Section */}
          <div className="mb-8">
            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
              {!videoWatched ? (
                <>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src="https://youtube.com/embed/jyJfpinJkHg"
                    title="Club Welcome Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <Button
                      variant="primary"
                      icon={CheckCircle}
                      onClick={handleVideoComplete}
                      size="lg"
                      className="shadow-lg"
                    >
                      I've Watched the Video
                    </Button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-green-900/20">
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">Video Completed!</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content after video */}
          {showAgreement && !submitted && (
            <div className="animate-fade-in">
              {/* The Contribution */}
              <div className="prose prose-gray max-w-none mb-8">
                <p className="text-gray-700 leading-relaxed">
                  This club only works because everyone — Members, Club Pros, and Neighborhood National — contributes.
                  Not just money. Effort, care, attention. That's what keeps the neighborhood real.
                </p>
              </div>

              {/* The Two Rules */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">The Two Rules</h3>

                <div className="space-y-4 mb-6">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-dark-green text-white flex items-center justify-center font-bold">1</span>
                    <p className="text-gray-800 font-medium pt-1">Treat the club like it's your own.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-dark-green text-white flex items-center justify-center font-bold">2</span>
                    <p className="text-gray-800 font-medium pt-1">Don't be an asshole.</p>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">
                  Rule #2 is simple. It's clear. And it tends to take care of itself.
                </p>
                <p className="text-gray-600 text-sm">
                  Rule #1 takes more intention. It means respecting the space and the people.
                  It means acting like a member, not a customer.
                </p>
              </div>

              {/* Examples */}
              <div className="mb-8">
                <p className="text-gray-700 mb-4">
                  No script for Rule #1 — that would defeat the point. But here are a few things it does <strong>not</strong> mean:
                </p>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex gap-2">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Hole in the wall once? Happens. Same person doing it again and again? <strong>Not okay.</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Catch the edge of the hitting strip once on accident? Happens. Keep doing it instead of moving 6 inches forward/back? <strong>Not okay.</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Bring guests? Love it. Same guests, week after week, 4+ hours, no 5-star review and no one signs up for another membership? <strong>Not okay.</strong></span>
                  </li>
                </ul>
                <p className="text-gray-700 mt-4 italic">
                  You wouldn't be OK with these sorts of these things if this club were yours — and that's the guidepost we need you to live by.
                </p>
              </div>

              {/* The Reality */}
              <div className="bg-brand-dark-green/5 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-3">The Reality</h3>
                <p className="text-gray-700 mb-3">
                  Club Pros put in more than they get back. Same for us in the Pro Shop. We're all fine with that,
                  and actually love to do it — when members contribute beyond the dues that they pay as well.
                </p>
                <p className="text-gray-700">
                  That's how this works. With everyone working together. Members, Club Pros, and Neighborhood National.
                  We're all investing — money, time, energy — into building something that doesn't exist anywhere…
                  something too good to be true from the outside, but very true once you move in.
                </p>
              </div>

              {/* Agreement Questions */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Agreement</h3>
                <p className="text-gray-600 mb-6">
                  You've watched the video, read the pledge, and seen the examples.
                  Now just a few simple questions to make sure we're on the same page:
                </p>

                <div className="space-y-6">
                  {agreementQuestions.map((question) => (
                    <div key={question.id} className="p-4 bg-white rounded-lg border border-gray-200">
                      <p className="font-medium text-gray-900 mb-3">{question.question}</p>
                      <RadioGroup
                        name={`agreement-${question.id}`}
                        options={[
                          { value: 'yes', label: 'Yes' },
                          { value: 'no', label: 'No' },
                        ]}
                        value={answers[question.id] || ''}
                        onChange={(value) => handleAnswerChange(question.id, value)}
                        orientation="horizontal"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-sm text-gray-500 mt-4 text-center">
                  All "Yes" required to unlock the waiver and booking.
                </p>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    icon={ArrowRight}
                    iconPosition="right"
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {submitted && (
            <div
              className={`p-6 rounded-lg ${
                allYes
                  ? 'bg-green-100 border border-green-300'
                  : 'bg-red-100 border border-red-300'
              }`}
            >
              <div className="flex items-center gap-4">
                {allYes ? (
                  <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  {allYes ? (
                    <>
                      <p className="text-xl font-semibold text-green-800">Welcome to the neighborhood!</p>
                      <p className="text-green-700 text-sm mt-1">Redirecting to waiver...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-semibold text-red-800">We need all Yes answers to proceed</p>
                      <p className="text-red-700 text-sm mt-1">
                        This club requires full commitment to the principles above. If you're not sure, that's okay —
                        but we can't move forward without alignment.
                      </p>
                    </>
                  )}
                </div>
                {allYes && showManualContinue && (
                  <Button
                    variant="primary"
                    icon={ArrowRight}
                    iconPosition="right"
                    onClick={() => onComplete(3)}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter divided>
          {onBack && (
            <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
              Back
            </Button>
          )}

          {submitted && !allYes && (
            <Button variant="primary" onClick={handleRetry}>
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClubWelcome;
