import React from 'react';
import { Info, Monitor, Trophy, Settings } from 'lucide-react';
import { Modal, ModalHeader, ModalContent, ModalFooter, Button, Badge } from './ui';

interface ChallengeInstructionsModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  challengeName: string;
  courseName?: string;
  hole: number;
  distance?: number;
  instructions?: string;
  platforms?: string[];
  gsproSettings?: {
    pins?: string;
    putting?: string;
    elevation?: string;
    stimp?: string;
    mulligan?: string;
    gameplay?: string;
    fairway_firmness?: string;
    green_firmness?: string;
    wind?: string;
  };
  trackmanSettings?: {
    pins?: string;
    putting?: string;
    stimp?: string;
    fairway_firmness?: string;
    green_firmness?: string;
    wind?: string;
  };
  prizeImages?: {
    first?: string;
    second?: string;
    third?: string;
  };
}

const ChallengeInstructionsModal: React.FC<ChallengeInstructionsModalProps> = ({
  open,
  onClose,
  onContinue,
  challengeName,
  courseName,
  hole,
  distance,
  instructions,
  platforms = ['GSPro', 'Trackman'],
  gsproSettings,
  trackmanSettings,
  prizeImages
}) => {
  const hasGSPro = platforms.includes('GSPro');
  const hasTrackman = platforms.includes('Trackman');

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Challenge Settings</h3>
            <p className="text-sm text-gray-500">{challengeName}</p>
          </div>
        </div>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Challenge Details */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">Challenge Details</h4>
            <div className="space-y-1 text-sm">
              {courseName && (
                <div>
                  <span className="text-gray-600">Course:</span>{' '}
                  <span className="font-medium">{courseName}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Hole:</span>{' '}
                <span className="font-medium">#{hole}</span>
              </div>
              {distance && (
                <div>
                  <span className="text-gray-600">Distance:</span>{' '}
                  <span className="font-medium">{distance} yards</span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Instructions */}
          {instructions && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Important Notes
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-line">{instructions}</p>
            </div>
          )}

          {/* Platforms */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Supported Platforms
            </h4>
            <div className="flex gap-2">
              {platforms.map((platform) => (
                <Badge key={platform} variant="info">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>

          {/* GSPro Settings */}
          {hasGSPro && gsproSettings && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                GSPro Settings
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {gsproSettings.pins && (
                  <div>
                    <span className="text-gray-600">Pins:</span>{' '}
                    <span className="font-medium">{gsproSettings.pins}</span>
                  </div>
                )}
                {gsproSettings.putting && (
                  <div>
                    <span className="text-gray-600">Putting:</span>{' '}
                    <span className="font-medium">{gsproSettings.putting}</span>
                  </div>
                )}
                {gsproSettings.elevation && (
                  <div>
                    <span className="text-gray-600">Elevation:</span>{' '}
                    <span className="font-medium">{gsproSettings.elevation}</span>
                  </div>
                )}
                {gsproSettings.stimp && (
                  <div>
                    <span className="text-gray-600">Stimp:</span>{' '}
                    <span className="font-medium">{gsproSettings.stimp}</span>
                  </div>
                )}
                {gsproSettings.mulligan && (
                  <div>
                    <span className="text-gray-600">Mulligan:</span>{' '}
                    <span className="font-medium">{gsproSettings.mulligan}</span>
                  </div>
                )}
                {gsproSettings.gameplay && (
                  <div>
                    <span className="text-gray-600">Game Play:</span>{' '}
                    <span className="font-medium">{gsproSettings.gameplay}</span>
                  </div>
                )}
                {gsproSettings.fairway_firmness && (
                  <div>
                    <span className="text-gray-600">Fairway Firmness:</span>{' '}
                    <span className="font-medium">{gsproSettings.fairway_firmness}</span>
                  </div>
                )}
                {gsproSettings.green_firmness && (
                  <div>
                    <span className="text-gray-600">Green Firmness:</span>{' '}
                    <span className="font-medium">{gsproSettings.green_firmness}</span>
                  </div>
                )}
                {gsproSettings.wind && (
                  <div>
                    <span className="text-gray-600">Wind:</span>{' '}
                    <span className="font-medium">{gsproSettings.wind}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trackman Settings */}
          {hasTrackman && trackmanSettings && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Trackman Settings
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {trackmanSettings.pins && (
                  <div>
                    <span className="text-gray-600">Pins:</span>{' '}
                    <span className="font-medium">{trackmanSettings.pins}</span>
                  </div>
                )}
                {trackmanSettings.putting && (
                  <div>
                    <span className="text-gray-600">Putting:</span>{' '}
                    <span className="font-medium">{trackmanSettings.putting}</span>
                  </div>
                )}
                {trackmanSettings.stimp && (
                  <div>
                    <span className="text-gray-600">Stimp:</span>{' '}
                    <span className="font-medium">{trackmanSettings.stimp}</span>
                  </div>
                )}
                {trackmanSettings.fairway_firmness && (
                  <div>
                    <span className="text-gray-600">Fairway Firmness:</span>{' '}
                    <span className="font-medium">{trackmanSettings.fairway_firmness}</span>
                  </div>
                )}
                {trackmanSettings.green_firmness && (
                  <div>
                    <span className="text-gray-600">Green Firmness:</span>{' '}
                    <span className="font-medium">{trackmanSettings.green_firmness}</span>
                  </div>
                )}
                {trackmanSettings.wind && (
                  <div>
                    <span className="text-gray-600">Wind:</span>{' '}
                    <span className="font-medium">{trackmanSettings.wind}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prizes */}
          {(prizeImages?.first || prizeImages?.second || prizeImages?.third) && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Prizes
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {prizeImages.first && (
                  <div className="text-center">
                    <img
                      src={prizeImages.first}
                      alt="1st Place Prize"
                      className="w-full h-32 object-cover rounded-lg border-2 border-yellow-400 mb-2"
                    />
                    <Badge variant="warning">1st Place</Badge>
                  </div>
                )}
                {prizeImages.second && (
                  <div className="text-center">
                    <img
                      src={prizeImages.second}
                      alt="2nd Place Prize"
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-400 mb-2"
                    />
                    <Badge variant="default">2nd Place</Badge>
                  </div>
                )}
                {prizeImages.third && (
                  <div className="text-center">
                    <img
                      src={prizeImages.third}
                      alt="3rd Place Prize"
                      className="w-full h-32 object-cover rounded-lg border-2 border-orange-600 mb-2"
                    />
                    <Badge variant="error">3rd Place</Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onContinue}>
          Continue to Submit Shots
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ChallengeInstructionsModal;
