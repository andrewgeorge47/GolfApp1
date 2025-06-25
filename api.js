// API client for Golf League Backend
class GolfLeagueAPI {
    constructor() {
        // Set to true for local development, false for production
        const isDevelopment = false;
        
        if (isDevelopment) {
            // Local development
            this.baseURL = 'http://localhost:3001';
        } else {
            // Production backend URL - update this to your actual backend URL
            this.baseURL = 'https://golfapp1.onrender.com';
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Health check
    async getHealth() {
        return this.request('/api/health');
    }

    // Get all users
    async getUsers() {
        return this.request('/api/users');
    }

    // Get all players (users who are participating in tournaments)
    async getPlayers() {
        return this.request('/api/players');
    }

    // Get all matches
    async getMatches() {
        return this.request('/api/matches');
    }

    // Get leaderboard
    async getLeaderboard() {
        return this.request('/api/leaderboard');
    }

    // Get tournament settings
    async getSettings() {
        return this.request('/api/settings');
    }

    // Get tournament status
    async getTournamentStatus() {
        return this.request('/api/tournament/status');
    }

    // Get recent activity
    async getRecentActivity() {
        return this.request('/api/activity');
    }

    // League Settings
    async getLeagueSettings() {
        return this.request('/api/league/settings');
    }
    async updateLeagueSettings(settings) {
        return this.request('/api/league/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // League Players
    async getLeaguePlayers() {
        return this.request('/api/league/players');
    }
    async addLeaguePlayer(user_id) {
        return this.request('/api/league/players', {
            method: 'POST',
            body: JSON.stringify({ user_id })
        });
    }
    async removeLeaguePlayer(user_id) {
        return this.request(`/api/league/players/${user_id}`, {
            method: 'DELETE'
        });
    }

    // Matches
    async addMatch(matchData) {
        return this.request('/api/matches', {
            method: 'POST',
            body: JSON.stringify(matchData)
        });
    }

    async updateMatch(matchId, matchData) {
        return this.request(`/api/matches/${matchId}`, {
            method: 'PUT',
            body: JSON.stringify(matchData)
        });
    }

    async deleteMatch(matchId) {
        return this.request(`/api/matches/${matchId}`, {
            method: 'DELETE'
        });
    }

    // Helper method to get display name for a user/player
    getDisplayName(user) {
        if (!user) return 'Unknown Player';
        
        // Handle different data structures
        if (user.name) return user.name;
        if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
        if (user.member_id) return `Member ${user.member_id}`;
        
        return 'Unknown Player';
    }
}

// Create global instance
const api = new GolfLeagueAPI(); 