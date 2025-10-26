import axios from 'axios';
import { environment } from '../config/environment';
import type { Role, Permission, RoleCreateRequest, RoleUpdateRequest, AuditLogEntry } from '../types/permissions';

// Normalize a date-like input to 'YYYY-MM-DD' string
const normalizeYMD = (d?: string) => {
  if (!d) return '';
  // If already looks like YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const iso = new Date(d).toISOString();
    return iso.split('T')[0];
  } catch {
    return d.split('T')[0] || '';
  }
};

const api = axios.create({
  baseURL: environment.apiBaseUrl,
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
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.config?.url, error.message);
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      // Use window.location for hash router compatibility
      window.location.href = '#/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  member_id: number;
  first_name: string;
  last_name: string;
  email_address: string;
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
  course_id?: number;
  rules?: string;
  notes?: string;
  type: string;
  club_restriction?: string;
  team_size?: number;
  hole_configuration?: string;
  tee?: string;
  pins?: string;
  putting_gimme?: string;
  elevation?: string;
  stimp?: string;
  mulligan?: string;
  game_play?: string;
  firmness?: string;
  wind?: string;
  handicap_enabled?: boolean;
  has_registration_form?: boolean;
  registration_form_template?: string;
  registration_form_data?: any;
  payment_organizer?: 'jeff' | 'adam' | 'other';
  payment_organizer_name?: string;
  payment_venmo_url?: string;
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

export interface UserCourseRecord {
  course_id: number;
  record_club: string | null;
  best_score: number;
  date_played: string;
  scorecard_id: number;
  course_name: string;
  location: string | null;
  designer: string | null;
  platforms: string[];
  days_standing: number;
}

export interface RecentSimulatorRound {
  id: number;
  date_played: string;
  course_name: string;
  total_strokes: number;
  differential: number | null;
  round_type: string | null;
  handicap: number | null;
  handicap_status: string;
  handicap_status_color: string;
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

export const getUserCourseRecords = (userId: number) => api.get(`/user-course-records/${userId}`);

export const getUserRecentSimulatorRounds = (userId: number) => api.get(`/users/${userId}/recent-simulator-rounds`);

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

// Scorecard photo upload
export const uploadScorecardPhoto = (file: File) => {
  const formData = new FormData();
  formData.append('scorecardPhoto', file);
  
  return api.post('/tournaments/scorecard-photo', formData, {
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
  tournament_id?: number;
}) => api.post<Scorecard>('/scorecards', scorecardData);

// Tournament strokeplay score functions
export const submitTournamentStrokeplayScore = (tournamentId: number, data: {
  total_score: number;
  hole_scores?: Array<{ hole: number; score: number }>;
  notes?: string;
  scorecard_photo_url?: string;
  player_id?: number;
}) => api.post(`/tournaments/${tournamentId}/strokeplay-score`, data);

export const getTournamentStrokeplayScores = (tournamentId: number) => 
  api.get(`/tournaments/${tournamentId}/strokeplay-scores`);

export const getTournamentScores = (tournamentId: number) => 
  api.get(`/tournaments/${tournamentId}/scores`);

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
  course_id?: number;
  rules?: string;
  notes?: string; 
  type?: string;
  club_restriction?: string;
  team_size?: number;
  hole_configuration?: string;
  tee?: string;
  pins?: string;
  putting_gimme?: string;
  elevation?: string;
  stimp?: string;
  mulligan?: string;
  game_play?: string;
  firmness?: string;
  wind?: string;
  handicap_enabled?: boolean;
  has_registration_form?: boolean;
  registration_form_template?: string;
  registration_form_data?: any;
  payment_organizer?: 'jeff' | 'adam' | 'other';
  payment_organizer_name?: string;
  payment_venmo_url?: string;
  created_by?: number;
}) => api.post('/tournaments', data);

export const getTournaments = () => api.get('/tournaments');
export const getTournament = (id: number) => api.get(`/tournaments/${id}`);
export const getUserTournaments = (userId: number) => api.get(`/tournaments/user/${userId}`);
export const getTournamentsByStatus = (status: string) => api.get(`/tournaments/status/${status}`);
export const getAvailableTournaments = () => api.get('/tournaments/available');
export const updateTournament = (id: number, data: {
  name?: string;
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
  course_id?: number;
  rules?: string;
  notes?: string;
  type?: string;
  club_restriction?: string;
  team_size?: number;
  hole_configuration?: string;
  tee?: string;
  pins?: string;
  putting_gimme?: string;
  elevation?: string;
  stimp?: string;
  mulligan?: string;
  game_play?: string;
  firmness?: string;
  wind?: string;
  handicap_enabled?: boolean;
  has_registration_form?: boolean;
  registration_form_template?: string;
  registration_form_data?: any;
  payment_organizer?: 'jeff' | 'adam' | 'other';
  payment_organizer_name?: string;
  payment_venmo_url?: string;
  created_by?: number;
}) => api.put(`/tournaments/${id}`, data);
export const deleteTournament = (id: number) => api.delete(`/tournaments/${id}`);

// Tournament formation management
export const updateTournamentStatus = (id: number, status: string) => api.put(`/tournaments/${id}/status`, { status });
export const updateTournamentRegistration = (id: number, registration_open: boolean) => api.put(`/tournaments/${id}/registration`, { registration_open });
export const getTournamentFormationStats = (id: number) => api.get(`/tournaments/${id}/formation-stats`);

// Tournament participants
export const getTournamentParticipants = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/participants`);
export const registerUserForTournament = (tournamentId: number, userId: number) => api.post(`/tournaments/${tournamentId}/register`, { user_id: userId });
export const registerUserForTournamentWithForm = (tournamentId: number, userId: number, formData: any) => 
  api.post(`/tournaments/${tournamentId}/register-with-form`, { user_id: userId, form_data: formData });
export const unregisterUserFromTournament = (tournamentId: number, userId: number) => api.delete(`/tournaments/${tournamentId}/unregister/${userId}`);
export const getTournamentRegistrationResponses = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/registration-responses`);

// Tournament check-ins
export const getTournamentCheckIns = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/check-ins`);
export const checkInUser = (tournamentId: number, userId: number, notes?: string) => api.post(`/tournaments/${tournamentId}/check-in`, { user_id: userId, notes });
export const checkOutUser = (tournamentId: number, userId: number) => api.put(`/tournaments/${tournamentId}/check-out/${userId}`);

// Payment functions
export const submitPayment = (tournamentId: number, userId: number, paymentData: {
  payment_method: 'venmo';
  payment_amount: number;
  payment_notes?: string;
}) => api.post(`/tournaments/${tournamentId}/payment`, { user_id: userId, ...paymentData });

export const getPaymentStatus = (tournamentId: number, userId: number) => 
  api.get(`/tournaments/${tournamentId}/payment-status/${userId}`);

export const getUserCheckInStatuses = (userId: number) => 
  api.get(`/users/${userId}/check-in-statuses`);

// Tournament statistics
export const getTournamentStats = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/stats`);

// Tournament matches
export const getTournamentMatches = (tournamentId: number) => api.get(`/tournaments/${tournamentId}/matches`);
export const generateTournamentMatches = (tournamentId: number, format: string, minMatchesPerPlayer: number = 3) => 
  api.post(`/tournaments/${tournamentId}/generate-matches`, { format, minMatchesPerPlayer });
export const updateTournamentMatch = (tournamentId: number, matchId: number, data: any) => 
  api.put(`/tournaments/${tournamentId}/matches/${matchId}`, data);
export const createTournamentMatch = (tournamentId: number, data: any) => 
  api.post(`/tournaments/${tournamentId}/matches`, data);

// Team management API functions
export interface Team {
  id: number;
  tournament_id: number;
  name: string;
  captain_id: number;
  captain_first_name: string;
  captain_last_name: string;
  captain_club: string;
  max_players: number;
  created_at: string;
  updated_at: string;
  players: Array<{
    user_member_id: number;
    first_name: string;
    last_name: string;
    club: string;
  }>;
}

export interface TeamScore {
  id: number;
  team_id: number;
  tournament_id: number;
  total_score: number;
  hole_scores?: any;
  submitted_by: number;
  submitted_at: string;
  team_name: string;
  captain_first_name: string;
  captain_last_name: string;
  captain_club: string;
  players: Array<{
    user_member_id: number;
    first_name: string;
    last_name: string;
    club: string;
    is_captain: boolean;
  }>;
}

export const createTeam = (tournamentId: number, data: { 
  name: string; 
  captain_id: number; 
  player_ids?: number[]; 
}) => api.post<Team>(`/tournaments/${tournamentId}/teams`, data);

export const getTeams = (tournamentId: number) => api.get<Team[]>(`/tournaments/${tournamentId}/teams`);

export const updateTeam = (tournamentId: number, teamId: number, data: { 
  name?: string; 
  captain_id?: number; 
  player_ids?: number[]; 
}) => api.put<Team>(`/tournaments/${tournamentId}/teams/${teamId}`, data);

export const deleteTeam = (tournamentId: number, teamId: number) => api.delete(`/tournaments/${tournamentId}/teams/${teamId}`);

export const submitTeamScore = (tournamentId: number, teamId: number, data: { 
  total_score: number; 
  hole_scores?: any; 
  submitted_by: number; 
}) => api.post<TeamScore>(`/tournaments/${tournamentId}/teams/${teamId}/score`, data);

export const getTeamScores = (tournamentId: number) => api.get<TeamScore[]>(`/tournaments/${tournamentId}/team-scores`);

// Simulator Courses
export const getSimulatorCourses = (search?: string, platform?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (platform) params.append('platform', platform);
  if (limit) params.append('limit', limit.toString());
  return api.get(`/simulator-courses?${params.toString()}`);
};

// Get a single simulator course by ID
export const getSimulatorCourse = (id: number) => {
  return api.get(`/simulator-courses/${id}`);
};

export const updateCourseParValues = (courseId: number, parValues: number[]) => 
  api.put(`/simulator-courses/${courseId}/par-values`, { par_values: parValues });

export const updateCourseHoleIndexes = (courseId: number, holeIndexes: number[]) => 
  api.put(`/simulator-courses/${courseId}/hole-indexes`, { hole_indexes: holeIndexes });

export const updateCourseTeeboxData = (courseId: number, teebox: string, courseRating: number, courseSlope: number) => 
  api.put(`/simulator-courses/${courseId}/teebox-data`, { teebox, course_rating: courseRating, course_slope: courseSlope });

export const getCourseTeeboxData = (courseId: number) => 
  api.get(`/simulator-courses/${courseId}/teebox-data`);

// Get user's appropriate course for a tournament based on their club
export const getUserCourse = (tournamentId: number, userId: number) => {
  return api.get(`/tournaments/${tournamentId}/user-course/${userId}`);
};

// Admin user tracking interfaces
export interface UserTrackingStats {
  userStats: {
    total_users: string;
    claimed_accounts: string;
    unclaimed_accounts: string;
  };
  roundsByDay: Array<{
    date: string;
    rounds_count: string;
  }>;
  recentRoundsByDay: Array<{
    date: string;
    rounds_count: string;
    sim_rounds: string;
    grass_rounds: string;
  }>;
  topUsers: Array<{
    first_name: string;
    last_name: string;
    club: string;
    rounds_count: string;
  }>;
  clubStats: Array<{
    club: string;
    total_users: string;
    claimed_accounts: string;
    unclaimed_accounts: string;
  }>;
}

export interface UserTrackingDetails {
  member_id: number;
  first_name: string;
  last_name: string;
  email_address: string;
  club: string;
  role: string;
  has_claimed_account: boolean;
  total_rounds: number;
  sim_rounds: number;
  grass_rounds: number;
  first_round_date: string | null;
  last_round_date: string | null;
}

// Admin user tracking API functions
export const getUserTrackingStats = () => api.get<UserTrackingStats>('/admin/user-tracking-stats');

export const getUserTrackingDetails = (params?: {
  startDate?: string;
  endDate?: string;
  club?: string;
}) => api.get<UserTrackingDetails[]>('/admin/user-tracking-details', { params });

// ============================================================================
// NEW WEEKLY SCORING SYSTEM INTERFACES AND API FUNCTIONS
// ============================================================================

export interface WeeklyScorecard {
  id: number;
  user_id: number;
  tournament_id: number;
  week_start_date: string;
  hole_scores: number[];
  total_score: number;
  is_live: boolean;
  group_id?: string;
  submitted_at: string;
  created_at: string;
}

export interface WeeklyLeaderboardEntry {
  user_id: number;
  first_name: string;
  last_name: string;
  club: string;
  total_hole_points: number | string;
  total_round_points: number | string;
  total_score: number | string;
  matches_played: number | string;
  matches_won: number | string;
  matches_tied: number | string;
  matches_lost: number | string;
  live_matches_played: number | string;
}

export interface WeeklyMatch {
  id: number;
  tournament_id: number;
  week_start_date: string;
  player1_id: number;
  player2_id: number;
  player1_first_name: string;
  player1_last_name: string;
  player2_first_name: string;
  player2_last_name: string;
  hole_points_player1: number | string;
  hole_points_player2: number | string;
  round1_points_player1: number | string;
  round1_points_player2: number | string;
  round2_points_player1: number | string;
  round2_points_player2: number | string;
  round3_points_player1: number | string;
  round3_points_player2: number | string;
  match_winner_id: number | null;

  total_points_player1: number | string;
  total_points_player2: number | string;
  player1_scores: number[];
  player2_scores: number[];
  created_at: string;
}

// Get available weeks for a tournament
export const getAvailableWeeks = (tournamentId: number) => {
  return api.get<string[]>(`/tournaments/${tournamentId}/available-weeks`);
};

// Weekly Scoring API Functions
export const submitWeeklyScorecard = (tournamentId: number, data: {
  hole_scores: number[];
  is_live?: boolean;
  group_id?: string;
  week_start_date?: string;
}) => {
  return api.post<WeeklyScorecard>(`/tournaments/${tournamentId}/weekly-scorecard`, data);
};

export const getWeeklyLeaderboard = (tournamentId: number, weekStartDate?: string) => 
  api.get<WeeklyLeaderboardEntry[]>(`/tournaments/${tournamentId}/weekly-leaderboard?week_start_date=${normalizeYMD(weekStartDate)}`);

export const getWeeklyMatches = (tournamentId: number, userId: number, weekStartDate?: string) =>
  api.get<WeeklyMatch[]>(`/tournaments/${tournamentId}/weekly-matches/${userId}?week_start_date=${normalizeYMD(weekStartDate)}`);

export const getWeeklyScorecard = (tournamentId: number, userId: number, weekStartDate?: string) =>
  api.get<WeeklyScorecard>(`/tournaments/${tournamentId}/weekly-scorecard/${userId}?week_start_date=${normalizeYMD(weekStartDate)}`);

export const getWeeklyFieldStats = (tournamentId: number, weekStartDate?: string) =>
  api.get(`/tournaments/${tournamentId}/weekly-field-stats?week_start_date=${normalizeYMD(weekStartDate)}`);

export const getCurrentWeeklyScorecard = (tournamentId: number, weekStartDate?: string, fallbackDate?: string) =>
  api.get<WeeklyScorecard>(`/tournaments/${tournamentId}/weekly-scorecard/current?week_start_date=${normalizeYMD(weekStartDate)}&fallback_date=${normalizeYMD(fallbackDate)}`);

export const getWeeklyScorecards = (tournamentId: number, weekStartDate?: string) =>
  api.get<WeeklyScorecard[]>(`/tournaments/${tournamentId}/weekly-scorecards?week_start_date=${normalizeYMD(weekStartDate)}`);

export const getWeeklyHolePoints = (tournamentId: number, userId: number, weekStartDate?: string) =>
  api.get(`/tournaments/${tournamentId}/weekly-hole-points/${userId}?week_start_date=${normalizeYMD(weekStartDate)}`);

// Admin functions for tournament management
export const forceCalculateMatches = (tournamentId: number, weekStartDate?: string) => {
  const params = weekStartDate ? `?override_week=${weekStartDate}` : '';
  return api.post(`/tournaments/${tournamentId}/calculate-matches${params}`);
};

export const forceUpdateLeaderboard = (tournamentId: number, weekStartDate?: string) => {
  const params = weekStartDate ? `?override_week=${weekStartDate}` : '';
  return api.post(`/tournaments/${tournamentId}/update-leaderboard${params}`);
};

export const cleanupDuplicateMatches = (tournamentId: number) => api.post(`/tournaments/${tournamentId}/cleanup-duplicates`);
export const fixTournamentWeekDate = (tournamentId: number) => api.post(`/tournaments/${tournamentId}/fix-week-date`);

// Admin scorecard editing functions
export const getAdminScorecards = (tournamentId: number, weekStartDate?: string) => {
  const params = weekStartDate ? `?week_start_date=${normalizeYMD(weekStartDate)}` : '';
  return api.get(`/tournaments/${tournamentId}/admin/scorecards${params}`);
};

export const updateAdminScorecard = (tournamentId: number, scorecardId: number, data: {
  hole_scores: number[];
  total_score: number;
}) => {
  return api.put(`/tournaments/${tournamentId}/admin/scorecards/${scorecardId}`, data);
};

export const deleteAdminScorecard = (tournamentId: number, scorecardId: number) => {
  return api.delete(`/tournaments/${tournamentId}/admin/scorecards/${scorecardId}`);
};

// Admin strokeplay scorecard editing functions
export const getAdminStrokeplayScorecards = (tournamentId: number) => {
  return api.get(`/tournaments/${tournamentId}/admin/strokeplay-scorecards`);
};

export const updateAdminStrokeplayScorecard = (tournamentId: number, scorecardId: number, data: {
  hole_scores: number[];
  total_score: number;
}) => {
  return api.put(`/tournaments/${tournamentId}/admin/strokeplay-scorecards/${scorecardId}`, data);
};

export const deleteAdminStrokeplayScorecard = (tournamentId: number, scorecardId: number) => {
  return api.delete(`/tournaments/${tournamentId}/admin/strokeplay-scorecards/${scorecardId}`);
};

// Admin round management functions
export const addAdminScorecard = (scorecardData: {
  user_id: number;
  hole_scores: number[];
  total_score?: number;
  notes?: string;
  round_type?: string;
  course_id?: number;
  course_name?: string;
  teebox?: string;
  course_rating?: number;
  course_slope?: number;
  handicap?: number;
  date_played?: string;
}) => {
  return api.post('/admin/scorecards', scorecardData);
};

export const addAdminRoundsBulk = (tournamentId: number, rounds: Array<{
  user_id: number;
  week_start_date?: string;
  hole_scores: number[];
  total_score?: number;
  notes?: string;
  round_type?: string;
  course_id?: number;
  course_name?: string;
  teebox?: string;
  course_rating?: number;
  course_slope?: number;
  handicap?: number;
  date_played?: string;
}>) => {
  return api.post(`/tournaments/${tournamentId}/admin/rounds/bulk`, { rounds });
};

// Admin matchplay match editing functions
export const getAdminMatchplayMatches = (tournamentId: number) => {
  return api.get(`/tournaments/${tournamentId}/admin/matchplay-matches`);
};

export const updateAdminMatchplayMatch = (tournamentId: number, matchId: number, data: {
  player1_score: number;
  player2_score: number;
  winner_id: number | null;
  scores?: any;
}) => {
  return api.put(`/tournaments/${tournamentId}/admin/matchplay-matches/${matchId}`, data);
};

// ==========================================================================
// Club Pro API
// ==========================================================================

export interface ClubProHandicapEntry {
  member_id: number;
  first_name: string;
  last_name: string;
  club: string;
  sim_handicap?: number;
  grass_handicap?: number;
  total_rounds: string | number;
  sim_rounds: string | number;
  grass_rounds: string | number;
  best_differential: string | number | null;
  avg_differential: string | number | null;
}

export const getClubProHandicaps = (club?: string) => {
  const params = club ? `?club=${encodeURIComponent(club)}` : '';
  return api.get<{ club: string; players: ClubProHandicapEntry[] }>(`/club-pro/handicaps${params}`);
};

export const getClubProWeeklyMatches = (tournamentId: number, weekStartDate?: string) => {
  const qs = weekStartDate ? `?week_start_date=${normalizeYMD(weekStartDate)}` : '';
  return api.get<{ club: string; matches: WeeklyMatch[] }>(`/club-pro/tournaments/${tournamentId}/weekly-matches${qs}`);
};

export const getClubProPlayerTournaments = (club?: string) => {
  const params = club ? `?club=${encodeURIComponent(club)}` : '';
  return api.get<{ club: string; players: Array<{
    member_id: number;
    first_name: string;
    last_name: string;
    club: string;
    tournaments: Array<{
      tournament_id: number;
      tournament_name: string;
      tournament_status: string;
      start_date?: string;
      end_date?: string;
      participation_status: string;
    }>;
  }> }>(`/club-pro/player-tournaments${params}`);
};

// ============================================================================
// PERMISSION MANAGEMENT API
// ============================================================================

// Get all roles
export const getRoles = () => {
  return api.get<Role[]>('/admin/roles');
};

// Get a specific role with its permissions
export const getRole = (id: number) => {
  return api.get<Role>(`/admin/roles/${id}`);
};

// Get all available permissions
export const getPermissions = () => {
  return api.get<{ permissions: Permission[]; grouped: { [category: string]: Permission[] } }>('/admin/permissions');
};

// Create a new role
export const createRole = (data: RoleCreateRequest) => {
  return api.post<Role>('/admin/roles', data);
};

// Update a role
export const updateRole = (id: number, data: RoleUpdateRequest) => {
  return api.put<Role>(`/admin/roles/${id}`, data);
};

// Delete a role
export const deleteRole = (id: number) => {
  return api.delete<{ message: string }>(`/admin/roles/${id}`);
};

// Update role permissions
export const updateRolePermissions = (id: number, permissions: number[]) => {
  return api.put<{ role_id: number; role_name: string; permissions: Permission[] }>(
    `/admin/roles/${id}/permissions`,
    { permissions }
  );
};

// Get permission audit log
export const getPermissionAuditLog = (limit: number = 50) => {
  return api.get<AuditLogEntry[]>(`/admin/permission-audit-log?limit=${limit}`);
};

// ============================================================================
// WEEKLY HOLE-IN-ONE CHALLENGE API
// ============================================================================

export interface ChallengeEntry {
  id: number;
  challenge_id: number;
  user_id: number;
  scorecard_id?: number;
  entry_paid: boolean;
  payment_method?: string;
  payment_amount?: number;
  payment_notes?: string;
  payment_submitted_at?: string;
  hole_in_one: boolean;
  distance_from_pin_inches?: number;
  score_on_hole?: number;
  photo_url?: string;
  photo_uploaded_at?: string;
  photo_verified: boolean;
  photo_verified_by?: number;
  photo_verified_at?: string;
  distance_verified: boolean;
  distance_verified_by?: number;
  distance_verified_at?: string;
  distance_override_reason?: string;
  original_distance_inches?: number;
  status: 'pending' | 'submitted' | 'verified' | 'winner';
  created_at: string;
  updated_at: string;
  // Joined user fields (from GET entries)
  first_name?: string;
  last_name?: string;
  email_address?: string;
  club?: string;
  profile_photo_url?: string;
  rank?: number;
}

export interface WeeklyChallenge {
  id: number;
  challenge_name: string;
  designated_hole: number;
  entry_fee: number;
  week_start_date: string;
  week_end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  total_entries: number;
  total_entry_fees: number;
  starting_pot: number;
  week_entry_contribution: number;
  final_pot: number;
  payout_amount: number;
  rollover_amount: number;
  has_hole_in_one: boolean;
  hole_in_one_winners?: number[];
  closest_to_pin_winner_id?: number;
  closest_distance_inches?: number;
  payout_completed: boolean;
  payout_notes?: string;
  finalized_by?: number;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  entry_count?: number;
}

export interface ChallengePot {
  id: number;
  current_amount: number;
  total_contributions: number;
  last_payout_amount?: number;
  last_payout_date?: string;
  weeks_accumulated: number;
  updated_at: string;
}

export interface ChallengePayoutHistory {
  id: number;
  challenge_id: number;
  payout_type: 'hole_in_one' | 'closest_to_pin';
  winner_ids: number[];
  payout_amount_per_winner: number;
  total_payout: number;
  pot_after_payout: number;
  payout_method?: string;
  payout_notes?: string;
  payout_completed: boolean;
  payout_completed_at?: string;
  created_at: string;
}

// Get current challenge pot
export const getChallengePot = () => {
  return api.get<ChallengePot>('/challenges/pot');
};

// Create new weekly challenge (Admin only)
export const createChallenge = (data: {
  challenge_name: string;
  designated_hole: number;
  entry_fee: number;
  week_start_date: string;
  week_end_date: string;
}) => {
  return api.post<WeeklyChallenge>('/challenges', data);
};

// Get all challenges
export const getChallenges = (params?: {
  status?: 'active' | 'completed' | 'cancelled';
  limit?: number;
  offset?: number;
}) => {
  return api.get<WeeklyChallenge[]>('/challenges', { params });
};

// Get active challenge
export const getActiveChallenge = () => {
  return api.get<WeeklyChallenge>('/challenges/active');
};

// Get specific challenge
export const getChallenge = (id: number) => {
  return api.get<WeeklyChallenge>(`/challenges/${id}`);
};

// Update challenge (Admin only)
export const updateChallenge = (id: number, data: Partial<WeeklyChallenge>) => {
  return api.put<WeeklyChallenge>(`/challenges/${id}`, data);
};

// Delete/cancel challenge (Admin only)
export const deleteChallenge = (id: number) => {
  return api.delete<{ message: string; challenge: WeeklyChallenge }>(`/challenges/${id}`);
};

// Enter a challenge
export const enterChallenge = (challengeId: number, data: {
  payment_method: string;
  payment_amount: number;
  payment_notes?: string;
}) => {
  return api.post<ChallengeEntry>(`/challenges/${challengeId}/enter`, data);
};

// Get all entries for a challenge
export const getChallengeEntries = (challengeId: number) => {
  return api.get<ChallengeEntry[]>(`/challenges/${challengeId}/entries`);
};

// Get current user's entry
export const getMyChallengeEntry = (challengeId: number) => {
  return api.get<ChallengeEntry>(`/challenges/${challengeId}/my-entry`);
};

// Submit distance from pin
export const submitChallengeDistance = (challengeId: number, entryId: number, data: {
  distance_from_pin_inches?: number;
  hole_in_one: boolean;
  score_on_hole?: number;
}) => {
  return api.post<ChallengeEntry>(`/challenges/${challengeId}/entries/${entryId}/distance`, data);
};

// Upload photo for challenge entry
export const uploadChallengePhoto = (challengeId: number, entryId: number, file: File) => {
  const formData = new FormData();
  formData.append('challengePhoto', file);

  return api.post<{ message: string; photo_url: string; entry: ChallengeEntry }>(
    `/challenges/${challengeId}/entries/${entryId}/photo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

// Verify photo (Admin only)
export const verifyChallengePhoto = (challengeId: number, entryId: number) => {
  return api.put<ChallengeEntry>(`/challenges/${challengeId}/entries/${entryId}/photo/verify`, {});
};

// Verify entry (Admin only)
export const verifyChallengeEntry = (challengeId: number, entryId: number, data: {
  distance_from_pin_inches: number;
  distance_override_reason?: string;
}) => {
  return api.put<ChallengeEntry>(`/challenges/${challengeId}/entries/${entryId}/verify`, data);
};

// Get challenge leaderboard
export const getChallengeLeaderboard = (challengeId: number) => {
  return api.get<ChallengeEntry[]>(`/challenges/${challengeId}/leaderboard`);
};

// Finalize challenge and determine winner (Admin only)
export const finalizeChallenge = (challengeId: number, payout_notes?: string) => {
  return api.post<{
    message: string;
    challenge: WeeklyChallenge;
    winners: { user_id: number; payout: number }[];
    potAmounts: {
      startingPot: number;
      weekEntryContribution: number;
      finalPot: number;
      payoutAmount: number;
      rolloverAmount: number;
    };
  }>(`/challenges/${challengeId}/finalize`, { payout_notes });
};

// Mark payout as completed (Admin only)
export const markPayoutComplete = (challengeId: number, payout_notes?: string) => {
  return api.post<WeeklyChallenge>(`/challenges/${challengeId}/payout-complete`, { payout_notes });
};

// Get challenge history
export const getChallengeHistory = (params?: { limit?: number; offset?: number }) => {
  return api.get<WeeklyChallenge[]>('/challenges/history', { params });
};

export default api; 