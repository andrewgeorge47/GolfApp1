import React, { useState, useEffect } from 'react';
import { Activity, Database, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { PageHeader } from './ui/PageHeader';
import api from '../services/api';

interface SimSyncStatus {
  sim_id: string;
  sim_name: string;
  location: string;
  is_active: boolean;
  last_used_at: string | null;
  last_sync_at: string | null;
  last_shot_received_at: string | null;
  total_shots_received: number;
  last_error_at: string | null;
  last_error_message: string | null;
  consecutive_errors: number;
  listener_version: string | null;
}

const AdminShotCapture: React.FC = () => {
  const [sims, setSims] = useState<SimSyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await api.get('/sims/sync-status');
      setSims(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (sim: SimSyncStatus) => {
    if (!sim.is_active) {
      return { status: 'inactive', color: 'text-gray-500', label: 'Inactive' };
    }

    if (sim.consecutive_errors > 5) {
      return { status: 'error', color: 'text-red-600', label: 'Critical' };
    }

    if (sim.consecutive_errors > 0) {
      return { status: 'warning', color: 'text-yellow-600', label: 'Warning' };
    }

    if (!sim.last_sync_at) {
      return { status: 'unknown', color: 'text-gray-500', label: 'Unknown' };
    }

    const lastSync = new Date(sim.last_sync_at);
    const now = new Date();
    const minutesAgo = (now.getTime() - lastSync.getTime()) / 1000 / 60;

    if (minutesAgo < 5) {
      return { status: 'healthy', color: 'text-green-600', label: 'Healthy' };
    } else if (minutesAgo < 30) {
      return { status: 'warning', color: 'text-yellow-600', label: 'Warning' };
    } else {
      return { status: 'stale', color: 'text-orange-600', label: 'Stale' };
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTotalShots = () => {
    return sims.reduce((sum, sim) => sum + (sim.total_shots_received || 0), 0);
  };

  const getActiveSims = () => {
    return sims.filter(sim => sim.is_active && sim.last_sync_at).length;
  };

  const getHealthySims = () => {
    return sims.filter(sim => {
      const health = getHealthStatus(sim);
      return health.status === 'healthy';
    }).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shot Capture System"
        subtitle="Monitor simulator sync health and shot statistics"
        icon={Activity}
      />

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">Error loading sync status: {error}</p>
          </div>
        </Card>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Simulators</p>
              <p className="text-3xl font-bold text-gray-900">{sims.length}</p>
            </div>
            <Database className="w-10 h-10 text-brand-neon-green" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Syncing</p>
              <p className="text-3xl font-bold text-green-600">{getActiveSims()}</p>
            </div>
            <Zap className="w-10 h-10 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Healthy</p>
              <p className="text-3xl font-bold text-green-600">{getHealthySims()}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Shots</p>
              <p className="text-3xl font-bold text-brand-dark-green">{getTotalShots().toLocaleString()}</p>
            </div>
            <Activity className="w-10 h-10 text-brand-dark-green" />
          </div>
        </Card>
      </div>

      {/* Simulator List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Simulators</h2>

        {sims.length === 0 ? (
          <Card className="p-12 text-center">
            <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Simulators Configured</h3>
            <p className="text-gray-600">
              Run <code className="bg-gray-100 px-2 py-1 rounded">node scripts/create_simulator_api_key.js</code> to add a simulator.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sims.map((sim) => {
              const health = getHealthStatus(sim);
              return (
                <Card key={sim.sim_id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{sim.sim_name}</h3>
                        <Badge variant={health.status === 'healthy' ? 'success' : health.status === 'error' ? 'error' : 'warning'}>
                          {health.label}
                        </Badge>
                        {!sim.is_active && (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{sim.location}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">ID: {sim.sim_id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Shots</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {(sim.total_shots_received || 0).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Last Sync</p>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="text-sm text-gray-700">
                          {formatTimestamp(sim.last_sync_at)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Last Shot</p>
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-gray-400" />
                        <p className="text-sm text-gray-700">
                          {formatTimestamp(sim.last_shot_received_at)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Listener Version</p>
                      <p className="text-sm text-gray-700 font-mono">
                        {sim.listener_version || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {sim.consecutive_errors > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">
                            {sim.consecutive_errors} consecutive error{sim.consecutive_errors > 1 ? 's' : ''}
                          </p>
                          {sim.last_error_message && (
                            <p className="text-xs text-red-700 mt-1 font-mono">
                              {sim.last_error_message}
                            </p>
                          )}
                          {sim.last_error_at && (
                            <p className="text-xs text-red-600 mt-1">
                              Last error: {formatTimestamp(sim.last_error_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Auto-refreshing every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default AdminShotCapture;
