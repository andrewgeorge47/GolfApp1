import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { checkEmail, claimAccount } from '../services/api';

interface UserInfo {
  member_id: number;
  first_name: string;
  last_name: string;
  email_address: string;
  club: string;
  role: string;
}

const ClaimAccount: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await checkEmail(email);
      const { user, hasPassword } = response.data;
      
      if (hasPassword) {
        setError('This account already has a password set. Please use the login page instead.');
        return;
      }
      
      setUserInfo(user);
      setStep('password');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await claimAccount(email, password);
      // Automatically log them in after successful account claiming
      await login(email, password);
      // Redirect to the intended destination or profile
      const from = location.state?.from || '/profile';
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to claim account');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setError('');
    setUserInfo(null);
  };

  if (step === 'password' && userInfo) {
    return (
      <div className="max-w-md mx-auto bg-white/95 rounded-2xl p-8 shadow-lg mt-16">
        <div className="text-center mb-6">
          <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-brand-black">Set Your Password</h1>
          <p className="text-neutral-600 mt-2">Welcome, {userInfo.first_name} {userInfo.last_name}!</p>
          <p className="text-neutral-600 text-sm">Please set a password to claim your account</p>
        </div>
        
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="bg-neutral-50 p-4 rounded-lg">
            <p className="text-sm text-neutral-600">
              <strong>Account Details:</strong><br />
              Name: {userInfo.first_name} {userInfo.last_name}<br />
              Email: {userInfo.email_address}<br />
              Club: {userInfo.club || 'Not specified'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              required
              minLength={6}
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              required
              placeholder="Confirm your password"
            />
          </div>

          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBackToEmail}
              className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-600 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Claiming Account...' : 'Claim Account'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white/95 rounded-2xl p-8 shadow-lg mt-16">
      <div className="text-center mb-6">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-brand-black">Claim Your Account</h1>
        <p className="text-neutral-600 mt-2">Enter your Mighty Network email to access your golf league account</p>
      </div>
      
      <form onSubmit={handleEmailSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
            required
            placeholder="Enter your email address"
          />
        </div>

        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        
        <button
          type="submit"
          className="w-full px-4 py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Checking Email...' : 'Continue'}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-neutral-600 text-sm">
          Already have a password?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-brand-neon-green hover:text-green-400 font-medium"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};

export default ClaimAccount; 