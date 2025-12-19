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

// Get API base URL - auto-detect based on current domain
const getApiBaseUrl = (): string => {
  // Auto-detect based on current domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Local development on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://100.114.25.42:3002/api';
    }

    // Local development on LAN IP (your local server)
    if (hostname === '100.114.25.42') {
      return 'http://100.114.25.42:3002/api';
    }

    // Production domains
    if (hostname === 'play.nngolf.co' || hostname === 'trackmansucks.com' || hostname === 'www.trackmansucks.com') {
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

// Get the server base URL (without /api) for static files like uploads
export const getServerBaseUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  // Remove /api suffix to get base server URL
  return apiUrl.replace(/\/api$/, '');
};

// Convert relative URLs (like /uploads/...) to absolute URLs
export const getAbsoluteUrl = (path: string): string => {
  if (!path) return '';
  // If already absolute, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Prepend server base URL
  return `${getServerBaseUrl()}${path}`;
};

// Log configuration in development
if (isDevelopment) {
  console.log('Environment Configuration:', {
    apiBaseUrl: environment.apiBaseUrl,
    nodeEnv: process.env.NODE_ENV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server'
  });
} 