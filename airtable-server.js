const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Airtable configuration - Updated to use Personal Access Tokens
const AIRTABLE_PERSONAL_ACCESS_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_PERSONAL_ACCESS_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable configuration. Please set AIRTABLE_PERSONAL_ACCESS_TOKEN and AIRTABLE_BASE_ID environment variables.');
    console.error('Get your Personal Access Token from: https://airtable.com/create/tokens');
    process.exit(1);
}

// Airtable REST API configuration
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const AIRTABLE_HEADERS = {
    'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
};

// Helper function to handle Airtable errors
const handleAirtableError = (error, res) => {
    console.error('Airtable error:', error);
    res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
    });
};

// Helper function to make Airtable API calls
async function airtableRequest(endpoint, options = {}) {
    const url = `${AIRTABLE_API_URL}${endpoint}`;
    const config = {
        headers: AIRTABLE_HEADERS,
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Airtable API Error (${endpoint}):`, error);
        throw error;
    }
}

// API Routes

// Get all data (players, matches, leaderboard, etc.)
app.get('/api/data', async (req, res) => {
    try {
        const [players, matches, leaderboard, checkedInPlayers, matchQueue, settings] = await Promise.all([
            getPlayers(),
            getMatches(),
            getLeaderboard(),
            getCheckedInPlayers(),
            getMatchQueue(),
            getSettings()
        ]);

        res.json({
            players,
            matches,
            leaderboard,
            checkedInPlayers,
            matchQueue,
            currentMatchIndex: 0, // This will be managed in the frontend
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

// Players API
app.get('/api/players', async (req, res) => {
    try {
        const players = await getPlayers();
        res.json(players);
    } catch (error) {
        handleAirtableError(error, res);
    }
});

app.post('/api/players', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        // Create player record
        const playerRecord = await airtableRequest('/Players', {
            method: 'POST',
            body: JSON.stringify({
                records: [{
                    fields: {
                        Name: name,
                        Created: new Date().toISOString()
                    }
                }]
            })
        });

        // Initialize leaderboard entry
        await airtableRequest('/Leaderboard', {
            method: 'POST',
            body: JSON.stringify({
                records: [{
                    fields: {
                        Player: name,
                        Points: 0,
                        Matches: 0,
                        Wins: 0,
                        Created: new Date().toISOString()
                    }
                }]
            })
        });

        res.json({ success: true, player: playerRecord.records[0] });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

app.delete('/api/players/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        // Get and delete player records
        const playerRecords = await airtableRequest(`/Players?filterByFormula={Name}='${encodeURIComponent(name)}'`);
        if (playerRecords.records.length > 0) {
            const recordIds = playerRecords.records.map(r => r.id);
            await airtableRequest('/Players', {
                method: 'DELETE',
                body: JSON.stringify({ records: recordIds })
            });
        }

        // Get and delete leaderboard entry
        const leaderboardRecords = await airtableRequest(`/Leaderboard?filterByFormula={Player}='${encodeURIComponent(name)}'`);
        if (leaderboardRecords.records.length > 0) {
            const recordIds = leaderboardRecords.records.map(r => r.id);
            await airtableRequest('/Leaderboard', {
                method: 'DELETE',
                body: JSON.stringify({ records: recordIds })
            });
        }

        // Remove from checked in players
        const checkedInRecords = await airtableRequest(`/CheckedInPlayers?filterByFormula={Player}='${encodeURIComponent(name)}'`);
        if (checkedInRecords.records.length > 0) {
            const recordIds = checkedInRecords.records.map(r => r.id);
            await airtableRequest('/CheckedInPlayers', {
                method: 'DELETE',
                body: JSON.stringify({ records: recordIds })
            });
        }

        res.json({ success: true });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

// Check-in API
app.post('/api/checkin', async (req, res) => {
    try {
        const { playerName, checkedIn } = req.body;
        
        if (checkedIn) {
            // Add to checked in players
            await airtableRequest('/CheckedInPlayers', {
                method: 'POST',
                body: JSON.stringify({
                    records: [{
                        fields: {
                            Player: playerName,
                            CheckedInAt: new Date().toISOString()
                        }
                    }]
                })
            });
        } else {
            // Remove from checked in players
            const records = await airtableRequest(`/CheckedInPlayers?filterByFormula={Player}='${encodeURIComponent(playerName)}'`);
            if (records.records.length > 0) {
                const recordIds = records.records.map(r => r.id);
                await airtableRequest('/CheckedInPlayers', {
                    method: 'DELETE',
                    body: JSON.stringify({ records: recordIds })
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

// Matches API
app.post('/api/matches', async (req, res) => {
    try {
        const { player1, player2, scores, winner, points, holeResults } = req.body;
        
        const matchRecord = await airtableRequest('/Matches', {
            method: 'POST',
            body: JSON.stringify({
                records: [{
                    fields: {
                        Player1: player1,
                        Player2: player2,
                        Scores: JSON.stringify(scores),
                        Winner: winner,
                        Points: JSON.stringify(points),
                        HoleResults: JSON.stringify(holeResults),
                        PlayedAt: new Date().toISOString()
                    }
                }]
            })
        });

        // Update leaderboard
        await updateLeaderboard(player1, points[player1], winner === player1);
        await updateLeaderboard(player2, points[player2], winner === player2);

        res.json({ success: true, match: matchRecord.records[0] });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

// Match Queue API
app.post('/api/match-queue', async (req, res) => {
    try {
        const { matches } = req.body;
        
        // Clear existing queue
        const existingRecords = await airtableRequest('/MatchQueue');
        if (existingRecords.records.length > 0) {
            const recordIds = existingRecords.records.map(r => r.id);
            await airtableRequest('/MatchQueue', {
                method: 'DELETE',
                body: JSON.stringify({ records: recordIds })
            });
        }

        // Add new matches
        if (matches.length > 0) {
            const records = matches.map(match => ({
                fields: {
                    Player1: match.player1,
                    Player2: match.player2,
                    Status: match.status,
                    MatchNumber: match.matchNumber,
                    CreatedAt: new Date().toISOString()
                }
            }));

            await airtableRequest('/MatchQueue', {
                method: 'POST',
                body: JSON.stringify({ records })
            });
        }

        res.json({ success: true });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

app.put('/api/match-queue/:matchNumber', async (req, res) => {
    try {
        const { matchNumber } = req.params;
        const { status } = req.body;

        const records = await airtableRequest(`/MatchQueue?filterByFormula={MatchNumber}=${matchNumber}`);
        if (records.records.length > 0) {
            await airtableRequest('/MatchQueue', {
                method: 'PATCH',
                body: JSON.stringify({
                    records: [{
                        id: records.records[0].id,
                        fields: { Status: status }
                    }]
                })
            });
        }

        res.json({ success: true });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

// Settings API
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (error) {
        handleAirtableError(error, res);
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const { tournamentName, minMatches, notes } = req.body;
        
        const existingRecords = await airtableRequest('/Settings');
        
        if (existingRecords.records.length > 0) {
            await airtableRequest('/Settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    records: [{
                        id: existingRecords.records[0].id,
                        fields: {
                            TournamentName: tournamentName,
                            MinMatches: minMatches,
                            Notes: notes,
                            UpdatedAt: new Date().toISOString()
                        }
                    }]
                })
            });
        } else {
            await airtableRequest('/Settings', {
                method: 'POST',
                body: JSON.stringify({
                    records: [{
                        fields: {
                            TournamentName: tournamentName,
                            MinMatches: minMatches,
                            Notes: notes,
                            CreatedAt: new Date().toISOString()
                        }
                    }]
                })
            });
        }

        res.json({ success: true });
    } catch (error) {
        handleAirtableError(error, res);
    }
});

// Helper functions
async function getPlayers() {
    const response = await airtableRequest('/Players');
    return response.records.map(record => record.fields.Name);
}

async function getMatches() {
    const response = await airtableRequest('/Matches?sort[0][field]=PlayedAt&sort[0][direction]=desc');
    
    return response.records.map(record => ({
        player1: record.fields.Player1,
        player2: record.fields.Player2,
        scores: JSON.parse(record.fields.Scores),
        winner: record.fields.Winner,
        points: JSON.parse(record.fields.Points),
        holeResults: JSON.parse(record.fields.HoleResults),
        timestamp: record.fields.PlayedAt
    }));
}

async function getLeaderboard() {
    const response = await airtableRequest('/Leaderboard');
    const leaderboard = {};
    
    response.records.forEach(record => {
        leaderboard[record.fields.Player] = {
            points: record.fields.Points || 0,
            matches: record.fields.Matches || 0,
            wins: record.fields.Wins || 0
        };
    });
    
    return leaderboard;
}

async function getCheckedInPlayers() {
    const response = await airtableRequest('/CheckedInPlayers');
    return response.records.map(record => record.fields.Player);
}

async function getMatchQueue() {
    const response = await airtableRequest('/MatchQueue?sort[0][field]=MatchNumber&sort[0][direction]=asc');
    
    return response.records.map(record => ({
        player1: record.fields.Player1,
        player2: record.fields.Player2,
        status: record.fields.Status,
        matchNumber: record.fields.MatchNumber
    }));
}

async function getSettings() {
    const response = await airtableRequest('/Settings');
    if (response.records.length > 0) {
        return {
            tournamentName: response.records[0].fields.TournamentName || 'Golf League Tournament',
            minMatches: response.records[0].fields.MinMatches || 3,
            notes: response.records[0].fields.Notes || ''
        };
    }
    return {
        tournamentName: 'Golf League Tournament',
        minMatches: 3,
        notes: ''
    };
}

async function updateLeaderboard(playerName, points, isWin) {
    const records = await airtableRequest(`/Leaderboard?filterByFormula={Player}='${encodeURIComponent(playerName)}'`);

    if (records.records.length > 0) {
        const current = records.records[0].fields;
        await airtableRequest('/Leaderboard', {
            method: 'PATCH',
            body: JSON.stringify({
                records: [{
                    id: records.records[0].id,
                    fields: {
                        Points: (current.Points || 0) + points,
                        Matches: (current.Matches || 0) + 1,
                        Wins: (current.Wins || 0) + (isWin ? 1 : 0)
                    }
                }]
            })
        });
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        airtable: {
            configured: !!(AIRTABLE_PERSONAL_ACCESS_TOKEN && AIRTABLE_BASE_ID),
            authType: 'Personal Access Token',
            apiUrl: AIRTABLE_API_URL
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Airtable Golf League Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
    console.log(`🔐 Using Personal Access Token authentication`);
    console.log(`🌐 Using Airtable REST API directly`);
}); 