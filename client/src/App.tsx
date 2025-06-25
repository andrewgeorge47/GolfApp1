import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home, Users, Trophy, Settings, BarChart3, Plus } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Scoring from './components/Scoring';
import Admin from './components/Admin';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-brand-dark-green to-brand-muted-green">
          {/* Navigation */}
          <nav className="bg-white/95 backdrop-blur-sm shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img src={process.env.PUBLIC_URL + "/logo-color.svg"} alt="Golf League Logo" className="h-10 w-auto" />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Leaderboard
                  </Link>
                  <Link
                    to="/scoring"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Scoring
                  </Link>
                  <Link
                    to="/admin"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-brand-black hover:bg-brand-neon-green hover:text-brand-black transition-colors"
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    Admin
                  </Link>
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
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
