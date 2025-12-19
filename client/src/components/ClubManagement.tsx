import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../AuthContext';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  MapPin,
  User,
  Clock,
  Monitor,
  ChevronDown,
  ChevronUp,
  Calendar,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageContainer';
import { Card, Button, Badge } from './ui';

interface Club {
  id: number;
  club_name: string;
  pro_first_name: string | null;
  pro_last_name: string | null;
  pro_member_id: number | null;
  pro_email: string | null;
  club_address: string;
  club_type: 'Residential' | 'Commercial' | null;
  number_of_bays: number;
  has_bathroom: boolean;
  monitor_oem: string | null;
  monitor_model: string | null;
  software: string | null;
  hour_open: string | null;
  hour_close: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BookingSettings {
  id: number;
  club_name: string;
  number_of_bays: number;
  opening_time: string;
  closing_time: string;
  days_of_operation: string;
  booking_duration_options: string;
  max_advance_booking_days: number;
  min_booking_duration: number;
  max_booking_duration: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const ClubManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [expandedClubId, setExpandedClubId] = useState<number | null>(null);
  const [showBookingSettings, setShowBookingSettings] = useState(false);

  // Club form state
  const [clubFormData, setClubFormData] = useState({
    club_name: '',
    pro_first_name: '',
    pro_last_name: '',
    pro_member_id: null as number | null,
    pro_email: '',
    club_address: '',
    club_type: 'Residential' as 'Residential' | 'Commercial',
    number_of_bays: 1,
    has_bathroom: false,
    monitor_oem: '',
    monitor_model: '',
    software: '',
    hour_open: '07:00',
    hour_close: '21:00',
    is_active: true,
  });

  // Booking settings form state
  const [bookingFormData, setBookingFormData] = useState({
    days_of_operation: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    booking_duration_options: '30,60,90,120',
    max_advance_booking_days: 30,
    min_booking_duration: 30,
    max_booking_duration: 240,
    enabled: true,
  });

  useEffect(() => {
    if (user?.role?.toLowerCase() !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubsRes, bookingRes] = await Promise.all([
        api.get('/clubs'),
        api.get('/club-booking-settings'),
      ]);
      setClubs(clubsRes.data);
      setBookingSettings(bookingRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async () => {
    try {
      const clubRes = await api.post('/clubs', clubFormData);

      // If booking settings are enabled, create them too
      if (showBookingSettings) {
        await api.post('/club-booking-settings', {
          club_name: clubFormData.club_name,
          number_of_bays: clubFormData.number_of_bays,
          opening_time: clubFormData.hour_open,
          closing_time: clubFormData.hour_close,
          ...bookingFormData,
        });
      }

      setSuccess('Club created successfully!');
      setIsCreateDialogOpen(false);
      resetForms();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create club');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateClub = async () => {
    if (!selectedClub) return;

    try {
      await api.put(`/clubs/${selectedClub.id}`, clubFormData);
      setSuccess('Club updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedClub(null);
      resetForms();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update club');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteClub = async (id: number, clubName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${clubName}? This will also delete associated booking settings.`)) {
      return;
    }

    try {
      await api.delete(`/clubs/${id}`);
      setSuccess('Club deleted successfully!');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete club');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateBookingSettings = async (clubName: string, numberOfBays: number, hourOpen: string, hourClose: string) => {
    try {
      await api.post('/club-booking-settings', {
        club_name: clubName,
        number_of_bays: numberOfBays,
        opening_time: hourOpen,
        closing_time: hourClose,
        ...bookingFormData,
      });
      setSuccess('Booking settings created successfully!');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create booking settings');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openEditDialog = (club: Club) => {
    setSelectedClub(club);
    setClubFormData({
      club_name: club.club_name,
      pro_first_name: club.pro_first_name || '',
      pro_last_name: club.pro_last_name || '',
      pro_member_id: club.pro_member_id,
      pro_email: club.pro_email || '',
      club_address: club.club_address,
      club_type: club.club_type || 'Residential',
      number_of_bays: club.number_of_bays,
      has_bathroom: club.has_bathroom,
      monitor_oem: club.monitor_oem || '',
      monitor_model: club.monitor_model || '',
      software: club.software || '',
      hour_open: club.hour_open || '07:00',
      hour_close: club.hour_close || '21:00',
      is_active: club.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const resetForms = () => {
    setClubFormData({
      club_name: '',
      pro_first_name: '',
      pro_last_name: '',
      pro_member_id: null,
      pro_email: '',
      club_address: '',
      club_type: 'Residential',
      number_of_bays: 1,
      has_bathroom: false,
      monitor_oem: '',
      monitor_model: '',
      software: '',
      hour_open: '07:00',
      hour_close: '21:00',
      is_active: true,
    });
    setBookingFormData({
      days_of_operation: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      booking_duration_options: '30,60,90,120',
      max_advance_booking_days: 30,
      min_booking_duration: 30,
      max_booking_duration: 240,
      enabled: true,
    });
    setShowBookingSettings(false);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    const currentDays = bookingFormData.days_of_operation.split(',');
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setBookingFormData({ ...bookingFormData, days_of_operation: newDays.join(',') });
  };

  const getBookingSettingsForClub = (clubName: string) => {
    return bookingSettings.find(bs => bs.club_name === clubName);
  };

  return (
    <PageContainer>
      <button
        onClick={() => navigate('/admin/clubs')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Club Admin</span>
      </button>

      <PageHeader
        icon={<Building2 className="w-6 h-6 text-brand-dark-green" />}
        title="Club Management"
        subtitle="Create and manage golf clubs and their booking systems"
      />

      {error && (
        <div className="bg-red-500/20 border border-red-400/50 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-400/50 text-green-800 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="mb-6">
        <Button
          onClick={() => {
            resetForms();
            setIsCreateDialogOpen(true);
          }}
          variant="neon"
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Club
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading clubs...</div>
        </div>
      ) : clubs.length === 0 ? (
        <Card variant="dark-elevated" padding="lg">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Clubs Found</h3>
            <p className="text-white/70 mb-6">Get started by creating your first club.</p>
            <Button
              onClick={() => {
                resetForms();
                setIsCreateDialogOpen(true);
              }}
              variant="neon"
            >
              Create Club
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {clubs.map((club) => {
            const isExpanded = expandedClubId === club.id;
            const clubBookingSettings = getBookingSettingsForClub(club.club_name);

            return (
              <Card key={club.id} variant="dark-elevated" padding="none">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-brand-neon-green/10 rounded-lg">
                        <Building2 className="w-6 h-6 text-brand-neon-green" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold">{club.club_name}</h3>
                          <Badge variant={club.is_active ? 'success' : 'warning'} size="sm">
                            {club.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {club.club_type && (
                            <Badge variant="info" size="sm">{club.club_type}</Badge>
                          )}
                        </div>
                        <div className="flex items-center text-white/60 text-sm mb-2">
                          <MapPin className="w-4 h-4 mr-1" />
                          {club.club_address}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditDialog(club)}
                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClub(club.id, club.club_name)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedClubId(isExpanded ? null : club.id)}
                        className="p-2 text-white/60 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center text-white/70">
                      <Monitor className="w-4 h-4 mr-2 text-brand-neon-green" />
                      <span>{club.number_of_bays} {club.number_of_bays === 1 ? 'Bay' : 'Bays'}</span>
                    </div>
                    {club.hour_open && club.hour_close && (
                      <div className="flex items-center text-white/70">
                        <Clock className="w-4 h-4 mr-2 text-brand-neon-green" />
                        <span>{club.hour_open} - {club.hour_close}</span>
                      </div>
                    )}
                    {(club.pro_first_name || club.pro_last_name) && (
                      <div className="flex items-center text-white/70">
                        <User className="w-4 h-4 mr-2 text-brand-neon-green" />
                        <span>{club.pro_first_name} {club.pro_last_name}</span>
                      </div>
                    )}
                    {clubBookingSettings && (
                      <div className="flex items-center text-white/70">
                        <Calendar className="w-4 h-4 mr-2 text-brand-neon-green" />
                        <span>Booking {clubBookingSettings.enabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 text-white/90">Club Details</h4>
                          <div className="space-y-2 text-sm">
                            {club.monitor_oem && (
                              <div>
                                <span className="text-white/50">Monitor OEM:</span>
                                <span className="ml-2 text-white/80">{club.monitor_oem}</span>
                              </div>
                            )}
                            {club.monitor_model && (
                              <div>
                                <span className="text-white/50">Monitor Model:</span>
                                <span className="ml-2 text-white/80">{club.monitor_model}</span>
                              </div>
                            )}
                            {club.software && (
                              <div>
                                <span className="text-white/50">Software:</span>
                                <span className="ml-2 text-white/80">{club.software}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-white/50">Bathroom:</span>
                              <span className="ml-2 text-white/80">{club.has_bathroom ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-white/90">Booking Settings</h4>
                            {!clubBookingSettings && (
                              <Button
                                onClick={() => handleCreateBookingSettings(
                                  club.club_name,
                                  club.number_of_bays,
                                  club.hour_open || '07:00',
                                  club.hour_close || '21:00'
                                )}
                                variant="outline-neon"
                                className="text-xs py-1 px-3"
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Enable Booking
                              </Button>
                            )}
                          </div>
                          {clubBookingSettings ? (
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-white/50">Days:</span>
                                <span className="ml-2 text-white/80">
                                  {clubBookingSettings.days_of_operation.split(',').length} days/week
                                </span>
                              </div>
                              <div>
                                <span className="text-white/50">Duration Options:</span>
                                <span className="ml-2 text-white/80">
                                  {clubBookingSettings.booking_duration_options} min
                                </span>
                              </div>
                              <div>
                                <span className="text-white/50">Advance Booking:</span>
                                <span className="ml-2 text-white/80">
                                  {clubBookingSettings.max_advance_booking_days} days
                                </span>
                              </div>
                              <div>
                                <span className="text-white/50">Status:</span>
                                <Badge variant={clubBookingSettings.enabled ? 'success' : 'warning'} size="sm" className="ml-2">
                                  {clubBookingSettings.enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <p className="text-white/50 text-sm">No booking settings configured</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {(isCreateDialogOpen || isEditDialogOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-brand-dark-green rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green text-white p-6 rounded-t-2xl sticky top-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                {isCreateDialogOpen ? 'Create New Club' : 'Edit Club'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Club Name *
                    </label>
                    <input
                      type="text"
                      value={clubFormData.club_name}
                      onChange={(e) => setClubFormData({ ...clubFormData, club_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                      placeholder="e.g., No. 5"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={clubFormData.club_address}
                      onChange={(e) => setClubFormData({ ...clubFormData, club_address: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                      placeholder="Full address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Club Type
                    </label>
                    <select
                      value={clubFormData.club_type}
                      onChange={(e) => setClubFormData({ ...clubFormData, club_type: e.target.value as 'Residential' | 'Commercial' })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Number of Bays
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={clubFormData.number_of_bays}
                      onChange={(e) => setClubFormData({ ...clubFormData, number_of_bays: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    />
                  </div>
                </div>
              </div>

              {/* Pro Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Pro Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Pro First Name
                    </label>
                    <input
                      type="text"
                      value={clubFormData.pro_first_name}
                      onChange={(e) => setClubFormData({ ...clubFormData, pro_first_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Pro Last Name
                    </label>
                    <input
                      type="text"
                      value={clubFormData.pro_last_name}
                      onChange={(e) => setClubFormData({ ...clubFormData, pro_last_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Pro Email
                    </label>
                    <input
                      type="email"
                      value={clubFormData.pro_email}
                      onChange={(e) => setClubFormData({ ...clubFormData, pro_email: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Pro Member ID
                    </label>
                    <input
                      type="number"
                      value={clubFormData.pro_member_id || ''}
                      onChange={(e) => setClubFormData({ ...clubFormData, pro_member_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    />
                  </div>
                </div>
              </div>

              {/* Facility Details */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Facility & Equipment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Monitor OEM
                    </label>
                    <input
                      type="text"
                      value={clubFormData.monitor_oem}
                      onChange={(e) => setClubFormData({ ...clubFormData, monitor_oem: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                      placeholder="e.g., Trackman, Bushnell"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Monitor Model
                    </label>
                    <input
                      type="text"
                      value={clubFormData.monitor_model}
                      onChange={(e) => setClubFormData({ ...clubFormData, monitor_model: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                      placeholder="e.g., iO, BLP"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Software
                    </label>
                    <input
                      type="text"
                      value={clubFormData.software}
                      onChange={(e) => setClubFormData({ ...clubFormData, software: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                      placeholder="e.g., GSPro, E6 Connect"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_bathroom"
                      checked={clubFormData.has_bathroom}
                      onChange={(e) => setClubFormData({ ...clubFormData, has_bathroom: e.target.checked })}
                      className="w-4 h-4 text-brand-neon-green focus:ring-brand-neon-green border-white/30 rounded"
                    />
                    <label htmlFor="has_bathroom" className="ml-2 text-sm font-medium text-white/80">
                      Has Bathroom
                    </label>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Operating Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={clubFormData.hour_open}
                      onChange={(e) => setClubFormData({ ...clubFormData, hour_open: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={clubFormData.hour_close}
                      onChange={(e) => setClubFormData({ ...clubFormData, hour_close: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                    />
                  </div>
                </div>
              </div>

              {/* Booking Settings (only for create) */}
              {isCreateDialogOpen && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Booking Settings (Optional)</h3>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showBookingSettings}
                        onChange={(e) => setShowBookingSettings(e.target.checked)}
                        className="w-4 h-4 text-brand-neon-green focus:ring-brand-neon-green border-white/30 rounded mr-2"
                      />
                      <span className="text-sm text-white/80">Enable Booking System</span>
                    </label>
                  </div>

                  {showBookingSettings && (
                    <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Days of Operation
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {daysOfWeek.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                bookingFormData.days_of_operation.split(',').includes(day)
                                  ? 'bg-brand-neon-green text-brand-dark-green'
                                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            Min Duration (min)
                          </label>
                          <input
                            type="number"
                            min="15"
                            step="15"
                            value={bookingFormData.min_booking_duration}
                            onChange={(e) => setBookingFormData({ ...bookingFormData, min_booking_duration: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">
                            Max Duration (min)
                          </label>
                          <input
                            type="number"
                            min="15"
                            step="15"
                            value={bookingFormData.max_booking_duration}
                            onChange={(e) => setBookingFormData({ ...bookingFormData, max_booking_duration: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Max Advance Booking Days
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={bookingFormData.max_advance_booking_days}
                          onChange={(e) => setBookingFormData({ ...bookingFormData, max_advance_booking_days: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-brand-neon-green focus:border-brand-neon-green"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={clubFormData.is_active}
                  onChange={(e) => setClubFormData({ ...clubFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-brand-neon-green focus:ring-brand-neon-green border-white/30 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-white/80">
                  Club is Active
                </label>
              </div>
            </div>

            <div className="bg-white/5 px-6 py-4 rounded-b-2xl flex justify-end gap-3 sticky bottom-0">
              <Button
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setSelectedClub(null);
                  resetForms();
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={isCreateDialogOpen ? handleCreateClub : handleUpdateClub}
                variant="neon"
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isCreateDialogOpen ? 'Create Club' : 'Update Club'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ClubManagement;
