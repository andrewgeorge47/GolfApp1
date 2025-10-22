import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, getCurrentUser } from './services/api';

interface ViewAsMode {
  isActive: boolean;
  originalUser: any;
  viewAsRole: string;
  viewAsClub: string;
}

interface AuthContextType {
  user: any;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  // View-as mode functionality
  viewAsMode: ViewAsMode;
  enterViewAsMode: (role: string, club: string) => void;
  exitViewAsMode: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken;
  });
  const [loading, setLoading] = useState(true);
  
  // View-as mode state
  const [viewAsMode, setViewAsMode] = useState<ViewAsMode>({
    isActive: false,
    originalUser: null,
    viewAsRole: '',
    viewAsClub: ''
  });
  
  // Helper to check if current user is admin (original user, not view-as)
  const isAdmin = user && (
    user.role?.toLowerCase() === 'admin' || 
    user.role?.toLowerCase() === 'super admin' ||
    (user.first_name === 'Andrew' && user.last_name === 'George')
  );

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await getCurrentUser(token);
          setUser(res.data.user);
        } catch (error) {
          console.error('AuthContext: Token validation failed:', error);
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await getCurrentUser(token);
        setUser(res.data.user);
      } catch (error) {
        console.error('AuthContext: Error refreshing user data:', error);
        // Don't logout on refresh failure, just log the error
      }
    }
  };

  // View-as mode functions
  const enterViewAsMode = (role: string, club: string) => {
    if (!isAdmin) {
      console.error('Only admins can enter view-as mode');
      return;
    }
    
    const originalUser = user;
    const viewAsUser = {
      ...originalUser,
      role: role,
      club: club
    };
    
    setViewAsMode({
      isActive: true,
      originalUser: originalUser,
      viewAsRole: role,
      viewAsClub: club
    });
    
    setUser(viewAsUser);
  };

  const exitViewAsMode = () => {
    if (viewAsMode.isActive && viewAsMode.originalUser) {
      setUser(viewAsMode.originalUser);
      setViewAsMode({
        isActive: false,
        originalUser: null,
        viewAsRole: '',
        viewAsClub: ''
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      loading, 
      refreshUser,
      viewAsMode,
      enterViewAsMode,
      exitViewAsMode,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}; 