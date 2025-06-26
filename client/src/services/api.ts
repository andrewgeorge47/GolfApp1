import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  member_id: number;
  first_name: string;
  last_name: string;
  email: string;
  club: string;
  handicap?: number;
  role: string;
  created_at: string;
}

export interface Tournament {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  type: string;
  status?: string;
  created_at: string;
}

export interface LeagueSettings {
  id: number;
  name: string;
  description: string;
  min_matches: number;
  scoring_rules: {
    win: number;
    tie: number;
    loss: number;
  };
  status: string;
  tournament_date: string;
  created_at: string;
}

export interface Match {
  id: number;
  player1_id: number;
  player2_id: number;
  scores: any;
  winner: string;
  match_date: string;
  created_at: string;
}

export interface UserProfile {
  user_id: number;
  total_matches: number;
  wins: number;
  losses: number;
  ties: number;
  total_points: number;
  win_rate: number;
  last_updated: string;
}

export interface Scorecard {
  id: number;
  user_id: number;
  type: 'stroke_play' | 'mully_golf';
  player_name: string;
  date_played: string;
  handicap: number;
  scores: any;
  total_strokes: number;
  total_mulligans: number;
  final_score: number;
  created_at: string;
}

// Health check
export const healthCheck = () => api.get('/health');

// Database setup
export const setupDatabase = () => api.post('/setup-database');

// Users
export const getUsers = () => api.get<User[]>('/users');
export const createUser = (userData: Partial<User>) => api.post<User>('/users', userData);
export const updateUser = (id: number, userData: Partial<User>) => api.put<User>(`/users/${id}`, userData);
export const deleteUser = (id: number) => api.delete(`/users/${id}`);

// Players
export const getPlayers = () => api.get<User[]>('/players');

// League settings
export const getLeagueSettings = () => api.get<LeagueSettings>('/league/settings');
export const updateLeagueSettings = (settings: Partial<LeagueSettings>) => api.put<LeagueSettings>('/league/settings', settings);

// League players
export const getLeaguePlayers = () => api.get('/league/players');
export const addLeaguePlayer = (userId: number) => api.post('/league/players', { user_id: userId });
export const removeLeaguePlayer = (userId: number) => api.delete(`/league/players/${userId}`);

// Matches
export const getMatches = () => api.get<Match[]>('/matches');
export const createMatch = (matchData: Partial<Match>) => api.post<Match>('/matches', matchData);
export const updateMatch = (id: number, matchData: Partial<Match>) => api.put<Match>(`/matches/${id}`, matchData);
export const deleteMatch = (id: number) => api.delete(`/matches/${id}`);

// User profiles
export const getUserProfiles = () => api.get<UserProfile[]>('/user-profiles');
export const getUserProfile = (userId: number) => api.get<UserProfile>(`/user-profiles/${userId}`);

// Scorecards
export const saveScorecard = (scorecardData: {
  type: 'stroke_play' | 'mully_golf';
  player_name: string;
  date_played: string;
  handicap: number;
  scores: any;
  total_strokes: number;
  total_mulligans: number;
  final_score: number;
}) => api.post<Scorecard>('/scorecards', scorecardData);

export const getScorecards = () => api.get<Scorecard[]>('/scorecards');
export const getScorecard = (id: number) => api.get<Scorecard>(`/scorecards/${id}`);
export const deleteScorecard = (id: number) => api.delete(`/scorecards/${id}`);

// Leaderboard
export const getLeaderboard = (tournamentId?: number) => {
  const params = tournamentId ? `?tournament_id=${tournamentId}` : '';
  return api.get(`/leaderboard${params}`);
};

export const login = (email: string, password: string) => api.post('/auth/login', { email, password });
export const register = (data: { first_name: string; last_name: string; email: string; password: string; club?: string; role?: string }) => api.post('/auth/register', data);
export const getCurrentUser = (token: string) => api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });

export const createTournament = (data: { name: string; start_date?: string; end_date?: string; notes?: string }) => api.post('/tournaments', data);

export const getTournaments = () => api.get('/tournaments');
export const updateTournament = (id: number, data: any) => api.put(`/tournaments/${id}`, data);
export const deleteTournament = (id: number) => api.delete(`/tournaments/${id}`);

// Tournament participants
export const getTournamentParticipants = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/participants`);
export const registerUserForTournament = (tournamentId: number, userId: number) => api.post(`/tournaments/${tournamentId}/register`, { user_id: userId });
export const unregisterUserFromTournament = (tournamentId: number, userId: number) => api.delete(`/tournaments/${tournamentId}/unregister/${userId}`);

// Tournament check-ins
export const getTournamentCheckIns = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/check-ins`);
export const checkInUser = (tournamentId: number, userId: number, notes?: string) => api.post(`/tournaments/${tournamentId}/check-in`, { user_id: userId, notes });
export const checkOutUser = (tournamentId: number, userId: number) => api.put(`/tournaments/${tournamentId}/check-out/${userId}`);

// Tournament statistics
export const getTournamentStats = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/stats`);

// Tournament matches
export const getTournamentMatches = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/matches`);
export const generateTournamentMatches = (tournamentId: number, format: string, minMatchesPerPlayer: number = 3) => 
  api.post(`/tournaments/${tournamentId}/generate-matches`, { format, minMatchesPerPlayer });
export const updateTournamentMatch = (tournamentId: number, matchId: number, data: any) => 
  api.put(`/tournaments/${tournamentId}/matches/${matchId}`, data);

export default api; 