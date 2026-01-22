import React, { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Minus, Target, Award, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { environment } from '../config/environment';

interface PlayerPerformance {
  player_id: number;
  name: string;
  handicap: number;
  par3_performance: {
    holes_played: number;
    avg_vs_par: string;
    total_vs_par: number;
  };
  par4_performance: {
    holes_played: number;
    avg_vs_par: string;
    total_vs_par: number;
  };
  par5_performance: {
    holes_played: number;
    avg_vs_par: string;
    total_vs_par: number;
  };
  tee_off_performance: {
    holes_played: number;
    avg_vs_par: string;
    total_vs_par: number;
  };
}

interface PlayerPerformanceRecapProps {
  teamId: number;
  leagueId: number;
}

const PlayerPerformanceRecap: React.FC<PlayerPerformanceRecapProps> = ({ teamId, leagueId }) => {
  const [players, setPlayers] = useState<PlayerPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerPerformance();
  }, [teamId, leagueId]);

  const loadPlayerPerformance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${environment.apiBaseUrl}/leagues/teams/${teamId}/player-performance?league_id=${leagueId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load player performance');
      }

      const data = await response.json();
      setPlayers(data.players || []);
    } catch (error: any) {
      console.error('Error loading player performance:', error);
      toast.error('Failed to load player performance statistics');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (avgVsPar: string) => {
    const value = parseFloat(avgVsPar);
    if (value < 0) return 'text-green-600';
    if (value > 0) return 'text-red-600';
    return 'text-neutral-600';
  };

  const getPerformanceIcon = (avgVsPar: string) => {
    const value = parseFloat(avgVsPar);
    if (value < 0) return <TrendingDown className="w-4 h-4 text-green-600" />;
    if (value > 0) return <TrendingUp className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-neutral-600" />;
  };

  const formatVsPar = (avgVsPar: string) => {
    const value = parseFloat(avgVsPar);
    if (value > 0) return `+${avgVsPar}`;
    return avgVsPar;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-neon-green animate-spin" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
        <Target className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-600 mb-2">No Performance Data Yet</h3>
        <p className="text-neutral-500">
          Player performance statistics will appear here once scores have been submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Award className="w-6 h-6 text-brand-neon-green" />
          <h3 className="text-xl font-semibold text-brand-black">Round Recap - Player Performance</h3>
        </div>
        <p className="text-sm text-neutral-600 mb-6">
          Performance metrics across all submitted rounds, showing average scoring vs par by hole type
        </p>

        {players.map((player) => (
          <div key={player.player_id} className="mb-8 last:mb-0">
            {/* Player Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-neutral-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-brand-teal rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {player.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-brand-black">{player.name}</h4>
                  <p className="text-sm text-neutral-600">Handicap: {player.handicap}</p>
                </div>
              </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Par 3 Performance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-neutral-700 uppercase">Par 3s</h5>
                  {getPerformanceIcon(player.par3_performance.avg_vs_par)}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-600">Avg vs Par:</span>
                    <span className={`text-2xl font-bold ${getPerformanceColor(player.par3_performance.avg_vs_par)}`}>
                      {formatVsPar(player.par3_performance.avg_vs_par)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Holes Played:</span>
                    <span className="text-xs font-medium text-neutral-700">{player.par3_performance.holes_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Total vs Par:</span>
                    <span className={`text-xs font-medium ${getPerformanceColor(player.par3_performance.total_vs_par.toString())}`}>
                      {player.par3_performance.total_vs_par > 0 ? '+' : ''}{player.par3_performance.total_vs_par}
                    </span>
                  </div>
                </div>
              </div>

              {/* Par 4 Performance */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-neutral-700 uppercase">Par 4s</h5>
                  {getPerformanceIcon(player.par4_performance.avg_vs_par)}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-600">Avg vs Par:</span>
                    <span className={`text-2xl font-bold ${getPerformanceColor(player.par4_performance.avg_vs_par)}`}>
                      {formatVsPar(player.par4_performance.avg_vs_par)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Holes Played:</span>
                    <span className="text-xs font-medium text-neutral-700">{player.par4_performance.holes_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Total vs Par:</span>
                    <span className={`text-xs font-medium ${getPerformanceColor(player.par4_performance.total_vs_par.toString())}`}>
                      {player.par4_performance.total_vs_par > 0 ? '+' : ''}{player.par4_performance.total_vs_par}
                    </span>
                  </div>
                </div>
              </div>

              {/* Par 5 Performance */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-neutral-700 uppercase">Par 5s</h5>
                  {getPerformanceIcon(player.par5_performance.avg_vs_par)}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-600">Avg vs Par:</span>
                    <span className={`text-2xl font-bold ${getPerformanceColor(player.par5_performance.avg_vs_par)}`}>
                      {formatVsPar(player.par5_performance.avg_vs_par)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Holes Played:</span>
                    <span className="text-xs font-medium text-neutral-700">{player.par5_performance.holes_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Total vs Par:</span>
                    <span className={`text-xs font-medium ${getPerformanceColor(player.par5_performance.total_vs_par.toString())}`}>
                      {player.par5_performance.total_vs_par > 0 ? '+' : ''}{player.par5_performance.total_vs_par}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tee Off Performance (Back 9) */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-neutral-700 uppercase">Tee-Off Holes</h5>
                  {getPerformanceIcon(player.tee_off_performance.avg_vs_par)}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-neutral-600">Avg vs Par:</span>
                    <span className={`text-2xl font-bold ${getPerformanceColor(player.tee_off_performance.avg_vs_par)}`}>
                      {formatVsPar(player.tee_off_performance.avg_vs_par)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Holes Played:</span>
                    <span className="text-xs font-medium text-neutral-700">{player.tee_off_performance.holes_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-neutral-500">Total vs Par:</span>
                    <span className={`text-xs font-medium ${getPerformanceColor(player.tee_off_performance.total_vs_par.toString())}`}>
                      {player.tee_off_performance.total_vs_par > 0 ? '+' : ''}{player.tee_off_performance.total_vs_par}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500 mt-2">Back 9 alternate shot</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-neutral-700 mb-3">How to Read Performance Metrics:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start space-x-2">
            <TrendingDown className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-green-700">Negative scores</span>
              <span className="text-neutral-600"> indicate scoring under par (better)</span>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <TrendingUp className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-red-700">Positive scores</span>
              <span className="text-neutral-600"> indicate scoring over par</span>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-neutral-700">Par 3/4/5:</span>
              <span className="text-neutral-600"> Individual stroke play holes (front 9)</span>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Award className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-neutral-700">Tee-Off Holes:</span>
              <span className="text-neutral-600"> Back 9 holes where player teed off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPerformanceRecap;
