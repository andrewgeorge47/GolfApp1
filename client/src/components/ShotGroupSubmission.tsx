import React, { useState, useRef } from 'react';
import { X, Upload, Target, Check, Plus, Trash2, Image } from 'lucide-react';
import {
  WeeklyChallengeExtended,
  ChallengeShotGroup,
  ChallengeShot,
  uploadGroupScreenshot,
  submitGroupShots,
  uploadShotDetail
} from '../services/api';
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Button,
  Alert
} from './ui';

interface ShotGroupSubmissionProps {
  challenge: WeeklyChallengeExtended;
  group: ChallengeShotGroup;
  shotsPerGroup: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface ShotInput {
  shot_number: number;
  feet: string;
  inches: string;
  is_hole_in_one: boolean;
  detailFile?: File;
}

const ShotGroupSubmission: React.FC<ShotGroupSubmissionProps> = ({
  challenge,
  group,
  shotsPerGroup,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'screenshot' | 'shots' | 'details'>('screenshot');
  const [groupScreenshot, setGroupScreenshot] = useState<File | null>(null);
  const [screenshotDate, setScreenshotDate] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [shots, setShots] = useState<ShotInput[]>([
    { shot_number: 1, feet: '', inches: '', is_hole_in_one: false }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedShots, setSubmittedShots] = useState<ChallengeShot[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setGroupScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleScreenshotUpload = async () => {
    if (!groupScreenshot) {
      setError('Please select a screenshot');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await uploadGroupScreenshot(
        challenge.id,
        group.id,
        groupScreenshot,
        screenshotDate || undefined
      );
      setStep('shots');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload screenshot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addShot = () => {
    if (shots.length < shotsPerGroup) {
      const nextNumber = shots.length + 1;
      setShots([...shots, {
        shot_number: nextNumber,
        feet: '',
        inches: '',
        is_hole_in_one: false
      }]);
    }
  };

  const removeShot = (index: number) => {
    if (shots.length > 1) {
      const newShots = shots.filter((_, i) => i !== index);
      // Renumber shots
      setShots(newShots.map((shot, i) => ({ ...shot, shot_number: i + 1 })));
    }
  };

  const updateShot = (index: number, field: keyof ShotInput, value: any) => {
    const newShots = [...shots];
    newShots[index] = { ...newShots[index], [field]: value };

    // If marking as hole-in-one, clear distance
    if (field === 'is_hole_in_one' && value) {
      newShots[index].feet = '0';
      newShots[index].inches = '0';
    }

    setShots(newShots);
  };

  const handleShotsSubmit = async () => {
    // Validate shots
    for (const shot of shots) {
      if (!shot.is_hole_in_one && (!shot.feet && !shot.inches)) {
        setError(`Please enter distance for shot ${shot.shot_number}`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const shotsData = shots.map(shot => ({
        shot_number: shot.shot_number,
        distance_from_pin_inches: shot.is_hole_in_one
          ? 0
          : (parseInt(shot.feet || '0') * 12) + parseInt(shot.inches || '0'),
        is_hole_in_one: shot.is_hole_in_one
      }));

      const result = await submitGroupShots(challenge.id, group.id, shotsData);
      setSubmittedShots(result.data.shots);

      // Check if any shots have detail files to upload
      const shotsWithDetails = shots.filter(s => s.detailFile);
      if (shotsWithDetails.length > 0) {
        setStep('details');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit shots');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailsUpload = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload detail screenshots for each shot that has one
      for (const shot of shots) {
        if (shot.detailFile) {
          const submittedShot = submittedShots.find(s => s.shot_number === shot.shot_number);
          if (submittedShot) {
            await uploadShotDetail(challenge.id, submittedShot.id, shot.detailFile);
          }
        }
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload detail screenshots');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDistance = (feet: string, inches: string) => {
    const f = parseInt(feet || '0');
    const i = parseInt(inches || '0');
    if (f === 0 && i === 0) return '0"';
    if (f === 0) return `${i}"`;
    if (i === 0) return `${f}'`;
    return `${f}' ${i}"`;
  };

  return (
    <Modal open={true} onClose={onClose} size="md">
      <ModalHeader>
        <div>
          <div className="text-lg font-semibold">
            Submit Shots - Group {group.group_number}
          </div>
          <p className="text-sm text-gray-500 font-normal">
            {step === 'screenshot' && 'Step 1: Upload group screenshot'}
            {step === 'shots' && 'Step 2: Enter shot distances'}
            {step === 'details' && 'Step 3: Upload detail screenshots'}
          </p>
        </div>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-4">
          {/* Step 1: Screenshot Upload */}
          {step === 'screenshot' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">Screenshot Requirements:</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Show all {shotsPerGroup} shots in the group</li>
                  <li>System date visible in taskbar</li>
                  <li>Player name and hole number visible</li>
                </ul>
              </div>

              {screenshotPreview ? (
                <div className="relative">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full rounded-lg border"
                  />
                  <button
                    onClick={() => {
                      setGroupScreenshot(null);
                      setScreenshotPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click to upload screenshot</p>
                  <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotSelect}
                className="hidden"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screenshot Date <span className="text-gray-400">(from taskbar)</span>
                </label>
                <input
                  type="date"
                  value={screenshotDate}
                  onChange={(e) => setScreenshotDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Shot Distances */}
          {step === 'shots' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the distance for each shot you want to submit (1-{shotsPerGroup} shots).
              </p>

              {shots.map((shot, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Shot {shot.shot_number}</span>
                    {shots.length > 1 && (
                      <button
                        onClick={() => removeShot(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Hole-in-one toggle */}
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shot.is_hole_in_one}
                      onChange={(e) => updateShot(index, 'is_hole_in_one', e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm font-medium text-green-700">
                      Hole-in-One!
                    </span>
                  </label>

                  {!shot.is_hole_in_one && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Feet</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={shot.feet}
                          onChange={(e) => updateShot(index, 'feet', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Inches</label>
                        <input
                          type="number"
                          min="0"
                          max="11"
                          value={shot.inches}
                          onChange={(e) => updateShot(index, 'inches', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Optional detail file */}
                  <div className="mt-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600">
                      <Image className="w-4 h-4" />
                      {shot.detailFile ? (
                        <span className="text-green-600">{shot.detailFile.name}</span>
                      ) : (
                        <span>Add detail screenshot (optional)</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            updateShot(index, 'detailFile', e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Distance preview */}
                  {(shot.feet || shot.inches || shot.is_hole_in_one) && (
                    <div className="mt-2 text-sm text-gray-500">
                      Distance: {shot.is_hole_in_one ? 'HOLE-IN-ONE!' : formatDistance(shot.feet, shot.inches)}
                    </div>
                  )}
                </div>
              ))}

              {shots.length < shotsPerGroup && (
                <button
                  onClick={addShot}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Shot ({shots.length}/{shotsPerGroup})
                </button>
              )}
            </div>
          )}

          {/* Step 3: Detail Screenshots (if any) */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <Check className="w-4 h-4 inline mr-1" />
                  Shots submitted successfully! Now uploading detail screenshots...
                </p>
              </div>

              {shots.filter(s => s.detailFile).map(shot => (
                <div key={shot.shot_number} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Shot {shot.shot_number}</p>
                    <p className="text-sm text-gray-500">{shot.detailFile?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="error" className="mt-4">
              {error}
            </Alert>
          )}
        </div>
      </ModalContent>

      <ModalFooter>
        {step === 'screenshot' && (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleScreenshotUpload}
              disabled={!groupScreenshot || isSubmitting}
            >
              {isSubmitting ? 'Uploading...' : 'Next: Enter Shots'}
            </Button>
          </>
        )}

        {step === 'shots' && (
          <>
            <Button type="button" variant="secondary" onClick={() => setStep('screenshot')}>
              Back
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleShotsSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Shots'}
            </Button>
          </>
        )}

        {step === 'details' && (
          <Button
            type="button"
            variant="success"
            onClick={handleDetailsUpload}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Uploading...' : 'Complete Submission'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ShotGroupSubmission;
