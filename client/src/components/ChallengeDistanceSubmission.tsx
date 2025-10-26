import React, { useState, useRef } from 'react';
import { Camera, Upload, Target, AlertCircle, CheckCircle, Trophy } from 'lucide-react';
import { toast } from 'react-toastify';
import { submitChallengeDistance, uploadChallengePhoto, type ChallengeEntry, type WeeklyChallenge } from '../services/api';
import { Modal, ModalHeader, ModalContent, ModalFooter, Button, Input, Textarea, Switch, Alert } from './ui';

interface ChallengeDistanceSubmissionProps {
  challenge: WeeklyChallenge;
  entry: ChallengeEntry;
  onClose: () => void;
  onSuccess: () => void;
}

const ChallengeDistanceSubmission: React.FC<ChallengeDistanceSubmissionProps> = ({
  challenge,
  entry,
  onClose,
  onSuccess
}) => {
  const [holeInOne, setHoleInOne] = useState(false);
  const [distanceFeet, setDistanceFeet] = useState('');
  const [distanceInches, setDistanceInches] = useState('');
  const [scoreOnHole, setScoreOnHole] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'distance' | 'photo'>('distance');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      setPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDistanceSubmit = async () => {
    if (!holeInOne) {
      const feet = parseInt(distanceFeet) || 0;
      const inches = parseInt(distanceInches) || 0;

      if (feet === 0 && inches === 0) {
        toast.error('Please enter a valid distance');
        return;
      }

      const totalInches = (feet * 12) + inches;
      if (totalInches > 600) { // Max 50 feet
        toast.error('Distance seems too large. Please check your measurement.');
        return;
      }
    }

    // Move to photo upload step
    setStep('photo');
  };

  const handleFinalSubmit = async () => {
    if (!photo) {
      toast.error('Photo is required');
      return;
    }

    setSubmitting(true);

    try {
      // Calculate total distance in inches
      const feet = parseInt(distanceFeet) || 0;
      const inches = parseInt(distanceInches) || 0;
      const totalInches = holeInOne ? 0 : (feet * 12) + inches;

      // Submit distance
      await submitChallengeDistance(challenge.id, entry.id, {
        distance_from_pin_inches: totalInches,
        hole_in_one: holeInOne,
        score_on_hole: scoreOnHole ? parseInt(scoreOnHole) : undefined
      });

      // Upload photo
      await uploadChallengePhoto(challenge.id, entry.id, photo);

      toast.success('Distance and photo submitted successfully!');
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting:', err);
      toast.error(err.response?.data?.error || 'Failed to submit distance and photo');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDistancePreview = () => {
    if (holeInOne) return 'Hole-in-One!';
    const feet = parseInt(distanceFeet) || 0;
    const inches = parseInt(distanceInches) || 0;
    if (feet === 0 && inches === 0) return '--';
    return `${feet}' ${inches}"`;
  };

  return (
    <Modal open={true} onClose={onClose} size="md">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            {step === 'distance' ? (
              <Target className="w-5 h-5 text-white" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {step === 'distance' ? 'Submit Distance' : 'Upload Photo'}
            </h3>
            <p className="text-sm text-gray-500">
              {challenge.challenge_name} - Hole {challenge.designated_hole}
            </p>
          </div>
        </div>
      </ModalHeader>

      <ModalContent>
        {step === 'distance' ? (
          <div className="space-y-6">
            {/* Hole-in-One Toggle */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Hole-in-One?</div>
                    <div className="text-sm text-gray-600">Did you ace it?</div>
                  </div>
                </div>
                <Switch
                  checked={holeInOne}
                  onChange={(checked) => setHoleInOne(checked)}
                  size="lg"
                />
              </div>
            </div>

            {/* Distance Input */}
            {!holeInOne && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Distance from Pin *
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={distanceFeet}
                      onChange={(e) => setDistanceFeet(e.target.value)}
                      placeholder="0"
                      required={!holeInOne}
                    />
                    <label className="block text-xs text-gray-500 mt-1">Feet</label>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="11"
                      value={distanceInches}
                      onChange={(e) => setDistanceInches(e.target.value)}
                      placeholder="0"
                    />
                    <label className="block text-xs text-gray-500 mt-1">Inches</label>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Preview: <strong>{formatDistancePreview()}</strong>
                </div>
              </div>
            )}

            {/* Score on Hole */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score on Hole (optional)
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={scoreOnHole}
                onChange={(e) => setScoreOnHole(e.target.value)}
                placeholder="Enter your score"
              />
            </div>

            <Alert variant="info">
              <AlertCircle className="w-4 h-4" />
              <div className="text-sm">
                Make sure to measure accurately! Your distance will be verified by an admin along with your photo.
              </div>
            </Alert>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Distance Summary */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">Your Submission</div>
              <div className="text-2xl font-bold text-indigo-600">
                {formatDistancePreview()}
              </div>
              {scoreOnHole && (
                <div className="text-sm text-gray-600 mt-2">
                  Score: {scoreOnHole}
                </div>
              )}
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Photo Evidence *
              </label>

              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="absolute top-2 right-2"
                  >
                    Change Photo
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                >
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload photo
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <Alert variant="danger">
              <AlertCircle className="w-4 h-4" />
              <div className="text-sm">
                <strong>Important:</strong> Photo must clearly show your ball's position relative to the pin.
                Photos may be verified by an admin before final standings.
              </div>
            </Alert>
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button
          type="button"
          onClick={step === 'distance' ? onClose : () => setStep('distance')}
          variant="secondary"
          disabled={submitting}
        >
          {step === 'distance' ? 'Cancel' : 'Back'}
        </Button>
        <Button
          type="button"
          onClick={step === 'distance' ? handleDistanceSubmit : handleFinalSubmit}
          variant="primary"
          disabled={submitting}
          loading={submitting}
        >
          {step === 'distance' ? (
            <>Next: Upload Photo</>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit Entry
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ChallengeDistanceSubmission;
