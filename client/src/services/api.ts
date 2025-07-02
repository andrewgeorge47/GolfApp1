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
  sim_handicap?: number;
  grass_handicap?: number;
  profile_photo_url?: string;
  role: string;
  created_at: string;
}

export interface Tournament {
  id: number;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string;
  max_participants?: number;
  min_participants?: number;
  tournament_format?: string;
  status?: string;
  registration_open?: boolean;
  entry_fee?: number;
  location?: string;
  course?: string;
  rules?: string;
  notes?: string;
  type: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
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

export interface SimStats {
  total_rounds: number;
  rounds_with_differential: number;
  avg_differential: number | null;
  best_differential: number | null;
  worst_differential: number | null;
  avg_strokes: number | null;
  best_strokes: number | null;
  worst_strokes: number | null;
  unique_courses: number;
  unique_dates: number;
  first_round: string | null;
  last_round: string | null;
  recent_rounds: Array<{
    id: number;
    date_played: string;
    course_name: string;
    total_strokes: number;
    differential: number | null;
    round_type: string;
  }>;
  course_breakdown: Array<{
    course_name: string;
    rounds_played: number;
    avg_strokes: number;
    best_strokes: number;
    avg_differential: number;
    best_differential: number;
  }>;
}

export interface LeaderboardPlayer {
  member_id: number;
  first_name: string;
  last_name: string;
  club: string;
  role: string;
  sim_handicap?: number;
  grass_handicap?: number;
  total_matches: number;
  wins: number;
  losses: number;
  ties: number;
  total_points: number;
  win_rate: number;
  total_sim_rounds: number;
  avg_sim_score: number;
  best_sim_score: number;
  total_sim_courses: number;
  last_round_date: string;
  rounds_this_month: number;
}

export interface CourseRecord {
  course_id: number;
  course_name: string;
  location: string | null;
  designer: string | null;
  platforms: string[];
  best_score: number;
  date_played: string;
  first_name: string;
  last_name: string;
  club: string;
  user_id: number;
  scorecard_id: number;
  record_club: string | null;
}

export interface LeaderboardStats {
  players: LeaderboardPlayer[];
  courseRecords: CourseRecord[];
  recentMatches: Array<{
    id: number;
    tournament_name?: string;
    player1_first_name: string;
    player1_last_name: string;
    player2_first_name: string;
    player2_last_name: string;
    winner_name?: string;
    created_at: string;
  }>;
  overallStats: {
    total_players: number;
    total_matches: number;
    total_rounds: number;
    total_courses_played: number;
    avg_score: number;
    best_score_overall: number;
  };
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
export const getUserSimStats = (id: number) => api.get<SimStats>(`/users/${id}/sim-stats`);
export const getUserGrassStats = (id: number) => api.get<SimStats>(`/users/${id}/grass-stats`);
export const getUserCombinedStats = (id: number) => api.get<SimStats>(`/users/${id}/combined-stats`);

// Profile photo upload
export const uploadProfilePhoto = (file: File) => {
  const formData = new FormData();
  formData.append('profilePhoto', file);
  
  return api.post('/users/profile-photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

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
  round_type?: 'sim' | 'grass';
  course_name?: string;
  teebox?: string;
  course_rating?: number;
  course_slope?: number;
}) => api.post<Scorecard>('/scorecards', scorecardData);

export const getScorecards = () => api.get<Scorecard[]>('/scorecards');
export const getScorecard = (id: number) => api.get<Scorecard>(`/scorecards/${id}`);
export const deleteScorecard = (id: number) => api.delete(`/scorecards/${id}`);

// Leaderboard
export const getLeaderboard = (tournamentId?: number) => {
  const url = tournamentId ? `/leaderboard?tournament_id=${tournamentId}` : '/leaderboard';
  return api.get(url);
};

export const getLeaderboardStats = async () => {
  return api.get<LeaderboardStats>('/leaderboard-stats');
};

// Global Community Leaderboard
export interface GlobalLeaderboardData {
  communityStats: {
    total_players: number;
    total_clubs: number;
    total_rounds: number;
    total_course_records: number;
    total_courses_played: number;
    courses_without_records: number;
  };
  clubStandings: {
    courseRecords: {
      allTime: Array<{
        club: string;
        record_count: number;
      }>;
      monthly: Array<{
        club: string;
        record_count: number;
      }>;
    };
    roundsLogged: {
      allTime: Array<{
        club: string;
        rounds_count: number;
      }>;
      monthly: Array<{
        club: string;
        rounds_count: number;
      }>;
    };
    averageScore: {
      allTime: Array<{
        club: string;
        avg_score: number;
        rounds_count: number;
      }>;
      monthly: Array<{
        club: string;
        avg_score: number;
        rounds_count: number;
      }>;
    };
  };
}

export const getGlobalLeaderboard = async () => {
  return api.get<GlobalLeaderboardData>('/global-leaderboard');
};

// Individual Club Leaderboard
export interface ClubLeaderboardData {
  club: string;
  topRecordHolders: Array<{
    member_id: number;
    first_name: string;
    last_name: string;
    record_count: number;
  }>;
  longestStandingRecord: {
    course_id: number;
    date_played: string;
    days_standing: number;
    first_name: string;
    last_name: string;
    course_name: string;
  } | null;
  mostActiveMembers: Array<{
    member_id: number;
    first_name: string;
    last_name: string;
    total_rounds: number;
    rounds_this_month: number;
  }>;
  clubAverageScore: {
    avg_score: number;
    total_rounds: number;
    best_score: number;
    worst_score: number;
  };
  mostPlayedCourse: {
    course_name: string;
    play_count: number;
    avg_score: number;
  } | null;
  mostRecentRecord: {
    course_id: number;
    date_played: string;
    first_name: string;
    last_name: string;
    course_name: string;
    total_strokes: number;
  } | null;
  clubCourseRecords: Array<{
    course_id: number;
    total_strokes: number;
    date_played: string;
    first_name: string;
    last_name: string;
    course_name: string;
    days_standing: number;
  }>;
  clubMemberStats: Array<{
    member_id: number;
    first_name: string;
    last_name: string;
    sim_handicap?: number;
    grass_handicap?: number;
    total_matches: number;
    wins: number;
    losses: number;
    ties: number;
    total_points: number;
    win_rate: number;
    total_rounds: number;
    avg_score: number;
    best_score: number;
    unique_courses: number;
    rounds_this_month: number;
  }>;
}

export const getClubLeaderboard = async (club: string) => {
  return api.get<ClubLeaderboardData>(`/club-leaderboard/${encodeURIComponent(club)}`);
};

export const getAllClubs = async () => {
  return api.get<string[]>('/clubs');
};

export const login = (email: string, password: string) => api.post('/auth/login', { email, password });
export const register = (userData: { first_name: string; last_name: string; email: string; password: string; club?: string }) => 
  api.post('/auth/register', userData);
export const checkEmail = (email: string) => api.post('/auth/check-email', { email });
export const claimAccount = (email: string, password: string) => api.post('/auth/claim-account', { email, password });
export const resetPassword = (email: string, password: string) => api.post('/auth/reset-password', { email, password });
export const getCurrentUser = (token: string) => api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
export const setupPassword = (password: string) => api.post('/auth/setup-password', { password });

export const createTournament = (data: { 
  name: string; 
  description?: string;
  start_date?: string; 
  end_date?: string; 
  registration_deadline?: string;
  max_participants?: number;
  min_participants?: number;
  tournament_format?: string;
  status?: string;
  registration_open?: boolean;
  entry_fee?: number;
  location?: string;
  course?: string;
  rules?: string;
  notes?: string; 
  type?: string;
  created_by?: number;
}) => api.post('/tournaments', data);

export const getTournaments = () => api.get('/tournaments');
export const getTournamentsByStatus = (status: string) => api.get(`/tournaments/status/${status}`);
export const getAvailableTournaments = () => api.get('/tournaments/available');
export const updateTournament = (id: number, data: any) => api.put(`/tournaments/${id}`, data);
export const deleteTournament = (id: number) => api.delete(`/tournaments/${id}`);

// Tournament formation management
export const updateTournamentStatus = (id: number, status: string) => api.put(`/tournaments/${id}/status`, { status });
export const updateTournamentRegistration = (id: number, registration_open: boolean) => api.put(`/tournaments/${id}/registration`, { registration_open });
export const getTournamentFormationStats = (id: number) => api.get(`/tournaments/${id}/formation-stats`);

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

// Simulator Courses
export const getSimulatorCourses = (search?: string, platform?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (platform) params.append('platform', platform);
  if (limit) params.append('limit', limit.toString());
  return api.get(`/simulator-courses?${params.toString()}`);
};

export const updateCourseParValues = (courseId: number, parValues: number[]) => 
  api.put(`/simulator-courses/${courseId}/par-values`, { par_values: parValues });

export const updateCourseTeeboxData = (courseId: number, teebox: string, courseRating: number, courseSlope: number) => 
  api.put(`/simulator-courses/${courseId}/teebox-data`, { teebox, course_rating: courseRating, course_slope: courseSlope });

export const getCourseTeeboxData = (courseId: number) => 
  api.get(`/simulator-courses/${courseId}/teebox-data`);

export default api; 