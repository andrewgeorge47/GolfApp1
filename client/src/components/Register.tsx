import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';
import { useAuth } from '../AuthContext';

const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    club: ''
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
      // Register the user
      const response = await register({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        club: formData.club || undefined
      });

      // Automatically log them in after successful registration
      await login(formData.email, formData.password);
      navigate('/profile');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
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

  return (
    <div className="max-w-md mx-auto bg-white/95 rounded-2xl p-8 shadow-lg mt-16">
      <div className="text-center mb-6">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-brand-black">Create Account</h1>
        <p className="text-neutral-600 mt-2">Join the golf league and start tracking your rounds</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Club (Optional)</label>
          <input
            type="text"
            name="club"
            value={formData.club}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            placeholder="e.g., Pine Valley Golf Club"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Password</label>
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
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-neutral-600">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-neon-green hover:text-green-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register; 