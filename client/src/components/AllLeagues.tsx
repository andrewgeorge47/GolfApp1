import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Users,
  BarChart3,
  Eye,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';
import { getLeagues, type League } from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { toast } from 'react-toastify';

const AllLeagues: React.FC = () => {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    setLoading(true);
    try {
      const response = await getLeagues();
      setLeagues(response.data);
    } catch (error) {
      console.error('Error loading leagues:', error);
      toast.error('Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeagues = leagues.filter(league => {
    const matchesSearch = league.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         league.season?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || league.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string): 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neon' => {
    switch (status) {
      case 'draft': return 'default';
      case 'registration': return 'warning';
      case 'active': return 'success';
      case 'playoffs': return 'info';
      case 'completed': return 'default';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Trophy className="w-12 h-12 text-brand-neon-green" />
          <div>
            <h1 className="text-4xl font-bold text-white">Golf Leagues</h1>
            <p className="text-lg text-white mt-1">
              Browse and view league standings, schedules, and results
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search leagues by name or season..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-neutral-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="registration">Registration</option>
              <option value="active">Active</option>
              <option value="playoffs">Playoffs</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <Trophy className="w-10 h-10 text-brand-neon-green mr-4" />
            <div>
              <p className="text-sm text-neutral-600">Total Leagues</p>
              <p className="text-2xl font-bold text-brand-black">{leagues.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Trophy className="w-10 h-10 text-green-500 mr-4" />
            <div>
              <p className="text-sm text-neutral-600">Active</p>
              <p className="text-2xl font-bold text-brand-black">
                {leagues.filter(l => l.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Calendar className="w-10 h-10 text-blue-500 mr-4" />
            <div>
              <p className="text-sm text-neutral-600">Registration</p>
              <p className="text-2xl font-bold text-brand-black">
                {leagues.filter(l => l.status === 'registration').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Trophy className="w-10 h-10 text-purple-500 mr-4" />
            <div>
              <p className="text-sm text-neutral-600">Upcoming</p>
              <p className="text-2xl font-bold text-brand-black">
                {leagues.filter(l => l.status === 'draft').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Leagues Grid */}
      {filteredLeagues.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-xl font-semibold text-neutral-700 mb-2">No Leagues Found</h3>
          <p className="text-neutral-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No leagues have been created yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeagues.map((league) => (
            <Card key={league.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-brand-black mb-1">{league.name}</h3>
                    <p className="text-sm text-neutral-600">{league.season || 'Season TBD'}</p>
                  </div>
                  <Badge variant={getStatusColor(league.status)}>
                    {league.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Description */}
                {league.description && (
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                    {league.description}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 text-neutral-400 mr-2" />
                    <span className="text-neutral-600">
                      {formatDate(league.start_date)} - {formatDate(league.end_date)}
                    </span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Users className="w-4 h-4 text-neutral-400 mr-2" />
                    <span className="text-neutral-600">
                      {league.divisions_count || 0} {league.divisions_count === 1 ? 'Division' : 'Divisions'} • {league.teams_per_division || 0} Teams per Division
                    </span>
                  </div>

                  <div className="flex items-center text-sm">
                    <Trophy className="w-4 h-4 text-neutral-400 mr-2" />
                    <span className="text-neutral-600 capitalize">
                      {league.format?.replace('_', ' ') || 'Format TBD'}
                    </span>
                  </div>

                  {league.weeks_per_season && (
                    <div className="flex items-center text-sm">
                      <BarChart3 className="w-4 h-4 text-neutral-400 mr-2" />
                      <span className="text-neutral-600">
                        {league.weeks_per_season} Weeks
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate(`/league-standings/${league.id}`)}
                    className="w-full"
                    variant="primary"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Standings
                  </Button>

                  <Button
                    onClick={() => navigate(`/weekly-results/${league.id}`)}
                    className="w-full"
                    variant="outline"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Weekly Results
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllLeagues;
