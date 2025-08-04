import React, { useState } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { createUser } from '../services/api';
import { toast } from 'react-toastify';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

interface AddUserForm {
  member_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  club: string;
  role: string;
  handicap: string;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded }) => {
  const [form, setForm] = useState<AddUserForm>({
    member_id: '',
    first_name: '',
    last_name: '',
    email_address: '',
    club: '',
    role: 'Member',
    handicap: '0'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<AddUserForm>>({});

  const clubs = [
    'No. 1',
    'No. 2',
    'No. 3',
    'No. 4',
    'No. 5',
    'No. 6',
    'No. 7',
    'No. 8',
    'No. 9',
    'No. 10',
    'No. 11'
  ];

  const roles = [
    { value: 'Member', label: 'Member' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Deactivated', label: 'Deactivated' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<AddUserForm> = {};

    if (!form.member_id.trim()) {
      newErrors.member_id = 'Member ID is required';
    } else if (!/^\d+$/.test(form.member_id)) {
      newErrors.member_id = 'Member ID must be a number';
    }

    if (!form.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!form.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!form.email_address.trim()) {
      newErrors.email_address = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_address)) {
      newErrors.email_address = 'Please enter a valid email address';
    }

    if (!form.club.trim()) {
      newErrors.club = 'Club is required';
    }

    if (form.handicap && !/^-?\d+(\.\d+)?$/.test(form.handicap)) {
      newErrors.handicap = 'Handicap must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        member_id: parseInt(form.member_id),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email_address: form.email_address.trim(),
        club: form.club,
        role: form.role,
        handicap: form.handicap ? parseFloat(form.handicap) : 0
      });

      toast.success('User created successfully!');
      onUserAdded();
      handleClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      member_id: '',
      first_name: '',
      last_name: '',
      email_address: '',
      club: '',
      role: 'Member',
      handicap: '0'
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const handleInputChange = (field: keyof AddUserForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <UserPlus className="w-6 h-6 text-brand-neon-green mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member ID */}
          <div>
            <label htmlFor="member_id" className="block text-sm font-medium text-gray-700 mb-1">
              Member ID *
            </label>
            <input
              type="text"
              id="member_id"
              value={form.member_id}
              onChange={(e) => handleInputChange('member_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green ${
                errors.member_id ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter member ID"
            />
            {errors.member_id && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.member_id}
              </p>
            )}
          </div>

          {/* First Name */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              id="first_name"
              value={form.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green ${
                errors.first_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter first name"
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.first_name}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              id="last_name"
              value={form.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green ${
                errors.last_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter last name"
            />
            {errors.last_name && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.last_name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email_address" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email_address"
              value={form.email_address}
              onChange={(e) => handleInputChange('email_address', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green ${
                errors.email_address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter email address"
            />
            {errors.email_address && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email_address}
              </p>
            )}
          </div>

          {/* Club */}
          <div>
            <label htmlFor="club" className="block text-sm font-medium text-gray-700 mb-1">
              Club *
            </label>
            <select
              id="club"
              value={form.club}
              onChange={(e) => handleInputChange('club', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green ${
                errors.club ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a club</option>
              {clubs.map((club) => (
                <option key={club} value={club}>
                  {club}
                </option>
              ))}
            </select>
            {errors.club && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.club}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Handicap */}
          <div>
            <label htmlFor="handicap" className="block text-sm font-medium text-gray-700 mb-1">
              Handicap
            </label>
            <input
              type="number"
              id="handicap"
              value={form.handicap}
              onChange={(e) => handleInputChange('handicap', e.target.value)}
              step="0.1"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green ${
                errors.handicap ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter handicap (optional)"
            />
            {errors.handicap && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.handicap}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-brand-neon-green text-brand-black rounded-md font-medium hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-black mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal; 