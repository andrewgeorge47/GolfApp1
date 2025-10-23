import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../AuthContext';
import { Settings, Plus, Edit3, Trash2, X, Save, Calendar, Clock, MapPin } from 'lucide-react';

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

const BookingSettingsAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState<BookingSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<BookingSettings | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    club_name: '',
    number_of_bays: 4,
    opening_time: '07:00',
    closing_time: '22:00',
    days_of_operation: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    booking_duration_options: '30,60,90,120',
    max_advance_booking_days: 30,
    min_booking_duration: 30,
    max_booking_duration: 240,
    enabled: true,
  });

  useEffect(() => {
    // Check if user is admin
    if (user?.role?.toLowerCase() !== 'admin') {
      navigate('/');
      return;
    }
    fetchSettings();
  }, [user, navigate]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/club-booking-settings');
      setSettings(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch booking settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async () => {
    try {
      await api.post('/club-booking-settings', formData);
      setSuccess('Booking settings created successfully!');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchSettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create booking settings');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateSetting = async () => {
    if (!selectedSetting) return;

    try {
      await api.put(`/club-booking-settings/${selectedSetting.id}`, formData);
      setSuccess('Booking settings updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedSetting(null);
      resetForm();
      fetchSettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update booking settings');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteSetting = async (id: number, clubName: string) => {
    if (!window.confirm(`Are you sure you want to delete booking settings for ${clubName}?`)) {
      return;
    }

    try {
      await api.delete(`/club-booking-settings/${id}`);
      setSuccess('Booking settings deleted successfully!');
      fetchSettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete booking settings');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openEditDialog = (setting: BookingSettings) => {
    setSelectedSetting(setting);
    setFormData({
      club_name: setting.club_name,
      number_of_bays: setting.number_of_bays,
      opening_time: setting.opening_time,
      closing_time: setting.closing_time,
      days_of_operation: setting.days_of_operation,
      booking_duration_options: setting.booking_duration_options,
      max_advance_booking_days: setting.max_advance_booking_days,
      min_booking_duration: setting.min_booking_duration,
      max_booking_duration: setting.max_booking_duration,
      enabled: setting.enabled,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      club_name: '',
      number_of_bays: 4,
      opening_time: '07:00',
      closing_time: '22:00',
      days_of_operation: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      booking_duration_options: '30,60,90,120',
      max_advance_booking_days: 30,
      min_booking_duration: 30,
      max_booking_duration: 240,
      enabled: true,
    });
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    const currentDays = formData.days_of_operation.split(',');
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setFormData({ ...formData, days_of_operation: newDays.join(',') });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green rounded-2xl shadow-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Settings className="w-8 h-8 mr-3" />
              Booking Settings Management
            </h1>
            <p className="text-white/90 mt-2">Configure club-by-club booking settings</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-white/10 backdrop-blur-sm text-white rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

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

      {/* Create Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
          className="bg-brand-dark-green text-white px-6 py-3 rounded-lg hover:bg-brand-muted-green transition-colors font-medium flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Club Settings</span>
        </button>
      </div>

      {/* Settings List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading settings...</div>
        </div>
      ) : settings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Booking Settings Found</h3>
          <p className="text-gray-600 mb-6">Get started by adding booking settings for your first club.</p>
          <button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-brand-dark-green text-white px-6 py-3 rounded-lg hover:bg-brand-muted-green transition-colors font-medium"
          >
            Add Club Settings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settings.map((setting) => (
            <div key={setting.id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className={`p-6 ${setting.enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{setting.club_name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      setting.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {setting.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-brand-dark-green" />
                    <span className="text-sm font-medium">{setting.number_of_bays} Bays</span>
                  </div>

                  <div className="flex items-center text-gray-700">
                    <Clock className="w-4 h-4 mr-2 text-brand-dark-green" />
                    <span className="text-sm">
                      {setting.opening_time} - {setting.closing_time}
                    </span>
                  </div>

                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-4 h-4 mr-2 text-brand-dark-green" />
                    <span className="text-sm">
                      {setting.days_of_operation.split(',').length} days/week
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div>Min: {setting.min_booking_duration} min</div>
                    <div>Max: {setting.max_booking_duration} min</div>
                    <div>Advance: {setting.max_advance_booking_days} days</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => openEditDialog(setting)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSetting(setting.id, setting.club_name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {(isCreateDialogOpen || isEditDialogOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-brand-dark-green to-brand-muted-green text-white p-6 rounded-t-2xl sticky top-0">
              <h2 className="text-xl font-bold">
                {isCreateDialogOpen ? 'Create New Booking Settings' : 'Edit Booking Settings'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Club Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={formData.club_name}
                  onChange={(e) => setFormData({ ...formData, club_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                  placeholder="e.g., No. 5"
                />
              </div>

              {/* Number of Bays */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Bays
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.number_of_bays}
                  onChange={(e) => setFormData({ ...formData, number_of_bays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                />
              </div>

              {/* Operating Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                  />
                </div>
              </div>

              {/* Days of Operation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of Operation
                </label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formData.days_of_operation.split(',').includes(day)
                          ? 'bg-brand-dark-green text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking Durations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking Duration Options (comma-separated minutes)
                </label>
                <input
                  type="text"
                  value={formData.booking_duration_options}
                  onChange={(e) => setFormData({ ...formData, booking_duration_options: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                  placeholder="e.g., 30,60,90,120"
                />
              </div>

              {/* Min/Max Booking Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Booking Duration (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={formData.min_booking_duration}
                    onChange={(e) => setFormData({ ...formData, min_booking_duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Booking Duration (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={formData.max_booking_duration}
                    onChange={(e) => setFormData({ ...formData, max_booking_duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                  />
                </div>
              </div>

              {/* Max Advance Booking Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Advance Booking Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_advance_booking_days}
                  onChange={(e) => setFormData({ ...formData, max_advance_booking_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-dark-green focus:border-brand-dark-green"
                />
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-brand-dark-green focus:ring-brand-dark-green border-gray-300 rounded"
                />
                <label htmlFor="enabled" className="ml-2 text-sm font-medium text-gray-700">
                  Enable booking for this club
                </label>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setSelectedSetting(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={isCreateDialogOpen ? handleCreateSetting : handleUpdateSetting}
                className="bg-brand-dark-green text-white px-6 py-2 rounded-lg hover:bg-brand-muted-green transition-colors font-medium flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isCreateDialogOpen ? 'Create' : 'Update'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingSettingsAdmin;
