import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home, Users, Trophy, Settings, BarChart3, Plus, User, Menu, X, MapPin, Award } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Scoring from './components/Scoring';
import Admin from './components/Admin';
import TournamentManagement from './components/TournamentManagement';
import Profile from './components/Profile';
import SimulatorCourses from './components/SimulatorCourses';
import UserTrackingPage from './components/UserTrackingPage';
import AvailableTournaments from './components/AvailableTournaments';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import PasswordSetup from './components/PasswordSetup';
import ClaimAccount from './components/ClaimAccount';
import ResetPassword from './components/ResetPassword';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4 text-center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role?.toLowerCase() !== 'admin') {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (user) return <Navigate to="/profile" replace />;
  return <Dashboard />;
}

function AppContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navigationItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { to: "/simulator-courses", icon: MapPin, label: "Neighborhood Courses" },
    { to: "https://neighborhood-national.mn.co/", icon: Users, label: "Community", external: true },
    ...(user ? [{ to: "/profile", icon: User, label: "Profile" }] : []),
  ];

  return (
    <Router>
        <div className="min-h-screen bg-gradient-to-br from-brand-dark-green to-brand-muted-green">
          {/* Navigation */}
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

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/leaderboard/tournament/:tournamentId" element={<Leaderboard />} />
              <Route path="/tournaments" element={<ProtectedRoute><AvailableTournaments /></ProtectedRoute>} />
              <Route path="/scoring" element={<Scoring />} />
              <Route path="/simulator-courses" element={<SimulatorCourses />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/tournament-management" element={<AdminProtectedRoute><TournamentManagement /></AdminProtectedRoute>} />
              <Route path="/user-tracking" element={<ProtectedRoute><UserTrackingPage /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/claim-account" element={<ClaimAccount />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/password-setup" element={<ProtectedRoute><PasswordSetup /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </Router>
    );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
