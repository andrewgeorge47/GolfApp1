import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { getUserSimStats, getUserGrassStats, SimStats } from '../services/api';
import { Target, MapPin, TrendingUp, Calendar, Award, Circle, BarChart3, Clock } from 'lucide-react';

const RoundStatistics: React.FC = () => {
  const { user } = useAuth();
  const [simStats, setSimStats] = useState<SimStats | null>(null);
  const [grassStats, setGrassStats] = useState<SimStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sim' | 'grass' | 'overview'>('overview');

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.member_id) return;

      try {
        setLoading(true);
        const [simResponse, grassResponse] = await Promise.all([
          getUserSimStats(user.member_id),
          getUserGrassStats(user.member_id)
        ]);

        setSimStats(simResponse.data);
        setGrassStats(grassResponse.data);
      } catch (err) {
        setError('Failed to load statistics');
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.member_id]);

  const totalRounds = (simStats?.total_rounds || 0) + (grassStats?.total_rounds || 0);
  const totalCourses = (simStats?.unique_courses || 0) + (grassStats?.unique_courses || 0);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-12 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-brand-neon-green text-brand-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('sim')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'sim'
                ? 'bg-brand-neon-green text-brand-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Simulator
          </button>
          <button
            onClick={() => setActiveTab('grass')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'grass'
                ? 'bg-brand-neon-green text-brand-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Outdoor
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3" />
              Overall Performance
            </h2>
            
            {totalRounds > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{totalRounds}</div>
                    <div className="text-sm text-gray-600">Total Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">{totalCourses}</div>
                    <div className="text-sm text-gray-600">Courses Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {simStats?.total_rounds || 0}
                    </div>
                    <div className="text-sm text-gray-600">Simulator Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {grassStats?.total_rounds || 0}
                    </div>
                    <div className="text-sm text-gray-600">Outdoor Rounds</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Simulator Summary */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <Target className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-800">Simulator</h3>
                    </div>
                    {simStats && simStats.total_rounds > 0 ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Differential:</span>
                          <span className="font-semibold">
                            {simStats.avg_differential ? Number(simStats.avg_differential).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Best Differential:</span>
                          <span className="font-semibold">
                            {simStats.best_differential ? Number(simStats.best_differential).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Courses Played:</span>
                          <span className="font-semibold">{simStats.unique_courses}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No simulator rounds yet</p>
                    )}
                  </div>

                  {/* Outdoor Summary */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <MapPin className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-800">Outdoor</h3>
                    </div>
                    {grassStats && grassStats.total_rounds > 0 ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Differential:</span>
                          <span className="font-semibold">
                            {grassStats.avg_differential ? Number(grassStats.avg_differential).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Best Differential:</span>
                          <span className="font-semibold">
                            {grassStats.best_differential ? Number(grassStats.best_differential).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Courses Played:</span>
                          <span className="font-semibold">{grassStats.unique_courses}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No outdoor rounds yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Rounds Tracked Yet</h3>
                <p className="text-gray-600 mb-6">Start tracking your rounds to see your performance statistics here.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Target className="w-4 h-4 mr-2" />
                    Track Simulator Round
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <MapPin className="w-4 h-4 mr-2" />
                    Track Outdoor Round
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simulator Tab */}
        {activeTab === 'sim' && (
          <div>
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <Target className="w-6 h-6 mr-3" />
              Simulator Performance
            </h2>
            
            {simStats && simStats.total_rounds > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{simStats.total_rounds}</div>
                    <div className="text-sm text-gray-600">Total Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {simStats.avg_differential ? Number(simStats.avg_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Avg Differential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {simStats.best_differential ? Number(simStats.best_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Best Differential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{simStats.unique_courses}</div>
                    <div className="text-sm text-gray-600">Courses Played</div>
                  </div>
                </div>

                {/* Recent Rounds */}
                {simStats.recent_rounds.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Recent Rounds
                    </h3>
                    <div className="space-y-3">
                      {simStats.recent_rounds.slice(0, 5).map((round, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{round.course_name}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(round.date_played).toLocaleDateString()} • {round.round_type}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{round.total_strokes} strokes</div>
                            {round.differential && (
                              <div className="text-sm text-gray-600">
                                {Number(round.differential).toFixed(1)} differential
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Simulator Rounds Yet</h3>
                <p className="text-gray-600 mb-6">Start tracking your simulator rounds to see your performance statistics here.</p>
                <button className="inline-flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors">
                  <Circle className="w-4 h-4 mr-2" />
                  Track Your First Round
                </button>
              </div>
            )}
          </div>
        )}

        {/* Outdoor Tab */}
        {activeTab === 'grass' && (
          <div>
            <h2 className="text-2xl font-bold text-brand-black mb-6 flex items-center">
              <MapPin className="w-6 h-6 mr-3" />
              Outdoor Performance
            </h2>
            
            {grassStats && grassStats.total_rounds > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{grassStats.total_rounds}</div>
                    <div className="text-sm text-gray-600">Total Rounds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {grassStats.avg_differential ? Number(grassStats.avg_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Avg Differential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {grassStats.best_differential ? Number(grassStats.best_differential).toFixed(1) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Best Differential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{grassStats.unique_courses}</div>
                    <div className="text-sm text-gray-600">Courses Played</div>
                  </div>
                </div>

                {/* Recent Rounds */}
                {grassStats.recent_rounds.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Recent Rounds
                    </h3>
                    <div className="space-y-3">
                      {grassStats.recent_rounds.slice(0, 5).map((round, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{round.course_name}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(round.date_played).toLocaleDateString()} • {round.round_type}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{round.total_strokes} strokes</div>
                            {round.differential && (
                              <div className="text-sm text-gray-600">
                                {Number(round.differential).toFixed(1)} differential
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Outdoor Rounds Yet</h3>
                <p className="text-gray-600 mb-6">Start tracking your outdoor rounds to see your performance statistics here.</p>
                <button className="inline-flex items-center px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors">
                  <Circle className="w-4 h-4 mr-2" />
                  Track Your First Round
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoundStatistics; 