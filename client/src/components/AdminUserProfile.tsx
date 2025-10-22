import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { BarChart3, Clock, MapPin, Eye, Calendar } from 'lucide-react';
import {
  getUsers,
  getUserCombinedStats,
  getUserRecentSimulatorRounds,
  getUserTournaments,
  type User,
  type SimStats,
  type RecentSimulatorRound
} from '../services/api';

const AdminUserProfile: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();

  const [basicUser, setBasicUser] = useState<User | null>(null);
  const [combinedStats, setCombinedStats] = useState<SimStats | null>(null);
  const [recentSimulatorRounds, setRecentSimulatorRounds] = useState<RecentSimulatorRound[]>([]);
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role?.toLowerCase() !== 'admin') {
      navigate('/profile', { replace: true });
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const id = Number(userId);
    if (!id || Number.isNaN(id)) {
      setError('Invalid user id');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [usersRes, combinedRes, roundsRes, tournamentsRes] = await Promise.all([
          getUsers(),
          getUserCombinedStats(id),
          getUserRecentSimulatorRounds(id),
          getUserTournaments(id)
        ]);

        const allUsers = usersRes.data || [];
        const found = allUsers.find((u: User) => u.member_id === id) || null;
        setBasicUser(found);
        setCombinedStats(combinedRes.data);
        setRecentSimulatorRounds(roundsRes.data || []);
        setUserTournaments(tournamentsRes.data || []);
      } catch (e) {
        setError('Failed to load player profile');
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-2xl shadow-xl p-6 mb-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {basicUser ? `${basicUser.first_name} ${basicUser.last_name}` : `User #${userId}`}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-white/90">
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{basicUser?.club || 'No club'}</span>
              <span className="flex items-center"><Clock className="w-4 h-4 mr-1" />Member ID {userId}</span>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg font-medium"
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center"><BarChart3 className="w-5 h-5 mr-2" />Overall Performance</h2>
            {combinedStats && combinedStats.total_rounds > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{combinedStats.total_rounds}</div>
                  <div className="text-sm text-neutral-600">Total Rounds</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{combinedStats.unique_courses}</div>
                  <div className="text-sm text-neutral-600">Courses Played</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{combinedStats.avg_differential ? Number(combinedStats.avg_differential).toFixed(1) : 'N/A'}</div>
                  <div className="text-sm text-neutral-600">Avg Differential</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{combinedStats.best_differential ? Number(combinedStats.best_differential).toFixed(1) : 'N/A'}</div>
                  <div className="text-sm text-neutral-600">Best Differential</div>
                </div>
              </div>
            ) : (
              <div className="text-neutral-600">No rounds yet.</div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h2 className="text-xl font-bold text-brand-black mb-4 flex items-center"><Calendar className="w-5 h-5 mr-2" />Recent Simulator Rounds</h2>
            {recentSimulatorRounds.length > 0 ? (
              <div className="space-y-3">
                {recentSimulatorRounds.map((round) => (
                  <div key={round.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-brand-black">{round.course_name}</div>
                      <div className="text-sm text-neutral-600">
                        {new Date(round.date_played).toLocaleDateString()} • {round.total_strokes} strokes
                        {round.differential && ` • ${Number(round.differential).toFixed(1)} differential`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${round.handicap_status_color}`}>
                        {round.handicap_status}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Handicap: {round.handicap || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-neutral-600">No simulator rounds yet.</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-brand-black mb-3">Tournaments</h3>
            {userTournaments.length > 0 ? (
              <div className="space-y-2">
                {userTournaments.slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <div className="font-medium text-brand-black">{t.name}</div>
                      <div className="text-xs text-neutral-600">{t.status} • {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'TBD'}</div>
                    </div>
                    <button
                      onClick={() => navigate(`/leaderboard/tournament/${t.id}`)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs flex items-center"
                    >
                      <Eye className="w-3 h-3 mr-1" /> View Leaderboard
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-neutral-600">No tournaments.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserProfile;


