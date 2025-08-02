import React, { useState, useEffect, useRef } from 'react';
import { Users, Save, Plus, X, Clock, Trophy, Target, Award, Camera, Check } from 'lucide-react';
import { getTournamentParticipants, getSimulatorCourse, uploadScorecardPhoto, submitTournamentStrokeplayScore, getTournamentStrokeplayScores } from '../services/api';
import { toast } from 'react-toastify';

interface StrokeplayScoringProps {
  tournamentId: number;
  tournamentFormat: string;
  tournamentSettings: any;
  onScoreSubmitted: () => void;
  courseId?: number;
}

interface Participant {
  user_member_id: number;
  first_name: string;
  last_name: string;
  club: string;
  email: string;
}

interface ScoreForm {
  playerId: number;
  totalScore: string;
  holes: Array<{
    hole: number;
    score: string;
  }>;
  notes?: string;
}

const StrokeplayScoring: React.FC<StrokeplayScoringProps> = ({
  tournamentId,
  tournamentFormat,
  tournamentSettings,
  onScoreSubmitted,
  courseId
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submittedScores, setSubmittedScores] = useState<any[]>([]);
  const [courseData, setCourseData] = useState<any>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Participant | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreForm, setScoreForm] = useState<ScoreForm>({
    playerId: 0,
    totalScore: '',
    holes: [],
    notes: ''
  });

  // Scorecard photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scorecardPhotoUrl, setScorecardPhotoUrl] = useState<string | null>(null);

  // Get hole configuration from tournament settings
  const getHoleConfiguration = () => {
    const holeConfig = tournamentSettings?.holeConfiguration || '18';
    
    if (holeConfig === '9' || holeConfig === '9_front') {
      return { holeCount: 9, startHole: 1 };
    }
    if (holeConfig === '9_back') {
      return { holeCount: 9, startHole: 10 };
    }
    if (holeConfig === '18') {
      return { holeCount: 18, startHole: 1 };
    }
    return { holeCount: 18, startHole: 1 };
  };

  const { holeCount, startHole } = getHoleConfiguration();

  // Fetch course data if courseId is provided
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) {
        console.log('No courseId provided, skipping course data fetch');
        return;
      }
      
      console.log('Fetching course data for courseId:', courseId);
      
      try {
        setCourseLoading(true);
        const response = await getSimulatorCourse(courseId);
        console.log('Course data response:', response.data);
        
        if (response.data) {
          setCourseData(response.data);
          console.log('Course data set successfully:', response.data);
          console.log('Par values:', response.data.par_values);
        } else {
          console.log('No course data found for courseId:', courseId);
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setCourseLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [participantsResponse, scoresResponse] = await Promise.all([
          getTournamentParticipants(tournamentId),
          getTournamentStrokeplayScores(tournamentId)
        ]);
        setParticipants(participantsResponse.data || []);
        setSubmittedScores(scoresResponse.data || []);
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        toast.error('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId]);

  const handlePlayerSelect = (player: Participant) => {
    setSelectedPlayer(player);
    setScoreForm({
      playerId: player.user_member_id,
      totalScore: '',
      holes: Array(holeCount).fill('').map((_, i) => ({ 
        hole: startHole + i, 
        score: '' 
      })),
      notes: ''
    });
    setScorecardPhotoUrl(null);
    setShowScoreModal(true);
  };

  const handleHoleScoreChange = (holeIndex: number, value: string) => {
    const newHoles = [...scoreForm.holes];
    newHoles[holeIndex] = { ...newHoles[holeIndex], score: value };
    
    // Calculate total score
    const total = newHoles.reduce((sum, hole) => sum + (parseInt(hole.score) || 0), 0);
    
    setScoreForm({
      ...scoreForm,
      holes: newHoles,
      totalScore: total.toString()
    });
  };

  const handleTotalScoreChange = (value: string) => {
    setScoreForm({
      ...scoreForm,
      totalScore: value
    });
  };

  const handleSubmitScore = async () => {
    if (!selectedPlayer) return;

    console.log('Submitting strokeplay score for player:', selectedPlayer);
    console.log('Score form:', scoreForm);
    console.log('Scorecard photo URL:', scorecardPhotoUrl);

    // Validate scores
    const hasValidScores = scoreForm.holes.some(hole => hole.score !== '');
    if (!hasValidScores) {
      toast.error('Please enter at least some hole scores');
      return;
    }

    if (!scoreForm.totalScore || parseInt(scoreForm.totalScore) === 0) {
      toast.error('Please enter a valid total score');
      return;
    }

    setSubmitting(true);

    try {
      // Submit strokeplay score using the new dedicated endpoint
      const scoreData = {
        total_score: parseInt(scoreForm.totalScore),
        hole_scores: scoreForm.holes.map(hole => ({
          hole: hole.hole,
          score: parseInt(hole.score) || 0
        })),
        notes: scoreForm.notes,
        scorecard_photo_url: scorecardPhotoUrl || undefined,
        player_id: selectedPlayer.user_member_id
      };
      
      console.log('Submitting strokeplay score data:', scoreData);
      const response = await submitTournamentStrokeplayScore(tournamentId, scoreData);
      console.log('Tournament strokeplay score response:', response.data);

      toast.success(`Score submitted for ${selectedPlayer.first_name} ${selectedPlayer.last_name}`);
      setShowScoreModal(false);
      setSelectedPlayer(null);
      setScoreForm({
        playerId: 0,
        totalScore: '',
        holes: [],
        notes: ''
      });
      setScorecardPhotoUrl(null);
      
      // Refresh submitted scores
      try {
        const scoresResponse = await getTournamentStrokeplayScores(tournamentId);
        setSubmittedScores(scoresResponse.data || []);
      } catch (error) {
        console.error('Error refreshing submitted scores:', error);
      }
      
      onScoreSubmitted();
    } catch (error: any) {
      console.error('Error submitting strokeplay score:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to submit score: ' + (error.response?.data?.error || error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTournamentFormat = (format: string) => {
    return format.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Photo upload handlers
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('Photo upload started:', file.name, file.size, file.type);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      console.log('Uploading photo to server...');
      const response = await uploadScorecardPhoto(file);
      console.log('Photo upload response:', response.data);
      
      if (response.data.success) {
        setScorecardPhotoUrl(response.data.photoUrl);
        toast.success('Scorecard photo uploaded successfully');
        console.log('Photo URL set:', response.data.photoUrl);
      } else {
        console.error('Upload failed:', response.data);
        toast.error('Upload failed: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      console.error('Error details:', err.response?.data);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-none sm:rounded-xl border border-neutral-200 p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-brand-neon-green" />
            <h3 className="text-xl font-bold text-brand-black">Strokeplay Scoring</h3>
          </div>
          <div className="text-sm text-neutral-600">
            {formatTournamentFormat(tournamentFormat)} • {holeCount} holes
          </div>
        </div>
        <p className="text-neutral-600 mt-2">
          Submit individual player scores for {formatTournamentFormat(tournamentFormat)} tournament. 
          Lowest total score wins.
        </p>
        {courseData && (
          <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
            <div className="text-sm text-neutral-700">
              <div className="font-medium">{courseData.name}</div>
              {courseData.location && <div className="text-neutral-600">{courseData.location}</div>}
              {courseData.designer && <div className="text-neutral-600">by {courseData.designer}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Participants Grid */}
      <div className="bg-white rounded-none sm:rounded-xl border border-neutral-200 p-3 sm:p-6">
        <h4 className="text-lg font-semibold text-brand-black mb-4">Tournament Participants</h4>
        
        {participants.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No participants registered</h3>
            <p className="text-neutral-600">
              Players need to register for the tournament before scores can be submitted.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {participants.map((participant) => {
              const submittedScore = submittedScores.find(score => score.user_id === participant.user_member_id);
              const hasSubmitted = !!submittedScore;
              
              return (
                <div
                  key={participant.user_member_id}
                  className={`border rounded-lg p-3 sm:p-4 transition-all ${
                    hasSubmitted 
                      ? 'border-green-300 bg-green-50 cursor-default' 
                      : 'border-neutral-200 hover:border-brand-neon-green hover:shadow-md cursor-pointer'
                  }`}
                  onClick={hasSubmitted ? undefined : () => handlePlayerSelect(participant)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-brand-black">
                      {participant.first_name} {participant.last_name}
                    </h5>
                    {hasSubmitted ? (
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {submittedScore.total_strokes}
                        </span>
                      </div>
                    ) : (
                      <Plus className="w-4 h-4 text-brand-neon-green" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">{participant.club}</p>
                  <p className="text-xs text-neutral-500">{participant.email}</p>
                  <div className="mt-3">
                    {hasSubmitted ? (
                      <div className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Score Submitted
                      </div>
                    ) : (
                      <button className="w-full px-3 py-2 bg-brand-neon-green text-brand-black rounded-lg text-sm font-medium hover:bg-green-400 transition-colors">
                        Submit Score
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strokeplay Scoring Modal */}
      {showScoreModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-brand-black">
                Strokeplay Scoring - {selectedPlayer.first_name} {selectedPlayer.last_name}
              </h3>
              <button
                onClick={() => setShowScoreModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Player Info */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4 text-center">Player Information</h4>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-neutral-600 font-medium">
                        {selectedPlayer.first_name} {selectedPlayer.last_name}
                      </p>
                      <p className="text-xs text-neutral-500">{selectedPlayer.club}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hole-by-Hole Scoring */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4">Hole-by-Hole Scores</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-300 rounded-lg">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Hole</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Par</th>
                        <th className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreForm.holes.map((hole, index) => {
                        // Calculate the correct par value index based on hole configuration
                        const parValueIndex = startHole - 1 + index;
                        const parValue = courseData?.par_values?.[parValueIndex] || (tournamentSettings?.tee === 'Par 3' ? 3 : 4);
                        console.log(`Strokeplay scoring - Hole ${hole.hole}: parValueIndex=${parValueIndex}, parValue=${parValue}, courseData.par_values=`, courseData?.par_values);
                        return (
                          <tr key={hole.hole} className="hover:bg-neutral-50">
                            <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                              {hole.hole}
                            </td>
                            <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-500">
                              {parValue}
                            </td>
                            <td className="border border-neutral-300 px-3 py-2">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={hole.score}
                                onChange={e => handleHoleScoreChange(index, e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-brand-neon-green focus:border-transparent text-center"
                                placeholder="-"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-neutral-100 font-semibold">
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          Total
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600">
                          {(() => {
                            if (courseData?.par_values) {
                              const relevantParValues = courseData.par_values.slice(startHole - 1, startHole - 1 + holeCount);
                              return relevantParValues.reduce((sum: number, par: number) => sum + par, 0);
                            }
                            return holeCount * (tournamentSettings?.tee === 'Par 3' ? 3 : 4);
                          })()}
                        </td>
                        <td className="border border-neutral-300 px-3 py-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={scoreForm.totalScore}
                            onChange={e => handleTotalScoreChange(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-brand-neon-green focus:border-transparent text-center font-semibold"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scorecard Photo Upload */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4">Scorecard Photo (Optional)</h4>
                <div className="space-y-4">
                  {scorecardPhotoUrl ? (
                    <div className="relative">
                      <img 
                        src={scorecardPhotoUrl} 
                        alt="Scorecard" 
                        className="w-full max-w-md h-auto rounded-lg border border-neutral-300"
                      />
                      <button
                        onClick={() => setScorecardPhotoUrl(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
                      <Camera className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                      <p className="text-neutral-600 mb-2">Upload a photo of your scorecard</p>
                      <button
                        onClick={triggerPhotoUpload}
                        disabled={uploadingPhoto}
                        className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
                      >
                        {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-brand-black mb-4">Additional Notes</h4>
                <textarea
                  value={scoreForm.notes}
                  onChange={e => setScoreForm({ ...scoreForm, notes: e.target.value })}
                  placeholder="Optional notes about the round..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScoreModal(false)}
                  className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitScore}
                  disabled={!scoreForm.totalScore || parseInt(scoreForm.totalScore) === 0 || submitting}
                  className="px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Score'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrokeplayScoring; 