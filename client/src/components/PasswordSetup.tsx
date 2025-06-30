import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { setupPassword } from '../services/api';

const PasswordSetup: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      await setupPassword(formData.password);
      // Password set successfully, redirect to profile
      navigate('/profile');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="max-w-md mx-auto bg-white/95 rounded-2xl p-8 shadow-lg mt-16">
      <div className="text-center mb-6">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-brand-black">Set Your Password</h1>
        <p className="text-neutral-600 mt-2">Welcome, {user.first_name}! Please set a password for your account.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">New Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            required
          />
        </div>

        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        
        <button
          type="submit"
          className="w-full px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Setting Password...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
};

export default PasswordSetup; 