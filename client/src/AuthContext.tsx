import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, getCurrentUser } from './services/api';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken;
  });
  const [loading, setLoading] = useState(true);

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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}; 