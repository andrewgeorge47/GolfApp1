// Airtable API Client
// This service handles all communication with the Airtable backend

// Update this URL to your deployed backend URL
const API_BASE_URL = 'https://golfapp1.onrender.com/api';

class AirtableAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Generic request method
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }

    // Get all data with expanded fields
    async getAllData() {
        return this.request('/data');
    }

    // Players API - now returns expanded player data with user info
    async getPlayers() {
        return this.request('/players');
    }

    // Get all users (for player selection)
    async getUsers() {
        console.log('Making getUsers request to:', `${this.baseURL}/users`);
        try {
            const result = await this.request('/users');
            console.log('getUsers response:', result);
            return result;
        } catch (error) {
            console.error('getUsers error:', error);
            throw error;
        }
    }

    async addPlayer(name) {
        return this.request('/players', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    // Add player from existing user
    async addPlayerFromUser(userId) {
        console.log('Making addPlayerFromUser request with userId:', userId);
        try {
            const result = await this.request('/players', {
                method: 'POST',
                body: JSON.stringify({ userId })
            });
            console.log('addPlayerFromUser response:', result);
            return result;
        } catch (error) {
            console.error('addPlayerFromUser error:', error);
            throw error;
        }
    }

    async removePlayer(playerId) {
        return this.request(`/players/${encodeURIComponent(playerId)}`, {
            method: 'DELETE'
        });
    }

    // Check-in API - now works with player IDs
    async toggleCheckin(playerId, checkedIn) {
        return this.request('/checkin', {
            method: 'POST',
            body: JSON.stringify({ playerId, checkedIn })
        });
    }

    // Matches API - now works with player IDs and expanded data
    async recordMatch(matchData) {
        return this.request('/matches', {
            method: 'POST',
            body: JSON.stringify(matchData)
        });
    }

    // Match Queue API - now works with player IDs
    async updateMatchQueue(matches) {
        return this.request('/match-queue', {
            method: 'POST',
            body: JSON.stringify({ matches })
        });
    }

    async updateMatchStatus(matchNumber, status) {
        return this.request(`/match-queue/${matchNumber}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    // Settings API
    async getSettings() {
        return this.request('/settings');
    }

    async updateSettings(settings) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // Data synchronization with expanded fields
    async syncData() {
        try {
            const data = await this.getAllData();
            
            // Store in localStorage as backup
            localStorage.setItem('golfLeagueData', JSON.stringify({
                ...data,
                lastSynced: new Date().toISOString()
            }));

            return data;
        } catch (error) {
            console.error('Failed to sync with Airtable:', error);
            
            // Fallback to localStorage
            const localData = localStorage.getItem('golfLeagueData');
            if (localData) {
                console.log('Using local data as fallback');
                return JSON.parse(localData);
            }
            
            throw error;
        }
    }

    // Helper methods for working with expanded data
    getPlayerDisplayName(player) {
        if (player && player.user) {
            return `${player.user.firstName} ${player.user.lastName}`;
        }
        return player?.playerID || 'Unknown Player';
    }

    getPlayerId(player) {
        return player?.id || player;
    }

    // Batch operations for better performance
    async batchUpdate(operations) {
        const results = [];
        
        for (const operation of operations) {
            try {
                const result = await this.request(operation.endpoint, {
                    method: operation.method,
                    body: JSON.stringify(operation.data)
                });
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }
}

// Create singleton instance
const airtableAPI = new AirtableAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = airtableAPI;
} else {
    window.airtableAPI = airtableAPI;
} 