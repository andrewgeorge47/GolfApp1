import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

interface TeamMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  availability_status: 'available' | 'unavailable' | 'pending';
  last_updated?: string;
  notes?: string;
}

interface WeekAvailability {
  week_start_date: string;
  week_end_date: string;
  members: TeamMemberAvailability[];
}

interface TeamMemberAvailability {
  member_id: number;
  first_name: string;
  last_name: string;
  handicap: number;
  role: 'captain' | 'member';
  availability_status: 'available' | 'unavailable' | 'pending';
  last_updated?: string;
  notes?: string;
}

const AvailabilityView: React.FC = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [weekAvailability, setWeekAvailability] = useState<WeekAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'unavailable' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'handicap' | 'status'>('name');

  useEffect(() => {
    loadAvailabilityData();
  }, []);

  useEffect(() => {
    if (currentWeek) {
      loadWeekAvailability(currentWeek);
    }
  }, [currentWeek]);

  const loadAvailabilityData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Mock data for now
      const mockWeeks = [
        '2024-03-18',
        '2024-03-25',
        '2024-04-01',
        '2024-04-08',
        '2024-04-15'
      ];
      
      setAvailableWeeks(mockWeeks);
      setCurrentWeek(mockWeeks[0]);
    } catch (error) {
      console.error('Error loading availability data:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  const loadWeekAvailability = async (weekStartDate: string) => {
    try {
      // TODO: Replace with actual API call
      // Mock data for now
      const mockWeekAvailability: WeekAvailability = {
        week_start_date: weekStartDate,
        week_end_date: new Date(new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        members: [
          {
            member_id: 1,
            first_name: user?.first_name || 'John',
            last_name: user?.last_name || 'Doe',
            handicap: 12,
            role: 'captain',
            availability_status: 'available',
            last_updated: '2024-03-15T10:30:00Z',
            notes: 'Available all week'
          },
          {
            member_id: 2,
            first_name: 'Jane',
            last_name: 'Smith',
            handicap: 15,
            role: 'member',
            availability_status: 'available',
            last_updated: '2024-03-15T11:00:00Z',
            notes: 'Available evenings only'
          },
          {
            member_id: 3,
            first_name: 'Mike',
            last_name: 'Johnson',
            handicap: 18,
            role: 'member',
            availability_status: 'unavailable',
            last_updated: '2024-03-14T15:20:00Z',
            notes: 'Out of town for work'
          },
          {
            member_id: 4,
            first_name: 'Sarah',
            last_name: 'Wilson',
            handicap: 14,
            role: 'member',
            availability_status: 'pending',
            last_updated: '2024-03-13T09:15:00Z',
            notes: 'Waiting for confirmation'
          },
          {
            member_id: 5,
            first_name: 'Tom',
            last_name: 'Brown',
            handicap: 16,
            role: 'member',
            availability_status: 'available',
            last_updated: '2024-03-15T14:45:00Z',
            notes: 'Available weekends'
          }
        ]
      };

      setWeekAvailability(mockWeekAvailability);
    } catch (error) {
      console.error('Error loading week availability:', error);
      toast.error('Failed to load week availability');
    }
  };

  const updateMemberAvailability = async (memberId: number, status: 'available' | 'unavailable' | 'pending', notes?: string) => {
    try {
      // TODO: Replace with actual API call
      if (weekAvailability) {
        const updatedMembers = weekAvailability.members.map(member => 
          member.member_id === memberId 
            ? { 
                ...member, 
                availability_status: status, 
                notes: notes || member.notes,
                last_updated: new Date().toISOString()
              }
            : member
        );
        
        setWeekAvailability({
          ...weekAvailability,
          members: updatedMembers
        });
        
        toast.success('Availability updated successfully');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const getAvailabilityStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'unavailable': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'unavailable': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const getCurrentWeekIndex = () => {
    return availableWeeks.findIndex(week => week === currentWeek);
  };

  const goToPreviousWeek = () => {
    const currentIndex = getCurrentWeekIndex();
    if (currentIndex > 0) {
      setCurrentWeek(availableWeeks[currentIndex - 1]);
    }
  };

  const goToNextWeek = () => {
    const currentIndex = getCurrentWeekIndex();
    if (currentIndex < availableWeeks.length - 1) {
      setCurrentWeek(availableWeeks[currentIndex + 1]);
    }
  };

  const filteredMembers = weekAvailability?.members.filter(member => {
    const matchesFilter = filterStatus === 'all' || member.availability_status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      case 'handicap':
        return a.handicap - b.handicap;
      case 'status':
        return a.availability_status.localeCompare(b.availability_status);
      default:
        return 0;
    }
  }) || [];

  const getStatusCounts = () => {
    if (!weekAvailability) return { available: 0, unavailable: 0, pending: 0 };
    
    return weekAvailability.members.reduce((counts, member) => {
      counts[member.availability_status]++;
      return counts;
    }, { available: 0, unavailable: 0, pending: 0 });
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Team Availability</h1>
            <p className="text-neutral-600">Manage team member availability for upcoming matches</p>
          </div>
        </div>
        
        <button 
          onClick={loadAvailabilityData}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg hover:bg-green-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Week Selector */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brand-black">Week Selection</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              disabled={getCurrentWeekIndex() === 0}
              className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextWeek}
              disabled={getCurrentWeekIndex() === availableWeeks.length - 1}
              className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {weekAvailability && (
          <div className="text-center">
            <h4 className="text-xl font-semibold text-brand-black">
              {formatWeekRange(weekAvailability.week_start_date, weekAvailability.week_end_date)}
            </h4>
            <p className="text-sm text-neutral-600">
              Week of {formatDate(weekAvailability.week_start_date)}
            </p>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Available</p>
              <p className="text-2xl font-bold text-brand-black">{statusCounts.available}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Unavailable</p>
              <p className="text-2xl font-bold text-brand-black">{statusCounts.unavailable}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Pending</p>
              <p className="text-2xl font-bold text-brand-black">{statusCounts.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Filter by status:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            >
              <option value="all">All Members</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-neutral-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="handicap">Handicap</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Availability */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-brand-black">Team Members</h3>
        </div>
        
        <div className="divide-y divide-neutral-200">
          {filteredMembers.map((member) => (
            <div key={member.member_id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-brand-neon-green rounded-full flex items-center justify-center">
                      <span className="text-brand-black font-semibold">
                        {member.first_name[0]}{member.last_name[0]}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-brand-black">
                      {member.first_name} {member.last_name}
                      {member.role === 'captain' && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-neon-green text-brand-black">
                          Captain
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-neutral-600">Handicap: {member.handicap}</p>
                    {member.notes && (
                      <p className="text-sm text-neutral-500 mt-1">{member.notes}</p>
                    )}
                    {member.last_updated && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Last updated: {formatDate(member.last_updated)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getAvailabilityStatusColor(member.availability_status)}`}>
                    {getAvailabilityStatusIcon(member.availability_status)}
                    <span className="ml-1 capitalize">{member.availability_status}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateMemberAvailability(member.member_id, 'available')}
                      className={`p-2 rounded-lg transition-colors ${
                        member.availability_status === 'available' 
                          ? 'bg-green-100 text-green-600' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title="Mark as Available"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => updateMemberAvailability(member.member_id, 'unavailable')}
                      className={`p-2 rounded-lg transition-colors ${
                        member.availability_status === 'unavailable' 
                          ? 'bg-red-100 text-red-600' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title="Mark as Unavailable"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => updateMemberAvailability(member.member_id, 'pending')}
                      className={`p-2 rounded-lg transition-colors ${
                        member.availability_status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-600' 
                          : 'text-yellow-600 hover:bg-yellow-50'
                      }`}
                      title="Mark as Pending"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No Results */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Members Found</h3>
          <p className="text-gray-600">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
};

export default AvailabilityView;
