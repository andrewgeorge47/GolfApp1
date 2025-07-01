import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home, Users, Trophy, Settings, BarChart3, Plus, User, Menu, X, MapPin } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Scoring from './components/Scoring';
import Admin from './components/Admin';
import Profile from './components/Profile';
import SimulatorCourses from './components/SimulatorCourses';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import PasswordSetup from './components/PasswordSetup';
import ClaimAccount from './components/ClaimAccount';
import ResetPassword from './components/ResetPassword';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navigationItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { to: "/scoring", icon: Plus, label: "Scoring" },
    { to: "/simulator-courses", icon: MapPin, label: "Simulator Courses" },
    { to: "/profile", icon: User, label: "Profile" },
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
                    <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-10 w-auto" />
                  </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                    >
                      <item.icon className="w-5 h-5 mr-2" />
                      {item.label}
                    </Link>
                  ))}
                  
                  {/* Auth Buttons */}
                  <div className="ml-4 flex items-center space-x-2">
                    {user ? (
                      <>
                        <span className="text-sm text-neutral-600">
                          Welcome, {user.first_name}!
                        </span>
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
                        <Link
                          to="/claim-account"
                          className="flex items-center px-4 py-2 rounded-md text-sm font-medium bg-brand-neon-green text-brand-black hover:bg-green-400 transition-colors"
                        >
                          Claim Account
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile menu button */}
                <div className="md:hidden flex items-center">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                    aria-expanded="false"
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
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white/95 backdrop-blur-sm border-t border-gray-200">
                {navigationItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center px-3 py-3 rounded-md text-base font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-6 h-6 mr-3" />
                    {item.label}
                  </Link>
                ))}
                
                {/* Mobile Auth Buttons */}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  {user ? (
                    <>
                      <div className="px-3 py-2 text-sm text-neutral-600">
                        Welcome, {user.first_name}!
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="flex items-center px-3 py-3 rounded-md text-base font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Login
                      </Link>
                      <Link
                        to="/claim-account"
                        className="flex items-center px-3 py-3 rounded-md text-base font-medium bg-brand-neon-green text-brand-black hover:bg-green-400 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Claim Account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/scoring" element={<Scoring />} />
              <Route path="/simulator-courses" element={<SimulatorCourses />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
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
