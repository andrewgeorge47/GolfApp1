import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Login: React.FC = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // Redirect to the intended destination or profile
      const from = location.state?.from || '/profile';
      navigate(from);
    } catch (err: any) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white/95 rounded-2xl p-4 sm:p-8 shadow-lg mt-8 sm:mt-16 mx-4 sm:mx-auto">
      <div className="text-center mb-4 sm:mb-6">
        <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-12 sm:h-16 w-auto mx-auto mb-3 sm:mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-black">Login</h1>
        <p className="text-neutral-600 mt-2 text-sm sm:text-base">Welcome back to the golf league</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-3 sm:py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent text-base"
            required
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-3 sm:py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent text-base"
            required
            placeholder="Enter your password"
          />
          <div className="text-right mt-1">
            <Link to="/reset-password" className="text-sm text-brand-neon-green hover:text-green-400">
              Forgot password?
            </Link>
          </div>
        </div>
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        <button
          type="submit"
          className="w-full px-4 py-3 sm:py-2 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50 text-base"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div className="mt-4 sm:mt-6 text-center">
        <p className="text-neutral-600 text-sm">
          New member?{' '}
          <Link to="/claim-account" className="text-brand-neon-green hover:text-green-400 font-medium">
            Claim your account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login; 