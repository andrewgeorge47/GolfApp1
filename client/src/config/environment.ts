// Environment configuration for the Golf League App
export interface EnvironmentConfig {
  apiBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  appName: string;
}

// Determine the current environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Get API base URL from environment variable or determine automatically
const getApiBaseUrl = (): string => {
  // If explicitly set via environment variable, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Auto-detect based on current domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    
    if (hostname === 'play.nngolf.co' || hostname === 'trackmansucks.com') {
      return 'https://golfapp1.onrender.com/api';
    }
  }
  
  // Fallback for production builds
  if (isProduction) {
    return 'https://golfapp1.onrender.com/api';
  }
  
  // Default fallback
  return 'http://localhost:3001/api';
};

export const environment: EnvironmentConfig = {
  apiBaseUrl: getApiBaseUrl(),
  isDevelopment,
  isProduction,
  appName: 'Golf League App'
};

// Log configuration in development
if (isDevelopment) {
  console.log('Environment Configuration:', {
    apiBaseUrl: environment.apiBaseUrl,
    nodeEnv: process.env.NODE_ENV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server'
  });
} 