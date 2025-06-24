// Airtable API Client
// This service handles all communication with the Airtable backend

// Update this URL to your deployed backend URL
const API_BASE_URL = 'https://your-app-name.onrender.com/api'; // Replace with your Render URL

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

    // Get all data
    async getAllData() {
        return this.request('/data');
    }

    // Players API
    async getPlayers() {
        return this.request('/players');
    }

    async addPlayer(name) {
        return this.request('/players', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async removePlayer(name) {
        return this.request(`/players/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
    }

    // Check-in API
    async toggleCheckin(playerName, checkedIn) {
        return this.request('/checkin', {
            method: 'POST',
            body: JSON.stringify({ playerName, checkedIn })
        });
    }

    // Matches API
    async recordMatch(matchData) {
        return this.request('/matches', {
            method: 'POST',
            body: JSON.stringify(matchData)
        });
    }

    // Match Queue API
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

    // Data synchronization
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