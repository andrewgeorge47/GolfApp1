import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Trophy, Medal, BarChart3, User, Menu, X, MapPin, LogIn, Calendar, Target, TrendingUp } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Scoring from './components/Scoring';
import TournamentScoring from './components/TournamentScoring';
import Admin from './components/Admin';
import TournamentManagement from './components/TournamentManagement';
import Profile from './components/Profile';
import SimulatorCourses from './components/SimulatorCourses';
import UserTrackingPage from './components/UserTrackingPage';
import AdminUserProfile from './components/AdminUserProfile';
import AvailableTournaments from './components/AvailableTournaments';
import NewWeeklyScoring from './components/NewWeeklyScoring';
import NewWeeklyLeaderboard from './components/NewWeeklyLeaderboard';
import { AuthProvider, useAuth } from './AuthContext';
import ClubProDashboard from './components/ClubProDashboard';
import Login from './components/Login';
import PasswordSetup from './components/PasswordSetup';
import ClaimAccount from './components/ClaimAccount';
import ResetPassword from './components/ResetPassword';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Wrapper components to handle URL parameters
const NewWeeklyScoringWrapper: React.FC = () => {
  const { tournamentId } = useParams();
  return (
    <NewWeeklyScoring 
      tournamentId={parseInt(tournamentId || '1')} 
      tournamentName="Weekly Tournament" 
    />
  );
};

const NewWeeklyLeaderboardWrapper: React.FC = () => {
  const { tournamentId } = useParams();
  return (
    <NewWeeklyLeaderboard 
      tournamentId={parseInt(tournamentId || '1')} 
      tournamentName="Weekly Tournament" 
    />
  );
};

// Wrapper for AvailableTournaments to handle query parameters
const AvailableTournamentsWrapper: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tournamentId = searchParams.get('tournament');
  
  console.log('AvailableTournamentsWrapper: tournamentId from query params:', tournamentId);
  
  return <AvailableTournaments />;
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('ProtectedRoute: loading=', loading, 'user=', user ? 'exists' : 'none', 'pathname=', location.pathname);
  
  useEffect(() => {
    if (!loading && !user) {
      console.log('ProtectedRoute: Redirecting to login from', location.pathname);
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [loading, user, navigate, location]);
  
  if (loading) {
    console.log('ProtectedRoute: Showing loading state');
    return <div className="p-4 text-center">Loading...</div>;
  }
  
  if (!user) {
    console.log('ProtectedRoute: No user, showing loading while redirecting');
    return <div className="p-4 text-center">Redirecting to login...</div>;
  }
  
  console.log('ProtectedRoute: Rendering protected content for', location.pathname);
  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('AdminProtectedRoute: loading=', loading, 'user=', user ? 'exists' : 'none', 'role=', user?.role, 'pathname=', location.pathname);
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log('AdminProtectedRoute: No user, redirecting to login');
        navigate('/login');
      } else if (user.role?.toLowerCase() !== 'admin') {
        console.log('AdminProtectedRoute: User is not admin, redirecting to home');
        navigate('/');
      }
    }
  }, [loading, user, navigate]);
  
  if (loading) {
    console.log('AdminProtectedRoute: Showing loading state');
    return <div className="p-4 text-center">Loading...</div>;
  }
  
  if (!user) {
    console.log('AdminProtectedRoute: No user, showing loading while redirecting');
    return <div className="p-4 text-center">Redirecting to login...</div>;
  }
  
  if (user.role?.toLowerCase() !== 'admin') {
    console.log('AdminProtectedRoute: User is not admin, showing loading while redirecting');
    return <div className="p-4 text-center">Redirecting...</div>;
  }
  
  console.log('AdminProtectedRoute: Rendering admin content for', location.pathname);
  return <>{children}</>;
}

function ClubProProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('ClubProProtectedRoute: loading=', loading, 'user=', user ? 'exists' : 'none', 'role=', user?.role, 'pathname=', location.pathname);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (!user.role || (user.role.toLowerCase() !== 'club pro' && user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'clubpro')) {
        navigate('/');
      }
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!user) {
    return <div className="p-4 text-center">Redirecting to login...</div>;
  }

  const roleLc = (user.role || '').toLowerCase();
  if (roleLc !== 'club pro' && roleLc !== 'admin' && roleLc !== 'clubpro') {
    return <div className="p-4 text-center">Redirecting...</div>;
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('HomeRoute: loading=', loading, 'user=', user ? 'exists' : 'none', 'pathname=', location.pathname);
  
  useEffect(() => {
    if (!loading && user) {
      console.log('HomeRoute: User is logged in, redirecting to profile');
      navigate('/profile', { replace: true });
    }
  }, [loading, user, navigate]);
  
  if (loading) {
    console.log('HomeRoute: Showing loading state');
    return <div className="p-4 text-center">Loading...</div>;
  }
  
  if (user) {
    console.log('HomeRoute: User is logged in, showing loading while redirecting');
    return <div className="p-4 text-center">Redirecting to profile...</div>;
  }
  
  console.log('HomeRoute: Rendering dashboard for non-authenticated user');
  return <Dashboard />;
}

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  console.log('Navigation: user=', user ? 'exists' : 'none', 'current pathname=', location.pathname);

  const navigationItems = [
    ...(!user ? [{ to: "/", icon: Home, label: "Home" }] : []),
    { to: "/leaderboard", icon: Medal, label: "Leaderboard" },
    { to: "/tournaments", icon: Trophy, label: "Tournaments" },
    { to: "/simulator-courses", icon: MapPin, label: "Neighborhood Courses" },
    { to: "https://neighborhood-national.mn.co/", icon: Users, label: "Community", external: true },
    ...(user ? [{ to: "/profile", icon: User, label: "Profile" }] : []),
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center">
                <img src={process.env.PUBLIC_URL + "/Logo_N_Dark.png"} alt="NN Logo" className="h-8 w-auto sm:h-10" />
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navigationItems.map((item) => (
              item.external ? (
                <a
                  key={item.to}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                >
                  <item.icon className="w-5 h-5 mr-2" />
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                >
                  <item.icon className="w-5 h-5 mr-2" />
                  {item.label}
                </Link>
              )
            ))}
            
            {/* Auth Buttons */}
            <div className="ml-4 flex items-center space-x-2">
              {user ? (
                <>
                  <button
                    onClick={logout}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-3 rounded-md text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:ring-offset-2"
              aria-expanded="false"
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-4 pt-2 pb-4 space-y-2 bg-white/95 backdrop-blur-sm border-t border-gray-200">
          {navigationItems.map((item) => (
            item.external ? (
              <a
                key={item.to}
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-6 h-6 mr-3" />
                {item.label}
              </a>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-6 h-6 mr-3" />
                {item.label}
              </Link>
            )
          ))}
          
          {/* Mobile Auth Buttons */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            {user ? (
              <>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark-green to-brand-muted-green">

      
      {/* Navigation */}
      <Navigation />

      {/* Routes with different layouts */}
      <Routes>
        {/* Full-width routes */}
        <Route path="/weekly-scoring/:tournamentId" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ProtectedRoute>
              <NewWeeklyScoringWrapper />
            </ProtectedRoute>
          </main>
        } />
        <Route path="/weekly-leaderboard/:tournamentId" element={
          <NewWeeklyLeaderboardWrapper />
        } />
        
        {/* Standard container routes */}
        <Route path="/" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <HomeRoute />
          </main>
        } />
        <Route path="/leaderboard" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <Leaderboard />
          </main>
        } />
        <Route path="/leaderboard/tournament/:tournamentId" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <Leaderboard />
          </main>
        } />
        <Route path="/tournaments" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ProtectedRoute><AvailableTournamentsWrapper /></ProtectedRoute>
          </main>
        } />
        <Route path="/club-pro" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ClubProProtectedRoute><ClubProDashboard /></ClubProProtectedRoute>
          </main>
        } />
        <Route path="/scoring" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <Scoring />
          </main>
        } />
        <Route path="/tournament-scoring" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ProtectedRoute><TournamentScoring /></ProtectedRoute>
          </main>
        } />
        <Route path="/simulator-courses" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <SimulatorCourses />
          </main>
        } />
        <Route path="/profile" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ProtectedRoute><Profile /></ProtectedRoute>
          </main>
        } />
        <Route path="/admin" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ProtectedRoute><Admin /></ProtectedRoute>
          </main>
        } />
        <Route path="/tournament-management" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ProtectedRoute><TournamentManagement /></ProtectedRoute>
          </main>
        } />
        <Route path="/user-tracking" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <AdminProtectedRoute><UserTrackingPage /></AdminProtectedRoute>
          </main>
        } />
        <Route path="/admin/users/:userId" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <AdminProtectedRoute><AdminUserProfile /></AdminProtectedRoute>
          </main>
        } />
        <Route path="/login" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <Login />
          </main>
        } />
        <Route path="/claim-account" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ClaimAccount />
          </main>
        } />
        <Route path="/reset-password" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ResetPassword />
          </main>
        } />
        <Route path="/password-setup" element={
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ProtectedRoute><PasswordSetup /></ProtectedRoute>
          </main>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <ToastContainer />
      </Router>
    </AuthProvider>
  );
}

export default App;
